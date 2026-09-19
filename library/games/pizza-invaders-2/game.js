// TITLE: PIZZA INVADERS
// GENRE: SHOOTER
// CONTROLS: LEFT RIGHT A B
// Blast descending pizza aliens. A fires sauce; B drops a brief shield.

const FIGHTER = [
  '...aa...',
  '..a99a..',
  '.a9999a.',
  'aa9889aa',
  '44499444',
  '.4.99.4.',
  '...88...',
]
const PIZZA = [
  '...9....',
  '..999...',
  '.9a89a9..',
  '99a99a99',
  '.999999.',
  '..9444..',
  '...44...',
  '....4...',
]
const PEPPERONI = [
  '.888.',
  '88988',
  '89998',
  '88988',
  '.888.',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const FIGHTER_W = 8
const FIGHTER_H = 7
const FIGHTER_Y = 199
const GROUND_Y = 211

let g

function init(api) {
  g = {
    px: api.W / 2 - 4,
    lives: 3,
    sauce: [],
    toppings: [],
    pizzas: [],
    crumbs: [],
    stars: [],
    cooldown: 0,
    shield: 0,
    shieldCooldown: 0,
    wave: 0,
    hurt: 0,
    drift: 1,
  }
  for (let i = 0; i < 35; i++) {
    g.stars.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(14, GROUND_Y - 1),
      speed: api.rnd(0.3) + 0.1,
      color: api.rnd() < 0.25 ? 13 : 6,
    })
  }
  spawnWave(api)
  api.score(0)
}

function spawnWave(api) {
  g.wave++
  g.drift = g.wave % 2 ? 1 : -1
  const cols = Math.min(10, 5 + g.wave)
  const rows = Math.min(5, 1 + Math.floor(g.wave / 2))
  const gap = 21
  const start = (api.W - (cols - 1) * gap - 8) / 2
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = start + c * gap
      g.pizzas.push({
        x: bx,
        y: 22 + r * 15 - rows * 13,
        baseX: bx,
        phase: api.rnd(6.28),
        dead: false,
      })
    }
  }
}

function burst(api, x, y) {
  for (let i = 0; i < 6; i++) {
    g.crumbs.push({
      x: x + 4,
      y: y + 4,
      vx: api.rnd(2.4) - 1.2,
      vy: api.rnd(2.4) - 1.8,
      life: 22,
      color: i % 2 ? 9 : 8,
    })
  }
}

function hurt(api) {
  if (g.hurt > 0 || api.t <= 2) return
  g.lives--
  g.hurt = 75
  g.shield = 0
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const descent = 0.12 + g.wave * 0.045 + api.t * 0.003

  if (api.btn('left')) g.px -= 2.4
  if (api.btn('right')) g.px += 2.4
  g.px = api.clamp(g.px, 2, api.W - FIGHTER_W - 2)

  if (g.cooldown > 0) g.cooldown--
  if (g.shieldCooldown > 0) g.shieldCooldown--
  if (g.shield > 0) g.shield--
  if (g.hurt > 0) g.hurt--

  if (api.btnp('a') || (api.btn('a') && g.cooldown === 0)) {
    g.sauce.push({ x: g.px + 3, y: FIGHTER_Y - 5 })
    g.cooldown = 10
    api.sfx('shoot')
  }

  if (api.btnp('b')) {
    g.shield = 48
    g.shieldCooldown = 110
    api.sfx('powerup')
  }

  for (const s of g.sauce) s.y -= 5.5
  g.sauce = g.sauce.filter((s) => s.y > 10)

  for (const p of g.pizzas) {
    p.y += descent
    p.x = p.baseX + Math.sin(api.t * 2.2 + p.phase) * (7 + g.wave)
    if (!p.dead && api.t > 3 &&
        api.rnd() < 0.0008 + g.wave * 0.00025 + api.t * 0.000015) {
      g.toppings.push({
        x: p.x + 2,
        y: p.y + 7,
        vy: 1.3 + g.wave * 0.12 + api.t * 0.006,
      })
    }
  }

  for (const s of g.sauce) {
    for (const p of g.pizzas) {
      if (!p.dead && api.collide(s.x, s.y, 2, 6, p.x, p.y, 8, 8)) {
        p.dead = true
        s.y = -20
        burst(api, p.x, p.y)
        api.addScore(10 + g.wave)
        api.sfx('explode')
        api.flash(10, 1)
        break
      }
    }
  }
  g.pizzas = g.pizzas.filter((p) => !p.dead)

  for (const p of g.pizzas) {
    if (p.y + 8 >= GROUND_Y) {
      g.pizzas = []
      g.toppings = []
      hurt(api)
      break
    }
  }

  for (const t of g.toppings) t.y += t.vy
  for (const t of g.toppings) {
    const shieldHit = g.shield > 0 &&
      api.collide(t.x, t.y, 5, 5, g.px - 7, FIGHTER_Y - 8, 22, 12)
    if (shieldHit) {
      t.y = api.H + 10
      burst(api, t.x, t.y - api.H - 10)
      api.addScore(2)
      api.sfx('hit')
      api.flash(10, 1)
    } else if (g.hurt <= 0 &&
      api.collide(t.x, t.y, 5, 5, g.px, FIGHTER_Y, FIGHTER_W, FIGHTER_H)) {
      t.y = api.H + 10
      hurt(api)
    }
  }
  g.toppings = g.toppings.filter((t) => t.y < api.H)

  for (const c of g.crumbs) {
    c.x += c.vx
    c.y += c.vy
    c.vy += 0.08
    c.life--
  }
  g.crumbs = g.crumbs.filter((c) => c.life > 0)

  if (g.pizzas.length === 0 && g.hurt <= 0) {
    api.addScore(50 * g.wave)
    api.sfx('powerup')
    api.flash(10, 1)
    spawnWave(api)
  }
}

function draw(api) {
  api.cls(1)

  for (const s of g.stars) {
    const y = 13 + ((s.y - 13 + api.frame * s.speed) % (GROUND_Y - 13))
    api.pset(s.x, y, s.color)
  }

  api.rectfill(0, GROUND_Y, api.W, api.H - GROUND_Y, 4)
  api.rectfill(0, GROUND_Y, api.W, 2, 9)
  for (let x = 0; x < api.W; x += 16)
    api.rectfill(x + (api.frame % 16), GROUND_Y + 6, 7, 2, 5)

  for (const p of g.pizzas) api.spr(PIZZA, p.x, p.y)
  for (const s of g.sauce) {
    api.rectfill(s.x, s.y, 2, 6, 8)
    api.pset(s.x, s.y, 14)
  }
  for (const t of g.toppings) api.spr(PEPPERONI, t.x, t.y)
  for (const c of g.crumbs) api.rectfill(c.x, c.y, 2, 2, c.color)

  if (g.shield > 0) {
    const color = api.frame % 6 < 3 ? 10 : 14
    api.line(g.px - 7, FIGHTER_Y - 1, g.px - 3, FIGHTER_Y - 7, color)
    api.line(g.px - 3, FIGHTER_Y - 7, g.px + 11, FIGHTER_Y - 7, color)
    api.line(g.px + 11, FIGHTER_Y - 7, g.px + 15, FIGHTER_Y - 1, color)
  }

  if (g.hurt <= 0 || api.frame % 6 < 3)
    api.spr(FIGHTER, g.px, FIGHTER_Y)

  for (let i = 0; i < g.lives; i++)
    api.spr(HEART, 112 + i * 8, 14)

  api.text(`WAVE ${g.wave}`, 4, 14, 7)
  if (g.shieldCooldown <= 0) api.text('B READY', 192, 14, 10)
}
