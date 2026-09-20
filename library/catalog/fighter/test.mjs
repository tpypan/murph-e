import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = import.meta.dirname
const source = readFileSync(resolve(root, 'module.js'), 'utf8')
const factory = Function(`return ${source}`)()
const assets = JSON.parse(readFileSync(resolve(root, 'assets.json'), 'utf8'))
function harness(players = 2, config = {}) {
  const held = [new Set(), new Set()],
    previous = [new Set(), new Set()],
    score = [0, 0],
    events = []
  let rng = 19
  const game = factory(config)
  const api = {
    players,
    W: 256,
    H: 224,
    P1: 12,
    P2: 8,
    btn: (key, i = 0) => held[i].has(key),
    btnp: (key, i = 0) => held[i].has(key) && !previous[i].has(key),
    score: (n, i = 0) => {
      score[i] = n
    },
    addScore: (n, i = 0) => {
      score[i] += n
    },
    getScore: (i = 0) => score[i],
    rnd: (n = 1) => {
      rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0
      return (rng / 4294967296) * n
    },
    sfx: () => {},
    shake: () => {},
    win: (i) => events.push({ type: 'win', player: i }),
    gameOver: () => events.push({ type: 'gameOver' }),
    cls: () => {},
    pset: () => {},
    line: () => {},
    rect: () => {},
    rectfill: () => {},
    circfill: () => {},
    spr: () => {},
    text: () => {},
    textCenter: () => {},
  }
  game.init(api)
  const keys = (i, ...names) => {
    held[i] = new Set(names)
  }
  const step = (n = 1) => {
    for (let j = 0; j < n; j++) {
      game.update(api, 1 / 60)
      game.draw(api)
      held.forEach((set, i) => {
        previous[i] = new Set(set)
      })
    }
    return game.inspect()
  }
  const contact = (gap = 36) => {
    keys(0, 'right')
    for (
      let i = 0;
      i < 120 && game.inspect().fighters[1].x - game.inspect().fighters[0].x > gap;
      i++
    )
      step()
    keys(0)
    step()
  }
  return { game, api, keys, step, contact, score, events }
}

