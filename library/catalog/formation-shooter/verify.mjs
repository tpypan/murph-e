import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = dirname(fileURLToPath(import.meta.url)),
  factory = new Function('return (' + readFileSync(join(dir, 'module.js'), 'utf8') + ')')(),
  results = []
function test(name, f) {
  try {
    f()
    results.push({ name, ok: true })
    console.log('PASS ' + name)
  } catch (e) {
    results.push({ name, ok: false, error: e.message })
    console.log('FAIL ' + name + ': ' + e.message)
  }
}
function run(c = {}) {
  const held = [new Set(), new Set()],
    score = [0, 0],
    events = [],
    kills = []
  const api = {
    players: c.apiPlayers ?? c.players ?? 1,
    btn: (b, p = 0) => held[p].has(b),
    score: (n, p = 0) => (score[p] = n),
    getScore: (p = 0) => score[p],
    addScore: (n, p = 0) => (score[p] += n),
    sfx: () => {},
    win: (p) => events.push({ type: 'win', p }),
    gameOver: () => events.push({ type: 'gameOver' }),
    textWidth: (s) => s.length * 8,
  }
  for (const k of [
    'cls',
    'pset',
    'line',
    'rect',
    'rectfill',
    'circ',
    'circfill',
    'spr',
    'text',
    'textCenter',
  ])
    api[k] = () => {}
  const game = factory({
    ...c,
    onKill: (e, api) => {
      kills.push(e)
      c.onKill?.(e, api)
    },
  })
  game.init(api)
  return {
    game,
    api,
    held,
    score,
    events,
    kills,
    step(n = 1) {
      for (let i = 0; i < n; i++) game.update(api, 1 / 60)
    },
  }
}
function control(r) {
  const s = r.game.inspect()
  for (const p of s.people) {
    const h = r.held[p.id]
    h.clear()
    if (p.dead || p.lives <= 0) continue
    h.add('a')
    const candidates = s.aliens.filter((a) => a.mode !== 'return')
    if (!candidates.length) continue
    candidates.sort(
      (a, b) =>
        Math.abs(a.x - p.x) + (204 - a.y) * 0.08 - (Math.abs(b.x - p.x) + (204 - b.y) * 0.08),
    )
    const target = candidates[p.id % candidates.length]
    let x = target.x + (target.mode === 'march' ? s.formation.dir * 4 : 0)
    const threat = s.enemyShots.find((b) => b.y > 140 && b.y < 216 && Math.abs(b.x - p.x) < 16)
    if (threat) {
      x = p.x + (p.x < threat.x ? -32 : 32)
      if (p.shieldT === 0) h.add('b')
    }
    if (Math.abs(p.x - x) > 3) h.add(p.x < x ? 'right' : 'left')
  }
}
function auto(r, n) {
  for (let i = 0; i < n; i++) {
    control(r)
    r.step()
    if (['won', 'lost'].includes(r.game.inspect().phase)) break
  }
}
test('all 30 original frames have valid clips, pixels, timing and anchors', () => {
  const a = JSON.parse(readFileSync(join(dir, 'assets.json'), 'utf8'))
  let count = 0
  for (const s of Object.values(a.sets)) {
    for (const f of Object.values(s.frames)) {
      count++
      assert.equal(f.pixels.length, s.height)
      for (const row of f.pixels) {
        assert.equal(row.length, s.width)
        assert.match(row, /^[0-9a-f.]+$/)
      }
      assert.ok(f.durationMs > 0)
    }
    for (const clip of Object.values(s.animations))
      for (const key of clip.frames) { assert.ok(s.frames[key]); assert.equal(s.frames[key].durationMs, clip.frameMs) }
  }
  assert.equal(count, 30)
})
test('independent player controls, shot bounds and shield recharge', () => {
  const r = run({ players: 2 })
  r.held[1].add('right')
  r.held[1].add('a')
  r.held[1].add('b')
  r.step(30)
  let s = r.game.inspect()
  assert.equal(s.people[0].x, 83)
  assert.ok(s.people[1].x > 200)
  assert.ok(s.people[1].shield > 0 && s.people[1].shieldT > 5)
  assert.ok(s.shots.length > 0 && s.shots.every((b) => b.player === 1))
  r.step(180)
  s = r.game.inspect()
  assert.ok(s.shots.length <= 8)
  assert.ok(s.people[1].shield === 0 && s.people[1].shieldT > 1)
})
test('own fire persistently excavates destructible shields', () => {
  const r = run()
  r.held[0].add('left')
  r.step(18)
  r.held[0].clear()
  const before = r.game.inspect().shields.reduce((n, s) => n + s.cells, 0)
  r.held[0].add('a')
  r.step(80)
  const after = r.game.inspect()
  assert.ok(after.shields.reduce((n, s) => n + s.cells, 0) < before)
  assert.ok(after.stats.shieldCells > 0)
})
test('dives warn first, remain bounded and UFO announces before appearing', () => {
  const r = run({ lives: 8 })
  let warn = false,
    dive = false,
    ufoWarn = false,
    ufoLive = false
  for (let i = 0; i < 1100; i++) {
    r.step()
    const s = r.game.inspect()
    warn ||= s.aliens.some((a) => a.mode === 'warn')
    dive ||= s.aliens.some((a) => a.mode === 'dive')
    ufoWarn ||= s.ufo?.warn > 0
    ufoLive ||= s.ufo?.warn <= 0
    assert.ok(s.aliens.filter((a) => a.mode === 'dive' || a.mode === 'warn').length <= 2)
    assert.ok(s.enemyShots.length <= 12)
  }
  assert.ok(warn && dive && ufoWarn && ufoLive)
})
test('real-input pilot clears all three default waves, scores each enemy once and resets', () => {
  const r = run({ waves: 3, lives: 3 })
  auto(r, 30000)
  const s = r.game.inspect()
  assert.equal(s.phase, 'won')
  assert.equal(s.stats.waves, 3)
  assert.equal(r.events[0].type, 'win')
  assert.equal(new Set(r.kills.map((k) => k.enemy)).size, r.kills.length)
  assert.ok(r.kills.length >= 90)
  assert.ok(r.score[0] > 4000)
  r.game.init(r.api)
  assert.equal(r.score[0], 0)
  assert.equal(r.game.inspect().wave, 1)
  assert.equal(r.game.inspect().stats.kills, 0)
})
test('co-op clear and authoritative player count', () => {
  const r = run({ players: 2, waves: 3 })
  auto(r, 18000)
  assert.equal(r.game.inspect().phase, 'won')
  assert.equal(r.events[0].p, undefined)
  assert.ok(r.score[0] > 0 && r.score[1] > 0)
  assert.equal(run({ players: 2, apiPlayers: 1 }).game.inspect().people.length, 1)
})
test('no-input hazards reach a real loss; replay and invalid art are checked', () => {
  const r = run({ lives: 1 })
  r.step(20000)
  assert.equal(r.game.inspect().phase, 'lost')
  assert.equal(r.events.length, 1)
  const a = run(),
    b = run()
  auto(a, 900)
  auto(b, 900)
  assert.deepEqual(a.game.inspect(), b.game.inspect())
  assert.throws(
    () => run({ assets: { ship: { width: 18, height: 20, animations: {} } } }),
    /Missing animation/,
  )
})
writeFileSync(
  join(dir, 'behavior-results.json'),
  JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + '\n',
)
if (results.some((r) => !r.ok)) process.exitCode = 1
