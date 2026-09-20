import { createPreviewPlayback } from './preview-playback'
import { Runtime } from './runtime'

// This bundle runs only in a disposable worker inside an opaque-origin iframe.
// Never import it into the cabinet's window: generated drafts can loop or throw.
const send = globalThis.postMessage.bind(globalThis)
const closeWorker = globalThis.close.bind(globalThis)
let lastHeartbeat = performance.now()
let timer: ReturnType<typeof setTimeout> | undefined
globalThis.onmessage = (
  event: MessageEvent<{
    type?: string
    code?: string
    players?: number
    motion?: boolean
    mode?: string
    genre?: string
  }>,
) => {
  if (event.data.type === 'heartbeat') {
    lastHeartbeat = performance.now()
    return
  }
  clearTimeout(timer)
  const { code, players, motion, mode, genre } = event.data
  if (typeof code !== 'string') return
  const runtime = new Runtime(null as unknown as HTMLCanvasElement, { probe: true, post: () => {} })
  if (!runtime.load(code, 7, '', 0, players).ok) {
    send({ type: 'unavailable' })
    return
  }
  const demo = mode === 'demo'
  const playback = createPreviewPlayback(runtime, { code, genre, demo, motion: !!motion })
  playback.start()
  const tick = () => {
    // Also expire if the owning iframe disappears before its stop message runs.
    if (performance.now() - lastHeartbeat > 2000) {
      closeWorker()
      return
    }
    playback.step(motion ? 6 : 1)
    if (runtime.state === 'error') {
      send({ type: 'unavailable' })
      return
    }
    const pixels = new Uint8Array(256 * 224 * 4)
    const packed = new Uint32Array(pixels.buffer)
    runtime.screen.blit(packed)
    send({ type: 'pixels', pixels })
    if (motion) {
      if (runtime.gameFrame >= (demo ? 1800 : 240) || runtime.state !== 'playing') playback.start()
      timer = setTimeout(tick, 100)
    } else closeWorker()
  }
  tick()
}
