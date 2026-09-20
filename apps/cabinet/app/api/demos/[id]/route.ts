import { loadDemo } from '@htn/harness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params
  const requestedPlayers = new URL(request.url).searchParams.get('players') ?? '1'
  const game =
    requestedPlayers === '1' || requestedPlayers === '2'
      ? loadDemo(id, Number(requestedPlayers) as 1 | 2)
      : null
  return Response.json(game ?? { error: 'Demo not found' }, {
    status: game ? 200 : 404,
    headers: { 'Cache-Control': 'no-store' },
  })
}
