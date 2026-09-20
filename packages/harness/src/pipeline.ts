import { controlsFromSpec, type ProbeResult, probe } from '@htn/probe'
import { BUILD_MAX_OUTPUT_TOKENS, type BuildResult, build } from './build.ts'
import { validateCandidate } from './candidate-history.ts'
import { type CandidateStage, catalogPreview, catalogSnapshot } from './catalog.ts'
import { recordDesignContext } from './design-context.ts'
import { MODELS } from './env.ts'
import { keepInLibrary, pickFallback } from './library.ts'
import { buildPrompt, loadTemplates } from './prompt.ts'
import { remix, remixSystemPrompt, remixUserTurn } from './remix.ts'
import { repair } from './repair.ts'
import { createRun, type Run } from './run-store.ts'
import { type GameSpec, type Players, specify } from './spec.ts'

// Every event may carry the player count of the pipeline that produced it.
// A single pipeline() leaves it unset except on `ready`; pipelineBoth() stamps
// it on everything so the two streams can be told apart.
export type PipelineEvent = (
  | { type: 'spec'; spec: GameSpec; ms: number }
  | { type: 'foundation'; prefix: string; demo: string }
  | { type: 'token'; text: string; variant: number; stage?: 'build' | 'remix' | 'repair' }
  | { type: 'built'; variant: number; ms: number; tokens: number; syntaxError: string | null }
  | { type: 'probe'; variant: number; ok: boolean; observations: string[]; ms: number }
  | { type: 'repair'; phase: 'start' | 'done'; ok?: boolean; ms?: number; observations?: string[] }
  | { type: 'remix'; phase: 'start' | 'done'; changes: string[]; ok?: boolean; ms?: number }
  | { type: 'fallback'; reason: string; title: string; slug: string }
  | {
      type: 'ready'
      code: string
      title: string
      note: string
      spec: GameSpec | null
      players: Players
      /** Library slug when the game was kept, else the run id; keys the leaderboard. */
      slug: string
      source: Source
      runId: string
      totalMs: number
    }
  | { type: 'error'; message: string; terminal?: boolean }
) & { players?: Players }

/** Where the code that is about to play came from. `kept` is a remix that
 *  failed twice, so the original game stays on screen. */
export type Source = 'build' | 'repair' | 'remix' | 'kept' | 'library' | 'template'

export interface CurrentGame {
  code: string
  spec: GameSpec
  slug: string
  title: string
}

export interface PipelineOptions {
  race?: number
  /** Which version this pipeline builds. Default 1. The cabinet builds both: pipelineBoth(). */
  players?: Players
  /** The game on screen, so "make it faster" edits it instead of starting over. */
  current?: CurrentGame | null
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
  players: Players
  slug: string
  source: Source
  run: Run
  totalMs: number
  observations: string[]
}

export interface PipelineBothOptions extends Omit<PipelineOptions, 'players' | 'run'> {
  /** One isolated run per version; defaults to createRun for each. */
  runFor?: (players: Players) => Run
}

export interface PipelineBothResult {
  /** One entry per version: the result, or the error that ended that pipeline. */
  results: Record<Players, PipelineResult | Error>
  totalMs: number
}

/**
 * Nobody is asked how many players: every idea is built twice, in parallel,
 * as a one-player game for the cabinet controls and a two-player game for the
 * two badges. Each version is an ordinary pipeline() with its own run, spec,
 * race, probe and library slot; every event it emits is tagged with its
 * player count. One version failing never touches the other.
 */
