// TITLE: STAR ZAPPER
// GENRE: SHOOTER
// CONTROLS: LEFT RIGHT A B
// Zap space bugs before they swarm the tiny star station.
// A fires plasma bolts. B activates a short defensive shield.

const ZAPPER = [
  '...77...',
  '..7cc7..',
  '.7cccc7.',
  'cccccccc',
  'c2cccc2c',
  '..9cc9..',
  '.9....9.',
]
const BUG = [
  '2......2',
  '.2.22.2.',
  '..eeee..',
  '.e7ee7e.',
  'eeeeeeee',
  'e.e..e.e',
  '.3....3.',
]
const BUG2 = [
  '.b....b.',
  'b.b..b.b',
  '.bbbbbb.',
  'bb7bb7bb',
  '.bbbbbb.',
  '..b..b..',
  '.b....b.',
]
const SPARK = [
  '.a.',
  'a7a',
  '.9.',
]
const SHIELD = [
  '..ccc...',
  '.c...c..',
  'c.....c.',
  'c.....c.',
  '.c...c..',
  '..ccc...',
]
const HEART = [
  '.8.8.',
  '88888',
  '88888',
  '.888.',
  '..8..',
]

const SHIP_W = 8
const SHIP_H = 7
const SHIP_Y = 199
const STATION_Y = 210

let g

function init(api) {
  g = {
    px: api.W / 2 - 4,
    vx: 0,
    lives: 3,
    bolts: [],
    sparks: [],
    bugs: [],
    stars: [],
    cooldown: 0,
    shield: 0,
    shieldCharge: 100,
    hurt: 0,
    wave: 0,
    drift: 1,
  }
  for (let i = 0; i < 42; i++) {
    g.stars.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(13, STATION_Y - 1),
      speed: api.rnd(0.25) + 0.1,
      color: api.rnd() < 0.2 ? 13 : 6,
    })
  }
  spawnSwarm(api)
  api.score(0)
}

function spawnSwarm(api) {
  g.wave++
  g.drift = g.wave % 2 ? 1 : -1
  const gap = Math.max(12, 21 - Math.floor(g.wave / 2))
  const cols = Math.min(14, 5 + g.wave)
  const rows = Math.min(6, 1 + Math.floor(g.wave / 2))
  const width = (cols - 1) * gap
  const start = (api.W - width) / 2 - 4
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = start + c * gap
      g.bugs.push({
        x: bx,
        baseX: bx,
        y: 25 + r * 13 - rows * 14,
        phase: api.rnd(6.28),
        kind: (r + c + g.wave) % 2,
        dead: false,
      })
    }
  }
}

function fire(api) {
  g.bolts.push({
    x: g.px + 3,
    y: SHIP_Y - 6,
    tail: 0,
  })
  g.cooldown = 9
  api.sfx('shoot')
}

