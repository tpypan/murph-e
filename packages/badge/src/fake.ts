import { APP_SLUG, DEFAULT_BUTTON_MAP, type Identity } from './protocol.ts'
import type { PortInfo, Transport, Wire } from './wire.ts'

// A badge that lives in the process. It speaks the console protocol from
// docs/badge-integration.md §1 (prompt, cat, mkdir, put, reload, uitree,
// apps) and logs the same lines the Lua app logs, so the hub cannot tell
// it from the real thing. Used by the tests, `pnpm badge fake`, and the
// cabinet's /api/badges/fake route for developing without hardware.
//
// It also reproduces the one real failure seen on hardware: a single write
// larger than the badge's 256-byte receive ring during `put` wedges the
// console until the badge is taken back to the launcher.

const RING = 256
const PROMPT = 'badge> '
const BUTTON_CODES: Record<string, number> = Object.fromEntries(
  Object.entries(DEFAULT_BUTTON_MAP).map(([code, name]) => [name, Number(code)]),
)

export interface FakeBadgeOptions {
  serial?: string
  badgeId: string
  name: string
  color: [number, number, number]
  /** Version of the arcade app already on the badge, or null for none. */
  installedVersion?: string | null
  /** Start with the arcade app open (a badge that was in the app when plugged in). */
  inApp?: boolean
  /** After a push and reload, "the player" opens the app after this many ms. */
  autoOpenMs?: number | null
}

interface Put {
  path: string
  remaining: number
  chunks: number[]
  bytes: number[]
}

export class FakeBadge {
  readonly serial: string
  readonly path: string
  readonly identity: Identity
  readonly files = new Map<string, Uint8Array>()
  inApp: boolean
  wedged = false
  /** The largest single write seen during a put; the real ring is 256 bytes. */
  maxWrite = 0
  private autoOpenMs: number | null
  private wire: FakeWire | null = null
  private inbox = ''
  private put: Put | null = null
  private readonly t0 = Date.now()
  private lineHandlers = new Set<(line: string) => void>()

  constructor(opts: FakeBadgeOptions) {
    this.serial = opts.serial ?? `FA:KE:${Math.random().toString(16).slice(2, 4).toUpperCase()}`
    this.path = `fake:${this.serial}`
    this.identity = { badgeId: opts.badgeId, name: opts.name, color: opts.color }
    this.autoOpenMs = opts.autoOpenMs ?? null
    if (opts.installedVersion) {
      this.files.set(
        `/littlefs/apps/${APP_SLUG}/manifest.cfg`,
        new TextEncoder().encode(`slug=${APP_SLUG}\nversion=${opts.installedVersion}\n`),
      )
      this.files.set(`/littlefs/apps/${APP_SLUG}/main.lua`, new TextEncoder().encode('-- stub'))
    }
    this.inApp = !!opts.inApp && this.installedVersion !== null
  }

  get installedVersion(): string | null {
    const m = this.files.get(`/littlefs/apps/${APP_SLUG}/manifest.cfg`)
    if (!m) return null
    const v = /^version=(\S+)\s*$/m.exec(new TextDecoder().decode(m))
    return v ? v[1]! : null
  }

  get connected(): boolean {
    return this.wire !== null
  }

  /** Every line the badge prints, for tests and the CLI. */
  onLine(fn: (line: string) => void): void {
    this.lineHandlers.add(fn)
  }

  // ---- what the player does ---------------------------------------------

