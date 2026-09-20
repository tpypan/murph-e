'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PALETTE_HEX } from '../../../packages/runtime/src/palette'
import { codeWindow, type DraftSprite, draftScene, draftSprites } from './build-preview'

function SpritePreview({ sprite }: { sprite: DraftSprite }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 128, 128)
    const width = Math.max(...sprite.rows.map((row) => row.length))
    const scale = Math.max(1, Math.floor(120 / Math.max(width, sprite.rows.length)))
    const left = Math.floor((128 - width * scale) / 2)
    const top = Math.floor((128 - sprite.rows.length * scale) / 2)
    sprite.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.' || row[x] === ' ') continue
        ctx.fillStyle = (sprite.palette ?? PALETTE_HEX)[Number.parseInt(row[x]!, 16)]!
        ctx.fillRect(left + x * scale, top + y * scale, scale, scale)
      }
    })
  }, [sprite])
  return (
    <canvas
      ref={canvas}
      className="build-sprite"
      width={128}
      height={128}
      role="img"
      aria-label={`Sprite taking shape: ${sprite.name}`}
    />
  )
}

function DraftPreview({
  code,
  players,
  foundation,
}: {
  code: string
  players: number
  foundation?: { prefix: string; demo: string } | null
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const latest = useRef(code)
  latest.current = code
  const [visible, setVisible] = useState(false)
  const sprites = useMemo(() => draftSprites(code).slice(0, 3), [code])
  useEffect(() => {
    const previewWindow = frame.current?.contentWindow
    let ready = false
    let previous = ''
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const send = () => {
      previewWindow?.postMessage({ type: 'preview-heartbeat' }, '*')
      if (!ready) {
        frame.current?.contentWindow?.postMessage({ type: 'preview-ping' }, '*')
        return
      }
      const custom = draftScene(latest.current)
      const draft = foundation ? foundation.prefix + (custom ?? foundation.demo) : custom
      if (!draft || draft === previous) return
      previous = draft
      frame.current?.contentWindow?.postMessage(
        { type: 'preview-code', code: draft, players, motion: !motion.matches },
        '*',
      )
    }
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'preview-ready') {
        ready = true
        send()
      }
      if (event.data?.type === 'preview-frame') setVisible(true)
    }
    const changeMotion = () => {
      previous = ''
      send()
    }
    window.addEventListener('message', receive)
    motion.addEventListener('change', changeMotion)
    const timer = setInterval(send, 800)
    return () => {
      previewWindow?.postMessage({ type: 'preview-stop' }, '*')
      clearInterval(timer)
      window.removeEventListener('message', receive)
      motion.removeEventListener('change', changeMotion)
    }
  }, [players, foundation])
  return (
    <section className="build-preview" aria-label="Live visual preview">
      <span className="build-preview-label">DRAFT</span>
      <div className="build-preview-art">
        <iframe
          ref={frame}
          src="/runtime/build-preview.html"
          sandbox="allow-scripts"
          title="Draft game scene"
          className={`build-scene${visible ? ' is-visible' : ''}`}
          tabIndex={-1}
          aria-hidden={!visible}
        />
        {!visible &&
          (sprites.length ? (
            <div className="build-sprites">
              {sprites.map((sprite) => (
                <SpritePreview key={sprite.name} sprite={sprite} />
              ))}
            </div>
          ) : (
            <div className="build-preview-pending">
              <div className="build-waiting" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <span>WAITING FOR ART</span>
            </div>
          ))}
      </div>
    </section>
  )
}

export type BuildStatus = 'CONNECTING' | 'WAITING' | 'BUILDING' | 'CHECKING' | 'REPAIRING' | 'READY'

export function BuildConsole({
  code,
  foundation,
  title,
  status,
  players = 1,
  note,
  onCancel,
}: {
  code: string
  foundation?: { prefix: string; demo: string } | null
  title?: string
  status: BuildStatus
  players?: number
  /** One line under the heading, e.g. which version this stream is. */
  note?: string
  onCancel: () => void
}) {
  const lines = useMemo(() => codeWindow(code, 30, 11), [code])
  const label = {
    CONNECTING: 'COOKING YOUR IDEA',
    WAITING: title ? 'DESIGNING YOUR GAME' : 'READING YOUR IDEA',
    BUILDING: 'WRITING YOUR GAME',
    CHECKING: 'TESTING THE CONTROLS',
    REPAIRING: 'FIXING A GLITCH',
    READY: 'READY TO PLAY',
  }[status]
  const cursor = status === 'CHECKING' ? null : <span className="build-cursor" aria-hidden="true" />
  return (
    <section className="stage build-stage" aria-label="Live game build">
      <h1 aria-live="polite">{label}</h1>
      {note && <p className="support">{note}</p>}
      <div className="build-workbench">
        <section className="build-code" aria-label="Live generated code" aria-live="off">
          {code ? (
            <pre>
              {lines.join('\n')}
              {cursor}
            </pre>
          ) : (
            <div className="build-waiting" role="img" aria-label="Waiting for game code">
              <i />
              <i />
              <i />
              <i />
            </div>
          )}
        </section>
        <DraftPreview
          key={status === 'REPAIRING' ? 'repair' : 'build'}
          code={code}
          foundation={foundation}
          players={players}
        />
      </div>
      <button type="button" className="back" onClick={onCancel}>
        CANCEL
      </button>
    </section>
  )
}
