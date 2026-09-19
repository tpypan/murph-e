// TITLE: PIZZA INVADERS
// GENRE: shooter
// CONTROLS: left right a b
// Blast descending pizza fleets with sauce. B makes a brief cheese shield.

const CHEF = [
  '..7777..',
  '.777777.',
  '..f77f..',
  '..f44f..',
  '.777777.',
  '77c77c77',
  '.c.c.c..',
  '...99...',
]
const PIZZA = [
  '...99...',
  '..9aa9..',
  '.9a8aa9.',
  '9aa3a8a9',
  '99999999',
  '.444444.',
  '..4..4..',
  '........',
]
const TOPPING = [
  '.8.8.',
  '88888',
  '.898.',
  '..8..',
  '.....',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const CHEF_W = 8
const CHEF_H = 8
const CHEF_Y = 198
const CRUST_Y = 190

let g

function init(api) {
  g = {
    px: api.W / 2 - 4,
    vx: 0,
    lives: 3,
    shots: [],
    toppings: [],
    pizzas: [],
    sparks: [],
    stars: [],
    wave: 0,
    cooldown: 0,
    shield: 0,
    shieldCharge: 0,
    hurt: 0,
    fleetX: 0,
    fleetDir: 1,
    fleetDrop: 0,
  }
  for (let i = 0; i < 38; i++) {
    g.stars.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(13, api.H - 1),
      speed: api.rnd(0.35) + 0.1,
      c: api.rnd() < 0.25 ? 13 : 7,
    })
  }
  spawnWave(api)
  api.score(0)
}

function spawnWave(api) {
  g.wave++
  g.fleetX = 0
  g.fleetDir = 1
  const cols = Math.min(10, 5 + g.wave)
  const rows = Math.min(4, 1 + Math.floor(g.wave / 2))
  const gap = 20
  const startX = Math.floor((api.W - (cols - 1) * gap - 8) / 2)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      g.pizzas.push({
        homeX: startX + c * gap,
        x: startX + c * gap,
        y: 20 + r * 15 - rows * 12,
        dead: false,
      })
    }
  }
}

function burst(api, x, y, colour) {
  for (let i = 0; i < 7; i++) {
    g.sparks.push({
      x,
      y,
      vx: api.rnd(2.4) - 1.2,
      vy: api.rnd(2.4) - 1.2,
      life: 18,
      c: i % 2 ? colour : 10,
    })
  }
}

