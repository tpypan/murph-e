// TITLE: FROGGER DASH
// GENRE: dodge
// CONTROLS: arrows a
// Cross the busy road, reach each bank, and race back for points.

const FROG = [
  '.bb..bb.',
  'b7b..b7b',
  '.bbbbbb.',
  'bbb11bbb',
  '.bbbbbb.',
  '..b11b..',
  '.bb..bb.',
  'bb....bb',
]
const CAR_RED = [
  '..8888..',
  '.888888.',
  '88988988',
  '88888888',
  '.500005.',
  '.6....6.',
]
const CAR_BLUE = [
  '..cccc..',
  '.cccccc.',
  'cc7cc7cc',
  'cccccccc',
  '.500005.',
  '.6....6.',
]
const CAR_YELLOW = [
  '..aaaa..',
  '.aaaaaa.',
  'aa7aa7aa',
  'aaaaaaaa',
  '.500005.',
  '.6....6.',
]
const RIPPLE = [
  '........',
  '..cccc..',
  '.c....c.',
  '........',
  '..cccc..',
  '........',
]
const LILY = [
  '..333...',
  '.3bb33..',
  '3bbbb33.',
  '33bb333.',
  '.33333..',
  '..333...',
]

const FROG_W = 8
const FROG_H = 8
const TOP_BANK = 20
const ROAD_TOP = 42
const ROAD_BOTTOM = 194
const BOTTOM_BANK = 214
const LANES = [50, 72, 94, 116, 138, 160, 182]

let g

function init(api) {
  g = {
    x: api.W / 2 - 4,
    y: BOTTOM_BANK - FROG_H,
    fromBottom: true,
    hopX: 0,
    hopY: 0,
    hopFrames: 0,
    cars: [],
    laneTimers: [],
    splashes: [],
    waterDots: [],
    crossings: 0,
    grace: 190,
    ended: false,
  }
  for (let i = 0; i < LANES.length; i++) {
    g.laneTimers.push(80 + i * 32)
  }
  for (let i = 0; i < 26; i++) {
    g.waterDots.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(13, api.H - 1),
      phase: api.rndi(0, 80),
    })
  }
  api.score(0)
}

function makeCar(api, lane) {
  const dir = lane % 2 === 0 ? 1 : -1
  const speed = 1.15 + lane * 0.06 + api.t * 0.025 + api.rnd(0.45)
  g.cars.push({
    x: dir > 0 ? -12 : api.W + 4,
    y: LANES[lane],
    vx: speed * dir,
    kind: api.rndi(0, 2),
    lane,
  })
}

function startHop(api, dx, dy, quick) {
  if (g.hopFrames > 0 || g.ended) return
  g.hopX = dx
  g.hopY = dy
  g.hopFrames = quick ? 5 : 8
  api.sfx('jump')
  g.splashes.push({ x: g.x + 4, y: g.y + 7, life: 12 })
}

function finishCrossing(api) {
  let reached = false
  if (g.fromBottom && g.y <= TOP_BANK) {
    g.y = TOP_BANK
    g.fromBottom = false
    reached = true
  } else if (!g.fromBottom && g.y >= BOTTOM_BANK - FROG_H) {
    g.y = BOTTOM_BANK - FROG_H
    g.fromBottom = true
    reached = true
  }
  if (reached) {
    g.crossings++
    api.addScore(100 + g.crossings * 10)
    api.sfx('coin')
    api.flash(10, 1)
  }
}

function crash(api) {
  if (g.ended || api.t <= 3) return
  g.ended = true
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  api.sfx('die')
  api.gameOver()
}

function update(api, dt) {
  if (g.ended) return
  if (g.grace > 0) g.grace--

  if (g.hopFrames <= 0) {
    if (api.btnp('left')) startHop(api, -16, 0, false)
    else if (api.btnp('right')) startHop(api, 16, 0, false)
    else if (api.btnp('up')) startHop(api, 0, -16, false)
    else if (api.btnp('down')) startHop(api, 0, 16, false)
    else if (api.btnp('a')) {
      startHop(api, 0, g.fromBottom ? -24 : 24, true)
    }
  }

  if (g.hopFrames > 0) {
    g.x += g.hopX / (Math.abs(g.hopY) === 24 ? 5 : 8)
    g.y += g.hopY / (Math.abs(g.hopY) === 24 ? 5 : 8)
    g.hopFrames--
    if (g.x < -FROG_W) g.x = api.W
    if (g.x > api.W) g.x = -FROG_W
    if (g.y < 13) g.y = api.H - FROG_H
    if (g.y > api.H - FROG_H) g.y = 13
    if (g.hopFrames === 0) finishCrossing(api)
  }

  for (let i = 0; i < LANES.length; i++) {
    g.laneTimers[i]--
    if (g.laneTimers[i] <= 0) {
      makeCar(api, i)
      const density = 115 - api.t * 0.65
      g.laneTimers[i] = Math.max(24, density + api.rndi(0, 65))
    }
  }

  for (const car of g.cars) {
    car.x += car.vx
    if (
      g.grace <= 0 &&
      g.hopFrames <= 5 &&
      api.collide(g.x + 1, g.y + 1, 6, 6, car.x, car.y, 8, 6)
    ) {
      crash(api)
      break
    }
  }
  g.cars = g.cars.filter((car) => car.x > -20 && car.x < api.W + 20)

  for (const splash of g.splashes) splash.life--
  g.splashes = g.splashes.filter((splash) => splash.life > 0)
}

function draw(api) {
  api.cls(12)

  for (const dot of g.waterDots) {
    const x = (dot.x + api.frame * 0.18) % api.W
    api.pset(x, dot.y, (api.frame + dot.phase) % 50 < 6 ? 7 : 13)
  }

  api.rectfill(0, 13, api.W, ROAD_TOP - 13, 3)
  api.rectfill(0, ROAD_BOTTOM + 1, api.W, api.H - ROAD_BOTTOM, 3)
  api.rectfill(0, ROAD_TOP, api.W, ROAD_BOTTOM - ROAD_TOP + 1, 5)
  api.rectfill(0, ROAD_TOP, api.W, 3, 6)
  api.rectfill(0, ROAD_BOTTOM - 2, api.W, 3, 6)

  for (let lane = 1; lane < LANES.length; lane++) {
    const y = LANES[lane] - 5
    for (let x = -20; x < api.W; x += 32) {
      const scroll = lane % 2 ? api.frame % 32 : -(api.frame % 32)
      api.rectfill(x + scroll, y, 14, 2, 10)
    }
  }

  for (let x = 8; x < api.W; x += 38) {
    api.spr(LILY, x, 23)
    api.spr(LILY, x + 15, 202)
  }

  for (const car of g.cars) {
    const sprite = car.kind === 0 ? CAR_RED : car.kind === 1 ? CAR_BLUE : CAR_YELLOW
    api.spr(sprite, car.x, car.y, car.vx < 0)
  }

  for (const splash of g.splashes) {
    if (splash.life % 4 < 3) api.spr(RIPPLE, splash.x - 4, splash.y - 3)
  }

  const bounce = g.hopFrames > 0 ? -Math.sin(g.hopFrames * 0.7) * 3 : Math.sin(api.t * 4) * 0.5
  api.spr(FROG, g.x, g.y + bounce, false, !g.fromBottom)

  api.text(g.fromBottom ? "GO UP" : "GO DOWN", 96, 14, 7)
  for (let i = 0; i < g.crossings % 8; i++) {
    api.circfill(224 + (i % 4) * 7, 17 + Math.floor(i / 4) * 8, 2, 11)
  }
}
