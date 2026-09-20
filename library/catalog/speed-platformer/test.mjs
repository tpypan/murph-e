import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { drive, harness } from './harness.mjs'

test('independent immediate controls accelerate, skid, reverse and backtrack', () => {
  const h = harness(2)
  h.keys(1, 'right')
  h.step(25)
  const s = h.game.inspect()
  assert.equal(s.people[0].x, 60)
  assert.ok(s.people[1].x > 90)
  assert.ok(s.people[1].vx > 3)
  h.keys(1, 'left')
  h.step(4)
  assert.equal(h.game.inspect().people[1].animation, 'skid')
  h.step(60)
  assert.ok(h.game.inspect().people[1].vx < 0)
})
test('jump hold raises apex and releasing limits ascent', () => {
  function height(n) {
    const h = harness()
    h.keys(0, 'a')
    let min = 180
    for (let i = 0; i < 65; i++) {
      if (i === n) h.keys(0)
      h.step()
      min = Math.min(min, h.game.inspect().people[0].y)
    }
    assert.equal(h.game.inspect().people[0].grounded, true)
    return 180 - min
  }
  assert.ok(height(30) > height(2) + 20)
})
test('charged release has speed and roll while neutral input never auto-scrolls', () => {
  const h = harness()
  h.step(100)
  assert.equal(h.game.inspect().people[0].x, 60)
  h.keys(0, 'down', 'b')
  h.step(40)
  assert.equal(h.game.inspect().people[0].x, 60)
  h.keys(0)
  h.step()
  assert.ok(h.game.inspect().people[0].vx > 8)
  assert.equal(h.game.inspect().people[0].roll, true)
})
test('real inputs finish two varied acts and produce one terminal event', () => {
  const h = harness()
  for (let i = 0; i < 5000 && h.game.inspect().phase === 'play'; i++) {
    drive(h)
    h.step()
  }
  const s = h.game.inspect()
  assert.equal(s.phase, 'complete', JSON.stringify(s.people[0]))
  assert.equal(s.people[0].stats.acts, 2)
  assert.ok(s.people[0].stats.springs > 0)
  assert.ok(s.people[0].score > 2000)
  assert.deepEqual(h.events, [{ type: 'win', player: undefined }])
  h.step(100)
  assert.equal(h.events.length, 1)
})
test('second controller independently races both acts while first stays idle', () => {
  const h = harness(2)
  for (let i = 0; i < 5000 && h.game.inspect().phase === 'play'; i++) {
    drive(h, 1)
    h.step()
  }
  const s = h.game.inspect()
  assert.equal(s.phase, 'complete')
  assert.equal(s.winner, 1)
  assert.equal(s.people[0].x, 60)
  assert.equal(h.scores[0], 0)
  assert.deepEqual(h.events, [{ type: 'win', player: 1 }])
})
test('inspect is detached and reset restores the initial course state and score', () => {
  const h = harness()
  h.keys(0, 'right')
  h.step(100)
  const s = h.game.inspect()
  s.people[0].x = 999
  s.acts[0].terrain[0][1] = 999
  assert.notEqual(h.game.inspect().people[0].x, 999)
  assert.equal(h.game.inspect().acts[0].terrain[0][1], 180)
  h.game.init(h.api)
  assert.equal(h.game.inspect().people[0].x, 60)
  assert.equal(h.scores[0], 0)
})

