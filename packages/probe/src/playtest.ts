/// <reference path="./global.d.ts" />
import { openRuntime } from './probe.ts'

/**
 * The fun probe. The regular probe answers "does this game work". This one
 * answers "is it worth playing": it plays the game twice, once with a bot on
 * the sticks and once with nobody, and reports what a person would have
 * noticed. Every number here is comparative — it means something against
 * another arm of the same bench, not on its own.
 *
 * See docs/research/arcade-game-design.md for what each signal is standing in
 * for.
 */

export interface PlaytestOptions {
  seed?: number
  title?: string
  controls?: string[]
  players?: number
  /** Seconds of game time to play. Default 75. */
  seconds?: number
  /** Capture three PNGs for the judge. Default true. */
  shots?: boolean
}

export interface PlaytestMetrics {
  /** The run reached the end without crashing. */
  ok: boolean
  error: string | null

  // --- survival -----------------------------------------------------------
  /** Seconds until a player who never touches the controls loses. */
  idleDeathS: number | null
  /** Seconds until the bot loses. */
  botDeathS: number | null
  /** Still alive at 3 s with no input: the grace period exists. */
  grace: boolean
  /** An idle player is dead inside the window: the game can be lost. */
  losable: boolean

  // --- scoring ------------------------------------------------------------
  idleScore: number
  botScore: number
  /** Points per second alive, bot over idle, capped at 20. Above 1 means
   *  playing beats standing still; below 1 means the best strategy is to let
   *  go of the stick. */
  agency: number
  /** Seconds until the bot's first point. */
  firstScoreS: number | null
  scoreEvents: number
  /** Distinct score deltas: 1 is flat scoring, more is graded or combo'd. */
  scoreTiers: number
  /** Largest delta over the smallest: a combo or multiplier shows up here. */
  scoreSpread: number

  // --- pacing -------------------------------------------------------------
  /** Share of the screen that is not the background colour, early and late. */
  busyEarly: number
  busyLate: number
  /** busyLate / busyEarly. Above 1 means the screen fills up as time passes. */
  densityRamp: number
  /** Score events per second, first third and last third of the bot's run. */
  rateEarly: number
  rateLate: number

  // --- look ---------------------------------------------------------------
  /** Distinct palette entries on screen mid-play. */
  colors: number
  /** Distinct frames out of the ones sampled: how much is moving. */
  motion: number
  motionSamples: number

  // --- juice --------------------------------------------------------------
  sfxKinds: number
  sfxCalls: number
  flash: number
  shake: number

  /** PNG data URLs at roughly 2 s, 15 s and 40 s of bot play. */
  shots: string[]
}

const DIRECTIONS = ['left', 'right', 'up', 'down']
const ACTIONS = ['a', 'b']

interface RunSample {
  frame: number
  state: string
  score: number
  busy: number
  colors: number
  hash: string
}

interface RunResult {
  samples: RunSample[]
  finalScore: number
  deathFrame: number | null
  terminalFrame: number | null
  error: string | null
  telemetry: { sfx: Record<string, number>; flash: number; shake: number }
  scoreFrames: number[]
  scoreDeltas: number[]
  shots: string[]
}

/**
 * One run in the page: load, start, drive the sticks, sample as it goes.
 *
 * This whole body is serialised into the browser, so it must not declare any
 * named inner function: the bundler rewrites those through a `__name` helper
 * that does not exist on the page.
 */
