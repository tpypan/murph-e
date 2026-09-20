import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT, readRepoFile } from './env.ts'
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
      const spec: GameSpec | null = existsSync(specPath)
        ? JSON.parse(readFileSync(specPath, 'utf8'))
        : null
      return {
        slug,
        title: spec?.title ?? slug.toUpperCase(),
        genre: spec?.genre ?? '',
        players: spec?.players ?? 1,
        code,
        spec,
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
    source: 'template',
  }
}

/** Copy a passing game into library/games/<slug>/. Returns the slug. */
export function keepInLibrary(
  spec: GameSpec,
  code: string,
  thumb: Buffer | null,
  runId: string,
): string {
  // The cabinet keeps a 1P and a 2P version of every idea; the suffix keeps
  // their slugs (and so their leaderboards) apart.
  const base = `${slugify(spec.title)}${spec.players === 2 ? '-2p' : ''}`
  let slug = base
  for (let i = 2; existsSync(resolve(GAMES_DIR, slug)); i++) slug = `${base}-${i}`
  const dir = resolve(GAMES_DIR, slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'game.js'), code)
  writeFileSync(resolve(dir, 'spec.json'), JSON.stringify({ ...spec, runId }, null, 2))
  if (thumb) writeFileSync(resolve(dir, 'thumb.png'), thumb)
  return slug
}
