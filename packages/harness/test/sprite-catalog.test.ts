import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import {
  assembleCatalog,
  catalogPreview,
  catalogSource,
  digest,
  loadCatalog,
  openCatalogDb,
} from '../src/catalog.ts'
import { ROOT } from '../src/env.ts'
import {
  assetPackHash,
  indexSprites,
  loadSpriteCatalog,
  normalizeSpriteSet,
} from '../src/sprite-catalog.ts'
import { selectSpriteAssets } from '../src/sprite-link.ts'

const frame = {
  pixels: ['.7.', '777'],
  anchor: { x: 1, y: 2 },
  durationTicks: 6,
  hitboxes: [],
  hurtboxes: [{ x: 0, y: 0, w: 3, h: 2 }],
}
const options = {
  packId: 'test',
  sourcePath: 'test.json',
  provenance: { kind: 'original' },
  license: { spdx: 'CC0-1.0' },
}
test('all public foundation art indexes cleanly, including the reusable platformer hero', () => {
  const issues: { id: string; message: string }[] = []
  const parts = loadCatalog(resolve(ROOT, 'library/catalog'))
  const sprites = loadSpriteCatalog(parts, [], issues)
  assert.deepEqual(issues, [])
  const hero = sprites.find((sprite) => sprite.id === 'speed-platformer/azure-hare')
  assert.ok(hero)
  assert.ok(hero.animations.run!.steps.length > 1)
  assert.ok(hero.animations.roll!.steps.length > 1)
})

test('frame palettes preserve source RGB through normalization, linkage and draw', () => {
  const palette = ['#000000', '#1257c9', '#fac39b']
  const raw = {
    id: 'source-art',
    frames: { idle: { ...frame, pixels: ['.01', '222'], palette } },
    animations: { idle: { frames: ['idle'], loop: true } },
  }
  const sprite = normalizeSpriteSet(raw, options)
  let args: unknown[] = []
  runInNewContext(
    assembleCatalog('ART.get("test/source-art").draw(api,"idle",0,12,14,true)', {
      parts: [],
      sprites: [sprite],
      text: '',
      hash: '',
    }),
    {
      api: {
        spr: (...values: unknown[]) => {
          args = values
        },
      },
    },
  )
  assert.deepEqual(Array.from(args[5] as string[]), palette)
  assert.equal(args[3], true)
  assert.equal(args[4], false)
  assert.deepEqual(sprite.frames.idle!.palette, palette)
  for (const invalid of [[], ['red'], Array(17).fill('#000000'), ['#000000']])
    assert.throws(() =>
      normalizeSpriteSet(
        {
          ...raw,
          frames: { idle: { ...raw.frames.idle, palette: invalid } },
        },
        options,
      ),
    )
  assert.notEqual(
    sprite.hash,
    normalizeSpriteSet(
      {
        ...raw,
        frames: { idle: { ...raw.frames.idle, palette: ['#000000', '#1257ca', '#fac39b'] } },
      },
      options,
    ).hash,
  )
})
test('sprite catalog preserves per-animation timing/geometry and authentic unsupported states', () => {
  const sprite = normalizeSpriteSet(
    {
      id: 'actor',
      frames: { idle: frame, punch: frame },
      animations: {
        idle: { frames: ['idle'], loop: true },
        attack: {
          frames: [
            {
              frame: 'punch',
              duration: 3,
              anchor: { x: 1, y: 2 },
              hitboxes: [{ x: 2, y: -2, w: 5, h: 2 }],
              hurtboxes: [],
            },
          ],
          loop: false,
        },
      },
      unsupportedStates: ['jump'],
    },
    options,
  )
  assert.equal(sprite.animations.attack?.steps[0]?.durationTicks, 3)
  assert.equal(sprite.animations.attack?.steps[0]?.hitboxes[0]?.w, 5)
  assert.equal(sprite.animations.idle?.steps[0]?.durationTicks, 6)
  assert.deepEqual(sprite.unsupportedStates, ['jump'])
  assert.deepEqual(sprite.provenance, { kind: 'original' })
})
test('sprite validation rejects missing frames, missing timing and malformed pixel grids', () => {
  const raw = {
    id: 'actor',
    frames: { idle: frame },
    animations: { idle: { frames: ['idle'], loop: true } },
  }
  assert.throws(
    () =>
      normalizeSpriteSet(
        { ...raw, animations: { walk: { frames: ['missing'], loop: true } } },
        options,
      ),
    /Missing sprite frame/,
  )
  assert.throws(
    () =>
      normalizeSpriteSet({ ...raw, frames: { idle: { ...frame, pixels: ['7', '77'] } } }, options),
    /Nonrectangular/,
  )
  assert.throws(
    () =>
      normalizeSpriteSet(
        { ...raw, frames: { idle: { ...frame, durationTicks: undefined } } },
        options,
      ),
    /Missing frame timing/,
  )
})

