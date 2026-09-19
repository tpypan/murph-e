// TITLE: SPIKE DASH
// GENRE: platformer
// CONTROLS: left right a b
// Auto-run across shifting platforms. Jump with A, steer in the air, and
// dash forward with B. Chain coins while avoiding multiplying spikes.

const DASHER = [
  '..aaa...',
  '.aaffa..',
  '.af1f...',
  '..fff...',
  '.cc8cc..',
  'f.ccc.f.',
  '..c.c...',
  '.44.44..',
]
const COIN = [
  '..aa..',
  '.a99a.',
  'a9aa9a',
  'a9aa9a',
  '.a99a.',
  '..aa..',
]
const SPIKE = [
  '...7....',
  '..767...',
  '.76667..',
  '7666667.',
  '55555555',
  '44444444',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']
const DASH = ['c.......', '.c......', '..c.....', '.c......']

const BASE_PLATFORMS = [
  { x: 8, y: 62, w: 58 },
  { x: 99, y: 52, w: 61 },
  { x: 190, y: 70, w: 58 },
  { x: 42, y: 108, w: 70 },
  { x: 148, y: 112, w: 73 },
  { x: 5, y: 158, w: 54 },
  { x: 88, y: 164, w: 69 },
  { x: 191, y: 158, w: 58 },
  { x: 0, y: 212, w: 256 },
]

let g

function init(api) {
  g = {
    px: 116,
    py: 204,
    vx: 1.15,
    vy: 0,
    onGround: false,
    facing: 1,
    lives: 3,
    hurt: 0,
    dash: 0,
    dashCool: 0,
    combo: 0,
    comboTime: 0,
    coin: { x: 0, y: 0, plat: 0 },
    platforms: [],
    spikes: [],
    clouds: [],
    sparks: [],
    spikeTimer: 3.7,
  }
  for (let i = 0; i < BASE_PLATFORMS.length; i++) {
    const p = BASE_PLATFORMS[i]
    g.platforms.push({
      x: p.x,
      y: p.y,
      w: p.w,
      baseX: p.x,
      phase: api.rnd(6.28),
      speed: 0.25 + api.rnd(0.35),
    })
  }
  for (let i = 0; i < 7; i++) {
    g.clouds.push({
      x: api.rndi(0, api.W),
      y: api.rndi(17, 190),
      w: api.rndi(10, 28),
      speed: 0.08 + api.rnd(0.12),
    })
  }
  placeCoin(api)
  api.score(0)
}

function placeCoin(api) {
  let index = api.rndi(0, g.platforms.length - 2)
  if (index === g.coin.plat) index = (index + 3) % (g.platforms.length - 1)
  const p = g.platforms[index]
  g.coin = {
    x: p.x + api.rndi(7, p.w - 12),
    y: p.y - 9,
    plat: index,
  }
}

function addSpike(api) {
  const index = api.rndi(0, g.platforms.length - 2)
  const p = g.platforms[index]
  if (p.w < 28) return
  g.spikes.push({
    x: p.x + api.rndi(7, p.w - 15),
    y: p.y - 6,
    plat: index,
    dead: false,
  })
}

function hurtPlayer(api) {
  if (g.hurt > 0 || api.t <= 2) return
  g.lives--
  g.hurt = 85
  g.combo = 0
  g.comboTime = 0
  g.px = 120
  g.py = 190
  g.vx = 1.2
  g.vy = -3.5
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const shift = 3 + api.t * 0.13
  const autoSpeed = 1.1 + api.t * 0.012

  for (let i = 0; i < g.platforms.length - 1; i++) {
    const p = g.platforms[i]
    p.x = p.baseX + Math.sin(api.t * p.speed + p.phase) * shift
  }
  const coinPlat = g.platforms[g.coin.plat]
  g.coin.x += (coinPlat.x - (coinPlat.lastX === undefined ? coinPlat.x : coinPlat.lastX))
  for (const s of g.spikes) {
    const p = g.platforms[s.plat]
    s.x += p.x - (p.lastX === undefined ? p.x : p.lastX)
  }
  for (const p of g.platforms) p.lastX = p.x

  if (g.dashCool > 0) g.dashCool--
  if (g.dash > 0) g.dash--

  if (api.btnp('b')) {
    g.dash = 10
    g.dashCool = 22
    g.vx = g.facing * (4.8 + api.t * 0.006)
    api.sfx('powerup')
    for (let i = 0; i < 5; i++) {
      g.sparks.push({ x: g.px, y: g.py + api.rndi(1, 7), life: 12 + i })
    }
  }

  if (api.btn('left')) {
    g.vx -= g.onGround ? 0.16 : 0.28
    g.facing = -1
  } else if (api.btn('right')) {
    g.vx += g.onGround ? 0.24 : 0.3
    g.facing = 1
  } else if (g.onGround) {
    g.facing = 1
    g.vx += 0.08
  }

  if (api.btnp('a')) {
    g.vy = g.onGround ? -5.15 : Math.min(g.vy, -1.5)
    g.onGround = false
    api.sfx('jump')
  }

  if (g.dash <= 0) {
    g.vx *= g.onGround ? 0.94 : 0.985
    if (g.facing > 0 && g.vx < autoSpeed) g.vx += 0.09
  }
  g.vx = api.clamp(g.vx, -3.4, 5.2 + api.t * 0.01)
  g.px += g.vx
  if (g.px < -8) g.px = api.W
  if (g.px > api.W) g.px = -7

  g.vy = Math.min(7, g.vy + 0.27)
  const oldBottom = g.py + 8
  g.py += g.vy
  g.onGround = false
  for (const p of g.platforms) {
    if (g.vy >= 0 && oldBottom <= p.y && g.py + 8 >= p.y &&
        g.px + 7 > p.x && g.px + 1 < p.x + p.w) {
      g.py = p.y - 8
      g.vy = 0
      g.onGround = true
    }
  }

  if (g.py > api.H + 8) hurtPlayer(api)

  if (api.collide(g.px, g.py, 8, 8, g.coin.x, g.coin.y, 6, 6)) {
    g.combo = g.comboTime > 0 ? g.combo + 1 : 1
    g.comboTime = 150
    api.addScore(100 + Math.min(500, (g.combo - 1) * 25))
    api.sfx('coin')
    api.flash(10, 1)
    placeCoin(api)
  }
  if (g.comboTime > 0) g.comboTime--
  else g.combo = 0

  g.spikeTimer -= dt
  if (g.spikeTimer <= 0) {
    addSpike(api)
    g.spikeTimer = Math.max(0.28, 2.4 - api.t * 0.025)
  }

  for (const s of g.spikes) {
    if (!s.dead && g.hurt <= 0 &&
        api.collide(g.px + 1, g.py + 1, 6, 7, s.x + 1, s.y + 1, 6, 5)) {
      s.dead = true
      hurtPlayer(api)
    }
  }
  g.spikes = g.spikes.filter((s) => !s.dead && s.x > -12 && s.x < api.W + 12)

  for (const q of g.sparks) {
    q.x -= g.facing * 1.5
    q.life--
  }
  g.sparks = g.sparks.filter((q) => q.life > 0)
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(12)
  api.rectfill(0, 176, api.W, 48, 1)
  for (const c of g.clouds) {
    const x = ((c.x + api.frame * c.speed) % (api.W + 40)) - 20
    api.rectfill(x, c.y, c.w, 4, 13)
    api.rectfill(x + 5, c.y - 3, c.w - 10, 3, 7)
  }
  for (let y = 186; y < 224; y += 10)
    api.line(0, y, api.W, y - 5, y % 20 === 6 ? 2 : 5)

  for (const p of g.platforms) {
    api.rectfill(p.x, p.y, p.w, 7, 4)
    api.rectfill(p.x, p.y, p.w, 2, 10)
    api.rectfill(p.x + 3, p.y + 3, p.w - 6, 2, 9)
  }

  for (const s of g.spikes) api.spr(SPIKE, s.x, s.y)
  api.spr(COIN, g.coin.x, g.coin.y + (api.frame % 24 < 12 ? 0 : -1))
  for (const q of g.sparks) api.spr(DASH, q.x, q.y, g.facing < 0)

  if (g.hurt <= 0 || api.frame % 6 < 3)
    api.spr(DASHER, g.px, g.py, g.facing < 0)

  if (g.combo > 1) api.text(`X${g.combo}`, 4, 14, 10)
  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
}
