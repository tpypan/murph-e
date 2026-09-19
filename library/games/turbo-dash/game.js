// TITLE: TURBO DASH
// GENRE: neon runner
// CONTROLS: left right a
// Sprint through three lanes. Dodge barriers, grab stars, and use A to dash.
// Speed and tunnel density rise forever. One crash ends the run.

const RUNNER = [
  '...77...',
  '..7cc7..',
  '..cccc..',
  '.c7cc7c.',
  'cccccccc',
  '..c..c..',
  '.cc..cc.',
  'c......c',
]
const BARRIER = [
  '88888888',
  '89999998',
  '89aaaa98',
  '89aaaa98',
  '89aaaa98',
  '89aaaa98',
  '89999998',
  '88888888',
]
const STAR = [
  '...a....',
  '...a....',
  'a.aaa.a.',
  '.aaaaa..',
  '..aaa...',
  '.aa.aa..',
  'a.....a.',
  '........',
]
const DASH_FLAME = [
  '.9....9.',
  '..9..9..',
  '...99...',
  '..9..9..',
  '.8....8.',
  '8......8',
]
const SPARK = ['.a.', 'aaa', '.a.']

const LANES = [72, 124, 176]
const PLAYER_Y = 187
const PLAYER_W = 8
const PLAYER_H = 8

let g

function init(api) {
  g = {
    lane: 1,
    x: LANES[1],
    targetX: LANES[1],
    speed: 5,
    distance: 0,
    spawnIn: 190,
    things: [],
    stars: [],
    sparks: [],
    dash: 0,
    dashCool: 0,
  }
  for (let i = 0; i < 28; i++) {
    g.stars.push({
      x: api.rndi(4, api.W - 5),
      y: api.rndi(14, api.H - 1),
      z: api.rndi(1, 3),
    })
  }
  api.score(0)
}

function spawnRow(api) {
  const starRow = api.rnd() < 0.34
  if (starRow) {
    g.things.push({
      lane: api.rndi(0, 2),
      y: 28,
      kind: 'star',
      phase: api.rnd(6.28),
      dead: false,
    })
    return
  }

  const first = api.rndi(0, 2)
  g.things.push({ lane: first, y: 28, kind: 'barrier', dead: false })

  const doubleChance = Math.min(0.72, 0.12 + api.t * 0.009)
  if (api.rnd() < doubleChance) {
    let second = api.rndi(0, 2)
    if (second === first) second = (second + 1) % 3
    g.things.push({ lane: second, y: 28, kind: 'barrier', dead: false })
  }

  const safe = [0, 1, 2].filter((n) => n !== first)
  const bonusLane = safe[api.rndi(0, safe.length - 1)]
  if (api.rnd() < 0.48) {
    g.things.push({
      lane: bonusLane,
      y: -2,
      kind: 'star',
      phase: api.rnd(6.28),
      dead: false,
    })
  }
}

function burst(api) {
  for (let i = 0; i < 6; i++) {
    g.sparks.push({
      x: g.x + 3,
      y: PLAYER_Y + 7,
      vx: api.rnd(2) - 1,
      vy: 1 + api.rnd(2),
      life: api.rndi(8, 18),
    })
  }
}

function update(api, dt) {
  g.speed = 5 + api.t * 0.09
  const travel = g.speed + (g.dash > 0 ? 4.5 : 0)
  g.distance += travel

  if (api.btnp('left') && g.lane > 0) {
    g.lane--
    g.targetX = LANES[g.lane]
    api.sfx('select')
  }
  if (api.btnp('right') && g.lane < 2) {
    g.lane++
    g.targetX = LANES[g.lane]
    api.sfx('select')
  }

  g.x += (g.targetX - g.x) * 0.34

  if (g.dashCool > 0) g.dashCool--
  if (api.btnp('a')) {
    g.dash = 24
    g.dashCool = 8
    burst(api)
    api.sfx('shoot')
  }
  if (g.dash > 0) {
    g.dash--
    if (api.frame % 3 === 0) burst(api)
  }

  if (api.frame % 7 === 0) api.addScore(1)

  g.spawnIn -= travel
  if (g.spawnIn <= 0) {
    spawnRow(api)
    g.spawnIn = Math.max(38, api.rndi(82, 125) - api.t * 0.7)
  }

  for (const t of g.things) {
    t.y += travel * 0.58
    if (t.dead) continue

    const scale = api.clamp((t.y - 18) / 180, 0.25, 1)
    const tx = 128 + (LANES[t.lane] - 128) * scale
    const size = t.kind === 'star' ? 6 * scale : 8 * scale

    if (api.collide(g.x + 1, PLAYER_Y + 1, 6, 7, tx, t.y, size, size)) {
      if (t.kind === 'star') {
        t.dead = true
        api.addScore(g.dash > 0 ? 50 : 25)
        api.sfx('coin')
        api.flash(10, 1)
      } else if (g.dash > 0) {
        t.dead = true
        api.addScore(15)
        api.sfx('explode')
        api.flash(10, 1)
        api.shake(4)
      } else if (api.t > 2) {
        api.sfx('hit')
        api.flash(8, 3)
        api.shake(10)
        api.sfx('die')
        api.gameOver()
        return
      }
    }
  }
  g.things = g.things.filter((t) => !t.dead && t.y < api.H + 12)

  for (const s of g.sparks) {
    s.x += s.vx
    s.y += s.vy
    s.life--
  }
  g.sparks = g.sparks.filter((s) => s.life > 0 && s.y < api.H)

  for (const s of g.stars) {
    s.y += s.z * 0.2 + travel * 0.025
    if (s.y > api.H) {
      s.y = 13
      s.x = api.rndi(4, api.W - 5)
    }
  }
}

function draw(api) {
  api.cls(1)

  for (const s of g.stars) {
    const c = s.z === 3 ? 13 : s.z === 2 ? 12 : 5
    api.pset(s.x, s.y, c)
  }

  api.rectfill(0, 12, 34, api.H - 12, 2)
  api.rectfill(222, 12, 34, api.H - 12, 2)
  api.line(34, 12, 0, api.H, 14)
  api.line(221, 12, 255, api.H, 14)
  api.line(92, 12, 48, api.H, 12)
  api.line(164, 12, 208, api.H, 12)
  api.line(128, 12, 128, api.H, 5)

  const stripeOffset = g.distance % 26
  for (let i = 0; i < 10; i++) {
    const y = 22 + ((i * 26 + stripeOffset) % 218)
    const depth = (y - 12) / 212
    const half = 36 + depth * 92
    api.line(128 - half, y, 128 + half, y, i % 2 ? 3 : 5)
  }

  for (const t of g.things) {
    const scale = api.clamp((t.y - 18) / 180, 0.25, 1)
    const x = 128 + (LANES[t.lane] - 128) * scale
    const bob = t.kind === 'star' ? Math.sin(api.t * 8 + t.phase) * 2 : 0
    api.spr(t.kind === 'star' ? STAR : BARRIER, x, t.y + bob)
  }

  for (const s of g.sparks) api.spr(SPARK, s.x, s.y)

  if (g.dash > 0) {
    api.spr(DASH_FLAME, g.x, PLAYER_Y + 7)
    api.line(g.x - 8, PLAYER_Y + 2, g.x - 20, PLAYER_Y + 2, 10)
    api.line(g.x + 15, PLAYER_Y + 5, g.x + 27, PLAYER_Y + 5, 14)
  }

  api.spr(RUNNER, g.x, PLAYER_Y)
  api.rect(2, 14, 252, 207, 12)
}
