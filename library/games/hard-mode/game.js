// TITLE: HARD MODE
// GENRE: dodge
// CONTROLS: arrows move, A dash
// Thread a tiny runner through an increasingly dense crossfire.

const RUNNER = [
  '.aaaa.',
  'a7777a',
  'a7cc7a',
  'a7cc7a',
  'a7777a',
  '.aaaa.',
]
const BLADE_H = [
  '..8888..',
  '.899998.',
  '89aaaa98',
  '89a77a98',
  '.899998.',
  '..8888..',
]
const BLADE_V = [
  '..88..',
  '.8998.',
  '89aa98',
  '89aa98',
  '.8998.',
  '..88..',
  '..88..',
  '.8998.',
]
const SPARK = [
  '..a...',
  '.a7a..',
  'a777a.',
  '.a7a..',
  '..a...',
  '......',
]

const ARENA_X = 8
const ARENA_Y = 16
const ARENA_R = 248
const ARENA_B = 216
const PW = 6
const PH = 6

let g

function init(api) {
  g = {
    px: 125,
    py: 111,
    vx: 0,
    vy: 0,
    faceX: 1,
    faceY: 0,
    dash: 0,
    dashCool: 0,
    hazards: [],
    particles: [],
    marks: [],
    spawn: 2.9,
    survived: 0,
    near: 0,
    dead: false,
  }
  for (let i = 0; i < 28; i++) {
    g.marks.push({
      x: api.rndi(ARENA_X + 3, ARENA_R - 3),
      y: api.rndi(ARENA_Y + 3, ARENA_B - 3),
      c: api.rnd() < 0.5 ? 2 : 5,
    })
  }
  api.score(0)
}

function addHazard(api) {
  const side = api.rndi(0, 3)
  const speed = 1.45 + api.t * 0.035 + api.rnd(0.8)
  let x
  let y
  let vx = 0
  let vy = 0
  let vertical = false

  if (side === 0 || side === 1) {
    y = api.rndi(ARENA_Y + 8, ARENA_B - 14)
    x = side === 0 ? ARENA_X - 10 : ARENA_R + 2
    vx = side === 0 ? speed : -speed
  } else {
    x = api.rndi(ARENA_X + 8, ARENA_R - 14)
    y = side === 2 ? ARENA_Y - 10 : ARENA_B + 2
    vy = side === 2 ? speed : -speed
    vertical = true
  }

  g.hazards.push({
    x,
    y,
    vx,
    vy,
    vertical,
    wave: api.rnd(6.28),
    sway: api.rnd() < 0.55,
    near: false,
  })
}

function burst(api, x, y, colour) {
  for (let i = 0; i < 8; i++) {
    const angle = api.rnd(6.28)
    const speed = 0.7 + api.rnd(1.8)
    g.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 16 + api.rndi(0, 10),
      c: colour,
    })
  }
}

function lose(api) {
  if (g.dead || api.t <= 2) return
  g.dead = true
  burst(api, g.px + 3, g.py + 3, 8)
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  api.sfx('die')
  api.gameOver()
}

function update(api, dt) {
  if (g.dead) return
  g.survived += dt

  let ix = 0
  let iy = 0
  if (api.btn('left')) ix--
  if (api.btn('right')) ix++
  if (api.btn('up')) iy--
  if (api.btn('down')) iy++

  if (ix || iy) {
    const length = Math.sqrt(ix * ix + iy * iy)
    ix /= length
    iy /= length
    g.faceX = ix
    g.faceY = iy
  }

  const move = g.dash > 0 ? 5.4 : 2.05
  g.vx = ix * move
  g.vy = iy * move

  if (g.dashCool > 0) g.dashCool--
  if (g.dash > 0) g.dash--
  if (api.btnp('a')) {
    g.dash = 9
    g.dashCool = 18
    burst(api, g.px + 3, g.py + 3, 12)
    api.sfx('shoot')
  }

  if (g.dash > 0 && !ix && !iy) {
    g.vx = g.faceX * move
    g.vy = g.faceY * move
  }

  g.px = api.clamp(g.px + g.vx, ARENA_X + 3, ARENA_R - PW - 3)
  g.py = api.clamp(g.py + g.vy, ARENA_Y + 3, ARENA_B - PH - 3)

  g.spawn -= dt
  if (g.spawn <= 0) {
    const count = 1 + Math.floor(api.t / 20)
    const amount = Math.min(5, count)
    for (let i = 0; i < amount; i++) addHazard(api)
    g.spawn = Math.max(0.16, 0.72 - api.t * 0.009)
  }

  for (const h of g.hazards) {
    h.x += h.vx
    h.y += h.vy
    if (h.sway) {
      if (h.vertical) h.x += Math.sin(api.t * 7 + h.wave) * 0.55
      else h.y += Math.sin(api.t * 7 + h.wave) * 0.55
    }

    const hw = h.vertical ? 6 : 8
    const hh = h.vertical ? 8 : 6
    if (api.collide(g.px, g.py, PW, PH, h.x, h.y, hw, hh)) lose(api)

    const distance = api.dist(g.px + 3, g.py + 3, h.x + hw / 2, h.y + hh / 2)
    if (!h.near && distance < 15 && distance > 7) {
      h.near = true
      g.near = 22
      api.addScore(15)
      api.sfx('coin')
      api.flash(10, 1)
      burst(api, g.px + 3, g.py + 3, 10)
    }
  }

  g.hazards = g.hazards.filter((h) =>
    h.x > -20 && h.x < api.W + 20 && h.y > -20 && h.y < api.H + 20
  )

  for (const p of g.particles) {
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.94
    p.vy *= 0.94
    p.life--
  }
  g.particles = g.particles.filter((p) => p.life > 0)
  if (g.near > 0) g.near--
  if (api.frame % 60 === 0) api.addScore(10)
}

function draw(api) {
  api.cls(1)

  for (const m of g.marks) {
    const pulse = (api.frame + m.x) % 50 < 4
    api.pset(m.x, m.y, pulse ? 13 : m.c)
  }

  for (let x = ARENA_X; x < ARENA_R; x += 16) {
    api.pset(x, ARENA_Y, 12)
    api.pset(x + 8, ARENA_B, 14)
  }
  for (let y = ARENA_Y; y < ARENA_B; y += 16) {
    api.pset(ARENA_X, y, 12)
    api.pset(ARENA_R, y + 8, 14)
  }

  api.rect(ARENA_X, ARENA_Y, ARENA_R - ARENA_X, ARENA_B - ARENA_Y, 5)
  api.rect(ARENA_X + 1, ARENA_Y + 1, ARENA_R - ARENA_X - 2, ARENA_B - ARENA_Y - 2, 2)

  for (const h of g.hazards) {
    api.spr(h.vertical ? BLADE_V : BLADE_H, h.x, h.y)
  }

  for (const p of g.particles) api.pset(p.x, p.y, p.c)

  if (g.dash > 0) {
    api.spr(SPARK, g.px - g.faceX * 8, g.py - g.faceY * 8)
    api.rect(g.px - 2, g.py - 2, 10, 10, 12)
  }

  if (!g.dead) api.spr(RUNNER, g.px, g.py)

  if (g.near > 0) api.textCenter('NEAR!', 18, 10)

  const danger = Math.min(52, Math.floor(api.t))
  api.rectfill(102, 207, danger, 3, danger > 30 ? 8 : 9)
}
