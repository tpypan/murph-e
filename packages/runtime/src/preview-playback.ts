import { BUTTONS, type Button } from './input'
import type { Runtime } from './runtime'

type Family =
  | 'fighter'
  | 'speed'
  | 'kart'
  | 'climber'
  | 'maze'
  | 'crossing'
  | 'pong'
  | 'blocks'
  | 'other'
export function previewFamily(code: string, genre = ''): Family {
  const text = genre.trim().toLowerCase() || code.toLowerCase()
  if (/speedPlatformer/.test(code)) return 'speed'
  if (/ARCADE\.fighter|fighterFactory/.test(code)) return 'fighter'
  if (/speedplatformer|speed.platformer|sonic|momentum platform/.test(text)) return 'speed'
  if (/arcade\.fighter|fighterfactory|fighting|combat/.test(text)) return 'fighter'
  if (/racing|kart|driving/.test(text)) return 'kart'
  if (/maze/.test(text)) return 'maze'
  if (/climb|platform/.test(text)) return 'climber'
  if (/crossing|frog/.test(text)) return 'crossing'
  if (/pong/.test(text)) return 'pong'
  if (/falling|block|puzzle/.test(text)) return 'blocks'
  return 'other'
}

/** Attract controls are confined to the disposable demo runtime, never game code. */
function held(family: Family, key: Button, player: number, tick: number): boolean {
  // Init is neutral. Both humans make one real picker confirmation, then release
  // through the versus card and intro. B cannot undo a character confirmation.
  if (tick < 180) return family === 'fighter' && key === 'a' && (tick === 1 || tick === 2)
  const t = tick - 180,
    offset = t + player * 29
  switch (family) {
    case 'speed':
      return (
        key === 'right' ||
        (key === 'down' && offset % 150 >= 14) ||
        (key === 'a' && offset % 150 < 14)
      )
    case 'fighter':
      return (
        (key === (player ? 'left' : 'right') && (t < 90 || offset % 180 < 35)) ||
        (key === 'a' && offset % 36 < 2) ||
        (key === 'b' && offset % 70 < 2) ||
        (key === 'up' && offset % 140 === 120)
      )
    case 'kart':
      return (
        key === 'a' ||
        (key === 'left' && offset % 180 < 30) ||
        (key === 'right' && offset % 180 > 120)
      )
    case 'maze':
      return key === ['left', 'up', 'right', 'down'][Math.floor(offset / 48) % 4]
    case 'climber':
      return (
        key === 'right' || (key === 'up' && offset % 90 > 45) || (key === 'a' && offset % 65 < 2)
      )
    case 'crossing':
      return (key === 'up' && offset % 24 < 2) || (key === 'right' && offset % 80 < 2)
    case 'pong':
      return key === (offset % 90 < 45 ? 'up' : 'down') || (key === 'a' && offset % 90 < 2)
    case 'blocks':
      return (
        key === 'down' || (key === 'a' && offset % 60 < 2) || (key === 'left' && offset % 120 < 10)
      )
    default:
      return (
        key === 'a' ||
        key === (offset % 150 < 75 ? 'left' : 'right') ||
        (key === 'up' && offset % 90 < 20)
      )
  }
}

export function createPreviewPlayback(
  runtime: Runtime,
  options: {
    code: string
    genre?: string
    demo: boolean
    motion: boolean
  },
) {
  const family = previewFamily(options.code, options.genre)
  let tick = 0,
    staticRendered = false
  const step = (count: number) => {
    if (!options.motion && staticRendered) return
    const frames = options.motion ? count : 1
    for (let i = 0; i < frames; i++) {
      if (options.demo && options.motion)
        for (let player = 0; player < runtime.players; player++)
          for (const key of BUTTONS) runtime.input.set(player, key, held(family, key, player, tick))
      runtime.step(1)
      tick++
      if (runtime.state === 'error') break
    }
    if (!options.motion) staticRendered = true
  }
  return {
    start() {
      runtime.input.releaseAll()
      tick = 0
      staticRendered = false
      runtime.start()
      if (options.demo && options.motion) step(180)
    },
    step,
  }
}
