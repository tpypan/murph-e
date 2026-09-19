import { type BuildResult, build } from './build.ts'
import { MODELS } from './env.ts'
import type { BuildPrompt } from './prompt.ts'
import type { GameSpec } from './spec.ts'

/**
 * One bounded repair round. Reuses the build system prefix so the prompt
 * cache still hits; only the user turn changes.
 */
export async function repair(
  prompt: BuildPrompt,
  spec: GameSpec,
  code: string,
  observations: string[],
  opts: {
    model?: string
    effort?: string
    signal?: AbortSignal
    onDelta?: (t: string) => void
  } = {},
): Promise<BuildResult> {
  const user = [
    '=== SPEC ===',
    JSON.stringify(spec, null, 2),
    '',
    '=== GAME THAT FAILED ITS CHECKS ===',
    '```js',
    code.trim(),
    '```',
    '',
    '=== WHAT A PLAYER OBSERVED ===',
    ...observations.map((o) => `- ${o}`),
    '',
    'Fix every observation above. Keep the game, its theme and its structure; change as little as needed. Check the API reference for any function you call. Return the complete corrected game.js in one fenced js block, nothing else.',
  ].join('\n')
  return build(
    { system: prompt.system, user, chosen: prompt.chosen, cacheKey: prompt.cacheKey },
    {
      model: opts.model ?? MODELS.repair,
      effort: opts.effort ?? MODELS.repairEffort,
      signal: opts.signal,
      onDelta: opts.onDelta,
    },
  )
}
