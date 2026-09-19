// The PICO-8 palette. Fixed forever: games, templates and the prompt all
// reference colours by index, so changing an entry changes every game.
export const PALETTE_HEX = [
  '#000000', // 0 black
  '#1d2b53', // 1 dark blue
  '#7e2553', // 2 dark purple
  '#008751', // 3 dark green
  '#ab5236', // 4 brown
  '#5f574f', // 5 dark grey
  '#c2c3c7', // 6 light grey
  '#fff1e8', // 7 white
  '#ff004d', // 8 red
  '#ffa300', // 9 orange
  '#ffec27', // 10 yellow
  '#00e436', // 11 green
  '#29adff', // 12 blue
  '#83769c', // 13 lavender
  '#ff77a8', // 14 pink
  '#ffccaa', // 15 peach
] as const

// Packed little-endian RGBA (as the canvas ImageData buffer expects).
export const PALETTE_ABGR: Uint32Array = new Uint32Array(
  PALETTE_HEX.map((hex) => {
    const r = Number.parseInt(hex.slice(1, 3), 16)
    const g = Number.parseInt(hex.slice(3, 5), 16)
    const b = Number.parseInt(hex.slice(5, 7), 16)
    return (0xff << 24) | (b << 16) | (g << 8) | r
  }),
)

/** Coerce anything a game passes as a colour into a palette index 0..15. */
export function col(c: unknown, fallback = 7): number {
  const n = typeof c === 'number' ? c : Number(c)
  if (!Number.isFinite(n)) return fallback
  return (((n | 0) % 16) + 16) % 16
}
