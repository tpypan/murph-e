import { type BuildResult, build } from './build.ts'
import { catalogSource } from './catalog.ts'
import { MODELS } from './env.ts'
import type { BuildPrompt } from './prompt.ts'
import type { GameSpec } from './spec.ts'

/**
 * One bounded repair round. Reuses the build system prefix so the prompt
 * cache still hits; only the user turn changes.
 */
export function repairUserTurn(
  prompt: BuildPrompt,
  spec: GameSpec,
  code: string,
  observations: string[],
): string {
  return [
    '=== SPEC ===',
    JSON.stringify(spec, null, 2),
    '',
    ...(prompt.transcript ? ['=== WHAT THE PERSON SAID ===', prompt.transcript, ''] : []),
    prompt.designContext.text,
    prompt.referenceContext?.text ?? '',
    prompt.catalog?.text ?? '',
    '',
    '=== GAME THAT FAILED ITS CHECKS ===',
    '```js',
    catalogSource(code).trim(),
    '```',
    '',
    '=== WHAT A PLAYER OBSERVED ===',
    ...observations.map((o) => `- ${o}`),
    '',
    'Fix every observation above. Keep the game, its theme and its structure; change as little as needed. Check the API reference for any function you call. Return the complete corrected game.js in one fenced js block, nothing else.',
  ].join('\n')
}

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
  return build(
    { ...prompt, user: repairUserTurn(prompt, spec, code, observations) },
    {
      model: opts.model ?? MODELS.repair,
      effort: opts.effort ?? MODELS.repairEffort,
      signal: opts.signal,
      onDelta: opts.onDelta,
    },
  )
}
