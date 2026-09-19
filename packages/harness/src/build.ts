import { Script } from 'node:vm'
import { MODELS, ms, now, openai } from './env.ts'
import { type BuildPrompt, extractCode } from './prompt.ts'

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
  const parts: string[] = []
  const usage: BuildUsage = { input: 0, cached: 0, output: 0, reasoning: 0 }
  const variant = opts.variant ?? 0
  const stream = await openai().responses.create(
    {
      model: opts.model ?? MODELS.build,
      reasoning: { effort: (opts.effort ?? MODELS.buildEffort) as 'low' },
      instructions: prompt.system,
      input:
        variant > 0
          ? `${prompt.user}\n\n(Take ${variant + 1}: make a fresh attempt.)`
          : prompt.user,
      stream: true,
      prompt_cache_key: prompt.cacheKey,
      max_output_tokens: 12000,
    },
    { signal: opts.signal },
  )
  for await (const ev of stream) {
    if (ev.type === 'response.output_text.delta') {
      if (ttft === null) ttft = ms(t0)
      parts.push(ev.delta)
      opts.onDelta?.(ev.delta)
    } else if (ev.type === 'response.completed') {
      const u = ev.response.usage
      usage.input = u?.input_tokens ?? 0
      usage.cached = u?.input_tokens_details?.cached_tokens ?? 0
      usage.output = u?.output_tokens ?? 0
      usage.reasoning = u?.output_tokens_details?.reasoning_tokens ?? 0
    } else if (ev.type === 'response.failed' || ev.type === 'error') {
      throw new Error(`build failed: ${JSON.stringify(ev).slice(0, 300)}`)
    }
  }
  const raw = parts.join('')
  const code = extractCode(raw)
  return { code, raw, ms: ms(t0), ttftMs: ttft, usage, syntaxError: syntaxCheck(code) }
}
