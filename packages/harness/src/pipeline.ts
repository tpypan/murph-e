import { controlsFromSpec, type ProbeResult, probe } from '@htn/probe'
import { type BuildResult, build } from './build.ts'
import { keepInLibrary, pickFallback } from './library.ts'
import { buildPrompt, loadTemplates } from './prompt.ts'
import { repair } from './repair.ts'
import { createRun, type Run } from './run-store.ts'
import { type GameSpec, specify } from './spec.ts'

export type PipelineEvent =
  | { type: 'spec'; spec: GameSpec; ms: number }
  | { type: 'token'; text: string; variant: number }
  | { type: 'built'; variant: number; ms: number; tokens: number; syntaxError: string | null }
  | { type: 'probe'; variant: number; ok: boolean; observations: string[]; ms: number }
  | { type: 'repair'; phase: 'start' | 'done'; ok?: boolean; ms?: number; observations?: string[] }
  | { type: 'fallback'; reason: string; title: string; slug: string }
  | {
      type: 'ready'
      code: string
      title: string
      note: string
      spec: GameSpec | null
      source: 'build' | 'repair' | 'library' | 'template'
      runId: string
      totalMs: number
    }
  | { type: 'error'; message: string }

export interface PipelineOptions {
  race?: number
  model?: string
  effort?: string
  keep?: boolean
  onEvent?: (ev: PipelineEvent) => void
  run?: Run
  signal?: AbortSignal
}

export interface PipelineResult {
  code: string
  title: string
  note: string
  spec: GameSpec | null
  source: 'build' | 'repair' | 'library' | 'template'
  run: Run
  totalMs: number
  observations: string[]
}

interface Attempt {
  variant: number
  build: BuildResult | null
  probe: ProbeResult | null
  error: string | null
}

function isAbort(e: unknown): boolean {
  return e instanceof Error && (e.name === 'AbortError' || /abort/i.test(e.message))
}

/**
 * spec -> race N builds -> first to pass the probe wins -> else repair the
 * best loser once -> else a library game. Always ends with something playable.
 */
