/// <reference path="./global.d.ts" />
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, type Page } from 'playwright'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const RUNTIME_HTML = resolve(ROOT, 'packages/runtime/index.html')
const RUNTIME_JS = resolve(ROOT, 'packages/runtime/runtime.js')

export interface ProbeOptions {
  seed?: number
  title?: string
  /** Buttons the spec says the game uses. Defaults to left, right and a. */
  controls?: string[]
  thumb?: boolean
  /** 1 or 2. A two-player game must also respond to player two. */
  players?: number
  /** New dual-mode games must show distinct input effects for the two humans. */
  requireIndependentPlayers?: boolean
}

export interface ProbeResult {
  ok: boolean
  observations: string[]
  thumb: Buffer | null
  ms: number
  checks: Record<string, boolean>
}

let browser: Browser | null = null
let launching: Promise<Browser> | null = null

async function getBrowser(): Promise<Browser> {
  if (browser) return browser
  if (!launching) launching = chromium.launch().then((b) => (browser = b))
  return launching
}

/** Close the shared browser. Call once at the end of a CLI run. */
export async function closeProbe(): Promise<void> {
  const b = browser
  browser = null
  launching = null
  await b?.close()
}

export async function openRuntime(): Promise<Page> {
  if (!existsSync(RUNTIME_JS)) {
    throw new Error('packages/runtime/runtime.js is missing. Run `pnpm runtime:build` first.')
  }
  const page = await (await getBrowser()).newPage()
  await page.goto(`file://${RUNTIME_HTML}?probe=1`)
  await page.waitForFunction(() => !!window.__probe)
  return page
}

const DIRECTIONS = ['left', 'right', 'up', 'down']
const ACTIONS = ['a', 'b']

/**
 * Run a game.js through the runtime headlessly and report, in plain words,
 * what a human would have noticed. Under two seconds per game.
 */
