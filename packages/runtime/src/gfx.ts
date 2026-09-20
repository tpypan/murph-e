import { GLYPH_W, GLYPHS } from './font'
import { col, spritePaletteTokens, tokenABGR, tokenPaletteIndex } from './palette'

export const W = 256
export const H = 224

export type Sprite = readonly string[] | string

interface ParsedSprite {
  w: number
  h: number
  px: Uint8Array // 255 = transparent
  maxIndex: number
}

function parseSprite(sprite: Sprite): ParsedSprite {
  const rows = (typeof sprite === 'string' ? sprite.split('\n') : sprite)
    .map((r) => String(r).trim())
    .filter((r) => r.length > 0)
  const h = rows.length
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0)
  const px = new Uint8Array(w * h).fill(255)
  let maxIndex = -1
  for (let y = 0; y < h; y++) {
    const row = rows[y] ?? ''
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] ?? '.'
      const v = Number.parseInt(ch, 16)
      if (Number.isFinite(v)) {
        px[y * w + x] = v & 15
        maxIndex = Math.max(maxIndex, v & 15)
      }
    }
  }
  return { w, h, px, maxIndex }
}

/**
 * A framebuffer of legacy palette indices or canonical RGB tokens. Every drawing
 * call is clipped. The framebuffer is the source of truth: the canvas is
 * only a view of it, and the probe hashes it directly.
 */
export class Screen {
  readonly fb = new Uint32Array(W * H)
  private readonly objCache = new WeakMap<object, ParsedSprite>()
  private readonly strCache = new Map<string, ParsedSprite>()
  private readonly paletteCache = new WeakMap<object, Uint32Array>()

  cls(c: unknown = 0): void {
    this.fb.fill(col(c, 0))
  }

  pset(x: number, y: number, c: unknown): void {
    const xi = x | 0
    const yi = y | 0
    if (xi < 0 || yi < 0 || xi >= W || yi >= H) return
    this.fb[yi * W + xi] = col(c)
  }

  pget(x: number, y: number): number {
    const xi = x | 0
    const yi = y | 0
    if (xi < 0 || yi < 0 || xi >= W || yi >= H) return 0
    return tokenPaletteIndex(this.fb[yi * W + xi] ?? 0)
  }