const RUN = (input: {
  code: string
  seed: number
  title: string
  players: number
  dirs: string[]
  acts: string[]
  frames: number
  bot: boolean
  shotFrames: number[]
}): RunResult => {
  const p = window.__probe!
  const { code, seed, title, players, dirs, acts, frames, bot, shotFrames } = input
  p.load(code, seed, title, players)
  p.start()

  const samples: RunSample[] = []
  const shots: string[] = []
  const held: Record<string, boolean> = {}
  const SAMPLE_EVERY = 30 // half a second
  const STEP = 3

  let terminalFrame: number | null = null
  let deathFrame: number | null = null
  let error: string | null = null
  let finalScore = 0

  for (let f = 0; f < frames; f += STEP) {
    if (bot) {
      // A deterministic stick-waggler: hold one direction for half a second,
      // rotate through the ones the spec says exist, and tap the buttons on
      // their own rhythms. It is not good at any game; it is the same kind of
      // bad at all of them, which is the point.
      const want: Record<string, boolean> = {}
      for (let player = 0; player < players; player++) {
        const phase = f + player * 41
        const dir = dirs.length > 0 ? dirs[Math.floor(phase / 30) % dirs.length]! : null
        for (const d of dirs) want[`${player}:${d}`] = d === dir
        for (const a of acts) want[`${player}:${a}`] = phase % (a === 'a' ? 18 : 50) < 3
      }
      for (const key of Object.keys(want)) {
        const down = !!want[key]
        if (!!held[key] === down) continue
        held[key] = down
        const cut = key.indexOf(':')
        p.input(Number(key.slice(0, cut)), key.slice(cut + 1), down)
      }
    }
    const r = p.step(STEP)
    finalScore = r.scores.reduce((a, b) => a + b, 0)
    if (r.error) {
      error = r.error
      break
    }
    if (r.state !== 'playing') terminalFrame = f + STEP
    if (r.state === 'gameover') deathFrame = terminalFrame
    if (f % SAMPLE_EVERY < STEP) {
      const st = p.frameStats()
      samples.push({
        frame: f,
        state: r.state,
        score: finalScore,
        busy: 1 - st.dominantShare,
        colors: st.colors,
        hash: p.frameHash(),
      })
    }
    if (shotFrames.length > 0 && f >= shotFrames[0]! && terminalFrame === null) {
      shotFrames.shift()
      shots.push(p.snapshot())
    }
    if (terminalFrame !== null) break
  }

  const tele = p.telemetry()
  return {
    samples,
    finalScore,
    deathFrame,
    terminalFrame,
    error,
    telemetry: { sfx: tele.sfx, flash: tele.flash, shake: tele.shake },
    scoreFrames: tele.scoreFrames,
    scoreDeltas: tele.scoreDeltas,
    shots,
  }
}

const EMPTY: PlaytestMetrics = {
  ok: false,
  error: null,
  idleDeathS: null,
  botDeathS: null,
  grace: false,
  losable: false,
  idleScore: 0,
  botScore: 0,
  agency: 0,
  firstScoreS: null,
  scoreEvents: 0,
  scoreTiers: 0,
  scoreSpread: 0,
  busyEarly: 0,
  busyLate: 0,
  densityRamp: 0,
  rateEarly: 0,
  rateLate: 0,
  colors: 0,
  motion: 0,
  motionSamples: 0,
  sfxKinds: 0,
  sfxCalls: 0,
  flash: 0,
  shake: 0,
  shots: [],
}

export async function playtest(code: string, opts: PlaytestOptions = {}): Promise<PlaytestMetrics> {
  const seed = opts.seed ?? 7
  const players = opts.players === 2 ? 2 : 1
  const seconds = opts.seconds ?? 75
  const frames = Math.round(seconds * 60)
  const controls = (opts.controls ?? ['left', 'right', 'a']).map((c) => c.toLowerCase())
  const dirs = DIRECTIONS.filter((d) => controls.includes(d))
  const acts = ACTIONS.filter((a) => controls.includes(a))
  const page = await openRuntime()
  try {
    const base = {
      code,
      seed,
      title: opts.title ?? '',
      players,
      dirs,
      acts,
      frames,
      shotFrames: [] as number[],
    }
    const idle = await page.evaluate(RUN, { ...base, bot: false })
    const bot = await page.evaluate(RUN, {
      ...base,
      bot: true,
      shotFrames: opts.shots === false ? [] : [120, 900, 2400],
    })
    return summarise(idle, bot, frames)
  } catch (e) {
    return { ...EMPTY, error: e instanceof Error ? e.message : String(e) }
  } finally {
    await page.close()
  }
}

