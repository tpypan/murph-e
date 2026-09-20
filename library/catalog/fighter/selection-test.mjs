import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const factory = Function(
  `return ${readFileSync(resolve(import.meta.dirname, 'module.js'), 'utf8')}`,
)()
const assets = JSON.parse(readFileSync(resolve(import.meta.dirname, 'assets.json'), 'utf8'))
function harness(players = 2, config = {}, initialHeld = [[], []]) {
  const held = initialHeld.map((keys) => new Set(keys)),
    previous = [new Set(), new Set()],
    scores = [0, 0],
    events = [],
    text = []
  let seed = 19
  const api = new Proxy(
    {
      players,
      btn: (key, i = 0) => held[i].has(key),
      btnp: (key, i = 0) => held[i].has(key) && !previous[i].has(key),
      rnd: (n = 1) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        return (seed / 4294967296) * n
      },
      score: (n, i = 0) => {
        scores[i] = n
      },
      addScore: (n, i = 0) => {
        scores[i] += n
      },
      win: (i) => events.push(['win', i]),
      gameOver: () => events.push(['gameOver']),
      text: (value) => text.push(value),
      textCenter: (value) => text.push(value),
    },
    { get: (target, key) => target[key] ?? (() => {}) },
  )
  const game = factory({ characterSelect: true, ...config })
  game.init(api)
  const keys = (i, ...names) => {
    held[i] = new Set(names)
  }
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      game.update(api)
      game.draw(api)
      for (let p = 0; p < 2; p++) previous[p] = new Set(held[p])
    }
    return game.inspect()
  }
  const tap = (i, key) => {
    keys(i, key)
    step()
    keys(i)
    return step()
  }
  return { game, api, keys, step, tap, scores, events, text }
}

test('selection never starts itself; cursor and lock inputs belong to each human controller', () => {
  const h = harness()
  const start = h.step(1000)
  assert.equal(start.phase, 'select')
  assert.equal(start.timeLeft, 3600)
  assert.deepEqual(start.selection.selected, ['batman', 'flash'])
  assert.deepEqual(start.scores, [0, 0])
  h.tap(0, 'right')
  assert.deepEqual(h.game.inspect().selection.cursors, [1, 1])
  h.tap(1, 'left')
  assert.deepEqual(h.game.inspect().selection.selected, ['flash', 'batman'])
  h.tap(0, 'a')
  h.tap(0, 'left')
  assert.deepEqual(h.step(180).selection.locked, [true, false])
  assert.deepEqual(h.game.inspect().selection.selected, ['flash', 'batman'])
  assert.equal(h.game.inspect().phase, 'select')
  h.tap(1, 'a')
  assert.equal(h.game.inspect().phase, 'versus')
  assert.deepEqual(h.game.inspect().selection.locked, [true, true])
  assert.equal(h.step(60).phase, 'intro')
  assert.deepEqual(
    h.game.inspect().fighters.map((f) => f.id),
    ['flash', 'batman'],
  )
  assert.deepEqual(
    h.game.inspect().fighters.map((f) => f.action),
    [null, null],
  )
})

test('B unlocks only its owner during selection and the versus window; other lock survives', () => {
  const h = harness()
  h.tap(0, 'a')
  h.tap(1, 'a')
  h.tap(1, 'b')
  assert.equal(h.game.inspect().phase, 'select')
  assert.deepEqual(h.game.inspect().selection.locked, [true, false])
  h.tap(1, 'left')
  assert.deepEqual(h.game.inspect().selection.selected, ['batman', 'batman'])
  h.tap(1, 'a')
  h.tap(0, 'b')
  assert.deepEqual(h.game.inspect().selection.locked, [false, true])
  h.tap(0, 'right')
  assert.deepEqual(h.game.inspect().selection.selected, ['flash', 'batman'])
  h.tap(0, 'a')
  h.step(60)
  assert.equal(h.game.inspect().phase, 'intro')
})

test('held buttons at entry cannot choose or lock; confirmation does not become an attack', () => {
  const h = harness(2, {}, [['right', 'a'], ['a']])
  assert.equal(h.step(500).phase, 'select')
  assert.deepEqual(h.game.inspect().selection.cursors, [0, 1])
  assert.deepEqual(h.game.inspect().selection.locked, [false, false])
  h.keys(0)
  h.keys(1)
  h.step()
  h.keys(0, 'a')
  h.keys(1, 'a')
  h.step()
  assert.equal(h.game.inspect().phase, 'versus')
  h.step(180)
  assert.equal(h.game.inspect().phase, 'fight')
  assert.deepEqual(
    h.game.inspect().fighters.map((f) => f.action),
    [null, null],
  )
  assert.deepEqual(
    h.game.inspect().fighters.map((f) => f.hp),
    [100, 100],
  )
  h.keys(0)
  h.step()
  h.keys(0, 'a')
  h.step()
  assert.equal(h.game.inspect().fighters[0].action, 'light')
  assert.equal(h.game.inspect().fighters[1].action, null)
})

