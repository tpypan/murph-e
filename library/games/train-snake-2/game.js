// TITLE: TRAIN SNAKE
// GENRE: snake
// CONTROLS: left right a
// Steer the locomotive with relative left and right turns. Couple cargo cars,
// avoid the station walls and your own train, and whistle for a speed burst.

const CELL = 8
const COLS = 32
const ROWS = 26
const TOP = 16

const ENGINE = [
  '.aaaa...',
  'aaaaaa..',
  'a7777aaa',
  'a99999aa',
  'aaaaaaaa',
  '.5.55.5.',
  '.000000.',
  '..0..0..',
]
const CAR = [
  '........',
  '.444444.',
  '49999994',
  '49aaaa94',
  '44444444',
  '.5.55.5.',
  '.000000.',
  '..0..0..',
]
const CABOOSE = [
  '..88....',
  '.8888...',
  '8888888.',
  '8999988.',
  '8888888.',
  '.5.55.5.',
  '.000000.',
  '..0..0..',
]
const CRATE = [
  '.444444.',
  '44999944',
  '49499494',
  '49944994',
  '49944994',
  '49499494',
  '44999944',
  '.444444.',
]
const SMOKE = [
  '..6...',
  '.667..',
  '66776.',
  '.666..',
  '..6...',
  '......',
]

let g

function init(api) {
  g = {
    train: [],
    dir: 0,
    queued: 0,
    cargo: { x: 0, y: 0 },
    timer: 0,
    baseStep: 11,
    boost: 0,
    smoke: [],
    collected: 0,
    lamps: [],
  }
  for (let i = 0; i < 4; i++) g.train.push({ x: 10 - i, y: 13 })
  for (let i = 0; i < 16; i++) {
    g.lamps.push({
      x: 12 + i * 16,
      glow: api.rndi(0, 20),
    })
  }
  placeCargo(api)
  api.score(0)
}

function blocked(x, y) {
  return g.train.some((car) => car.x === x && car.y === y)
}

function placeCargo(api) {
  for (let tries = 0; tries < 220; tries++) {
    const x = api.rndi(2, COLS - 3)
    const y = api.rndi(2, ROWS - 3)
    if (!blocked(x, y)) {
      g.cargo = { x, y }
      return
    }
  }
}

function emitSmoke(api) {
  const head = g.train[0]
  g.smoke.push({
    x: head.x * CELL + 1,
    y: TOP + head.y * CELL - 2,
    life: 25,
    drift: api.rnd(0.5) - 0.25,
  })
  if (g.smoke.length > 20) g.smoke.shift()
}

function crash(api) {
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  api.sfx('die')
  api.gameOver()
}

function update(api, dt) {
  if (api.btnp('left')) {
    g.queued = -1
    api.sfx('select')
  }
  if (api.btnp('right')) {
    g.queued = 1
    api.sfx('select')
  }

  if (api.btnp('a')) {
    g.boost = 36
    emitSmoke(api)
    api.tone(740, 90, 'square')
    api.tone(980, 140, 'triangle')
  }
  if (g.boost > 0) g.boost--

  for (const puff of g.smoke) {
    puff.y -= 0.3
    puff.x += puff.drift
    puff.life--
  }
  g.smoke = g.smoke.filter((puff) => puff.life > 0 && puff.y > 12)

  g.timer++
  const timeRush = Math.floor(api.t / 25)
  const cargoRush = Math.floor(g.collected / 2)
  const normalStep = Math.max(4, g.baseStep - cargoRush - timeRush)
  const every = Math.max(2, normalStep - (g.boost > 0 ? 3 : 0))
  if (g.timer < every) return
  g.timer = 0

  if (g.queued !== 0) {
    g.dir = (g.dir + g.queued + 4) % 4
    g.queued = 0
  }

  const dx = [1, 0, -1, 0][g.dir]
  const dy = [0, 1, 0, -1][g.dir]
  const head = g.train[0]
  const nx = head.x + dx
  const ny = head.y + dy
  const foundCargo = nx === g.cargo.x && ny === g.cargo.y

  const tail = g.train[g.train.length - 1]
  const hitSelf = g.train.some((car, i) =>
    car.x === nx && car.y === ny &&
    (foundCargo || i !== g.train.length - 1)
  )
  const hitWall = nx < 1 || nx >= COLS - 1 || ny < 1 || ny >= ROWS - 1

  if (hitWall || hitSelf) {
    if (api.t > 2) crash(api)
    return
  }

  g.train.unshift({ x: nx, y: ny })
  if (foundCargo) {
    g.collected++
    api.addScore(25 + g.collected * 5)
    api.sfx('coin')
    api.flash(10, 1)
    emitSmoke(api)
    placeCargo(api)
  } else {
    g.train.pop()
  }

  if (g.boost > 0 || api.frame % 3 === 0) emitSmoke(api)
  if (tail && g.train.length > 120) g.train.pop()
}

function drawTrack(api) {
  api.rectfill(0, TOP, api.W, api.H - TOP, 5)
  for (let y = TOP + 4; y < api.H; y += 16) {
    for (let x = 4; x < api.W; x += 16) {
      api.rectfill(x, y, 8, 2, 6)
    }
  }

  api.rectfill(0, TOP, api.W, CELL, 4)
  api.rectfill(0, api.H - CELL, api.W, CELL, 4)
  api.rectfill(0, TOP, CELL, api.H - TOP, 4)
  api.rectfill(api.W - CELL, TOP, CELL, api.H - TOP, 4)

  api.line(CELL, TOP + CELL, api.W - CELL, TOP + CELL, 7)
  api.line(CELL, api.H - CELL - 1, api.W - CELL, api.H - CELL - 1, 7)
  api.line(CELL, TOP + CELL, CELL, api.H - CELL, 7)
  api.line(api.W - CELL - 1, TOP + CELL, api.W - CELL - 1, api.H - CELL, 7)

  for (const lamp of g.lamps) {
    const lit = (api.frame + lamp.glow) % 40 < 30
    api.pset(lamp.x, TOP + 3, lit ? 10 : 9)
    api.pset(lamp.x, api.H - 4, lit ? 10 : 9)
  }
}

function draw(api) {
  api.cls(1)
  drawTrack(api)

  const bob = api.frame % 24 < 12 ? 0 : 1
  api.spr(CRATE, g.cargo.x * CELL, TOP + g.cargo.y * CELL + bob)

  for (const puff of g.smoke) {
    if (puff.life % 4 !== 0) api.spr(SMOKE, puff.x, puff.y)
  }

  for (let i = g.train.length - 1; i >= 0; i--) {
    const car = g.train[i]
    const x = car.x * CELL
    const y = TOP + car.y * CELL
    if (i === 0) {
      const flipX = g.dir === 2
      const flipY = g.dir === 3
      api.spr(ENGINE, x, y, flipX, flipY)
    } else if (i === g.train.length - 1) {
      api.spr(CABOOSE, x, y)
    } else {
      api.spr(CAR, x, y)
    }
  }

  if (g.boost > 0) {
    api.rectfill(4, api.H - 7, 36, 5, 2)
    api.rectfill(5, api.H - 6, Math.ceil(g.boost / 36 * 34), 3, 10)
    api.text('WHISTLE', api.W - 60, api.H - 8, 7)
  }
}
