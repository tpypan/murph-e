import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { catalogPreview, digest, openCatalogDb } from '../src/catalog.ts'
import { indexSprites, normalizeSpriteSet, type SpriteRecord } from '../src/sprite-catalog.ts'
import { linkSpriteAssets, spriteContract } from '../src/sprite-link.ts'

// The runtime uses bundler resolution; load its real implementation without
// pulling those extensionless imports into the harness's NodeNext typecheck.
interface Screen {
  cls(color?: number): void
  spr(
    pixels: readonly string[],
    x: number,
    y: number,
    flipX?: boolean,
    flipY?: boolean,
    palette?: readonly string[],
  ): void
  rectfill(x: number, y: number, w: number, h: number, color: unknown): void
  blit(target: Uint32Array): void
  hash(): string
}
const { H, Screen, W } = (await import(
  new URL('../../runtime/src/gfx.ts', import.meta.url).href
)) as {
  H: number
  W: number
  Screen: new () => Screen
}

const options = { packId: 'fixture', sourcePath: 'composite.json' }
const palette = Array.from({ length: 16 }, (_, i) => `#1234${i.toString(16).padStart(2, '0')}`)
const overlayPalette = Array.from(
  { length: 16 },
  (_, i) => `#5678${i.toString(16).padStart(2, '0')}`,
)
const base = {
  pixels: ['0123456789abcdef..', '000...............'],
  palette,
  anchor: { x: 3, y: 2 },
  durationTicks: 2,
  hitboxes: [{ x: 1, y: 0, w: 2, h: 1 }],
  hurtboxes: [{ shape: 'circle', x: 4, y: 1, radius: 1 }],
}
const raw = {
  id: 'composite',
  coordinates: 'frame-local pixels',
  frames: {
    colorful: {
      ...base,
      layers: [
        { pixels: ['................0.', '.123456789abcdef..'], palette: overlayPalette },
        { pixels: ['..................', '.0................'], palette: ['#000000'] },
      ],
    },
    single: { ...base, pixels: ['0.................', '..................'], durationTicks: 3 },
  },
  animations: {
    loop: { frames: ['colorful', 'single'], loop: true },
    hold: { frames: ['colorful', 'single'], loop: false },
    mirrored: { frames: ['colorful', 'single'], loop: true, flipX: true },
  },
}
type LinkedFrame = SpriteRecord['frames'][string] & { flipX: boolean }
type Actor = {
  frame: (clip: string, ticks: number, flipX?: boolean) => LinkedFrame
  draw: (
    api: Pick<Screen, 'spr'>,
    clip: string,
    ticks: number,
    x: number,
    y: number,
    flipX?: boolean,
  ) => LinkedFrame
}
function actor(sprite = normalizeSpriteSet(raw, options)): Actor {
  return runInNewContext(
    `${linkSpriteAssets([sprite])}\nART.get(${JSON.stringify(sprite.id)})`,
    {},
    { timeout: 100 },
  )
}
const packed = (hex: string) => {
  const rgb = Number.parseInt(hex.slice(1), 16)
  return (0xff000000 | ((rgb & 255) << 16) | (rgb & 0xff00) | (rgb >>> 16)) >>> 0
}
function pixels(screen: Screen) {
  const result = new Uint32Array(W * H)
  screen.blit(result)
  return result
}

test('one composite frame renders more than 16 exact RGB colors, transparent dots and opaque black in native Screen', () => {
  const screen = new Screen()
  screen.cls(8)
  const f = actor().draw(screen, 'loop', 0, 23, 32)
  const rendered = pixels(screen)
  const at = (x: number, y: number) => rendered[(30 + y) * W + 20 + x]
  for (let x = 0; x < 16; x++) assert.equal(at(x, 0), packed(palette[x]!))
  assert.equal(at(16, 0), packed(overlayPalette[0]!))
  for (let x = 2; x < 16; x++) assert.equal(at(x, 1), packed(overlayPalette[x]!))
  assert.equal(at(0, 1), packed(palette[0]!))
  assert.equal(at(1, 1), packed('#000000'), 'last plane paints black over both earlier planes')
  assert.equal(at(17, 0), packed('#ff004d'), 'all-plane dots preserve the background')
  assert.equal(
    new Set([
      ...Array.from({ length: 17 }, (_, x) => at(x, 0)),
      ...Array.from({ length: 16 }, (_, x) => at(x, 1)),
    ]).size,
    32,
  )
  assert.equal(f.layers?.length, 2)
})

