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

/** Opaque custom RGB tokens are distinct from the original indices 0..15. */
export const RGB_TOKEN = 0x01000000
const PALETTE_RGB = PALETTE_HEX.map((hex) => Number.parseInt(hex.slice(1), 16))

/** Validate and snapshot a sprite palette. The caller caches by array identity. */
export function spritePaletteTokens(colors: unknown): Uint32Array {
  if (!Array.isArray(colors) || colors.length < 1 || colors.length > 16)
    throw new Error('Sprite palette must be an array of 1–16 #RRGGBB colors')
  return Uint32Array.from(colors, (hex, index) => {
    if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex))
      throw new Error(`Sprite palette color ${index} must be a complete #RRGGBB string`)
    const rgb = Number.parseInt(hex.slice(1), 16)
    const legacy = PALETTE_RGB.indexOf(rgb)
    return legacy >= 0 ? legacy : RGB_TOKEN | rgb
  })
}

/** Resolve a canonical framebuffer token to the canvas's packed RGBA format. */
export function tokenABGR(token: number): number {
  if (token < 16) return PALETTE_ABGR[token]!
  return (0xff000000 | ((token & 255) << 16) | (token & 0xff00) | ((token >>> 16) & 255)) >>> 0
}

/** Compatibility readback: custom RGB projects to the nearest fixed PICO color. */
export function tokenPaletteIndex(token: number): number {
  if (token < 16) return token
  const r = (token >>> 16) & 255,
    g = (token >>> 8) & 255,
    b = token & 255
  let nearest = 0,
    distance = Number.POSITIVE_INFINITY
  for (let i = 0; i < PALETTE_RGB.length; i++) {
    const rgb = PALETTE_RGB[i]!
    const d =
      (r - ((rgb >>> 16) & 255)) ** 2 + (g - ((rgb >>> 8) & 255)) ** 2 + (b - (rgb & 255)) ** 2
    if (d < distance) {
      distance = d
      nearest = i
    }
  }
  return nearest
}
