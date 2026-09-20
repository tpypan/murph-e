import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { harness } from './harness.mjs'
import { defaultSolo, defaultVersus } from './default-route.mjs'
const dir = import.meta.dirname
const hash = createHash('sha256')
  .update(readFileSync(resolve(dir, 'module.js')))
  .digest('hex')
function save(h, name, players, config, limitations) {
  const state = h.game.inspect()
  writeFileSync(
    resolve(dir, `evidence/default-${name}-replay.json`),
    JSON.stringify(
      {
        moduleHash: hash,
        config,
        players,
        frames: h.count(),
        inputs: h.inputs,
        expectedScores: h.scores.slice(0, players),
        expectedState: 'win',
        state,
        limitations,
      },
      null,
      2,
    ) + '\n',
  )
}
test('unmodified solo defaults complete both enemy waves with three initial lives and 100 seconds per level', () => {
  const h = harness(),
    initial = h.game.inspect()
  assert.equal(initial.players[0].lives, 3)
  assert.equal(initial.timeLeft, 6000)
  assert.equal(initial.enemies.length, 3)
  assert.ok(initial.crates.length > 0)
  const state = defaultSolo(h, 14000, 11)
  assert.deepEqual(h.terminal, [{ type: 'win', player: undefined }])
  assert.equal(state.level, 2)
  assert.equal(state.players[0].lives, 1)
  assert.equal(state.events.filter((e) => e.type === 'enemy-defeated').length, 7)
  assert.equal(state.events.filter((e) => e.type === 'level-clear').length, 2)
  save(h, 'solo', 1, {}, [
    'Deterministic observation-based controller; not a human difficulty test.',
  ])
  const before = JSON.stringify(state)
  h.step(120)
  assert.equal(JSON.stringify(h.game.inspect()), before)
  assert.equal(h.terminal.length, 1)
})
test('unmodified versus defaults clear crates and credit both controllers across three normal rounds', () => {
  const h = harness(2),
    state = defaultVersus(h)
  assert.deepEqual(h.terminal, [{ type: 'win', player: 0 }])
  assert.deepEqual(state.wins, [2, 1])
  assert.equal(state.level, 3)
  assert.deepEqual(
    state.events.filter((e) => e.type === 'round-end').map((e) => e.winner),
    [1, 0, 0],
  )
  for (const p of [0, 1]) {
    assert.ok(h.inputs.some((e) => e.player === p && e.button === 'a' && e.down))
    assert.ok(state.events.some((e) => e.type === 'crate' && e.owner === p))
  }
  save(h, 'versus', 2, {}, [
    'Both controllers navigate and attack in their winning rounds. The target remains stationary; this is not adversarial balance evidence.',
  ])
})
test('a cooperatively eliminated player remains eliminated across a real default-difficulty level transition', () => {
  const h = harness(2, { mode: 'coop' })
  const state = defaultSolo(h, 14000, 11)
  assert.deepEqual(h.terminal, [{ type: 'win', player: undefined }])
  assert.equal(state.level, 2)
  assert.equal(state.players[1].lives, 0)
  assert.equal(state.players[1].alive, false)
  assert.equal(state.players[1].wait, 0)
  assert.equal(state.events.filter((e) => e.type === 'player-defeated' && e.player === 1).length, 3)
  assert.ok(state.players.every((p) => p.lives >= 0))
  save(h, 'coop', 2, { mode: 'coop' }, [
    'Only mode is changed; normal enemies/crates/lives/timer remain. P1 carries the team after idle P2 loses three lives. Not a two-active-player cooperation proof.',
  ])
})
