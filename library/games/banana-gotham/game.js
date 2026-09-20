// TITLE: BANANA GOTHAM
// GENRE: platformer
// CONTROLS: left right a b
// Leap across scrolling Gotham rooftops, collect fruit and gems, and dodge bats.

const BENJI = [
  '..aaaa..',
  '.aaaaaa.',
  '.a1717a.',
  '..ffff..',
  '.222222.',
  'f.2aa2.f',
  '..2..2..',
  '..4..4..',
]
const BAT = [
  '2......2',
  '22.22.22',
  '.222222.',
  '..2772..',
  '.22..22.',
  '2......2',
]
const BANANA = [
  '......a.',
  '.....aa.',
  '..aaaa..',
  '.aa..a..',
  'aa......',
  '.aaa....',
]
const GEM = [
  '..cc..',
  '.c7cc.',
  'c7cccc',
  '.cccc.',
  '..cc..',
  '...c..',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

let g

function init(api) {
  g = {
    px: 48,
    py: 174,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    lives: 3,
    hurt: 0,
    drop: 0,
    platforms: [],
    pickups: [],
    bats: [],
    skyline: [],
    spawnX: 0,
    batTimer: 4,
  }
  for (let i = 0; i < 18; i++) {
    g.skyline.push({
      x: api.rndi(0, api.W),
      w: api.rndi(12, 28),
      h: api.rndi(25, 80),
    })
  }
  addRoof(0, 202, 88)
  addRoof(108, 178, 62)
  addRoof(190, 196, 80)
  g.spawnX = 270
  for (let i = 0; i < 4; i++) spawnRoof(api)
  api.score(0)
}

function addRoof(x, y, w) {
  g.platforms.push({ x, y, w })
}

function spawnRoof(api) {
  const gap = api.rndi(18, 34)
  const w = api.rndi(48, 88)
  const last = g.platforms[g.platforms.length - 1]
  const y = api.clamp(last ? last.y + api.rndi(-26, 27) : 190, 82, 206)
  const x = g.spawnX + gap
  const roof = { x, y, w }
  g.platforms.push(roof)
  g.spawnX = x + w

  if (api.rnd() < 0.8) {
    const gem = api.rnd() < 0.16
    g.pickups.push({
      x: x + api.rndi(8, Math.max(8, w - 12)),
      y: y - (gem ? 18 : 10),
      kind: gem ? 'gem' : 'banana',
      dead: false,
    })
  }
  if (api.t > 3 && api.rnd() < 0.25 + api.t * 0.003) {
    g.bats.push({
      x: x + w / 2,
      y: y - api.rndi(18, 38),
      baseY: y - api.rndi(18, 38),
      phase: api.rnd(6.28),
      dead: false,
    })
  }
}

function hurt(api, falling) {
  if (g.hurt > 0) return
  g.lives--
  g.hurt = 90
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0 && api.t > 2) {
    api.sfx('die')
    api.gameOver()
    return
  }
  g.px = 38
  g.py = 150
  g.vx = 0
  g.vy = falling ? -2 : -4
}

function update(api, dt) {
  const scroll = 0.42 + api.t * 0.012
  if (api.btn('left')) {
    g.vx -= 0.42
    g.facing = -1
  }
  if (api.btn('right')) {
    g.vx += 0.42
    g.facing = 1
  }
  g.vx *= 0.82
  g.px = api.clamp(g.px + g.vx, 4, 176)

  if (api.btnp('a')) {
    if (g.onGround) {
      g.vy = -5.1
      g.onGround = false
      api.sfx('jump')
    } else {
      g.vy -= 0.45
      api.sfx('shoot')
    }
  }
  if (api.btnp('b')) {
    g.drop = 12
    g.onGround = false
    g.vy = Math.max(g.vy, 2)
    api.sfx('select')
  }
  if (g.drop > 0) g.drop--

  g.vy = Math.min(6.5, g.vy + 0.27)
  const oldBottom = g.py + 8
  g.py += g.vy
  g.onGround = false

  for (const p of g.platforms) {
    p.x -= scroll
    if (
      g.drop <= 0 &&
      g.vy >= 0 &&
      oldBottom <= p.y &&
      g.py + 8 >= p.y &&
      g.px + 7 > p.x &&
      g.px + 1 < p.x + p.w
    ) {
      g.py = p.y - 8
      g.vy = 0
      g.onGround = true
    }
  }
  g.spawnX -= scroll

  for (const q of g.pickups) q.x -= scroll
  for (const b of g.bats) {
    b.x -= scroll + 0.45 + api.t * 0.006
    b.baseY -= scroll * 0.08
    b.y = b.baseY + Math.sin(api.t * 4 + b.phase) * 7
  }

  while (g.spawnX < api.W + 100 && g.platforms.length < 14) spawnRoof(api)
  g.platforms = g.platforms.filter((p) => p.x + p.w > -10)
  g.pickups = g.pickups.filter((q) => !q.dead && q.x > -12)
  g.bats = g.bats.filter((b) => !b.dead && b.x > -16)

  for (const q of g.pickups) {
    if (api.collide(g.px, g.py, 8, 8, q.x, q.y, 6, 6)) {
      q.dead = true
      api.addScore(q.kind === 'gem' ? 500 : 100)
      api.sfx(q.kind === 'gem' ? 'powerup' : 'coin')
      api.flash(10, 1)
    }
  }

  for (const b of g.bats) {
    if (g.hurt <= 0 && api.collide(g.px + 1, g.py + 1, 6, 7, b.x, b.y, 8, 6)) {
      b.dead = true
      hurt(api, false)
    }
  }

  g.batTimer -= dt
  if (g.batTimer <= 0 && api.t > 3) {
    const y = api.rndi(55, 170)
    g.bats.push({ x: api.W + 8, y, baseY: y, phase: api.rnd(6.28), dead: false })
    g.batTimer = Math.max(0.45, 3.2 - api.t * 0.035)
  }

  if (g.py > api.H + 8) hurt(api, true)
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(1)
  api.circfill(210, 39, 18, 6)
  api.circfill(216, 34, 16, 14)

  for (let i = 0; i < 22; i++) {
    const x = (i * 43 - api.frame * 0.12) % api.W
    api.pset(x < 0 ? x + api.W : x, 16 + (i * 29) % 70, i % 3 ? 7 : 13)
  }

  for (const s of g.skyline) {
    const x = ((s.x - api.frame * 0.05) % (api.W + 30)) - 10
    api.rectfill(x, 212 - s.h, s.w, s.h, 2)
    for (let y = 218 - s.h; y < 205; y += 12)
      api.rectfill(x + 4, y, 3, 5, (y + s.x) % 3 ? 9 : 10)
  }

  for (const p of g.platforms) {
    api.rectfill(p.x, p.y, p.w, api.H - p.y, 5)
    api.rectfill(p.x, p.y, p.w, 4, 3)
    api.line(p.x, p.y, p.x + p.w - 1, p.y, 11)
    for (let x = p.x + 8; x < p.x + p.w; x += 18)
      api.rectfill(x, p.y + 12, 5, 8, 10)
  }

  for (const q of g.pickups) {
    const bob = Math.sin(api.t * 6 + q.x) * 2
    api.spr(q.kind === 'gem' ? GEM : BANANA, q.x, q.y + bob)
  }
  for (const b of g.bats) api.spr(BAT, b.x, b.y, api.frame % 12 < 6)
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(BENJI, g.px, g.py, g.facing < 0)
  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
}
