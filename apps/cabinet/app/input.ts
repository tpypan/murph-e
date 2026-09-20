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

// ---- the real cabinet board: a USB HID gamepad ------------------------------
// The panel enumerates as "ESP32-S3 Arcade Controller" (vendor 0x303a): a HID
// game pad with six axes, an eight-way hat switch and 32 buttons, not a
// keyboard. The Gamepad API is polled and every change is replayed as the
// encoder key code of the same panel input, so attachKeyboard, the F3
// overlay, the tests and the 1P/2P routing all see the one path.
export interface GamepadMap {
  /** Gamepad API button index -> panel input. */
  buttons: Record<number, PanelInput>
  /** Axis indices for the stick; a hat switch is one axis Chrome encodes in eighths. */
  axes: { x?: number; y?: number; hat?: number }
  /** The sign of the Y axis when the stick is pushed up (the Gamepad API convention is -1). */
  yUp: 1 | -1
  /** Only pads whose id contains this drive the cabinet. */
  idIncludes: string
}

// Read from the real board on 2026-09-20 with a raw HID capture
// (docs/encoder-bringup.md): the stick is an analog joystick on X and Y,
// 8-bit signed, and pushing UP is +Y; A B X Y are HID buttons 1 to 4, which
// the Gamepad API numbers 0 to 3. The hat switch and the other four axes in
// the descriptor never move.
export const GAMEPAD: GamepadMap = {
  buttons: { 0: 'a', 1: 'b', 2: 'x', 3: 'y' },
  axes: { x: 0, y: 1 },
  yUp: 1,
  idIncludes: 'Arcade',
}
const AXIS_DEADZONE = 0.5

/** Which panel inputs a pad state holds down, by the map. */
export function gamepadInputs(
  pad: { buttons: ReadonlyArray<{ pressed: boolean }>; axes: ReadonlyArray<number> },
  map: GamepadMap = GAMEPAD,
): Set<PanelInput> {
  const held = new Set<PanelInput>()
  for (const [index, input] of Object.entries(map.buttons))
    if (pad.buttons[Number(index)]?.pressed) held.add(input)
  const axis = (i: number | undefined) => (i === undefined ? 0 : (pad.axes[i] ?? 0))
  const x = axis(map.axes.x)
  const y = axis(map.axes.y) * map.yUp
  if (x <= -AXIS_DEADZONE) held.add('left')
  if (x >= AXIS_DEADZONE) held.add('right')
  if (y >= AXIS_DEADZONE) held.add('up')
  if (y <= -AXIS_DEADZONE) held.add('down')
  // Chrome reports a raw hat switch as one axis: -1 is up, then clockwise in
  // steps of 2/7 to 1 (up-left); anything outside [-1, 1] is centred.
  const hat = axis(map.axes.hat)
  if (map.axes.hat !== undefined && Math.abs(hat) <= 1.0001) {
    const step = Math.round(((hat + 1) / 2) * 7) % 8
    for (const d of (
      [
        ['up'],
        ['up', 'right'],
        ['right'],
        ['down', 'right'],
        ['down'],
        ['down', 'left'],
        ['left'],
        ['up', 'left'],
      ] as PanelInput[][]
    )[step] ?? [])
      held.add(d)
  }
  return held
}

/**
 * Poll the cabinet pad and replay changes as keyboard events carrying the
 * encoder codes; returns a detach function. Chrome exposes a pad only after
 * its first press, so the very first press on a fresh page is consumed.
 */
export function attachGamepad(map: GamepadMap = GAMEPAD): () => void {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return () => {}
  let held = new Set<PanelInput>()
  let frame = 0
  const fire = (type: 'keydown' | 'keyup', p: PanelInput) =>
    window.dispatchEvent(
      new KeyboardEvent(type, { code: codeForPanel(p), bubbles: true, cancelable: true }),
    )
  const release = () => {
    for (const p of held) fire('keyup', p)
    held = new Set()
  }
  const tick = () => {
    frame = requestAnimationFrame(tick)
    const pad = [...navigator.getGamepads()].find(
      (g) => g?.connected && g.id.includes(map.idIncludes),
    )
    const now = pad ? gamepadInputs(pad, map) : new Set<PanelInput>()
    for (const p of now) if (!held.has(p)) fire('keydown', p)
    for (const p of held) if (!now.has(p)) fire('keyup', p)
    held = now
  }
  frame = requestAnimationFrame(tick)
  window.addEventListener('blur', release)
  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('blur', release)
    release()
  }
}
