import { assertAppGeneration, openai, TRANSCRIPTION_DEADLINE_MS, withDeadline } from '@htn/harness'

interface Transcript {
  text: string
  ms: number
  model: string
  local: false
}

/** Ported from main 14a6876; retain its model and English/JSON transcription settings. */
export const OPENAI_STT_MODEL = 'gpt-4o-mini-transcribe'

/**
 * Transcribe a recorded clip with the OpenAI transcription API. This runs only
 * inside the route's real-player request scope. Retain the branch's cancellation,
 * full-response deadline and no-retry behavior.
 */
export async function transcribeWithOpenAI(
  audio: Buffer,
  filename: string,
  signal?: AbortSignal,
  mimeType?: string,
): Promise<Transcript> {
  assertAppGeneration()
  signal?.throwIfAborted()
  const t0 = performance.now()
  const model = process.env.HTN_STT_MODEL || OPENAI_STT_MODEL
  const type = mimeType ?? (filename.endsWith('.mp4') ? 'audio/mp4' : 'audio/webm')
  const file = new File([new Uint8Array(audio)], filename, { type })
  const result = await withDeadline(
    'Transcription',
    TRANSCRIPTION_DEADLINE_MS,
    signal,
    (requestSignal) =>
      openai().audio.transcriptions.create(
        {
          file,
          model,
          language: 'en',
          response_format: 'json',
        },
        { timeout: TRANSCRIPTION_DEADLINE_MS, signal: requestSignal, maxRetries: 0 },
      ),
  )
  if (typeof result.text !== 'string') throw new Error('Invalid transcription response')
  return {
    text: (result.text ?? '').trim(),
    ms: Math.round(performance.now() - t0),
    model,
    local: false,
  }
}
