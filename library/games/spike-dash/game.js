// TITLE: SPIKE DASH
// GENRE: platformer
// CONTROLS: left right up down a b
// Leap across shifting platforms, collect coin strings, and dodge spikes.
// A jumps, B dashes, UP boosts jumps, and DOWN crouches or drops through.

const DASHER = [
  '..aaaa..',
  '.aa9aaa.',
  '.af1fa..',
  '..fff...',
  '.cccccc.',
  'f.cccc.f',
  '..c..c..',
  '.44..44.',
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
  '........',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']
const PUFF = ['.777.', '77777', '.777.']

const BASE_PLATFORMS = [
  { x: 12, y: 54, w: 54, phase: 0.2 },
  { x: 100, y: 63, w: 53, phase: 1.4 },
  { x: 188, y: 52, w: 57, phase: 2.7 },
  { x: 44, y: 101, w: 67, phase: 3.1 },
  { x: 151, y: 106, w: 72, phase: 4.2 },
  { x: 8, y: 149, w: 57, phase: 5.3 },
  { x: 91, y: 154, w: 65, phase: 0.8 },
  { x: 185, y: 147, w: 61, phase: 2.1 },
  { x: 47, y: 193, w: 74, phase: 3.8 },
  { x: 151, y: 195, w: 71, phase: 5.7 },
]

let g

function init(api) {
  g = {
    px: 74,
    py: 185,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    standing: -1,
    drop: 0,
    crouch: false,
    dash: 0,
    dashReady: true,
    lives: 3,
    hurt: 0,
    combo: 0,
    comboTime: 0,
    coins: [],
    spikes: [],
    platforms: [],
    motes: [],
    puffs: [],
  }
  for (const p of BASE_PLATFORMS)
    g.platforms.push({ x: p.x, baseX: p.x, y: p.y, w: p.w, phase: p.phase, dx: 0 })
  for (let i = 0; i < 28; i++)
    g.motes.push({ x: api.rndi(0, 255), y: api.rndi(14, 220), speed: api.rnd(0.3) + 0.1 })
  buildCourse(api)
  api.score(0)
}

function buildCourse(api) {
  g.coins = []
  g.spikes = []
  for (let i = 0; i < g.platforms.length; i++) {
    const p = g.platforms[i]
    const count = 2 + (i % 2)
    for (let n = 0; n < count; n++) {
      g.coins.push({
        plat: i,
        offset: 10 + n * Math.max(12, (p.w - 20) / Math.max(1, count - 1)),
        bob: api.rnd(6.28),
        dead: false,
      })
    }
    if (i > 1 && i % 3 === 0)
      g.spikes.push({ plat: i, offset: p.w - 13, dead: false })
  }
}

function addHazard(api) {
  const i = api.rndi(0, g.platforms.length - 1)
  const p = g.platforms[i]
  g.spikes.push({ plat: i, offset: api.rndi(4, Math.max(5, p.w - 12)), dead: false })
}

function burst(api, x, y) {
  for (let i = 0; i < 4; i++)
    g.puffs.push({ x: x + api.rndi(-3, 3), y: y + api.rndi(-2, 2), life: 15 })
}

function hurt(api, falling) {
  if (g.hurt > 0 || api.t <= 2) return
  g.lives--
  g.hurt = 75
  g.combo = 0
  g.comboTime = 0
  g.vx = -g.facing * 3.5
  g.vy = -4
  if (falling) {
    g.px = 74
    g.py = 176
  }
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const shift = 0.35 + api.t * 0.018
  const oldPlatformX = []
  for (let i = 0; i < g.platforms.length; i++) {
    const p = g.platforms[i]
    oldPlatformX[i] = p.x
    p.x = p.baseX + Math.sin(api.t * shift + p.phase) * (4 + api.t * 0.035)
    p.dx = p.x - oldPlatformX[i]
  }
  if (g.onGround && g.standing >= 0) g.px += g.platforms[g.standing].dx

  g.crouch = api.btn('down') && g.onGround
  if (!g.crouch && g.dash <= 0) {
    if (api.btn('left')) {
      g.vx -= 0.45
      g.facing = -1
    }
    if (api.btn('right')) {
      g.vx += 0.45
      g.facing = 1
    }
  }
  if (api.btnp('down') && g.onGround) {
    g.drop = 12
    g.py += 3
    g.onGround = false
    g.vy = 1.5
    api.sfx('jump')
  }
  if (api.btnp('a')) {
    if (g.onGround) {
      g.vy = api.btn('up') ? -6.1 : -5.2
      g.onGround = false
      g.standing = -1
      api.sfx('jump')
    } else {
      g.vy -= 0.8
      burst(api, g.px + 4, g.py + 7)
      api.sfx('jump')
    }
  }
  if (api.btnp('b')) {
    g.dash = 10
    g.dashReady = false
    g.vx = g.facing * 6
    burst(api, g.px - g.facing * 3, g.py + 3)
    api.sfx('shoot')
  }

  if (g.dash > 0) {
    g.dash--
    g.vy *= 0.92
  } else {
    g.vx *= 0.81
    g.vy = Math.min(7, g.vy + 0.27)
  }
  g.px = api.clamp(g.px + g.vx, 0, api.W - 8)
  const previousBottom = g.py + 8
  g.py += g.vy
  g.onGround = false
  g.standing = -1
  if (g.drop > 0) g.drop--

  for (let i = 0; i < g.platforms.length; i++) {
    const p = g.platforms[i]
    if (g.drop <= 0 && g.vy >= 0 && previousBottom <= p.y &&
        g.py + 8 >= p.y && g.px + 7 > p.x && g.px + 1 < p.x + p.w) {
      g.py = p.y - 8
      g.vy = 0
      g.onGround = true
      g.standing = i
      g.dashReady = true
    }
  }

  for (const c of g.coins) {
    if (c.dead) continue
    const p = g.platforms[c.plat]
    const cx = p.x + c.offset
    const cy = p.y - 10
    if (api.collide(g.px, g.py, 8, 8, cx, cy, 6, 6)) {
      c.dead = true
      g.combo = g.comboTime > 0 ? g.combo + 1 : 1
      g.comboTime = 150
      api.addScore(5 + g.combo * 5)
      api.sfx('coin')
      api.flash(10, 1)
      burst(api, cx + 3, cy + 3)
      if (g.combo % 4 === 0) api.sfx('powerup')
    }
  }

  for (const s of g.spikes) {
    const p = g.platforms[s.plat]
    if (g.hurt <= 0 && api.collide(g.px + 1, g.py + 1, 6, 7,
        p.x + s.offset, p.y - 7, 8, 7)) hurt(api, false)
  }
  if (g.py > api.H + 10) hurt(api, true)

  if (g.comboTime > 0) g.comboTime--
  else g.combo = 0
  if (g.hurt > 0) g.hurt--
  for (const q of g.puffs) q.life--
  g.puffs = g.puffs.filter((q) => q.life > 0)

  if (g.coins.every((c) => c.dead)) {
    api.addScore(50 + g.combo * 5)
    api.sfx('powerup')
    buildCourse(api)
    addHazard(api)
  }
  if (api.frame > 240 && api.frame % Math.max(180, 600 - Math.floor(api.t * 5)) === 0)
    addHazard(api)
}

function draw(api) {
  api.cls(2)
  api.rectfill(0, 12, api.W, 36, 1)
  for (const m of g.motes) {
    const y = 14 + ((m.y + api.frame * m.speed) % 205)
    api.pset(m.x, y, m.x % 3 === 0 ? 13 : 12)
  }
  api.rectfill(0, 216, api.W, 8, 8)
  api.line(0, 216, 255, 216, 14)

  for (const p of g.platforms) {
    api.rectfill(p.x, p.y, p.w, 6, 5)
    api.rectfill(p.x, p.y, p.w, 2, 11)
    api.line(p.x + 3, p.y + 5, p.x + p.w - 3, p.y + 5, 4)
  }
  for (const s of g.spikes) {
    const p = g.platforms[s.plat]
    api.spr(SPIKE, p.x + s.offset, p.y - 7)
  }
  for (const c of g.coins) {
    if (!c.dead) {
      const p = g.platforms[c.plat]
      api.spr(COIN, p.x + c.offset, p.y - 10 + Math.sin(api.t * 5 + c.bob))
    }
  }
  for (const q of g.puffs)
    api.spr(PUFF, q.x, q.y, false, q.life % 4 < 2)

  if (g.dash > 0)
    api.rectfill(g.px - g.facing * 7, g.py + 3, 7, 2, 13)
  if (g.hurt <= 0 || api.frame % 6 < 3)
    api.spr(DASHER, g.px, g.py + (g.crouch ? 3 : 0), g.facing < 0)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
  if (g.combo > 1) api.text(`X${g.combo}`, 224, 14, 10)
}
