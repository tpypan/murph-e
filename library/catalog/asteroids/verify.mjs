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
    splits = []
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
    onRockSplit: (e, api) => {
      splits.push(e)
      c.onRockSplit?.(e, api)
    },
  })
  game.init(api)
  return {
    game,
    api,
    held,
    score,
    events,
    splits,
    step(n = 1) {
      for (let i = 0; i < n; i++) game.update(api, 1 / 60)
    },
  }
}
function delta(a, b, n) {
  return ((a - b + n * 1.5) % n) - n / 2
}
function control(r) {
  const s = r.game.inspect()
  for (const p of s.people) {
    const h = r.held[p.id]
    h.clear()
    if (p.lives <= 0 || p.dead) continue
    h.add('down')
    const candidates = s.rocks
      .slice()
      .sort((a, b) => r.game.distanceBetween(p, a) - r.game.distanceBetween(p, b))
    const target = candidates[p.id % candidates.length]
    if (!target) continue
    const dist = r.game.distanceBetween(p, target),
      lead = dist / 235,
      dx = delta(target.x + target.vx * lead, p.x, 256),
      dy = delta(target.y + target.vy * lead, p.y, 200),
      angle = Math.atan2(dx, -dy),
      diff = delta(angle, p.angle, Math.PI * 2)
    if (diff > 0.045) h.add('right')
    else if (diff < -0.045) h.add('left')
    if (Math.abs(diff) < 0.15) h.add('a')
    if (
      (s.rocks.some((a) => r.game.distanceBetween(p, a) < a.radius + 28) ||
        s.hostile.some((b) => r.game.distanceBetween(p, b) < 35) ||
        (s.saucer && s.saucer.warn <= 0 && r.game.distanceBetween(p, s.saucer) < 40)) &&
      p.warpT === 0
    )
      h.add('b')
  }
}
function auto(r, n) {
  for (let i = 0; i < n; i++) {
    control(r)
    r.step()
    if (['won', 'lost'].includes(r.game.inspect().phase)) break
  }
}
test('79 original orientation, thrust, rock, saucer and explosion frames are complete', () => {
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
    for (const c of Object.values(s.animations))
      for (const key of c.frames) { assert.ok(s.frames[key]); assert.equal(s.frames[key].durationMs, c.frameMs) }
  }
  assert.equal(count, 79)
})
test('rotation, thrust, retained inertia, braking and 2P independence', () => {
  const r = run({ players: 2 })
  r.held[1].add('up')
  r.held[1].add('right')
  r.step(45)
  const a = r.game.inspect().people
  assert.equal(a[0].angle, 0)
  assert.ok(a[1].angle > 2)
  assert.ok(Math.hypot(a[1].vx, a[1].vy) > 40)
  r.held[1].clear()
  r.step(30)
  const b = r.game.inspect().people[1]
  assert.ok(Math.hypot(b.vx, b.vy) > 30)
  r.held[1].add('down')
  r.step(50)
  assert.ok(Math.hypot(r.game.inspect().people[1].vx, r.game.inspect().people[1].vy) < 10)
})
test('wrapped geometry crosses both seams and ship stays in playfield under thrust', () => {
  const r = run()
  assert.equal(r.game.distanceBetween({ x: 1, y: 25 }, { x: 255, y: 223 }), Math.hypot(2, 2))
  r.held[0].add('up')
  let wrapped = false,
    previous = r.game.inspect().people[0].y
  for (let i = 0; i < 160; i++) {
    r.step()
    const p = r.game.inspect().people[0]
    assert.ok(p.x >= 0 && p.x < 256 && p.y >= 24 && p.y < 224)
    if (Math.abs(p.y - previous) > 180) wrapped = true
    previous = p.y
  }
  assert.ok(wrapped)
})
test('projectile lifetime/fire cooldown cap shots; warp is safe and rate-limited', () => {
  const r = run()
  r.held[0].add('a')
  r.held[0].add('b')
  r.step(60)
  const s = r.game.inspect()
  assert.equal(s.stats.warps, 1)
  assert.ok(s.people[0].warpT > 4.9)
  assert.ok(s.shots.length <= 8)
  r.held[0].clear()
  r.step(70)
  assert.equal(r.game.inspect().shots.length, 0)
})
test('real bullet hits split large into two medium, then small, with single event scoring', () => {
  const r = run({ waves: 1, lives: 8 })
  auto(r, 5000)
  assert.ok(r.splits.some((e) => e.size === 3 && e.children === 2 && e.value === 20))
  assert.ok(r.splits.some((e) => e.size === 2 && e.children === 2 && e.value === 50))
  assert.ok(r.splits.some((e) => e.size === 1 && e.children === 0 && e.value === 100))
  assert.ok(r.game.inspect().rocks.length <= 56)
})
test('real-input pilot clears all three default sectors with default lives and terminal win; reset clean', () => {
  const r = run({ waves: 3, lives: 3 })
  auto(r, 40000)
  const s = r.game.inspect()
  assert.equal(
    s.phase,
    'won',
    JSON.stringify({ wave: s.wave, stats: s.stats, people: s.people, rocks: s.rocks.length }),
  )
  assert.equal(s.stats.waves, 3)
  assert.equal(r.events[0].type, 'win')
  assert.ok(r.score[0] > 3000)
  r.game.init(r.api)
  assert.equal(r.score[0], 0)
  assert.equal(r.game.inspect().wave, 1)
})
test('co-op team clear, saucer telegraph and authoritative player count', () => {
  const r = run({ players: 2, waves: 3 })
  auto(r, 22000)
  assert.equal(r.game.inspect().phase, 'won')
  assert.equal(r.events[0].p, undefined)
  assert.ok(r.score[0] > 0 && r.score[1] > 0)
  assert.equal(run({ players: 2, apiPlayers: 1 }).game.inspect().people.length, 1)
  const u = run({ lives: 8 })
  let warning = false,
    active = false
  for (let i = 0; i < 1000; i++) {
    u.step()
    const s = u.game.inspect()
    warning ||= s.saucer?.warn > 0
    active ||= s.saucer?.warn <= 0
  }
  assert.ok(warning && active)
})
test('actual no-input collision reaches loss; same controls replay deterministically', () => {
  const r = run({ lives: 1 })
  r.step(22000)
  assert.equal(r.game.inspect().phase, 'lost')
  assert.ok(r.game.inspect().stats.hits === 1)
  const a = run(),
    b = run()
  auto(a, 800)
  auto(b, 800)
  assert.deepEqual(a.game.inspect(), b.game.inspect())
  assert.throws(
    () => run({ assets: { ship: { width: 26, height: 26, animations: {} } } }),
    /Missing animation/,
  )
})
writeFileSync(
  join(dir, 'behavior-results.json'),
  JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + '\n',
)
if (results.some((r) => !r.ok)) process.exitCode = 1
