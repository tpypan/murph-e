import {
  MAX_AUDIO_BYTES,
  speechProvider,
  transcriptionError,
  transcriptionFile,
  withAppGeneration,
} from '@htn/harness'
import { transcribeLocally } from './local-whisper'
import { transcribeWithOpenAI } from './openai-transcribe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** A real player's completed clip. Provider credentials stay on the server. */
export async function POST(req: Request): Promise<Response> {
  try {
    const form = await req.formData()
    const audio = form.get('audio')
    if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ text: '' })
    if (audio.size > MAX_AUDIO_BYTES)
      return Response.json(
        { error: 'Recording too large. Try a shorter description.' },
        { status: 413 },
      )
    req.signal.throwIfAborted()
    const result =
      speechProvider() === 'local'
        ? await transcribeLocally(Buffer.from(await audio.arrayBuffer()))
        : await withAppGeneration(async () => {
            const file = transcriptionFile(audio)
            return transcribeWithOpenAI(
              Buffer.from(await file.arrayBuffer()),
              file.name,
              req.signal,
              file.type,
            )
          })
    return Response.json(result)
  } catch (e) {
    const { error, status } = transcriptionError(e)
    return Response.json({ error }, { status })
  }
}
