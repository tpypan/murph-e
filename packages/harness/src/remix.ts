import { syntaxCheck } from './build.ts'
import { REQUEST_LIMITS, withDeadline } from './deadline.ts'
import type { DesignContext } from './design-context.ts'
import { MODELS, ms, now, openai } from './env.ts'
import type { BuildPrompt } from './prompt.ts'
import type { GameSpec } from './spec.ts'

// Remix: change the game that is on screen without rewriting it. The model
// returns search/replace blocks against the current file, which are a few
// hundred tokens instead of a whole game, so the round trip is seconds.
// One call, no loop; the pipeline probes the result and falls back to one
// full-file repair, then to the original game.

export interface RemixResult {
  code: string
  raw: string
  ms: number
  ttftMs: number | null
  usage: { input: number; cached: number; output: number; reasoning: number }
  syntaxError: string | null
  blocks: number
  /** Why the blocks could not be applied, or null. */
  applyError: string | null
}

export interface RemixOptions {
  model?: string
  effort?: string
  signal?: AbortSignal
  onDelta?: (text: string) => void
}

const BLOCK = /<{7} SEARCH\n([\s\S]*?)\n?={7}\n([\s\S]*?)\n?>{7} REPLACE/g

export function parseBlocks(raw: string): Array<{ search: string; replace: string }> {
  const out: Array<{ search: string; replace: string }> = []
  for (const m of raw.matchAll(BLOCK)) out.push({ search: m[1] ?? '', replace: m[2] ?? '' })
  return out
}

/** Find `search` in `code` exactly, else by trimmed lines. Returns [start, end) or null. */
function locate(code: string, search: string): [number, number] | null {
  if (search.length === 0) return null
  const i = code.indexOf(search)
  if (i >= 0) return [i, i + search.length]
  // Whitespace-insensitive: match a run of lines by their trimmed text.
  const want = search.split('\n').map((l) => l.trim())
  while (want.length > 0 && want[want.length - 1] === '') want.pop()
  if (want.length === 0) return null
  const lines = code.split('\n')
  for (let s = 0; s + want.length <= lines.length; s++) {
    let ok = true
    for (let k = 0; k < want.length; k++) {
      if ((lines[s + k] ?? '').trim() !== want[k]) {
        ok = false
        break
      }
    }
    if (ok) {
      const start = lines.slice(0, s).join('\n').length + (s > 0 ? 1 : 0)
      const end = start + lines.slice(s, s + want.length).join('\n').length
      return [start, end]
    }
  }
  return null
}

/** Apply blocks in order. Throws with the first block that does not match. */
export function applyBlocks(
  code: string,
  blocks: Array<{ search: string; replace: string }>,
): string {
  let out = code
  blocks.forEach((b, i) => {
    const at = locate(out, b.search)
    if (!at)
      throw new Error(
        `block ${i + 1} did not match the file: ${JSON.stringify(b.search.slice(0, 80))}`,
      )
    out = out.slice(0, at[0]) + b.replace + out.slice(at[1])
  })
  return out
}

export function remixUserTurn(
  spec: GameSpec,
  code: string,
  changes: string[],
  context?: DesignContext,
  transcript?: string,
): string {
  return [
    '=== THE GAME ON SCREEN ===',
    '```js',
    code.trim(),
    '```',
    '',
    '=== WHAT THE PLAYER WANTS CHANGED ===',
    ...changes.map((c) => `- ${c}`),
    '',
    ...(transcript ? ['=== WHAT THE PERSON SAID ===', transcript, ''] : []),
    context?.text ?? '',
    'Use design guidance only for the requested edits. Do not redesign or retune unrelated mechanics.',
    '',
    '=== SPEC AFTER THE CHANGES ===',
    JSON.stringify({
      title: spec.title,
      mechanics: spec.mechanics,
      lose: spec.lose,
      scoring: spec.scoring,
    }),
    '',
    'Edit the game with search/replace blocks. Output only blocks in exactly this form, nothing else:',
    '',
    '<<<<<<< SEARCH',
    'exact lines copied from the game',
    '=======',
    'the replacement lines',
    '>>>>>>> REPLACE',
    '',
    'Rules: every SEARCH is a verbatim, contiguous excerpt of the game above (same indentation, at least one whole line, unique in the file). To add code, SEARCH for a nearby anchor line and REPLACE with the anchor plus the new lines. Keep blocks small and few. Change only what the player asked for; everything they did not mention stays exactly as it is. Do not rewrite the whole file. Only use functions that exist in the API reference.',
  ].join('\n')
}

