import { readFileSync, realpathSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { Script } from 'node:vm'
import { assembleCatalog, type CatalogPart, loadCatalog } from './catalog.ts'
import { type GameSpec, GameSpecSchema, type Players } from './spec.ts'

export interface DemoSummary {
  id: string
  revision: string
  title: string
  description: string
  players: Players[]
  genre: string
}
export interface DemoGame extends DemoSummary {
  code: string
  spec: GameSpec
}

const preferred = [
  'kart',
  'fighter',
  'sonic-speed-reference',
  'batman-atari-fighter-reference',
  'spider-man-fighter-reference',
  'dk-climber-reference',
  'pac-man-maze-reference',
  'pole-position-racer-reference',
]
const validId = (id: string) => id.length <= 80 && /^[a-z][a-z0-9-]*$/.test(id)

function file(part: CatalogPart, name: 'spec' | 'demo'): string {
  const filename = part.manifest[name] ?? `${name}.${name === 'spec' ? 'json' : 'js'}`
  if (typeof filename !== 'string') throw new Error('Invalid demo file')
  const path = realpathSync(resolve(part.dir, filename))
  if (!path.startsWith(`${realpathSync(part.dir)}${sep}`) || !statSync(path).isFile())
    throw new Error('Demo file escapes catalog pack')
  return path
}

function metadata(part: CatalogPart): { summary: DemoSummary; spec: GameSpec } | null {
  if (part.status !== 'verified' || !validId(part.manifest.id)) return null
  try {
    // Listing reads metadata only. Code is assembled only for the selected game.
    file(part, 'demo')
    const raw = JSON.parse(readFileSync(file(part, 'spec'), 'utf8'))
    // Older authored specs omit unused buttons; preserve their meaning as null.
    const spec = GameSpecSchema.parse({
      ...raw,
      controls: {
        left: null,
        right: null,
        up: null,
        down: null,
        a: null,
        b: null,
        ...raw.controls,
      },
    })
    return {
      summary: {
        id: part.manifest.id,
        revision: part.hash,
        title: spec.title,
        description: spec.oneLiner,
        players: [...new Set(part.manifest.supportsPlayers)],
        genre: spec.genre,
      },
      spec: { ...spec, players: part.manifest.supportsPlayers[0]! },
    }
  } catch {
    return null
  }
}

/** Fresh catalog admission on every request excludes stale packs and generated samples. */
export function listDemos(parts = loadCatalog()): DemoSummary[] {
  return parts
    .flatMap((part) => {
      const value = metadata(part)
      return value ? [value.summary] : []
    })
    .sort((a, b) => {
      const rank = (id: string) =>
        preferred.includes(id) ? preferred.indexOf(id) : preferred.length
      return rank(a.id) - rank(b.id) || a.title.localeCompare(b.title)
    })
}

export function loadDemo(id: string, players: Players = 1, parts?: CatalogPart[]): DemoGame | null {
  if (!validId(id) || (players !== 1 && players !== 2)) return null
  const part = (parts ?? loadCatalog()).find((candidate) => candidate.manifest.id === id)
  if (!part?.manifest.supportsPlayers.includes(players)) return null
  const value = metadata(part)
  if (!value) return null
  try {
    const source = readFileSync(file(part, 'demo'), 'utf8')
    const code = assembleCatalog(source, { parts: [part], text: '', hash: part.hash })
    new Script(code, { filename: `demo-${id}.js` })
    return { ...value.summary, code, spec: { ...value.spec, players } }
  } catch {
    return null
  }
}
