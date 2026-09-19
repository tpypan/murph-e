import { MODELS, openai } from '@htn/harness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Fallback path: POST a recorded clip (multipart `audio`), get text back. */
export async function POST(req: Request): Promise<Response> {
  try {
    const form = await req.formData()
    const audio = form.get('audio')
    if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ text: '' })
    const file = new File([audio], 'clip.webm', { type: audio.type || 'audio/webm' })
    const t0 = performance.now()
    const r = await openai().audio.transcriptions.create({
      model: MODELS.sttClip,
      file,
      language: 'en',
    })
    return Response.json({ text: r.text ?? '', ms: Math.round(performance.now() - t0) })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
