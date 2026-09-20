// Offline saved artifacts only. Never calls a model or a generation endpoint.
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cloudClient, syncCloud } from '../apps/cabinet/app/api/cloud-sync.ts'
import { gameCreator } from '../packages/harness/src/game-attribution.ts'
import {
  closeProbe,
  listDemos,
  loadDemo,
  loadTemplates,
  type PublicGame,
  probe,
  queueCloudItem,
  ROOT,
} from '../packages/harness/src/index.ts'

process.loadEnvFile(resolve(ROOT, 'apps/cabinet/.env.local'))
const sourceRoot = resolve(process.argv[2] || ROOT)
const at = new Date().toISOString()
const games = new Map<string, PublicGame>()
const thumb = (path: string) => (existsSync(path) ? readFileSync(path).toString('base64') : null)
for (const g of listDemos()) {
  const game: PublicGame = {
    slug: `demo-${g.id}`,
    title: g.title,
    description: g.description,
    genre: g.genre,
    creator_name: g.creator.name,
    supported_players: g.players,
    source: 'catalog',
    created_at: at,
  }
  const candidates = [
    'screenshots/1p-action.png',
    'verification/1p-probe.png',
    'screenshots/1p-probe.png',
  ]
  const path = candidates.map((p) => resolve(ROOT, 'library/catalog', g.id, p)).find(existsSync)
  queueCloudItem({
    kind: 'game',
    game,
    thumbnail: path
      ? thumb(path)
      : ((
          await probe(loadDemo(g.id, g.players[0])!.code, {
            players: g.players[0],
            title: g.title,
            thumb: true,
          })
        ).thumb?.toString('base64') ?? null),
  })
  games.set(game.slug, game)
}
const directory = resolve(sourceRoot, 'library/games')
for (const slug of readdirSync(directory).sort()) {
  const dir = resolve(directory, slug)
  if (!existsSync(resolve(dir, 'game.js')) || !existsSync(resolve(dir, 'spec.json'))) continue
  const spec = JSON.parse(readFileSync(resolve(dir, 'spec.json'), 'utf8'))
  const creator = gameCreator('library', slug, spec.creator)
  const game: PublicGame = {
    slug,
    title: spec.title,
    description: spec.oneLiner || '',
    genre: spec.genre || 'arcade',
    creator_name: creator.name,
    supported_players: spec.supportedPlayers || [spec.players || 1],
    source: 'library',
    created_at: at,
  }
  // Use the curated display title when present, preserving all original source files.
  const manifest = JSON.parse(
    readFileSync(resolve(ROOT, 'library/creator-attributions.json'), 'utf8'),
  )
  game.title =
    manifest.assignments.find(
      (r: { kind: string; id: string }) => r.kind === 'library' && r.id === slug,
    )?.title || game.title
  queueCloudItem({ kind: 'game', game, thumbnail: thumb(resolve(dir, 'thumb.png')) })
  games.set(game.slug, game)
}
for (const t of loadTemplates()) {
  const game: PublicGame = {
    slug: `template-${t.file.replace(/\.js$/, '')}`,
    title: t.title,
    description: 'An arcade classic from the cabinet collection.',
    genre: t.genre,
    creator_name: t.creator.name,
    supported_players: [t.players],
    source: 'template',
    created_at: at,
  }
  queueCloudItem({
    kind: 'game',
    game,
    thumbnail:
      (await probe(t.code, { players: t.players, title: t.title, thumb: true })).thumb?.toString(
        'base64',
      ) ?? null,
  })
  games.set(game.slug, game)
}
// Import only explicitly supplied historical scores. Match a known game; no synthetic test slugs.
const scorePath = process.argv[3]
let imported = 0,
  skipped = 0
if (scorePath)
  for (const entry of JSON.parse(readFileSync(resolve(scorePath), 'utf8')).entries ?? []) {
    const game = games.get(entry.game?.slug)
    if (
      !game ||
      !Number.isSafeInteger(entry.score) ||
      entry.score < 0 ||
      entry.score > 2147483647 ||
      /^(FA:KE:|fake|test)/i.test(entry.badgeId || '')
    ) {
      skipped++
      continue
    }
    const hash = createHash('sha256').update(`legacy:${entry.id}`).digest('hex')
    const sessionId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
    queueCloudItem({
      kind: 'score',
      id: `legacy:${entry.id}`,
      sessionId,
      game,
      slot: 0,
      players: entry.players === 2 ? 2 : 1,
      badgeId: entry.badgeId || null,
      name: entry.name || 'GUEST',
      score: entry.score,
      outcome: 'completed',
      at: entry.at,
    })
    imported++
  }
await closeProbe()
if (!cloudClient()) throw new Error('Configure the cabinet Supabase environment before syncing.')
const result = await syncCloud()
console.log(JSON.stringify({ games: games.size, historicalScores: imported, skipped, ...result }))
if (result.pending) process.exitCode = 1