test('actual Asteroids circle frames normalize and index without changing authored metadata or pack bytes', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'arcade-circle-index-'))
  const part = loadCatalog().find((entry) => entry.manifest.id === 'asteroids')
  assert.ok(part, 'the checked-in Asteroids foundation must be present')
  const source = resolve(ROOT, 'library/catalog/asteroids/assets.json')
  const before = readFileSync(source, 'utf8')
  try {
    const issues: { id: string; message: string }[] = []
    const sprites = loadSpriteCatalog([part], resolve(root, 'no-external-assets'), issues)
    assert.deepEqual(issues, [])
    assert.equal(sprites.length, 6)
    assert.equal(
      sprites.reduce((count, sprite) => count + Object.keys(sprite.frames).length, 0),
      79,
    )
    const ship = sprites.find((sprite) => sprite.id === 'asteroids/ship')
    assert.ok(ship)
    const circle = ship.frames['idle-0']!.hurtboxes[0]!
    assert.deepEqual(circle, { kind: 'circle', shape: 'circle', x: 13, y: 13, r: 6, radius: 6 })
    assert.deepEqual(ship.frames['idle-0']!.sockets, { muzzle: { x: 13, y: 4 } })
    assert.deepEqual(ship.animations.heading0!.steps[0]!.hurtboxes[0], circle)
    const dbPath = resolve(root, 'catalog.sqlite')
    const indexed = indexSprites(sprites, dbPath)
    assert.equal(indexed.length, 6)
    const db = openCatalogDb(dbPath)
    try {
      const row = db.prepare('SELECT metadata_json FROM sprite_sets WHERE id=?').get(ship.id)
      assert.ok(row)
      const saved = JSON.parse(String(row.metadata_json))
      assert.deepEqual(saved.frames['idle-0'].hurtboxes[0], circle)
      assert.deepEqual(saved.animations.heading0.steps[0].hurtboxes[0], circle)
      assert.deepEqual(saved.frames['idle-0'].sockets, ship.frames['idle-0']!.sockets)
    } finally {
      db.close()
    }
    assert.equal(readFileSync(source, 'utf8'), before)
    assert.equal(loadCatalog().find((entry) => entry.manifest.id === 'asteroids')!.hash, part.hash)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('legacy circle aliases preserve metadata, validate radius and reject contradictory geometry', () => {
  const raw = {
    id: 'orb',
    frames: {
      idle: {
        ...frame,
        hurtboxes: [{ kind: 'circle', x: 1, y: 1, r: 0.75, role: 'core', damage: 3 }],
      },
    },
    animations: { idle: { frames: ['idle'], loop: true } },
  }
  const sprite = normalizeSpriteSet(raw, options)
  assert.deepEqual(sprite.frames.idle!.hurtboxes[0], {
    ...raw.frames.idle.hurtboxes[0],
    shape: 'circle',
    radius: 0.75,
  })
  assert.equal(
    'shape' in raw.frames.idle.hurtboxes[0]!,
    false,
    'normalization does not mutate input',
  )
  for (const shape of [
    { kind: 'circle', x: 1, y: 1, r: 0 },
    { kind: 'circle', x: 1, y: 1, r: -1 },
    { kind: 'circle', x: 1, y: 1, r: Number.POSITIVE_INFINITY },
    { kind: 'circle', x: 1, y: 1, r: 1, radius: 2 },
    { kind: 'circle', shape: 'rect', x: 1, y: 1, r: 1, w: 2, h: 2 },
  ])
    assert.throws(() =>
      normalizeSpriteSet(
        {
          ...raw,
          frames: { idle: { ...frame, hurtboxes: [shape] } },
        },
        options,
      ),
    )
})

test('ART mirrors circular centers in local and anchor-relative geometry, including timed steps and flip cancellation', () => {
  for (const coordinates of ['frame-local pixels', 'anchor-relative offsets']) {
    const local = coordinates.startsWith('frame-local')
    const rawCircle = { kind: 'circle', x: local ? 2 : -2, y: 1, r: 1.5, w: 99, role: 'weak-point' }
    const sprite = normalizeSpriteSet(
      {
        id: 'orb',
        coordinates,
        frames: {
          idle: {
            ...frame,
            pixels: ['7777777777', '7........7'],
            anchor: { x: 3, y: 2 },
            hurtboxes: [rawCircle],
          },
        },
        animations: {
          idle: { frames: ['idle'], loop: true },
          mirrored: { frames: ['idle'], loop: true, flipX: true },
          attack: {
            frames: [
              {
                frame: 'idle',
                duration: 2,
                anchor: { x: 3, y: 2 },
                hitboxes: [rawCircle],
                hurtboxes: [],
              },
            ],
            loop: false,
          },
        },
      },
      options,
    )
    type Result = {
      anchor: { x: number }
      flipX: boolean
      hitboxes: Record<string, unknown>[]
      hurtboxes: Record<string, unknown>[]
    }
    const sandbox = {
      actor: null as unknown as { frame: (clip: string, ticks: number, flipX?: boolean) => Result },
    }
    runInNewContext(
      assembleCatalog('globalThis.actor = ART.get("test/orb")', {
        parts: [],
        sprites: [sprite],
        text: '',
        hash: '',
      }),
      sandbox,
      { timeout: 100 },
    )
    const expectedX = local ? 8 : 2
    for (const [clip, flip, field] of [
      ['idle', true, 'hurtboxes'],
      ['mirrored', false, 'hurtboxes'],
      ['attack', true, 'hitboxes'],
    ] as const) {
      const result = sandbox.actor.frame(clip, 0, flip)
      const circle = result[field][0]!
      assert.equal(circle.x, expectedX, 'circle center must not subtract radius or rectangle width')
      assert.equal(circle.y, 1)
      assert.equal(circle.radius, 1.5)
      assert.equal(circle.r, 1.5)
      assert.equal(circle.kind, 'circle')
      assert.equal(circle.shape, 'circle')
      assert.equal(circle.role, 'weak-point')
      assert.equal(circle.w, 99, 'unrelated original metadata remains available')
      assert.equal(result.anchor.x, 7)
      assert.equal(result.flipX, true)
    }
    assert.equal(sandbox.actor.frame('mirrored', 0, true).hurtboxes[0]!.x, rawCircle.x)
    assert.equal(sandbox.actor.frame('idle', 0).hurtboxes[0]!.x, rawCircle.x)
    assert.equal(
      sprite.frames.idle!.hurtboxes[0]!.x,
      rawCircle.x,
      'ART does not mutate saved centers',
    )
  }
})

test('linked original pixels respect clip timing, mirrored anchors/boxes and final pose hold', () => {
  const sprite = normalizeSpriteSet(
    {
      id: 'pig',
      camera: 'top-down',
      tags: ['pig'],
      coordinates: 'frame-local pixels',
      frames: {
        idle: { ...frame, anchor: { x: 1, y: 2 }, hurtboxes: [{ x: 0, y: 0, w: 1, h: 2 }] },
        step: { ...frame, pixels: ['777', '7.7'] },
      },
      animations: {
        left: { frames: ['idle', 'step'], loop: true },
        right: { frames: ['idle', 'step'], loop: true, flipX: true },
        end: { frames: ['idle', 'step'], loop: false },
      },
    },
    { ...options, status: 'source-checked' },
  )
  const context = { parts: [], sprites: [sprite], text: '', hash: '' }
  const source = 'const actor = ART.get("test/pig"); globalThis.actor = actor;'
  type LinkedFrame = {
    pixels: string[]
    anchor: { x: number; y: number }
    hurtboxes: { x: number }[]
  }
  const sandbox = {
    actor: null as unknown as {
      frame: (clip: string, ticks: number, flipX?: boolean) => LinkedFrame
      draw: (
        api: { spr: (...args: unknown[]) => void },
        clip: string,
        ticks: number,
        x: number,
        y: number,
      ) => void
    },
  }
  runInNewContext(assembleCatalog(source, context), sandbox, { timeout: 100 })
  const actor = sandbox.actor
  assert.equal(actor.frame('left', 0).pixels[1], '777')
  assert.equal(actor.frame('left', 6).pixels[1], '7.7')
  assert.equal(actor.frame('left', 12).pixels[1], '777')
  assert.equal(actor.frame('end', 999).pixels[1], '7.7')
  assert.equal(actor.frame('right', 0).anchor.x, 2)
  assert.equal(actor.frame('right', 0).hurtboxes[0]?.x, 2)
  assert.equal(actor.frame('right', 0, true).anchor.x, 1)
  let draw: unknown[] = []
  actor.draw(
    {
      spr: (...args: unknown[]) => {
        draw = args
      },
    },
    'right',
    0,
    100,
    50,
  )
  assert.equal(draw[1], 98)
  assert.equal(draw[2], 48)
  assert.equal(draw[3], true)
  assert.throws(() => actor.frame('attack', 0), /Unavailable animation/)
  assert.throws(() => assembleCatalog('ART.get("test/batman")', context), /Unavailable sprite/)
  assert.equal(catalogSource(assembleCatalog(source, context)), source)
  assert.equal(selectSpriteAssets('A pig collecting apples', {}, [sprite]).length, 1)
  assert.equal(selectSpriteAssets('A pig fighting in Street Fighter', {}, [sprite]).length, 0)
  assert.equal(selectSpriteAssets('Batman collecting apples', {}, [sprite]).length, 0)
  assert.equal(selectSpriteAssets('A pig', { moderated: true }, [sprite]).length, 0)
  assert.equal(selectSpriteAssets('A pig', {}, [{ ...sprite, status: 'draft' }]).length, 0)
  const preview = catalogPreview(context)
  assert.ok(preview?.prefix.includes('const ART'))
  const rendered: unknown[] = []
  runInNewContext(
    `${preview!.prefix}\n${preview!.demo}\ninit(api);draw(api)`,
    { api: { frame: 0, cls: () => {}, rectfill: (...args: unknown[]) => rendered.push(args) } },
    { timeout: 100 },
  )
  assert.ok(rendered.length > 0, 'isolated asset-only preview paints actual saved pixels')
})

test('source-checked asset admission is bound to normalized data, original bytes, and evidence', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'arcade-sprites-'))
  const dir = resolve(root, 'test')
  mkdirSync(dir)
  const manifest = {
    id: 'test',
    camera: 'top-down',
    actors: [{ file: 'actor.json', tags: ['pig'] }],
    props: [{ file: 'crate.json' }],
    license: { localNotice: 'LICENSE.md' },
  }
  const actor = {
    id: 'pig',
    frames: { idle: frame },
    animations: { idle: { frames: ['idle'], loop: true } },
    source: { path: 'original.bin' },
  }
  const prop = {
    id: 'crate',
    pixels: ['77', '77'],
    anchor: { x: 1, y: 2 },
    hitboxes: [],
    hurtboxes: [],
  }
  try {
    writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest))
    writeFileSync(resolve(dir, 'actor.json'), JSON.stringify(actor))
    writeFileSync(resolve(dir, 'crate.json'), JSON.stringify(prop))
    writeFileSync(resolve(dir, 'original.bin'), 'original pixels')
    writeFileSync(resolve(dir, 'LICENSE.md'), 'Fixture license')
    writeFileSync(resolve(dir, 'audit.json'), 'passed fixture review')
    assert.equal(loadSpriteCatalog([], root)[0]?.status, 'draft')
    const approve = () =>
      writeFileSync(
        resolve(dir, 'quality.json'),
        JSON.stringify({
          contentHash: assetPackHash(dir, manifest),
          checks: ['integrity', 'visual', 'provenance'].map((name) => ({
            name,
            passed: true,
            artifact: 'audit.json',
            artifactHash: digest(readFileSync(resolve(dir, 'audit.json'), 'utf8')),
          })),
        }),
      )
    approve()
    const sets = loadSpriteCatalog([], root)
    assert.equal(sets.length, 2)
    assert.equal(sets[0]?.status, 'source-checked')
    assert.ok(sets[1]?.unsupportedStates.includes('destruction-cycle'))
    writeFileSync(resolve(dir, 'original.bin'), 'changed original pixels')
    assert.equal(loadSpriteCatalog([], root)[0]?.status, 'draft')
    approve()
    writeFileSync(
      resolve(dir, 'actor.json'),
      JSON.stringify({ ...actor, frames: { idle: { ...frame, pixels: ['777', '...'] } } }),
    )
    assert.equal(loadSpriteCatalog([], root)[0]?.status, 'draft')
    approve()
    writeFileSync(resolve(dir, 'audit.json'), 'changed evidence')
    assert.equal(loadSpriteCatalog([], root)[0]?.status, 'draft')
    const issues: { id: string; message: string }[] = []
    writeFileSync(resolve(dir, 'actor.json'), 'broken json')
    loadSpriteCatalog([], root, issues)
    assert.equal(issues.length, 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
