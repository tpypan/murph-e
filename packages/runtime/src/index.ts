import { H, W } from './gfx'
import type { InjectFrame } from './input'
import { type OutMessage, Runtime, type Telemetry } from './runtime'

declare global {
  interface Window {
    __probe?: ProbeHook
    __runtime?: Runtime
  }
}

export interface ProbeHook {
  load: (
    code: string,
    seed?: number,
    title?: string,
    players?: number,
  ) => { ok: boolean; error?: string }
  start: () => void
  reset: () => void
  step: (n?: number) => {
    state: string
    score: number
    scores: number[]
    winner: number | null
    frame: number
    error: string | null
  }
  frameHash: () => string
  frameStats: () => { colors: number; dominant: number; dominantShare: number }
  telemetry: () => Telemetry
  state: () => string
  score: () => number
  inject: (frames: InjectFrame[]) => void
  input: (player: number, button: string, down: boolean) => void
  errors: () => Array<{ message: string; stack: string; phase: string }>
  snapshot: () => string // data URL of the framebuffer as a PNG
}

const params = new URLSearchParams(location.search)
const probe = params.get('probe') === '1'
const canvas = document.getElementById('screen') as HTMLCanvasElement
canvas.width = W
canvas.height = H

const errors: Array<{ message: string; stack: string; phase: string }> = []
const post = (msg: OutMessage): void => {
  if (msg.type === 'error')
    errors.push({ message: msg.message, stack: msg.stack, phase: msg.phase })
  if (probe && msg.type === 'frame') return
  if (window.parent !== window) window.parent.postMessage(msg, '*')
}

const rt = new Runtime(canvas, { probe, post })
window.__runtime = rt

function fit(): void {
  const scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)))
  canvas.style.width = `${W * scale}px`
  canvas.style.height = `${H * scale}px`
}
fit()
addEventListener('resize', fit)

window.addEventListener('message', (ev: MessageEvent) => {
  const m = ev.data
  if (!m || typeof m !== 'object' || typeof m.type !== 'string') return
  switch (m.type) {
    case 'load':
      rt.load(
        String(m.code ?? ''),
        Number(m.seed ?? 1),
        String(m.title ?? ''),
        Number(m.hi ?? 0),
        Number(m.players ?? 1),
      )
      break
    case 'start':
      rt.start()
      break
    case 'reset':
      rt.reset()
      break
    case 'end':
      rt.end()
      break
    case 'input':
      rt.setInput(m.player ?? 0, m.button, !!m.down)
      break
    case 'inject':
      rt.inject(Array.isArray(m.frames) ? m.frames : [])
      break
  }
})

if (probe) {
  const hook: ProbeHook = {
    load: (code, seed = 1, title = '', players = 1) => {
      errors.length = 0
      return rt.load(code, seed, title, 0, players)
    },
    start: () => rt.start(),
    reset: () => rt.reset(),
    step: (n = 1) => {
      rt.step(n)
      const last = errors[errors.length - 1]
      return {
        state: rt.state,
        score: rt.score,
        scores: rt.scores.slice(0, rt.players),
        winner: rt.winner,
        frame: rt.frame,
        error: last ? `${last.phase}: ${last.message}` : null,
      }
    },
    frameHash: () => rt.frameHash(),
    frameStats: () => rt.screen.stats(),
    telemetry: () => rt.telemetry,
    state: () => rt.state,
    score: () => rt.score,
    inject: (frames) => rt.inject(frames),
    input: (player, button, down) => rt.setInput(player, button, down),
    errors: () => errors.slice(),
    snapshot: () => {
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const ctx = c.getContext('2d')!
      const img = ctx.createImageData(W, H)
      rt.screen.blit(new Uint32Array(img.data.buffer))
      ctx.putImageData(img, 0, 0)
      return c.toDataURL('image/png')
    },
  }
  window.__probe = hook
} else {
  rt.run()
}
