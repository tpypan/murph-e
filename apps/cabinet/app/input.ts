// The shell owns all input. Keyboard (dev), the USB encoder (keyboard too)
// and badge serial all become the same {player, button, down} event. Who
// plays is fixed by the mode: a one-player game is played on the cabinet
// controls, a two-player game on the two badges (cabinet.tsx routes it).

export type Button = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'talk'

export interface InputEvent {
  player: number
  button: Button
  down: boolean
}

// Dev mapping: what a laptop keyboard means while developing.
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

// The physical panel on the cabinet: a joystick and four buttons A, B, X, Y in
// a diamond, on a USB encoder that enumerates as a keyboard. The panel's own
// names are the vocabulary here; PANEL_ROLES says what X and Y mean to the
// shell. A is always confirm and B is always back on every shell screen; in a
// game they are the game's A and B.
export type PanelInput = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y'
export const PANEL_INPUTS: readonly PanelInput[] = [
  'up',
  'down',
  'left',
  'right',
  'a',
  'b',
  'x',
  'y',
]

// PLACEHOLDER codes until the board is on the desk. They only need to be codes
// nothing else uses, so the whole encoder path can be exercised now: from the
// numpad, from the F3 panel overlay, or from Playwright. On setup day read the
// real codes with packages/runtime/keys.html (or the overlay, which prints the
// code under each button) and replace these values; keep the panel names.
export const ENCODER_KEYS: Record<string, PanelInput> = {
  Numpad8: 'up',
  Numpad2: 'down',
  Numpad4: 'left',
  Numpad6: 'right',
  Numpad1: 'a',
  Numpad3: 'b',
  Numpad7: 'x',
  Numpad9: 'y',
}

// The one setup-day decision: which of X and Y is START and which is TALK.
// Sticker the buttons to match; the screen keeps saying START and TALK.
export const PANEL_ROLES: Record<'x' | 'y', Button> = { x: 'start', y: 'talk' }

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

/** What a panel input means to the shell. */
export function panelButton(p: PanelInput): Button {
  return p === 'x' || p === 'y' ? PANEL_ROLES[p] : p
}

/** The keyboard code the encoder sends for a panel input (the overlay dispatches it). */
export function codeForPanel(p: PanelInput): string {
  for (const [code, input] of Object.entries(ENCODER_KEYS)) if (input === p) return code
  return ''
}

/**
 * Which panel input a key code lights up: encoder codes directly, dev keys by
 * their meaning (Enter lights whichever of X/Y is START), so the overlay
 * mirrors every player-one press whatever sent it.
 */
export function panelInputForCode(code: string): PanelInput | null {
  const p = ENCODER_KEYS[code]
  if (p) return p
  const b = DEV_KEYS[code]
  if (!b) return null
  if (b === 'start' || b === 'talk') {
    return PANEL_ROLES.x === b ? 'x' : PANEL_ROLES.y === b ? 'y' : null
  }
  return b
}

export function buttonForCode(code: string): { player: number; button: Button } | null {
  const p = ENCODER_KEYS[code]
  if (p) return { player: 0, button: panelButton(p) }
  const b = DEV_KEYS[code]
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
