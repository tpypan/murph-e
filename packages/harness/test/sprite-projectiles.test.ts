import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { openCatalogDb } from '../src/catalog.ts'
import { ROOT } from '../src/env.ts'
import { indexSprites, normalizeSpriteSet, type SpriteRecord } from '../src/sprite-catalog.ts'
import { linkSpriteAssets, spriteContract } from '../src/sprite-link.ts'

type Point = { x: number; y: number }
type Box = Point & { w: number; h: number }
type Frame = {
  pixels: string[]
  palette?: string[]
  layers?: { pixels: string[]; palette: string[] }[]
  size: { w: number; h: number }
  anchor: Point
}
type Step = {
  frame: string
  duration: number
  anchor: Point
  projectileOrigin?: Point
  hitboxes: Box[]
  hurtboxes: Box[]
}
type Character = {
  frames: Record<string, Frame>
  animations: Record<string, { loop: boolean; frames: Step[] }>
  projectile?: NonNullable<SpriteRecord['projectile']>
}
type Actor = {
  frames: SpriteRecord['frames']
  animations: SpriteRecord['animations']
  projectile?: SpriteRecord['projectile']
  character(): Character
  frame(clip: string, ticks: number, flip?: boolean): { anchor: Point; projectileOrigin?: Point }
}
const saved = JSON.parse(
  readFileSync(resolve(ROOT, 'library/catalog/fighter/assets.json'), 'utf8'),
) as { coordinates: string; characters: Record<string, Character> }
const options = { packId: 'fixture', sourcePath: 'projectile-fixture.json' }
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value))
function fixture() {
  const character = structuredClone(saved.characters.batman!)
  character.projectile = {
    travel: 'travel',
    impact: 'impact',
    bind: 'bind',
    speed: 3.6,
    life: 90,
    box: { x: -6, y: -3, w: 12, h: 6 },
    bindTicks: 38,
  }
  for (const [name, loop] of [
    ['travel', true],
    ['impact', false],
    ['bind', false],
  ] as const) {
    character.frames[name] = {
      pixels: ['.01.', '10..'],
      palette: ['#000000', '#123456'],
      layers: [{ pixels: ['...0', '....'], palette: ['#abcdef'] }],
      anchor: { x: 1, y: 1 },
      size: { w: 4, h: 2 },
    }
    character.animations[name] = {
      loop,
      frames: [{ frame: name, duration: 4, anchor: { x: 2, y: 1 }, hitboxes: [], hurtboxes: [] }],
    }
  }
  const active = character.animations.special!.frames[1]!
  active.projectileOrigin = { x: active.anchor.x + 17, y: active.anchor.y - 41 }
  return {
    ...character,
    id: 'projectile-fixture',
    camera: 'side-view',
    coordinates: saved.coordinates,
  }
}
function actor(sprite: SpriteRecord): Actor {
  return runInNewContext(
    `${linkSpriteAssets([sprite])}\nART.get(${JSON.stringify(sprite.id)})`,
    {},
    { timeout: 100 },
  )
}
function restored(sprite: SpriteRecord) {
  const dir = mkdtempSync(resolve(tmpdir(), 'sprite-projectile-'))
  try {
    const dbPath = resolve(dir, 'catalog.sqlite')
    indexSprites([sprite], dbPath)
    const db = openCatalogDb(dbPath)
    try {
      const row = db
        .prepare('SELECT metadata_json,content_hash FROM sprite_sets WHERE id=?')
        .get(sprite.id)!
      assert.equal(row.content_hash, sprite.hash)
      const result = JSON.parse(String(row.metadata_json)) as SpriteRecord
      assert.deepEqual(result, plain(sprite))
      return result
    } finally {
      db.close()
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('projectile and step socket survive normalization, SQLite, linkage and fighter conversion', () => {
  const raw = fixture(),
    sprite = normalizeSpriteSet(raw, options),
    art = actor(restored(sprite))
  assert.deepEqual(plain(art.projectile), raw.projectile)
  assert.deepEqual(
    plain(art.animations.special!.steps[1]!.projectileOrigin),
    raw.animations.special!.frames[1]!.projectileOrigin,
  )
  const character = art.character()
  assert.deepEqual(plain(character.projectile), raw.projectile)
  assert.deepEqual(plain(character.animations), raw.animations)
  assert.deepEqual(plain(character.frames.travel!.layers), raw.frames.travel!.layers)
  assert.deepEqual(plain(character.frames.travel!.size), { w: 4, h: 2 })
  character.projectile!.speed = 7
  character.animations.special!.frames[1]!.projectileOrigin!.x = 0
  character.frames.travel!.layers![0]!.palette[0] = '#ffffff'
  assert.deepEqual(
    plain(art.character().projectile),
    raw.projectile,
    'each fighter receives fresh metadata',
  )
  assert.deepEqual(plain(art.character().animations), raw.animations)
  assert.deepEqual(plain(art.character().frames.travel!.layers), raw.frames.travel!.layers)
  const socketChange = fixture()
  socketChange.animations.special!.frames[1]!.projectileOrigin!.x--
  assert.notEqual(normalizeSpriteSet(socketChange, options).hash, sprite.hash)
  const configChange = fixture()
  configChange.projectile!.bindTicks = configChange.projectile!.bindTicks! + 1
  assert.notEqual(normalizeSpriteSet(configChange, options).hash, sprite.hash)
  assert.match(spriteContract([sprite]), /actor\.character\(\)/)
})

test('ART socket mirroring preserves the signed anchor-relative launch offset and never leaks into another step', () => {
  const raw = fixture(),
    sprite = normalizeSpriteSet(raw, options),
    art = actor(sprite)
  const time = raw.animations.special!.frames[0]!.duration
  for (const flip of [false, true]) {
    const frame = art.frame('special', time, flip)
    assert.equal(frame.projectileOrigin!.x - frame.anchor.x, flip ? -17 : 17)
    assert.equal(frame.projectileOrigin!.y - frame.anchor.y, -41)
  }
  assert.equal(art.frame('special', 0).projectileOrigin, undefined)
  assert.equal(art.frame('special', 999).projectileOrigin, undefined)
  assert.deepEqual(
    plain(art.character().animations.special!.frames[1]!.projectileOrigin),
    raw.animations.special!.frames[1]!.projectileOrigin,
  )
  const mixed = normalizeSpriteSet(
    { ...raw, coordinates: 'feet-relative boxes; projectileOrigin is frame-local' },
    options,
  )
  const reflected = actor(mixed).frame('special', time, true) as ReturnType<Actor['frame']> & {
    hurtboxes: Box[]
  }
  const box = raw.animations.special!.frames[1]!.hurtboxes[0]!
  assert.equal(
    reflected.hurtboxes[0]!.x,
    -box.x - box.w,
    'a frame-local socket never changes feet-relative box geometry',
  )
  assert.equal(reflected.projectileOrigin!.x - reflected.anchor.x, -17)
  const noStepAnchor = structuredClone(raw)
  Reflect.deleteProperty(noStepAnchor.animations.special!.frames[1]!, 'anchor')
  const inherited = actor(normalizeSpriteSet(noStepAnchor, options)).character()
  assert.deepEqual(
    plain(inherited.animations.special!.frames[1]!.anchor),
    raw.frames[raw.animations.special!.frames[1]!.frame]!.anchor,
  )
})

test('malformed projectile metadata and out-of-canvas launch sockets are rejected before indexing', () => {
  const invalid: [string, (raw: ReturnType<typeof fixture>) => void][] = [
    [
      'missing travel',
      (raw) => {
        raw.projectile!.travel = 'absent'
      },
    ],
    [
      'nonloop travel',
      (raw) => {
        raw.animations.travel!.loop = false
      },
    ],
    [
      'loop impact',
      (raw) => {
        raw.animations.impact!.loop = true
      },
    ],
    [
      'missing bind',
      (raw) => {
        raw.projectile!.bind = 'absent'
      },
    ],
    [
      'zero speed',
      (raw) => {
        raw.projectile!.speed = 0
      },
    ],
    [
      'infinite speed',
      (raw) => {
        raw.projectile!.speed = Infinity
      },
    ],
    [
      'excess speed',
      (raw) => {
        raw.projectile!.speed = 9
      },
    ],
    [
      'fractional life',
      (raw) => {
        raw.projectile!.life = 1.5
      },
    ],
    [
      'excess life',
      (raw) => {
        raw.projectile!.life = 181
      },
    ],
    [
      'missing bind ticks',
      (raw) => {
        delete raw.projectile!.bindTicks
      },
    ],
    [
      'orphan bind ticks',
      (raw) => {
        delete raw.projectile!.bind
      },
    ],
    [
      'excess bind ticks',
      (raw) => {
        raw.projectile!.bindTicks = 91
      },
    ],
    [
      'empty box',
      (raw) => {
        raw.projectile!.box.w = 0
      },
    ],
    [
      'excess box',
      (raw) => {
        raw.projectile!.box.x = 65
      },
    ],
    [
      'nonfinite box',
      (raw) => {
        raw.projectile!.box.y = NaN
      },
    ],
    [
      'missing socket',
      (raw) => {
        delete raw.animations.special!.frames[1]!.projectileOrigin
      },
    ],
    [
      'negative socket',
      (raw) => {
        raw.animations.special!.frames[1]!.projectileOrigin!.x = -1
      },
    ],
    [
      'outside socket',
      (raw) => {
        const step = raw.animations.special!.frames[1]!
        step.projectileOrigin!.x = raw.frames[step.frame]!.size.w
      },
    ],
    [
      'nonfinite socket',
      (raw) => {
        raw.animations.special!.frames[1]!.projectileOrigin!.y = Infinity
      },
    ],
  ]
  for (const [label, mutate] of invalid) {
    const raw = fixture()
    mutate(raw)
    assert.throws(() => normalizeSpriteSet(raw, options), label)
  }
  const optional = fixture()
  delete optional.projectile!.impact
  delete optional.projectile!.bind
  delete optional.projectile!.bindTicks
  assert.doesNotThrow(() => normalizeSpriteSet(optional, options))
  const loopingBind = fixture()
  loopingBind.animations.bind!.loop = true
  assert.doesNotThrow(() => normalizeSpriteSet(loopingBind, options))
})

test('fighter conversion rejects incompatible sets and keeps legacy projectile-free sets unchanged', () => {
  for (const edit of [
    (raw: ReturnType<typeof fixture>) => {
      raw.camera = 'top-down'
    },
    (raw: ReturnType<typeof fixture>) => {
      raw.coordinates = 'frame-local pixels'
    },
    (raw: ReturnType<typeof fixture>) => {
      delete raw.animations.ko
    },
    (raw: ReturnType<typeof fixture>) => {
      raw.animations.light!.frames.pop()
    },
    (raw: ReturnType<typeof fixture>) => {
      raw.animations.idle!.frames[0]!.duration = 1.5
    },
  ]) {
    const raw = fixture()
    edit(raw)
    assert.throws(
      () => actor(normalizeSpriteSet(raw, options)).character(),
      /not fighter-compatible/,
    )
  }
  const raw = {
    ...structuredClone(saved.characters.batman!),
    id: 'legacy',
    coordinates: saved.coordinates,
  }
  const sprite = normalizeSpriteSet(raw, options),
    art = actor(sprite)
  assert.equal('projectile' in sprite, false)
  assert.equal('projectile' in art, false)
  assert.equal('projectile' in art.character(), false)
  assert.deepEqual(plain(art.character().animations), raw.animations)
})

test('SQLite-restored fighter art launches and draws through the real controller in both directions', () => {
  const sprite = restored(normalizeSpriteSet(fixture(), options))
  type FighterState = {
    fighters: { x: number; y: number; face: number }[]
    projectiles: { owner: number; x: number; y: number; vx: number }[]
  }
  type Game = {
    init(api: object): void
    update(api: object): void
    draw(api: object): void
    inspect(): FighterState
  }
  const factory = runInNewContext(
    `${readFileSync(resolve(ROOT, 'library/catalog/fighter/core.js'), 'utf8')}\nfighterFactory`,
    { FIGHTER_ASSETS: saved },
    { timeout: 100 },
  ) as (config: object) => Game
  for (const owner of [0, 1]) {
    const left = actor(sprite).character(),
      right = actor(sprite).character()
    const game = factory({ roster: ['left', 'right'], assets: { left, right } })
    const held = [new Set<string>(), new Set<string>()],
      previous = [new Set<string>(), new Set<string>()]
    const drawings: unknown[][] = []
    const api = new Proxy<Record<string, unknown>>(
      {
        players: 2,
        btn: (key: string, player = 0) => held[player]!.has(key),
        btnp: (key: string, player = 0) => held[player]!.has(key) && !previous[player]!.has(key),
        rnd: (n = 1) => n * 0.5,
        spr: (...args: unknown[]) => drawings.push(args),
      },
      { get: (target, name: string) => target[name] ?? (() => {}) },
    )
    game.init(api)
    const step = (ticks: number) => {
      for (let i = 0; i < ticks; i++) {
        game.update(api)
        previous[0] = new Set(held[0])
        previous[1] = new Set(held[1])
      }
    }
    step(78)
    const before = game.inspect().fighters[owner]!
    held[owner] = new Set(['down', 'b'])
    step(13)
    const p = game.inspect().projectiles[0]!
    assert.ok(p)
    assert.equal(p.owner, owner)
    assert.equal(p.vx, before.face * 3.6)
    assert.equal(p.x, before.x + before.face * (17 + 3.6))
    assert.equal(p.y, before.y - 41)
    game.draw(api)
    const frame = (owner ? right : left).frames.travel!
    const planes = drawings.filter(
      (args) => args[0] === frame.pixels || args[0] === frame.layers![0]!.pixels,
    )
    assert.equal(planes.length, 2)
    assert.deepEqual(planes[0]!.slice(1, 5), planes[1]!.slice(1, 5))
    assert.equal(planes[0]![1], Math.round(p.x - (before.face === 1 ? 2 : 4 - 1 - 2)))
    assert.equal(planes[0]![3], before.face === -1)
    assert.deepEqual(planes[0]![5], frame.palette)
    assert.deepEqual(planes[1]![5], frame.layers![0]!.palette)
  }
})
