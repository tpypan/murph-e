import type { Wire } from './wire.ts'

// One open badge console. Two views of the same byte stream: a line splitter
// for the app's log lines, and a raw buffer for command/response waits
// during onboarding. Both stay live at all times, so a HELLO logged while a
// `put` is in flight is not lost. The bytes come from a Wire, which is a
// serial port on the cabinet and a FakeBadge in tests.

const RAW_CAP = 32768
// The badge's receive ring is 256 bytes. One unpaced write bigger than that
// wedges `put` until the badge is taken back to the launcher by hand.
const WRITE_CHUNK = 128
const WRITE_PAUSE_MS = 20

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export class BadgeLink {
  readonly path: string
  private wire: Wire
  private raw = ''
  private partial = ''
  private lineHandlers = new Set<(line: string) => void>()
  private closeHandlers = new Set<() => void>()
  private closed = false

  constructor(wire: Wire) {
    this.path = wire.path
    this.wire = wire
    wire.onData((text) => this.onData(text))
    wire.onClose(() => this.handleClose())
  }

  get isOpen(): boolean {
    return !this.closed && this.wire.isOpen
  }

  onLine(fn: (line: string) => void): () => void {
    this.lineHandlers.add(fn)
    return () => this.lineHandlers.delete(fn)
  }

  onClose(fn: () => void): void {
    this.closeHandlers.add(fn)
  }

  private onData(text: string): void {
    this.raw += text
    if (this.raw.length > RAW_CAP) this.raw = this.raw.slice(-RAW_CAP)
    this.partial += text
    let i = this.partial.indexOf('\n')
    while (i >= 0) {
      const line = this.partial.slice(0, i).replace(/\r$/, '')
      this.partial = this.partial.slice(i + 1)
      for (const h of this.lineHandlers) h(line)
      i = this.partial.indexOf('\n')
    }
  }

  private handleClose(): void {
    if (this.closed) return
    this.closed = true
    for (const h of this.closeHandlers) h()
  }

  /** Send one console command. The console wants a bare CR, not CRLF. */
  writeLine(s: string): Promise<void> {
    return this.wire.write(Buffer.from(`${s}\r`, 'utf8'))
  }

  /** Send a file body for `put`, paced so the badge's ring never overflows. */
  async writeBytes(bytes: Uint8Array): Promise<void> {
    for (let i = 0; i < bytes.length; i += WRITE_CHUNK) {
      await this.wire.write(bytes.subarray(i, i + WRITE_CHUNK))
      if (i + WRITE_CHUNK < bytes.length) await sleep(WRITE_PAUSE_MS)
    }
  }

  /** Forget everything received so far, so a waitFor cannot match stale output. */
  clear(): void {
    this.raw = ''
  }

  /** Resolve with everything received since clear() once `token` appears. */
  async waitFor(token: string, timeoutMs: number): Promise<string> {
    const t0 = Date.now()
    while (Date.now() - t0 < timeoutMs) {
      const i = this.raw.indexOf(token)
      if (i >= 0) return this.raw.slice(0, i + token.length)
      if (this.closed)
        throw new Error(`${this.path} closed while waiting for ${JSON.stringify(token)}`)
      await sleep(10)
    }
    throw new Error(
      `${this.path}: no ${JSON.stringify(token)} within ${timeoutMs} ms (got ${JSON.stringify(this.raw.slice(-120))})`,
    )
  }

  /** Send a command and return its output up to the next prompt. */
  async command(line: string, timeoutMs = 5000): Promise<string> {
    this.clear()
    await this.writeLine(line)
    return this.waitFor('badge> ', timeoutMs)
  }

  async close(): Promise<void> {
    await this.wire.close()
    this.handleClose()
  }
}
