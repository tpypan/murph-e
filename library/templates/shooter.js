// TITLE: STAR BLAST
// GENRE: shooter
// CONTROLS: left right a
// A ship at the bottom moves left and right and fires upward. Enemies come
// down in waves, sway, and drop bombs. A wave that reaches the bottom costs a
// life. Waves get faster and denser. Three lives.

const SHIP = ['...cc...', '..cccc..', '.cc7ccc.', 'cccccccc', 'c.8cc8.c', '...99...']
const ENEMY = ['.b....b.', '..b..b..', '.bbbbbb.', 'bb7bb7bb', 'bbbbbbbb', 'b.b..b.b']
const BOMB = ['.8.', '888', '.8.']
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const SHIP_W = 8
const SHIP_H = 6
const SHIP_Y = 200

let g

function init(api) {
  g = {
    px: api.W / 2 - SHIP_W / 2,
    lives: 3,
    shots: [], // { x, y }
    bombs: [], // { x, y, vy }
    enemies: [], // { x, y, baseX, dead }
    cooldown: 0,
    wave: 0,
    hurt: 0,
    stars: [],
  }
  for (let i = 0; i < 30; i++)
    g.stars.push({ x: api.rndi(0, api.W - 1), y: api.rndi(14, api.H - 1) })
  spawnWave(api)
  api.score(0)
}

function spawnWave(api) {
  g.wave++
  const cols = Math.min(10, 5 + g.wave)
  const rows = Math.min(4, 1 + Math.floor(g.wave / 2))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = 24 + c * 20
      g.enemies.push({ x, y: 24 + r * 14 - rows * 14, baseX: x, dead: false })
    }
  }
}

function update(api, dt) {
  const speed = 0.25 + g.wave * 0.08 + api.t * 0.004

  // Ship
  if (api.btn('left')) g.px -= 2.2
  if (api.btn('right')) g.px += 2.2
  g.px = api.clamp(g.px, 0, api.W - SHIP_W)
  if (g.cooldown > 0) g.cooldown--
  if (api.btn('a') && g.cooldown === 0) {
    g.shots.push({ x: g.px + SHIP_W / 2 - 1, y: SHIP_Y - 2 })
    g.cooldown = 12
    api.sfx('shoot')
  }

  // Shots
  for (const s of g.shots) s.y -= 5
  g.shots = g.shots.filter((s) => s.y > 10)

  // Enemies descend and sway
  for (const e of g.enemies) {
    e.y += speed
    e.x = e.baseX + Math.sin(api.t * 2 + e.baseX * 0.05) * 10
    if (!e.dead && api.rnd() < 0.0015 + g.wave * 0.0005) {
      g.bombs.push({ x: e.x + 3, y: e.y + 6, vy: 1.5 + g.wave * 0.2 })
    }
  }

  // Shots hit enemies
  for (const s of g.shots) {
    for (const e of g.enemies) {
      if (!e.dead && api.collide(s.x, s.y, 2, 6, e.x, e.y, 8, 6)) {
        e.dead = true
        s.y = -10
        api.addScore(10)
        api.sfx('explode')
        api.flash(10, 1)
      }
    }
  }
  g.enemies = g.enemies.filter((e) => !e.dead)

  // Enemy reaches the bottom
  for (const e of g.enemies) {
    if (e.y + 6 >= SHIP_Y) {
      g.enemies = []
      g.bombs = []
      hurt(api)
      break
    }
  }

  // Bombs
  for (const b of g.bombs) b.y += b.vy
  for (const b of g.bombs) {
    if (g.hurt <= 0 && api.collide(b.x, b.y, 3, 3, g.px, SHIP_Y, SHIP_W, SHIP_H)) {
      b.y = api.H + 10
      hurt(api)
    }
  }
  g.bombs = g.bombs.filter((b) => b.y < api.H)

  if (g.enemies.length === 0 && g.hurt <= 0) {
    api.addScore(50)
    api.sfx('powerup')
    spawnWave(api)
  }
  if (g.hurt > 0) g.hurt--
}

function hurt(api) {
  if (g.hurt > 0) return
  g.lives--
  g.hurt = 60
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function draw(api) {
  api.cls(0)
  for (const s of g.stars)
    api.pset(s.x, (s.y + api.frame * 0.3) % api.H, 1 + (s.x % 3 === 0 ? 12 : 0))
  api.rectfill(0, api.H - 8, api.W, 8, 5)

  for (const e of g.enemies) api.spr(ENEMY, e.x, e.y)
  for (const s of g.shots) api.rectfill(s.x, s.y, 2, 6, 10)
  for (const b of g.bombs) api.spr(BOMB, b.x, b.y)
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(SHIP, g.px, SHIP_Y)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
  api.text(`WAVE ${g.wave}`, 4, api.H - 7, 7)
}
