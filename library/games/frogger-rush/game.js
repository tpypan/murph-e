// TITLE: FROGGER RUSH
// GENRE: dodge
// CONTROLS: arrows, a
// Cross six traffic lanes, then race back. One crash ends the run.

const FROG = [
  '.bb..bb.',
  'b7b..b7b',
  '.bbbbbb.',
  'bbb11bbb',
  '.bbbbbb.',
  '..bbbb..',
  '.bb..bb.',
  'bb....bb',
]
const CAR = [
  '........',
  '.888888.',
  '88999988',
  '88888888',
  '.555555.',
  '.6....6.',
  '55....55',
  '........',
]
const TRUCK = [
  '........',
  '.cccccc.',
  'cccc777c',
  'cccccccc',
  'c555555c',
  '.6....6.',
  '55....55',
  '........',
]
const TAXI = [
  '........',
  '.aaaaaa.',
  'aa7777aa',
  'aaaaaaaa',
  'a444444a',
  '.6....6.',
  '55....55',
  '........',
]
const FLY = [
  '..5.5...',
  '.55555..',
  '..aaaa..',
  '.a7aa7a.',
  '..aaaa..',
  '...aa...',
]
const ARROW_UP = ['..7...', '.777..', '77777.', '..7...', '..7...', '..7...']
const ARROW_DOWN = ['..7...', '..7...', '..7...', '77777.', '.777..', '..7...']

const ROAD_TOP = 38
const ROAD_BOTTOM = 194
const LANE_H = 24
const FROG_W = 8
const FROG_H = 8
const START_Y = 204
const GOAL_Y = 20

let g

function init(api) {
  g = {
    px: 124,
    py: START_Y,
    targetX: 124,
    targetY: START_Y,
    hopping: 0,
    hopTotal: 8,
    facing: 0,
    direction: -1,
    crossings: 0,
    crossingTime: 0,
    cars: [],
    flies: [],
    sparks: [],
    lanes: [],
    grass: [],
    ended: false,
  }

  for (let i = 0; i < 6; i++) {
    g.lanes.push({
      y: ROAD_TOP + 8 + i * LANE_H,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 0.65 + i * 0.12,
      gap: 66 + (i % 3) * 13,
      offset: api.rndi(0, 60),
      kind: i % 3,
    })
  }

  for (let i = 0; i < 42; i++) {
    g.grass.push({
      x: api.rndi(0, api.W - 1),
      y: api.rnd() < 0.5 ? api.rndi(13, 35) : api.rndi(197, 223),
      c: api.rnd() < 0.7 ? 11 : 10,
    })
  }

  buildTraffic(api)
  g.flies.push({ x: api.rndi(18, 230), y: 25, phase: api.rnd(6) })
  api.score(0)
}

function buildTraffic(api) {
  g.cars = []
  for (let lane = 0; lane < g.lanes.length; lane++) {
    const l = g.lanes[lane]
    for (let i = -1; i < 5; i++) {
      g.cars.push({
        x: i * l.gap + l.offset,
        y: l.y,
        lane,
        kind: l.kind,
      })
    }
  }
}

function beginHop(api, dx, dy) {
  if (g.hopping > 0 || g.ended) return
  g.targetX = api.clamp(g.px + dx, 4, api.W - FROG_W - 4)
  g.targetY = api.clamp(g.py + dy, GOAL_Y, START_Y)
  g.hopping = g.hopTotal
  if (dx < 0) g.facing = -1
  if (dx > 0) g.facing = 1
  api.sfx('jump')
}

function finishCrossing(api) {
  const quick = Math.max(0, 120 - Math.floor(g.crossingTime * 8))
  api.addScore(100 + quick)
  api.sfx('powerup')
  api.flash(10, 1)
  g.crossings++
  g.crossingTime = 0
  g.direction *= -1
  g.py = g.direction < 0 ? START_Y : GOAL_Y
  g.targetY = g.py
  g.px = 124
  g.targetX = g.px
  g.hopping = 0

  if (g.direction < 0) {
    g.flies.push({ x: api.rndi(18, 230), y: 25, phase: api.rnd(6) })
  } else {
    g.flies.push({ x: api.rndi(18, 230), y: 207, phase: api.rnd(6) })
  }
}