test('all composite planes mirror together with shared anchor and collision geometry, including flip cancellation', () => {
  const art = actor()
  const original = new Screen()
  original.cls(8)
  art.draw(original, 'loop', 0, 23, 32)
  for (const [clip, requestedFlip, mirrored] of [
    ['loop', true, true],
    ['mirrored', false, true],
    ['mirrored', true, false],
  ] as const) {
    const screen = new Screen()
    screen.cls(8)
    const f = art.draw(screen, clip, 0, 60, 32, requestedFlip)
    assert.equal(f.anchor.x, mirrored ? 15 : 3)
    assert.equal(f.hitboxes[0]!.x, mirrored ? 15 : 1)
    assert.equal(f.hurtboxes[0]!.x, mirrored ? 14 : 4)
    assert.equal(f.flipX, mirrored)
    assert.deepEqual(JSON.parse(JSON.stringify(f.layers)), raw.frames.colorful.layers)
    const left = 60 - f.anchor.x
    const rendered = pixels(screen),
      source = pixels(original)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 18; x++)
        assert.equal(
          rendered[(30 + y) * W + left + x],
          source[(30 + y) * W + 20 + (mirrored ? 17 - x : x)],
        )
  }
  assert.equal(art.frame('loop', 0).anchor.x, 3, 'mirroring never mutates saved geometry')
})

test('animation transitions select the complete plane set, omit stale layers and retain loop/final-pose timing', () => {
  const art = actor()
  for (const [clip, tick, layered] of [
    ['loop', 0, true],
    ['loop', 1.99, true],
    ['loop', 2, false],
    ['loop', 4.99, false],
    ['loop', 5, true],
    ['hold', 999, false],
  ] as const) {
    const calls: unknown[][] = []
    const f = art.draw(
      {
        spr: (...args) => {
          calls.push(args)
        },
      },
      clip,
      tick,
      23.4,
      32.4,
    )
    assert.equal(calls.length, layered ? 3 : 1)
    assert.equal(f.layers?.length, layered ? 2 : undefined)
    for (const call of calls) assert.deepEqual(call.slice(1, 5), [20, 30, false, false])
    const screen = new Screen()
    art.draw(screen, clip, tick, 23, 32)
    assert.equal(pixels(screen)[30 * W + 36], packed(layered ? overlayPalette[0]! : '#000000'))
  }
})

