import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const saved = JSON.parse(readFileSync(resolve(import.meta.dirname, 'assets.json'), 'utf8'))
const factory = Function(
  'FIGHTER_ASSETS',
  `${readFileSync(resolve(import.meta.dirname, 'core.js'), 'utf8')}\nreturn fighterFactory;`,
)(saved)

function webCharacter() {
  const character = structuredClone(saved.characters.batman)
  character.projectile = {
    travel: 'webTravel',
    impact: 'webImpact',
    bind: 'webBind',
    speed: 3.6,
    life: 90,
    box: { x: -6, y: -3, w: 12, h: 6 },
    bindTicks: 38,
  }
  for (const [name, color, loop, duration] of [
    ['webTravel', '#123456', true, 3],
    ['webImpact', '#abcdef', false, 5],
    ['webBind', '#654321', true, 4],
  ]) {
    character.frames[name] = {
      pixels: ['.01.', '10..'],
      palette: ['#000000', color],
      layers: [{ pixels: ['...0', '....'], palette: ['#fedcba'] }],
      size: { w: 4, h: 2 },
      anchor: { x: 1, y: 1 },
    }
    character.animations[name] = {
      loop,
      frames: [{ frame: name, duration, anchor: { x: 2, y: 1 }, hitboxes: [], hurtboxes: [] }],
    }
  }
  const step = character.animations.special.frames[1]
  step.projectileOrigin = { x: step.anchor.x + 17, y: step.anchor.y - 41 }
  return character
}

