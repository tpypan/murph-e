import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BadgeLink } from './link.ts'
import {
  APP_SLUG,
  APP_VERSION,
  type Button,
  buttonName,
  DEFAULT_BUTTON_MAP,
  type Identity,
  identityFromUitree,
  manifestVersion,
  parseLine,
} from './protocol.ts'
import { SerialTransport, type Transport } from './wire.ts'

const POLL_MS = 1000
// A port that would not open (busy, or gone between list and open) is
// retried after this long, and the error is reported once per streak.
const RETRY_MS = 5000
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'app')

export interface BadgeInfo {
  path: string
  serial: string // the badge's MAC, from the USB descriptor
  transport: string
  identity: Identity | null
  slot: number | null // controller index once the app has said hello
  state: 'attaching' | 'installing' | 'waiting' | 'ready' | 'error'
}

export type HubEvent =
  | { type: 'attached'; path: string; serial: string }
  | { type: 'installing'; path: string }
  | { type: 'installed'; path: string; ms: number }
  | { type: 'waiting'; path: string }
  | { type: 'hello'; path: string; serial: string; identity: Identity; slot: number }
  | {
      type: 'button'
      path: string
      slot: number
      badgeId: string
      button: Button
      down: boolean
      at: number // badge uptime ms
      received: number // Date.now() on the Mac
    }
  | { type: 'bye'; path: string; slot: number | null }
  | { type: 'detached'; path: string; slot: number | null }
  | { type: 'error'; path: string; message: string }

interface Attached {
  info: BadgeInfo
  link: BadgeLink
  map: Record<number, string>
}

export interface HubOptions {
  /** Push the app even if the badge reports the current version. */
  forcePush?: boolean
  /** Poll interval for hot-plug, ms. */
  pollMs?: number
  /** Where badges come from. Default: the real serial ports. */
  transports?: Transport[]
}

/**
 * Watches every transport for badges, installs the arcade app on any that
 * lack it, and turns their serial log lines into hello / button / bye
 * events. One instance per process; the cabinet keeps it on globalThis.
 */
export class BadgeHub extends EventEmitter {
  private links = new Map<string, Attached>()
  private pending = new Set<string>()
  private retryAt = new Map<string, number>()
  private timer: ReturnType<typeof setInterval> | null = null
  private polling = false
  private opts: HubOptions
  private transports: Transport[]

  constructor(opts: HubOptions = {}) {
    super()
    this.opts = opts
    this.transports = opts.transports ?? [new SerialTransport()]
  }

  start(): void {
    if (this.timer) return
    void this.poll()
    this.timer = setInterval(() => void this.poll(), this.opts.pollMs ?? POLL_MS)
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await Promise.all([...this.links.values()].map((a) => a.link.close()))
    this.links.clear()
  }

  badges(): BadgeInfo[] {
    return [...this.links.values()].map((a) => ({ ...a.info }))
  }

  /** Look for new badges now instead of at the next tick. */
  poll(): Promise<void> {
    return this.doPoll()
  }

  private send(ev: HubEvent): void {
    this.emit('event', ev)
  }

  private async doPoll(): Promise<void> {
    if (this.polling) return
    this.polling = true
    try {
      const seen = new Set<string>()
      for (const t of this.transports) {
        let ports: Awaited<ReturnType<Transport['list']>>
        try {
          ports = await t.list()
        } catch (e) {
          this.send({
            type: 'error',
            path: '',
            message: `${t.name}: ${e instanceof Error ? e.message : String(e)}`,
          })
          continue
        }
        for (const p of ports) {
          seen.add(p.path)
          if (this.links.has(p.path) || this.pending.has(p.path)) continue
          if ((this.retryAt.get(p.path) ?? 0) > Date.now()) continue
          void this.attach(t, p.path, p.serial)
        }
      }
      // A port that went away can fail afresh when it comes back.
      for (const path of this.retryAt.keys()) if (!seen.has(path)) this.retryAt.delete(path)
    } finally {
      this.polling = false
    }
  }

