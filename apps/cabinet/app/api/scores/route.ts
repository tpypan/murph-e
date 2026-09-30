import { completePlaySession, topScores } from '@htn/harness'
import { startCloudSync } from '../cloud-sync'
import { sameOrigin } from '../same-origin'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(req: Request): Response {
  if (process.env.MURPH_PI !== '1') startCloudSync()
  const game = new URL(req.url).searchParams.get('game') ?? ''
  return Response.json(
    { overall: topScores({ limit: 10 }), game: game ? topScores({ game, limit: 10 }) : [] },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin' }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body.sessionId !== 'string')
    return Response.json({ error: 'Play session required' }, { status: 400 })
  try {
    const entries = completePlaySession(
      body.sessionId,
      body.scores,
      body.state,
      body.winner ?? null,
    )
    if (process.env.MURPH_PI !== '1') startCloudSync()
    return Response.json({ entries, sync: 'queued' }, { status: 202 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status =
      message === 'UNKNOWN_SESSION'
        ? 404
        : message === 'RESULT_CONFLICT'
          ? 409
          : message.startsWith('INVALID_')
            ? 400
            : 503
    return Response.json(
      {
        error:
          status === 503
            ? 'Score storage unavailable; retry this result.'
            : 'Invalid or conflicting game result.',
      },
      { status },
    )
  }
}