function summarise(idle: RunResult, bot: RunResult, frames: number): PlaytestMetrics {
  const sec = (f: number | null) => (f === null ? null : Math.round((f / 60) * 10) / 10)
  const aliveAt = (r: RunResult, f: number) => r.deathFrame === null || r.deathFrame > f

  // Screen density and colour are read from the bot's run, in the middle of
  // play, where a human would be looking.
  const live = bot.samples.filter((s) => s.state === 'playing')
  const third = Math.max(1, Math.floor(live.length / 3))
  const early = live.slice(0, third)
  const late = live.slice(-third)
  const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length)
  const busyEarly = mean(early.map((s) => s.busy))
  const busyLate = mean(late.map((s) => s.busy))
  const mid = live[Math.floor(live.length / 2)]

  // Score events, split into the first and last third of the time the bot
  // actually survived, so a short run is not judged on frames it never saw.
  const played = bot.terminalFrame ?? frames
  const cut = played / 3
  const evEarly = bot.scoreFrames.filter((f) => f < cut).length
  const evLate = bot.scoreFrames.filter((f) => f >= played - cut).length
  const perSecond = (n: number) => Math.round((n / Math.max(1, cut / 60)) * 100) / 100

  const deltas = bot.scoreDeltas.map(Math.abs).filter((d) => d > 0)
  const tiers = new Set(deltas).size
  const spread = deltas.length > 0 ? Math.max(...deltas) / Math.min(...deltas) : 0

  const hashes = new Set(live.map((s) => s.hash))
  const sfx = bot.telemetry.sfx
  const sfxCalls = Object.values(sfx).reduce((a, b) => a + b, 0)

  const idleScore = idle.finalScore
  const botScore = bot.finalScore
  const round = (n: number) => Math.round(n * 100) / 100
  // Per second alive, so a bot that throws itself at a hazard is not scored
  // as less effective than a player who never moves.
  const idleAlive = (idle.terminalFrame ?? frames) / 60
  const botAlive = (bot.terminalFrame ?? frames) / 60
  const idleRate = idleScore / Math.max(0.5, idleAlive)
  const botRate = botScore / Math.max(0.5, botAlive)

  return {
    ok: !idle.error && !bot.error,
    error: idle.error ?? bot.error,
    idleDeathS: sec(idle.deathFrame),
    botDeathS: sec(bot.deathFrame),
    grace: aliveAt(idle, 180),
    losable: idle.deathFrame !== null && idle.deathFrame <= 60 * 60,
    idleScore,
    botScore,
    // Capped: when an idle player scores nothing the ratio is unbounded and
    // the only question is whether it is comfortably above 1.
    agency: Math.min(20, round(botRate / Math.max(0.05, idleRate))),
    firstScoreS: sec(bot.scoreFrames[0] ?? null),
    scoreEvents: bot.scoreFrames.length,
    scoreTiers: tiers,
    scoreSpread: round(spread),
    busyEarly: round(busyEarly),
    busyLate: round(busyLate),
    densityRamp: round(busyLate / Math.max(0.001, busyEarly)),
    rateEarly: perSecond(evEarly),
    rateLate: perSecond(evLate),
    colors: mid?.colors ?? 0,
    motion: hashes.size,
    motionSamples: live.length,
    sfxKinds: Object.keys(sfx).length,
    sfxCalls,
    flash: bot.telemetry.flash,
    shake: bot.telemetry.shake,
    shots: bot.shots,
  }
}

/**
 * One number out of the metrics, 0 to 100, so a bench can be sorted. The
 * weights come from section 4 of the research doc; they are a summary of the
 * table, not a discovery.
 */
export function funScore(m: PlaytestMetrics): number {
  if (!m.ok) return 0
  let s = 0
  // Fair start and a real end: 20
  if (m.grace) s += 10
  if (m.losable) s += 10
  // Playing has to beat standing still, and pay quickly: 25
  if (m.agency >= 1.5) s += 15
  else if (m.agency > 1.05) s += 8
  if (m.firstScoreS !== null && m.firstScoreS <= 5) s += 10
  else if (m.firstScoreS !== null) s += 4
  // The score tells a story: 15
  if (m.scoreTiers >= 3) s += 10
  else if (m.scoreTiers === 2) s += 6
  if (m.scoreSpread >= 4) s += 5
  else if (m.scoreSpread > 1) s += 2
  // It escalates: 15
  if (m.densityRamp >= 1.3) s += 10
  else if (m.densityRamp >= 1.05) s += 5
  if (m.rateLate > m.rateEarly) s += 5
  // It looks like something: 15
  if (m.colors >= 7) s += 8
  else if (m.colors >= 5) s += 5
  const motionShare = m.motionSamples > 0 ? m.motion / m.motionSamples : 0
  if (motionShare >= 0.9) s += 7
  else if (motionShare >= 0.6) s += 4
  // It feels like something: 10
  if (m.sfxKinds >= 3) s += 5
  else if (m.sfxKinds >= 1) s += 2
  if (m.flash > 0 && m.shake > 0) s += 5
  else if (m.flash > 0 || m.shake > 0) s += 2
  return Math.round(s)
}