  private async attach(transport: Transport, path: string, serial: string): Promise<void> {
    this.pending.add(path)
    let link: BadgeLink
    try {
      link = new BadgeLink(await transport.open(path))
    } catch (e) {
      this.pending.delete(path)
      const first = !this.retryAt.has(path)
      this.retryAt.set(path, Date.now() + RETRY_MS)
      if (first)
        this.send({ type: 'error', path, message: `open: ${e instanceof Error ? e.message : e}` })
      return
    }
    this.retryAt.delete(path)
    const a: Attached = {
      info: {
        path,
        serial,
        transport: transport.name,
        identity: null,
        slot: null,
        state: 'attaching',
      },
      link,
      map: { ...DEFAULT_BUTTON_MAP },
    }
    this.links.set(path, a)
    this.pending.delete(path)
    this.send({ type: 'attached', path, serial })
    link.onLine((line) => this.handleLine(a, line))
    link.onClose(() => {
      if (this.links.get(path) !== a) return
      this.links.delete(path)
      this.send({ type: 'detached', path, slot: a.info.slot })
    })
    try {
      await this.onboard(a)
    } catch (e) {
      a.info.state = 'error'
      this.send({ type: 'error', path, message: e instanceof Error ? e.message : String(e) })
    }
  }

  private async onboard(a: Attached): Promise<void> {
    const { link, info } = a
    // The console answers on every screen, but give a fresh plug-in a moment.
    let prompted = false
    for (let i = 0; i < 3 && !prompted; i++) {
      try {
        link.clear()
        await link.writeLine('')
        await link.waitFor('badge> ', 1500)
        prompted = true
      } catch {}
    }
    if (!prompted) throw new Error('no badge> prompt')

    let installed = false
    if (!this.opts.forcePush) {
      const out = await link.command(`cat /littlefs/apps/${APP_SLUG}/manifest.cfg`, 3000)
      installed = manifestVersion(out) === APP_VERSION
    }
    if (!installed) {
      info.state = 'installing'
      this.send({ type: 'installing', path: info.path })
      const t0 = Date.now()
      await this.push(link)
      this.send({ type: 'installed', path: info.path, ms: Date.now() - t0 })
    }

    // Already in the app (a replug, or the player opened it before we asked)?
    if (!info.identity) {
      const tree = await link.command('uitree', 3000)
      const id = identityFromUitree(tree)
      if (id) this.hello(a, id)
    }
    if (!info.identity) {
      info.state = 'waiting'
      this.send({ type: 'waiting', path: info.path })
    }
  }

  /** The IDE's push flow: mkdir, put each file in paced chunks, reload. */
  private async push(link: BadgeLink): Promise<void> {
    const dir = `/littlefs/apps/${APP_SLUG}`
    await link.command(`mkdir ${dir}`, 5000)
    for (const name of ['manifest.cfg', 'main.lua']) {
      const bytes = await readFile(join(APP_DIR, name))
      link.clear()
      await link.writeLine(`put ${dir}/${name} ${bytes.length}`)
      await link.waitFor('READY', 5000)
      await link.writeBytes(bytes)
      await link.waitFor(`OK ${bytes.length}`, 20000)
    }
    // reload makes the launcher see the app. It also exits any running app,
    // which is fine here: the badge cannot be in an app it did not have.
    link.clear()
    await link.writeLine('reload')
    await link.waitFor('reload:', 8000)
  }

  private hello(a: Attached, identity: Identity): void {
    a.info.identity = identity
    a.info.state = 'ready'
    if (a.info.slot === null) a.info.slot = this.freeSlot()
    this.send({
      type: 'hello',
      path: a.info.path,
      serial: a.info.serial,
      identity,
      slot: a.info.slot,
    })
  }

  private freeSlot(): number {
    const used = new Set([...this.links.values()].map((x) => x.info.slot))
    let s = 0
    while (used.has(s)) s++
    return s
  }

  private handleLine(a: Attached, line: string): void {
    const ev = parseLine(line)
    if (!ev) return
    switch (ev.kind) {
      case 'hello':
        this.hello(a, ev.identity)
        break
      case 'map':
        a.map = { ...DEFAULT_BUTTON_MAP, ...ev.map }
        break
      case 'button': {
        if (a.info.slot === null || !a.info.identity) return
        const button = buttonName(ev.code, a.map)
        if (!button) return
        this.send({
          type: 'button',
          path: a.info.path,
          slot: a.info.slot,
          badgeId: a.info.identity.badgeId,
          button,
          down: ev.down,
          at: ev.at,
          received: Date.now(),
        })
        break
      }
      case 'bye': {
        const slot = a.info.slot
        a.info.slot = null
        a.info.identity = null
        a.info.state = 'waiting'
        this.send({ type: 'bye', path: a.info.path, slot })
        break
      }
      case 'log':
        break
    }
  }
}