export async function pipelineBoth(
  transcript: string,
  opts: PipelineBothOptions = {},
): Promise<PipelineBothResult> {
  const t0 = performance.now()
  const emit = opts.onEvent ?? (() => {})
  const runFor = opts.runFor ?? (() => createRun(transcript))
  const modes: Players[] = [1, 2]
  const settled = await Promise.allSettled(
    modes.map((players) =>
      pipeline(transcript, {
        ...opts,
        players,
        run: runFor(players),
        onEvent: (ev) => emit({ ...ev, players }),
      }),
    ),
  )
  const results = {} as Record<Players, PipelineResult | Error>
  modes.forEach((players, i) => {
    const s = settled[i]!
    results[players] =
      s.status === 'fulfilled'
        ? s.value
        : s.reason instanceof Error
          ? s.reason
          : new Error(String(s.reason))
  })
  return { results, totalMs: Math.round(performance.now() - t0) }
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

function checkCancelled(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const error = new Error('Generation cancelled', { cause: signal.reason })
  error.name = 'AbortError'
  throw error
}

/**
 * spec -> race N builds -> first to pass the probe wins -> else repair the
 * best loser once -> else a library game. Always ends with something playable.
 */
export async function pipeline(
  transcript: string,
  opts: PipelineOptions = {},
): Promise<PipelineResult> {
  checkCancelled(opts.signal)
  const t0 = performance.now()
  const emit = opts.onEvent ?? (() => {})
  const run = opts.run ?? createRun(transcript)
  run.event('models', {
    ...MODELS,
    build: opts.model ?? MODELS.build,
    buildEffort: opts.effort ?? MODELS.buildEffort,
    buildMaxOutputTokens: BUILD_MAX_OUTPUT_TOKENS,
  })
  const race = Math.max(1, opts.race ?? 2)
  const players: Players = opts.players === 2 ? 2 : 1
  const done = (r: Omit<PipelineResult, 'run' | 'totalMs'>): PipelineResult => {
    checkCancelled(opts.signal)
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
    run.event('ready', { source: r.source, title: r.title, slug: r.slug, totalMs })
    emit({
      type: 'ready',
      code: r.code,
      title: r.title,
      note: r.note,
      spec: r.spec,
      players: r.players,
      slug: r.slug,
      source: r.source,
      runId: run.id,
      totalMs,
    })
    return { ...r, run, totalMs }
  }

  // 1. spec
  let spec: GameSpec
  try {
    const s = await specify(transcript, {
      players,
      current: opts.current?.spec ?? null,
      signal: opts.signal,
    })
    checkCancelled(opts.signal)
    recordDesignContext(run, 'spec', s.context)
    run.write(
      'spec-prompt.txt',
      `=== SYSTEM ===\n${s.prompt.system}\n\n=== USER ===\n${s.prompt.user}\n`,
    )
    spec = s.spec
    run.write('spec.json', JSON.stringify(spec, null, 2))
    run.event('spec', { ms: s.ms, usage: s.usage, spec })
    emit({ type: 'spec', spec, ms: s.ms })
  } catch (e) {
    checkCancelled(opts.signal)
    if (isAbort(e)) throw e
    const message = e instanceof Error ? e.message : String(e)
    run.event('error', { stage: 'spec', message })
    emit({ type: 'error', message, terminal: true })
    const fb = pickFallback(undefined, players)
    emit({ type: 'fallback', reason: `spec failed: ${message}`, title: fb.title, slug: fb.slug })
    return done({
      code: fb.code,
      title: fb.title,
      note: '',
      spec: fb.spec,
      players,
      slug: fb.slug,
      source: fb.source,
      observations: [message],
    })
  }

  const prompt = buildPrompt(spec, transcript, loadTemplates())
  recordDesignContext(run, 'build', prompt.designContext)
  run.write('implementation-context.json', JSON.stringify(prompt.referenceContext, null, 2))
  if (prompt.catalog)
    run.write('catalog-context.json', JSON.stringify(catalogSnapshot(prompt.catalog), null, 2))
  run.write('prompt.txt', `=== SYSTEM ===\n${prompt.system}\n\n=== USER ===\n${prompt.user}\n`)
  const controls = controlsFromSpec(spec.controls)
  const preview = prompt.catalog && catalogPreview(prompt.catalog)
  if (preview) emit({ type: 'foundation', ...preview })
  function checkCandidate(
    code: string,
    stage: CandidateStage,
    variant: number,
    validate: () => Promise<ProbeResult> | ProbeResult,
    output: { raw: string; sourceCode?: string },
    signal = opts.signal,
  ) {
    const repairing = stage === 'repair' || stage === 'remix-repair'
    return validateCandidate(
      {
        runId: run.id,
        attemptId: `${stage}:${variant}`,
        stage,
        variant,
        transcript,
        spec,
        code,
        rawOutput: output.raw,
        sourceCode: output.sourceCode,
        model: repairing
          ? MODELS.repair
          : stage === 'remix'
            ? MODELS.remix
            : (opts.model ?? MODELS.build),
        effort: repairing
          ? MODELS.repairEffort
          : stage === 'remix'
            ? MODELS.remixEffort
            : (opts.effort ?? MODELS.buildEffort),
        parts: prompt.catalog ? catalogSnapshot(prompt.catalog).parts : [],
        sprites: prompt.catalog ? catalogSnapshot(prompt.catalog).sprites : [],
      },
      async () => {
        // Archive first, including completed output returned during cancellation.
        checkCancelled(signal)
        const result = await validate()
        checkCancelled(signal)
        return result
      },
      {
        onRecorded: (hash, validation) =>
          run.event('catalog-candidate', {
            hash,
            stage,
            variant,
            status: 'quarantined',
            ...validation,
          }),
        onError: (error) =>
          run.event('catalog-error', {
            stage,
            variant,
            message: error instanceof Error ? error.message : String(error),
          }),
      },
    )
  }

  // 1b. remix: edit the game on screen instead of writing a new one. A real
  // remix keeps the genre; a genre change means the words were a new game.
  if (
    spec.remix &&
    opts.current &&
    spec.changes.length > 0 &&
    spec.genre === opts.current.spec.genre
  ) {
    const cur = opts.current
    emit({ type: 'remix', phase: 'start', changes: spec.changes })
    run.event('remix', { phase: 'start', slug: cur.slug, changes: spec.changes })
    const keep = (why: string): PipelineResult => {
      run.event('remix', { phase: 'kept', why })
      return done({
        code: cur.code,
        title: cur.title,
        note: "COULDN'T REMIX THAT. KEPT THE ORIGINAL",
        spec: cur.spec,
        players,
        slug: cur.slug,
        source: 'kept',
        observations: [why],
      })
    }
    try {
      run.write(
        'remix-prompt.txt',
        `=== SYSTEM ===\n${remixSystemPrompt(prompt)}\n\n=== USER ===\n${remixUserTurn(spec, cur.code, spec.changes, prompt.designContext, prompt.transcript)}\n`,
      )
      const r = await remix(prompt, spec, cur.code, spec.changes, {
        signal: opts.signal,
        onDelta: (text) => emit({ type: 'token', text, variant: 0, stage: 'remix' }),
      })
      run.write('remix.raw.txt', r.raw)
      run.write('game.remix.js', r.code)
      run.event('remix', {
        phase: 'built',
        ms: r.ms,
        ttftMs: r.ttftMs,
        usage: r.usage,
        blocks: r.blocks,
        applyError: r.applyError,
        syntaxError: r.syntaxError,
      })
      let code = r.code
      const p = await checkCandidate(
        code,
        'remix',
        0,
        () => {
          const error = r.applyError
            ? `the edit could not be applied: ${r.applyError}`
            : r.syntaxError
              ? `the game failed to load: ${r.syntaxError}`
              : null
          return error
            ? { ok: false, observations: [error], thumb: null, ms: 0, checks: {} }
            : probe(code, { controls, title: spec.title, players })
        },
        r,
      )
      run.event('probe', { stage: 'remix', ok: p.ok, observations: p.observations, ms: p.ms })
      emit({ type: 'probe', variant: 0, ok: p.ok, observations: p.observations, ms: p.ms })
      if (p.ok) {
        emit({ type: 'remix', phase: 'done', changes: spec.changes, ok: true, ms: r.ms })
        if (p.thumb) run.write('thumb.png', p.thumb)
        return done({
          code,
          title: spec.title,
          note: spec.note,
          spec,
          players,
          slug: cur.slug,
          source: 'remix',
          observations: p.observations,
        })
      }
      checkCancelled(opts.signal)
      const observations = p.observations
      // One full-file repair round on whichever version got furthest.
      if (r.applyError) code = cur.code
      emit({ type: 'repair', phase: 'start', observations })
      run.event('repair', { phase: 'start', stage: 'remix', observations })
      const fixed = await repair(
        prompt,
        spec,
        code,
        [`apply these changes: ${spec.changes.join('; ')}`, ...observations],
        {
          signal: opts.signal,
          onDelta: (text) => emit({ type: 'token', text, variant: 0, stage: 'repair' }),
        },
      )
      run.write('game.remix.repair.js', fixed.code)
      const p2 = await checkCandidate(
        fixed.code,
        'remix-repair',
        0,
        () =>
          fixed.syntaxError
            ? {
                ok: false,
                observations: [`the game failed to load: ${fixed.syntaxError}`],
                thumb: null,
                ms: 0,
                checks: {},
              }
            : probe(fixed.code, { controls, title: spec.title, players }),
        fixed,
      )
      run.event('repair', {
        phase: 'done',
        stage: 'remix',
        ms: fixed.ms,
        ok: p2.ok,
        observations: p2.observations,
      })
      emit({
        type: 'repair',
        phase: 'done',
        ok: p2.ok,
        ms: fixed.ms,
        observations: p2.observations,
      })
      if (p2.ok) {
        emit({ type: 'remix', phase: 'done', changes: spec.changes, ok: true, ms: r.ms + fixed.ms })
        return done({
          code: fixed.code,
          title: spec.title,
          note: spec.note,
          spec,
          players,
          slug: cur.slug,
          source: 'remix',
          observations: p2.observations,
        })
      }
      emit({ type: 'remix', phase: 'done', changes: spec.changes, ok: false })
      return keep(p2.observations.join('; '))
    } catch (e) {
      checkCancelled(opts.signal)
      if (isAbort(e)) throw e
      const message = e instanceof Error ? e.message : String(e)
      run.event('error', { stage: 'remix', message })
      emit({ type: 'remix', phase: 'done', changes: spec.changes, ok: false })
      return keep(message)
    }
  }

  // 2. race
  const controllers: AbortController[] = []
  const attempt = async (variant: number): Promise<Attempt> => {
    const ac = new AbortController()
    controllers.push(ac)
    const abort = () => ac.abort(opts.signal?.reason)
    opts.signal?.addEventListener('abort', abort, { once: true })
    if (opts.signal?.aborted) abort()
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
      run.write(`customization.v${variant}.js`, b.sourceCode)
      run.event('build', {
        variant,
        ms: b.ms,
        ttftMs: b.ttftMs,
        usage: b.usage,
        syntaxError: b.syntaxError,
        incompleteReason: b.incompleteReason,
      })
      emit({ type: 'built', variant, ms: b.ms, tokens: b.usage.output, syntaxError: b.syntaxError })
      a.probe = await checkCandidate(
        b.code,
        'build',
        variant,
        () =>
          b.syntaxError
            ? {
                ok: false,
                observations: [`the game failed to load: ${b.syntaxError}`],
                thumb: null,
                ms: 0,
                checks: {},
              }
            : probe(b.code, { controls, title: spec.title, players }),
        b,
        ac.signal,
      )
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
        emit({ type: 'error', message: `build ${variant}: ${a.error}`, terminal: false })
      }
    } finally {
      opts.signal?.removeEventListener('abort', abort)
    }
    return a
  }

  const pending = new Map<number, Promise<Attempt>>()
  for (let v = 0; v < race; v++) pending.set(v, attempt(v))
  const finished: Attempt[] = []
  let winner: Attempt | null = null
  while (pending.size > 0 && !winner) {
    const a = await Promise.race(pending.values())
    checkCancelled(opts.signal)
    pending.delete(a.variant)
    finished.push(a)
    if (a.probe?.ok) winner = a
  }
  if (winner) {
    for (const c of controllers) c.abort()
    return finish(winner, 'build')
  }

  checkCancelled(opts.signal)

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
        onDelta: (text) => emit({ type: 'token', text, variant: best.variant, stage: 'repair' }),
      })
      run.write('game.repair.js', r.code)
      run.write('customization.repair.js', r.sourceCode)
      const p = await checkCandidate(
        r.code,
        'repair',
        best.variant,
        () =>
          r.syntaxError
            ? {
                ok: false,
                observations: [`the game failed to load: ${r.syntaxError}`],
                thumb: null,
                ms: 0,
                checks: {},
              }
            : probe(r.code, { controls, title: spec.title, players }),
        r,
      )
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
      checkCancelled(opts.signal)
      if (isAbort(e)) throw e
      const message = e instanceof Error ? e.message : String(e)
      run.event('error', { stage: 'repair', message })
      emit({ type: 'repair', phase: 'done', ok: false, observations: [message] })
    }
  }

  checkCancelled(opts.signal)

  // 4. fallback
  const reason = best?.probe
    ? best.probe.observations.join('; ')
    : (best?.error ?? 'no build finished')
  const fb = pickFallback(spec.genre, players)
  run.event('fallback', { reason, slug: fb.slug, source: fb.source })
  emit({ type: 'fallback', reason, title: fb.title, slug: fb.slug })
  return done({
    code: fb.code,
    title: fb.title,
    note: spec.note,
    spec: fb.spec ?? spec,
    players,
    slug: fb.slug,
    source: fb.source,
    observations: [reason],
  })

  function finish(a: Attempt, source: 'build' | 'repair'): PipelineResult {
    checkCancelled(opts.signal)
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
    let slug = run.id
    if (opts.keep !== false) {
      slug = keepInLibrary(spec, code, a.probe?.thumb ?? null, run.id)
      run.event('library', { slug })
    }
    return done({
      code,
      title: spec.title,
      note: spec.note,
      spec,
      players,
      slug,
      source,
      observations: a.probe!.observations,
    })
  }
}
