import { Script } from 'node:vm'
import { assembleCatalog } from './catalog.ts'
import { REQUEST_LIMITS, withDeadline } from './deadline.ts'
import { MODELS, ms, now, openai } from './env.ts'
import { type BuildPrompt, extractCode } from './prompt.ts'

// Includes reasoning tokens as well as the generated game and sprite data.
export const BUILD_MAX_OUTPUT_TOKENS = 20_000

export interface BuildUsage {
  input: number
  cached: number
  output: number
  reasoning: number
}

export interface BuildResult {
  code: string
  raw: string
  ms: number
  ttftMs: number | null
  usage: BuildUsage
  syntaxError: string | null
  incompleteReason: string | null
  /** Model-authored customization before deterministic catalog linking. */
  sourceCode: string
}

export interface BuildOptions {
  model?: string
  effort?: string
  variant?: number
  signal?: AbortSignal
  onDelta?: (text: string) => void
}

/** Compile-only syntax check; the probe runs the code, this just parses it. */
export function syntaxCheck(code: string): string | null {
  try {
    new Script(code, { filename: 'game.js' })
    return null
  } catch (e) {
    return e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
}

/** One streamed call: prompt in, game.js out. This is the whole build path. */
export async function build(prompt: BuildPrompt, opts: BuildOptions = {}): Promise<BuildResult> {
  const t0 = now()
  let ttft: number | null = null
  let incompleteReason: string | null = null
  let receivedTerminal = false
  const parts: string[] = []
  const usage: BuildUsage = { input: 0, cached: 0, output: 0, reasoning: 0 }
  const variant = opts.variant ?? 0
  try {
    await withDeadline('build', REQUEST_LIMITS.build, opts.signal, async (signal) => {
      const stream = await openai().responses.create(
        {
          model: opts.model ?? MODELS.build,
          reasoning: {
            effort: (opts.effort ?? MODELS.buildEffort) as
              | 'low'
              | 'medium'
              | 'high'
              | 'xhigh'
              | 'max',
          },
          instructions: prompt.system,
          input:
            variant > 0
              ? `${prompt.user}\n\n(Take ${variant + 1}: make a fresh attempt.)`
              : prompt.user,
          stream: true,
          prompt_cache_key: prompt.cacheKey,
          max_output_tokens: BUILD_MAX_OUTPUT_TOKENS,
        },
        { signal },
      )
      for await (const ev of stream) {
        if (ev.type === 'response.output_text.delta') {
          if (ttft === null) ttft = ms(t0)
          parts.push(ev.delta)
          opts.onDelta?.(ev.delta)
        } else if (ev.type === 'response.completed' || ev.type === 'response.incomplete') {
          receivedTerminal = true
          if (ev.type === 'response.incomplete')
            incompleteReason = ev.response.incomplete_details?.reason ?? 'unknown'
          const u = ev.response.usage
          usage.input = u?.input_tokens ?? 0
          usage.cached = u?.input_tokens_details?.cached_tokens ?? 0
          usage.output = u?.output_tokens ?? 0
          usage.reasoning = u?.output_tokens_details?.reasoning_tokens ?? 0
          // The provider's terminal event defines the output boundary. Waiting for
          // transport EOF can lose already completed code during stream cleanup.
          break
        } else if (ev.type === 'response.failed' || ev.type === 'error') {
          throw new Error(`build failed: ${JSON.stringify(ev).slice(0, 300)}`)
        }
      }
    })
  } catch (error) {
    if (!receivedTerminal) throw error
    // Preserve terminal output for archival even if iterator teardown or a
    // simultaneous cancellation fails. The pipeline checks cancellation after
    // archiving and before validating/playing this result.
  }
  if (!receivedTerminal) incompleteReason = 'stream_ended_before_completion'
  const raw = parts.join('')
  const sourceCode = extractCode(raw)
  let code = sourceCode
  let assemblyError: string | null = null
  try {
    code = assembleCatalog(sourceCode, prompt.catalog)
  } catch (error) {
    assemblyError = error instanceof Error ? error.message : String(error)
  }
  return {
    code,
    raw,
    ms: ms(t0),
    ttftMs: ttft,
    usage,
    incompleteReason,
    sourceCode,
    syntaxError: incompleteReason
      ? `Model output incomplete: ${incompleteReason}. The game was not finished.`
      : (assemblyError ?? syntaxCheck(code)),
  }
}
