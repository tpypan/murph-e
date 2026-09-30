import { listDemos } from '@htn/harness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(): Response {
  const games = listDemos()
  return Response.json(
    {
      games:
        process.env.MURPH_PI === '1'
          ? games
              .filter((game) => game.players.includes(1))
              .map((game) => ({ ...game, players: [1] }))
          : games,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
