import { transcribeLocally } from './local-whisper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST a recorded clip; decode locally with faster-whisper tiny.en on CPU. */
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
    return Response.json(await transcribeLocally(Buffer.from(await audio.arrayBuffer())))
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 })
  }
}
