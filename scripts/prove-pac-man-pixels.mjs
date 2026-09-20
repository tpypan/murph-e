// Native renderer proof, using the actual built runtime and private source pixels.
// Run from repository root:
// pnpm --filter @htn/probe exec node --import tsx ../../scripts/prove-pac-man-pixels.mjs
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { normalizeSpriteSet } from '../packages/harness/src/sprite-catalog.ts'

const root = resolve(import.meta.dirname, '..')
const cache = join(root, 'data/reference-cache/spriters-resource/pac-man')
const pack = join(root, 'data/local-catalog/pac-man-maze-reference')
const out = join(pack, 'verification')
mkdirSync(out, { recursive: true })
const require = createRequire(join(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const hash = data => createHash('sha256').update(data).digest('hex')
const json = path => JSON.parse(readFileSync(path, 'utf8'))
const configPath = join(cache, 'maze-config.json')
const assetsPath = join(pack, 'assets.json')
const config = json(configPath)
const sourceAssets = json(join(cache, 'source-assets.json'))
const packedAssets = json(assetsPath)
const raw = packedAssets.sets['pac-man-actors']
assert.deepEqual(raw, sourceAssets.sets['pac-man-actors'], 'Private pack changed source set')
assert.deepEqual(raw.frames, config.assets.frames)
assert.deepEqual(raw.animations, config.assets.animations)
const normalized = normalizeSpriteSet(raw, {
  packId: 'pac-man-maze-reference', sourcePath: assetsPath, status: 'draft',
})
const entries = Object.entries(normalized.frames)
assert.equal(entries.length, 64)
assert.equal(Object.keys(normalized.animations).length, 36)

// Decode source PNGs independently of the importer. Return both the exact
// source rectangle and the saved untouched crop; do not trust generated alpha.
const decoded = JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
from pathlib import Path
import json,base64,sys
root=Path(sys.argv[1]); data=json.loads((root/'source-assets.json').read_text())
source=Image.open(root/'52631.png').convert('RGBA'); result={}
for key,frame in data['sets']['pac-man-actors']['frames'].items():
 x,y,w,h=frame['source']['rect']
 crop=source.crop((x,y,x+w,y+h)); saved=Image.open(root/'frames/source-crops'/f'{key}.png').convert('RGBA')
 result[key]={'source':base64.b64encode(crop.tobytes()).decode(),'saved':base64.b64encode(saved.tobytes()).decode(),'size':list(saved.size)}
print(json.dumps(result))
`, cache], { maxBuffer: 4 * 1024 * 1024 }).toString())

const rgba = hex => [...Buffer.from(hex.slice(1), 'hex'), 255]
const background = [rgba('#1d2b53'), rgba('#5f574f')]
const equalPixel = (a, b) => a.length === b.length && a.every((value, i) => value === b[i])
const sourceChecks = []
const expectedFrames = new Map()
let sourceComparisons = 0
for (const [id, f] of entries) {
  assert.deepEqual(decoded[id].size, [16, 16])
  const source = Buffer.from(decoded[id].source, 'base64')
  const saved = Buffer.from(decoded[id].saved, 'base64')
  assert.deepEqual(source, saved, `${id}: untouched crop differs from atlas`)
  const black = index => equalPixel([...source.subarray(index * 4, index * 4 + 4)], [0, 0, 0, 255])
  const exterior = new Set(), queue = []
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const at = y * 16 + x
    if ((x === 0 || x === 15 || y === 0 || y === 15) && black(at)) {
      exterior.add(at); queue.push(at)
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const at = queue[q], x = at % 16, y = Math.floor(at / 16)
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = x + dx, ny = y + dy, next = ny * 16 + nx
      if (nx < 0 || nx > 15 || ny < 0 || ny > 15 || exterior.has(next) || !black(next)) continue
      exterior.add(next); queue.push(next)
    }
  }
  const pixels = []
  let opaque = 0, transparent = 0, opaqueBlack = 0
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const at = y * 16 + x, char = f.pixels[y][x]
    const expected = exterior.has(at) ? null : [...source.subarray(at * 4, at * 4 + 4)]
    const encoded = char === '.' ? null : rgba(f.palette[parseInt(char, 16)])
    assert.deepEqual(encoded, expected, `${id}: normalized/source pixel ${x},${y}`)
    pixels.push(expected)
    if (expected) { opaque++; if (black(at)) opaqueBlack++ } else transparent++
    sourceComparisons++
  }
  expectedFrames.set(id, pixels)
  sourceChecks.push({ id, sourceRect: f.source.rect, size: [16, 16], opaque, transparent, opaqueBlack,
    sourceCropSha256: hash(saved), palette: f.palette, exactNormalizedMatch: true })
}

// These invariants document reviewed source order without claiming ROM timing.
const clipReview = []
for (let player = 0; player < 2; player++) {
  for (const dir of ['right', 'down', 'left', 'up']) {
    const name = `chomper-${player}-${dir}`, clip = normalized.animations[name]
    assert.deepEqual(clip.steps.map(s => s.frame), [2, 1, 0, 1].map(i => `pacman-${dir}-${i}`))
    clipReview.push({ clip: name, durationTicks: 16, order: 'closed, narrow, wide, narrow', authored: true })
  }
  const death = normalized.animations[`chomper-${player}-death`]
  assert.deepEqual(death.steps.map(s => s.frame), [...Array.from({ length: 11 }, (_, i) => `pacman-death-${i}`), 'pacman-blank-hold'])
  assert.equal(death.steps.reduce((n, s) => n + s.durationTicks, 0), 72)
  assert.equal(death.loop, false)
  clipReview.push({ clip: `chomper-${player}-death`, durationTicks: 72, order: '11 collapse/burst source poses then blank hold', authored: true })
}
for (let g = 0; g < 4; g++) {
  const clip = normalized.animations[`reform-${g}`]
  assert.deepEqual(clip.steps.map(s => s.frame), ['eyes-up', `ghost-${g}-up-0`, `ghost-${g}-up-1`])
  assert.equal(clip.steps.reduce((n, s) => n + s.durationTicks, 0), 45)
  assert.ok(clip.steps.every(s => !s.hitboxes.length && !s.hurtboxes.length))
  clipReview.push({ clip: `reform-${g}`, durationTicks: 45, order: 'eyes then body gait pair; no recovered original tween', authored: true })
}

const positions = entries.map(([id, f], i) => ({ id, f, x: 16 + (i % 8) * 30, y: 24 + Math.floor(i / 8) * 24 }))
const spriteData = positions.map(({ id, f, x, y }) => ({ id, rows: f.pixels, palette: f.palette, x, y }))
const makeCode = inverted => `const SPRITES=${JSON.stringify(spriteData)};
function init(){} function update(){}
function draw(api){
  api.cls(0);
  for(const s of SPRITES){
    for(let y=0;y<16;y++)for(let x=0;x<16;x++)api.pset(s.x+x,s.y+y,((x+y+${inverted})%2)?5:1);
    api.spr(s.rows,s.x,s.y,false,false,s.palette);
  }
  api.pset(248,210,5);api.pset(249,210,5);
  api.spr(['0.'],248,210,false,false,['#000000']);
}`
const browser = await chromium.launch()
const passes = [], perFrame = Object.fromEntries(entries.map(([id]) => [id, { opaque: 0, transparent: 0, mismatches: [] }]))
let runtimeComparisons = 0
try {
  const page = await browser.newPage()
  await page.goto('file://' + join(root, 'packages/runtime/index.html') + '?probe=1')
  for (const inverted of [0, 1]) {
    const code = makeCode(inverted)
    const result = await page.evaluate(code => {
      const loaded = window.__probe.load(code, 1, '', 1)
      window.__probe.start()
      const state = window.__probe.step(1)
      const pixels = new Uint32Array(256 * 224)
      window.__runtime.screen.blit(pixels)
      return { loaded, state, rgba: Array.from(pixels), hash: window.__probe.frameHash(),
        png: window.__probe.snapshot(), errors: window.__probe.errors() }
    }, code)
    assert.equal(result.loaded.ok, true)
    assert.deepEqual(result.errors, [])
    assert.equal(result.state.state, 'playing')
    for (const { id, x, y } of positions) {
      const expected = expectedFrames.get(id)
      for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) {
        const source = expected[yy * 16 + xx]
        const target = source || background[(xx + yy + inverted) % 2]
        const packed = result.rgba[(y + yy) * 256 + x + xx]
        const actual = [packed & 255, (packed >>> 8) & 255, (packed >>> 16) & 255, packed >>> 24]
        assert.deepEqual(actual, target, `${id}: native RGBA ${xx},${yy}, background ${inverted}`)
        perFrame[id][source ? 'opaque' : 'transparent']++
        runtimeComparisons++
      }
    }
    assert.equal(result.rgba[210 * 256 + 248], 0xff000000, 'Opaque custom black must draw')
    assert.equal(result.rgba[210 * 256 + 249], 0xff4f575f, 'Transparent dot must retain backdrop')
    const filename = `pixels-native-${inverted}.png`
    writeFileSync(join(out, filename), Buffer.from(result.png.split(',')[1], 'base64'))
    passes.push({ checkerOffset: inverted, frameHash: result.hash, image: filename, imageSha256: hash(readFileSync(join(out, filename))), errors: result.errors, codeSha256: hash(code), opaqueBlackFixture: true, transparentDotFixture: true })
  }
} finally {
  await browser.close()
}

const proof = {
  at: new Date().toISOString(), passed: true,
  method: 'Decode atlas/crops independently with Pillow, recompute border-connected black mask, compare normalized catalogue data, then draw every frame with actual runtime api.spr and compare screen.blit RGBA over two checker backdrops. No substituted renderer or gameplay state mutation.',
  scope: 'Native sprite rendering and clip semantics only; full gameplay and wrapper defaults require separate input replay evidence.',
  hashes: {
    source: hash(readFileSync(join(cache, '52631.png'))), config: hash(readFileSync(configPath)),
    packAssets: hash(readFileSync(assetsPath)), privateFactory: hash(readFileSync(join(pack, 'module.js'))),
    runtime: hash(readFileSync(join(root, 'packages/runtime/runtime.js'))), script: hash(readFileSync(import.meta.filename)),
  },
  frames: entries.length, clips: Object.keys(normalized.animations).length,
  sourcePixelComparisons: sourceComparisons, runtimePixelComparisons: runtimeComparisons,
  sourceChecks, nativeChecks: perFrame, passes, clipReview,
  limitations: ['Transparency is an authored border-connected mask on an opaque PNG.', 'No original ROM timing or physics claim.', 'No physical CRT or human gameplay evaluation.'],
}
writeFileSync(join(out, 'pixels.json'), JSON.stringify(proof, null, 2) + '\n')
console.log(JSON.stringify({ passed: true, frames: entries.length, sourcePixelComparisons: sourceComparisons,
  runtimePixelComparisons: runtimeComparisons, output: join(out, 'pixels.json') }))
