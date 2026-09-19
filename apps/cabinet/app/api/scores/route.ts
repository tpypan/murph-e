import { addScore, type ScoreInput, topScores } from '@htn/harness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET ?game=<slug> -> { overall, game }: the top ten across all games and for this game. */
export function GET(req: Request): Response {
  const game = new URL(req.url).searchParams.get('game') ?? ''
  return Response.json({
    overall: topScores({ limit: 10 }),
    game: game ? topScores({ game, limit: 10 }) : [],
  })
}

/** POST a ScoreInput -> the stored entry. */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Partial<ScoreInput> | null
  if (!body || typeof body.score !== 'number' || !body.game?.slug)
    return Response.json({ error: 'score and game.slug required' }, { status: 400 })
  return Response.json({
    entry: addScore({
      badgeId: body.badgeId ?? null,
      name: body.name ?? null,
      score: body.score,
      players: body.players,
      game: { slug: body.game.slug, title: body.game.title ?? body.game.slug },
    }),
  })
}
