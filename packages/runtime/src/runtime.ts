import { type SfxName, Synth } from './audio'
import { H, Screen, type Sprite, W } from './gfx'
import { type Button, type InjectFrame, Input } from './input'
import { makeRng } from './rng'

export type State = 'idle' | 'title' | 'playing' | 'gameover' | 'win' | 'error'

export type OutMessage =
  | { type: 'ready'; title: string; players: number }
  | {
      type: 'state'
      state: State
      score: number
      hi: number
      players: number
      scores: number[]
      winner: number | null
    }
  | { type: 'error'; message: string; stack: string; phase: string }
  | { type: 'frame'; hash: string; frame: number }

interface GameFns {
  init: ((api: Api) => void) | null
  update: ((api: Api, dt: number) => void) | null
  draw: ((api: Api) => void) | null
}

// biome-ignore lint/suspicious/noExplicitAny: the api is a loose bag by design
export type Api = Record<string, any>

export interface RuntimeOptions {
  probe: boolean
  post: (msg: OutMessage) => void
}

const DT = 1 / 60
const START_LOCKOUT_FRAMES = 45 // so mashing A/START does not skip GAME OVER
const MAX_CATCHUP = 4
const HUD_ROWS = 12
// Player colours, fixed so every two-player game reads the same way.
export const PLAYER_COLORS = [12, 8] as const

function deny(name: string): () => never {
  return () => {
    throw new Error(`${name} is not available in games. Do everything inside update(api, dt).`)
  }
}

function compile(code: string, api: Api, gameMath: Math): GameFns {
  const body = `${code}\n;return {\n  init: typeof init === 'function' ? init : null,\n  update: typeof update === 'function' ? update : null,\n  draw: typeof draw === 'function' ? draw : null\n};`
  const factory = new Function(
    'api',
    'Math',
    'window',
    'document',
    'globalThis',
    'self',
    'setTimeout',
    'setInterval',
    'requestAnimationFrame',
    'fetch',
    'XMLHttpRequest',
    'localStorage',
    'alert',
    'prompt',
    'confirm',
    body,
  )
  return factory(
    api,
    gameMath,
    undefined,
    undefined,
    undefined,
    undefined,
    deny('setTimeout'),
    deny('setInterval'),
    deny('requestAnimationFrame'),
    deny('fetch'),
    undefined,
    undefined,
    deny('alert'),
    deny('prompt'),
    deny('confirm'),
  ) as GameFns
}

export class Runtime {
  readonly screen = new Screen()
  readonly input = new Input()
  private readonly synth: Synth
  private readonly opts: RuntimeOptions
  private readonly ctx: CanvasRenderingContext2D | null
  private readonly image: ImageData | null
  private readonly pixels: Uint32Array | null

  state: State = 'idle'
  /** Player one's score, or the shared score. `scores` has every player. */
  score = 0
  scores = [0, 0]
  hi = 0
  players = 1
  winner: number | null = null
  title = ''
  frame = 0 // frames since the runtime started
  gameFrame = 0 // frames since init()
  private game: GameFns | null = null
  private api: Api
  private rng: () => number = makeRng(1)
  private seed = 1
  private pendingState: State | null = null
  private lockout = 0
  private flashFrames = 0
  private flashColor = 7
  private shakeFrames = 0
  private errorMessage = ''
  private accumulator = 0
  private lastTime = 0
  private running = false

  constructor(canvas: HTMLCanvasElement, opts: RuntimeOptions) {
    this.opts = opts
    this.synth = new Synth(opts.probe)
    this.ctx = opts.probe ? null : canvas.getContext('2d')
    if (this.ctx) {
      this.image = this.ctx.createImageData(W, H)
      this.pixels = new Uint32Array(this.image.data.buffer)
    } else {
      this.image = null
      this.pixels = null
    }
    this.api = this.makeApi()
  }

  // ---- shell-facing ------------------------------------------------------

  load(code: string, seed = 1, title = '', hi = 0, players = 1): { ok: boolean; error?: string } {
    this.seed = seed >>> 0 || 1
    this.rng = makeRng(this.seed)
    this.title = String(title || '').slice(0, 20)
    this.hi = Math.max(0, hi | 0)
    this.players = players === 2 ? 2 : 1
    this.resetScores()
    this.game = null
    this.errorMessage = ''
    this.input.releaseAll()
    this.input.clearScheduled()
    this.api = this.makeApi()
    const gameMath: Math = Object.create(Math)
    Object.defineProperty(gameMath, 'random', { value: () => this.rng(), writable: true })
    try {
      const fns = compile(String(code), this.api, gameMath)
      const missing = (['init', 'update', 'draw'] as const).filter((k) => !fns[k])
      if (missing.length > 0) {
        throw new Error(`game.js must define ${missing.join(', ')} as top-level functions`)
      }
      this.game = fns
    } catch (e) {
      this.crash(e, 'load')
      return { ok: false, error: this.errorMessage }
    }
    this.setState('title')
    if (!this.runInit()) return { ok: false, error: this.errorMessage }
    this.opts.post({ type: 'ready', title: this.title, players: this.players })
    return { ok: true }
  }