  /** Open the arcade app from the launcher. */
  open(): void {
    if (this.installedVersion === null) throw new Error(`${this.path}: arcade app not installed`)
    if (this.inApp) return
    this.inApp = true
    const { badgeId, name, color } = this.identity
    this.lua(`ARCADE HELLO ${badgeId} ${name} ${color[0]} ${color[1]} ${color[2]}`)
    const map = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'HOME', 'AUX1']
      .map((n) => `${n}=${BUTTON_CODES[n.toLowerCase()]}`)
      .join(' ')
    this.lua(`ARCADE MAP ${map}`)
  }

  /** HOME: leave the app for the launcher. */
  exit(): void {
    if (!this.inApp) return
    this.inApp = false
    this.lua('ARCADE BYE')
  }

  press(button: string, down: boolean): void {
    if (!this.inApp) return
    const code = BUTTON_CODES[button.toLowerCase()]
    if (code === undefined) throw new Error(`unknown button ${button}`)
    this.lua(`B ${code} ${down ? 1 : 0}`)
  }

  tap(button: string): void {
    this.press(button, true)
    this.press(button, false)
  }

  /** HOME from a wedged console: back to the launcher, console alive again. */
  unwedge(): void {
    this.wedged = false
    this.put = null
    this.inbox = ''
  }

  // ---- the wire -----------------------------------------------------------

  /** Called by the transport when the Mac opens the port. */
  connect(): FakeWire {
    if (this.wire) throw new Error(`${this.path}: port busy`)
    const wire = new FakeWire(
      this.path,
      (buf) => this.receive(buf),
      () => {
        this.wire = null
      },
    )
    this.wire = wire
    return wire
  }

  /** Pull the cable. */
  disconnect(): void {
    const w = this.wire
    this.wire = null
    w?.dropped()
  }

  private out(text: string): void {
    for (const line of text.split(/\r?\n/))
      if (line.trim()) for (const h of this.lineHandlers) h(line)
    const w = this.wire
    if (!w) return
    // Deliver on a later tick, like a real port would.
    setTimeout(() => w.deliver(text), 0)
  }

  private lua(text: string): void {
    this.out(`I (${Date.now() - this.t0}) lua: [${APP_SLUG}] ${text}\r\n`)
  }

  private receive(buf: Uint8Array): void {
    if (this.wedged) return
    if (this.put) {
      this.maxWrite = Math.max(this.maxWrite, buf.length)
      if (buf.length > RING) {
        this.wedged = true
        return
      }
      for (const b of buf) this.put.bytes.push(b)
      this.put.chunks.push(buf.length)
      this.put.remaining -= buf.length
      if (this.put.remaining <= 0) {
        const { path, bytes } = this.put
        this.files.set(path, Uint8Array.from(bytes))
        this.put = null
        this.out(`OK ${bytes.length}\r\n${PROMPT}`)
      }
      return
    }
    this.inbox += new TextDecoder().decode(buf)
    let i = this.inbox.indexOf('\r')
    while (i >= 0) {
      const line = this.inbox.slice(0, i)
      this.inbox = this.inbox.slice(i + 1)
      this.command(line.trim())
      i = this.inbox.indexOf('\r')
    }
  }

  private command(line: string): void {
    // The console echoes what it was sent.
    if (line) this.out(`${line}\r\n`)
    const [cmd, ...args] = line.split(/\s+/)
    switch (cmd) {
      case '':
        this.out(`\r\n${PROMPT}`)
        return
      case 'cat': {
        const f = this.files.get(args[0] ?? '')
        this.out(f ? `${new TextDecoder().decode(f)}\r\n${PROMPT}` : `E: no such file\r\n${PROMPT}`)
        return
      }
      case 'mkdir':
        this.out(PROMPT)
        return
      case 'put': {
        if (args[0] === '--binary') {
          this.out(`PUT BINARY OK\r\n${PROMPT}`)
          return
        }
        const n = Number(args[1])
        if (!args[0] || !Number.isFinite(n)) {
          this.out(`E: usage put <path> <bytes>\r\n${PROMPT}`)
          return
        }
        this.put = { path: args[0], remaining: n, chunks: [], bytes: [] }
        this.out('READY\r\n')
        return
      }
      case 'rm':
        this.files.delete(args[0] ?? '')
        this.out(PROMPT)
        return
      case 'reload':
        if (this.inApp) this.exit()
        this.out(`reload: ${this.apps().length} apps\r\n${PROMPT}`)
        if (this.autoOpenMs !== null && this.installedVersion !== null) {
          setTimeout(() => {
            if (this.connected) this.open()
          }, this.autoOpenMs)
        }
        return
      case 'apps':
        this.out(`${this.apps().join('\n')}\r\n${PROMPT}`)
        return
      case 'heap':
        this.out(`heap: 31337 free\r\n${PROMPT}`)
        return
      case 'uitree':
        this.out(`${this.uitree()}\r\n${PROMPT}`)
        return
      default:
        this.out(`E: unknown command ${cmd}\r\n${PROMPT}`)
    }
  }

  private apps(): string[] {
    const slugs = new Set<string>()
    for (const p of this.files.keys()) {
      const m = /^\/littlefs\/apps\/([^/]+)\//.exec(p)
      if (m) slugs.add(m[1]!)
    }
    return [...slugs]
  }

  private uitree(): string {
    const { badgeId, name, color } = this.identity
    if (!this.inApp)
      return [
        'obj',
        `  label text="Badge ID: ${badgeId}"`,
        `  label text="${name}"`,
        '  qrcode',
      ].join('\n')
    return [
      'obj',
      '  label text="HTN ARCADE"',
      `  label text="${name}"`,
      '  label text="CONNECTED  -  HOME TO LEAVE"',
      `  label text="id=${badgeId} rgb=${color[0]},${color[1]},${color[2]}"`,
    ].join('\n')
  }
}

