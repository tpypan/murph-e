'use client'

import { useLayoutEffect, useRef } from 'react'
import { controlReminders } from './control-labels'

/** A persistent legend, outside the framebuffer so it never covers the game. */
export function GameControls({
  controls,
  players,
  cabinet = false,
}: {
  controls: Array<[string, string]>
  players: number
  /** On the cabinet the keycaps are the panel's own letters; the Z/X hints are for a keyboard. */
  cabinet?: boolean
}) {
  const footer = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = footer.current
    const screen = el?.closest<HTMLElement>('.arcade-screen')
    if (!el || !screen) return
    const measure = () =>
      screen.style.setProperty('--game-controls-height', `${el.getBoundingClientRect().height}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      observer.disconnect()
      screen.style.removeProperty('--game-controls-height')
    }
  }, [])

  const rows = controls.map(([key, action]) => ({ key, action }))
  // Combine opposing directions only when the descriptions otherwise match.
  for (const [first, second] of [
    ['left', 'right'],
    ['up', 'down'],
  ]) {
    const a = rows.find((row) => row.key === first)
    const b = rows.find((row) => row.key === second)
    if (!a || !b) continue
    const withoutDirection = (text: string) =>
      text
        .toUpperCase()
        .replace(/\b(LEFT|RIGHT|UP|DOWN)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    const action = withoutDirection(a.action)
    if (!action || action !== withoutDirection(b.action)) continue
    a.key = `${first}/${second}`
    a.action = action
    rows.splice(rows.indexOf(b), 1)
  }

  return (
    <section ref={footer} className="game-controls" aria-label="Game controls">
      <dl
        className="game-control-legend"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, rows.length)}, minmax(0, 1fr))` }}
      >
        {rows.map(({ key, action }) => (
          <div key={key}>
            <dt title={key}>
              {key === 'a'
                ? cabinet
                  ? 'A'
                  : 'A / Z'
                : key === 'b'
                  ? cabinet
                    ? 'B'
                    : 'B / X'
                  : key === 'left/right'
                    ? 'L / R'
                    : key === 'up/down'
                      ? 'U / D'
                      : key}
            </dt>
            <dd title={action}>
              {[...new Set(controlReminders(key, action))].map((line) => (
                <span key={line}>{line}</span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <div className="game-hints">
        {players === 2 && !cabinet && <span className="game-control-p2">P2: IJKL · N/M</span>}
        {cabinet && <span>{players === 2 ? 'BADGES PLAY' : 'CABINET PLAYS'}</span>}
        <span>{cabinet && players !== 2 ? 'X: PAUSE' : 'START: PAUSE'}</span>
      </div>
    </section>
  )
}
