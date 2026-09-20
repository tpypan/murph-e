import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../..')
const assets = JSON.parse(readFileSync(resolve(import.meta.dirname, 'assets.json'), 'utf8'))
const core = readFileSync(resolve(import.meta.dirname, 'core.js'), 'utf8')
const factory = Function('FIGHTER_ASSETS', `${core}\nreturn fighterFactory;`)(assets)
// Bundle the real Screen in memory: this standalone Node test writes no build/evidence files.
const require = createRequire(resolve(root, 'packages/runtime/package.json'))
const output = require('esbuild').buildSync({
  entryPoints: [resolve(root, 'packages/runtime/src/gfx.ts')],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
}).outputFiles[0].text
const module = { exports: {} }
Function('module', 'exports', output)(module, module.exports)
const { Screen, W, H } = module.exports

const palette = Array.from({ length: 16 }, (_, i) => `#1234${i.toString(16).padStart(2, '0')}`)
const overlay = Array.from({ length: 16 }, (_, i) => `#5678${i.toString(16).padStart(2, '0')}`)
const plane = {
  pixels: ['0123456789abcdef..', '000...............'],
  palette,
  size: { w: 18, h: 2 },
  anchor: { x: 3, y: 30 },
  layers: [
    { pixels: ['................0.', '.123456789abcdef..'], palette: overlay },
    { pixels: ['..................', '.0................'], palette: ['#000000'] },
  ],
}
function character() {
  const result = structuredClone(assets.characters.batman)
  result.frames.idle0 = structuredClone(plane)
  result.animations.idle.frames[0].anchor = { x: 4, y: 31 }
  return result
}
function render(custom, includeLayers = true) {
  const game = factory({ roster: ['custom', 'custom'], assets: { custom } })
  const screen = new Screen(),
    calls = []
  const api = new Proxy(
    {
      players: 2,
      spr: (...args) => {
        calls.push(args)
        if (includeLayers || calls.length % 3 === 1) screen.spr(...args)
      },
    },
    {
      get(target, key) {
        if (key in target) return target[key]
        return typeof screen[key] === 'function' ? screen[key].bind(screen) : () => {}
      },
    },
  )
  game.init(api)
  game.draw(api)
  const rgba = new Uint32Array(W * H)
  screen.blit(rgba)
  return { screen, calls, rgba, fighters: game.inspect().fighters }
}
const packed = (hex) => {
  const rgb = Number.parseInt(hex.slice(1), 16)
  return (0xff000000 | ((rgb & 255) << 16) | (rgb & 0xff00) | (rgb >>> 16)) >>> 0
}

test('composite draw preserves base/layer order, palette identity, step anchor and flip on native Screen', () => {
  const custom = character()
  const { calls, rgba, fighters } = render(custom)
  const baseline = render(custom, false)
  assert.equal(calls.length, 6)
  const expected = [
    [...palette, overlay[0], null],
    [palette[0], '#000000', ...overlay.slice(2), null, null],
  ]
  for (let player = 0; player < 2; player++) {
    const face = fighters[player].face
    const x = Math.round(fighters[player].x - (face === 1 ? 4 : 18 - 1 - 4)),
      y = 184 - 31
    const planes = [custom.frames.idle0, ...custom.frames.idle0.layers]
    planes.forEach((layer, index) => {
      const args = calls[player * 3 + index]
      assert.equal(args[0], layer.pixels)
      assert.equal(args[5], layer.palette)
      assert.deepEqual(args.slice(1, 5), [x, y, face === -1, false])
    })
    const colors = new Set()
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 18; dx++) {
        const color = expected[dy][face === -1 ? 17 - dx : dx]
        const pixel = (y + dy) * W + x + dx
        if (color) {
          assert.equal(rgba[pixel], packed(color))
          colors.add(rgba[pixel])
        } else assert.equal(rgba[pixel], baseline.rgba[pixel], 'dots preserve earlier planes/stage')
      }
    assert.equal(colors.size, 32)
  }
})