test('physical loop follows a circle, loses uphill speed, regains downhill speed and exits', () => {
  const h = harness()
  h.keys(0, 'right', 'down')
  let entered = false,
    atTop = false,
    start = 0,
    minimum = 99
  for (let i = 0; i < 350; i++) {
    h.step()
    const s = h.game.inspect(),
      p = s.people[0]
    if (p.loop) {
      const l = s.acts[0].loops[p.loop.index]
      assert.ok(Math.abs(Math.hypot(p.x - l.x, p.y - l.y) - l.r) < 1e-8)
      if (!entered) {
        entered = true
        start = p.loop.speed
      }
      minimum = Math.min(minimum, p.loop.speed)
      if (p.y < l.y - l.r + 3) atTop = true
    }
    if (p.stats.loops) {
      assert.ok(entered && atTop)
      assert.ok(minimum < start - 1)
      assert.ok(p.vx > minimum + 1)
      assert.equal(p.grounded, true)
      return
    }
  }
  assert.fail('held right+roll must traverse the real loop')
})
test('jump detaches from a traversed loop without teleporting', () => {
  const h = harness()
  h.keys(0, 'right', 'down')
  for (let i = 0; i < 350 && !h.game.inspect().people[0].loop; i++) h.step()
  h.step(8)
  const before = h.game.inspect().people[0]
  assert.ok(before.loop)
  h.keys(0, 'a')
  h.step()
  const after = h.game.inspect().people[0]
  assert.equal(after.loop, null)
  assert.equal(after.grounded, false)
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 15)
})
test('rings scatter once on damage, recovery works, and invulnerability prevents repeated hits', () => {
  const h = harness()
  h.keys(0, 'right')
  for (let i = 0; i < 200 && !h.game.inspect().people[0].stats.hits; i++) h.step()
  const hit = h.game.inspect().people[0]
  assert.equal(hit.stats.hits, 1)
  assert.equal(hit.rings, 0)
  assert.ok(hit.scatter.length > 0)
  assert.equal(hit.lives, 3)
  h.keys(0)
  h.step(110)
  const after = h.game.inspect().people[0]
  assert.equal(after.stats.hits, 1)
  assert.ok(after.stats.recovered > 0)
  assert.ok(after.rings > 0)
})
test('rolling downhill gains momentum and rendered frames do not advance simulation', () => {
  const h = harness()
  h.keys(0, 'right', 'down')
  for (let i = 0; i < 200 && h.game.inspect().people[0].x < 255; i++) h.step()
  const speed = h.game.inspect().people[0].vx
  h.keys(0, 'down')
  h.step(10)
  assert.ok(h.game.inspect().people[0].vx > speed)
  const before = h.game.inspect()
  h.game.draw(h.api)
  h.game.draw(h.api)
  assert.deepEqual(h.game.inspect(), before)
})
test('custom hero palettes/layers stay exact, optional poses work and malformed art rejects', () => {
  const hero = JSON.parse(readFileSync(resolve(import.meta.dirname, 'assets.json'), 'utf8')).hero
  const exact = structuredClone(hero),
    palette = Array.from({ length: 16 }, (_, i) => '#1234' + i.toString(16).padStart(2, '0'))
  for (const frame of Object.values(exact.frames)) {
    frame.palette = palette
    frame.layers = [
      { pixels: frame.pixels.map((row) => '.'.repeat(row.length)), palette: ['#abcdef'] },
    ]
  }
  exact.animations.spindash = structuredClone(exact.animations.roll)
  const h = harness(2, { hero: exact }),
    calls = []
  h.api.spr = (...args) => calls.push(args)
  h.game.draw(h.api)
  assert.ok(calls.some((args) => args[5] === palette))
  assert.ok(calls.some((args) => args[5][0] === '#abcdef'))
  h.keys(0, 'down', 'b')
  h.step(3)
  assert.equal(h.game.inspect().people[0].animation, 'spindash')
  for (const edit of [
    (x) => delete x.animations.jump,
    (x) => (x.frames.idle0.palette = ['#000000']),
    (x) => (x.frames.idle0.layers = Array(9).fill({ pixels: ['.'], palette: ['#000000'] })),
    (x) => (x.animations.run.frames[0].duration = 0),
  ]) {
    const bad = structuredClone(exact)
    edit(bad)
    assert.throws(() => harness(1, { hero: bad }), /invalid hero/)
  }
})

test('falling after a checkpoint loses one life and respawns at that checkpoint', () => {
  const h = harness()
  for (let i = 0; i < 1000 && h.game.inspect().people[0].x < 1500; i++) {
    drive(h)
    h.step()
  }
  assert.equal(h.game.inspect().people[0].checkpoint, 1000)
  h.keys(0, 'left')
  for (let i = 0; i < 900 && !h.game.inspect().people[0].dead; i++) h.step()
  const dead = h.game.inspect().people[0]
  const checkpoint = dead.checkpoint
  assert.ok([1000, 1740].includes(checkpoint))
  assert.ok(dead.dead)
  assert.equal(dead.lives, 2)
  h.keys(0)
  h.step(dead.dead)
  const reset = h.game.inspect().people[0]
  assert.equal(reset.x, checkpoint)
  const points = h.game.inspect().acts[reset.act].terrain
  const end = points.findIndex((point, i) => i > 0 && point[0] >= checkpoint)
  const a = points[end - 1],
    b = points[end]
  assert.equal(reset.y, a[1] + ((checkpoint - a[0]) * (b[1] - a[1])) / (b[0] - a[0]))
  assert.equal(reset.lives, 2)
  assert.equal(reset.grounded, true)
  assert.equal(reset.loop, null)
  assert.ok(reset.invulnerable > 0)
})

