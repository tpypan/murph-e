// TITLE: TRAIN SNAKE
// GENRE: snake
// CONTROLS: left right a
// Steer a winding locomotive, collect cargo, and avoid the rails and cars.
// LEFT and RIGHT rotate the train; A fires the boiler for a brief boost.

const CELL = 8
const COLS = 32
const ROWS = 26
const TOP = 16

const ENGINE = [
  '.aaaa...',
  'aaaaaa..',
  '.99999..',
  '49999994',
  '44444444',
  '.5.55.5.',
  '.0.00.0.',
  '........',
]
const CAR = [
  '........',
  '.666666.',
  '.644446.',
  '.644446.',
  '.666666.',
  '..5..5..',
  '..0..0..',
  '........',
]
const CRATE = [
  '44444444',
  '49999994',
  '49444494',
  '49499494',
  '49499494',
  '49444494',
  '49999994',
  '44444444',
]

let g

function init(api) {
  g = {
    cars: [],
    dir: 0,
    queuedTurn: 0,
    crate: { x: 0, y: 0 },
    timer: 0,
    baseStep: 12,
    boost: 0,
    grow: 0,
    smoke: [],
    sparks: [],
    ties: [],
  }
  for (let i = 0; i < 5; i++) g.cars.push({ x: 11 - i, y: 13 })
  for (let i = 0; i < 24; i++) {
    g.ties.push({
      x: api.rndi(1, COLS - 2),
      y: api.rndi(1, ROWS - 2),
      shade: api.rndi(0, 1),
    })
  }
  placeCrate(api)
  api.score(0)
}

function placeCrate(api) {
  for (let tries = 0; tries < 200; tries++) {
    const x = api.rndi(2, COLS - 3)
    const y = api.rndi(2, ROWS - 3)
    if (!g.cars.some((c) => c.x === x && c.y === y)) {
      g.crate = { x, y }
      return
    }
  }
}

function smokePuff(api) {
  const h = g.cars[0]
  if (!h) return
  g.smoke.push({
    x: h.x * CELL + 3,
    y: TOP + h.y * CELL + 2,
    vx: api.rnd(0.6) - 0.3,
    life: 24,
  })
}

function crash(api) {
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  api.sfx('die')
  for (let i = 0; i < 12; i++) {
    const h = g.cars[0]
    g.sparks.push({
      x: h.x * CELL + 4,
      y: TOP + h.y * CELL + 4,
      vx: api.rnd(4) - 2,
      vy: api.rnd(4) - 2,
      life: 20,
    })
  }
  api.gameOver()
}

function update(api, dt) {
  if (api.btnp('left')) g.queuedTurn = -1
  if (api.btnp('right')) g.queuedTurn = 1

  if (api.btnp('a')) {
    g.boost = 42
    smokePuff(api)
    api.sfx('powerup')
  }
  if (g.boost > 0) {
    g.boost--
    if (api.frame % 4 === 0) smokePuff(api)
  }

  for (const p of g.smoke) {
    p.x += p.vx
    p.y -= 0.35
    p.life--
  }
  g.smoke = g.smoke.filter((p) => p.life > 0 && p.y > 12)

  for (const s of g.sparks) {
    s.x += s.vx
    s.y += s.vy
    s.vy += 0.08
    s.life--
  }
  g.sparks = g.sparks.filter((s) => s.life > 0)

  g.timer++
  const timeSpeed = Math.floor(api.t / 18)
  const lengthSpeed = Math.floor(g.cars.length / 7)
  const boostSpeed = g.boost > 0 ? 4 : 0
  const every = Math.max(3, g.baseStep - timeSpeed - lengthSpeed - boostSpeed)
  if (g.timer < every) return
  g.timer = 0

  if (g.queuedTurn !== 0) {
    g.dir = (g.dir + g.queuedTurn + 4) % 4
    g.queuedTurn = 0
    api.sfx('select')
  }

  const dx = [1, 0, -1, 0][g.dir]
  const dy = [0, 1, 0, -1][g.dir]
  const head = g.cars[0]
  const nx = head.x + dx
  const ny = head.y + dy
  const wall = nx <= 0 || ny <= 0 || nx >= COLS - 1 || ny >= ROWS - 1
  const self = g.cars.some((c) => c.x === nx && c.y === ny)

  if (wall || self) {
    if (api.t > 2) crash(api)
    return
  }

  g.cars.unshift({ x: nx, y: ny })
  if (api.frame % 2 === 0) smokePuff(api)

  if (nx === g.crate.x && ny === g.crate.y) {
    g.grow += 2
    api.addScore(25 + g.cars.length)
    api.sfx('coin')
    api.flash(10, 1)
    placeCrate(api)
  }

  if (g.grow > 0) g.grow--
  else g.cars.pop()
}

function drawTrack(api) {
  api.rectfill(0, TOP, api.W, ROWS * CELL, 3)
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = (y + api.frame / 20) % 4; x < COLS; x += 4) {
      api.pset(x * CELL, TOP + y * CELL, y % 2 ? 11 : 10)
    }
  }
  for (const t of g.ties) {
    api.rectfill(t.x * CELL + 1, TOP + t.y * CELL + 3, 6, 2, t.shade ? 4 : 5)
  }
  api.rectfill(0, TOP, api.W, CELL, 4)
  api.rectfill(0, TOP + (ROWS - 1) * CELL, api.W, CELL, 4)
  api.rectfill(0, TOP, CELL, ROWS * CELL, 4)
  api.rectfill((COLS - 1) * CELL, TOP, CELL, ROWS * CELL, 4)
  for (let x = 0; x < COLS; x += 2) {
    api.rectfill(x * CELL, TOP + 2, CELL, 2, 6)
    api.rectfill(x * CELL, TOP + ROWS * CELL - 4, CELL, 2, 6)
  }
}

function draw(api) {
  api.cls(1)
  drawTrack(api)

  const bob = api.frame % 20 < 10 ? 0 : 1
  api.spr(CRATE, g.crate.x * CELL, TOP + g.crate.y * CELL - bob)

  for (const p of g.smoke) {
    const colour = p.life > 14 ? 7 : p.life > 7 ? 6 : 5
    api.circfill(p.x, p.y, p.life > 12 ? 2 : 1, colour)
  }

  for (let i = g.cars.length - 1; i >= 1; i--) {
    const c = g.cars[i]
    api.spr(CAR, c.x * CELL, TOP + c.y * CELL)
  }

  const h = g.cars[0]
  const flipX = g.dir === 2
  api.spr(ENGINE, h.x * CELL, TOP + h.y * CELL, flipX, false)
  if (g.dir === 1 || g.dir === 3) {
    api.rectfill(h.x * CELL + 3, TOP + h.y * CELL + 1, 3, 6, 10)
    api.pset(h.x * CELL + 4, TOP + h.y * CELL + (g.dir === 1 ? 7 : 0), 7)
  }

  for (const s of g.sparks) api.pset(s.x, s.y, s.life % 3 === 0 ? 7 : 10)

  if (g.boost > 0) {
    api.text('BOOST', api.W - 44, api.H - 8, 10)
    api.line(h.x * CELL, TOP + h.y * CELL + 7, h.x * CELL - 5, TOP + h.y * CELL + 7, 9)
  }
}
