// TITLE: CAT CATCHER
// GENRE: runner
// CONTROLS: left right up down a
// Race across moonlit roofs, catch yarn, dodge chimneys, duck under signs,
// and pounce ahead. Missing yarn or taking a hit costs one of three lives.

const CAT = [
  '.e...e..',
  'eeeeeee.',
  'e7e7eee.',
  'eeeeeee.',
  '.99999e.',
  'e999999.',
  '.9...9..',
  '.9...9..',
]
const CAT_DUCK = [
  '........',
  '........',
  '.e...e..',
  'eeeeeee.',
  'e7e7eee.',
  'e999999.',
]
const CHIMNEY = [
  '55555555',
  '.888866.',
  '.566665.',
  '.566665.',
  '.566665.',
  '.566665.',
  '.555555.',
  '.555555.',
]
const SIGN = [
  '44444444',
  '4aaaaaa4',
  '44CAT444',
  '44444444',
  '..5..5..',
  '..5..5..',
]
const YARN = [
  '..aa..',
  '.aeaa.',
  'aa7aaa',
  'aaa7aa',
  '.aaaa.',
  '..aa..',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const ROOF_Y = 196
const CAT_W = 8
const CAT_H = 8

let g

function init(api) {
  g = {
    x: 44,
    y: ROOF_Y - CAT_H,
    vy: 0,
    onRoof: true,
    ducking: false,
    pounce: 0,
    speed: 2.2,
    things: [],
    spawnIn: 205,
    lives: 3,
    hurt: 0,
    combo: 0,
    dist: 0,
    stars: [],
    towers: [],
  }
  for (let i = 0; i < 32; i++) {
    g.stars.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(14, 150),
      c: api.rnd() < 0.25 ? 10 : 7,
    })
  }
  for (let i = 0; i < 9; i++) {
    g.towers.push({
      x: i * 36,
      w: api.rndi(18, 34),
      h: api.rndi(20, 65),
    })
  }
  api.score(0)
}

function spawn(api) {
  const r = api.rnd()
  if (r < 0.35) {
    g.things.push({
      x: api.W + 10,
      y: ROOF_Y - 8,
      kind: 'chimney',
      dead: false,
    })
  } else if (r < 0.58) {
    g.things.push({
      x: api.W + 10,
      y: ROOF_Y - 18,
      kind: 'sign',
      dead: false,
    })
  } else {
    g.things.push({
      x: api.W + 10,
      y: ROOF_Y - api.rndi(10, 34),
      kind: 'yarn',
      dead: false,
      bob: api.rnd(6),
    })
  }
}

function hurt(api) {
  if (g.hurt > 0 || api.t <= 2) return
  g.lives--
  g.hurt = 75
  g.combo = 0
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  g.speed = 2.2 + api.t * 0.045
  g.dist += g.speed
  if (g.hurt > 0) g.hurt--

  if (api.btn('left')) g.x -= 1.7
  if (api.btn('right')) g.x += 1.7
  g.x = api.clamp(g.x, 12, 116)

  g.ducking = api.btn('down') && g.onRoof
  if (api.btnp('up') && g.onRoof) {
    g.vy = -5.2
    g.onRoof = false
    g.ducking = false
    api.sfx('jump')
  }

  if (api.btnp('a')) {
    g.pounce = 14
    g.x = api.clamp(g.x + 14, 12, 116)
    api.sfx('shoot')
  }
  if (g.pounce > 0) g.pounce--

  g.vy += 0.27
  g.y += g.vy
  if (g.y >= ROOF_Y - CAT_H) {
    if (!g.onRoof && g.vy > 1) api.sfx('jump')
    g.y = ROOF_Y - CAT_H
    g.vy = 0
    g.onRoof = true
  }

  g.spawnIn--
  if (g.spawnIn <= 0) {
    spawn(api)
    const density = Math.min(42, api.t * 0.45)
    g.spawnIn = Math.max(20, api.rndi(58, 94) - density)
  }

  const catY = g.ducking ? ROOF_Y - 6 : g.y
  const catH = g.ducking ? 6 : CAT_H
  for (const t of g.things) {
    t.x -= g.speed + (g.pounce > 0 ? 0.9 : 0)
    if (t.kind === 'yarn') {
      t.y += Math.sin(api.t * 5 + t.bob) * 0.18
    }
    if (t.dead) continue

    const w = t.kind === 'yarn' ? 6 : 8
    const h = t.kind === 'yarn' ? 6 : t.kind === 'sign' ? 6 : 8
    if (api.collide(g.x + 1, catY + 1, 6, catH - 1, t.x, t.y, w, h)) {
      if (t.kind === 'yarn') {
        t.dead = true
        g.combo++
        api.addScore(10 + Math.min(g.combo, 10) * 5)
        api.sfx('coin')
        api.flash(10, 1)
      } else if (g.pounce > 0 && t.kind === 'chimney') {
        t.dead = true
        api.addScore(5)
        api.sfx('explode')
        api.flash(10, 1)
      } else {
        t.dead = true
        hurt(api)
      }
    }

    if (t.kind === 'yarn' && t.x < -7 && !t.dead) {
      t.dead = true
      g.combo = 0
      hurt(api)
    }
  }

  g.things = g.things.filter((t) => !t.dead && t.x > -14)
  if (api.frame % 30 === 0) api.addScore(1)
}

function draw(api) {
  api.cls(1)

  for (const s of g.stars) {
    const twinkle = (api.frame + s.x) % 50 < 4 ? 10 : s.c
    api.pset(s.x, s.y, twinkle)
  }

  api.circfill(210, 48, 25, 6)
  api.circfill(203, 42, 20, 7)
  api.circfill(194, 37, 5, 6)

  for (const b of g.towers) {
    let x = b.x - (g.dist * 0.12) % 324
    if (x < -40) x += 324
    api.rectfill(x, ROOF_Y - b.h, b.w, b.h, 2)
    for (let wy = ROOF_Y - b.h + 8; wy < ROOF_Y - 5; wy += 12) {
      api.rectfill(x + 5, wy, 3, 4, (wy + b.x) % 24 === 0 ? 10 : 5)
    }
  }

  api.rectfill(0, ROOF_Y, api.W, api.H - ROOF_Y, 4)
  api.rectfill(0, ROOF_Y, api.W, 3, 5)
  for (let x = -((g.dist | 0) % 20); x < api.W; x += 20) {
    api.line(x, ROOF_Y + 3, x + 10, api.H - 1, 2)
  }

  for (const t of g.things) {
    if (t.kind === 'chimney') api.spr(CHIMNEY, t.x, t.y)
    else if (t.kind === 'sign') api.spr(SIGN, t.x, t.y)
    else api.spr(YARN, t.x, t.y)
  }

  if (g.hurt <= 0 || api.frame % 6 < 3) {
    if (g.ducking) api.spr(CAT_DUCK, g.x, ROOF_Y - 6)
    else api.spr(CAT, g.x, g.y, false, false)
    if (g.pounce > 0) api.line(g.x - 8, g.y + 5, g.x - 2, g.y + 5, 10)
  }

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 14)
  if (g.combo > 1) api.text(`X${g.combo}`, 4, 14, 10)
}
