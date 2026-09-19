import { build } from './build.ts'
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
  run.write('spec.json', JSON.stringify(s.spec, null, 2))
  run.event('spec', { ms: s.ms, usage: s.usage, spec: s.spec })
  emit({ type: 'spec', spec: s.spec, ms: s.ms })

  const prompt = buildPrompt(s.spec, transcript, loadTemplates())
  run.write('prompt.txt', `=== SYSTEM ===\n${prompt.system}\n\n=== USER ===\n${prompt.user}\n`)
  const b = await build(prompt, {
    model: opts.model,
    effort: opts.effort,
    variant: opts.variant,
    onDelta: (text) => emit({ type: 'token', text }),
  })
  run.write('game.js', b.code)
  run.write('build.raw.txt', b.raw)
  run.event('build', {
    model: opts.model ?? MODELS.build,
    effort: opts.effort ?? MODELS.buildEffort,
    ms: b.ms,
    ttftMs: b.ttftMs,
    usage: b.usage,
    syntaxError: b.syntaxError,
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
