// TITLE: CAT DASH
// GENRE: runner
// CONTROLS: up down a b
// Jump charging dogs, duck beneath signs, and pounce through cans.
// Distance builds the multiplier; clearing dogs earns large bonuses.

const CAT = [
  '....ee..',
  '.e..eee.',
  '.eeee7e.',
  'eee7eeee',
  '.eeeeee.',
  '.e.e.e..',
  'e..e.e..',
]
const CAT_DUCK = [
  '........',
  '........',
  '..e..ee.',
  '.eeee7e.',
  'eeeeeeee',
  '.e....e.',
  'e......e',
]
const CAT_POUNCE = [
  '.....ee.',
  '.e..eee.',
  '.eeee7e.',
  'eeeeeeee',
  '..e..e..',
  '.e....e.',
  'e......e',
]
const DOG = [
  '44....44',
  '444..444',
  '.444444.',
  '.447744.',
  '44444444',
  '.4.44.4.',
  '4..44..4',
]
const CAN = [
  '.666.',
  '67776',
  '65556',
  '65556',
  '.666.',
]
const SIGN = [
  '99999999',
  '9aa99aa9',
  '99999999',
  '...44...',
  '...44...',
  '...44...',
]
const FISH = [
  '..c...',
  '.cccc.',
  'cccc7c',
  '.cccc.',
  '..c...',
]
const CLOUD = [
  '..77....',
  '.7777...',
  '7777777.',
  '.7777777',
]

const GROUND_Y = 198
const CAT_X = 38
const CAT_H = 7

let g

function init(api) {
  g = {
    y: GROUND_Y - CAT_H,
    vy: 0,
    onGround: true,
    ducking: false,
    pounce: 0,
    speed: 2.35,
    things: [],
    spawnIn: 195,
    dist: 0,
    cleared: 0,
    multiplier: 1,
    clouds: [],
    buildings: [],
  }
  for (let i = 0; i < 7; i++) {
    g.clouds.push({
      x: api.rndi(0, api.W),
      y: api.rndi(22, 85),
      s: api.rnd(0.25) + 0.15,
    })
  }
  for (let i = 0; i < 9; i++) {
    g.buildings.push({
      x: i * 34,
      h: api.rndi(35, 74),
      c: api.rnd() < 0.5 ? 13 : 6,
    })
  }
  api.score(0)
}

function spawn(api) {
  const r = api.rnd()
  if (r < 0.48) {
    g.things.push({
      x: api.W + 10,
      y: GROUND_Y - 7,
      kind: 'dog',
      passed: false,
      phase: api.rnd(6),
    })
  } else if (r < 0.72) {
    g.things.push({
      x: api.W + 10,
      y: GROUND_Y - 5,
      kind: 'can',
      passed: false,
    })
  } else if (r < 0.88) {
    g.things.push({
      x: api.W + 10,
      y: GROUND_Y - 18,
      kind: 'sign',
      passed: false,
    })
  } else {
    g.things.push({
      x: api.W + 10,
      y: api.rnd() < 0.5 ? GROUND_Y - 27 : GROUND_Y - 10,
      kind: 'fish',
      passed: false,
    })
  }
}

function jump(api) {
  if (!g.onGround) return
  g.vy = -5.25
  g.onGround = false
  g.ducking = false
  api.sfx('jump')
}

function lose(api) {
  if (api.t <= 2) return
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  api.sfx('die')
  api.gameOver()
}

