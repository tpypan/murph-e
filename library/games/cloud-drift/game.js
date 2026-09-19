// TITLE: CLOUD DRIFT
// GENRE: dodge
// CONTROLS: arrows a
// Guide a sleepy cloud, gather stars, and blow storm puffs away.

const CLOUD = [
  '..........',
  '...777....',
  '.777777...',
  '77777777..',
  '771771777.',
  '7777777777',
  '.77777777.',
  '..777777..',
]
const STORM = [
  '..5555..',
  '.555555.',
  '55555555',
  '55155155',
  '55555555',
  '.555555.',
  '4.44.44.',
  '..4..4..',
]
const STAR = [
  '...a....',
  '...a....',
  '.aaaaa..',
  '..aaa...',
  '..a.a...',
  '.a...a..',
  '........',
  '........',
]
const GOLD_STAR = [
  '...7....',
  '...a....',
  '.aaaaa..',
  '..aaa...',
  '..9a9...',
  '.9...9..',
  '........',
  '........',
]
const PUFF = [
  '...6....',
  '.6666...',
  '666666..',
  '.6666...',
  '........',
  '........',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const CLOUD_W = 10
const CLOUD_H = 8
const SKY_TOP = 14

let g

function init(api) {
  g = {
    px: 54,
    py: 105,
    vx: 0,
    vy: 0,
    facing: 1,
    lives: 3,
    hurt: 0,
    breeze: 0,
    breezeCooldown: 0,
    storms: [],
    prizes: [],
    wisps: [],
    scenery: [],
    stormTimer: 3.5,
    starTimer: 0.35,
  }

  for (let i = 0; i < 28; i++) {
    g.scenery.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(SKY_TOP, api.H - 1),
      size: api.rndi(1, 3),
      speed: 0.08 + api.rnd(0.2),
    })
  }

  api.score(0)
}

function spawnStorm(api) {
  g.storms.push({
    x: api.W + 8,
    y: api.rndi(24, api.H - 18),
    vx: -(0.75 + api.t * 0.018 + api.rnd(0.55)),
    vy: api.rnd(0.5) - 0.25,
    phase: api.rnd(6.28),
    dead: false,
  })
}

function spawnStar(api) {
  const gold = api.rnd() < 0.13
  g.prizes.push({
    x: api.W + 8,
    y: api.rndi(22, api.H - 16),
    vx: -(0.65 + api.t * 0.006 + api.rnd(0.3)),
    phase: api.rnd(6.28),
    gold,
    dead: false,
  })
}

function releaseBreeze(api) {
  g.breeze = 22
  g.breezeCooldown = 8
  api.sfx('shoot')

  for (let i = 0; i < 5; i++) {
    g.wisps.push({
      x: g.px + (g.facing > 0 ? CLOUD_W : -6),
      y: g.py + 1 + i,
      vx: g.facing * (2.2 + i * 0.12),
      life: 22,
    })
  }

  for (const s of g.storms) {
    const dx = s.x + 4 - (g.px + CLOUD_W / 2)
    const dy = s.y + 4 - (g.py + CLOUD_H / 2)
    if (Math.abs(dx) < 70 && Math.abs(dy) < 36) {
      const force = (70 - Math.abs(dx)) / 70
      s.vx += g.facing * force * 1.8
      s.vy += dy < 0 ? -force * 0.35 : force * 0.35
    }
  }
}

