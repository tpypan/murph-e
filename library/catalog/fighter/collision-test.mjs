import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

// Compile the current core with saved assets without rebuilding or writing pack evidence.
const saved = JSON.parse(readFileSync(resolve(import.meta.dirname, 'assets.json'), 'utf8'))
const factory = Function(
  'FIGHTER_ASSETS',
  `${readFileSync(resolve(import.meta.dirname, 'core.js'), 'utf8')}\nreturn fighterFactory;`,
)(saved)
const shape = { x: 14, y: -48, w: 20, h: 9, kind: 'mid' }
const remote = { x: 500, y: -48, w: 10, h: 9, kind: 'mid' }

function harness(edit = () => {}, config = {}) {
  const characters = {
    left: structuredClone(saved.characters.batman),
    right: structuredClone(saved.characters.batman),
  }
  edit(characters)
  const game = factory({ roster: ['left', 'right'], assets: characters, ...config })
  const held = [new Set(), new Set()],
    previous = [new Set(), new Set()]
  const scores = [0, 0],
    drawings = []
  const api = new Proxy(
    {
      players: 2,
      btn: (key, player = 0) => held[player].has(key),
      btnp: (key, player = 0) => held[player].has(key) && !previous[player].has(key),
      score: (value, player = 0) => {
        scores[player] = value
      },
      addScore: (value, player = 0) => {
        scores[player] += value
      },
      rnd: (n = 1) => 0.5 * n,
      spr: (...args) => drawings.push(args),
    },
    { get: (target, name) => target[name] ?? (() => {}) },
  )
  game.init(api)
  const keys = (player, ...names) => {
    held[player] = new Set(names)
  }
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      game.update(api)
      for (let player = 0; player < 2; player++) previous[player] = new Set(held[player])
    }
    return game.inspect()
  }
  const contact = () => {
    step(78)
    keys(0, 'right')
    for (
      let i = 0;
      i < 120 && game.inspect().fighters[1].x - game.inspect().fighters[0].x > 30;
      i++
    )
      step()
    keys(0)
    step()
  }
  const draw = () => {
    drawings.length = 0
    game.draw(api)
    return drawings
  }
  return { game, characters, keys, step, contact, scores, draw }
}

test('every hitbox can strike every hurtbox, mirrored for either controller', () => {
  for (const attacker of [0, 1]) {
    const defender = 1 - attacker
    const h = harness((characters) => {
      const attack = characters[attacker === 0 ? 'left' : 'right']
      const defense = characters[defender === 0 ? 'left' : 'right']
      attack.animations.light.frames[1].hitboxes = [remote, shape]
      for (const clip of Object.values(defense.animations))
        for (const frame of clip.frames) frame.hurtboxes = [remote, { x: -9, y: -59, w: 19, h: 58 }]
    })
    h.contact()
    h.keys(attacker, 'a')
    h.step(5)
    assert.equal(
      h.game.inspect().fighters[defender].hp,
      93,
      `P${attacker + 1}'s second hitbox must hit the second hurtbox`,
    )
    assert.equal(h.scores[attacker], 70)
    assert.equal(h.scores[defender], 0)
  }
})

test('overlapping attack and hurt shapes cause one damage/scoring event per swing', () => {
  const h = harness((characters) => {
    characters.left.animations.light.frames[1].hitboxes = [shape, { ...shape }]
    for (const clip of Object.values(characters.right.animations))
      for (const frame of clip.frames)
        frame.hurtboxes = [
          { x: -9, y: -59, w: 19, h: 58 },
          { x: -8, y: -55, w: 16, h: 50 },
        ]
  })
  h.contact()
  h.keys(0, 'a')
  h.step(5)
  h.keys(0)
  h.step(20)
  assert.equal(h.game.inspect().fighters[1].hp, 93)
  assert.deepEqual(h.scores, [70, 0])
})

