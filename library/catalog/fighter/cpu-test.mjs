import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const factory = Function(
  `return ${readFileSync(resolve(import.meta.dirname, 'module.js'), 'utf8')}`,
)()
function harness(seed = 19, config = {}, players = 1) {
  const held = [new Set(), new Set()],
    previous = [new Set(), new Set()]
  let rng = seed,
    ticks = 0,
    randomReads = 0
  const api = new Proxy(
    {
      players,
      btn: (key, i = 0) => held[i].has(key),
      btnp: (key, i = 0) => held[i].has(key) && !previous[i].has(key),
      rnd: (n = 1) => {
        randomReads++
        rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0
        return (rng / 4294967296) * n
      },
    },
    { get: (o, key) => o[key] ?? (() => {}) },
  )
  const game = factory(config)
  game.init(api)
  return {
    game,
    keys: (i, names) => {
      held[i] = new Set(names)
    },
    step: () => {
      game.update(api, 1 / 60)
      for (let i = 0; i < 2; i++) previous[i] = new Set(held[i])
      ticks++
      return game.inspect()
    },
    ticks: () => ticks,
    randomReads: () => randomReads,
  }
}

test('CPU uses a real low to defeat permanent standing guard at every difficulty', () => {
  for (const difficulty of [0, 0.6, 1])
    for (let seed = 1; seed <= 8; seed++) {
      const h = harness(seed, { difficulty, roundsToWin: 1 })
      let lows = 0,
        previous = null
      for (let t = 0; t < 6000 && !h.game.inspect().terminal; t++) {
        const [p, cpu] = h.game.inspect().fighters
        h.keys(0, [cpu.x > p.x ? 'left' : 'right'])
        const s = h.step()
        if (s.fighters[1].action === 'sweep' && previous !== 'sweep') lows++
        previous = s.fighters[1].action
      }
      const s = h.game.inspect()
      assert.ok(lows > 0, `${difficulty}/${seed} uses low attacks`)
      assert.ok(s.fighters[0].hp < 100, `${difficulty}/${seed} breaks standing guard`)
      assert.ok(s.terminal, `${difficulty}/${seed} does not repeat tied rounds forever`)
      assert.equal(s.lastWinner, 1)
    }
})

test('CPU pose observations are delayed, copied and independent of instant human buttons', () => {
  for (const difficulty of [0, 0.6, 1]) {
    const h = harness(19, { difficulty }),
      history = new Map()
    let observations = 0
    for (let t = 1; t <= 450; t++) {
      h.keys(0, t % 14 < 7 ? ['down'] : [])
      const s = h.step(),
        observed = s.fighters[1].ai?.observed
      history.set(t, s.fighters[0].crouch)
      if (!observed) continue
      assert.ok(observed.decidedAt - observed.tick >= Math.round(16 - difficulty * 6))
      assert.equal(observed.crouch, history.get(observed.tick))
      observed.crouch = 'mutated diagnostic copy'
      assert.notEqual(h.game.inspect().fighters[1].ai.observed.crouch, observed.crouch)
      observations++
    }
    assert.ok(observations > 10)
  }
})

test('AI changes do not execute in two-player combat', () => {
  const h = harness(19, {}, 2)
  for (let t = 0; t < 1800; t++) {
    h.keys(0, ['right', ...(t % 33 === 0 ? ['a'] : [])])
    h.keys(1, ['left', ...(t % 45 === 0 ? ['b'] : [])])
    const s = h.step()
    assert.deepEqual(
      s.fighters.map((f) => f.ai),
      [null, null],
    )
  }
  assert.equal(h.randomReads(), 0)
})

test('CPU sweeps retain authored startup and one damage event per swing', () => {
  const h = harness(19, { roundsToWin: 1, moves: { sweep: { startup: 18 } } })
  let previousHp = 100,
    hits = 0
  for (let t = 0; t < 1800 && !h.game.inspect().terminal; t++) {
    const [p, cpu] = h.game.inspect().fighters
    h.keys(0, [cpu.x > p.x ? 'left' : 'right'])
    const s = h.step(),
      [human, enemy] = s.fighters
    if (human.hp < previousHp) {
      const ended = s.phase === 'roundEnd'
      assert.equal(ended ? cpu.action : enemy.action, 'sweep')
      const age = ended ? cpu.age + 1 : enemy.age
      assert.ok(age >= 18 && age < 23)
      assert.equal(previousHp - human.hp, 10)
      hits++
    }
    previousHp = human.hp
  }
  assert.ok(hits > 0)
})

test('repeated five-Hz jabs are counterable without changing move damage or timing', () => {
  let losses = 0
  for (let seed = 1; seed <= 8; seed++) {
    const h = harness(seed, { roundsToWin: 1, difficulty: 1 })
    for (let t = 0; t < 6000 && !h.game.inspect().terminal; t++) {
      const [p, cpu] = h.game.inspect().fighters
      const keys = Math.abs(cpu.x - p.x) > 30 ? [cpu.x > p.x ? 'right' : 'left'] : []
      if (t % 12 === 0) keys.push('a')
      h.keys(0, keys)
      h.step()
    }
    if (h.game.inspect().lastWinner === 1) losses++
  }
  assert.ok(losses >= 4, `a one-button policy should not beat every tested CPU: ${losses}/8 losses`)
})