function crash(api) {
  if (g.ended || api.t <= 2) return
  g.ended = true
  for (let i = 0; i < 18; i++) {
    g.sparks.push({
      x: g.px + 4,
      y: g.py + 4,
      vx: api.rnd(4) - 2,
      vy: api.rnd(4) - 2,
      life: api.rndi(12, 28),
    })
  }
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  api.sfx('die')
  api.gameOver()
}

function update(api, dt) {
  if (g.ended) return
  g.crossingTime += dt

  if (g.hopping <= 0) {
    if (api.btnp('left')) beginHop(api, -16, 0)
    else if (api.btnp('right')) beginHop(api, 16, 0)
    else if (api.btnp('up')) beginHop(api, 0, -16)
    else if (api.btnp('down')) beginHop(api, 0, 16)
    else if (api.btnp('a')) beginHop(api, 0, g.direction * 12)
  } else {
    const n = g.hopping
    g.px += (g.targetX - g.px) / n
    g.py += (g.targetY - g.py) / n
    g.hopping--
    if (g.hopping === 0) {
      g.px = g.targetX
      g.py = g.targetY
    }
  }

  const rush = 1 + g.crossings * 0.22 + api.t * 0.006
  for (const c of g.cars) {
    const l = g.lanes[c.lane]
    c.x += l.speed * l.dir * rush
    if (l.dir > 0 && c.x > api.W + 16) c.x -= l.gap * 6
    if (l.dir < 0 && c.x < -24) c.x += l.gap * 6

    if (
      api.collide(g.px + 1, g.py + 2, 6, 5, c.x, c.y + 1, 12, 6)
    ) {
      crash(api)
      return
    }
  }

  for (const f of g.flies) {
    f.phase += 0.08
    if (api.collide(g.px, g.py, 8, 8, f.x, f.y, 6, 6)) {
      f.dead = true
      api.addScore(25)
      api.sfx('coin')
      api.flash(10, 1)
    }
  }
  g.flies = g.flies.filter((f) => !f.dead)

  if (g.direction < 0 && g.py <= GOAL_Y + 1) finishCrossing(api)
  if (g.direction > 0 && g.py >= START_Y - 1) finishCrossing(api)

  for (const s of g.sparks) {
    s.x += s.vx
    s.y += s.vy
    s.life--
  }
  g.sparks = g.sparks.filter((s) => s.life > 0)
}

function draw(api) {
  api.cls(3)

  for (const p of g.grass) api.pset(p.x, p.y, p.c)

  api.rectfill(0, ROAD_TOP, api.W, ROAD_BOTTOM - ROAD_TOP, 5)
  api.rectfill(0, ROAD_TOP, api.W, 3, 6)
  api.rectfill(0, ROAD_BOTTOM - 3, api.W, 3, 6)

  for (let lane = 1; lane < 6; lane++) {
    const y = ROAD_TOP + lane * LANE_H
    for (let x = (api.frame * 0.3) % 28 - 28; x < api.W; x += 28) {
      api.rectfill(x, y, 14, 2, lane % 2 ? 10 : 7)
    }
  }

  api.rectfill(0, 14, api.W, 4, 11)
  api.rectfill(0, 216, api.W, 4, 11)

  for (const c of g.cars) {
    const sprite = c.kind === 0 ? CAR : c.kind === 1 ? TRUCK : TAXI
    api.spr(sprite, c.x, c.y, g.lanes[c.lane].dir < 0)
  }

  for (const f of g.flies) {
    api.spr(FLY, f.x, f.y + Math.sin(f.phase) * 2)
  }

  if (g.hopping > 0) {
    api.circfill(g.px + 4, g.py + 10, 4, 1)
  }

  api.spr(FROG, g.px, g.py - (g.hopping > 0 ? 3 : 0), g.facing < 0)

  for (const s of g.sparks) api.pset(s.x, s.y, s.life % 2 ? 10 : 8)

  if (g.direction < 0) api.spr(ARROW_UP, 4, 20)
  else api.spr(ARROW_DOWN, 4, 202)

  api.text('RUSH ' + (g.crossings + 1), 174, 15, 7)
}
