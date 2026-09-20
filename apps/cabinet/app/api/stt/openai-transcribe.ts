import { openai, withAppGeneration } from '@htn/harness'

interface Transcript {
  text: string
  ms: number
  model: string
  local: false
}

/** Default to the small transcribe model: it is the fastest and cheapest of the set. */
export const OPENAI_STT_MODEL = process.env.HTN_STT_MODEL || 'gpt-4o-mini-transcribe'

/**
 * Transcribe a recorded clip with the OpenAI transcription API. This runs only
 * for a real person at the cabinet, so it enters the same app-generation scope
 * the generate route uses; developer CLIs never reach it.
 */
export async function transcribeWithOpenAI(audio: Buffer, filename: string): Promise<Transcript> {
  const t0 = performance.now()
  const type = filename.endsWith('.mp4') ? 'audio/mp4' : 'audio/webm'
  const file = new File([new Uint8Array(audio)], filename, { type })
  const result = await withAppGeneration(() =>
    openai().audio.transcriptions.create(
      {
        file,
        model: OPENAI_STT_MODEL,
        language: 'en',
        response_format: 'json',
      },
      { timeout: 60_000 },
    ),
  )
  return {
    text: result.text ?? '',
    ms: Math.round(performance.now() - t0),
    model: OPENAI_STT_MODEL,
    local: false,
  }
}
