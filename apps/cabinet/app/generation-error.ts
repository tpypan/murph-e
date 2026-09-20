export type GenerationErrorKind =
  | 'app-only'
  | 'spend-limit'
  | 'quota'
  | 'auth'
  | 'rate-limit'
  | 'timeout'
  | 'unknown'

export interface GenerationError {
  kind: GenerationErrorKind
  message: string
  /** Whether retrying can help without changing the server's account configuration. */
  retryable: boolean
}

/** Translate provider failures without exposing keys, project IDs, URLs, or raw output. */
export function classifyGenerationError(message: string, status?: number): GenerationError {
  if (/\bAPP_API_ONLY\b/.test(message)) {
    return {
      kind: 'app-only',
      message: 'GENERATION IS ONLY AVAILABLE THROUGH THE APP.',
      retryable: false,
    }
  }
  if (
    /\benforced spend(?:ing)? limit\b|\bspend_limit_exceeded\b/i.test(message) ||
    /\b(?:project|organization|account) (?:has )?(?:reached|exceeded) (?:its |the |your )?(?:configured )?(?:monthly )?spend(?:ing)? limit\b/i.test(
      message,
    )
  ) {
    return {
      kind: 'spend-limit',
      message: 'GAME GENERATION PAUSED. OPENAI PROJECT SPEND LIMIT REACHED.',
      retryable: false,
    }
  }
  if (
    /\binsufficient_quota\b|\bbilling_hard_limit_reached\b|\byou exceeded your current quota\b/i.test(
      message,
    )
  ) {
    return {
      kind: 'quota',
      message: 'GAME GENERATION PAUSED. CHECK OPENAI CREDITS AND LIMITS.',
      retryable: false,
    }
  }
  if (
    status === 401 ||
    /\b(?:invalid_api_key|missing_api_key)\b|\bincorrect api key provided\b|\bOPENAI_API_KEY is not set\b/i.test(
      message,
    ) ||
    /\bmissing credentials\b[^\n]*\b(?:apiKey|OPENAI_API_KEY)\b/i.test(message)
  ) {
    return {
      kind: 'auth',
      message: 'GAME GENERATION PAUSED. CHECK THE OPENAI API KEY.',
      retryable: false,
    }
  }
  if (
    status === 429 ||
    /^(?:(?:build \d+|spec|repair):\s*)?(?:HTTP\s+)?429\b|\brate_limit_exceeded\b|\brate limit (?:reached|exceeded)\b/i.test(
      message,
    )
  ) {
    return {
      kind: 'rate-limit',
      message: 'GENERATOR IS BUSY. WAIT A MOMENT AND TRY AGAIN.',
      retryable: true,
    }
  }
  if (
    status === 408 ||
    status === 504 ||
    /\brequest (?:timed out|timeout)\b|\bexceeded its \d+(?:\.\d+)?s request deadline\b|\b(?:APIConnectionTimeoutError|ETIMEDOUT)\b/i.test(
      message,
    )
  ) {
    return {
      kind: 'timeout',
      message: 'GENERATION TOOK TOO LONG. TRY AGAIN.',
      retryable: true,
    }
  }
  return {
    kind: 'unknown',
    message: 'COULD NOT MAKE THAT GAME. TRY AGAIN.',
    retryable: true,
  }
}