export class FakeWire implements Wire {
  readonly path: string
  private dataHandlers = new Set<(chunk: string) => void>()
  private closeHandlers = new Set<() => void>()
  private closed = false
  private readonly sink: (buf: Uint8Array) => void
  private readonly onGone: () => void

  constructor(path: string, sink: (buf: Uint8Array) => void, onGone: () => void) {
    this.path = path
    this.sink = sink
    this.onGone = onGone
  }

  get isOpen(): boolean {
    return !this.closed
  }

  async write(buf: Uint8Array): Promise<void> {
    if (this.closed) throw new Error(`${this.path}: port closed`)
    this.sink(buf)
  }

  onData(fn: (chunk: string) => void): void {
    this.dataHandlers.add(fn)
  }

  onClose(fn: () => void): void {
    this.closeHandlers.add(fn)
  }

  /** Bytes from the badge. */
  deliver(text: string): void {
    if (this.closed) return
    for (const h of this.dataHandlers) h(text)
  }

  /** The cable was pulled. */
  dropped(): void {
    if (this.closed) return
    this.closed = true
    for (const h of this.closeHandlers) h()
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    this.onGone()
  }
}

export const FAKE_PRESETS: FakeBadgeOptions[] = [
  {
    serial: 'FA:KE:00:00:00:01',
    badgeId: 'quiet-phoenix-noble-bold',
    name: 'Tony Pan',
    color: [76, 175, 80],
    installedVersion: null,
    autoOpenMs: 300,
  },
  {
    serial: 'FA:KE:00:00:00:02',
    badgeId: 'brave-otter-swift-calm',
    name: 'Sam Rivera',
    color: [41, 173, 255],
    installedVersion: null,
    autoOpenMs: 300,
  },
]

/** Holds the fake badges that are "plugged in". */
export class FakeTransport implements Transport {
  readonly name = 'fake'
  private badges = new Map<string, FakeBadge>()

  plug(opts: FakeBadgeOptions): FakeBadge {
    const b = new FakeBadge(opts)
    if (this.badges.has(b.path)) throw new Error(`${b.path} is already plugged in`)
    this.badges.set(b.path, b)
    return b
  }

  unplug(serialOrPath: string): boolean {
    const b = this.get(serialOrPath)
    if (!b) return false
    this.badges.delete(b.path)
    b.disconnect()
    return true
  }

  get(serialOrPath: string): FakeBadge | undefined {
    return this.badges.get(serialOrPath) ?? this.badges.get(`fake:${serialOrPath}`)
  }

  all(): FakeBadge[] {
    return [...this.badges.values()]
  }

  async list(): Promise<PortInfo[]> {
    return this.all().map((b) => ({ path: b.path, serial: b.serial }))
  }

  async open(path: string): Promise<Wire> {
    const b = this.badges.get(path)
    if (!b) throw new Error(`${path}: no such badge`)
    return b.connect()
  }
}