  start(): void {
    if (!this.game || this.state === 'error') return
    this.beginPlay()
  }

  reset(): void {
    if (!this.game) return
    this.resetScores()
    this.input.clearScheduled()
    this.setState('title')
    this.runInit()
  }

  /** End the current round now, as if the game had called gameOver(). A shell
   *  tool for walkthroughs; games never see it. */
  end(): void {
    if (this.state !== 'playing') return
    this.flashFrames = 0
    this.drawHud()
    this.setState('gameover')
    this.lockout = START_LOCKOUT_FRAMES
  }

  setInput(player: unknown, button: unknown, down: boolean): void {
    this.input.set(player, button, down)
    if (down) this.synth.unlock()
  }

  inject(frames: InjectFrame[]): void {
    if (!Array.isArray(frames)) return
    this.input.inject(frames, this.frame)
  }

  /** Run n fixed steps synchronously. Used by the probe and by tests. */
  step(n = 1): void {
    for (let i = 0; i < n; i++) this.tick()
  }

  /** Hash of the game area only: the runtime's own HUD strip is excluded so a
   *  ticking score cannot pass for motion. */
  frameHash(): string {
    return this.screen.hash(HUD_ROWS)
  }

  // ---- loop --------------------------------------------------------------

  run(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    const loop = (now: number) => {
      if (!this.running) return
      const elapsed = Math.min(0.25, (now - this.lastTime) / 1000)
      this.lastTime = now
      this.accumulator += elapsed
      let steps = 0
      while (this.accumulator >= DT && steps < MAX_CATCHUP) {
        this.tick()
        this.accumulator -= DT
        steps++
      }
      if (steps === MAX_CATCHUP) this.accumulator = 0
      this.present()
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  stop(): void {
    this.running = false
  }

  private tick(): void {
    this.input.beginFrame(this.frame)
    switch (this.state) {
      case 'idle':
        this.screen.cls(0)
        this.screen.textCenter('NO GAME LOADED', 108, 5)
        break
      case 'title':
        if (this.lockout > 0) this.lockout--
        else if (this.input.anyStartPressed()) {
          this.beginPlay()
          break
        }
        this.guard('draw', () => this.game?.draw?.(this.api))
        this.drawHud()
        this.drawTitle()
        break
      case 'playing':
        this.gameFrame++
        this.api.frame = this.gameFrame
        this.api.t = this.gameFrame * DT
        this.guard('update', () => this.game?.update?.(this.api, DT))
        if (this.state !== 'playing') break
        this.guard('draw', () => this.game?.draw?.(this.api))
        if (this.state !== 'playing') break
        if (this.pendingState) {
          // Freeze on the scene, not on a flash frame.
          this.flashFrames = 0
          this.drawHud()
          const next = this.pendingState
          this.pendingState = null
          this.setState(next)
          this.lockout = START_LOCKOUT_FRAMES
          break
        }
        this.applyFlash()
        this.drawHud()
        break
      case 'gameover':
      case 'win':
        if (this.lockout > 0) this.lockout--
        else if (this.input.anyStartPressed()) {
          this.beginPlay()
          break
        }
        this.drawEnd()
        break
      case 'error':
        this.drawError()
        break
    }
    this.input.endFrame()
    this.frame++
    if (this.opts.probe)
      this.opts.post({ type: 'frame', hash: this.screen.hash(), frame: this.frame })
  }

  private present(): void {
    if (!this.ctx || !this.image || !this.pixels) return
    this.screen.blit(this.pixels)
    let dx = 0
    let dy = 0
    if (this.shakeFrames > 0) {
      this.shakeFrames--
      const amp = 2
      dx = Math.round((Math.random() * 2 - 1) * amp)
      dy = Math.round((Math.random() * 2 - 1) * amp)
      this.ctx.fillStyle = '#000'
      this.ctx.fillRect(0, 0, W, H)
    }
    this.ctx.putImageData(this.image, dx, dy)
  }

  // ---- state -------------------------------------------------------------

  private beginPlay(): void {
    if (!this.game) return
    this.resetScores()
    this.lockout = 0
    this.pendingState = null
    this.flashFrames = 0
    this.shakeFrames = 0
    this.input.clearScheduled()
    if (!this.runInit()) return
    this.setState('playing')
    this.synth.sfx('select')
  }

  private runInit(): boolean {
    this.gameFrame = 0
    this.api.frame = 0
    this.api.t = 0
    this.rng = makeRng(this.seed)
    this.screen.cls(0)
    return this.guard('init', () => this.game?.init?.(this.api))
  }

  private resetScores(): void {
    this.score = 0
    this.scores = [0, 0]
    this.winner = null
  }

  /** Change one player's score, or every player's when p is omitted in 2P. */
  private setScore(p: unknown, f: (old: number) => number): void {
    const n = typeof p === 'number' && Number.isFinite(p) ? p | 0 : null
    const targets = this.players === 2 ? (n === null ? [0, 1] : [Math.max(0, Math.min(1, n))]) : [0]
    for (const i of targets) this.scores[i] = Math.max(0, Math.floor(f(this.scores[i] ?? 0)))
    this.score = this.scores[0] ?? 0
    this.hi = Math.max(this.hi, ...this.scores)
  }

  private setState(s: State): void {
    this.state = s
    this.hi = Math.max(this.hi, ...this.scores)
    this.opts.post({
      type: 'state',
      state: s,
      score: this.score,
      hi: this.hi,
      players: this.players,
      scores: this.scores.slice(0, this.players),
      winner: this.winner,
    })
  }

  private guard(phase: string, fn: () => void): boolean {
    try {
      fn()
      return true
    } catch (e) {
      this.crash(e, phase)
      return false
    }
  }

  private crash(e: unknown, phase: string): void {
    const err = e instanceof Error ? e : new Error(String(e))
    this.errorMessage = `${phase}: ${err.message}`
    this.state = 'error'
    this.opts.post({
      type: 'error',
      message: err.message,
      stack: String(err.stack ?? '')
        .split('\n')
        .slice(0, 6)
        .join('\n'),
      phase,
    })
    this.opts.post({
      type: 'state',
      state: 'error',
      score: this.score,
      hi: this.hi,
      players: this.players,
      scores: this.scores.slice(0, this.players),
      winner: null,
    })
  }

  // ---- overlays ----------------------------------------------------------

  private drawHud(): void {
    const s = this.screen
    if (this.players === 2) {
      const p1 = `P1 ${this.scores[0]}`
      const p2 = `P2 ${this.scores[1]}`
      s.text(p1, 3, 3, 0)
      s.text(p1, 2, 2, PLAYER_COLORS[0])
      const x2 = W - 2 - s.textWidth(p2)
      s.text(p2, x2 + 1, 3, 0)
      s.text(p2, x2, 2, PLAYER_COLORS[1])
      return
    }
    const scoreText = `SCORE ${this.score}`
    const hiText = `HI ${this.hi}`
    s.text(scoreText, 3, 3, 0)
    s.text(scoreText, 2, 2, 7)
    const hx = W - 2 - s.textWidth(hiText)
    s.text(hiText, hx + 1, 3, 0)
    s.text(hiText, hx, 2, 7)
  }

  private panel(y: number, h: number): void {
    const s = this.screen
    s.rectfill(16, y, W - 32, h, 0)
    s.rect(16, y, W - 32, h, 7)
    s.rect(17, y + 1, W - 34, h - 2, 1)
  }

  private drawTitle(): void {
    const s = this.screen
    this.panel(72, 80)
    if (this.title) s.textCenter(this.title, 84, 10, 2)
    else s.textCenter('READY', 84, 10, 2)
    if (this.players === 2) s.textCenter('2 PLAYERS', 106, 6)
    if (this.frame % 40 < 28) s.textCenter('PRESS START', 122, 7)
  }

  private drawEnd(): void {
    const s = this.screen
    const win = this.state === 'win'
    this.panel(64, 96)
    if (this.players === 2) {
      const w = this.winner
      if (win && w !== null) s.textCenter(`PLAYER ${w + 1} WINS`, 74, PLAYER_COLORS[w] ?? 11, 2)
      else s.textCenter(win ? 'YOU WIN' : 'GAME OVER', 74, win ? 11 : 8, 2)
      s.text(`P1 ${this.scores[0]}`, 40, 104, PLAYER_COLORS[0])
      const p2 = `P2 ${this.scores[1]}`
      s.text(p2, W - 40 - s.textWidth(p2), 104, PLAYER_COLORS[1])
    } else {
      s.textCenter(win ? 'YOU WIN' : 'GAME OVER', 74, win ? 11 : 8, 2)
      s.textCenter(`SCORE ${this.score}`, 100, 7)
      s.textCenter(`HI ${this.hi}`, 112, 6)
    }
    if (this.lockout === 0 && this.frame % 40 < 28) s.textCenter('PRESS START', 136, 7)
  }

  private drawError(): void {
    const s = this.screen
    s.cls(2)
    s.textCenter('GAME CRASHED', 90, 7, 2)
    const msg = this.errorMessage.slice(0, 30)
    s.textCenter(msg, 120, 15)
  }

  private applyFlash(): void {
    if (this.flashFrames <= 0) return
    this.flashFrames--
    this.screen.cls(this.flashColor)
  }

  // ---- api ---------------------------------------------------------------

  private makeApi(): Api {
    const s = this.screen
    const inp = this.input
    const api: Api = {
      W,
      H,
      t: 0,
      frame: 0,
      players: this.players,
      P1: PLAYER_COLORS[0],
      P2: PLAYER_COLORS[1],
      // input
      btn: (name: Button, player = 0) => inp.btn(name, player),
      btnp: (name: Button, player = 0) => inp.btnp(name, player),
      // drawing
      cls: (c = 0) => s.cls(c),
      pset: (x: number, y: number, c: number) => s.pset(x, y, c),
      pget: (x: number, y: number) => s.pget(x, y),
      line: (x0: number, y0: number, x1: number, y1: number, c: number) =>
        s.line(x0, y0, x1, y1, c),
      rect: (x: number, y: number, w: number, h: number, c: number) => s.rect(x, y, w, h, c),
      rectfill: (x: number, y: number, w: number, h: number, c: number) =>
        s.rectfill(x, y, w, h, c),
      circ: (x: number, y: number, r: number, c: number) => s.circ(x, y, r, c),
      circfill: (x: number, y: number, r: number, c: number) => s.circfill(x, y, r, c),
      spr: (sprite: Sprite, x: number, y: number, flipX = false, flipY = false) =>
        s.spr(sprite, x, y, !!flipX, !!flipY),
      text: (str: unknown, x: number, y: number, c = 7, scale = 1) => s.text(str, x, y, c, scale),
      textCenter: (str: unknown, y: number, c = 7, scale = 1) => s.textCenter(str, y, c, scale),
      textWidth: (str: unknown, scale = 1) => s.textWidth(str, scale),
      // sound
      sfx: (name: SfxName) => this.synth.sfx(name),
      tone: (freq: number, ms: number, wave = 'square') => this.synth.tone(freq, ms, wave),
      // juice
      flash: (c = 7, frames = 3) => {
        this.flashColor = c
        this.flashFrames = Math.max(0, Math.min(10, frames | 0))
      },
      shake: (frames = 8) => {
        this.shakeFrames = Math.max(0, Math.min(60, frames | 0))
      },
      // game flow
      score: (n: number, p?: number) => this.setScore(p, () => Number(n) || 0),
      addScore: (n: number, p?: number) => this.setScore(p, (old) => old + (Number(n) || 0)),
      getScore: (p?: number) => {
        const i = this.players === 2 && typeof p === 'number' ? Math.max(0, Math.min(1, p | 0)) : 0
        return this.scores[i] ?? 0
      },
      gameOver: () => {
        if (this.state === 'playing' && !this.pendingState) this.pendingState = 'gameover'
      },
      win: (p?: number) => {
        if (this.state !== 'playing' || this.pendingState) return
        this.pendingState = 'win'
        this.winner =
          this.players === 2 && typeof p === 'number' && Number.isFinite(p)
            ? Math.max(0, Math.min(1, p | 0))
            : null
      },
      // helpers
      rnd: (n = 1) => this.rng() * (Number(n) || 0),
      rndi: (a: number, b: number) => {
        const lo = Math.min(a | 0, b | 0)
        const hi = Math.max(a | 0, b | 0)
        return lo + Math.floor(this.rng() * (hi - lo + 1))
      },
      clamp: (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v)),
      dist: (x0: number, y0: number, x1: number, y1: number) => Math.hypot(x1 - x0, y1 - y0),
      collide: (
        ax: number,
        ay: number,
        aw: number,
        ah: number,
        bx: number,
        by: number,
        bw: number,
        bh: number,
      ) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by,
    }
    api.print = api.text
    return api
  }
}
