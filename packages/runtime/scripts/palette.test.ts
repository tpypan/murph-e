import assert from 'node:assert/strict'
import { test } from 'node:test'
import { H, Screen, W } from '../src/gfx.ts'
import {
  PALETTE_ABGR,
  PALETTE_HEX,
  RGB_TOKEN,
  spritePaletteTokens,
  tokenPaletteIndex,
} from '../src/palette.ts'
import { Runtime } from '../src/runtime.ts'

const packed = (hex: string) => {
  const rgb = Number.parseInt(hex.slice(1), 16)
  return (0xff000000 | ((rgb & 255) << 16) | (rgb & 0xff00) | (rgb >>> 16)) >>> 0
}
const rgba = (screen: Screen) => {
  const bytes = new Uint32Array(W * H)
  screen.blit(bytes)
  return bytes
}
const pixel = (screen: Screen, x: number, y: number) => screen.fb[y * W + x]!

test('the complete default palette preserves framebuffer indices, RGBA and legacy byte hashes', () => {
  const plain = new Screen(),
    explicit = new Screen()
  const rows = ['0123456789abcdef']
  plain.spr(rows, 3, 20)
  explicit.spr(rows, 3, 20, false, false, PALETTE_HEX)
  assert.deepEqual(explicit.fb, plain.fb)
  assert.deepEqual(rgba(explicit), rgba(plain))
  assert.equal(explicit.hash(), plain.hash())
  let reference = 0x811c9dc5
  for (const value of plain.fb) reference = Math.imul(reference ^ value, 0x01000193)
  assert.equal(plain.hash(), (reference >>> 0).toString(16).padStart(8, '0'))
  for (let i = 0; i < 16; i++) {
    assert.equal(plain.pget(3 + i, 20), i)
    assert.equal(rgba(plain)[20 * W + 3 + i], PALETTE_ABGR[i])
  }
})

test('fifteen exact sprite shades survive, opaque slot-zero black overwrites and dots stay transparent', () => {
  const colors = [
    '#000000',
    '#0033ee',
    '#0066ff',
    '#0088ff',
    '#162eaa',
    '#263faa',
    '#3650aa',
    '#4661aa',
    '#5672aa',
    '#6683aa',
    '#7694aa',
    '#86a5aa',
    '#96b6aa',
    '#a6c7aa',
    '#b6d8aa',
  ]
  const screen = new Screen()
  screen.cls(8)
  screen.spr(['.0123456789abcde.'], 0, 20, false, false, colors)
  const pixels = rgba(screen)
  assert.equal(pixel(screen, 0, 20), 8)
  assert.equal(pixel(screen, 16, 20), 8)
  for (let i = 0; i < colors.length; i++) assert.equal(pixels[20 * W + i + 1], packed(colors[i]!))
  assert.equal(screen.pget(1, 20), 0)
  assert.equal(new Set(Array.from(pixels.slice(20 * W + 1, 20 * W + 16))).size, 15)
})

test('geometry and palette caches remain independent, palettes are immutable identity snapshots', () => {
  const screen = new Screen(),
    rows = ['01'],
    red = ['#123456', '#654321'],
    blue = ['#000123', '#321000']
  screen.spr(rows, 0, 20, false, false, red)
  screen.spr(rows, 2, 20, false, false, blue)
  assert.equal(pixel(screen, 0, 20), RGB_TOKEN | 0x123456)
  assert.equal(pixel(screen, 2, 20), RGB_TOKEN | 0x000123)
  red[0] = '#ffffff'
  red.push('#ff0000')
  screen.spr(rows, 4, 20, false, false, red)
  assert.equal(
    pixel(screen, 4, 20),
    RGB_TOKEN | 0x123456,
    'later mutation cannot recolor an existing palette identity',
  )
  const original = screen.hash()
  screen.spr(rows, 2, 20, false, false, ['#777777', '#888888'])
  assert.notEqual(screen.hash(), original)
  const a = new Screen(),
    b = new Screen()
  a.spr(['01'], 0, 20, false, false, ['#123456', '#abcdef'])
  b.spr(['10'], 0, 20, false, false, ['#ABCDEF', '#123456'])
  assert.equal(a.hash(), b.hash())
  assert.deepEqual(rgba(a), rgba(b))
})

test('every primitive, scaled text and a default sprite overwrites custom pixels without stale colors', () => {
  const fills = Array.from({ length: H }, () => '0'.repeat(W))
  const draws: [string, (screen: Screen) => void][] = [
    ['pset', (s) => s.pset(12, 20, 8)],
    ['line', (s) => s.line(-5, 20, 120, 200, 8)],
    ['rect', (s) => s.rect(20, 30, 40, 25, 8)],
    ['rectfill', (s) => s.rectfill(-3, 20, 30, 25, 8)],
    ['circ', (s) => s.circ(20, 30, 13, 8)],
    ['circfill', (s) => s.circfill(250, 220, 12, 8)],
    ['text', (s) => s.text('TEST', 1, 15, 8)],
    ['scaled text', (s) => s.text('TEST', 1, 15, 8, 2)],
    ['centered text', (s) => s.textCenter('TEST', 50, 8)],
    ['default sprite', (s) => s.spr(['8.8', '.8.'], 20, 20)],
  ]
  for (const [name, draw] of draws) {
    const screen = new Screen(),
      mask = new Screen()
    screen.spr(fills, 0, 0, false, false, ['#123456'])
    draw(screen)
    draw(mask)
    assert(
      mask.fb.some((v) => v === 8),
      `${name} produces a visible test mask`,
    )
    for (let i = 0; i < screen.fb.length; i++)
      assert.equal(screen.fb[i], mask.fb[i] === 8 ? 8 : RGB_TOKEN | 0x123456, name)
  }
  const screen = new Screen()
  screen.spr(fills, 0, 0, false, false, ['#123456'])
  screen.cls(0)
  assert(screen.fb.every((v) => v === 0))
})

