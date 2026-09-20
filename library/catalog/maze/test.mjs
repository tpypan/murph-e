import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = import.meta.dirname
const factory = Function(`return ${readFileSync(resolve(root, 'module.js'), 'utf8')}`)()
const assets = JSON.parse(readFileSync(resolve(root, 'assets.json'), 'utf8'))
const dirs = [
  [1, 0, 'right'],
  [0, 1, 'down'],
  [-1, 0, 'left'],
  [0, -1, 'up'],
]
function importedFixture() {
  const imported = structuredClone(assets)
  for (const f of Object.values(imported.frames)) {
    f.pixels = f.pixels.map((row) => row.replace(/[0-9a-f]/g, '0'))
    f.palette = ['#123456']
  }
  // Imported geometry must never disable collision or make returning eyes lethal.
  for (const clip of Object.values(imported.animations))
    for (const f of clip.frames) {
      f.hitboxes = []
      f.hurtboxes = []
    }
  return imported
}
function harness(players = 1, config = {}) {
  const held = [new Set(), new Set()],
    previous = [new Set(), new Set()],
    score = [0, 0],
    terminal = [],
    inputs = []
  let frameCount = 0
  const game = factory(config)
  const noop = () => {}
  const api = {
    players,
    W: 256,
    H: 224,
    P1: 12,
    P2: 8,
    btn: (key, i = 0) => held[i].has(key),
    btnp: (key, i = 0) => held[i].has(key) && !previous[i].has(key),
    score: (n, i) => {
      if (i === undefined) {
        score[0] = n
        score[1] = n
      } else score[i] = n
    },
    addScore: (n, i) => {
      if (i === undefined) {
        score[0] += n
        if (players === 2) score[1] += n
      } else score[i] += n
    },
    getScore: (i = 0) => score[i],
    sfx: noop,
    shake: noop,
    win: (i) => terminal.push({ type: 'win', player: i }),
    gameOver: () => terminal.push({ type: 'gameOver' }),
    cls: noop,
    pset: noop,
    line: noop,
    rect: noop,
    rectfill: noop,
    circ: noop,
    circfill: noop,
    spr: noop,
    text: noop,
    textCenter: noop,
  }
  game.init(api)
  const keys = (i, ...names) => {
    const next = new Set(names)
    for (const key of held[i])
      if (!next.has(key)) inputs.push({ at: frameCount, player: i, button: key, down: false })
    for (const key of next)
      if (!held[i].has(key)) inputs.push({ at: frameCount, player: i, button: key, down: true })
    held[i] = next
  }
  const step = (n = 1) => {
    for (let j = 0; j < n; j++) {
      game.update(api, 1 / 60)
      game.draw(api)
      held.forEach((set, i) => {
        previous[i] = new Set(set)
      })
      frameCount++
    }
    return game.inspect()
  }
  return { game, api, keys, step, score, terminal, inputs, frameCount: () => frameCount }
}
function next(layout, x, y, d, house = false) {
  let nx = x + dirs[d][0],
    ny = y + dirs[d][1]
  if (layout[y]?.[x] === 'T' && dirs[d][1] === 0) {
    if (nx < 0) nx = 18
    if (nx > 18) nx = 0
  }
  const t = layout[ny]?.[nx] ?? '#'
  return t !== '#' && (house || !['=', 'H'].includes(t)) ? { x: nx, y: ny } : null
}
function path(layout, from, target) {
  const queue = [{ x: from.x, y: from.y, first: null }],
    seen = new Set([from.y * 19 + from.x])
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]
    if (p.x === target.x && p.y === target.y) return p.first
    for (let d = 0; d < 4; d++) {
      const n = next(layout, p.x, p.y, d)
      if (n && !seen.has(n.y * 19 + n.x)) {
        seen.add(n.y * 19 + n.x)
        queue.push({ ...n, first: p.first ?? d })
      }
    }
  }
  return null
}
function navigate(h, player, target) {
  const s = h.game.inspect(),
    p = s.players[player]
  if (p.to) return
  const d = path(s.layout, p, target)
  h.keys(player, ...(d === null ? [] : [dirs[d][2]]))
}
function nearestPellet(s, p) {
  const queue = [{ x: p.x, y: p.y }],
    seen = new Set([p.y * 19 + p.x])
  for (let i = 0; i < queue.length; i++) {
    const a = queue[i]
    if (s.pellets[a.y][a.x]) return a
    for (let d = 0; d < 4; d++) {
      const n = next(s.layout, a.x, a.y, d)
      if (n && !seen.has(n.y * 19 + n.x)) {
        seen.add(n.y * 19 + n.x)
        queue.push(n)
      }
    }
  }
  return null
}

