import {
  beginPlaySession,
  listDemos,
  listLibrary,
  loadTemplates,
  type PublicGame,
} from '@htn/harness'
import { getHub } from '../badges/hub'
import { startCloudSync } from '../cloud-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin)
    return Response.json({ error: 'Invalid origin' }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body.slug !== 'string' || ![1, 2].includes(body.players))
    return Response.json({ error: 'Game and player count required' }, { status: 400 })
  const demo = body.slug.startsWith('demo-')
    ? listDemos().find((g) => `demo-${g.id}` === body.slug)
    : null
  const saved = !demo ? listLibrary().find((g) => g.slug === body.slug) : null
  const template =
    !demo && !saved
      ? loadTemplates().find(
          (g) =>
            `template-${g.file.replace(/\.js$/, '')}` === body.slug ||
            g.file.replace(/\.js$/, '') === body.slug,
        )
      : null
  const chosen = demo ?? saved ?? template
  if (!chosen) return Response.json({ error: 'Game not found' }, { status: 404 })
  const modes =
    demo?.players ??
    (saved?.spec as { supportedPlayers?: number[] } | null)?.supportedPlayers ??
    (saved?.spec?.multiplayer ? [1, 2] : [Number(chosen.players)])
  if (!modes.includes(body.players))
    return Response.json({ error: 'Player mode unavailable' }, { status: 400 })
  const game: PublicGame = {
    slug: template ? `template-${template.file.replace(/\.js$/, '')}` : body.slug,
    title: chosen.title,
    genre: chosen.genre,
    description: demo?.description ?? saved?.spec?.oneLiner ?? '',
    creator_name: chosen.creator?.name || 'GUEST',
    supported_players: modes,
    source: demo ? 'catalog' : template ? 'template' : 'library',
    created_at: new Date().toISOString(),
  }
  const badges = getHub()
    .badges()
    .filter((b) => b.state === 'ready' && b.identity && b.slot !== null)
    .sort((a, b) => a.slot! - b.slot!)
  const identities = Array.from({ length: body.players }, (_, i) => {
    const badge = body.players === 1 ? badges[0] : badges.find((b) => b.slot === i)
    return badge?.identity ? { badgeId: badge.identity.badgeId, name: badge.identity.name } : null
  })
  const session = beginPlaySession(game, body.players, identities)
  startCloudSync()
  return Response.json({ sessionId: session.id }, { headers: { 'Cache-Control': 'no-store' } })
}