test('1P owns only its cursor and receives a different CPU choice unless explicitly configured', () => {
  const h = harness(1)
  h.tap(1, 'left')
  h.tap(1, 'a')
  h.tap(1, 'b')
  assert.deepEqual(h.game.inspect().selection.selected, ['batman', 'flash'])
  assert.deepEqual(h.game.inspect().selection.locked, [false, true])
  h.tap(0, 'right')
  assert.deepEqual(h.game.inspect().selection.selected, ['flash', 'batman'])
  h.tap(0, 'a')
  h.step(140)
  assert.equal(h.game.inspect().phase, 'fight')
  assert.equal(h.game.inspect().fighters[1].id, 'batman')
  assert.ok(h.text.includes('CPU'))
  const explicit = harness(1, { cpuCharacter: 'batman' })
  assert.deepEqual(explicit.game.inspect().selection.selected, ['batman', 'batman'])
  const one = harness(1, { selectableRoster: ['flash'] })
  assert.deepEqual(one.game.inspect().selection.selected, ['flash', 'flash'])
})

test('same-character versus retains separate markers, independent movement and detached diagnostics', () => {
  const h = harness()
  h.tap(0, 'right')
  h.tap(0, 'a')
  h.tap(1, 'a')
  h.step(140)
  const s = h.game.inspect()
  assert.deepEqual(
    s.fighters.map((f) => f.id),
    ['flash', 'flash'],
  )
  s.selection.selected[0] = 'forged'
  s.selection.locked[0] = false
  assert.deepEqual(h.game.inspect().selection.selected, ['flash', 'flash'])
  assert.deepEqual(h.game.inspect().selection.locked, [true, true])
  const before = h.game.inspect().fighters.map((f) => f.x)
  h.keys(0, 'right')
  h.step(10)
  h.keys(0)
  assert.ok(h.game.inspect().fighters[0].x > before[0])
  assert.equal(h.game.inspect().fighters[1].x, before[1])
  assert.ok(h.text.includes('P1'))
  assert.ok(h.text.includes('P2'))
})

test('selected identities survive every round and a full input-driven match; reset opens a fresh selection', () => {
  const h = harness(2, { roundsToWin: 2, roundSeconds: 15 })
  h.tap(0, 'right')
  h.tap(1, 'left')
  h.tap(0, 'a')
  h.tap(1, 'a')
  h.step(140)
  let sawSecondRound = false
  for (let tick = 0; tick < 5000 && !h.game.inspect().terminal; tick++) {
    const s = h.game.inspect()
    assert.deepEqual(
      s.fighters.map((f) => f.id),
      ['flash', 'batman'],
    )
    if (s.round === 2) sawSecondRound = true
    if (s.phase === 'fight' || s.phase === 'intro') {
      const gap = s.fighters[1].x - s.fighters[0].x
      h.keys(0, ...(gap > 34 ? ['right'] : tick % 44 === 0 ? ['b'] : []))
    } else h.keys(0)
    h.step()
  }
  assert.ok(sawSecondRound)
  assert.equal(h.game.inspect().terminal, true)
  assert.deepEqual(h.events, [['win', 0]])
  assert.ok(h.scores[0] > 1000)
  assert.equal(h.scores[1], 0)
  h.keys(0)
  h.keys(1)
  h.game.init(h.api)
  assert.equal(h.game.inspect().phase, 'select')
  assert.deepEqual(h.game.inspect().selection.selected, ['batman', 'flash'])
  assert.deepEqual(h.game.inspect().selection.locked, [false, false])
  assert.deepEqual(h.scores, [0, 0])
})

test('all selectable assets validate before entry, and legacy factory still starts at its round intro', () => {
  for (const config of [
    { characterSelect: 'yes' },
    { selectableRoster: [] },
    { selectableRoster: ['batman', 'batman'] },
    { selectableRoster: ['unknown'] },
    { selectableRoster: Array.from({ length: 9 }, (_, i) => String(i)) },
    { cpuCharacter: 'unknown' },
    {
      selectableRoster: ['batman', 'incomplete'],
      assets: { incomplete: { frames: {}, animations: {} } },
    },
  ])
    assert.throws(() => harness(2, config), /fighter:/)
  const custom = structuredClone(assets.characters.batman)
  const h = harness(2, { selectableRoster: ['batman', 'fixture'], assets: { fixture: custom } })
  assert.deepEqual(h.game.inspect().selection.available, ['batman', 'fixture'])
  const legacy = harness(2, { characterSelect: false })
  assert.equal(legacy.game.inspect().phase, 'intro')
  assert.equal(legacy.game.inspect().selection, undefined)
})
