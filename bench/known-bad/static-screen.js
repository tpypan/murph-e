// TITLE: SKY FALL
// GENRE: dodge
// CONTROLS: left right a
// A player at the bottom of the screen moves left and right and can hop.
// Hazards fall from the top (avoid), pickups fall too (catch for points).
// Everything speeds up over time. Three hits and it is game over.
//
// The runtime calls init(api) once, then update(api, dt) and draw(api) at 60 Hz.
// The runtime owns the score HUD, the title card and the GAME OVER screen.

const PLAYER = [
  '...ff...',
  '..ffff..',
  '..f1f1..',
  '..ffff..',
  '.f8888f.',
  'f.8888.f',
  '..8..8..',
  '..1..1..',
]
const ANVIL = [
  '.666666.',
  '.677776.',
  '..6666..',
  '...66...',
  '...66...',
  '..5555..',
  '.555555.',
  '55555555',
]
const PIE = [
  '........',
  '...8....',
  '..9999..',
  '.9aaaa9.',
  '9999999a',
  '.444444.',
  '..4444..',
  '........',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const GROUND_Y = 212 // top of the ground strip
const PLAYER_W = 8
const PLAYER_H = 8

// All mutable state lives in one object so init() can rebuild it from scratch.
let g

function init(api) {
  g = {
    px: api.W / 2 - PLAYER_W / 2,
    py: GROUND_Y - PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    things: [], // { x, y, vy, kind: 'anvil' | 'pie', dead }
    lives: 3,
    spawnTimer: 0.5,
    time: 0,
    hurt: 0, // invulnerability frames after a hit
    stars: [],
  }
  for (let i = 0; i < 24; i++) g.stars.push({ x: api.rndi(0, api.W - 1), y: api.rndi(0, 150) })
  api.score(0)
}

function spawn(api, difficulty) {
  const pie = api.rnd() < 0.3
  g.things.push({
    x: api.rndi(0, api.W - 8),
    y: -8,
    vy: (pie ? 1.2 : 1.6) + difficulty * 0.8 + api.rnd(0.6),
    kind: pie ? 'pie' : 'anvil',
    dead: false,
  })
}

function update(api, dt) {
  g.time += dt
  const difficulty = Math.min(3, g.time / 30) // 0 at start, 3 after 90 s

  // Horizontal movement with a little acceleration and friction.
  const accel = 0.5
  if (api.btn('left')) {
    g.vx -= accel
    g.facing = -1
  }
  if (api.btn('right')) {
    g.vx += accel
    g.facing = 1
  }
  g.vx *= 0.82
  g.px = api.clamp(g.px + g.vx, 0, api.W - PLAYER_W)

  // Hop. A or B both work.
  if ((api.btnp('a') || api.btnp('b')) && g.onGround) {
    g.vy = -4.2
    g.onGround = false
    api.sfx('jump')
  }
  g.vy += 0.22
  g.py += g.vy
  if (g.py >= GROUND_Y - PLAYER_H) {
    g.py = GROUND_Y - PLAYER_H
    g.vy = 0
    g.onGround = true
  }

  // Spawning gets denser as time passes.
  g.spawnTimer -= dt
  if (g.spawnTimer <= 0) {
    spawn(api, difficulty)
    g.spawnTimer = Math.max(0.22, 0.8 - difficulty * 0.18)
  }

  // Move and collide.
  for (const t of g.things) {
    t.y += t.vy
    if (t.dead) continue
    if (api.collide(g.px + 1, g.py + 1, PLAYER_W - 2, PLAYER_H - 1, t.x + 1, t.y + 1, 6, 6)) {
      if (t.kind === 'pie') {
        t.dead = true
        api.addScore(25)
        api.sfx('coin')
        api.flash(10, 1)
      } else if (g.hurt <= 0) {
        t.dead = true
        g.lives--
        g.hurt = 70
        api.sfx('hit')
        api.flash(8, 3)
        api.shake(12)
        if (g.lives <= 0) {
          api.sfx('die')
          api.gameOver()
        }
      }
    }
  }
  g.things = g.things.filter((t) => !t.dead && t.y < api.H)
  if (g.hurt > 0) g.hurt--

  // Survival points.
  if (api.frame % 20 === 0) api.addScore(1)
}

function draw(api) {
  api.cls(1)
  api.rectfill(0, 100, 256, 20, 7)
  return
  for (const s of g.stars) api.pset(s.x, s.y, (s.x + api.frame / 8) % 20 < 2 ? 7 : 13)

  // Ground.
  api.rectfill(0, GROUND_Y, api.W, api.H - GROUND_Y, 3)
  api.rectfill(0, GROUND_Y, api.W, 2, 11)

  for (const t of g.things) api.spr(t.kind === 'pie' ? PIE : ANVIL, t.x, t.y)

  // Blink while invulnerable.
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(PLAYER, g.px, g.py, g.facing < 0)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
}
