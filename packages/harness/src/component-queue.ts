import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Defer parsing out of the synchronous save; callers do not await it for readiness. */
export function queueComponentIndex(
  input: { code: string; sourcePath: string; metadata: unknown },
  dbPath: string,
  storage: string,
): Promise<void> {
  return new Promise((resolveDone) =>
    setImmediate(() => {
      void import('./components.ts')
        .then(({ indexGameComponents }) => {
          indexGameComponents(input, dbPath, storage)
        })
        .catch(() => {
          // Original game bytes are already persisted. An offline index sweep retries this.
          try {
            mkdirSync(storage, { recursive: true })
            writeFileSync(
              resolve(storage, 'index-errors.jsonl'),
              `${JSON.stringify({ at: new Date().toISOString(), sourcePath: input.sourcePath, retry: 'harness components index' })}\n`,
              { flag: 'a' },
            )
          } catch {
            /* Indexing must never prevent a saved game from being played. */
          }
        })
        .finally(resolveDone)
    }),
  )
}
