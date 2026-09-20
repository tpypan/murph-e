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
  KeyV: 'talk',
}

const ENCODER_KEYS: Record<string, Button> = {
  // e.g. KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', KeyJ: 'a', KeyK: 'b', Digit1: 'start', KeyL: 'talk'
}

// Player 2 from the keyboard, for playing a two-player game alone while
// developing. On the cabinet player 2 is a badge.
const DEV_KEYS_P2: Record<string, Button> = {
  KeyI: 'up',
  KeyK: 'down',
  KeyJ: 'left',
  KeyL: 'right',
  KeyN: 'a',
  KeyM: 'b',
}

export function buttonForCode(code: string): { player: number; button: Button } | null {
  const b = ENCODER_KEYS[code] ?? DEV_KEYS[code]
  if (b) return { player: 0, button: b }
  const p2 = DEV_KEYS_P2[code]
  return p2 ? { player: 1, button: p2 } : null
}

/** Attach keyboard listeners; returns a detach function. */
export function attachKeyboard(onInput: (ev: InputEvent) => void): () => void {
  const pressed = new Map<string, { player: number; button: Button }>()
  const down = (e: KeyboardEvent) => {
    const b = buttonForCode(e.code)
    if (!b || e.altKey || e.ctrlKey || e.metaKey) return
    const el = document.activeElement
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
    if (el instanceof HTMLButtonElement && (e.code === 'Enter' || e.code === 'Space')) return
    e.preventDefault()
    if (e.repeat) return
    pressed.set(e.code, b)
    onInput({ ...b, down: true })
  }
  const up = (e: KeyboardEvent) => {
    const b = pressed.get(e.code)
    if (!b) return
    pressed.delete(e.code)
    e.preventDefault()
    if (![...pressed.values()].some((held) => held.player === b.player && held.button === b.button))
      onInput({ ...b, down: false })
  }
  const release = () => {
    for (const b of pressed.values()) onInput({ ...b, down: false })
    pressed.clear()
  }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', release)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', release)
    release()
  }
}
