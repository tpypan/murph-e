import { BUILD_MAX_OUTPUT_TOKENS, build } from './build.ts'
import { archiveCandidate, catalogSnapshot } from './catalog.ts'
import { recordDesignContext } from './design-context.ts'
import { MODELS } from './env.ts'
import { buildPrompt, loadTemplates } from './prompt.ts'
import { createRun, type Run } from './run-store.ts'
import { type GameSpec, type Players, specify } from './spec.ts'

export type GenEvent =
  | { type: 'spec'; spec: GameSpec; ms: number }
  | { type: 'token'; text: string }
  | { type: 'built'; ms: number; ttftMs: number | null; tokens: number; syntaxError: string | null }

export interface GenOptions {
  model?: string
  effort?: string
  specModel?: string
  specEffort?: string
  variant?: number
  players?: Players
  onEvent?: (ev: GenEvent) => void
  run?: Run
}

export interface GenResult {
  run: Run
  spec: GameSpec
  code: string
  timings: { specMs: number; buildMs: number; ttftMs: number | null; totalMs: number }
  tokens: { spec: number; build: number; reasoning: number; cached: number }
  syntaxError: string | null
}

/** transcript -> spec -> game.js, written to the run directory. No probe here. */
export async function gen(transcript: string, opts: GenOptions = {}): Promise<GenResult> {
  const t0 = performance.now()
  const run = opts.run ?? createRun(transcript)
  const emit = opts.onEvent ?? (() => {})

  const s = await specify(transcript, {
    model: opts.specModel,
    effort: opts.specEffort,
    players: opts.players,
  })
  recordDesignContext(run, 'spec', s.context)
  run.write(
    'spec-prompt.txt',
    `=== SYSTEM ===\n${s.prompt.system}\n\n=== USER ===\n${s.prompt.user}\n`,
  )
  run.write('spec.json', JSON.stringify(s.spec, null, 2))
  run.event('spec', { ms: s.ms, usage: s.usage, spec: s.spec })
  emit({ type: 'spec', spec: s.spec, ms: s.ms })

  const prompt = buildPrompt(s.spec, transcript, loadTemplates())
  recordDesignContext(run, 'build', prompt.designContext)
  run.write('implementation-context.json', JSON.stringify(prompt.referenceContext, null, 2))
  if (prompt.catalog)
    run.write('catalog-context.json', JSON.stringify(catalogSnapshot(prompt.catalog), null, 2))
  run.write('prompt.txt', `=== SYSTEM ===\n${prompt.system}\n\n=== USER ===\n${prompt.user}\n`)
  const b = await build(prompt, {
    model: opts.model,
    effort: opts.effort,
    variant: opts.variant,
    onDelta: (text) => emit({ type: 'token', text }),
  })
  try {
    const hash = archiveCandidate({
      runId: run.id,
      attemptId: `build:${opts.variant ?? 0}`,
      stage: 'build',
      variant: opts.variant ?? 0,
      transcript,
      spec: s.spec,
      code: b.code,
      rawOutput: b.raw,
      sourceCode: b.sourceCode,
      model: opts.model ?? MODELS.build,
      effort: opts.effort ?? MODELS.buildEffort,
      parts: prompt.catalog ? catalogSnapshot(prompt.catalog).parts : [],
      sprites: prompt.catalog ? catalogSnapshot(prompt.catalog).sprites : [],
      validation: {
        runtimePassed: b.syntaxError ? false : null,
        observations: [b.syntaxError ?? 'Not runtime-tested yet'],
        outcome: b.syntaxError ? 'failed' : 'pending',
      },
    })
    run.event('catalog-candidate', { hash, status: 'quarantined' })
  } catch (error) {
    run.event('catalog-error', { message: error instanceof Error ? error.message : String(error) })
  }
  run.write('game.js', b.code)
  run.write('build.raw.txt', b.raw)
  run.write('customization.js', b.sourceCode)
  run.event('build', {
    model: opts.model ?? MODELS.build,
    effort: opts.effort ?? MODELS.buildEffort,
    ms: b.ms,
    ttftMs: b.ttftMs,
    usage: b.usage,
    syntaxError: b.syntaxError,
    incompleteReason: b.incompleteReason,
    maxOutputTokens: BUILD_MAX_OUTPUT_TOKENS,
  })
  emit({
    type: 'built',
    ms: b.ms,
    ttftMs: b.ttftMs,
    tokens: b.usage.output,
    syntaxError: b.syntaxError,
  })

  const totalMs = Math.round(performance.now() - t0)
  const result: GenResult = {
    run,
    spec: s.spec,
    code: b.code,
    timings: { specMs: s.ms, buildMs: b.ms, ttftMs: b.ttftMs, totalMs },
    tokens: {
      spec: s.usage.output,
      build: b.usage.output,
      reasoning: b.usage.reasoning,
      cached: b.usage.cached,
    },
    syntaxError: b.syntaxError,
  }
  run.write('timings.json', JSON.stringify({ ...result.timings, tokens: result.tokens }, null, 2))
  return result
}
