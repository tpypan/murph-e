export const BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'start'] as const
export type Button = (typeof BUTTONS)[number]
export const MAX_PLAYERS = 4

export interface InjectFrame {
  at: number // frames after the inject call
  player?: number
  button: Button
  down: boolean
}

interface Scheduled {
  frame: number
  player: number
  button: number
  down: boolean
}

function buttonIndex(name: unknown): number {
  const i = BUTTONS.indexOf(String(name).toLowerCase() as Button)
  return i
}

function playerIndex(p: unknown): number {
  const n = typeof p === 'number' ? p : Number(p ?? 0)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(MAX_PLAYERS - 1, n | 0))
}

/**
 * Button state for up to four players. Presses are latched so a tap that
 * begins and ends between two frames still registers as pressed once.
 */
export class Input {
  private held = new Uint8Array(MAX_PLAYERS * BUTTONS.length)
  private prev = new Uint8Array(MAX_PLAYERS * BUTTONS.length)
  private latch = new Uint8Array(MAX_PLAYERS * BUTTONS.length)
  private scheduled: Scheduled[] = []

  set(player: unknown, button: unknown, down: boolean): void {
    const b = buttonIndex(button)
    if (b < 0) return
    const i = playerIndex(player) * BUTTONS.length + b
    if (down && !this.held[i]) this.latch[i] = 1
    this.held[i] = down ? 1 : 0
  }

  inject(frames: InjectFrame[], currentFrame: number): void {
    for (const f of frames) {
      const b = buttonIndex(f.button)
      if (b < 0) continue
      this.scheduled.push({
        frame: currentFrame + Math.max(0, (f.at ?? 0) | 0),
        player: playerIndex(f.player),
        button: b,
        down: !!f.down,
      })
    }
    this.scheduled.sort((x, y) => x.frame - y.frame)
  }

  clearScheduled(): void {
    this.scheduled = []
  }

  /** Apply scheduled events for this frame. Call before the game's update. */
  beginFrame(frame: number): void {
    while (this.scheduled.length > 0 && this.scheduled[0]!.frame <= frame) {
      const s = this.scheduled.shift()!
      const i = s.player * BUTTONS.length + s.button
      if (s.down && !this.held[i]) this.latch[i] = 1
      this.held[i] = s.down ? 1 : 0
    }
  }

  /** Call after the game's update so btnp is a one-frame edge. */
  endFrame(): void {
    this.prev.set(this.held)
    this.latch.fill(0)
  }

  btn(name: unknown, player: unknown = 0): boolean {
    const b = buttonIndex(name)
    if (b < 0) return false
    return this.held[playerIndex(player) * BUTTONS.length + b] === 1
  }

  btnp(name: unknown, player: unknown = 0): boolean {
    const b = buttonIndex(name)
    if (b < 0) return false
    const i = playerIndex(player) * BUTTONS.length + b
    return this.latch[i] === 1 || (this.held[i] === 1 && this.prev[i] === 0)
  }

  /** START pressed by any player this frame. */
  anyStartPressed(): boolean {
    for (let p = 0; p < MAX_PLAYERS; p++) if (this.btnp('start', p)) return true
    return false
  }

  releaseAll(): void {
    this.held.fill(0)
    this.prev.fill(0)
    this.latch.fill(0)
  }
}
