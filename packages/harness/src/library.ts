import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { queueComponentIndex } from './component-queue.ts'
import { ROOT, readRepoFile } from './env.ts'
import { assignedTitle, type GameCreator, gameCreator } from './game-attribution.ts'
import { loadTemplates } from './prompt.ts'
import { slugify } from './run-store.ts'
import type { GameSpec } from './spec.ts'

export interface LibraryGame {
  slug: string
  title: string
  genre: string
  players: number
  code: string
  spec: GameSpec | null
  creator: GameCreator
  source: 'library' | 'template'
}

const GAMES_DIR = resolve(ROOT, 'library/games')

export function listLibrary(): LibraryGame[] {
  if (!existsSync(GAMES_DIR)) return []
  return readdirSync(GAMES_DIR)
    .filter((d) => existsSync(resolve(GAMES_DIR, d, 'game.js')))
    .sort()
    .map((slug) => {
      const code = readRepoFile(`library/games/${slug}/game.js`)
      const specPath = resolve(GAMES_DIR, slug, 'spec.json')
      const spec: (GameSpec & { creator?: GameCreator }) | null = existsSync(specPath)
        ? JSON.parse(readFileSync(specPath, 'utf8'))
        : null
      const title = assignedTitle('library', slug, spec?.title ?? slug.toUpperCase())
      return {
        slug,
        title,
        genre: spec?.genre ?? '',
        players: spec?.players ?? 1,
        code,
        spec: spec ? { ...spec, title } : null,
        creator: gameCreator('library', slug, spec?.creator),
        source: 'library',
      }
    })
}

/**
 * Templates double as the fallback of last resort, so this never returns
 * null. A two-player fallback is always a two-player game and vice versa.
 */
export function pickFallback(
  genre: string | undefined,
  players = 1,
  rnd: () => number = Math.random,
): LibraryGame {
  const lib = listLibrary().filter((g) => g.players === players)
  const same = lib.filter((g) => g.genre === genre)
  const pool = same.length > 0 ? same : lib
  if (pool.length > 0) return pool[Math.floor(rnd() * pool.length)]!
  const templates = loadTemplates().filter((t) => t.players === players)
  const t =
    templates.find((x) => x.genre === genre) ?? templates[Math.floor(rnd() * templates.length)]!
  return {
    slug: t.file.replace(/\.js$/, ''),
    title: t.title,
    genre: t.genre,
    players: t.players,
    code: t.code,
    spec: null,
    creator: t.creator,
    source: 'template',
  }
}

/** Copy a passing game into library/games/<slug>/. Returns the slug. */
export function keepInLibrary(
  spec: GameSpec,
  code: string,
  thumb: Buffer | null,
  runId: string,
  creator?: GameCreator | null,
  uniqueSuffix?: string,
): string {
  // Newly published games use the run ID so separate cabinets cannot collide.
  // Historical single-mode entries retain their player-count suffix.
  const base = `${slugify(spec.title)}${uniqueSuffix ? `-${uniqueSuffix}` : spec.players === 2 ? '-2p' : ''}`
  let slug = base
  for (let i = 2; existsSync(resolve(GAMES_DIR, slug)); i++) slug = `${base}-${i}`
  const dir = resolve(GAMES_DIR, slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'game.js'), code)
  writeFileSync(
    resolve(dir, 'spec.json'),
    JSON.stringify(
      { ...spec, runId, creator, supportedPlayers: uniqueSuffix ? [1, 2] : [spec.players] },
      null,
      2,
    ),
  )
  if (thumb) writeFileSync(resolve(dir, 'thumb.png'), thumb)
  queueComponentIndex(
    {
      code,
      sourcePath: resolve(dir, 'game.js'),
      metadata: { spec, runId, collection: 'library/games' },
    },
    resolve(ROOT, 'data/catalog.sqlite'),
    resolve(ROOT, 'data/components'),
  )
  return slug
}
