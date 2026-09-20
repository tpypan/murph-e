'use client'

import { useMemo } from 'react'

export type BuildStatus = 'CONNECTING' | 'WAITING' | 'BUILDING' | 'CHECKING' | 'REPAIRING' | 'READY'

/** A typical generated game; the bar caps at 95% until the probe says READY. */
const EXPECTED_CHARS = 12000

/** The original build screen: what was said, the spec as it lands, a status
 *  line with a progress bar, and the tail of the code as it streams. One game
 *  is built; the note names the mode the badges call for and the other one. */
export function BuildConsole({
  transcript,
  spec,
  code,
  status,
  players = 1,
  badgesReady = 0,
  error,
  onCancel,
}: {
  transcript: string
  spec: { title: string; oneLiner: string; note?: string } | null
  code: string
  status: BuildStatus
  players?: number
  /** Badges that have said hello, so a 2P build can ask for the second one. */
  badgesReady?: number
  error?: string | null
  onCancel: () => void
}) {
  const tail = useMemo(() => code.split('\n').slice(-6).join('\n'), [code])
  const progress =
    status === 'READY'
      ? 1
      : status === 'REPAIRING'
        ? 0.9
        : status === 'CHECKING'
          ? 0.85
          : Math.max(0.04, Math.min(0.8, code.length / EXPECTED_CHARS))
  const label = {
    CONNECTING: 'THINKING...',
    WAITING: spec ? 'DESIGNING...' : 'THINKING...',
    BUILDING: 'WRITING...',
    CHECKING: 'TESTING...',
    REPAIRING: 'FIXING...',
    READY: 'READY!',
  }[status]
  return (
    <section className="stage build-stage" aria-label="Live game build">
      <p className="support build-said">YOU SAID: {transcript.toUpperCase()}</p>
      {spec ? (
        <>
          <h1 aria-live="polite">{spec.title}</h1>
          <p className="build-liner">{spec.oneLiner.toUpperCase()}</p>
        </>
      ) : (
        <h1 aria-live="polite" className="blink">
          THINKING...
        </h1>
      )}
      <p className="support build-version">
        {players === 2
          ? 'FOR 2 BADGES · 1 PLAYER MODE ON THE CABINET TOO'
          : 'FOR THE CABINET CONTROLS · 2 PLAYER MODE ON THE BADGES TOO'}
      </p>
      <div className="build-progress">
        <span className="build-status" aria-live="polite">
          {label}
        </span>
        <div
          className="build-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
      <section className="build-code" aria-label="Live generated code" aria-live="off">
        <pre>
          {tail}
          <span className="build-cursor" aria-hidden="true" />
        </pre>
      </section>
      {players === 2 && badgesReady < 2 && (
        <p className="support">PLUG IN BOTH BADGES WHILE THIS BUILDS</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="back" onClick={onCancel}>
        CANCEL
      </button>
    </section>
  )
}
