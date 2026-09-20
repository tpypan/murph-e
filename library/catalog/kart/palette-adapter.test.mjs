import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
const factory = new Function('return (' + readFileSync(new URL('./module.js', import.meta.url), 'utf8') + ')')()
const poses = ['idle', 'drive', 'steerLeft', 'steerRight', 'driftLeft', 'driftRight', 'boost', 'crash']
const palette = ['#000000', '#ABCDEF', '#FE5432']
function asset() {
  return { id: 'test', sourceWidth: 8, displayWidth: 8,
    frames: { a: { pixels: ['..1111..', '.100001.', '12000021', '22222222'], anchor: { x: 4, y: 4 }, palette },
      b: { pixels: ['...1111...', '..100001..', '.12000021.', '2222222222', '.22222222.', '..222222..'], anchor: { x: 5, y: 6 }, palette } },
    animations: Object.fromEntries(poses.map(p => [p, { frames: ['a', 'b'], frameMs: 100 }])) }
}
function run(config = {}, players = 1) {
  const held = [new Set(), new Set()], scores = [0, 0], calls = [], terminal = []
  const api = { players, btn: (b, p = 0) => held[p].has(b), btnp: () => false,
    score: (n, p = 0) => scores[p] = n, addScore: (n, p = 0) => scores[p] += n, getScore: (p = 0) => scores[p],
    textWidth: s => s.length * 8, sfx: () => {}, tone: () => {}, win: p => terminal.push(['win', p]), gameOver: () => terminal.push(['loss']) }
  for (const name of ['cls', 'rectfill', 'pset', 'line', 'text']) api[name] = () => {}
  api.spr = (...args) => calls.push(args)
  const game = factory(config); game.init(api)
  return { game, api, held, scores, calls, terminal, step(n = 1) { for (let i = 0; i < n; i++) game.update(api, 1 / 60) }, draw() { calls.length = 0; game.draw(api); return calls } }
}
function custom(set = asset()) { return { assets: { vehicles: [set] }, drivers: Array.from({ length: 6 }, () => ({ asset: set.id })) } }

test('validates every rectangle, palette index, anchor and required pose before rendering', () => {
  for (const [modify, match] of [
    [s => s.frames.a.pixels[1] = '.100001', /rectangular/],
    [s => s.frames.a.pixels[1] = '.1f0001.', /palette/],
    [s => s.frames.a.palette = ['red'], /palette/],
    [s => s.frames.a.anchor.y = 5, /anchor/],
    [s => delete s.animations.crash, /animation crash/],
    [s => s.frames.a.durationMs = NaN, /duration/],
    [s => s.sourceWidth = 0, /width/],
    [s => s.displayWidth = 65, /width/],
  ]) { const set = asset(); modify(set); assert.throws(() => run(custom(set)), match) }
  const cfg = custom(); cfg.drivers[0].asset = 'missing'; assert.throws(() => run(cfg), /Unknown kart vehicle asset/)
  const tall = asset(); tall.frames.a.pixels = Array(224).fill('11111111'); tall.frames.a.anchor.y = 224
  assert.throws(() => run(custom(tall)), /exceeds 256x224/)
})

test('custom colors remain exact and shared pose pixels use a stable source scale and ground anchor', () => {
  const set = asset(); set.frames.b.durationMs = 200
  const r = run(custom(set)); r.step(); const first = r.draw().at(-1)
  assert.deepEqual(first[5], palette); assert.equal(first[0][0].length, 12); assert.equal(first[0].length, 6)
  assert.equal(first[2] + first[0].length, 219)
  assert.ok(first[0].some(row => row.includes('0')), 'opaque source index zero preserved')
  r.step(6); const second = r.draw().at(-1)
  assert.equal(second[0][0].length, 16); assert.equal(second[0].length, 9)
  assert.equal(second[2] + second[0].length, 219)
  r.step(7); assert.equal(r.draw().at(-1)[0], second[0], 'per-frame duration and cached raster remain stable')
})

test('destination sampling produces exact nearest pixels and reuses cached raster and palette identities', () => {
  const r = run(custom()); r.step(); const first = r.draw().at(-1), repeat = r.draw().at(-1)
  assert.equal(repeat[0], first[0]); assert.equal(repeat[5], first[5])
  const source = asset().frames.a.pixels
  for (let y = 0; y < first[0].length; y++) for (let x = 0; x < first[0][0].length; x++) {
    assert.equal(first[0][y][x], source[Math.floor((y + .5) * 4 / 6)][Math.floor((x + .5) * 8 / 12)])
  }
})

test('tall custom art is clipped to each 2P viewport, preserving split line and top cabinet HUD', () => {
  const set = asset(); set.sourceWidth = 4; set.displayWidth = 4
  set.frames = { a: { pixels: Array(140).fill('0112'), anchor: { x: 2, y: 140 }, palette } }
  for (const pose of poses) set.animations[pose].frames = ['a']
  const r = run(custom(set), 2); r.step(); const calls = r.draw()
  assert.ok(calls.length >= 200, 'clipped tall cars use cached individual rows')
  for (const [pixels, , y] of calls) assert.ok(y >= 12 && y + pixels.length <= 117 || y >= 119 && y + pixels.length <= 224)
  const firstRow = calls[0][0], repeat = r.draw(); assert.equal(repeat[0][0], firstRow)
})

test('roadside asset slots forward their own palettes through projected depth-ordered sprites', () => {
  const sign = asset(); sign.id = 'sign'; sign.frames.a.palette = ['#010203', '#040506', '#070809']
  sign.frames.b.palette = sign.frames.a.palette
  const r = run({ assets: { roadside: { palm: sign, sign, billboard: sign } } }); r.step()
  const signs=r.draw().filter(c=>c[5]?.length===3)
  assert.ok(signs.length > 3)
  for(const call of signs)assert.deepEqual(call[5],sign.frames.a.palette)
  assert.ok(r.calls.some(c=>c[5]?.length===16), 'environment has its own independent palette')
})

test('art changes never alter independent controls, full race gates, scoring or reset state', () => {
  for (const players of [1, 2]) {
    const base = run({ laps: 1 }, players), skin = run({ ...custom(), laps: 1 }, players)
    for (let frame = 0; frame < 6500; frame++) {
      const state = base.game.inspect()
      for (const c of state.racers.filter(c => c.human)) {
        const wanted = -c.x * 2 + c.curve * .6
        for (const r of [base, skin]) { const keys = r.held[c.id]; keys.clear(); keys.add('a');
          if (wanted > .035) keys.add('right'); else if (wanted < -.035) keys.add('left')
          if (Math.abs(c.curve) > .3 && frame % 110 < 75) keys.add('b') }
      }
      base.step(); skin.step()
      if (frame % 90 === 0) { assert.deepEqual(skin.game.inspect(), base.game.inspect()); skin.draw() }
      if (base.game.inspect().phase === 'finished') break
    }
    assert.equal(base.game.inspect().phase, 'finished'); assert.deepEqual(skin.game.inspect(), base.game.inspect())
    assert.deepEqual(skin.terminal, base.terminal); assert.deepEqual(skin.scores, base.scores)
    skin.game.init(skin.api); assert.equal(skin.game.inspect().phase, 'countdown'); assert.deepEqual(skin.scores, [0, 0])
  }
})
