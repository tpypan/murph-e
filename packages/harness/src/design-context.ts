import { createHash } from 'node:crypto'
import { z } from 'zod'
import { readRepoFile } from './env.ts'
import type { Run } from './run-store.ts'

const BASE = 'docs/research/arcade-context'
export const MAX_CONTEXT_CARDS = 4
export const MAX_CONTEXT_CHARS = 9000

const ManifestSchema = z.object({
  version: z.number().int().positive(),
  core: z.string(),
  sources: z.array(z.object({ id: z.string(), url: z.string().url() })),
  cards: z
    .array(
      z.object({
        id: z.string(),
        version: z.number().int().positive(),
        path: z.string(),
        title: z.string(),
        tags: z.array(z.string()),
        sources: z.array(z.string()),
      }),
    )
    .min(1),
})

const hash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)
// Research stays linked in the manifest/run record; URLs waste prompt space
// and must not imply that this tool-free generation call visited the source.
const promptText = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
function readContextFile(path: string): string {
  if (!/^(?:cards\/)?[a-z0-9-]+\.md$/.test(path))
    throw new Error(`invalid design context path: ${path}`)
  return readRepoFile(`${BASE}/${path}`)
}

// Card IDs/contracts are stable per process; reread the small core for each prompt
// so corrections take effect without restarting a cabinet attached to USB badges.
const manifest = ManifestSchema.parse(JSON.parse(readRepoFile(`${BASE}/manifest.json`)))
const readCore = () => promptText(readContextFile(manifest.core))
const sources = new Map(manifest.sources.map((s) => [s.id, s.url]))
const cards = manifest.cards.map((card) => {
  for (const source of card.sources)
    if (!sources.has(source)) throw new Error(`unknown design source: ${source}`)
  const text = promptText(readContextFile(card.path))
  return { ...card, text, hash: hash(text) }
})
if (new Set(cards.map((c) => c.id)).size !== cards.length)
  throw new Error('duplicate design context card ID')
export const DESIGN_CARD_IDS = cards.map((c) => c.id) as [string, ...string[]]
const cardById = new Map(cards.map((c) => [c.id, c]))

export const designContextEnabled = () => process.env.HTN_DESIGN_CONTEXT !== '0'

export function designCore(): string {
  if (!designContextEnabled()) return ''
  return [
    '=== ARCADE DESIGN CONTRACT ===',
    readCore(),
    '',
    'Apply supplied design cards only where they fit the requested mechanics. They are reference guidance, not new runtime APIs. This call has no browsing, image retrieval or human reviewer. Any local implementation reference explicitly supplied in the prompt is available as text only; no external assets or helpers are installed implicitly. Do not claim a lookup, visual approval or test you did not perform. Preserve explicit user changes; do not add mechanics merely because a card describes them. Follow the required output format for this stage.',
  ].join('\n')
}

export function designCatalogue(): string {
  if (!designContextEnabled()) return 'Set designCards to an empty array.'
  return [
    'Select up to four designCards for the actual mechanics you specify. Use the exact IDs below. These select local guidance for the builder; no extra agent call is made. Prefer the signature mechanic, then its supporting rules. The preliminary cards in the input are hints, not a genre decision.',
    ...cards.map((c) => `- ${c.id}: ${c.title} (${c.tags.join(', ')})`),
  ].join('\n')
}

type ContextSpec = {
  genre?: string
  title?: string
  oneLiner?: string
  mechanics?: string[]
  changes?: string[]
  designCards?: string[]
  moderated?: boolean
}

export interface DesignContext {
  enabled: boolean
  version: number
  coreHash: string
  hash: string
  cards: Array<{ id: string; version: number; hash: string; reasons: string[] }>
  sources: Array<{ id: string; url: string }>
  characters: number
  text: string
}

// Backstops for explicit mechanics; the spec model handles semantic choices
// (including unfamiliar named characters) through its structured designCards.
const SIGNALS: Array<[string, RegExp, number]> = [
  ['swing-grapple', /\b(swing(?:s|ing)?|grappl(?:e|es|ing)|ropes?|vines?|web[- ]sling\w*)\b/i, 100],
  ['ball-paddle', /\b(pong|breakout|paddles?|pinball)\b/i, 95],
  ['grid-movement', /\b(snakes?|mazes?|pac[- ]?man|grid)\b/i, 95],
  [
    'projectiles',
    /\b(shoot(?:s|ing|er)?|bullets?|projectiles?|fireballs?|volleys|shmup|space invaders)\b/i,
    90,
  ],
  ['platforming', /\b(jump(?:s|ing)?|platformer|flap(?:s|ping|py)?|hopp?ing)\b/i, 90],
  ['collision', /\b(moving platforms?|lifts?|collisions?|drop[- ]through)\b/i, 85],
  ['camera', /\b(scroll\w*|runner|running|camera)\b/i, 45],
  ['layouts', /\b(gaps?|rooftops?|buildings?|reachable|procedural)\b/i, 45],
  ['enemy-roles', /\b(chas\w*|ambush\w*|ghosts?|intercept\w*)\b/i, 45],
  ['scoring', /\b(combos?|scores?|collect\w*|multiplier\w*)\b/i, 35],
  ['pacing', /\b(waves?|harder|faster|difficult\w*|survival)\b/i, 35],
  [
    'reference-identity',
    /\b(batman|benji|mario|sonic|spider[- ]?man|pac[- ]?man|named character|based on|inspired by)\b/i,
    45,
  ],
]