  line(x0: number, y0: number, x1: number, y1: number, c: unknown): void {
    let ax = x0 | 0
    let ay = y0 | 0
    const bx = x1 | 0
    const by = y1 | 0
    const dx = Math.abs(bx - ax)
    const dy = -Math.abs(by - ay)
    const sx = ax < bx ? 1 : -1
    const sy = ay < by ? 1 : -1
    let err = dx + dy
    const ci = col(c)
    for (let guard = 0; guard < 4096; guard++) {
      if (ax >= 0 && ay >= 0 && ax < W && ay < H) this.fb[ay * W + ax] = ci
      if (ax === bx && ay === by) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        ax += sx
      }
      if (e2 <= dx) {
        err += dx
        ay += sy
      }
    }
  }

  hline(x0: number, x1: number, y: number, ci: number): void {
    const yi = y | 0
    if (yi < 0 || yi >= H) return
    let a = Math.max(0, Math.min(x0, x1) | 0)
    const b = Math.min(W - 1, Math.max(x0, x1) | 0)
    const base = yi * W
    for (; a <= b; a++) this.fb[base + a] = ci
  }

  rect(x: number, y: number, w: number, h: number, c: unknown): void {
    const xi = x | 0
    const yi = y | 0
    const wi = w | 0
    const hi = h | 0
    if (wi <= 0 || hi <= 0) return
    const ci = col(c)
    this.hline(xi, xi + wi - 1, yi, ci)
    this.hline(xi, xi + wi - 1, yi + hi - 1, ci)
    for (let yy = yi + 1; yy < yi + hi - 1; yy++) {
      if (yy < 0 || yy >= H) continue
      if (xi >= 0 && xi < W) this.fb[yy * W + xi] = ci
      const xr = xi + wi - 1
      if (xr >= 0 && xr < W) this.fb[yy * W + xr] = ci
    }
  }

  rectfill(x: number, y: number, w: number, h: number, c: unknown): void {
    const xi = x | 0
    const yi = y | 0
    const wi = w | 0
    const hi = h | 0
    if (wi <= 0 || hi <= 0) return
    const ci = col(c)
    const y0 = Math.max(0, yi)
    const y1 = Math.min(H, yi + hi)
    const x0 = Math.max(0, xi)
    const x1 = Math.min(W, xi + wi)
    if (x0 >= x1) return
    for (let yy = y0; yy < y1; yy++) this.fb.fill(ci, yy * W + x0, yy * W + x1)
  }

  circ(x: number, y: number, r: number, c: unknown): void {
    const cx = x | 0
    const cy = y | 0
    let rr = Math.abs(r | 0)
    if (rr === 0) {
      this.pset(cx, cy, c)
      return
    }
    const ci = col(c)
    let px = rr
    let py = 0
    let err = 1 - rr
    while (px >= py) {
      this.plot8(cx, cy, px, py, ci)
      py++
      if (err < 0) err += 2 * py + 1
      else {
        px--
        err += 2 * (py - px) + 1
      }
    }
    rr = 0
  }

  private plot8(cx: number, cy: number, px: number, py: number, ci: number): void {
    const pts = [
      [cx + px, cy + py],
      [cx - px, cy + py],
      [cx + px, cy - py],
      [cx - px, cy - py],
      [cx + py, cy + px],
      [cx - py, cy + px],
      [cx + py, cy - px],
      [cx - py, cy - px],
    ]
    for (const [ax, ay] of pts) {
      if (ax! >= 0 && ay! >= 0 && ax! < W && ay! < H) this.fb[ay! * W + ax!] = ci
    }
  }

  circfill(x: number, y: number, r: number, c: unknown): void {
    const cx = x | 0
    const cy = y | 0
    const rr = Math.abs(r | 0)
    const ci = col(c)
    if (rr === 0) {
      this.pset(cx, cy, c)
      return
    }
    for (let dy = -rr; dy <= rr; dy++) {
      const dx = Math.floor(Math.sqrt(rr * rr - dy * dy))
      this.hline(cx - dx, cx + dx, cy + dy, ci)
    }
  }

  private parsed(sprite: Sprite): ParsedSprite | null {
    if (typeof sprite === 'string') {
      let p = this.strCache.get(sprite)
      if (!p) {
        p = parseSprite(sprite)
        if (this.strCache.size > 512) this.strCache.clear()
        this.strCache.set(sprite, p)
      }
      return p
    }
    if (!Array.isArray(sprite)) return null
    let p = this.objCache.get(sprite)
    if (!p) {
      p = parseSprite(sprite)
      this.objCache.set(sprite, p)
    }
    return p
  }

  spr(
    sprite: Sprite,
    x: number,
    y: number,
    flipX = false,
    flipY = false,
    colors?: readonly string[],
  ): void {
    let palette: Uint32Array | undefined
    if (colors !== undefined) {
      // Validation handles nonarrays before they can become WeakMap keys.
      palette = Array.isArray(colors) ? this.paletteCache.get(colors) : undefined
      if (!palette) {
        palette = spritePaletteTokens(colors)
        this.paletteCache.set(colors, palette)
      }
    }
    const p = this.parsed(sprite)
    if (p && palette && p.maxIndex >= palette.length)
      throw new Error(
        `Sprite pixel index ${p.maxIndex.toString(16)} has no color in its ${palette.length}-entry palette`,
      )
    if (!p || p.w === 0 || p.h === 0) return
    const xi = x | 0
    const yi = y | 0
    for (let sy = 0; sy < p.h; sy++) {
      const dy = yi + sy
      if (dy < 0 || dy >= H) continue
      const srcY = flipY ? p.h - 1 - sy : sy
      for (let sx = 0; sx < p.w; sx++) {
        const dx = xi + sx
        if (dx < 0 || dx >= W) continue
        const srcX = flipX ? p.w - 1 - sx : sx
        const v = p.px[srcY * p.w + srcX]
        if (v !== 255 && v !== undefined) this.fb[dy * W + dx] = palette ? palette[v]! : v
      }
    }
  }

  spriteSize(sprite: Sprite): { w: number; h: number } {
    const p = this.parsed(sprite)
    return p ? { w: p.w, h: p.h } : { w: 0, h: 0 }
  }

  textWidth(str: unknown, scale = 1): number {
    return String(str).length * GLYPH_W * scale
  }

  text(str: unknown, x: number, y: number, c: unknown, scale = 1): void {
    const s = String(str ?? '').toUpperCase()
    const ci = col(c)
    const sc = Math.max(1, scale | 0)
    let cx = x | 0
    const cy = y | 0
    for (const ch of s) {
      const bits = GLYPHS.get(ch) ?? GLYPHS.get('?')!
      for (let r = 0; r < 7; r++) {
        const mask = bits[r] ?? 0
        if (mask === 0) continue
        for (let cc = 0; cc < 7; cc++) {
          if (mask & (1 << (6 - cc))) {
            if (sc === 1) {
              const px = cx + cc
              const py = cy + r
              if (px >= 0 && py >= 0 && px < W && py < H) this.fb[py * W + px] = ci
            } else {
              this.rectfill(cx + cc * sc, cy + r * sc, sc, sc, ci)
            }
          }
        }
      }
      cx += GLYPH_W * sc
    }
  }

  textCenter(str: unknown, y: number, c: unknown, scale = 1): void {
    const w = this.textWidth(str, scale)
    this.text(str, ((W - w) / 2) | 0, y, c, scale)
  }

  /** FNV-1a: legacy indices retain their byte hash; custom pixels feed 255,R,G,B. */
  hash(fromRow = 0): string {
    let h = 0x811c9dc5
    const fb = this.fb
    for (let i = Math.max(0, fromRow | 0) * W; i < fb.length; i++) {
      const token = fb[i]!
      if (token < 16) {
        h = Math.imul(h ^ token, 0x01000193)
      } else {
        h = Math.imul(h ^ 255, 0x01000193)
        h = Math.imul(h ^ ((token >>> 16) & 255), 0x01000193)
        h = Math.imul(h ^ ((token >>> 8) & 255), 0x01000193)
        h = Math.imul(h ^ (token & 255), 0x01000193)
      }
    }
    return (h >>> 0).toString(16).padStart(8, '0')
  }

  /** Visible color count; dominant is a legacy index or RGB token, lowest wins ties. */
  stats(): { colors: number; dominant: number; dominantShare: number } {
    const counts = new Map<number, number>()
    for (const token of this.fb) counts.set(token, (counts.get(token) ?? 0) + 1)
    let dominant = 0
    let count = 0
    for (const [token, amount] of counts) {
      if (amount > count || (amount === count && token < dominant)) {
        dominant = token
        count = amount
      }
    }
    return { colors: counts.size, dominant, dominantShare: count / this.fb.length }
  }

  /** Copy the framebuffer into an RGBA ImageData buffer. */
  blit(target: Uint32Array): void {
    const fb = this.fb
    for (let i = 0; i < fb.length; i++) target[i] = tokenABGR(fb[i]!)
  }
}
