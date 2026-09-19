// TITLE: CAT DASH
// GENRE: runner
// CONTROLS: a b
// A jumps over dogs and street clutter. Fish grant bonus points; every third
// fish charges one dash. B spends the charge to smash through danger.

const CAT = [
  '...e.e..',
  '..eeeee.',
  '..e7e7e.',
  '..eeeee.',
  '.eeeeee.',
  'ee.e..e.',
  '...e..e.',
]
const CAT_JUMP = [
  '...e.e..',
  '..eeeee.',
  '..e7e7e.',
  '..eeeee.',
  '.eeeeee.',
  'e.e..e.e',
  '..e..e..',
]
const CAT_DASH = [
  '.e.e....',
  'eeeee...',
  'e7e7eeee',
  'eeeeeeee',
  '.eeeeee.',
  'e..e..e.',
]
const DOG = [
  '.4...4..',
  '444444..',
  '4f4f444.',
  '44444444',
  '.444444.',
  '.4.4..4.',
  '.4.4..4.',
]
const BOX = [
  '9999999.',
  '9444449.',
  '9455549.',
  '9455549.',
  '9444449.',
  '9999999.',
]
const HYDRANT = [
  '..88....',
  '.8888...',
  '888888..',
  '..88....',
  '.8888...',
  '.8888...',
  '888888..',
]
const FISH = [
  '.....c..',
  '.cc.ccc.',
  'ccccccc.',
  '.cc.ccc.',
  '.....c..',
]
const PUFF = ['.7.7.', '77777', '.777.', '7.7.7']
const CHARGE = ['.aaa.', 'aaaaa', 'a777a', '.aaa.']

const GROUND_Y = 196
const CAT_X = 42
const CAT_W = 8
const CAT_H = 7

let g

function init(api) {
  g = {
    y: GROUND_Y - CAT_H,
    vy: 0,
    onGround: true,
    speed: 2.35,
    things: [],
    puffs: [],
    spawnIn: 205,
    dist: 0,
    fish: 0,
    charged: false,
    dash: 0,
    street: [],
    clouds: [],
  }
  for (let i = 0; i < 7; i++) {
    g.street.push({ x: i * 45, h: api.rndi(22, 58), c: i % 2 ? 5 : 6 })
  }
  for (let i = 0; i < 5; i++) {
    g.clouds.push({ x: api.rndi(0, 255), y: api.rndi(22, 85) })
  }
  api.score(0)
}

function spawn(api) {
  const r = api.rnd()
  if (r < 0.48) {
    g.things.push({ x: api.W + 8, y: GROUND_Y - 7, kind: 'dog', passed: false })
  } else if (r < 0.72) {
    const hydrant = api.rnd() < 0.5
    g.things.push({
      x: api.W + 8,
      y: GROUND_Y - (hydrant ? 7 : 6),
      kind: hydrant ? 'hydrant' : 'box',
      passed: false,
    })
  } else {
    g.things.push({
      x: api.W + 8,
      y: GROUND_Y - api.rndi(18, 35),
      kind: 'fish',
      passed: false,
    })
  }
}

function jump(api) {
  if (g.onGround) {
    g.vy = -5.15
    g.onGround = false
    api.sfx('jump')
  } else {
    g.vy -= 0.45
    g.puffs.push({ x: CAT_X + 1, y: g.y + 5, life: 12 })
    api.sfx('jump')
  }
}

function startDash(api) {
  if (g.charged && g.dash <= 0) {
    g.charged = false
    g.dash = 55
    g.puffs.push({ x: CAT_X - 5, y: g.y + 3, life: 18 })
    api.sfx('powerup')
    api.flash(10, 1)
  } else {
    g.puffs.push({ x: CAT_X - 3, y: g.y + 4, life: 10 })
    api.sfx('select')
  }
}

function collectFish(api, t) {
  t.x = -30
  g.fish++
  api.addScore(30)
  api.sfx('coin')
  api.flash(10, 1)
  if (g.fish >= 3) {
    g.fish = 0
    g.charged = true
    api.sfx('powerup')
  }
}

function crash(api) {
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  api.sfx('die')
  api.gameOver()
}