test('legacy single-plane draw is unchanged by absent versus empty layers', () => {
  const legacy = structuredClone(assets.characters.batman)
  const before = render(legacy)
  legacy.frames.idle0.layers = []
  const after = render(legacy)
  assert.equal(before.calls.length, 2)
  assert.deepEqual(after.calls, before.calls)
  assert.equal(after.screen.hash(), before.screen.hash())
  assert.deepEqual(after.rgba, before.rgba)
})

test('custom assets reject malformed planes, offsets, references, timing and collision boxes before play', () => {
  const invalid = [
    [
      'too many layers',
      (set) => {
        set.frames.idle0.layers = Array(9).fill(plane.layers[0])
      },
    ],
    [
      'wrong layer height',
      (set) => {
        set.frames.idle0.layers[0].pixels.pop()
      },
    ],
    [
      'wrong layer width',
      (set) => {
        set.frames.idle0.layers[0].pixels[0] = '0'
      },
    ],
    [
      'layer offset',
      (set) => {
        set.frames.idle0.layers[0].x = 2
      },
    ],
    [
      'layer anchor',
      (set) => {
        set.frames.idle0.layers[0].anchor = { x: 2, y: 3 }
      },
    ],
    [
      'missing palette',
      (set) => {
        delete set.frames.idle0.layers[0].palette
      },
    ],
    [
      'empty palette',
      (set) => {
        set.frames.idle0.palette = []
      },
    ],
    [
      'large palette',
      (set) => {
        set.frames.idle0.palette = Array(17).fill('#000000')
      },
    ],
    [
      'invalid RGB',
      (set) => {
        set.frames.idle0.palette[0] = '#xyzxyz'
      },
    ],
    [
      'unavailable index',
      (set) => {
        set.frames.idle0.palette = ['#000000']
      },
    ],
    [
      'invalid glyph',
      (set) => {
        set.frames.idle0.pixels[0] = 'g'.repeat(18)
      },
    ],
    [
      'missing referenced frame',
      (set) => {
        delete set.frames.idle0
      },
    ],
    [
      'missing required animation',
      (set) => {
        delete set.animations.light
      },
    ],
    ...['light', 'heavy', 'sweep', 'airLight', 'airHeavy', 'special', 'dash'].flatMap((name) =>
      [1, 2].map((count) => [
        `${name} has only ${count} attack phases`,
        (set) => {
          set.animations[name].frames = set.animations[name].frames.slice(0, count)
        },
      ]),
    ),
    [
      'zero duration',
      (set) => {
        set.animations.idle.frames[0].duration = 0
      },
    ],
    [
      'fractional duration',
      (set) => {
        set.animations.idle.frames[0].duration = 1.5
      },
    ],
    [
      'infinite duration',
      (set) => {
        set.animations.idle.frames[0].duration = Infinity
      },
    ],
    [
      'invalid step anchor',
      (set) => {
        set.animations.idle.frames[0].anchor.x = NaN
      },
    ],
    [
      'negative box',
      (set) => {
        set.animations.light.frames[1].hitboxes[0].w = -1
      },
    ],
    [
      'infinite box',
      (set) => {
        set.animations.light.frames[1].hitboxes[0].x = Infinity
      },
    ],
    [
      'non-array boxes',
      (set) => {
        set.animations.idle.frames[0].hurtboxes = {}
      },
    ],
  ]
  for (const [name, edit] of invalid) {
    const custom = character()
    edit(custom)
    assert.throws(
      () => factory({ roster: ['custom', 'custom'], assets: { custom } }),
      /fighter:/,
      name,
    )
  }
  const maximum = character()
  maximum.frames.idle0.layers = Array(8).fill(plane.layers[0])
  assert.doesNotThrow(() => factory({ roster: ['custom', 'custom'], assets: { custom: maximum } }))
})
