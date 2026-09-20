// Canonical procedural sound assets. Runtime playback and SQLite indexing share these recipes.

export type Wave = 'square' | 'triangle' | 'saw' | 'noise'
export const SFX_NAMES = [
  'jump',
  'hit',
  'coin',
  'explode',
  'select',
  'die',
  'powerup',
  'shoot',
] as const
export type SfxName = (typeof SFX_NAMES)[number]

export interface SfxNote {
  wave: Wave
  f?: number
  to?: number
  ms: number
  delay?: number
  vol?: number
}

export const SFX_BANK: Record<SfxName, readonly SfxNote[]> = {
  jump: [{ wave: 'square', f: 260, to: 720, ms: 120 }],
  hit: [
    { wave: 'saw', f: 220, to: 60, ms: 150 },
    { wave: 'noise', ms: 80, vol: 0.4 },
  ],
  coin: [
    { wave: 'square', f: 988, ms: 70 },
    { wave: 'square', f: 1319, ms: 220, delay: 70 },
  ],
  explode: [
    { wave: 'noise', ms: 450 },
    { wave: 'saw', f: 120, to: 30, ms: 400, vol: 0.5 },
  ],
  select: [{ wave: 'square', f: 660, ms: 50 }],
  die: [
    { wave: 'saw', f: 440, to: 40, ms: 600 },
    { wave: 'noise', ms: 300, delay: 120, vol: 0.5 },
  ],
  powerup: [
    { wave: 'triangle', f: 440, to: 880, ms: 120 },
    { wave: 'triangle', f: 880, to: 1760, ms: 220, delay: 120 },
  ],
  shoot: [{ wave: 'square', f: 900, to: 200, ms: 90 }],
}

export const SFX_EVENTS: Record<SfxName, string> = {
  jump: 'jump, hop or movement burst',
  hit: 'impact, damage, paddle or brick contact',
  coin: 'pickup, point, lap or reward',
  explode: 'explosion or enemy destruction',
  select: 'selection, placement or rotation',
  die: 'life lost or defeat',
  powerup: 'power-up, boost or major success',
  shoot: 'shot, launch or hard drop',
}
