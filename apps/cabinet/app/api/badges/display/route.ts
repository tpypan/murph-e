import { getHub } from '../hub'

export const runtime = 'nodejs'

export async function POST(req: Request): Promise<Response> {
  const data = await req.json().catch(() => null)
  if (!data || ![1, 2].includes(data.players) || typeof data.playing !== 'boolean')
    return Response.json({ error: 'Invalid display' }, { status: 400 })
  const controls: Record<string, string | null> = {}
  for (const key of ['up', 'down', 'left', 'right', 'a', 'b']) {
    const value = data.controls?.[key]
    controls[key] = typeof value === 'string' ? value.slice(0, 160) : null
  }
  getHub().setDisplay({ players: data.players, playing: data.playing, controls })
  return Response.json({ ok: true })
}
