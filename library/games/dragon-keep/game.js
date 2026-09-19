// TITLE: DRAGON KEEP
// GENRE: SHOOTER
// CONTROLS: LEFT RIGHT A B
// Defend the keep with bolts and slow-charging fire shots.

const CANNON = [
  '...66...',
  '..6aa6..',
  '...aa...',
  '.555555.',
  '56666665',
  '55.55.55',
  '44444444',
]
const DRAGON = [
  'b..bb..b',
  'bb.b9.bb',
  '.bbbbbb.',
  '..b7b...',
  '.bb8bb..',
  'b.b..b..',
  '..b...b.',
]
const FIREBALL = [
  '.9a9.',
  '98889',
  '8aaa8',
  '.898.',
  '..8..',
]
const POWER = [
  '..a...',
  '.a9a..',
  'a988a.',
  'a899a.',
  '.a8a..',
  '..8...',
]
const TOWER = [
  '66666666',
  '65566556',
  '66666666',
  '.666666.',
  '.655556.',
  '.666666.',
  '.654456.',
  '.654456.',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const WALL_Y = 194
const CANNON_W = 8
const CANNON_H = 7

let g

function init(api) {
  g = {
    px: api.W / 2 - 4,
    vx: 0,
    health: 5,
    hurt: 0,
    bolts: [],
    flames: [],
    dragons: [],
    embers: [],
    boltCool: 0,
    powerCool: 0,
    wave: 0,
    clouds: [],
  }
  for (let i = 0; i < 12; i++) {
    g.clouds.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(18, 125),
      speed: api.rnd(0.18) + 0.08,
      size: api.rndi(5, 12),
    })
  }
  spawnWave(api)
  api.score(0)
}

function spawnWave(api) {
  g.wave++
  const count = Math.min(14, 3 + g.wave)
  for (let i = 0; i < count; i++) {
    const x = 10 + (i * 229) / Math.max(1, count - 1)
    g.dragons.push({
      x,
      baseX: x,
      y: -12 - Math.floor(i / 5) * 19 - api.rndi(0, 12),
      hp: 2 + Math.floor(g.wave / 2),
      maxHp: 2 + Math.floor(g.wave / 2),
      phase: api.rnd(6.28),
      dead: false,
      diving: false,
    })
  }
}

function fireBolt(api) {
  g.bolts.push({ x: g.px + 3, y: WALL_Y - 6, vy: -5.5, dead: false })
  g.boltCool = 10
  api.sfx('shoot')
}

function firePower(api) {
  g.flames.push({ x: g.px + 1, y: WALL_Y - 7, vy: -3.8, dead: false })
  g.powerCool = 150
  api.sfx('powerup')
  api.flash(9, 1)
}

