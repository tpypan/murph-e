import { type ProbeOptions, type ProbeResult, probe } from '@htn/probe'
import { REQUIRED_PLAYER_MODES } from './multiplayer.ts'
import type { GameSpec } from './spec.ts'

/** New specs promise both modes. Historical specs retain their original contract. */
export async function probeGameModes(
  code: string,
  options: ProbeOptions & { multiplayer?: GameSpec['multiplayer']; signal?: AbortSignal },
): Promise<ProbeResult> {
  const modes = options.multiplayer ? REQUIRED_PLAYER_MODES : [options.players === 2 ? 2 : 1]
  const results: Array<{ players: number; result: ProbeResult }> = []
  const started = performance.now()
  function checkCancelled() {
    if (!options.signal?.aborted) return
    const error = new Error('Generation cancelled', { cause: options.signal.reason })
    error.name = 'AbortError'
    throw error
  }
  for (const players of modes) {
    checkCancelled()
    const result = await probe(code, {
      controls: options.controls,
      title: options.title,
      seed: options.seed,
      players,
      thumb: options.thumb !== false && players === (options.players === 2 ? 2 : 1),
      requireIndependentPlayers: !!options.multiplayer && players === 2,
    })
    results.push({ players, result })
  }
  checkCancelled()
  if (!options.multiplayer) return results[0]!.result
  return {
    ok: results.every(({ result }) => result.ok),
    observations: results.flatMap(({ players, result }) =>
      result.observations.map((observation) => `${players}P mode: ${observation}`),
    ),
    checks: Object.fromEntries(
      results.flatMap(({ players, result }) => [
        [`${players}p:passed`, result.ok],
        ...Object.entries(result.checks).map(([key, value]) => [
          key.startsWith('soft:') ? `soft:${players}p:${key.slice(5)}` : `${players}p:${key}`,
          value,
        ]),
      ]),
    ),
    thumb:
      results.find(({ players }) => players === (options.players === 2 ? 2 : 1))?.result.thumb ??
      null,
    ms: Math.round(performance.now() - started),
  }
}