test('complete original assets include distinct poses, valid pixels, anchors and action metadata', () => {
  for (const character of Object.values(assets.characters)) {
    assert.equal(Object.keys(character.frames).length, 30)
    for (const [name, frame] of Object.entries(character.frames)) {
      assert.equal(frame.pixels.length, frame.size.h, name)
      assert(
        frame.pixels.every((row) => row.length === frame.size.w && /^[.0-9a-f]+$/.test(row)),
        name,
      )
      assert(frame.anchor.x >= 0 && frame.anchor.x < frame.size.w, name)
      assert(frame.anchor.y >= 0 && frame.anchor.y <= 68, name)
    }
    for (const [name, clip] of Object.entries(character.animations)) {
      for (const frame of clip.frames) {
        assert(character.frames[frame.frame], name)
        assert(frame.duration > 0)
        assert(Array.isArray(frame.hitboxes))
        assert(Array.isArray(frame.hurtboxes))
        assert.deepEqual(frame.anchor, character.frames[frame.frame].anchor)
      }
    }
    assert.notDeepEqual(character.frames.idle0.pixels, character.frames.punch.pixels)
    assert.notDeepEqual(character.frames.punch.pixels, character.frames.kick.pixels)
  }
})
test('both independent controllers respond during the harmless intro; push boxes prevent ground overlap', () => {
  const h = harness()
  h.keys(0, 'right')
  h.keys(1, 'left')
  h.step(50)
  assert(h.game.inspect().fighters[0].x > 69)
  assert(h.game.inspect().fighters[1].x < 187)
  h.step(100)
  const [a, b] = h.game.inspect().fighters
  assert(a.x > 69)
  assert(b.x < 187)
  assert(b.x - a.x >= 21.9)
})
test('first-frame attack and jump are visible during intro without damage or spending meter', () => {
  for (const [key, field] of [
    ['a', 'action'],
    ['b', 'action'],
    ['up', 'grounded'],
  ]) {
    const h = harness()
    h.keys(0, key)
    h.step()
    const [a, b] = h.game.inspect().fighters
    if (field === 'action') assert(a.action)
    else assert.equal(a.grounded, false)
    assert.equal(a.hp, 100)
    assert.equal(b.hp, 100)
    assert.equal(h.score[0], 0)
  }
})
test('jab respects startup, one hit per swing, recovery, hitstop and attacker-only scoring', () => {
  const h = harness()
  h.step(78)
  h.contact()
  h.keys(0, 'a')
  h.step(4)
  assert.equal(h.game.inspect().fighters[1].hp, 100)
  h.step()
  assert.equal(h.game.inspect().fighters[1].hp, 93)
  assert.equal(h.game.inspect().freeze, 4)
  const age = h.game.inspect().fighters[0].age
  h.keys(0)
  h.step(4)
  assert.equal(h.game.inspect().fighters[0].age, age)
  h.step(20)
  assert.equal(h.game.inspect().fighters[1].hp, 93)
  assert.equal(h.game.inspect().fighters[0].action, null)
  assert.equal(h.score[0], 70)
  assert.equal(h.score[1], 0)
})
test('standing guard blocks mid attacks; sweep defeats standing guard; overhead defeats crouch guard', () => {
  for (const [buttons, defender, expected] of [
    [['a'], ['right'], 100],
    [['down', 'a'], ['right'], 90],
    [['b'], ['right', 'down'], 86],
  ]) {
    const h = harness()
    h.step(78)
    h.contact(26)
    h.keys(0, ...buttons)
    h.keys(1, ...defender)
    h.step(16)
    assert.equal(h.game.inspect().fighters[1].hp, expected, `${buttons} vs ${defender}`)
  }
})
test('crouching shortens hurtbox; jump attacks use their own active pose and return to ground', () => {
  const h = harness()
  h.step(78)
  h.contact()
  h.keys(1, 'down')
  h.keys(0, 'a')
  h.step(15)
  assert.equal(h.game.inspect().fighters[1].hp, 100)
  h.keys(0)
  h.keys(1)
  h.step(25)
  h.keys(0, 'up')
  h.step()
  h.keys(0, 'b')
  h.step()
  assert.equal(h.game.inspect().fighters[0].action, 'airHeavy')
  assert.equal(h.game.inspect().fighters[0].grounded, false)
  h.keys(0)
  h.step(55)
  assert.equal(h.game.inspect().fighters[0].grounded, true)
  assert.equal(h.game.inspect().fighters[0].y, 184)
})
test('Batman projectile and Flash dash cost meter and damage once with recognizable separate behavior', () => {
  const h = harness()
  h.step(78)
  h.keys(0, 'down', 'b')
  h.step(13)
  h.keys(0)
  assert.equal(h.game.inspect().projectiles.length, 1)
  assert(h.game.inspect().fighters[0].meter < 42)
  h.step(35)
  assert.equal(h.game.inspect().fighters[1].hp, 83)
  const d = harness()
  d.step(78)
  d.contact(55)
  const start = d.game.inspect().fighters[1].x
  d.keys(1, 'down', 'b')
  d.step(25)
  assert(d.game.inspect().fighters[1].x < start - 10)
  assert.equal(d.game.inspect().fighters[0].hp, 83)
  assert.equal(d.game.inspect().projectiles.length, 0)
})
test('1P AI fights autonomously without increasing the idle human score and reaches loss', () => {
  const h = harness(1, { roundsToWin: 1, roundSeconds: 20 })
  h.step(1800)
  assert(h.game.inspect().fighters[0].hp < 100)
  assert.equal(h.score[0], 0)
  assert.deepEqual(h.events, [{ type: 'gameOver' }])
  assert.equal(h.game.inspect().terminal, true)
})
test('2P controlled attacks win a full round, retain independent scores and call win with player index', () => {
  const h = harness(2, { roundsToWin: 1, roundSeconds: 120 })
  h.step(78)
  for (let t = 0; t < 3000 && !h.game.inspect().terminal; t++) {
    const s = h.game.inspect(),
      a = s.fighters[0],
      b = s.fighters[1]
    h.keys(0)
    if (s.phase === 'fight')
      h.keys(1, ...(Math.abs(a.x - b.x) > 32 ? ['left'] : t % 48 === 0 ? ['b'] : []))
    else h.keys(1)
    h.step()
  }
  assert.deepEqual(h.events, [{ type: 'win', player: 1 }])
  assert.equal(h.score[0], 0)
  assert(h.score[1] >= 1500)
})
test('timer adjudicates by health and resets both fighters completely between rounds', () => {
  const h = harness(2, { roundSeconds: 15, roundsToWin: 2 })
  h.step(78)
  h.contact()
  h.keys(0, 'a')
  h.step(6)
  h.keys(0)
  h.step(1050)
  const s = h.game.inspect()
  assert.equal(s.round, 2)
  assert.equal(s.fighters[0].wins, 1)
  assert.equal(s.fighters[1].hp, 100)
  assert.equal(s.fighters[0].meter, 100)
  assert.equal(s.projectiles.length, 0)
})
test('unknown identities are rejected instead of silently replacing requested characters', () => {
  assert.throws(() => factory({ roster: ['batman', 'sonic'] }), /complete assets/)
})
test('modified startup keeps displayed active pose synchronized with damage timing', () => {
  const h = harness(2, { moves: { light: { startup: 12 } } })
  h.step(78)
  h.contact()
  h.keys(0, 'a')
  h.step(11)
  assert.equal(h.game.inspect().fighters[1].hp, 100)
  assert(h.game.inspect().fighters[0].animationAge < 5)
  h.step()
  assert.equal(h.game.inspect().fighters[1].hp, 93)
  assert.equal(h.game.inspect().fighters[0].animationAge, 5)
})
test('custom identity hitboxes are consumed from sprite metadata rather than hidden fixed rectangles', () => {
  const custom = structuredClone(assets.characters.batman)
  custom.id = 'original-hero'
  custom.animations.light.frames[1].hitboxes[0] = { x: 14, y: -48, w: 75, h: 9, kind: 'mid' }
  const h = harness(2, { roster: ['original-hero', 'flash'], assets: { 'original-hero': custom } })
  h.step(78)
  h.contact(80)
  h.keys(0, 'a')
  h.step(5)
  assert.equal(h.game.inspect().fighters[1].hp, 93)
  assert.equal(h.game.inspect().fighters[0].id, 'original-hero')
})
test('follow-up attack pressed during hitstop is buffered into the light-to-heavy cancel window', () => {
  const h = harness()
  h.step(78)
  h.contact()
  h.keys(0, 'a')
  h.step(5)
  h.keys(0, 'b')
  h.step()
  h.keys(0)
  h.step(4)
  assert.equal(h.game.inspect().fighters[0].action, 'heavy')
})
test('same seed and control sequence produce identical combat state', () => {
  const play = () => {
    const h = harness(1)
    for (let t = 0; t < 1200; t++) {
      h.keys(
        0,
        ...(t % 90 < 25 ? ['right'] : t % 37 === 0 ? ['a'] : t % 79 === 0 ? ['down', 'b'] : []),
      )
      h.step()
    }
    return h.game.inspect()
  }
  assert.deepEqual(play(), play())
})

// A machine-readable behavioral artifact is generated independently of test
// output; screenshot and human play judgments remain separate evidence.
const evidence = harness(1, { roundsToWin: 1, roundSeconds: 20 })
evidence.step(1800)
mkdirSync(resolve(root, 'evidence'), { recursive: true })
writeFileSync(
  resolve(root, 'evidence', 'ai-match.json'),
  JSON.stringify(
    {
      scenario: 'idle human vs seeded CPU',
      seed: 19,
      frames: 1800,
      state: evidence.game.inspect(),
      terminalEvents: evidence.events,
      publicScores: evidence.score,
    },
    null,
    2,
  ),
)