function damageKeep(api) {
  if (g.hurt > 0 || api.t <= 2) return
  g.health--
  g.hurt = 55
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.health <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const speed = 0.18 + g.wave * 0.035 + api.t * 0.006

  if (api.btn('left')) g.vx -= 0.45
  if (api.btn('right')) g.vx += 0.45
  g.vx *= 0.78
  g.px = api.clamp(g.px + g.vx, 8, api.W - CANNON_W - 8)

  if (g.boltCool > 0) g.boltCool--
  if (g.powerCool > 0) g.powerCool--
  if (api.btn('a') && g.boltCool <= 0) fireBolt(api)
  if (api.btnp('b')) {
    if (g.powerCool <= 0) firePower(api)
    else {
      g.embers.push({ x: g.px + 3, y: WALL_Y - 4, vx: 0, vy: -1.8, life: 18 })
      api.sfx('select')
    }
  }

  for (const s of g.bolts) {
    s.y += s.vy
    s.x += Math.sin(s.y * 0.1) * 0.08
  }
  for (const f of g.flames) {
    f.y += f.vy
    f.x += Math.sin(api.t * 9 + f.y) * 0.35
  }

  for (const d of g.dragons) {
    if (d.dead) continue
    d.y += speed * (d.diving ? 2.4 : 1)
    d.x = d.baseX + Math.sin(api.t * 2.2 + d.phase) * (15 + g.wave)
    d.x = api.clamp(d.x, 1, api.W - 9)
    if (!d.diving && d.y > 55 && api.rnd() < 0.0007 + api.t * 0.000015) d.diving = true
    if (api.rnd() < 0.0012 + g.wave * 0.00035 + api.t * 0.00001) {
      g.embers.push({
        x: d.x + 3,
        y: d.y + 6,
        vx: Math.sin(d.phase) * 0.35,
        vy: 1.1 + g.wave * 0.08 + api.t * 0.008,
        life: 240,
      })
    }
  }

  for (const s of g.bolts) {
    for (const d of g.dragons) {
      if (!s.dead && !d.dead && api.collide(s.x, s.y, 2, 6, d.x, d.y, 8, 7)) {
        s.dead = true
        d.hp--
        api.sfx('hit')
        if (d.hp <= 0) killDragon(api, d)
      }
    }
  }

  for (const f of g.flames) {
    for (const d of g.dragons) {
      if (!f.dead && !d.dead && api.collide(f.x, f.y, 6, 6, d.x, d.y, 8, 7)) {
        d.hp -= 3
        f.dead = true
        api.sfx('explode')
        if (d.hp <= 0) killDragon(api, d)
      }
    }
  }

  for (const d of g.dragons) {
    if (!d.dead && d.y + 7 >= WALL_Y) {
      d.dead = true
      damageKeep(api)
    }
  }

  for (const e of g.embers) {
    e.x += e.vx
    e.y += e.vy
    e.vy += 0.008
    e.life--
    if (e.y >= WALL_Y - 2) {
      e.life = 0
      damageKeep(api)
    }
  }

  g.bolts = g.bolts.filter((s) => !s.dead && s.y > 10)
  g.flames = g.flames.filter((f) => !f.dead && f.y > 10)
  g.embers = g.embers.filter((e) => e.life > 0 && e.y < api.H)
  g.dragons = g.dragons.filter((d) => !d.dead && d.y < api.H)

  if (g.dragons.length === 0 && g.hurt <= 0) {
    api.addScore(75 * g.wave)
    api.sfx('coin')
    api.flash(10, 1)
    spawnWave(api)
  }
  if (g.hurt > 0) g.hurt--
}

function killDragon(api, d) {
  d.dead = true
  const bonus = Math.max(0, Math.floor((150 - d.y) / 5) * 5)
  api.addScore(30 + bonus)
  api.sfx('explode')
  api.flash(10, 1)
}

function draw(api) {
  api.cls(12)

  api.circfill(210, 42, 14, 10)
  api.circfill(210, 42, 10, 14)
  for (const c of g.clouds) {
    const x = (c.x + api.frame * c.speed) % (api.W + 30) - 15
    api.circfill(x, c.y, c.size, 6)
    api.circfill(x + c.size, c.y + 2, c.size - 2, 7)
  }
  api.rectfill(0, 153, api.W, 41, 3)
  for (let x = 0; x < api.W; x += 20) {
    api.line(x, 153, x + 12, 139, 1)
    api.line(x + 12, 139, x + 24, 153, 1)
  }

  for (const d of g.dragons) {
    api.spr(DRAGON, d.x, d.y, Math.sin(api.t * 3 + d.phase) < 0)
    if (d.hp < d.maxHp) {
      api.rectfill(d.x, d.y - 3, 8, 2, 8)
      api.rectfill(d.x, d.y - 3, 8 * d.hp / d.maxHp, 2, 11)
    }
  }
  for (const s of g.bolts) api.rectfill(s.x, s.y, 2, 6, 10)
  for (const f of g.flames) api.spr(POWER, f.x, f.y)
  for (const e of g.embers) api.spr(FIREBALL, e.x - 2, e.y - 2)

  api.rectfill(0, WALL_Y, api.W, api.H - WALL_Y, 5)
  api.rectfill(0, WALL_Y, api.W, 4, 6)
  for (let x = 0; x < api.W; x += 16) {
    api.rectfill(x, WALL_Y - 5, 9, 6, 6)
    api.line(x + 2, 202, x + 13, 202, 4)
  }
  api.spr(TOWER, 2, WALL_Y - 12)
  api.spr(TOWER, api.W - 10, WALL_Y - 12)
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(CANNON, g.px, WALL_Y - CANNON_H)

  for (let i = 0; i < g.health; i++) api.spr(HEART, 106 + i * 8, 14)
  api.text(`WAVE ${g.wave}`, 4, 14, 7)
  api.rect(184, 15, 66, 5, 7)
  api.rectfill(186, 17, 62 * (1 - g.powerCool / 150), 1, g.powerCool ? 9 : 10)
}