test('custom palettes preserve both flips and clipping at all four edges', () => {
  const rows = ['01', '2.'],
    colors = ['#123456', '#abcdef', '#000000'],
    tokens = spritePaletteTokens(colors)
  for (const flipX of [false, true])
    for (const flipY of [false, true])
      for (const [x, y] of [
        [0, 0],
        [-1, -1],
        [W - 1, H - 1],
        [-1, 20],
        [W - 1, 20],
        [20, -1],
        [20, H - 1],
      ]) {
        const screen = new Screen()
        screen.cls(13)
        screen.spr(rows, x!, y!, flipX, flipY, colors)
        const expected = new Uint32Array(W * H).fill(13)
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            const ch = rows[flipY ? 1 - dy : dy]![flipX ? 1 - dx : dx]!,
              xx = x! + dx,
              yy = y! + dy
            if (ch !== '.' && xx >= 0 && xx < W && yy >= 0 && yy < H)
              expected[yy * W + xx] = tokens[Number(ch)]!
          }
        assert.deepEqual(screen.fb, expected)
      }
})

test('hashes use visible RGB, stats count canonical colors and pget remains a nearest-PICO index', () => {
  const a = new Screen(),
    b = new Screen()
  a.spr(['0'], 0, 20, false, false, ['#123456'])
  b.spr(['0'], 0, 20, false, false, ['#123457'])
  assert.notEqual(a.hash(), b.hash())
  a.pset(0, 20, 0)
  b.pset(0, 20, 0)
  assert.equal(a.hash(), b.hash())
  a.spr(['0'], 0, 1, false, false, ['#123456'])
  assert.equal(a.hash(12), b.hash(12))
  a.cls()
  a.spr(['0123456789abcdef'], 0, 20)
  a.spr(
    ['0123456789abcde'],
    0,
    21,
    false,
    false,
    Array.from({ length: 15 }, (_, i) => `#0101${(i + 1).toString(16).padStart(2, '0')}`),
  )
  assert.equal(a.stats().colors, 31)
  a.fb.fill(RGB_TOKEN | 0x223344)
  a.fb.fill(RGB_TOKEN | 0x112233, 0, a.fb.length / 2)
  assert.deepEqual(a.stats(), { colors: 2, dominant: RGB_TOKEN | 0x112233, dominantShare: 0.5 })
  assert.equal(
    tokenPaletteIndex(RGB_TOKEN | 0x778b64),
    5,
    'equidistant PICO5/PICO13 projects to the lower index',
  )
  a.spr(['012'], 0, 20, false, false, ['#010101', '#25a9f8', '#ffffff'])
  assert.deepEqual([a.pget(0, 20), a.pget(1, 20), a.pget(2, 20)], [0, 12, 7])
  assert.equal(a.pget(-1, 20), 0)
  assert.equal(a.pget(W, H), 0)
})

test('malformed palettes and unavailable indices fail before clipping or partial drawing', () => {
  const invalid: unknown[] = [
    null,
    {},
    '#123456',
    [],
    Array(17).fill('#000000'),
    ['#fff'],
    ['#gg0000'],
    [1],
    Array(2),
  ]
  for (const colors of invalid)
    assert.throws(
      () => new Screen().spr(['0'], 0, 20, false, false, colors as readonly string[]),
      /Sprite palette/,
    )
  const screen = new Screen(),
    rows = ['f']
  screen.spr(rows, 0, 20)
  assert.throws(() => screen.spr(rows, -100, -100, false, false, ['#000000']), /index f.*1-entry/)
  assert.equal(pixel(screen, 0, 20), 15)
  screen.spr(['.'], 0, 20, false, false, ['#000000'])
  assert.equal(pixel(screen, 0, 20), 15)
})

test('runtime guard catches palette errors, HUD/flash overwrite tokens and resets replay identically', () => {
  const messages: { type: string; message?: string }[] = []
  const runtime = new Runtime(null as unknown as HTMLCanvasElement, {
    probe: true,
    post: (m) => messages.push(m),
  })
  const code = `const ROWS=Array(224).fill('0'.repeat(256)),COLORS=['#123456'];function init(api){api.score(0)}function update(api){if(api.frame===2)api.flash(7,2)}function draw(api){api.spr(ROWS,0,0,false,false,COLORS)}`
  assert(runtime.load(code, 7, 'PALETTE').ok)
  runtime.start()
  runtime.step(1)
  const before = runtime.screen.hash()
  assert.equal(pixel(runtime.screen, 255, 223), RGB_TOKEN | 0x123456)
  assert(
    runtime.screen.fb.slice(0, 12 * W).some((v) => v < 16),
    'HUD glyphs overwrite custom pixels',
  )
  runtime.step(1)
  assert.equal(pixel(runtime.screen, 255, 223), 7)
  runtime.step(2)
  assert.equal(pixel(runtime.screen, 255, 223), RGB_TOKEN | 0x123456)
  runtime.reset()
  runtime.start()
  runtime.step(1)
  assert.equal(runtime.screen.hash(), before)
  assert(
    runtime.load(
      `function init(){}function update(){}function draw(api){api.spr(['f'],10,20,false,false,['#123456'])}`,
    ).ok,
  )
  runtime.start()
  runtime.step(1)
  assert.equal(runtime.state, 'error')
  assert(messages.some((m) => m.type === 'error' && m.message?.includes('index f')))
})
