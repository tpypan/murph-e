// The shell owns all input. Keyboard (dev), the USB encoder (keyboard too)
// and badge serial all become the same {player, button, down} event.

export type Button = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'talk'

export interface InputEvent {
  player: number
  button: Button
  down: boolean
}

// Dev mapping. The encoder mapping is the second table, filled in at M7
// once the board is on the desk (see docs/plans/tier-1.md, M7).
const DEV_KEYS: Record<string, Button> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyZ: 'a',
  KeyX: 'b',
  Enter: 'start',
  Space: 'talk',
}

const ENCODER_KEYS: Record<string, Button> = {
  // e.g. KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', KeyJ: 'a', KeyK: 'b', Digit1: 'start', KeyL: 'talk'
}

export function buttonForCode(code: string): Button | null {
  return ENCODER_KEYS[code] ?? DEV_KEYS[code] ?? null
}

/** Attach keyboard listeners; returns a detach function. */
export function attachKeyboard(onInput: (ev: InputEvent) => void): () => void {
  const typing = () => {
    const el = document.activeElement
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
  }
  const down = (e: KeyboardEvent) => {
    const b = buttonForCode(e.code)
    if (!b || typing()) return
    e.preventDefault()
    if (e.repeat) return
    onInput({ player: 0, button: b, down: true })
  }
  const up = (e: KeyboardEvent) => {
    const b = buttonForCode(e.code)
    if (!b || typing()) return
    e.preventDefault()
    onInput({ player: 0, button: b, down: false })
  }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
  }
}

/** A plausible-looking random input script for attract mode, as inject frames. */
export function attractScript(
  seconds: number,
  rnd: () => number = Math.random,
): Array<{ at: number; button: string; down: boolean }> {
  const frames: Array<{ at: number; button: string; down: boolean }> = []
  const dirs = ['left', 'right', 'up', 'down']
  let at = 0
  const end = seconds * 60
  while (at < end) {
    const d = dirs[Math.floor(rnd() * dirs.length)]!
    const hold = 10 + Math.floor(rnd() * 40)
    frames.push({ at, button: d, down: true }, { at: at + hold, button: d, down: false })
    if (rnd() < 0.7) {
      const t = at + Math.floor(rnd() * hold)
      frames.push({ at: t, button: 'a', down: true }, { at: t + 3, button: 'a', down: false })
    }
    at += hold + Math.floor(rnd() * 20)
  }
  return frames
}