function hurtCloud(api, storm) {
  if (g.hurt > 0 || api.t <= 2) return
  storm.dead = true
  g.lives--
  g.hurt = 90
  g.vx = -storm.vx * 1.5
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)

  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const accel = 0.22
  if (api.btn('left')) {
    g.vx -= accel
    g.facing = -1
  }
  if (api.btn('right')) {
    g.vx += accel
    g.facing = 1
  }
  if (api.btn('up')) g.vy -= accel
  if (api.btn('down')) g.vy += accel

  g.vx *= 0.9
  g.vy *= 0.9
  g.px = api.clamp(g.px + g.vx, 2, api.W - CLOUD_W - 2)
  g.py = api.clamp(g.py + g.vy, SKY_TOP, api.H - CLOUD_H - 3)

  if (api.btnp('a')) releaseBreeze(api)
  if (g.breeze > 0) g.breeze--
  if (g.breezeCooldown > 0) g.breezeCooldown--
  if (g.hurt > 0) g.hurt--

  g.starTimer -= dt
  if (g.starTimer <= 0) {
    spawnStar(api)
    g.starTimer = 1.4 + api.rnd(1.2)
  }

  g.stormTimer -= dt
  if (g.stormTimer <= 0) {
    spawnStorm(api)
    g.stormTimer = Math.max(0.38, 2.2 - api.t * 0.018) + api.rnd(0.7)
  }

  for (const s of g.scenery) {
    s.x -= s.speed + api.t * 0.0008
    if (s.x < -8) {
      s.x = api.W + api.rnd(30)
      s.y = api.rndi(SKY_TOP, api.H - 1)
    }
  }

  for (const p of g.prizes) {
    p.x += p.vx
    p.y += Math.sin(api.t * 2 + p.phase) * 0.12
    if (!p.dead && api.collide(g.px + 1, g.py + 1, 8, 6, p.x + 1, p.y + 1, 6, 6)) {
      p.dead = true
      api.addScore(p.gold ? 50 : 10)
      api.sfx(p.gold ? 'powerup' : 'coin')
      api.flash(10, 1)
    }
  }

  for (const s of g.storms) {
    s.x += s.vx
    s.y += s.vy + Math.sin(api.t * 1.7 + s.phase) * 0.18
    if (!s.dead && api.collide(g.px + 1, g.py + 1, 8, 6, s.x + 1, s.y + 1, 6, 6)) {
      hurtCloud(api, s)
    }
  }

  for (const w of g.wisps) {
    w.x += w.vx
    w.vx *= 0.96
    w.life--
  }

  g.prizes = g.prizes.filter((p) => !p.dead && p.x > -10)
  g.storms = g.storms.filter((s) => !s.dead && s.x > -14 && s.x < api.W + 30)
  g.wisps = g.wisps.filter((w) => w.life > 0 && w.x > -8 && w.x < api.W + 8)
}

function draw(api) {
  api.cls(12)

  api.rectfill(0, SKY_TOP, api.W, 42, 13)
  api.rectfill(0, 56, api.W, 52, 6)
  api.rectfill(0, 108, api.W, api.H - 108, 7)

  for (const s of g.scenery) {
    const c = s.y < 58 ? 7 : s.y < 110 ? 13 : 6
    api.rectfill(s.x, s.y, s.size * 2, s.size, c)
    if (s.size > 1) api.rectfill(s.x + 2, s.y - 1, s.size * 2, s.size, c)
  }

  api.line(0, 108, api.W, 108, 13)
  api.line(0, 109, api.W, 109, 6)

  for (const p of g.prizes) {
    api.spr(p.gold ? GOLD_STAR : STAR, p.x, p.y)
  }

  for (const s of g.storms) api.spr(STORM, s.x, s.y)

  for (const w of g.wisps) {
    if (w.life > 12) api.spr(PUFF, w.x, w.y)
    else api.line(w.x, w.y + 2, w.x + g.facing * 5, w.y + 2, 6)
  }

  if (g.breeze > 0) {
    const bx = g.facing > 0 ? g.px + 12 : g.px - 18
    api.line(bx, g.py, bx + g.facing * 14, g.py, 7)
    api.line(bx, g.py + 7, bx + g.facing * 18, g.py + 7, 6)
  }

  const bob = Math.sin(api.t * 2.2) * 1.2
  if (g.hurt <= 0 || api.frame % 6 < 3) {
    api.spr(CLOUD, g.px, g.py + bob, g.facing < 0)
  }

  for (let i = 0; i < g.lives; i++) {
    api.spr(HEART, 112 + i * 8, 4)
  }
}
