// TITLE: ASTEROID BLAST
// GENRE: shooter
// CONTROLS: d-pad move, A fire, B hypershift
// Rotate, thrust and blast tumbling rocks. Large rocks split into fast chunks.

const SHIP = [
  '...7....',
  '..7c7...',
  '.7ccc7..',
  '7ccacc7.',
  '..ccc...',
  '..9.9...',
  '.8...8..',
  '........',
]
const ROCK_L = [
  '...555....',
  '.5566655..',
  '566656665.',
  '566555666.',
  '556665555.',
  '.56665665.',
  '..555555..',
  '...55.....',
]
const ROCK_S = [
  '.5555.',
  '566655',
  '565555',
  '556665',
  '.5555.',
  '..55..',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const SHIP_W = 8
const SHIP_H = 8
const PI2 = Math.PI * 2
let g

function init(api) {
  g = {
    x: api.W / 2 - 4,
    y: api.H / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    lives: 3,
    wave: 0,
    shots: [],
    rocks: [],
    sparks: [],
    stars: [],
    fire: 0,
    shift: 0,
    hurt: 150,
    waveDelay: 0,
  }
  for (let i = 0; i < 38; i++) {
    g.stars.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(13, api.H - 1),
      c: api.rnd() < 0.25 ? 13 : 7,
      speed: api.rnd(0.18) + 0.04,
    })
  }
  api.score(0)
  spawnWave(api)
}

function spawnRock(api, size, x, y, safe) {
  let rx = x
  let ry = y
  if (safe) {
    const edge = api.rndi(0, 3)
    if (edge === 0) {
      rx = api.rndi(0, api.W - 10)
      ry = 13
    } else if (edge === 1) {
      rx = api.W - 10
      ry = api.rndi(14, api.H - 10)
    } else if (edge === 2) {
      rx = api.rndi(0, api.W - 10)
      ry = api.H - 10
    } else {
      rx = 0
      ry = api.rndi(14, api.H - 10)
    }
  }
  const a = api.rnd(PI2)
  const speed = (size === 2 ? 0.28 : 0.65) + g.wave * 0.045 + api.t * 0.003
  g.rocks.push({
    x: rx,
    y: ry,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    size,
    spin: api.rnd(0.12) - 0.06,
    rot: api.rnd(PI2),
    dead: false,
  })
}

function spawnWave(api) {
  g.wave++
  const count = 2 + g.wave
  for (let i = 0; i < count; i++) spawnRock(api, 2, 0, 0, true)
}

function wrap(o, api, pad) {
  if (o.x < -pad) o.x = api.W
  if (o.x > api.W) o.x = -pad
  if (o.y < 12 - pad) o.y = api.H
  if (o.y > api.H) o.y = 12 - pad
}

function burst(api, x, y, c, count) {
  for (let i = 0; i < count; i++) {
    const a = api.rnd(PI2)
    const v = api.rnd(1.8) + 0.4
    g.sparks.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: api.rndi(10, 25),
      c,
    })
  }
}