test('empty hurtbox arrays are invulnerable, not a point-shaped collision at the feet', () => {
  const h = harness((characters) => {
    characters.left.animations.light.frames[1].hitboxes = [{ x: 0, y: -20, w: 80, h: 40 }]
    for (const clip of Object.values(characters.right.animations))
      for (const frame of clip.frames) frame.hurtboxes = []
  })
  h.contact()
  h.keys(0, 'a')
  h.step(8)
  assert.equal(h.game.inspect().fighters[1].hp, 100)
  assert.deepEqual(h.scores, [0, 0])
})

test('projectiles collide with later hurtboxes and score once', () => {
  const h = harness((characters) => {
    for (const clip of Object.values(characters.right.animations))
      for (const frame of clip.frames) frame.hurtboxes = [remote, { x: -9, y: -59, w: 19, h: 58 }]
  })
  h.step(78)
  h.keys(0, 'down', 'b')
  h.step(13)
  h.keys(0)
  h.step(40)
  assert.equal(h.game.inspect().fighters[1].hp, 83)
  assert.deepEqual(h.scores, [170, 0])
})

test('simultaneous equal attacks trade fairly for both controllers', () => {
  const h = harness()
  h.contact()
  h.keys(0, 'a')
  h.keys(1, 'a')
  h.step(5)
  assert.deepEqual(
    h.game.inspect().fighters.map((f) => f.hp),
    [93, 93],
  )
  assert.deepEqual(h.scores, [70, 70])
})

test('unequal clip durations choose matching visible pixels at exact frame boundaries', () => {
  const h = harness((characters) => {
    characters.right.animations.idle = {
      loop: true,
      frames: [
        { ...characters.right.animations.idle.frames[0], duration: 3, hurtboxes: [] },
        {
          ...characters.right.animations.idle.frames[1],
          duration: 7,
          hurtboxes: [{ x: -9, y: -59, w: 19, h: 58 }],
        },
      ],
    }
  })
  const rows = h.characters.right.frames
  assert.equal(h.draw()[1][0], rows.idle0.pixels)
  h.step(2)
  assert.equal(h.draw()[1][0], rows.idle0.pixels)
  h.step()
  assert.equal(h.draw()[1][0], rows.idle1.pixels)
  h.step(6)
  assert.equal(h.draw()[1][0], rows.idle1.pixels)
  h.step()
  assert.equal(h.draw()[1][0], rows.idle0.pixels)
})

test('collision uses the duration-selected hurtboxes, including an invulnerable opening pose', () => {
  const h = harness(
    (characters) => {
      const idle = characters.right.animations.idle.frames
      characters.right.animations.idle = {
        loop: true,
        frames: [
          { ...idle[0], duration: 3, hurtboxes: [] },
          { ...idle[1], duration: 7, hurtboxes: [{ x: -9, y: -59, w: 19, h: 58 }] },
        ],
      }
    },
    { moves: { light: { startup: 2, active: 5 } } },
  )
  h.contact()
  while (h.game.inspect().fighters[1].animationAge % 10) h.step()
  h.keys(0, 'a')
  h.step(2)
  assert.equal(h.game.inspect().fighters[1].hp, 100)
  h.step()
  assert.equal(h.game.inspect().fighters[1].hp, 93)
})

test('clip-step anchors place both facings without changing saved pixel-frame anchors', () => {
  const h = harness((characters) => {
    for (const character of Object.values(characters))
      for (const step of character.animations.idle.frames)
        step.anchor = { x: step.anchor.x + 7, y: step.anchor.y + 3 }
  })
  const drawn = h.draw()
  h.game.inspect().fighters.forEach((fighter, i) => {
    const character = h.characters[fighter.id]
    const step = character.animations.idle.frames[0]
    const frame = character.frames[step.frame]
    assert.notDeepEqual(step.anchor, frame.anchor)
    assert.equal(
      drawn[i][1],
      Math.round(
        fighter.x - (fighter.face === 1 ? step.anchor.x : frame.size.w - 1 - step.anchor.x),
      ),
    )
    assert.equal(drawn[i][2], Math.round(fighter.y - step.anchor.y))
    assert.equal(drawn[i][3], fighter.face === -1)
  })
})

