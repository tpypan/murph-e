import { listLibrary, loadTemplates } from '@htn/harness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Every playable game for attract mode and fallbacks: library first, templates always. */
export function GET(): Response {
  const games = listLibrary().map((g) => ({
    slug: g.slug,
    title: g.title,
    genre: g.genre,
    players: g.players,
    code: g.code,
    spec: g.spec,
    source: 'library' as const,
  }))
  const templates = loadTemplates().map((t) => ({
    slug: `template-${t.file.replace(/\.js$/, '')}`,
    title: t.title,
    genre: t.genre,
    players: t.players,
    code: t.code,
    spec: null,
    source: 'template' as const,
  }))
  return Response.json({ games: [...games, ...templates] })
}
