export const TRANSCRIPTION_DEADLINE_MS = 60_000
export const MAX_AUDIO_BYTES = 12 * 1024 * 1024
export function speechProvider(): 'openai' | 'local' {
  // Main's setting takes precedence; keep the experiment's older name compatible.
  const provider = process.env.HTN_STT ?? process.env.HTN_STT_PROVIDER ?? 'openai'
  if (provider !== 'openai' && provider !== 'local')
    throw new Error('HTN_STT (or legacy HTN_STT_PROVIDER) must be openai or local')
  return provider
}

export class TranscriptionInputError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

/** Preserve the encoded recording and an extension-bearing filename for the API. */
export function transcriptionFile(audio: Blob): File {
  if (audio.size > MAX_AUDIO_BYTES)
    throw new TranscriptionInputError('Recording too large. Try a shorter description.', 413)
  const type = audio.type.split(';')[0]!.trim().toLowerCase()
  const extensions: Record<string, string> = {
    'audio/webm': 'webm',
    'video/webm': 'webm',
    'audio/mp4': 'mp4',
    'video/mp4': 'mp4',
    'audio/x-m4a': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
  }
  const extension = extensions[type]
  if (!extension)
    throw new TranscriptionInputError(
      'Unsupported audio recording. Try Chrome and record again.',
      415,
    )
  return new File([audio], `speech.${extension}`, { type })
}

/** Public errors must never repeat provider bodies, credentials or private URLs. */
export function transcriptionError(error: unknown): { error: string; status: number } {
  if (error instanceof TranscriptionInputError)
    return { error: error.message, status: error.status }
  const status = (error as { status?: number } | null)?.status
  const message = error instanceof Error ? error.message : ''
  if (status === 401 || status === 403 || /OPENAI_API_KEY is not set/.test(message))
    return { error: 'Speech recognition needs a valid OpenAI API key on the server.', status: 503 }
  if (status === 404)
    return {
      error: 'The configured speech model is unavailable for this OpenAI account.',
      status: 503,
    }
  if (status === 429)
    return {
      error: 'Speech service limit reached. Check OpenAI credits or try again later.',
      status: 429,
    }
  if (status === 400)
    return {
      error: 'Speech service could not process that recording. Try recording again.',
      status: 400,
    }
  if (/request deadline|timed out/i.test(message))
    return { error: 'Transcription timed out. Try a shorter recording.', status: 504 }
  if (error instanceof Error && error.name === 'AbortError')
    return { error: 'Transcription cancelled.', status: 499 }
  return { error: 'Speech recognition is unavailable. Try again.', status: 503 }
}