test('a projectile keeps its incoming direction after its owner turns during an aerial cross-up', () => {
  const h = harness(
    (characters) => {
      const jump = characters.right.animations.jump.frames
      // A delayed, extended aerial hurtbox lets the already-launched projectile
      // connect after this fighter crosses the owner. All state changes use inputs.
      jump[0].duration = 10
      jump[1].duration = 12
      jump[2].duration = 18
      jump[0].hurtboxes = []
      jump[1].hurtboxes = []
      jump[2].hurtboxes = [{ x: 0, y: -5, w: 160, h: 20 }]
    },
    { moves: { special: { startup: 1, active: 1, recovery: 1 } } },
  )
  h.contact()
  h.keys(0, 'down', 'b')
  h.keys(1, 'up', 'left')
  h.step()
  h.keys(0)
  h.keys(1, 'left')
  let before
  for (let tick = 0; tick < 35 && h.game.inspect().fighters[1].hp === 100; tick++) {
    before = h.game.inspect()
    h.step()
  }
  const hit = h.game.inspect()
  assert.equal(hit.fighters[1].hp, 83, 'the traveling projectile connects')
  assert.equal(hit.fighters[0].face, -1, 'owner has turned away from the original shot')
  assert.equal(Math.sign(before.projectiles[0].vx), 1, 'shot still travels to the right')
  const x = hit.fighters[1].x
  h.keys(1)
  h.step(hit.freeze + 1)
  assert.ok(
    h.game.inspect().fighters[1].x > x,
    'impact pushes right with the shot, not left with its owner',
  )
  assert.deepEqual(h.scores, [170, 0])
})

test('an airborne knockout lands during round-end without extra damage or scoring', () => {
  const h = harness(() => {}, {
    roundsToWin: 1,
    moves: { light: { startup: 1, active: 1, recovery: 1, damage: 40, stun: 1, push: 0 } },
  })
  h.contact()
  for (let hit = 0; hit < 2; hit++) {
    h.keys(0, 'a')
    h.step()
    h.keys(0)
    h.step(15)
  }
  assert.equal(h.game.inspect().fighters[1].hp, 20)
  h.keys(0, 'a')
  h.keys(1, 'up')
  h.step()
  const knockout = h.game.inspect()
  assert.equal(knockout.phase, 'roundEnd')
  assert.equal(knockout.fighters[1].hp, 0)
  assert.equal(knockout.fighters[1].grounded, false)
  assert.ok(knockout.fighters[1].y < 184)
  const scores = [...h.scores]
  h.keys(0)
  h.keys(1)
  h.step(60)
  const landed = h.game.inspect()
  assert.equal(landed.phase, 'roundEnd')
  assert.equal(landed.fighters[1].grounded, true)
  assert.equal(landed.fighters[1].y, 184)
  assert.equal(landed.fighters[1].animation, 'ko')
  assert.equal(landed.fighters[1].hp, 0)
  assert.deepEqual(h.scores, scores)
})

test('airborne timeout winner and loser both land before round-end completes', () => {
  const h = harness(() => {}, { roundsToWin: 1, roundSeconds: 15 })
  h.contact()
  h.keys(0, 'a')
  h.step(5)
  h.keys(0)
  while (h.game.inspect().timeLeft > 10) h.step()
  h.keys(0, 'up')
  h.keys(1, 'up')
  h.step(10)
  const timeout = h.game.inspect()
  assert.equal(timeout.phase, 'roundEnd')
  assert.equal(timeout.lastWinner, 0)
  assert.ok(timeout.fighters.every((fighter) => !fighter.grounded && fighter.y < 184))
  const scores = [...h.scores],
    health = timeout.fighters.map((fighter) => fighter.hp)
  h.keys(0)
  h.keys(1)
  h.step(60)
  const landed = h.game.inspect()
  assert.equal(landed.phase, 'roundEnd')
  assert.ok(landed.fighters.every((fighter) => fighter.grounded && fighter.y === 184))
  assert.equal(landed.fighters[0].animation, 'victory')
  assert.deepEqual(
    landed.fighters.map((fighter) => fighter.hp),
    health,
  )
  assert.deepEqual(h.scores, scores)
})