test('every pickup is reachable; player cannot enter central house; tunnels pair only at mouths', () => {
  const h = harness(),
    s = h.game.inspect(),
    start = s.players[0]
  for (let y = 0; y < 19; y++)
    for (let x = 0; x < 19; x++)
      if (s.pellets[y][x]) assert(path(s.layout, start, { x, y }) !== null, `${x},${y}`)
  assert.equal(next(s.layout, 9, 6, 1), null)
  assert.deepEqual(next(s.layout, 9, 6, 1, true), { x: 9, y: 7 })
  assert.deepEqual(next(s.layout, 0, 9, 2), { x: 18, y: 9 })
  assert.equal(next(s.layout, 1, 1, 3), null)
})
test('all original directional clips have complete cached pixels, timing, anchors and collision metadata', () => {
  for (const avatar of ['chomper', 'goose'])
    for (let p = 0; p < 2; p++)
      for (const direction of ['up', 'down', 'left', 'right'])
        assert.equal(assets.animations[`${avatar}-${p}-${direction}`].frames.length, 4)
  for (const frame of Object.values(assets.frames)) {
    assert.equal(frame.pixels.length, 14)
    assert(frame.pixels.every((row) => row.length === 14 && /^[.0-9a-f]+$/.test(row)))
    assert.deepEqual(frame.anchor, { x: 7, y: 7 })
  }
  for (const clip of Object.values(assets.animations))
    for (const f of clip.frames) {
      assert(assets.frames[f.frame])
      assert(f.duration > 0)
      assert(Array.isArray(f.hitboxes) && Array.isArray(f.hurtboxes))
    }
  assert.notDeepEqual(assets.frames['goose-0-right-0'].pixels, assets.frames['goose-0-up-0'].pixels)
})
test('imported art and metadata cannot change deterministic contact, death, capture or scoring', () => {
  for (const config of [{ lives: 1 }, { huntMode: 'player-hunts', levels: 1 }]) {
    const original = harness(2, config)
    const imported = harness(2, { ...config, assets: importedFixture(), playerMarkers: true })
    for (let tick = 0; tick < 1800; tick++) {
      if (tick % 77 === 0) {
        const direction = dirs[Math.floor(tick / 77) % 4][2]
        for (const h of [original, imported]) {
          h.keys(0, direction)
          h.keys(1, 'left')
        }
      }
      assert.deepEqual(imported.step(), original.step())
    }
    assert.deepEqual(imported.terminal, original.terminal)
    assert.deepEqual(imported.score, original.score)
  }
})
test('native source palette/anchor survives tunnel duplicates and caller mutation', () => {
  const input = importedFixture()
  const h = harness(2, {
    assets: input,
    ghostCount: 0,
    playerMarkers: true,
    playerStarts: [
      { x: 0, y: 9 },
      { x: 18, y: 9 },
    ],
  })
  for (const f of Object.values(input.frames)) {
    f.palette[0] = '#654321'
    f.anchor.x = 0
    f.pixels[0] = 'bad'
  }
  const calls = [],
    labels = []
  h.api.spr = (...args) => calls.push(args)
  h.api.text = (...args) => labels.push(args)
  h.game.draw(h.api)
  assert.equal(calls.length, 4)
  assert.equal(Math.abs(calls[0][1] - calls[1][1]), 190)
  for (const call of calls) {
    assert.deepEqual(call[5], ['#123456'])
    assert.equal(call[0][0].length, 14)
  }
  assert.equal(calls[0][1], 31)
  assert(labels.some((c) => c[0] === '1') && labels.some((c) => c[0] === '2'))
})
test('partial clips, invalid source pixels/palettes and truncated lifecycle clips fail before play', () => {
  for (const mutate of [
    (a) => delete a.animations['ghost-3-up'],
    (a) => {
      a.frames[Object.keys(a.frames)[0]].pixels[0] = 'f'
    },
    (a) => {
      a.frames[Object.keys(a.frames)[0]].palette = []
    },
    (a) => {
      a.frames[Object.keys(a.frames)[0]].anchor.x = 100
    },
    (a) => {
      a.animations['chomper-0-death'].frames[0].duration = 76
    },
    (a) => {
      a.animations['reform-0'].loop = true
    },
  ]) {
    const input = importedFixture()
    mutate(input)
    assert.throws(() => factory({ assets: input }), /maze:/)
  }
})
test('ready accepts movement immediately and an early turn buffers at the next legal junction', () => {
  const h = harness(1, {
    ghostCount: 0,
    playerStarts: [
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ],
  })
  h.keys(0, 'right')
  assert.equal(h.game.inspect().players[0].x, 4)
  h.step(3)
  h.keys(0, 'down')
  h.step(5)
  let p = h.game.inspect().players[0]
  assert.equal(p.x, 5)
  assert.equal(p.queued, 1)
  h.step(8)
  p = h.game.inspect().players[0]
  assert.equal(p.x, 6)
  assert.equal(p.y, 3)
  h.step(8)
  p = h.game.inspect().players[0]
  assert.equal(p.x, 6)
  assert.equal(p.y, 4)
})
test('honk responds during READY without letting ghosts harm the player', () => {
  const h = harness(2, { avatar: 'goose', huntMode: 'player-hunts' })
  h.step(60)
  h.keys(0, 'a')
  h.keys(1, 'a')
  h.step()
  const s = h.game.inspect()
  assert.equal(s.phase, 'ready')
  assert.equal(s.players[0].honk, 180)
  assert.equal(s.players[1].honk, 180)
  assert.equal(s.events.filter((e) => e.type === 'honk').length, 2)
  assert(s.ghosts.every((g) => g.state === 'house'))
})
test('reverse in a corridor is immediate and spatially continuous', () => {
  const h = harness(1, {
    ghostCount: 0,
    playerStarts: [
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ],
  })
  h.step(75)
  h.keys(0, 'right')
  h.step(3)
  const before = h.game.inspect().players[0].position.x
  h.keys(0, 'left')
  h.step()
  const after = h.game.inspect().players[0].position.x
  assert(after < before)
  assert(Math.abs(after - before) <= 1.3)
})
test('tunnel movement wraps only at paired mouths and preserves pixel speed across the seam', () => {
  const h = harness(1, {
    ghostCount: 0,
    playerStarts: [
      { x: 0, y: 9 },
      { x: 18, y: 9 },
    ],
  })
  h.step(75)
  h.keys(0, 'left')
  let before = h.game.inspect().players[0].position.x
  for (let i = 0; i < 8; i++) {
    h.step()
    const after = h.game.inspect().players[0].position.x
    let delta = after - before
    if (delta > 95) delta -= 190
    if (delta < -95) delta += 190
    assert(Math.abs(delta + 1.25) < 0.001)
    before = after
  }
  assert.equal(h.game.inspect().players[0].x, 18)
  assert.equal(h.game.inspect().players[0].y, 9)
})
test('classic chase/scatter cycles advance on gameplay time', () => {
  const h = harness(1, { ghostCount: 0 })
  h.step(75 + 419)
  assert.equal(h.game.inspect().globalMode, 'scatter')
  h.step()
  assert.equal(h.game.inspect().globalMode, 'chase')
  h.step(1200)
  assert.equal(h.game.inspect().globalMode, 'scatter')
})
test('all four ghosts visibly leave through the door, never teleport onto a corridor', () => {
  const h = harness(1, { huntMode: 'player-hunts', capturesToClear: 30, huntSeconds: 180 })
  h.step(500)
  const s = h.game.inspect()
  assert(s.ghosts.every((g) => g.releases >= 1))
  assert.equal(
    new Set(s.events.filter((e) => e.type === 'ghost-released').map((e) => e.id)).size,
    4,
  )
  assert(
    s.ghosts.every((g) =>
      ['frightened', 'returning', 'house', 'leaving', 'reforming'].includes(g.state),
    ),
  )
})
test('permanent goose hunter captures every ghost; eyes travel home, body reforms and ghost releases again', () => {
  const h = harness(1, {
    avatar: 'goose',
    huntMode: 'player-hunts',
    capturesToClear: 30,
    huntSeconds: 180,
  })
  h.step(75)
  const captured = new Set(),
    returned = new Set(),
    releasedAgain = new Set()
  for (let t = 0; t < 8500 && releasedAgain.size < 4; t++) {
    const s = h.game.inspect()
    for (const e of s.events) {
      if (e.type === 'capture') captured.add(e.id)
      if (e.type === 'ghost-home') returned.add(e.id)
      if (e.type === 'ghost-released' && e.releases >= 2) releasedAgain.add(e.id)
    }
    const target =
      s.ghosts.find((g) => !captured.has(g.id) && g.state === 'frightened') ||
      s.ghosts.find((g) => g.state === 'frightened')
    if (target) navigate(h, 0, target)
    if (t % 180 === 0) h.keys(0, ...(s.players[0].to ? [dirs[s.players[0].dir][2], 'a'] : ['a']))
    h.step()
  }
  assert.deepEqual([...captured].sort(), [0, 1, 2, 3])
  assert.deepEqual([...returned].sort(), [0, 1, 2, 3])
  assert.deepEqual([...releasedAgain].sort(), [0, 1, 2, 3])
  assert.equal(h.game.inspect().lives, 3)
  assert(!h.game.inspect().events.some((e) => e.type === 'life-lost'))
  mkdirSync(resolve(root, 'evidence'), { recursive: true })
  writeFileSync(
    resolve(root, 'evidence/lifecycle.json'),
    JSON.stringify(
      {
        captured: [...captured],
        returned: [...returned],
        releasedAgain: [...releasedAgain],
        state: h.game.inspect(),
      },
      null,
      2,
    ),
  )
})
test('classic contact costs a shared life; hunt contact never does; fresh life restores actors and clears power', () => {
  const h = harness(2, { lives: 2 })
  h.step(75)
  for (let t = 0; t < 3000 && h.game.inspect().lives === 2; t++) {
    const s = h.game.inspect(),
      g = s.ghosts.find((g) => g.state === 'chase' || g.state === 'scatter')
    if (g) navigate(h, 0, g)
    h.step()
  }
  assert.equal(h.game.inspect().lives, 1)
  assert.equal(h.game.inspect().phase, 'death')
  h.step(75)
  const s = h.game.inspect()
  assert.equal(s.phase, 'ready')
  assert.equal(s.power, 0)
  assert.equal(s.players[0].x, 9)
  assert.equal(s.players[1].x, 10)
  assert(s.ghosts.every((g) => g.state === 'house'))
})
test('actual power pickup enters frightened mode; returning eyes are noncolliding; power expiry restores classic mood', () => {
  const h = harness(1, {
    playerStarts: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  })
  h.step(76)
  assert(h.game.inspect().power > 0)
  assert(h.game.inspect().events.some((e) => e.type === 'pickup' && e.power))
  h.keys(0, 'up')
  h.step(480)
  const s = h.game.inspect()
  assert.equal(s.power, 0)
  assert(s.ghosts.some((g) => g.state === 'chase' || g.state === 'scatter'))
  assert.deepEqual(assets.frames['eyes-up'].hurtboxes, [])
})
test('two players move independently, share pickup credit once, clear all pellets and finish a classic run', () => {
  const h = harness(2, { ghostCount: 0, levels: 1 })
  h.step(75)
  h.keys(0, 'left')
  h.keys(1, 'right')
  h.step(8)
  assert.equal(h.game.inspect().players[0].x, 8)
  assert.equal(h.game.inspect().players[1].x, 11)
  for (let t = 0; t < 12000 && !h.game.inspect().terminal; t++) {
    const s = h.game.inspect()
    if (s.phase === 'play')
      for (let i = 0; i < 2; i++) {
        const p = s.players[i],
          target = nearestPellet(s, p)
        if (target) navigate(h, i, target)
      }
    h.step()
  }
  assert.equal(h.game.inspect().remaining, 0)
  assert.deepEqual(h.terminal, [{ type: 'win', player: undefined }])
  assert.equal(h.score[0], h.score[1])
  const s = h.game.inspect(),
    unique = new Set(s.events.filter((e) => e.type === 'pickup').map((e) => `${e.x},${e.y}`))
  assert.equal(unique.size, s.totalPellets)
  writeFileSync(
    resolve(root, 'evidence/cooperative-replay.json'),
    JSON.stringify(
      {
        config: { ghostCount: 0, levels: 1 },
        players: 2,
        frames: h.frameCount(),
        inputs: h.inputs,
        expectedScores: h.score,
      },
      null,
      2,
    ),
  )
})
test('both controllers can complete a full hunter game against all four real ghosts without losing lives', () => {
  const config = {
    avatar: 'goose',
    huntMode: 'player-hunts',
    capturesToClear: 8,
    levels: 1,
    huntSeconds: 180,
  }
  const h = harness(2, config)
  h.step(75)
  for (let t = 0; t < 10000 && !h.game.inspect().terminal; t++) {
    const s = h.game.inspect()
    for (let i = 0; i < 2; i++) {
      const active = s.ghosts.filter((g) => g.state === 'frightened'),
        target = active[i % Math.max(1, active.length)]
      if (target) navigate(h, i, target)
    }
    h.step()
  }
  const s = h.game.inspect()
  assert.equal(s.captures, 8)
  assert.equal(s.lives, 3)
  assert.deepEqual(h.terminal, [{ type: 'win', player: undefined }])
  assert.equal(h.score[0], h.score[1])
  assert(!s.events.some((e) => e.type === 'life-lost'))
  writeFileSync(
    resolve(root, 'evidence/hunt-replay.json'),
    JSON.stringify(
      { config, players: 2, frames: h.frameCount(), inputs: h.inputs, expectedScores: h.score },
      null,
      2,
    ),
  )
})
test('hunt mode times out through gameOver and level completion increases target and resets state', () => {
  const idle = harness(1, { huntMode: 'player-hunts', huntSeconds: 20 })
  idle.step(1400)
  assert.deepEqual(idle.terminal, [{ type: 'gameOver' }])
  assert.equal(idle.game.inspect().lives, 3)
  const h = harness(2, {
    avatar: 'goose',
    huntMode: 'player-hunts',
    capturesToClear: 1,
    levels: 2,
    huntSeconds: 180,
  })
  h.step(75)
  for (let t = 0; t < 9000 && h.game.inspect().level === 1; t++) {
    const s = h.game.inspect()
    for (let i = 0; i < 2; i++) {
      const g = s.ghosts.find((g) => g.state === 'frightened')
      if (g) navigate(h, i, g)
    }
    h.step()
  }
  const s = h.game.inspect()
  assert.equal(s.level, 2)
  assert.equal(s.captures, 0)
  assert.equal(s.quota, 3)
  assert.equal(s.remaining, s.totalPellets)
  assert.equal(s.power, 0)
  assert(s.ghosts.every((g) => g.state === 'house'))
  assert.equal(h.score[0], h.score[1])
})
test('invalid maps and unsupported identities fail explicitly', () => {
  assert.throws(() => factory({ avatar: 'mario' }), /avatar/)
  const map = harness().game.inspect().layout
  map[7] = map[7].replace('=', '#')
  assert.throws(() => factory({ layout: map }), /house/)
})