function update(api, dt) {
  g.speed = 2.35 + api.t * 0.045
  const moveSpeed = g.speed + (g.dash > 0 ? 3.8 : 0)
  g.dist += moveSpeed

  if (api.frame % 10 === 0) api.addScore(1)
  if (api.btnp('a')) jump(api)
  if (api.btnp('b')) startDash(api)

  g.vy += 0.27
  g.y += g.vy
  if (g.y >= GROUND_Y - CAT_H) {
    g.y = GROUND_Y - CAT_H
    g.vy = 0
    g.onGround = true
  }

  if (g.dash > 0) {
    g.dash--
    if (api.frame % 4 === 0) {
      g.puffs.push({ x: CAT_X - 5, y: g.y + api.rndi(2, 6), life: 10 })
    }
  }

  g.spawnIn--
  if (g.spawnIn <= 0) {
    spawn(api)
    g.spawnIn = Math.max(28, api.rndi(58, 100) - Math.floor(api.t * 0.55))
  }

  for (const t of g.things) {
    t.x -= moveSpeed
    if (t.kind === 'dog') t.y = GROUND_Y - 7 + Math.sin(api.t * 10 + t.x) * 1.2

    if (!t.passed && t.kind !== 'fish' && t.x + 8 < CAT_X) {
      t.passed = true
      api.addScore(t.kind === 'dog' ? 15 : 8)
      api.sfx('coin')
    }

    const w = t.kind === 'fish' ? 7 : t.kind === 'dog' ? 8 : 7
    const h = t.kind === 'fish' ? 5 : t.kind === 'box' ? 6 : 7
    if (api.collide(CAT_X + 1, g.y + 1, 6, 6, t.x, t.y, w, h)) {
      if (t.kind === 'fish') {
        collectFish(api, t)
      } else if (g.dash > 0) {
        t.x = -30
        api.addScore(20)
        api.sfx('explode')
        api.flash(10, 1)
        api.shake(4)
      } else if (api.t > 2) {
        crash(api)
        return
      }
    }
  }

  for (const p of g.puffs) {
    p.x -= moveSpeed * 0.5
    p.life--
  }
  g.things = g.things.filter((t) => t.x > -32)
  g.puffs = g.puffs.filter((p) => p.life > 0 && p.x > -8)
}

function draw(api) {
  api.cls(12)

  api.circfill(218, 43, 18, 10)
  api.circfill(218, 43, 13, 9)
  for (const c of g.clouds) {
    const x = ((c.x - g.dist * 0.04) % 310 + 310) % 310 - 25
    api.circfill(x, c.y, 8, 7)
    api.circfill(x + 9, c.y - 3, 10, 7)
    api.circfill(x + 19, c.y, 7, 7)
  }

  for (let i = 0; i < g.street.length; i++) {
    const b = g.street[i]
    const x = ((b.x - g.dist * 0.18) % 315 + 315) % 315 - 35
    api.rectfill(x, GROUND_Y - b.h, 38, b.h, b.c)
    api.rectfill(x + 6, GROUND_Y - b.h + 8, 6, 7, 1)
    api.rectfill(x + 23, GROUND_Y - b.h + 8, 6, 7, 10)
  }

  api.rectfill(0, GROUND_Y, api.W, api.H - GROUND_Y, 5)
  api.rectfill(0, GROUND_Y, api.W, 3, 7)
  for (let x = -((g.dist | 0) % 32); x < api.W; x += 32) {
    api.rectfill(x, GROUND_Y + 14, 18, 2, 10)
  }

  for (const p of g.puffs) api.spr(PUFF, p.x, p.y)
  for (const t of g.things) {
    const sprite = t.kind === 'dog' ? DOG :
      t.kind === 'box' ? BOX : t.kind === 'hydrant' ? HYDRANT : FISH
    api.spr(sprite, t.x, t.y, t.kind === 'dog')
  }

  const bob = g.onGround ? Math.sin(api.t * 14) : 0
  if (g.dash > 0) api.spr(CAT_DASH, CAT_X, g.y + bob)
  else api.spr(g.onGround ? CAT : CAT_JUMP, CAT_X, g.y + bob)

  for (let i = 0; i < g.fish; i++) api.spr(FISH, 5 + i * 10, 15)
  if (g.charged) {
    api.spr(CHARGE, 220, 15)
    api.text('B!', 232, 14, 10)
  }
}
