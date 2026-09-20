import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { routeToHome } from './route.mjs'

const root = import.meta.dirname,
  factory = Function(`return ${readFileSync(resolve(root, 'module.js'), 'utf8')}`)()
function harness(players = 1, config = {}) {
  const held = [new Set(), new Set()],
    previous = [new Set(), new Set()],
    scores = [0, 0],
    terminal = [],
    inputs = []
  let count = 0
  const noop = () => {},
    game = factory(config),
    api = {
      players,
      W: 256,
      H: 224,
      btn: (b, p = 0) => held[p].has(b),
      btnp: (b, p = 0) => held[p].has(b) && !previous[p].has(b),
      score: (n) => {
        scores.fill(n)
      },
      addScore: (n, p = 0) => {
        scores[p] += n
      },
      win: (p) => terminal.push({ type: 'win', player: p }),
      gameOver: () => terminal.push({ type: 'gameOver' }),
      sfx: noop,
      cls: noop,
      rectfill: noop,
      rect: noop,
      line: noop,
      pset: noop,
      text: noop,
      textCenter: noop,
      spr: noop,
    }
  game.init(api)
  const keys = (p, ...buttons) => {
    const next = new Set(buttons)
    for (const b of held[p])
      if (!next.has(b)) inputs.push({ at: count, player: p, button: b, down: false })
    for (const b of next)
      if (!held[p].has(b)) inputs.push({ at: count, player: p, button: b, down: true })
    held[p] = next
  }
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      game.update(api, 1 / 60)
      game.draw(api)
      for (let p = 0; p < 2; p++) previous[p] = new Set(held[p])
      count++
    }
    return game.inspect()
  }
  return { game, keys, step, scores, terminal, inputs, count: () => count }
}
function runRoute(h, player, home) {
  let plan
  for (let attempt = 0; attempt < 35 && !plan; attempt++) {
    plan = routeToHome(h.game.inspect(), player, home)
    if (!plan) {
      h.keys(player)
      h.step(8)
    }
  }
  assert(plan, `No route for P${player + 1} to home${home}`)
  for (const action of plan) {
    h.keys(player, ...(action === 'wait' ? [] : [action]))
    h.step(8)
    assert(h.game.inspect().players[player].lives > 0, 'route died')
  }
  h.keys(player)
  return plan
}
test('buffered hops are discrete, immediate and cannot leave safe world bounds', () => {
  const h = harness()
  h.keys(0, 'left')
  h.step(3)
  const x = h.game.inspect().players[0].x
  h.keys(0, 'right')
  h.step(5)
  assert.equal(h.game.inspect().players[0].x, 104)
  h.step(8)
  assert.equal(h.game.inspect().players[0].x, 120)
  assert(x > 104 && x < 120)
  h.keys(0, 'left')
  h.step(100)
  assert(h.game.inspect().players[0].x >= 22)
})
test('traffic collisions and timer losses consume lives and respawn correctly', () => {
  const h = harness(1, { lives: 2, timeLimit: 10 })
  h.step(601)
  assert.equal(h.game.inspect().players[0].lives, 1)
  h.step(45)
  assert.equal(h.game.inspect().players[0].row, 10)
  assert.equal(h.game.inspect().players[0].wait, 0)
  h.step(600)
  assert.deepEqual(h.terminal, [{ type: 'gameOver' }])
  const road = harness(1, { lives: 3 })
  road.keys(0, 'up')
  road.step(120)
  assert(road.game.inspect().events.some((e) => e.type === 'death' && e.reason === 'traffic'))
})
test('turtles warn before submerging, sunk frames have no support boxes, and logs carry riders', () => {
  const h = harness()
  const warned = new Map()
  let sink = false
  for (let t = 0; t < 400; t++) {
    h.step()
    for (const o of h.game.inspect().hazards)
      if (o.kind === 'turtle') {
        const key = `${o.row}/${o.id}`
        if (o.warning) warned.set(key, t)
        if (!o.active && warned.has(key) && t - warned.get(key) <= 41) sink = true
      }
  }
  assert(sink)
  const assets = JSON.parse(readFileSync(resolve(root, 'assets.json')))
  assert.equal(assets.frames['turtle-4'].hitboxes.length, 0)
  const r = harness()
  const plan = routeToHome(r.game.inspect(), 0, 0)
  assert(plan)
  for (const action of plan) {
    r.keys(0, ...(action === 'wait' ? [] : [action]))
    r.step(8)
    const p = r.game.inspect().players[0]
    if (!p.hop && p.row >= 1 && p.row <= 4 && p.wait === 0) {
      r.keys(0)
      const before = p.x
      r.step()
      assert.notEqual(r.game.inspect().players[0].x, before)
      return
    }
  }
  assert.fail('Route never landed on a rideable lane')
})
test('all five homes can be reached by actual joystick skill routes with original moving lanes and sinking turtles', () => {
  const config = { levels: 1, lives: 3, timeLimit: 180 }
  const h = harness(1, config)
  for (let home = 0; home < 5; home++) {
    runRoute(h, 0, home)
    assert.equal(h.game.inspect().filled[home], 0)
    h.step(30)
  }
  h.step(76)
  assert.deepEqual(h.terminal, [{ type: 'win', player: undefined }])
  assert.equal(h.game.inspect().players[0].lives, 3)
  mkdirSync(resolve(root, 'evidence'), { recursive: true })
  writeFileSync(
    resolve(root, 'evidence/solo-replay.json'),
    JSON.stringify(
      {
        config,
        players: 1,
        frames: h.count(),
        inputs: h.inputs,
        expectedScores: h.scores.slice(0, 1),
      },
      null,
      2,
    ),
  )
})
test('cooperative home ownership and independent scores survive full clear and round reset', () => {
  const config = { levels: 2, lives: 3, timeLimit: 180 }
  const h = harness(2, config)
  for (let home = 0; home < 5; home++) {
    const player = home % 2
    runRoute(h, player, home)
    assert.equal(h.game.inspect().filled[home], player)
    h.step(30)
  }
  h.step(76)
  const s = h.game.inspect()
  assert.equal(s.level, 2)
  assert(s.filled.every((x) => x === null))
  assert(s.players.every((p) => p.row === 10 && p.lives === 3))
  assert(h.scores[0] > 0 && h.scores[1] > 0 && h.scores[0] !== h.scores[1])
  writeFileSync(
    resolve(root, 'evidence/coop-replay.json'),
    JSON.stringify(
      { config, players: 2, frames: h.count(), inputs: h.inputs, expectedScores: h.scores },
      null,
      2,
    ),
  )
})
test('simultaneous players reserve a home once without overwrite or unfair contact death', () => {
  const h = harness(2, { levels: 1, startColumns: [6, 6], timeLimit: 180 })
  const plan = routeToHome(h.game.inspect(), 0, 2)
  assert(plan)
  for (const action of plan) {
    for (let p = 0; p < 2; p++) h.keys(p, ...(action === 'wait' ? [] : [action]))
    h.step(8)
  }
  const s = h.game.inspect()
  assert.equal(s.filled.filter((x) => x !== null).length, 1)
  assert.equal(s.events.filter((e) => e.type === 'home').length, 1)
  assert(s.players.every((p) => p.lives === 3))
  assert.notEqual(h.scores[0], h.scores[1])
})
