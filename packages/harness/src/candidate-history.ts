import {
  archiveCandidate,
  type CandidateInput,
  type CandidateValidation,
  candidateAttemptId,
  digest,
  recordCandidateValidation,
} from './catalog.ts'

export interface CandidateHistoryOptions {
  dbPath?: string
  storage?: string
  onRecorded?: (hash: string, validation: CandidateValidation) => void
  onError?: (error: unknown) => void
}

/** Fully emitted output is durable before validation can throw or be cancelled.
 * Catalog I/O failure is reported without discarding an otherwise playable game.
 * A pending record is intentionally retained if the process stops mid-validation.
 */
export async function validateCandidate<T extends { ok: boolean; observations: string[] }>(
  input: Omit<CandidateInput, 'validation'>,
  validate: () => Promise<T> | T,
  options: CandidateHistoryOptions = {},
): Promise<T> {
  const pending: CandidateValidation = { runtimePassed: null, observations: [], outcome: 'pending' }
  let archived = false
  try {
    archiveCandidate({ ...input, validation: pending }, options.dbPath, options.storage)
    archived = true
    options.onRecorded?.(digest(input.code), pending)
  } catch (error) {
    options.onError?.(error)
  }
  const finish = (validation: CandidateValidation) => {
    if (!archived) return
    try {
      recordCandidateValidation(
        input.code,
        validation,
        options.dbPath,
        candidateAttemptId(input),
        options.storage,
      )
      options.onRecorded?.(digest(input.code), validation)
    } catch (error) {
      options.onError?.(error)
    }
  }
  try {
    const result = await validate()
    finish({
      runtimePassed: result.ok,
      observations: result.observations,
      outcome: result.ok ? 'passed' : 'failed',
    })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const cancelled =
      error instanceof Error && (error.name === 'AbortError' || /abort/i.test(message))
    finish({
      runtimePassed: null,
      observations: [message],
      outcome: cancelled ? 'cancelled' : 'error',
    })
    throw error
  }
}
