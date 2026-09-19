// TITLE: PIZZA INVADERS
// GENRE: shooter
// CONTROLS: left right a b
// Slide the pan, fire sauce with A, or hold B for rapid fire.
// Destroy every descending pizza before it reaches the kitchen counter.

const PAN = [
  '...666....',
  '..67776...',
  '.6777776..',
  '6666666666',
  '..5555....',
  '...55.....',
  '...55.....',
]
const PIZZA = [
  '...99....',
  '..9aa9...',
  '.9a8aa9..',
  '9aa3a8a9.',
  '99aaaa99.',
  '.444444..',
  '..4444...',
  '...44....',
]
const PEPPERONI = [
  '.8.8.',
  '88888',
  '.888.',
  '88888',
  '.8.8.',
]
const MUSHROOM = [
  '.fff.',
  'fffff',
  '.666.',
  '..6..',
  '.666.',
]
const HEART = [
  '.8.8.',
  '88888',
  '88888',
  '.888.',
  '..8..',
]

const PAN_W = 10
const PAN_H = 7
const PAN_Y = 201

let g

function init(api) {
  g = {
    px: api.W / 2 - PAN_W / 2,
    vx: 0,
    lives: 3,
    wave: 0,
    shots: [],
    toppings: [],
    pizzas: [],
    sparks: [],
    cooldown: 0,
    hurt: 0,
    wavePause: 0,
    tiles: [],
  }
  for (let i = 0; i < 34; i++) {
    g.tiles.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(14, 190),
      c: api.rnd() < 0.5 ? 13 : 14,
    })
  }
  api.score(0)
  spawnWave(api)
}

function spawnWave(api) {
  g.wave++
  const cols = Math.min(10, 4 + g.wave)
  const rows = Math.min(5, 1 + Math.floor(g.wave / 2))
  const gap = 21
  const left = (api.W - cols * gap) / 2 + 5
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = left + c * gap
      g.pizzas.push({
        x: x,
        baseX: x,
        y: 20 + r * 15 - rows * 18,
        phase: api.rnd(6.28),
        dead: false,
      })
    }
  }
}

function fire(api, rapid) {
  g.shots.push({
    x: g.px + 4,
    y: PAN_Y - 5,
    vx: rapid ? api.rnd(0.6) - 0.3 : 0,
  })
  g.cooldown = rapid ? 6 : 11
  api.sfx('shoot')
}

function burst(api, x, y) {
  for (let i = 0; i < 5; i++) {
    g.sparks.push({
      x: x,
      y: y,
      vx: api.rnd(2) - 1,
      vy: api.rnd(2) - 1,
      life: 14,
      c: i % 2 ? 10 : 8,
    })
  }
}

function hurt(api) {
  if (g.hurt > 0 || api.t <= 2) return
  g.lives--
  g.hurt = 75
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const speed = 0.16 + g.wave * 0.045 + api.t * 0.006

  if (api.btn('left')) g.vx -= 0.55
  if (api.btn('right')) g.vx += 0.55
  g.vx *= 0.78
  g.px = api.clamp(g.px + g.vx, 0, api.W - PAN_W)

  if (g.cooldown > 0) g.cooldown--
  if (api.btnp('a')) {
    fire(api, false)
  } else if (api.btn('b') && g.cooldown <= 0) {
    fire(api, true)
  }

  for (const s of g.shots) {
    s.y -= 5.4
    s.x += s.vx
  }
  g.shots = g.shots.filter((s) => s.y > 10 && s.x > -3 && s.x < api.W)

  for (const p of g.pizzas) {
    p.y += speed
    p.x = p.baseX + Math.sin(api.t * (2.1 + g.wave * 0.04) + p.phase) * 9
    const dropChance = 0.0006 + g.wave * 0.00035 + api.t * 0.000015
    if (!p.dead && api.t > 3 && api.rnd() < dropChance) {
      g.toppings.push({
        x: p.x + 3,
        y: p.y + 7,
        vy: 1.1 + g.wave * 0.12 + api.t * 0.008,
        kind: api.rnd() < 0.7 ? 0 : 1,
      })
    }
  }

  for (const s of g.shots) {
    for (const p of g.pizzas) {
      if (!p.dead && api.collide(s.x, s.y, 2, 6, p.x, p.y, 8, 8)) {
        p.dead = true
        s.y = -20
        api.addScore(15 + g.wave * 2)
        api.sfx('explode')
        api.flash(10, 1)
        burst(api, p.x + 4, p.y + 4)
        break
      }
    }
  }
  g.pizzas = g.pizzas.filter((p) => !p.dead)

  for (const p of g.pizzas) {
    if (p.y + 8 >= PAN_Y) {
      g.pizzas = []
      g.toppings = []
      hurt(api)
      g.wavePause = 45
      break
    }
  }

  for (const t of g.toppings) {
    t.y += t.vy
    t.x += Math.sin(t.y * 0.12) * 0.25
    if (
      g.hurt <= 0 &&
      api.collide(t.x, t.y, 5, 5, g.px, PAN_Y, PAN_W, PAN_H)
    ) {
      t.y = api.H + 10
      burst(api, t.x, t.y - 10)
      hurt(api)
    }
  }
  g.toppings = g.toppings.filter((t) => t.y < api.H)

  for (const s of g.sparks) {
    s.x += s.vx
    s.y += s.vy
    s.vy += 0.05
    s.life--
  }
  g.sparks = g.sparks.filter((s) => s.life > 0)

  if (g.hurt > 0) g.hurt--
  if (g.wavePause > 0) g.wavePause--

  if (g.pizzas.length === 0 && g.wavePause <= 0 && g.lives > 0) {
    api.addScore(75 * g.wave)
    api.sfx('powerup')
    api.flash(10, 1)
    g.wavePause = 35
    spawnWave(api)
  }
}

function draw(api) {
  api.cls(2)

  api.rectfill(0, 12, api.W, 8, 14)
  for (const t of g.tiles) {
    const y = 20 + ((t.y - 20 + api.frame * 0.18) % 171)
    api.pset(t.x, y, t.c)
  }
  for (let y = 36; y < 190; y += 32) {
    api.line(0, y, api.W, y, 1)
  }
  for (let x = 0; x < api.W; x += 32) {
    api.line(x, 20, x, 190, 1)
  }

  api.rectfill(0, 190, api.W, 34, 4)
  api.rectfill(0, 190, api.W, 3, 15)
  api.rectfill(0, 216, api.W, 8, 5)

  for (const p of g.pizzas) api.spr(PIZZA, p.x, p.y)
  for (const s of g.shots) {
    api.rectfill(s.x, s.y, 2, 6, 8)
    api.pset(s.x, s.y - 1, 14)
  }
  for (const t of g.toppings) {
    api.spr(t.kind === 0 ? PEPPERONI : MUSHROOM, t.x, t.y)
  }
  for (const s of g.sparks) api.rectfill(s.x, s.y, 2, 2, s.c)

  if (g.hurt <= 0 || api.frame % 6 < 3) {
    api.spr(PAN, g.px, PAN_Y, g.vx < 0)
  }

  for (let i = 0; i < g.lives; i++) {
    api.spr(HEART, 116 + i * 7, 13)
  }
  api.text(`WAVE ${g.wave}`, 4, 215, 7)
  if (api.btn('b')) api.text('RAPID', 208, 215, 10)
}