function damage(api) {
  if (g.hurt > 0 || g.shield > 0 || api.t <= 2) return
  g.lives--
  g.hurt = 70
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const descent = 0.13 + g.wave * 0.035 + api.t * 0.003
  const sway = 7 + Math.min(9, g.wave * 0.7)

  if (api.btn('left')) g.vx -= 0.48
  if (api.btn('right')) g.vx += 0.48
  g.vx *= 0.79
  g.px = api.clamp(g.px + g.vx, 2, api.W - SHIP_W - 2)

  if (g.cooldown > 0) g.cooldown--
  if (api.btnp('a') || (api.btn('a') && g.cooldown === 0)) {
    if (g.cooldown === 0) fire(api)
  }

  if (api.btnp('b')) {
    if (g.shieldCharge >= 35) {
      g.shield = 75
      g.shieldCharge -= 35
      api.sfx('powerup')
    } else {
      api.sfx('select')
    }
  }
  if (g.shield > 0) g.shield--
  else g.shieldCharge = Math.min(100, g.shieldCharge + 0.12)

  for (const s of g.stars) {
    s.y += s.speed + api.t * 0.0005
    if (s.y >= STATION_Y) s.y = 13
  }

  for (const b of g.bolts) {
    b.y -= 6.2
    b.tail++
  }
  g.bolts = g.bolts.filter((b) => b.y > 8)

  for (const e of g.bugs) {
    e.y += descent
    e.x = e.baseX + Math.sin(api.t * (2.1 + g.wave * 0.04) + e.phase) * sway
    if (!e.dead && api.t > 2.5 && api.rnd() < 0.0008 + g.wave * 0.00032 + api.t * 0.000008) {
      g.sparks.push({
        x: e.x + 3,
        y: e.y + 7,
        vy: 1.05 + g.wave * 0.12 + api.t * 0.005,
        spin: api.rndi(0, 20),
      })
    }
  }

  for (const b of g.bolts) {
    for (const e of g.bugs) {
      if (!e.dead && api.collide(b.x, b.y, 2, 7, e.x, e.y, 8, 7)) {
        e.dead = true
        b.y = -20
        api.addScore(15 + g.wave)
        api.sfx('explode')
        api.flash(10, 1)
        break
      }
    }
  }
  g.bugs = g.bugs.filter((e) => !e.dead)

  for (const s of g.sparks) {
    s.y += s.vy
    s.x += Math.sin((api.frame + s.spin) * 0.15) * 0.35
    if (api.collide(s.x, s.y, 3, 3, g.px, SHIP_Y, SHIP_W, SHIP_H)) {
      s.y = api.H + 20
      if (g.shield > 0) {
        api.addScore(2)
        api.sfx('hit')
        api.flash(12, 1)
      } else {
        damage(api)
      }
    }
  }
  g.sparks = g.sparks.filter((s) => s.y < api.H)

  for (const e of g.bugs) {
    if (e.y + 7 >= STATION_Y) {
      g.bugs = []
      g.sparks = []
      damage(api)
      break
    }
  }

  if (g.bugs.length === 0 && g.hurt <= 0) {
    api.addScore(75 + g.wave * 20)
    api.sfx('powerup')
    api.flash(10, 1)
    spawnSwarm(api)
  }
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(1)

  api.rectfill(0, 12, api.W, 2, 2)
  for (const s of g.stars) {
    api.pset(s.x, s.y, s.color)
    if (s.color === 13) api.pset(s.x, s.y + 1, 12)
  }

  api.circfill(30, 43, 11, 2)
  api.circfill(30, 43, 8, 14)
  api.line(16, 44, 44, 40, 13)
  api.line(18, 47, 43, 43, 2)

  api.rectfill(0, STATION_Y, api.W, 14, 5)
  api.rectfill(0, STATION_Y, api.W, 2, 12)
  for (let x = 5; x < api.W; x += 16) {
    api.rectfill(x, STATION_Y + 5, 8, 3, x % 32 ? 10 : 11)
    api.pset(x + 3, STATION_Y + 10, 7)
  }

  for (const e of g.bugs) {
    api.spr(e.kind ? BUG2 : BUG, e.x, e.y, Math.sin(api.t * 8 + e.phase) < 0)
  }
  for (const b of g.bolts) {
    api.rectfill(b.x, b.y, 2, 7, 10)
    api.pset(b.x, b.y - 1, 7)
    api.pset(b.x, b.y + 7, 9)
  }
  for (const s of g.sparks) api.spr(SPARK, s.x, s.y)

  if (g.shield > 0) {
    api.spr(SHIELD, g.px - 1, SHIP_Y)
    api.circ(g.px + 4, SHIP_Y + 4, 8 + (api.frame % 4 === 0 ? 1 : 0), 12)
  }
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(ZAPPER, g.px, SHIP_Y)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
  api.text(`W${g.wave}`, 4, 14, 7)
  api.rect(205, 15, 46, 5, 6)
  api.rectfill(207, 17, 42 * g.shieldCharge / 100, 1, g.shieldCharge >= 35 ? 12 : 5)
}
