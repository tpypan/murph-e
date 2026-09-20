import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const dir = dirname(fileURLToPath(import.meta.url))
const factory = runInNewContext('(' + readFileSync(resolve(dir, 'module.js'), 'utf8') + ')')
function session(config = {}) {
  const held = new Set(),
    pressed = new Set()
  let score = 0,
    terminal = null
  const api = {
    players: 1,
    t: 0,
    frame: 0,
    btn: (k) => held.has(k),
    btnp: (k) => pressed.has(k),
    score: (n) => {
      score = n
    },
    addScore: (n) => {
      score += n
    },
    win: () => {
      terminal = 'win'
    },
    gameOver: () => {
      terminal = 'loss'
    },
    textWidth: (s) => String(s).length * 8,
  }
  for (const method of [
    'sfx',
    'tone',
    'shake',
    'flash',
    'cls',
    'rect',
    'rectfill',
    'circ',
    'circfill',
    'line',
    'pset',
    'spr',
    'text',
    'textCenter',
  ])
    api[method] = () => {}
  const game = factory(config)
  game.init(api)
  return {
    game,
    api,
    step(keys = [], frames = 1) {
      for (let f = 0; f < frames; f++) {
        pressed.clear()
        for (const key of keys) if (!held.has(key)) pressed.add(key)
        held.clear()
        for (const key of keys) held.add(key)
        api.t += 1 / 60
        api.frame++
        game.update(api, 1 / 60)
      }
      return game.inspect()
    },
    get score() {
      return score
    },
    get terminal() {
      return terminal
    },
  }
}
const checks = []
function check(name, fn) {
  fn()
  checks.push({ name, passed: true })
}
check('bounded settings and explicit single-player contract', () => {
  for (const config of [
    { rivalSpeed: 0 },
    { boostCooldown: Infinity },
    { laps: 2 },
    { planePalette: ['red'] },
    { racerNames: ['x'] },
  ])
    assert.throws(() => factory(config))
  const s = session()
  assert.throws(() => s.game.init({ ...s.api, players: 2 }))
})
check('independent instances, telemetry copies and reset', () => {
  const a = session(),
    b = session()
  a.step(['right'], 20)
  assert.ok(a.game.inspect().player.x > b.game.inspect().player.x)
  const snapshot = a.game.inspect()
  snapshot.player.x = -999
  snapshot.rivals[0].s = -999
  assert.notEqual(a.game.inspect().player.x, -999)
  assert.notEqual(a.game.inspect().rivals[0].s, -999)
  a.game.init(a.api)
  assert.equal(a.game.inspect().player.s, 0)
  assert.equal(a.game.inspect().race, 0)
  assert.equal(a.score, 0)
})
check('altitude, boost cooldown, starting item and scoring through actual controls', () => {
  const s = session()
  assert.equal(s.step(['up']).player.alt, 2)
  assert.equal(s.step(['down']).player.alt, 0 + 1)
  let p = s.step(['b']).player
  assert.ok(p.boost > 0)
  assert.ok(p.cooldown > 2)
  s.step([], 45)
  p = s.step(['b']).player
  assert.equal(p.boost, 0) // still cooling down
  const item = session()
  assert.equal(item.game.inspect().player.item, 0)
  assert.equal(item.step(['a']).player.item, -1)
  item.step([], 200)
  assert.ok(item.score > 0)
})
check('rival speed configuration changes travel without moving the human', () => {
  const slow = session({ rivalSpeed: 0.6 }),
    fast = session({ rivalSpeed: 1.3 })
  slow.step([], 60)
  fast.step([], 60)
  assert.ok(fast.game.inspect().rivals[0].s > slow.game.inspect().rivals[0].s)
  assert.equal(fast.game.inspect().player.s, slow.game.inspect().player.s)
})
const outcomes = []
for (const [label, config, bot] of [
  ['easy-active', { rivalSpeed: 0.6 }, true],
  ['hard-idle', { rivalSpeed: 1.3 }, false],
]) {
  const s = session(config)
  let maxParticles = 0
  for (let frame = 0; frame < 60 * 300 && !s.terminal; frame++) {
    const state = s.game.inspect()
    const keys = []
    if (bot) {
      const next = state.objects.find((o) => o.type === 'gate' && o.s > state.player.s + 20)
      if (next && Math.abs(next.x - state.player.x) > 4)
        keys.push(next.x > state.player.x ? 'right' : 'left')
      if (frame % 180 === 0) keys.push('b')
      if (frame % 60 === 0) keys.push('a')
    }
    s.step(keys)
    maxParticles = Math.max(maxParticles, s.game.inspect().particleCount)
    if (frame % 60 === 0) s.game.draw(s.api)
  }
  assert.ok(s.terminal, `${label} must complete within 300 seconds`)
  assert.equal(s.game.inspect().race, 2)
  assert.ok(Number.isFinite(s.score))
  assert.ok(maxParticles < 300)
  outcomes.push({ label, terminal: s.terminal, seconds: s.api.t, score: s.score, maxParticles })
}
assert.equal(outcomes[0].terminal, 'win')
assert.equal(outcomes[1].terminal, 'loss')
checks.push({
  name: 'complete three-race cups reach both victory and defeat with bounded particles',
  passed: true,
})
mkdirSync(resolve(dir, 'verification'), { recursive: true })
writeFileSync(
  resolve(dir, 'verification/behavior.json'),
  JSON.stringify({ checks, outcomes }, null, 2),
)
console.log(JSON.stringify({ checks, outcomes }))