function damage(api) {
  if (g.hurt > 0 || api.t <= 2) return
  g.lives--
  g.hurt = 100
  g.x = api.W / 2 - 4
  g.y = api.H / 2
  g.vx = 0
  g.vy = 0
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  if (api.btn('left')) g.angle -= 0.065
  if (api.btn('right')) g.angle += 0.065
  if (api.btn('up')) {
    g.vx += Math.cos(g.angle) * 0.075
    g.vy += Math.sin(g.angle) * 0.075
    if (api.frame % 3 === 0)
      burst(api, g.x + 4 - Math.cos(g.angle) * 5, g.y + 4 - Math.sin(g.angle) * 5, 9, 1)
  }
  if (api.btn('down')) {
    g.vx *= 0.94
    g.vy *= 0.94
    g.vx -= Math.cos(g.angle) * 0.018
    g.vy -= Math.sin(g.angle) * 0.018
  }
  g.vx *= 0.995
  g.vy *= 0.995
  g.x += g.vx
  g.y += g.vy
  wrap(g, api, 8)

  if (g.fire > 0) g.fire--
  if (api.btnp('a')) {
    const cx = g.x + 4
    const cy = g.y + 4
    g.shots.push({
      x: cx + Math.cos(g.angle) * 6,
      y: cy + Math.sin(g.angle) * 6,
      vx: Math.cos(g.angle) * 4.7 + g.vx,
      vy: Math.sin(g.angle) * 4.7 + g.vy,
      life: 52,
    })
    g.fire = 5
    api.sfx('shoot')
  }

  if (g.shift > 0) g.shift--
  if (api.btnp('b')) {
    if (g.shift <= 0) {
      burst(api, g.x + 4, g.y + 4, 13, 12)
      g.x += Math.cos(g.angle) * 42
      g.y += Math.sin(g.angle) * 42
      wrap(g, api, 8)
      g.shift = 150
      g.hurt = Math.max(g.hurt, 20)
      burst(api, g.x + 4, g.y + 4, 12, 12)
      api.sfx('powerup')
    } else {
      burst(api, g.x + 4, g.y + 4, 13, 4)
      api.sfx('select')
    }
  }

  for (const s of g.shots) {
    s.x += s.vx
    s.y += s.vy
    s.life--
  }
  g.shots = g.shots.filter((s) =>
    s.life > 0 && s.x > -4 && s.x < api.W + 4 && s.y > 9 && s.y < api.H + 4
  )

  for (const r of g.rocks) {
    r.x += r.vx
    r.y += r.vy
    r.rot += r.spin
    wrap(r, api, r.size === 2 ? 10 : 6)
  }

  for (const s of g.shots) {
    for (const r of g.rocks) {
      const w = r.size === 2 ? 8 : 6
      if (!r.dead && s.life > 0 && api.collide(s.x, s.y, 2, 2, r.x, r.y, w, w)) {
        r.dead = true
        s.life = 0
        api.addScore(r.size === 2 ? 20 : 50)
        api.sfx('explode')
        api.flash(10, 1)
        burst(api, r.x + w / 2, r.y + w / 2, r.size === 2 ? 6 : 9, 9)
        if (r.size === 2) {
          spawnRock(api, 1, r.x - 2, r.y, false)
          spawnRock(api, 1, r.x + 4, r.y + 2, false)
        }
      }
    }
  }

  if (g.hurt <= 0) {
    for (const r of g.rocks) {
      const w = r.size === 2 ? 8 : 6
      if (!r.dead && api.collide(g.x + 1, g.y + 1, 6, 6, r.x, r.y, w, w)) {
        r.dead = true
        burst(api, g.x + 4, g.y + 4, 8, 16)
        damage(api)
        break
      }
    }
  }

  g.rocks = g.rocks.filter((r) => !r.dead)
  g.shots = g.shots.filter((s) => s.life > 0)
  if (g.hurt > 0) g.hurt--

  for (const p of g.sparks) {
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.96
    p.vy *= 0.96
    p.life--
  }
  g.sparks = g.sparks.filter((p) => p.life > 0)

  if (g.rocks.length === 0) {
    g.waveDelay++
    if (g.waveDelay === 45) {
      api.addScore(100 * g.wave)
      api.sfx('powerup')
      api.flash(10, 1)
      spawnWave(api)
      g.waveDelay = 0
    }
  } else {
    g.waveDelay = 0
  }
}

function draw(api) {
  api.cls(1)
  api.rectfill(0, 12, api.W, api.H - 12, 2)
  for (const s of g.stars) {
    const y = 13 + ((s.y - 13 + api.frame * s.speed) % (api.H - 13))
    api.pset(s.x, y, s.c)
  }
  api.rect(1, 13, api.W - 2, api.H - 14, 12)

  for (const r of g.rocks)
    api.spr(r.size === 2 ? ROCK_L : ROCK_S, r.x, r.y, Math.cos(r.rot) < 0, Math.sin(r.rot) < 0)

  for (const s of g.shots) {
    api.pset(s.x - s.vx * 0.6, s.y - s.vy * 0.6, 14)
    api.rectfill(s.x, s.y, 2, 2, 10)
  }
  for (const p of g.sparks) api.pset(p.x, p.y, p.c)

  if (g.hurt <= 0 || api.frame % 6 < 3)
    api.spr(SHIP, g.x, g.y, Math.cos(g.angle) < 0, Math.sin(g.angle) > 0)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
  api.text(`W${g.wave}`, 4, 14, 7)
  api.rect(205, 15, 46, 5, 6)
  const ready = 44 * (1 - g.shift / 150)
  api.rectfill(206, 16, ready, 3, g.shift <= 0 ? 11 : 13)
}