test('later chasms require jump decisions: holding right or right+roll cannot clear both acts', () => {
  for (const buttons of [['right'], ['right', 'down']]) {
    const h = harness()
    h.keys(0, ...buttons)
    for (let i = 0; i < 3000 && h.game.inspect().phase === 'play'; i++) h.step()
    assert.notEqual(h.game.inspect().phase, 'complete')
    assert.ok(h.game.inspect().people[0].lives < 3, 'missing a jump must cost a life')
    assert.ok(!h.events.some((e) => e.type === 'win'))
  }
})

test('braking and a deliberate vertical jump reaches the optional high road', () => {
  const h = harness()
  h.keys(0, 'right')
  while (h.game.inspect().people[0].x < 440) h.step()
  h.keys(0, 'left')
  while (h.game.inspect().people[0].vx > 0.4) h.step()
  h.keys(0, 'a')
  let landed = false
  for (let i = 0; i < 65; i++) {
    const p = h.step().people[0]
    if (p.platform === 0) {
      landed = true
      assert.equal(p.y, 115)
      assert.equal(p.grounded, true)
    }
  }
  assert.ok(landed, 'a real input route must land on the authored upper platform')
})

test('camera preserves forward reaction room at running speed in both viewport modes', () => {
  for (const players of [1, 2]) {
    const h = harness(players)
    let samples = 0
    for (let i = 0; i < 600; i++) {
      drive(h)
      const p = h.step().people[0]
      if (p.act === 0 && p.x > 1700 && p.x < 1850 && p.vx > 8) {
        assert.ok(256 - (p.x - p.camera) >= 165, 'at least 165 native pixels ahead')
        samples++
      }
    }
    assert.ok(samples >= 10)
  }
})

test('separated first spring gives full lift; elevated route and ridge loop remain traversable', () => {
  const h = harness()
  let firstLaunch = false,
    elevatedLaunch = false,
    previous = 0
  while (h.game.inspect().phase === 'play' && h.game.inspect().ticks < 2000) {
    drive(h)
    const p = h.step().people[0]
    if (p.stats.springs > previous) {
      assert.equal(p.vy, -8.2, 'an overlapping enemy must not cancel spring lift')
      if (p.act === 0 && p.x < 1200) firstLaunch = true
      if (p.act === 0 && p.x > 1500 && p.y < 100) elevatedLaunch = true
      previous = p.stats.springs
    }
  }
  assert.ok(firstLaunch && elevatedLaunch)
  assert.equal(h.game.inspect().phase, 'complete')
  assert.equal(h.game.inspect().people[0].stats.loops, 2)
})

test('a short hop avoids the first spring and reaches the forgiving lower valley without another jump', () => {
  const h = harness()
  while (h.game.inspect().people[0].x < 1030) {
    drive(h)
    h.step()
  }
  h.keys(0, 'right', 'a')
  h.step(2)
  h.keys(0, 'right', 'down')
  let depth = 0
  while (h.game.inspect().people[0].x < 1450 && h.game.inspect().ticks < 600)
    depth = Math.max(depth, h.step().people[0].y)
  const p = h.game.inspect().people[0]
  assert.ok(p.x >= 1450 && depth > 205)
  assert.equal(p.lives, 3)
  assert.equal(p.stats.springs, 0)
})

test('deliberate high-road jump links the introductory platforms with normal controls', () => {
  const h = harness()
  h.keys(0, 'right')
  while (h.game.inspect().people[0].x < 440) h.step()
  h.keys(0, 'left')
  while (h.game.inspect().people[0].vx > 0.4) h.step()
  h.keys(0, 'a')
  h.step(65)
  assert.equal(h.game.inspect().people[0].platform, 0)
  h.keys(0, 'right')
  while (h.game.inspect().people[0].x < 535) h.step()
  h.keys(0, 'a', 'right')
  let reached = false
  for (let i = 0; i < 70; i++) {
    const p = h.step().people[0]
    if (p.grounded && p.platform === 2) reached = true
  }
  assert.ok(reached)
})

test('split camera retains source-sized headroom throughout high spring and loop routes', () => {
  const h = harness(2)
  let highLaunch = false
  while (h.game.inspect().phase === 'play' && h.game.inspect().ticks < 2000) {
    drive(h)
    const p = h.step().people[0]
    const foot = p.y - p.cameraY
    assert.ok(foot >= 56 && foot <= 90, '44px native actor stays below the 11px HUD')
    if (p.y < 0) highLaunch = true
  }
  assert.ok(highLaunch)
  assert.equal(h.game.inspect().phase, 'complete')
})