export async function pipeline(
  transcript: string,
  opts: PipelineOptions = {},
): Promise<PipelineResult> {
  const t0 = performance.now()
  const emit = opts.onEvent ?? (() => {})
  const run = opts.run ?? createRun(transcript)
  const race = Math.max(1, opts.race ?? 2)
  const done = (r: Omit<PipelineResult, 'run' | 'totalMs'>): PipelineResult => {
    const totalMs = Math.round(performance.now() - t0)
    run.write('game.js', r.code)
    run.write(
      'result.json',
      JSON.stringify(
        { source: r.source, title: r.title, totalMs, observations: r.observations },
        null,
        2,
      ),
    )
    run.event('ready', { source: r.source, title: r.title, totalMs })
    emit({
      type: 'ready',
      code: r.code,
      title: r.title,
      note: r.note,
      spec: r.spec,
      source: r.source,
      runId: run.id,
      totalMs,
    })
    return { ...r, run, totalMs }
  }

  // 1. spec
  let spec: GameSpec
  try {
    const s = await specify(transcript)
    spec = s.spec
    run.write('spec.json', JSON.stringify(spec, null, 2))
    run.event('spec', { ms: s.ms, usage: s.usage, spec })
    emit({ type: 'spec', spec, ms: s.ms })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    run.event('error', { stage: 'spec', message })
    emit({ type: 'error', message })
    const fb = pickFallback(undefined)
    emit({ type: 'fallback', reason: `spec failed: ${message}`, title: fb.title, slug: fb.slug })
    return done({
      code: fb.code,
      title: fb.title,
      note: '',
      spec: fb.spec,
      source: fb.source,
      observations: [message],
    })
  }

  const prompt = buildPrompt(spec, transcript, loadTemplates())
  run.write('prompt.txt', `=== SYSTEM ===\n${prompt.system}\n\n=== USER ===\n${prompt.user}\n`)
  const controls = controlsFromSpec(spec.controls)

  // 2. race
  const controllers: AbortController[] = []
  const attempt = async (variant: number): Promise<Attempt> => {
    const ac = new AbortController()
    controllers.push(ac)
    if (opts.signal) opts.signal.addEventListener('abort', () => ac.abort(), { once: true })
    const a: Attempt = { variant, build: null, probe: null, error: null }
    try {
      const b = await build(prompt, {
        model: opts.model,
        effort: opts.effort,
        variant,
        signal: ac.signal,
        onDelta: (text) => emit({ type: 'token', text, variant }),
      })
      a.build = b
      run.write(`game.v${variant}.js`, b.code)
      run.event('build', {
        variant,
        ms: b.ms,
        ttftMs: b.ttftMs,
        usage: b.usage,
        syntaxError: b.syntaxError,
      })
      emit({ type: 'built', variant, ms: b.ms, tokens: b.usage.output, syntaxError: b.syntaxError })
      if (b.syntaxError) {
        a.probe = {
          ok: false,
          observations: [`the game failed to load: ${b.syntaxError}`],
          thumb: null,
          ms: 0,
          checks: {},
        }
      } else {
        a.probe = await probe(b.code, { controls, title: spec.title })
      }
      run.event('probe', {
        variant,
        ok: a.probe.ok,
        observations: a.probe.observations,
        ms: a.probe.ms,
      })
      emit({
        type: 'probe',
        variant,
        ok: a.probe.ok,
        observations: a.probe.observations,
        ms: a.probe.ms,
      })
    } catch (e) {
      a.error = isAbort(e) ? 'cancelled' : e instanceof Error ? e.message : String(e)
      if (a.error !== 'cancelled') {
        run.event('error', { stage: 'build', variant, message: a.error })
        emit({ type: 'error', message: `build ${variant}: ${a.error}` })
      }
    }
    return a
  }

  const pending = new Map<number, Promise<Attempt>>()
  for (let v = 0; v < race; v++) pending.set(v, attempt(v))
  const finished: Attempt[] = []
  let winner: Attempt | null = null
  while (pending.size > 0 && !winner) {
    const a = await Promise.race(pending.values())
    pending.delete(a.variant)
    finished.push(a)
    if (a.probe?.ok) winner = a
  }
  if (winner) {
    for (const c of controllers) c.abort()
    return finish(winner, 'build')
  }

  // 3. repair the loser with the fewest observations
  const candidates = finished.filter((a) => a.build && a.probe)
  candidates.sort((x, y) => x.probe!.observations.length - y.probe!.observations.length)
  const best = candidates[0]
  if (best?.build && best.probe) {
    emit({ type: 'repair', phase: 'start', observations: best.probe.observations })
    run.event('repair', {
      phase: 'start',
      variant: best.variant,
      observations: best.probe.observations,
    })
    try {
      const r = await repair(prompt, spec, best.build.code, best.probe.observations, {
        signal: opts.signal,
      })
      run.write('game.repair.js', r.code)
      const p = r.syntaxError
        ? {
            ok: false,
            observations: [`the game failed to load: ${r.syntaxError}`],
            thumb: null,
            ms: 0,
            checks: {},
          }
        : await probe(r.code, { controls, title: spec.title })
      run.event('repair', {
        phase: 'done',
        ms: r.ms,
        usage: r.usage,
        ok: p.ok,
        observations: p.observations,
      })
      emit({ type: 'repair', phase: 'done', ok: p.ok, ms: r.ms, observations: p.observations })
      if (p.ok) return finish({ variant: best.variant, build: r, probe: p, error: null }, 'repair')
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      run.event('error', { stage: 'repair', message })
      emit({ type: 'repair', phase: 'done', ok: false, observations: [message] })
    }
  }

  // 4. fallback
  const reason = best?.probe
    ? best.probe.observations.join('; ')
    : (best?.error ?? 'no build finished')
  const fb = pickFallback(spec.genre)
  run.event('fallback', { reason, slug: fb.slug, source: fb.source })
  emit({ type: 'fallback', reason, title: fb.title, slug: fb.slug })
  return done({
    code: fb.code,
    title: fb.title,
    note: spec.note,
    spec: fb.spec ?? spec,
    source: fb.source,
    observations: [reason],
  })

  function finish(a: Attempt, source: 'build' | 'repair'): PipelineResult {
    const code = a.build!.code
    if (a.probe?.thumb) run.write('thumb.png', a.probe.thumb)
    run.write(
      'probe.json',
      JSON.stringify(
        { ok: true, checks: a.probe!.checks, observations: a.probe!.observations },
        null,
        2,
      ),
    )
    if (opts.keep !== false) {
      const slug = keepInLibrary(spec, code, a.probe?.thumb ?? null, run.id)
      run.event('library', { slug })
    }
    return done({
      code,
      title: spec.title,
      note: spec.note,
      spec,
      source,
      observations: a.probe!.observations,
    })
  }
}