function loseLife(api) {
  if (g.hurt > 0 || api.t <= 2) return
  g.lives--
  g.hurt = 75
  g.shield = 0
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  burst(api, g.px + 4, CHEF_Y + 4, 8)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  if (api.btn('left')) {
    g.vx -= 0.45
  }
  if (api.btn('right')) {
    g.vx += 0.45
  }
  g.vx *= 0.8
  g.px = api.clamp(g.px + g.vx, 2, api.W - CHEF_W - 2)

  if (g.cooldown > 0) g.cooldown--
  if (api.btnp('a')) {
    g.shots.push({ x: g.px + 3, y: CHEF_Y - 5 })
    g.cooldown = 7
    api.sfx('shoot')
  } else if (api.btn('a') && g.cooldown <= 0) {
    g.shots.push({ x: g.px + 3, y: CHEF_Y - 5 })
    g.cooldown = 9
    api.sfx('shoot')
  }

  if (g.shieldCharge > 0) g.shieldCharge--
  if (api.btnp('b')) {
    g.shield = 48
    g.shieldCharge = 150
    api.sfx('powerup')
  }
  if (g.shield > 0) g.shield--

  for (const s of g.shots) s.y -= 5.5
  g.shots = g.shots.filter((s) => s.y > 10)

  const sideSpeed = 0.28 + g.wave * 0.055 + api.t * 0.006
  g.fleetX += sideSpeed * g.fleetDir
  let edge = false
  for (const p of g.pizzas) {
    p.x = p.homeX + g.fleetX
    if (p.x < 4 || p.x + 8 > api.W - 4) edge = true
  }
  if (edge) {
    g.fleetDir *= -1
    g.fleetX += g.fleetDir * sideSpeed * 2
    const drop = 3 + api.t * 0.015
    for (const p of g.pizzas) p.y += drop
    api.sfx('select')
  }

  const fireRate = 0.0007 + g.wave * 0.00025 + api.t * 0.000035
  for (const p of g.pizzas) {
    if (!p.dead && api.rnd() < fireRate) {
      g.toppings.push({
        x: p.x + 2,
        y: p.y + 7,
        vy: 1.1 + g.wave * 0.12 + api.t * 0.012,
      })
      api.sfx('shoot')
    }
  }

  for (const s of g.shots) {
    for (const p of g.pizzas) {
      if (!p.dead && api.collide(s.x, s.y, 2, 6, p.x, p.y, 8, 7)) {
        p.dead = true
        s.y = -20
        api.addScore(10 + g.wave * 2)
        api.sfx('explode')
        api.flash(10, 1)
        burst(api, p.x + 4, p.y + 4, 9)
        break
      }
    }
  }
  g.pizzas = g.pizzas.filter((p) => !p.dead)

  for (const t of g.toppings) t.y += t.vy
  for (const t of g.toppings) {
    if (api.collide(t.x, t.y, 5, 5, g.px, CHEF_Y, CHEF_W, CHEF_H)) {
      t.y = api.H + 10
      if (g.shield > 0) {
        api.addScore(2)
        api.sfx('coin')
        api.flash(10, 1)
        burst(api, t.x + 2, t.y - 10, 10)
      } else {
        loseLife(api)
      }
    }
  }
  g.toppings = g.toppings.filter((t) => t.y < api.H)

  for (const p of g.pizzas) {
    if (p.y + 7 >= CRUST_Y) {
      g.pizzas = []
      g.toppings = []
      loseLife(api)
      break
    }
  }

  for (const q of g.sparks) {
    q.x += q.vx
    q.y += q.vy
    q.vy += 0.04
    q.life--
  }
  g.sparks = g.sparks.filter((q) => q.life > 0)

  if (g.pizzas.length === 0 && g.hurt <= 0) {
    api.addScore(50 * g.wave)
    api.sfx('powerup')
    api.flash(10, 1)
    spawnWave(api)
  }
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(1)

  for (const s of g.stars) {
    const sy = 13 + ((s.y - 13 + api.frame * s.speed) % (api.H - 13))
    api.pset(s.x, sy, s.c)
  }

  api.circ(30, 55, 12, 12)
  api.circfill(30, 55, 9, 2)
  api.circfill(220, 82, 5, 14)
  api.line(210, 82, 230, 82, 13)

  api.rectfill(0, CRUST_Y, api.W, 3, 4)
  for (let x = 0; x < api.W; x += 12)
    api.rectfill(x, CRUST_Y, 7, 2, 9)
  api.rectfill(0, api.H - 8, api.W, 8, 2)
  api.line(0, api.H - 8, api.W, api.H - 8, 12)

  for (const p of g.pizzas)
    api.spr(PIZZA, p.x, p.y, g.fleetDir < 0)
  for (const s of g.shots) {
    api.rectfill(s.x, s.y, 2, 6, 8)
    api.pset(s.x, s.y - 1, 14)
  }
  for (const t of g.toppings) api.spr(TOPPING, t.x, t.y)
  for (const q of g.sparks) api.pset(q.x, q.y, q.c)

  if (g.shield > 0) {
    const pulse = api.frame % 8 < 4 ? 10 : 9
    api.circ(g.px + 4, CHEF_Y + 4, 10, pulse)
    api.circ(g.px + 4, CHEF_Y + 4, 11, 7)
  }
  if (g.hurt <= 0 || api.frame % 6 < 3)
    api.spr(CHEF, g.px, CHEF_Y, g.vx < 0)

  for (let i = 0; i < g.lives; i++)
    api.spr(HEART, 112 + i * 8, 4)
  api.text(`W${g.wave}`, 4, 14, 10)
  if (g.shieldCharge > 0 && g.shield <= 0)
    api.text('B', 244, 14, 5)
  else
    api.text('B', 244, 14, g.shield > 0 ? 10 : 7)
}
