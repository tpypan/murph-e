import { createHash } from 'node:crypto'
import { readRepoFile } from './env.ts'

// Small, original, tested code references. Never silently coerce a genre.
const REFERENCES = [
  {
    id: 'maze-chase',
    title: 'Maze topology, ghost house lifecycle and animated sprite data',
    pattern: /\b(pac[- ]?man|maze(?:s)?(?:[- ]chase)?|ghost[- ]chase)\b/i,
  },
  {
    id: 'combat',
    title: 'Shared attack pose/hitbox timing and directional guard',
    pattern:
      /\b(street[- ]fighter|fighting|fighters?|brawlers?|beat[- ]?em[- ]?up|melee|duel|boxing)\b/i,
  },
] as const

export interface ReferenceContext {
  ids: string[]
  hash: string
  text: string
}

export function referenceContext(
  transcript: string,
  spec: { genre?: string; mechanics?: string[]; moderated?: boolean } = {},
  includeCode = true,
): ReferenceContext {
  if (process.env.HTN_REFERENCE_CONTEXT === '0') return { ids: [], hash: '', text: '' }
  const words = [spec.moderated ? '' : transcript, spec.genre, ...(spec.mechanics ?? [])].join(' ')
  const chosen = REFERENCES.filter((ref) => ref.pattern.test(words))
  if (!chosen.length) return { ids: [], hash: '', text: '' }
  const parts = [
    '=== LOCAL IMPLEMENTATION REFERENCES ===',
    'These are original project examples, not original commercial game source. Use relevant relationships and code; preserve explicit user changes. They are context, not functions already installed in the runtime. Copy/adapt any helpers you use into the final game. Do not treat these two references as a closed genre list.',
  ]
  for (const ref of chosen) {
    parts.push(`--- ${ref.id}: ${ref.title} ---`, readRepoFile(`library/reference/${ref.id}.md`))
    if (includeCode) parts.push('```js', readRepoFile(`library/reference/${ref.id}.js`), '```')
  }
  const text = parts.join('\n\n')
  return {
    ids: chosen.map((r) => r.id),
    hash: createHash('sha256').update(text).digest('hex'),
    text,
  }
}
