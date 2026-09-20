import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { harness } from './harness.mjs'
import { execute, paths, soloBot } from './route.mjs'

const directory = import.meta.dirname
function go(h, p, x, y) {
  const route = paths(h.game.inspect(), p).find((q) => q.x === x && q.y === y)
  assert(route, `No walk route to ${x},${y}`)
  execute(h, p, route.route)
}
function bomb(h, p = 0) {
  h.keys(p, 'a')
  h.step(1)
  h.keys(p)
}
function save(h, name, config, players, expectedState) {
  mkdirSync(resolve(directory, 'evidence'), { recursive: true })
  writeFileSync(
    resolve(directory, `evidence/${name}-replay.json`),
    JSON.stringify(
      {
        config,
        players,
        frames: h.count(),
        inputs: h.inputs,
        expectedScores: h.scores.slice(0, players),
        expectedState,
      },
      null,
      2,
    ),
  )
}

test('immediate directional movement, buffered turns, solid pillars and safe starting zones', () => {
  const h = harness(2),
    s = h.game.inspect()
  assert.equal(s.mode, 'versus')
  assert(
    s.players.every((p) => s.crates.every((c) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) > 1)),
  )
  h.keys(0, 'right')
  h.keys(1, 'left')
  h.step(4)
  assert(h.game.inspect().players.every((p) => p.to))
  h.keys(0, 'down')
  h.step(4)
  assert.equal(h.game.inspect().players[0].x, 2)
  h.step(12)
  assert.equal(h.game.inspect().players[0].y, 1)
  h.keys(0, 'left')
  h.step(8)
  assert.equal(h.game.inspect().players[0].x, 1)
  assert.throws(() => harness(2, { mode: 'solo' }))
  assert.equal(harness(1, { mode: 'versus' }).game.inspect().mode, 'solo')
})
test('bomb ownership/capacity, one-way leave permission, exact fuse and obstacle-aware chained cross blasts', () => {
  const h = harness(1, { crateDensity: 0, enemyCount: 0, bombCapacity: 2, blastRange: 3 })
  bomb(h)
  go(h, 0, 2, 1)
  h.keys(0, 'left')
  h.step(8)
  assert.equal(h.game.inspect().players[0].x, 2)
  go(h, 0, 4, 1)
  bomb(h)
  assert.equal(h.game.inspect().bombs.length, 2)
  go(h, 0, 5, 3)
  h.step(99 - h.count())
  assert.equal(h.game.inspect().events.filter((e) => e.type === 'explode').length, 0)
  h.step()
  const s = h.game.inspect(),
    explosions = s.events.filter((e) => e.type === 'explode')
  assert.equal(explosions.length, 2)
  assert(explosions.every((e) => e.tick === 100))
  assert.equal(s.bombs.length, 0)
  assert.equal(s.players[0].lives, 3)
  assert(!explosions.find((e) => e.x === 4).cells.some((c) => c.x === 4 && c.y === 2))
  h.step(26)
  assert.equal(h.game.inspect().flames.length, 0)
  const cap = harness(1, { crateDensity: 0, enemyCount: 0 })
  bomb(cap)
  go(cap, 0, 2, 1)
  bomb(cap)
  assert.equal(cap.game.inspect().bombs.length, 1)
})
test('crate blocking, single score attribution, delayed pickups and bounded upgrade application', () => {
  const h = harness(1, { enemyCount: 0 })
  go(h, 0, 2, 1)
  bomb(h)
  go(h, 0, 1, 2)
  h.step(100)
  let s = h.game.inspect()
  assert(!s.crates.some((c) => c.x === 3 && c.y === 1))
  assert(s.crates.some((c) => c.x === 5 && c.y === 1))
  assert.equal(h.scores[0], 20)
  h.step(26)
  go(h, 0, 4, 1)
  bomb(h)
  go(h, 0, 3, 2)
  const time = h.game.inspect().bombs[0].fuse
  h.step(time)
  s = h.game.inspect()
  assert(!s.crates.some((c) => c.x === 5 && c.y === 1))
  assert(s.crates.some((c) => c.x === 6 && c.y === 1))
  assert.equal(h.scores[0], 40)
  assert(!s.pickups.length)
  h.step(26)
  assert(h.game.inspect().pickups.some((p) => p.x === 5 && p.y === 1 && p.type === 'speed'))
  go(h, 0, 5, 1)
  s = h.game.inspect()
  assert.equal(s.players[0].stepFrames, 7)
  assert(s.events.some((e) => e.type === 'pickup' && e.item === 'speed'))
  assert.equal(s.pickups.length, 0)
})
test('self-blast life loss, respawn immunity, all-lives-out and clock termination use runtime semantics', () => {
  const h = harness(1, { enemyCount: 0, crateDensity: 0, lives: 2 })
  h.step(70)
  bomb(h)
  h.step(99)
  assert.equal(h.game.inspect().players[0].lives, 1)
  assert.equal(h.game.inspect().players[0].alive, false)
  h.step(65)
  assert(h.game.inspect().players[0].alive)
  assert(h.game.inspect().players[0].invulnerable > 0)
  h.step(70)
  bomb(h)
  h.step(100)
  assert.deepEqual(h.terminal, [{ type: 'gameOver' }])
  const timer = harness(1, { roundSeconds: 20 })
  timer.step(1201)
  assert.deepEqual(timer.terminal, [{ type: 'gameOver' }])
})
test('full default-crate/default-enemy solo skill route defeats every enemy and reaches the unlocked exit', () => {
  const config = { levels: 1, roundSeconds: 180, lives: 9 },
    h = harness(1, config)
  const ai = harness(),
    before = ai.game.inspect()
  ai.step(12)
  assert(
    ai.game
      .inspect()
      .enemies.some((e, i) => e.x !== before.enemies[i].x || e.y !== before.enemies[i].y),
  )
  soloBot(h)
  const s = h.game.inspect()
  assert.deepEqual(h.terminal, [{ type: 'win', player: undefined }])
  assert(s.enemies.every((e) => !e.alive))
  assert(s.events.filter((e) => e.type === 'enemy-defeated').length === 3)
  assert(s.events.some((e) => e.type === 'crate'))
  assert(s.events.some((e) => e.type === 'pickup'))
  assert(h.scores[0] >= 1100)
  save(h, 'solo', config, 1, 'win')
})
test('two-player versus resolves both players’ real bomb kills, preserves independent wins/scores and resets clean rounds', () => {
  const config = { crateDensity: 0, roundsToWin: 2 },
    h = harness(2, config)
  const victories = [1, 0, 0]
  for (let round = 0; round < victories.length; round++) {
    const player = victories[round],
      victim = 1 - player
    go(h, player, player ? 2 : 8, player ? 1 : 7)
    bomb(h, player)
    go(h, player, player ? 3 : 7, player ? 2 : 6)
    h.step(100)
    let s = h.game.inspect()
    assert.equal(s.phase, 'roundEnd')
    assert.equal(s.players[victim].alive, false)
    h.step(76)
    if (round < 2) {
      s = h.game.inspect()
      assert.equal(s.level, round + 2)
      assert(s.players.every((p) => p.alive))
      assert.equal(s.bombs.length, 0)
      assert.equal(s.flames.length, 0)
    }
  }
  assert.deepEqual(h.terminal, [{ type: 'win', player: 0 }])
  assert.deepEqual(h.scores, [1000, 500])
  assert.deepEqual(h.game.inspect().wins, [2, 1])
  save(h, 'versus', config, 2, 'win')
})
test('co-op friendly-fire policy, independent scores and team clear preserve lives across levels', () => {
  for (const friendlyFire of [false, true]) {
    const h = harness(2, { mode: 'coop', enemyCount: 0, crateDensity: 0, friendlyFire })
    go(h, 1, 7, 7)
    go(h, 0, 8, 7)
    bomb(h)
    go(h, 0, 7, 6)
    h.step(h.game.inspect().bombs[0].fuse)
    assert.equal(h.game.inspect().players[1].lives, friendlyFire ? 2 : 3)
  }
  const config = {
      mode: 'coop',
      enemyCount: 1,
      crateDensity: 0,
      levels: 2,
      lives: 9,
      roundSeconds: 180,
    },
    h = harness(2, config)
  soloBot(h)
  const s = h.game.inspect()
  assert.equal(s.level, 2)
  assert.equal(s.events.filter((e) => e.type === 'level-clear').length, 2)
  assert.deepEqual(h.scores, [1400, 1000])
  assert(
    s.players.every(
      (p) =>
        p.alive &&
        p.lives ===
          9 - s.events.filter((e) => e.type === 'player-defeated' && e.player === p.id).length,
    ),
  )
  assert.deepEqual(h.terminal, [{ type: 'win', player: undefined }])
  save(h, 'coop', config, 2, 'win')
})
test('bounded versus timeout draws terminate rather than silently replaying forever', () => {
  const h = harness(2, { roundSeconds: 20 })
  h.step(1276)
  assert.deepEqual(h.terminal, [{ type: 'gameOver' }])
  assert.equal(h.game.inspect().roundWinner, undefined)
})
