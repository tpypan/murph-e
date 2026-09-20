export interface CompletedRound {
  sessionId: string
  scores: number[]
  state: 'win' | 'gameover'
  winner: number | null
}
const KEY = 'murph-e.pending-results.v1'
export function pendingResults(storage: Pick<Storage, 'getItem'>): CompletedRound[] {
  try {
    return JSON.parse(storage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
export function retainResult(
  result: CompletedRound,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
) {
  const pending = pendingResults(storage)
  if (!pending.some((r) => r.sessionId === result.sessionId))
    storage.setItem(KEY, JSON.stringify([...pending, result]))
}
let flushing: Promise<void> | null = null
export function flushResults(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  request: typeof fetch = fetch,
): Promise<void> {
  if (flushing) return flushing
  flushing = (async () => {
    for (const result of pendingResults(storage)) {
      try {
        const response = await request('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
          signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) continue
        storage.setItem(
          KEY,
          JSON.stringify(pendingResults(storage).filter((r) => r.sessionId !== result.sessionId)),
        )
      } catch {
        break
      }
    }
  })().finally(() => {
    flushing = null
  })
  return flushing
}
