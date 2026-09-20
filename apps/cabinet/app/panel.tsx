'use client'

import { useEffect, useRef, useState } from 'react'
import {
  codeForPanel,
  PANEL_INPUTS,
  type PanelInput,
  panelButton,
  panelInputForCode,
} from './input'

// The simulated cabinet panel: the counterpart of the fake badge. It draws the
// stick and the A/B/X/Y diamond, lights up on every player-one press whatever
// sent it, and its buttons dispatch the encoder's own key codes as synthetic
// keyboard events, so a click here takes exactly the path a real press takes:
// ENCODER_KEYS -> PANEL_ROLES -> attachKeyboard -> the shell. On setup day it
// doubles as the mapping readout: each button prints the code it expects.

const STICK: Array<{ input: PanelInput; glyph: string; slot: string }> = [
  { input: 'up', glyph: '▲', slot: 'up' },
  { input: 'left', glyph: '◀', slot: 'left' },
  { input: 'right', glyph: '▶', slot: 'right' },
  { input: 'down', glyph: '▼', slot: 'down' },
]
// SNES geometry as the placeholder: X top, Y left, A right, B bottom. Fix on
// setup day if the real diamond differs.
const DIAMOND: Array<{ input: PanelInput; slot: string }> = [
  { input: 'x', slot: 'up' },
  { input: 'y', slot: 'left' },
  { input: 'a', slot: 'right' },
  { input: 'b', slot: 'down' },
]

function fire(type: 'keydown' | 'keyup', code: string): void {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}

export function Panel() {
  const [lit, setLit] = useState<Set<PanelInput>>(() => new Set())
  // The last key code that reached the shell as a player-one input, so a real
  // board can be checked one button at a time.
  const [last, setLast] = useState('')
  const held = useRef(new Set<PanelInput>())

  useEffect(() => {
    const set = (code: string, on: boolean) => {
      const p = panelInputForCode(code)
      if (!p) return
      setLit((prev) => {
        if (prev.has(p) === on) return prev
        const next = new Set(prev)
        if (on) next.add(p)
        else next.delete(p)
        return next
      })
    }
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return
      set(e.code, true)
      const p = panelInputForCode(e.code)
      if (p) setLast(`${p.toUpperCase()} ${e.code}`)
    }
    const up = (e: KeyboardEvent) => set(e.code, false)
    const clear = () => setLit(new Set())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      for (const p of held.current) fire('keyup', codeForPanel(p))
      held.current.clear()
    }
  }, [])

  const press = (p: PanelInput, down: boolean) => {
    if (held.current.has(p) === down) return
    if (down) held.current.add(p)
    else held.current.delete(p)
    fire(down ? 'keydown' : 'keyup', codeForPanel(p))
  }

  const button = (p: PanelInput, slot: string, face: string) => (
    <button
      type="button"
      key={p}
      className="panel-key"
      data-slot={slot}
      data-lit={lit.has(p)}
      aria-label={`Panel ${p.toUpperCase()}`}
      aria-pressed={lit.has(p)}
      tabIndex={-1}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        press(p, true)
      }}
      onPointerUp={() => press(p, false)}
      onPointerCancel={() => press(p, false)}
      onLostPointerCapture={() => press(p, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="panel-face">{face}</span>
    </button>
  )

  return (
    <section className="panel-sim" aria-label="Cabinet panel">
      <span className="panel-title">PANEL F3</span>
      <div className="panel-group">
        {STICK.map((s) => button(s.input, s.slot, s.glyph))}
        <span className="panel-hub" aria-hidden="true" />
      </div>
      <div className="panel-group">
        {DIAMOND.map((d) => button(d.input, d.slot, d.input.toUpperCase()))}
      </div>
      {/* The mapping readout: X and Y's roles, what is held, and the last code seen. */}
      <span className="panel-readout">
        X {panelButton('x').toUpperCase()} · Y {panelButton('y').toUpperCase()}
        <br />
        {PANEL_INPUTS.filter((p) => lit.has(p)).join(' ') || 'IDLE'}
        <br />
        {last || 'PRESS A KEY'}
      </span>
    </section>
  )
}
