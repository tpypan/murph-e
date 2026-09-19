// TITLE: COIN HOP
// GENRE: platformer
// CONTROLS: left right a
// One screen of platforms. Run with left and right, jump with A. Grab the
// coin, which reappears on another platform. Slimes patrol the platforms and
// get faster. Touching a slime costs a life. Three lives.

const HERO = [
  '..999...',
  '.99999..',
  '.9f1f...',
  '..fff...',
  '.ccccc..',
  'f.ccc.f.',
  '..c.c...',
  '..4.4...',
]
const SLIME = ['..bbbb..', '.bbbbbb.', 'bb7bb7bb', 'bbbbbbbb', '.bbbbbb.']
const COIN = ['.aaa.', 'aa9aa', 'aa9aa', '.aaa.']
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

// Platforms: x, y, w. The floor is the last one.
const PLATFORMS = [
  { x: 20, y: 60, w: 60 },
  { x: 150, y: 60, w: 80 },
  { x: 90, y: 100, w: 70 },
  { x: 10, y: 140, w: 60 },
  { x: 180, y: 140, w: 66 },
  { x: 70, y: 180, w: 110 },
  { x: 0, y: 212, w: 256 },
]

let g

function init(api) {
  g = {
    px: 120,
    py: 204,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    lives: 3,
    hurt: 0,
    coin: { x: 0, y: 0 },
    slimes: [],
    clouds: [],
  }
  for (let i = 0; i < 5; i++)
    g.clouds.push({ x: api.rndi(0, api.W), y: api.rndi(16, 60), w: api.rndi(16, 40) })
  for (let i = 0; i < 3; i++) addSlime(api, i)
  placeCoin(api)
  api.score(0)
}

function addSlime(api, i) {
  const p = PLATFORMS[(i * 2 + 1) % (PLATFORMS.length - 1)]
  g.slimes.push({
    x: p.x + api.rndi(0, p.w - 8),
    y: p.y - 5,
    dir: api.rnd() < 0.5 ? -1 : 1,
    plat: p,
  })
}

function placeCoin(api) {
  const p = PLATFORMS[api.rndi(0, PLATFORMS.length - 2)]
  g.coin = { x: p.x + api.rndi(2, p.w - 7), y: p.y - 6 }
}

function update(api, dt) {
  const slimeSpeed = 0.5 + api.t * 0.02

  // Run
  if (api.btn('left')) {
    g.vx -= 0.4
    g.facing = -1
  }
  if (api.btn('right')) {
    g.vx += 0.4
    g.facing = 1
  }
  g.vx *= 0.8
  g.px = api.clamp(g.px + g.vx, 0, api.W - 8)

  // Jump and gravity
  if (api.btnp('a') && g.onGround) {
    g.vy = -4.6
    g.onGround = false
    api.sfx('jump')
  }
  g.vy = Math.min(6, g.vy + 0.25)
  const prevBottom = g.py + 8
  g.py += g.vy

  // Land on platforms when falling through their top edge.
  g.onGround = false
  for (const p of PLATFORMS) {
    if (
      g.vy >= 0 &&
      prevBottom <= p.y &&
      g.py + 8 >= p.y &&
      g.px + 7 > p.x &&
      g.px + 1 < p.x + p.w
    ) {
      g.py = p.y - 8
      g.vy = 0
      g.onGround = true
    }
  }
  if (g.py > api.H) {
    g.py = 204
    g.px = 120
  }

  // Coin
  if (api.collide(g.px, g.py, 8, 8, g.coin.x, g.coin.y, 5, 4)) {
    api.addScore(10)
    api.sfx('coin')
    api.flash(10, 1)
    placeCoin(api)
    if (g.slimes.length < 8 && api.getScore() % 30 === 0) addSlime(api, g.slimes.length)
  }

  // Slimes patrol and hurt
  for (const s of g.slimes) {
    s.x += s.dir * slimeSpeed
    if (s.x < s.plat.x || s.x + 8 > s.plat.x + s.plat.w) s.dir = -s.dir
    if (g.hurt <= 0 && api.collide(g.px + 1, g.py + 1, 6, 7, s.x, s.y, 8, 5)) {
      g.lives--
      g.hurt = 70
      g.vy = -3
      api.sfx('hit')
      api.flash(8, 3)
      api.shake(10)
      if (g.lives <= 0) {
        api.sfx('die')
        api.gameOver()
      }
    }
  }
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(12)
  for (const c of g.clouds)
    api.rectfill(((c.x + api.frame * 0.1) % (api.W + 40)) - 20, c.y, c.w, 5, 7)
  for (const p of PLATFORMS) {
    api.rectfill(p.x, p.y, p.w, 6, 4)
    api.rectfill(p.x, p.y, p.w, 2, 11)
  }
  api.spr(COIN, g.coin.x, g.coin.y + (api.frame % 30 < 15 ? 0 : -1))
  for (const s of g.slimes) api.spr(SLIME, s.x, s.y, s.dir < 0)
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(HERO, g.px, g.py, g.facing < 0)
  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
}