test('SQLite metadata preserves all planes, frame/step geometry and source hashes', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'sprite-layers-'))
  try {
    const sprite = normalizeSpriteSet(raw, options)
    const dbPath = resolve(dir, 'catalog.sqlite')
    indexSprites([sprite], dbPath)
    const db = openCatalogDb(dbPath)
    try {
      const saved = db
        .prepare('SELECT metadata_json,content_hash FROM sprite_sets WHERE id=?')
        .get(sprite.id)!
      assert.deepEqual(JSON.parse(String(saved.metadata_json)), JSON.parse(JSON.stringify(sprite)))
      assert.equal(saved.content_hash, digest(JSON.stringify(raw)))
      const screen = new Screen(),
        restored = new Screen()
      actor(sprite).draw(screen, 'mirrored', 0, 60, 32)
      actor(JSON.parse(String(saved.metadata_json))).draw(restored, 'mirrored', 0, 60, 32)
      assert.equal(restored.hash(), screen.hash())
    } finally {
      db.close()
    }
    const changed = structuredClone(raw)
    changed.frames.colorful.layers[0]!.palette[0] = '#5678ff'
    assert.notEqual(normalizeSpriteSet(changed, options).hash, sprite.hash)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('malformed composite dimensions, palette indices, offsets and layer counts are rejected', () => {
  const layer = raw.frames.colorful.layers[0]!
  const invalid = [
    { ...layer, pixels: [] },
    { ...layer, pixels: ['0'] },
    { ...layer, pixels: ['.'.repeat(18)] },
    { ...layer, pixels: ['.'.repeat(18), '.'.repeat(19)] },
    { ...layer, pixels: ['.'.repeat(18), 'g'.repeat(18)] },
    { ...layer, palette: undefined },
    { ...layer, palette: [] },
    { ...layer, palette: ['#fff'] },
    { ...layer, palette: Array(17).fill('#000000') },
    { ...layer, palette: ['#000000'] },
    { ...layer, x: 1 },
    { ...layer, offset: { x: 1, y: 0 } },
    { ...layer, anchor: { x: 1, y: 0 } },
  ]
  for (const bad of invalid)
    assert.throws(() =>
      normalizeSpriteSet(
        { ...raw, frames: { ...raw.frames, colorful: { ...base, layers: [bad] } } },
        options,
      ),
    )
  const withCount = (n: number) => ({
    ...raw,
    frames: { ...raw.frames, colorful: { ...base, layers: Array(n).fill(layer) } },
  })
  assert.doesNotThrow(() => normalizeSpriteSet(withCount(8), options))
  assert.throws(() => normalizeSpriteSet(withCount(9), options))
  const withCanvas = (width: number, height: number) => ({
    ...raw,
    frames: {
      ...raw.frames,
      colorful: {
        ...base,
        pixels: Array(height).fill('0'.repeat(width)),
        layers: [{ pixels: Array(height).fill('0'.repeat(width)), palette: ['#abcdef'] }],
      },
    },
  })
  const maximum = normalizeSpriteSet(withCanvas(256, 224), options)
  const screen = new Screen()
  actor(maximum).draw(screen, 'loop', 0, 3, 2)
  assert.ok(pixels(screen).every((pixel) => pixel === packed('#abcdef')))
  assert.throws(() => normalizeSpriteSet(withCanvas(257, 224), options), /exceeds screen/)
  assert.throws(() => normalizeSpriteSet(withCanvas(256, 225), options), /exceeds screen/)
})

test('single-layer sprites retain their source hash, frame shape and native rendering', () => {
  const single = {
    id: 'single',
    frames: { idle: { ...base, palette: undefined } },
    animations: { idle: { frames: ['idle'], loop: true } },
  }
  const sprite = normalizeSpriteSet(single, options)
  assert.equal(sprite.hash, digest(JSON.stringify(single)))
  assert.equal('layers' in sprite.frames.idle!, false)
  const art = actor(sprite),
    screen = new Screen(),
    expected = new Screen()
  const f = art.draw(screen, 'idle', 0, 23, 32)
  assert.equal('layers' in f, false)
  expected.spr(base.pixels, 20, 30)
  assert.equal(screen.hash(), expected.hash())
  assert.deepEqual(pixels(screen), pixels(expected))
  const contract = spriteContract([normalizeSpriteSet(raw, options)])
  assert.match(contract, /layers\?/)
  assert.match(contract, /base then layers in array order/)
  assert.match(contract, /slot 0 is opaque/)
})

test('isolated draft preview displays every composite plane and follows mirrored animation transitions', () => {
  for (const flipX of [false, true]) {
    const sprite = normalizeSpriteSet(
      { ...raw, animations: { loop: { ...raw.animations.loop, flipX } } },
      options,
    )
    const preview = catalogPreview({ parts: [], sprites: [sprite], text: '', hash: '' })!
    const screen = new Screen()
    const api = {
      frame: 0,
      cls: screen.cls.bind(screen),
      spr: screen.spr.bind(screen),
      rectfill: screen.rectfill.bind(screen),
    }
    const sandbox = { api, render: null as unknown as () => void }
    runInNewContext(
      `${preview.prefix}\n${preview.demo}\ninit(api);globalThis.render=()=>draw(api)`,
      sandbox,
      { timeout: 100 },
    )
    for (const tick of [0, 2, 5]) {
      api.frame = tick
      sandbox.render()
      const reference = new Screen()
      const f = actor(sprite).frame('loop', tick)
      actor(sprite).draw(reference, 'loop', tick, f.anchor.x, f.anchor.y + 20)
      const actualPixels = pixels(screen),
        expectedPixels = pixels(reference)
      for (let y = 0; y < 6; y++)
        for (let x = 0; x < 54; x++)
          assert.equal(
            actualPixels[(109 + y) * W + 101 + x],
            expectedPixels[(20 + Math.floor(y / 3)) * W + Math.floor(x / 3)],
          )
    }
  }
})
