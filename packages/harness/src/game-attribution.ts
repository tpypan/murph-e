import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT } from './env.ts'

export interface GameCreator {
  name: string
  badgeId: string | null
  attribution?: 'manual' | 'badge'
}

interface Attribution {
  kind: 'catalog' | 'library'
  id: string
  title: string
  creatorName: string
}

/** Product-level names are kept outside hash-verified game/asset source files. */
export function loadGameAttributions(
  path = resolve(ROOT, 'library/creator-attributions.json'),
): Attribution[] {
  if (!existsSync(path)) return []
  const data = JSON.parse(readFileSync(path, 'utf8'))
  if (data.version !== 1 || data.attribution !== 'manual' || !Array.isArray(data.assignments))
    throw new Error('Invalid game creator attribution file')
  const keys = new Set<string>()
  for (const row of data.assignments) {
    const key = `${row.kind}:${row.id}`
    if (
      !['catalog', 'library'].includes(row.kind) ||
      typeof row.id !== 'string' ||
      !row.id ||
      typeof row.title !== 'string' ||
      typeof row.creatorName !== 'string' ||
      !row.creatorName.trim() ||
      keys.has(key)
    )
      throw new Error('Invalid or duplicate game creator attribution')
    keys.add(key)
  }
  return data.assignments
}

export function assignedCreator(
  kind: Attribution['kind'],
  id: string,
  assignments = loadGameAttributions(),
): GameCreator | null {
  const entry = assignments.find((row) => row.kind === kind && row.id === id)
  return entry ? { name: entry.creatorName, badgeId: null, attribution: 'manual' } : null
}

export function assignedTitle(
  kind: Attribution['kind'],
  id: string,
  fallback: string,
  assignments = loadGameAttributions(),
): string {
  return assignments.find((row) => row.kind === kind && row.id === id)?.title || fallback
}

/** Saved player identity takes precedence over manual backfills. */
export function gameCreator(
  kind: Attribution['kind'],
  id: string,
  saved?: GameCreator | null,
): GameCreator {
  if (saved?.name?.trim()) return { ...saved, name: saved.name.trim() }
  return assignedCreator(kind, id) ?? { name: 'GUEST', badgeId: null }
}
