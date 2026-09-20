import { transcribeLocally } from './local-whisper'
import { transcribeWithOpenAI } from './openai-transcribe'

/** OpenAI transcription by default; HTN_STT=local keeps clips on the resident faster-whisper worker. */
const useOpenAI = process.env.HTN_STT !== 'local'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST a recorded clip; transcribe via OpenAI, or locally with faster-whisper tiny.en on CPU. */
export async function POST(req: Request): Promise<Response> {
  try {
    const form = await req.formData()
    const audio = form.get('audio')
    if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ text: '' })
    if (audio.size > 12 * 1024 * 1024)
      return Response.json(
        { error: 'Recording too large. Try a shorter description.' },
        { status: 413 },
      )
    const bytes = Buffer.from(await audio.arrayBuffer())
    if (useOpenAI) {
      const name = audio instanceof File && audio.name.endsWith('.mp4') ? 'clip.mp4' : 'clip.webm'
      return Response.json(await transcribeWithOpenAI(bytes, name))
    }
    return Response.json(await transcribeLocally(bytes))
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 })
  }
}