export async function probe(code: string, opts: ProbeOptions = {}): Promise<ProbeResult> {
  const t0 = performance.now()
  const seed = opts.seed ?? 7
  const players = opts.players === 2 ? 2 : 1
  const controls = (opts.controls ?? ['left', 'right', 'a']).map((c) => c.toLowerCase())
  const dirs = DIRECTIONS.filter((d) => controls.includes(d))
  const acts = ACTIONS.filter((a) => controls.includes(a))
  const observations: string[] = []
  const checks: Record<string, boolean> = {}
  let thumb: Buffer | null = null
  const page = await openRuntime()
  try {
    // 1. loads
    const loaded = await page.evaluate(({ c, s, t, n }) => window.__probe!.load(c, s, t, n), {
      c: code,
      s: seed,
      t: opts.title ?? '',
      n: players,
    })
    checks.loads = loaded.ok
    if (!loaded.ok) {
      observations.push(`the game failed to load: ${loaded.error}`)
      return finish()
    }

    // 2. survives 300 frames with no input, and does not end by itself early
    const idle = await page.evaluate(() => {
      const p = window.__probe!
      p.start()
      const out: {
        at120: { state: string; error: string | null }
        hashes: string[]
        stats: { colors: number; dominant: number; dominantShare: number }
        final: { state: string; score: number; frame: number; error: string | null }
      } = {
        at120: { state: '', error: null },
        hashes: [],
        stats: { colors: 0, dominant: 0, dominantShare: 1 },
        final: { state: '', score: 0, frame: 0, error: null },
      }
      let r = p.step(60)
      out.hashes.push(p.frameHash())
      out.stats = p.frameStats()
      r = p.step(60)
      out.at120 = { state: r.state, error: r.error }
      out.hashes.push(p.frameHash())
      r = p.step(60)
      out.hashes.push(p.frameHash())
      r = p.step(120)
      out.final = r
      return out
    })
    const crashed = idle.final.error
    checks.survives = !crashed
    if (crashed) observations.push(`the game crashed with no input: ${crashed}`)
    checks.notInstantDeath = idle.at120.state === 'playing' || !!idle.at120.error
    if (!checks.notInstantDeath) {
      observations.push(
        `the game ended by itself within two seconds of starting, with no input (state ${idle.at120.state})`,
      )
    }
    checks.draws = idle.stats.colors >= 3 && idle.stats.dominantShare < 0.985
    if (!checks.draws) {
      observations.push(
        idle.stats.colors < 3
          ? `the screen was nearly blank after one second (${idle.stats.colors} colours)`
          : 'the screen was almost one flat colour after one second',
      )
    }
    checks.moves = new Set(idle.hashes).size > 1
    if (!checks.moves) {
      observations.push('nothing on screen changed over three seconds with no input')
    }

    // 3. responds to each control the spec uses. Same seed, so the only
    // difference between the baseline and the trial is the input.
    const hashAfter = (
      frames: Array<{ at: number; player?: number; button: string; down: boolean }>,
      n: number,
    ) =>
      page.evaluate(
        ({ c, s, t, frames, n, pl }) => {
          const p = window.__probe!
          p.load(c, s, t, pl)
          p.start()
          p.inject(frames)
          const r = p.step(n)
          return { hash: p.frameHash(), state: r.state, error: r.error }
        },
        { c: code, s: seed, t: opts.title ?? '', frames, n, pl: players },
      )
    // A tap's effect can be brief (a sword swing, a lunge), so the frame is
    // sampled at several points after the press and any difference counts.
    const ACT_CHECKPOINTS = [64, 68, 72, 84, 100]
    const hashesAfter = (
      frames: Array<{ at: number; player?: number; button: string; down: boolean }>,
      checkpoints: number[],
    ) =>
      page.evaluate(
        ({ c, s, t, frames, checkpoints, pl }) => {
          const p = window.__probe!
          p.load(c, s, t, pl)
          p.start()
          p.inject(frames)
          const hashes: string[] = []
          let at = 0
          let error: string | null = null
          for (const cp of checkpoints) {
            const r = p.step(cp - at)
            at = cp
            error = r.error
            hashes.push(p.frameHash())
          }
          return { hashes, error }
        },
        { c: code, s: seed, t: opts.title ?? '', frames, checkpoints, pl: players },
      )
    checks.survivesInput = true
    const inputSurvived = (error: string | null, label: string) => {
      if (!error) return true
      checks.survivesInput = false
      observations.push(`the game crashed ${label}: ${error}`)
      return false
    }
    const tapChanges = async (player: number, button: string) => {
      const base = await hashesAfter([], ACT_CHECKPOINTS)
      const trial = await hashesAfter(
        [
          { at: 60, player, button, down: true },
          { at: 63, player, button, down: false },
        ],
        ACT_CHECKPOINTS,
      )
      const survived = inputSurvived(
        trial.error,
        `when player ${player + 1} pressed ${button.toUpperCase()}`,
      )
      if (!survived || base.error) return false
      if (trial.hashes.some((h, i) => h !== base.hashes[i])) return true
      // Holding guard or drifting while steering is a real action too. Compare
      // each held action with the SAME movement-only run; steering cannot pass
      // a dead action button. Try only declared directions, with bounded samples.
      for (const direction of [null, ...dirs]) {
        const movement = direction ? [{ at: 40, player, button: direction, down: true }] : []
        const baseline = await hashesAfter(movement, ACT_CHECKPOINTS)
        const active = await hashesAfter(
          [...movement, { at: 60, player, button, down: true }],
          ACT_CHECKPOINTS,
        )
        const baselineOk = inputSurvived(
          baseline.error,
          `when player ${player + 1} moved before ${button.toUpperCase()}`,
        )
        const activeOk = inputSurvived(
          active.error,
          `when player ${player + 1} held ${button.toUpperCase()}${direction ? ` with ${direction.toUpperCase()}` : ''}`,
        )
        if (!baselineOk || !activeOk) return false
        if (active.hashes.some((h, i) => h !== baseline.hashes[i])) return true
      }
      return false
    }
    // A snake already heading right ignores RIGHT and LEFT, so one working
    // direction is the hard requirement; the others are repair notes.
    const base120 = await hashAfter([], 120)
    const directionChanges = async (player: number, button: string) => {
      const trial = await hashAfter([{ at: 60, player, button, down: true }], 120)
      if (!inputSurvived(trial.error, `when player ${player + 1} held ${button.toUpperCase()}`))
        return false
      if (!base120.error && trial.hash !== base120.hash) return true
      if (!acts.includes('a')) return false
      // Some games only steer in flight or after launch. Compare A+direction
      // against the identical A-only run, so A itself cannot pass this check.
      const launch = [
        { at: 60, player, button: 'a', down: true },
        { at: 80, player, button: 'a', down: false },
      ]
      const base = await hashesAfter(launch, ACT_CHECKPOINTS)
      const active = await hashesAfter(
        [...launch, { at: 62, player, button, down: true }],
        ACT_CHECKPOINTS,
      )
      const baseOk = inputSurvived(base.error, `when player ${player + 1} held A`)
      const activeOk = inputSurvived(
        active.error,
        `when player ${player + 1} held A and ${button.toUpperCase()}`,
      )
      return baseOk && activeOk && active.hashes.some((h, i) => h !== base.hashes[i])
    }
    let anyDir = dirs.length === 0
    for (const d of dirs) {
      const ok = await directionChanges(0, d)
      checks[`soft:responds:${d}`] = ok
      anyDir = anyDir || ok
      if (!ok)
        observations.push(
          `holding ${d.toUpperCase()} changed nothing on screen, including after A when available`,
        )
    }
    checks.respondsToDirection = anyDir
    if (!anyDir) observations.push('none of the direction buttons changed anything on screen')
    for (const a of acts) {
      const ok = await tapChanges(0, a)
      // B is a bonus button on the cabinet; an unresponsive B is worth a
      // repair note but should not send a working game to the fallback.
      checks[a === 'b' ? 'soft:responds:b' : `responds:${a}`] = ok
      if (!ok) observations.push(`pressing ${a.toUpperCase()} changed nothing on screen`)
    }

    // 3b. a two-player game must also move for player two. One working
    // direction is the hard check; A is a repair note.
    if (players === 2) {
      let anyP2 = dirs.length === 0
      let anyP2Action = false
      for (const d of dirs) {
        const ok = await directionChanges(1, d)
        anyP2 = anyP2 || ok
        if (!ok)
          observations.push(
            `player two holding ${d.toUpperCase()} changed nothing on screen, including after A when available`,
          )
      }
      checks.respondsToP2 = anyP2
      if (!anyP2) observations.push("none of player two's direction buttons changed anything")
      for (const action of acts) {
        const ok = await tapChanges(1, action)
        anyP2Action ||= ok
        checks[`soft:responds:p2:${action}`] = ok
        if (!ok)
          observations.push(`player two pressing ${action.toUpperCase()} changed nothing on screen`)
      }
      // Action-only games must not pass merely because no directions were declared.
      if (dirs.length === 0) checks.respondsToP2 = anyP2Action
      if (!checks.respondsToP2 && dirs.length === 0)
        observations.push("none of player two's action buttons changed anything")

      if (opts.requireIndependentPlayers) {
        let distinct = false
        const checkpoints = [64, 72, 100, 120]
        const baseline = await hashesAfter([], checkpoints)
        for (const button of [...dirs, ...acts]) {
          const trials = []
          for (const player of [0, 1]) {
            const trial = await hashesAfter(
              [
                { at: 60, player, button, down: true },
                { at: 80, player, button, down: false },
              ],
              checkpoints,
            )
            inputSurvived(
              trial.error,
              `while checking player ${player + 1}'s independent ${button.toUpperCase()} input`,
            )
            trials.push(trial)
          }
          const [p1, p2] = trials
          if (
            !baseline.error &&
            !p1!.error &&
            !p2!.error &&
            p1!.hashes.some((h, i) => h !== baseline.hashes[i]) &&
            p2!.hashes.some((h, i) => h !== baseline.hashes[i]) &&
            p1!.hashes.some((h, i) => h !== p2!.hashes[i])
          )
            distinct = true
        }
        checks.independentPlayerEffects = distinct
        if (!distinct)
          observations.push(
            'two-player mode did not show distinct visible effects from P1-only versus P2-only inputs; provide independent human roles and controls',
          )
      }
    }

    // 4. thumbnail after a few seconds of scripted play
    if (opts.thumb !== false) {
      const png = await page.evaluate(
        ({ c, s, t, dirs, acts, pl }) => {
          const p = window.__probe!
          p.load(c, s, t, pl)
          p.start()
          const frames: Array<{ at: number; player?: number; button: string; down: boolean }> = []
          let at = 10
          for (let player = 0; player < pl; player++) {
            for (const d of dirs) {
              frames.push(
                { at, player, button: d, down: true },
                { at: at + 25, player, button: d, down: false },
              )
              at += 30
            }
            for (const a of acts) {
              frames.push(
                { at, player, button: a, down: true },
                { at: at + 3, player, button: a, down: false },
              )
              at += 20
            }
          }
          p.inject(frames as never)
          p.step(Math.max(150, at + 20))
          return p.snapshot()
        },
        { c: code, s: seed, t: opts.title ?? '', dirs, acts, pl: players },
      )
      thumb = Buffer.from(png.split(',')[1] ?? '', 'base64')
    }
    return finish()
  } finally {
    await page.close()
  }

  function finish(): ProbeResult {
    const ok = Object.entries(checks).every(([k, v]) => v || k.startsWith('soft:'))
    return { ok, observations, thumb, ms: Math.round(performance.now() - t0), checks }
  }
}

/** Which buttons a spec's controls object says are in use. */
export function controlsFromSpec(
  controls: Record<string, string | null | undefined> | undefined,
): string[] {
  if (!controls) return ['left', 'right', 'a']
  const used = Object.entries(controls)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([k]) => k)
  return used.length > 0 ? used : ['left', 'right', 'a']
}