function update(api, dt) {
  g.speed = 2.35 + api.t * 0.055
  g.dist += g.speed
  g.multiplier = 1 + Math.floor(api.t / 18)

  if (api.frame % 12 === 0) api.addScore(g.multiplier)

  if ((api.btnp('a') || api.btnp('up')) && g.onGround) jump(api)

  if (api.btnp('b')) {
    g.pounce = 18
    api.sfx('shoot')
  }
  if (g.pounce > 0) g.pounce--

  g.ducking = api.btn('down') && g.onGround && g.pounce <= 0
  g.vy += 0.27
  g.y += g.vy
  if (g.y >= GROUND_Y - CAT_H) {
    g.y = GROUND_Y - CAT_H
    g.vy = 0
    g.onGround = true
  }

  g.spawnIn--
  if (g.spawnIn <= 0) {
    spawn(api)
    const density = Math.floor(api.t * 0.35)
    g.spawnIn = Math.max(28, api.rndi(60, 105) - density)
  }

  const catY = g.ducking ? GROUND_Y - 5 : g.y
  const catH = g.ducking ? 5 : CAT_H

  for (const t of g.things) {
    t.x -= g.speed
    if (t.kind === 'dog') {
      t.x -= 0.45 + api.t * 0.012
      t.y = GROUND_Y - 7 + Math.sin(api.t * 13 + t.phase) * 0.5
    }

    const w = t.kind === 'dog' || t.kind === 'sign' ? 8 : t.kind === 'can' ? 5 : 6
    const h = t.kind === 'dog' ? 7 : t.kind === 'sign' ? 18 : t.kind === 'can' ? 5 : 5

    if (!t.passed && t.x + w < CAT_X) {
      t.passed = true
      if (t.kind === 'dog') {
        g.cleared++
        api.addScore(25 * g.multiplier)
        api.sfx('powerup')
        api.flash(10, 1)
      }
    }

    if (api.collide(CAT_X + 1, catY + 1, 6, catH - 1, t.x, t.y, w, h)) {
      if (t.kind === 'fish') {
        t.x = -30
        api.addScore(15 * g.multiplier)
        api.sfx('coin')
        api.flash(10, 1)
      } else if (t.kind === 'can' && g.pounce > 0) {
        t.x = -30
        api.addScore(10 * g.multiplier)
        api.sfx('explode')
        api.flash(10, 1)
      } else {
        lose(api)
        return
      }
    }
  }
  g.things = g.things.filter((t) => t.x > -20)
}

function draw(api) {
  api.cls(12)

  api.rectfill(0, 12, api.W, 80, 13)
  api.circfill(220, 37, 15, 10)

  for (const c of g.clouds) {
    let x = (c.x - g.dist * c.s) % 300
    x = ((x % 300) + 300) % 300 - 20
    api.spr(CLOUD, x, c.y)
  }

  for (const b of g.buildings) {
    let x = (b.x - g.dist * 0.18) % 306
    x = ((x % 306) + 306) % 306 - 34
    api.rectfill(x, GROUND_Y - b.h, 29, b.h, b.c)
    api.rectfill(x + 4, GROUND_Y - b.h + 8, 5, 6, 10)
    api.rectfill(x + 17, GROUND_Y - b.h + 8, 5, 6, 10)
    api.rectfill(x + 4, GROUND_Y - b.h + 23, 5, 6, 1)
    api.rectfill(x + 17, GROUND_Y - b.h + 23, 5, 6, 1)
  }

  api.rectfill(0, GROUND_Y - 3, api.W, 3, 6)
  api.rectfill(0, GROUND_Y, api.W, api.H - GROUND_Y, 5)
  api.rectfill(0, GROUND_Y, api.W, 2, 7)

  for (let x = -((g.dist | 0) % 24); x < api.W; x += 24)
    api.rectfill(x, GROUND_Y + 12, 12, 2, 10)

  for (const t of g.things) {
    if (t.kind === 'dog') api.spr(DOG, t.x, t.y, true)
    else if (t.kind === 'can') api.spr(CAN, t.x, t.y)
    else if (t.kind === 'sign') api.spr(SIGN, t.x, t.y)
    else api.spr(FISH, t.x, t.y)
  }

  if (g.ducking) api.spr(CAT_DUCK, CAT_X, GROUND_Y - 7)
  else if (g.pounce > 0) api.spr(CAT_POUNCE, CAT_X + 2, g.y)
  else api.spr(CAT, CAT_X, g.y)

  api.text('X' + g.multiplier, 4, 15, 10)
}