function harness({ edit = () => {}, config = {}, players = 2, web = true } = {}) {
  const characters = {
    left: web ? webCharacter() : structuredClone(saved.characters.batman),
    right: web ? webCharacter() : structuredClone(saved.characters.batman),
  }
  edit(characters)
  const game = factory({ roster: ['left', 'right'], assets: characters, ...config })
  const held = [new Set(), new Set()],
    previous = [new Set(), new Set()],
    scores = [0, 0],
    drawings = []
  const api = new Proxy(
    {
      players,
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
  const draw = () => {
    drawings.length = 0
    game.draw(api)
    return drawings
  }
  const cast = (owner = 0) => {
    keys(owner, 'down', 'b')
    step(13)
    keys(owner)
  }
  const until = (predicate, limit = 120) => {
    for (let i = 0; i < limit; i++) {
      if (predicate(game.inspect())) return game.inspect()
      step()
    }
    assert.fail('Expected state did not arrive within bounded fixture')
  }
  const contact = () => {
    keys(0, 'right')
    until((s) => s.fighters[1].x - s.fighters[0].x <= 30)
    keys(0)
    step()
  }
  return { game, api, characters, keys, step, draw, cast, until, contact, scores }
}

test('authored sockets spawn both directions with incoming speed and registered composite travel art', () => {
  for (const owner of [0, 1]) {
    const h = harness()
    h.step(78)
    const before = h.game.inspect().fighters[owner]
    h.cast(owner)
    const p = h.game.inspect().projectiles[0]
    assert.ok(p)
    assert.equal(p.owner, owner)
    assert.equal(p.vx, before.face * 3.6)
    assert.equal(p.x, before.x + before.face * (17 + 3.6))
    assert.equal(p.y, before.y - 41)
    const character = h.characters[owner ? 'right' : 'left'],
      frame = character.frames.webTravel
    const calls = h
      .draw()
      .filter((args) => args[0] === frame.pixels || args[0] === frame.layers[0].pixels)
    assert.equal(calls.length, 2)
    assert.equal(calls[0][0], frame.pixels)
    assert.equal(calls[1][0], frame.layers[0].pixels)
    assert.deepEqual(calls[0].slice(1, 5), calls[1].slice(1, 5))
    assert.equal(calls[0][1], Math.round(p.x - (before.face === 1 ? 2 : 4 - 1 - 2)))
    assert.equal(calls[0][2], Math.round(p.y - 1))
    assert.equal(calls[0][3], before.face === -1)
    assert.equal(calls[0][5], frame.palette)
    assert.equal(calls[1][5], frame.layers[0].palette)
  }
})

test('grounded hit scores once, shows authored impact and bind, locks controls finitely then releases', () => {
  const h = harness()
  h.step(78)
  h.cast()
  const hit = h.until((s) => s.fighters[1].bind)
  assert.equal(hit.fighters[1].hp, 83)
  assert.deepEqual(h.scores, [170, 0])
  assert.equal(hit.projectiles.length, 0)
  assert.equal(hit.fighters[1].bind.owner, 0)
  assert.ok(hit.fighters[1].bind.remaining <= 38 && hit.fighters[1].bind.remaining > 0)
  assert.ok(hit.fighters[1].bindImmunity > 0)
  const draw = h.draw()
  for (const name of ['webImpact', 'webBind']) {
    const frame = h.characters.left.frames[name]
    const planes = draw.filter(
      (args) => args[0] === frame.pixels || args[0] === frame.layers[0].pixels,
    )
    assert.equal(planes.length, 2, name)
    assert.deepEqual(planes[0].slice(1, 5), planes[1].slice(1, 5))
  }
  // inspect returns detached bind metadata, never a mutation handle.
  hit.fighters[1].bind.remaining = 9999
  assert.ok(h.game.inspect().fighters[1].bind.remaining <= 38)
  const start = h.game.inspect().fighters[1].x
  h.keys(1, 'left', 'up', 'a')
  for (let i = 0; i < 12; i++) {
    const state = h.step()
    assert.ok(state.fighters[1].bind)
    assert.equal(state.fighters[1].x, start)
    assert.equal(state.fighters[1].grounded, true)
    assert.equal(state.fighters[1].action, null)
  }
  h.keys(1)
  h.until((s) => !s.fighters[1].bind, 60)
  h.until((s) => !s.fighters[1].stun && !s.freeze, 40)
  const released = h.game.inspect().fighters[1].x
  h.keys(1, 'left')
  h.step()
  assert.ok(h.game.inspect().fighters[1].x < released)
  assert.deepEqual(h.scores, [170, 0])
  h.step(30)
  assert.equal(
    h.draw().filter((args) => args[0] === h.characters.left.frames.webImpact.pixels).length,
    0,
  )
})

test('guard blocks binding and a miss expires without damage or scoring', () => {
  const blocked = harness()
  blocked.step(78)
  blocked.keys(1, 'right')
  blocked.cast()
  const state = blocked.until((s) => s.fighters[1].hp < 100)
  assert.equal(state.fighters[1].hp, 99)
  assert.equal(state.fighters[1].bind, null)
  assert.deepEqual(blocked.scores, [0, 0])
  const miss = harness({
    edit: (characters) => {
      for (const clip of Object.values(characters.right.animations))
        for (const frame of clip.frames) frame.hurtboxes = []
      characters.left.projectile.life = 5
    },
  })
  miss.step(78)
  miss.cast()
  assert.equal(miss.game.inspect().projectiles.length, 1)
  miss.step(6)
  assert.equal(miss.game.inspect().projectiles.length, 0)
  assert.equal(miss.game.inspect().fighters[1].hp, 100)
  assert.equal(miss.game.inspect().fighters[1].bind, null)
  assert.deepEqual(miss.scores, [0, 0])
})

test('follow-up actual damage clears an active bind; initialization clears bind and immunity', () => {
  const h = harness({ config: { moves: { special: { recovery: 1 } } } })
  h.step(78)
  h.contact()
  h.cast()
  h.until((s) => s.fighters[1].bind)
  h.until((s) => !s.freeze && !s.fighters[0].action)
  h.keys(0, 'a')
  const damaged = h.until((s) => s.fighters[1].hp < 83)
  assert.equal(damaged.fighters[1].bind, null)
  assert.ok(damaged.fighters[1].bindImmunity > 0)
  h.game.init(h.api)
  for (const fighter of h.game.inspect().fighters) {
    assert.equal(fighter.bind, null)
    assert.equal(fighter.bindImmunity, 0)
  }
})

test('legacy projectile keeps its spawn, damage and score without authored projectile art', () => {
  const h = harness({ web: false })
  h.step(78)
  h.cast()
  const projectile = h.game.inspect().projectiles[0]
  assert.equal(projectile.x, 69 + 22 + 3.6)
  assert.equal(projectile.y, 184 - 43)
  assert.equal(projectile.vx, 3.6)
  h.step(40)
  assert.equal(h.game.inspect().fighters[1].hp, 83)
  assert.equal(h.game.inspect().fighters[1].bind, null)
  assert.deepEqual(h.scores, [170, 0])
})

test('airborne hits damage once without binding and authored collision offsets control misses', () => {
  const air = harness()
  air.step(78)
  air.contact()
  air.keys(1, 'up')
  air.cast()
  const hit = air.until((s) => s.fighters[1].hp < 100, 45)
  assert.equal(hit.fighters[1].hp, 83)
  assert.equal(hit.fighters[1].grounded, false)
  assert.equal(hit.fighters[1].bind, null)
  assert.deepEqual(air.scores, [170, 0])

  const offset = harness({
    edit: (characters) => {
      characters.left.projectile.box = { x: -2, y: 45, w: 4, h: 4 }
    },
  })
  offset.step(78)
  offset.cast()
  offset.step(90)
  assert.equal(offset.game.inspect().fighters[1].hp, 100)
  assert.equal(offset.game.inspect().projectiles.length, 0)
  assert.deepEqual(offset.scores, [0, 0])
})

test('a quick second projectile damages but cannot rebind during the 120-tick immunity', () => {
  const h = harness({
    config: {
      moves: {
        special: { damage: 1, stun: 1, push: 0, recovery: 1 },
        light: { startup: 1, active: 1, recovery: 1, damage: 1, stun: 1, push: 0 },
      },
    },
  })
  h.step(78)
  h.contact()
  h.cast()
  h.until((s) => s.fighters[1].bind)
  h.until((s) => !s.freeze && !s.fighters[0].action)
  h.keys(0, 'a')
  h.until((s) => s.fighters[1].hp === 98)
  h.keys(0)
  h.until((s) => !s.freeze && !s.fighters[0].action)
  const before = h.game.inspect().fighters[1].bindImmunity
  assert.ok(before > 0)
  assert.ok(
    h.game.inspect().fighters[0].meter >= 60,
    'confirmed hit earned enough meter for follow-up',
  )
  h.cast()
  const second = h.until((s) => s.fighters[1].hp === 97)
  assert.equal(second.fighters[1].bind, null)
  assert.ok(second.fighters[1].bindImmunity > 0 && second.fighters[1].bindImmunity < before)
  assert.deepEqual(h.scores, [130, 0])
})

test('round end and the next round clear binds, projectiles and immunity', () => {
  const h = harness({ config: { roundSeconds: 15, roundsToWin: 2 } })
  h.step(78)
  h.contact()
  h.until((s) => s.timeLeft <= 20, 1000)
  h.cast()
  h.until((s) => s.fighters[1].bind, 6)
  const end = h.until((s) => s.phase === 'roundEnd', 20)
  assert.equal(end.fighters[1].bind, null)
  assert.equal(end.projectiles.length, 0)
  const next = h.until((s) => s.round === 2, 130)
  for (const fighter of next.fighters) {
    assert.equal(fighter.bind, null)
    assert.equal(fighter.bindImmunity, 0)
    assert.equal(fighter.hp, 100)
  }
})

test('web hit ownership is correct for the CPU opponent and either two-player controller', () => {
  for (const [players, owner] of [
    [1, 0],
    [2, 0],
    [2, 1],
  ]) {
    const h = harness({ players })
    h.step(78)
    h.cast(owner)
    const hit = h.until((s) => s.fighters[1 - owner].bind)
    assert.equal(hit.fighters[1 - owner].hp, 83)
    assert.equal(hit.fighters[1 - owner].bind.owner, owner)
    assert.equal(h.scores[owner], 170)
    assert.equal(h.scores[1 - owner], 0)
  }
})

test('long composite trails reveal only traveled pixels in both directions without moving anchors or mutating art', () => {
  for (const owner of [0, 1]) {
    const h = harness({
      edit: (characters) => {
        for (const character of Object.values(characters)) {
          character.frames.webTravel = {
            pixels: ['1'.repeat(40), '01'.repeat(20)],
            palette: ['#000000', '#123456'],
            layers: [{ pixels: ['.0'.repeat(20), '0.'.repeat(20)], palette: ['#abcdef'] }],
            size: { w: 40, h: 2 },
            anchor: { x: 37, y: 1 },
          }
          character.animations.webTravel.frames[0].anchor = { x: 38, y: 1 }
          character.projectile.box = { x: -4, y: -3, w: 8, h: 6 }
        }
      },
    })
    const frame = h.characters[owner ? 'right' : 'left'].frames.webTravel
    const original = JSON.stringify(frame)
    h.step(78)
    h.cast(owner)
    for (const [age, hiddenColumns] of [
      [1, 30],
      [3, 23],
      [10, 0],
    ]) {
      while (h.game.inspect().projectiles[0].age < age) h.step()
      const projectile = h.game.inspect().projectiles[0]
      const calls = h
        .draw()
        .filter((args) => args[5] === frame.palette || args[5] === frame.layers[0].palette)
      assert.equal(calls.length, 2)
      for (const [index, plane] of [frame, frame.layers[0]].entries()) {
        const call = calls[index]
        assert.equal(call[5], plane.palette, 'base stays before overlay')
        assert.deepEqual(
          call[0],
          plane.pixels.map((row) => '.'.repeat(hiddenColumns) + row.slice(hiddenColumns)),
        )
        assert.deepEqual(call.slice(1, 5), [
          Math.round(projectile.x - (owner === 0 ? 38 : 40 - 1 - 38)),
          Math.round(projectile.y - 1),
          owner === 1,
          false,
        ])
      }
      assert.equal(calls[0][0].join('').replaceAll('.', '').length, (40 - hiddenColumns) * 2)
      assert.equal(calls[1][0].join('').replaceAll('.', '').length, 40 - hiddenColumns)
      assert.equal(
        JSON.stringify(frame),
        original,
        'masking does not alter saved base or layer pixels',
      )
      if (hiddenColumns === 0) {
        assert.equal(calls[0][0], frame.pixels)
        assert.equal(calls[1][0], frame.layers[0].pixels)
      }
    }
  }
})

test('non-looping two-frame bind advances once then holds its last pose until finite expiry', () => {
  const h = harness({
    edit: (characters) => {
      const character = characters.left
      character.frames.webBindHeld = {
        ...structuredClone(character.frames.webBind),
        pixels: ['1001', '.11.'],
      }
      const first = character.animations.webBind.frames[0]
      character.animations.webBind = {
        loop: false,
        frames: [
          { ...first, duration: 3 },
          { ...first, frame: 'webBindHeld', duration: 4 },
        ],
      }
    },
  })
  h.step(78)
  h.cast()
  h.until((state) => state.fighters[1].bind)
  const initial = h.characters.left.frames.webBind.pixels
  const final = h.characters.left.frames.webBindHeld.pixels
  assert.ok(h.draw().some((args) => args[0] === initial))
  for (const age of [3, 10, 37]) {
    h.until((state) => state.fighters[1].bind?.age === age, 60)
    const calls = h.draw()
    assert.ok(
      calls.some((args) => args[0] === final),
      `held pose at bind age ${age}`,
    )
    assert.ok(!calls.some((args) => args[0] === initial), 'finished clip never restarts')
  }
  h.step()
  assert.equal(h.game.inspect().fighters[1].bind, null)
  assert.ok(!h.draw().some((args) => args[0] === final))
  assert.deepEqual(h.scores, [170, 0])
})

test('malformed projectile clips, bounds and emitter sockets reject before play', () => {
  for (const edit of [
    (c) => {
      c.animations.webTravel.loop = false
    },
    (c) => {
      c.animations.webImpact.loop = true
    },
    (c) => {
      c.animations.webBind.loop = 'yes'
    },
    (c) => {
      c.projectile.speed = 8.1
    },
    (c) => {
      c.projectile.life = 181
    },
    (c) => {
      c.projectile.life = 1.5
    },
    (c) => {
      c.projectile.bindTicks = 91
    },
    (c) => {
      c.projectile.box.w = 65
    },
    (c) => {
      delete c.animations.special.frames[1].projectileOrigin
    },
    (c) => {
      c.animations.special.frames[1].projectileOrigin.x = -1
    },
    (c) => {
      c.animations.special.frames[1].projectileOrigin.x =
        c.frames[c.animations.special.frames[1].frame].size.w
    },
    (c) => {
      c.projectile.travel = 'missing'
    },
    (c) => {
      c.projectile.impact = 'missing'
    },
    (c) => {
      c.projectile.bind = 'missing'
    },
    (c) => {
      c.projectile.speed = 0
    },
    (c) => {
      c.projectile.speed = Infinity
    },
    (c) => {
      c.projectile.life = 0
    },
    (c) => {
      c.projectile.bindTicks = -1
    },
    (c) => {
      c.projectile.box.w = 0
    },
    (c) => {
      c.projectile.box.x = NaN
    },
    (c) => {
      c.animations.special.frames[1].projectileOrigin.x = Infinity
    },
  ]) {
    const custom = webCharacter()
    edit(custom)
    assert.throws(() => factory({ roster: ['custom', 'custom'], assets: { custom } }), /fighter:/)
  }
})