export function remixSystemPrompt(prompt: BuildPrompt): string {
  return [
    prompt.system,
    '',
    '=== REMIX STAGE OUTPUT CONTRACT ===',
    'This call edits an existing game. The earlier complete-game output instruction is replaced for this call.',
    'Output only small SEARCH/REPLACE blocks, with no Markdown fence, no prose and no complete game file:',
    '<<<<<<< SEARCH',
    'exact existing lines',
    '=======',
    'replacement lines',
    '>>>>>>> REPLACE',
    'Copy each SEARCH verbatim from the supplied current game and make it unique. Preserve all unrelated code. Apply design guidance only to the requested changes. The examples above describe runtime usage; do not copy them as output.',
  ].join('\n')
}

/** One streamed call: current game + changes in, search/replace blocks out, applied here. */
export async function remix(
  prompt: BuildPrompt,
  spec: GameSpec,
  code: string,
  changes: string[],
  opts: RemixOptions = {},
): Promise<RemixResult> {
  const t0 = now()
  let ttft: number | null = null
  const parts: string[] = []
  const usage = { input: 0, cached: 0, output: 0, reasoning: 0 }
  let receivedTerminal = false
  let incompleteReason: string | null = null
  try {
    await withDeadline('remix', REQUEST_LIMITS.remix, opts.signal, async (signal) => {
      const stream = await openai().responses.create(
        {
          model: opts.model ?? MODELS.remix,
          reasoning: { effort: (opts.effort ?? MODELS.remixEffort) as 'low' },
          instructions: remixSystemPrompt(prompt),
          input: remixUserTurn(spec, code, changes, prompt.designContext, prompt.transcript),
          stream: true,
          prompt_cache_key: `${prompt.cacheKey}-remix`,
          max_output_tokens: 4000,
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
          break
        } else if (ev.type === 'response.failed' || ev.type === 'error') {
          throw new Error(`remix failed: ${JSON.stringify(ev).slice(0, 300)}`)
        }
      }
    })
  } catch (error) {
    // Terminal output must survive iterator cleanup and simultaneous cancellation.
    if (!receivedTerminal) throw error
  }
  if (!receivedTerminal) incompleteReason = 'stream_ended_before_completion'
  const raw = parts.join('')
  const blocks = parseBlocks(raw)
  let out = code
  let applyError: string | null = incompleteReason
    ? `Model output incomplete: ${incompleteReason}`
    : null
  if (applyError) {
    // Preserve the raw reply but never apply a possibly truncated edit.
  } else if (blocks.length === 0) applyError = 'the reply had no search/replace blocks'
  else {
    try {
      out = applyBlocks(code, blocks)
    } catch (e) {
      applyError = e instanceof Error ? e.message : String(e)
    }
  }
  return {
    code: out,
    raw,
    ms: ms(t0),
    ttftMs: ttft,
    usage,
    syntaxError: applyError ? null : syntaxCheck(out),
    blocks: blocks.length,
    applyError,
  }
}

/** Share of the original's lines that survive in the new code: how much was kept. */
export function keptShare(before: string, after: string): number {
  const lines = before
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return 1
  const have = new Set(after.split('\n').map((l) => l.trim()))
  let kept = 0
  for (const l of lines) if (have.has(l)) kept++
  return kept / lines.length
}
