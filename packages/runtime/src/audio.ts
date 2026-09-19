// A tiny Web Audio synth: eight named effects plus a raw tone. Everything is
// generated, nothing is loaded. Muted entirely in probe mode.

export type Wave = 'square' | 'triangle' | 'saw' | 'noise'
export const SFX_NAMES = [
  'jump',
  'hit',
  'coin',
  'explode',
  'select',
  'die',
  'powerup',
  'shoot',
] as const
export type SfxName = (typeof SFX_NAMES)[number]

interface Note {
  wave: Wave
  f?: number
  to?: number
  ms: number
  delay?: number
  vol?: number
}

const SFX: Record<SfxName, Note[]> = {
  jump: [{ wave: 'square', f: 260, to: 720, ms: 120 }],
  hit: [
    { wave: 'saw', f: 220, to: 60, ms: 150 },
    { wave: 'noise', ms: 80, vol: 0.4 },
  ],
  coin: [
    { wave: 'square', f: 988, ms: 70 },
    { wave: 'square', f: 1319, ms: 220, delay: 70 },
  ],
  explode: [
    { wave: 'noise', ms: 450 },
    { wave: 'saw', f: 120, to: 30, ms: 400, vol: 0.5 },
  ],
  select: [{ wave: 'square', f: 660, ms: 50 }],
  die: [
    { wave: 'saw', f: 440, to: 40, ms: 600 },
    { wave: 'noise', ms: 300, delay: 120, vol: 0.5 },
  ],
  powerup: [
    { wave: 'triangle', f: 440, to: 880, ms: 120 },
    { wave: 'triangle', f: 880, to: 1760, ms: 220, delay: 120 },
  ],
  shoot: [{ wave: 'square', f: 900, to: 200, ms: 90 }],
}

const OSC_TYPE: Record<Exclude<Wave, 'noise'>, OscillatorType> = {
  square: 'square',
  triangle: 'triangle',
  saw: 'sawtooth',
}

export class Synth {
  private ctx: AudioContext | null = null
  private noise: AudioBuffer | null = null
  private lastPlayed = new Map<string, number>()
  private muted: boolean

  constructor(muted: boolean) {
    this.muted = muted
  }

  private ensure(): AudioContext | null {
    if (this.muted) return null
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext()
      } catch {
        this.muted = true
        return null
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    return this.ctx
  }

  /** Call from any user-gesture-ish moment so the context can start. */
  unlock(): void {
    this.ensure()
  }

  sfx(name: unknown): void {
    const key = String(name)
    const notes = SFX[key as SfxName]
    if (!notes) return
    // A game that calls sfx('hit') every frame while colliding would drone.
    const now = performance.now()
    if (now - (this.lastPlayed.get(key) ?? -1e9) < 40) return
    this.lastPlayed.set(key, now)
    for (const n of notes) this.play(n)
  }

  tone(freq: unknown, ms: unknown, wave: unknown = 'square'): void {
    const f = Number(freq)
    const d = Number(ms)
    if (!Number.isFinite(f) || !Number.isFinite(d) || d <= 0) return
    const w = String(wave) as Wave
    const now = performance.now()
    const key = `tone:${f | 0}`
    if (now - (this.lastPlayed.get(key) ?? -1e9) < 30) return
    this.lastPlayed.set(key, now)
    this.play({ wave: w in OSC_TYPE || w === 'noise' ? w : 'square', f, ms: Math.min(d, 2000) })
  }

  private play(n: Note): void {
    const ctx = this.ensure()
    if (!ctx) return
    const t0 = ctx.currentTime + (n.delay ?? 0) / 1000
    const dur = n.ms / 1000
    const gain = ctx.createGain()
    const vol = (n.vol ?? 1) * 0.12
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    gain.connect(ctx.destination)
    if (n.wave === 'noise') {
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer(ctx)
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(4000, t0)
      filter.frequency.exponentialRampToValueAtTime(200, t0 + dur)
      src.connect(filter).connect(gain)
      src.start(t0)
      src.stop(t0 + dur + 0.05)
      return
    }
    const osc = ctx.createOscillator()
    osc.type = OSC_TYPE[n.wave]
    osc.frequency.setValueAtTime(n.f ?? 440, t0)
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + dur)
    osc.connect(gain)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noise) return this.noise
    const len = ctx.sampleRate
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.noise = buf
    return buf
  }
}
