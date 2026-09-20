import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT } from './env.ts'

// The leaderboard. One JSON file, appended to on every game over, read on
// every board. Keyed by badge id when a badge was plugged in; guests are
// kept too, unnamed. Small enough that "load, filter, sort" is the whole
// query engine.

export interface ScoreEntry {
  id: string
  badgeId: string | null
  name: string
  score: number
  players: number
  game: { slug: string; title: string }
  at: string // ISO time
}

export interface ScoreInput {
  id?: string
  at?: string
  badgeId?: string | null
  name?: string | null
  score: number
  players?: number
  game: { slug: string; title: string }
}

export const GUEST = 'GUEST'
const DEFAULT_FILE = process.env.HTN_SCORE_FILE || resolve(ROOT, 'data/scores.json')

interface Store {
  entries: ScoreEntry[]
}

function load(file: string): Store {
  if (!existsSync(file)) return { entries: [] }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<Store>
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] }
  } catch {
    // A half-written or corrupt file must not take the cabinet down.
    return { entries: [] }
  }
}

function save(file: string, store: Store): void {
  mkdirSync(resolve(file, '..'), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(store, null, 2))
  renameSync(tmp, file)
}

/** Record one player's result. Returns the stored entry. */
export function addScore(input: ScoreInput, file = DEFAULT_FILE): ScoreEntry {
  const store = load(file)
  const previous = input.id ? store.entries.find((e) => e.id === input.id) : undefined
  if (previous) return previous
  const entry: ScoreEntry = {
    id: input.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    badgeId: input.badgeId || null,
    name: (input.badgeId && input.name?.trim()) || GUEST,
    score: Math.max(0, Math.floor(Number(input.score) || 0)),
    players: input.players === 2 ? 2 : 1,
    game: { slug: String(input.game.slug), title: String(input.game.title) },
    at: input.at ?? new Date().toISOString(),
  }
  store.entries.push(entry)
  save(file, store)
  return entry
}

export interface TopOptions {
  /** Only this game's entries. */
  game?: string
  limit?: number
  file?: string
}

/**
 * Best score per (badge, game), highest first. Every guest entry is its own
 * row: there is no way to tell two guests apart, and nobody should lose a
 * score because they did not plug in.
 */
export function topScores(opts: TopOptions = {}): ScoreEntry[] {
  const limit = opts.limit ?? 10
  const all = load(opts.file ?? DEFAULT_FILE).entries.filter(
    (e) => !opts.game || e.game.slug === opts.game,
  )
  const best = new Map<string, ScoreEntry>()
  for (const e of all) {
    const key = e.badgeId ? `${e.badgeId}\u0000${e.game.slug}` : e.id
    const prev = best.get(key)
    if (!prev || e.score > prev.score) best.set(key, e)
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.at.localeCompare(b.at))
    .slice(0, limit)
}

export function allScores(file = DEFAULT_FILE): ScoreEntry[] {
  return load(file).entries.slice()
}
