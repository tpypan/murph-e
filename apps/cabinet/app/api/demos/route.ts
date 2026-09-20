import { listDemos } from '@htn/harness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(): Response {
  return Response.json({ games: listDemos() }, { headers: { 'Cache-Control': 'no-store' } })
}
