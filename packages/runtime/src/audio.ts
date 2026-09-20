// A tiny Web Audio synth: eight named effects plus a raw tone. Everything is
// generated, nothing is loaded. Muted entirely in probe mode.

import { SFX_BANK, type SfxName, type SfxNote, type Wave } from './sound-bank'

export { SFX_NAMES, type SfxName, type Wave } from './sound-bank'

const OSC_TYPE: Record<Exclude<Wave, 'noise'>, OscillatorType> = {
  square: 'square',
  triangle: 'triangle',
  saw: 'sawtooth',
}

export class Synth {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private lastPlayed = new Map<string, number>()
  private muted: boolean

  constructor(muted: boolean) {
    this.muted = muted
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master) this.master.gain.value = muted ? 0 : 1
  }

  private ensure(): AudioContext | null {
    if (this.muted) return null
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext()
        this.master = this.ctx.createGain()
        this.master.connect(this.ctx.destination)
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
    const notes = SFX_BANK[key as SfxName]
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

  private play(n: SfxNote): void {
    const ctx = this.ensure()
    if (!ctx) return
    const t0 = ctx.currentTime + (n.delay ?? 0) / 1000
    const dur = n.ms / 1000
    const gain = ctx.createGain()
    const vol = (n.vol ?? 1) * 0.12
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    gain.connect(this.master!)
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