const GENRE_CARDS: Record<string, string[]> = {
  platformer: ['platforming', 'collision', 'layouts'],
  runner: ['platforming', 'layouts', 'camera'],
  flappy: ['platforming', 'layouts', 'camera'],
  shooter: ['projectiles', 'pacing'],
  dodge: ['pacing', 'scoring'],
  snake: ['grid-movement', 'scoring'],
  breakout: ['ball-paddle', 'scoring'],
  pong: ['ball-paddle', 'scoring'],
  versus: ['scoring', 'pacing'],
  coop: ['enemy-roles', 'pacing'],
}

export function selectDesignContext(
  transcript: string,
  spec: ContextSpec = {},
  stage: 'spec' | 'build' = 'build',
): DesignContext {
  const core = readCore()
  const ranked = new Map<string, { score: number; reasons: string[] }>()
  const offer = (id: string, score: number, reason: string) => {
    if (!cardById.has(id)) return
    const old = ranked.get(id)
    ranked.set(id, {
      score: Math.max(old?.score ?? 0, score),
      reasons: [...(old?.reasons ?? []), reason],
    })
  }
  const enabled = designContextEnabled()
  if (enabled) {
    // A moderated replacement must not inherit the original request's mechanics.
    const words = stage === 'build' && spec.moderated ? '' : transcript
    for (const [id, pattern, score] of SIGNALS)
      if (pattern.test(words)) offer(id, score, 'transcript')
    // Before specification, a current game's data is only a low-weight hint:
    // a new premise spoken over it must be able to choose different mechanics.
    if (stage === 'build') {
      for (const [i, id] of (spec.designCards ?? []).entries()) offer(id, 80 - i, 'spec selection')
      const mechanics = (spec.mechanics ?? []).concat(spec.changes ?? []).join(' ')
      for (const [id, pattern, score] of SIGNALS)
        if (pattern.test(mechanics)) offer(id, score - 25, 'spec mechanics')
    }
    for (const [i, id] of (GENRE_CARDS[spec.genre ?? ''] ?? []).entries())
      offer(id, (stage === 'build' ? 30 : 15) - i, 'genre')
    for (const [i, id] of ['readability', 'scoring', 'pacing', 'onboarding'].entries())
      offer(id, 10 - i, 'default')
  }
  const candidates = [...ranked.entries()].sort(
    (a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]),
  )
  const selected: DesignContext['cards'] = []
  const sections: string[] = []
  const sourceIds = new Set<string>()
  const heading = '=== SELECTED ARCADE DESIGN GUIDANCE ==='
  let size = core.length + heading.length + 2
  for (const [id, rank] of candidates) {
    if (selected.length >= MAX_CONTEXT_CARDS) break
    const card = cardById.get(id)!
    const section = `--- ${id} v${card.version} ---\n${card.text}`
    if (size + section.length + 2 > MAX_CONTEXT_CHARS) continue
    sections.push(section)
    size += section.length + 2
    selected.push({ id, version: card.version, hash: card.hash, reasons: rank.reasons })
    for (const source of card.sources) sourceIds.add(source)
  }
  const text = enabled ? [heading, ...sections].join('\n\n') : ''
  return {
    enabled,
    version: manifest.version,
    coreHash: enabled ? hash(core) : '',
    hash: hash(enabled ? `${core}\n${text}` : ''),
    cards: selected,
    sources: [...sourceIds].sort().map((id) => ({ id, url: sources.get(id)! })),
    characters: enabled ? core.length + text.length : 0,
    text,
  }
}

export function recordDesignContext(run: Run, stage: 'spec' | 'build', context: DesignContext) {
  run.write(`context-${stage}.json`, JSON.stringify(context, null, 2))
  run.event('design-context', {
    stage,
    hash: context.hash,
    cards: context.cards.map((c) => c.id),
    characters: context.characters,
  })
}
