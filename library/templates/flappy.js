// TITLE: FLAP
// GENRE: flappy
// CONTROLS: a
// Press A to flap. Pipes scroll in from the right; pass between them to
// score. Hitting a pipe, the ground or the ceiling ends the game. The gap
// narrows and the scroll speeds up. The bird hovers until the first flap.

const BIRD = ['..aa..', '.aaa7.', 'aaaa8.', '.aa8..']
const BIRD_W = 6
const BIRD_H = 4
const BIRD_X = 60
const PIPE_W = 20
const GROUND_Y = 208
const TOP = 14

let g

function init(api) {
  g = {
    y: 100,
    vy: 0,
    started: false,
    pipes: [], // { x, gapY, gapH, passed }
    speed: 1.6,
    spawnIn: 60,
    clouds: [],
  }
  for (let i = 0; i < 4; i++)
    g.clouds.push({ x: api.rndi(0, api.W), y: api.rndi(20, 90), w: api.rndi(14, 30) })
  api.score(0)
}

function update(api, dt) {
  if (api.btnp('a')) {
    g.started = true
    g.vy = -3.6
    api.sfx('jump')
  }

  if (g.started) {
    g.vy = Math.min(5, g.vy + 0.22)
    g.y += g.vy
  } else {
    g.y = 100 + Math.sin(api.t * 4) * 4 // hover until the first flap
  }

  g.speed = 1.6 + api.t * 0.02
  g.spawnIn--
  if (g.spawnIn <= 0) {
    const gapH = Math.max(40, 70 - api.t * 0.6)
    g.pipes.push({ x: api.W, gapY: api.rndi(TOP + 20, GROUND_Y - 20 - gapH), gapH, passed: false })
    g.spawnIn = Math.max(55, 100 - api.t)
  }

  for (const p of g.pipes) {
    p.x -= g.speed
    if (!p.passed && p.x + PIPE_W < BIRD_X) {
      p.passed = true
      api.addScore(1)
      api.sfx('coin')
      api.flash(10, 1)
    }
    const hitTop = api.collide(BIRD_X, g.y, BIRD_W, BIRD_H, p.x, TOP, PIPE_W, p.gapY - TOP)
    const hitBot = api.collide(BIRD_X, g.y, BIRD_W, BIRD_H, p.x, p.gapY + p.gapH, PIPE_W, GROUND_Y)
    if (g.started && (hitTop || hitBot)) die(api)
  }
  g.pipes = g.pipes.filter((p) => p.x > -PIPE_W)

  if (g.started && (g.y + BIRD_H >= GROUND_Y || g.y <= TOP)) die(api)
}

function die(api) {
  api.sfx('die')
  api.flash(8, 3)
  api.shake(12)
  api.gameOver()
}

function draw(api) {
  api.cls(12)
  for (const c of g.clouds)
    api.rectfill(((c.x - api.frame * 0.3) % (api.W + 40)) + 40 - 20, c.y, c.w, 4, 7)
  for (const p of g.pipes) {
    api.rectfill(p.x, TOP, PIPE_W, p.gapY - TOP, 3)
    api.rectfill(p.x - 2, p.gapY - 6, PIPE_W + 4, 6, 11)
    api.rectfill(p.x, p.gapY + p.gapH, PIPE_W, GROUND_Y - p.gapY - p.gapH, 3)
    api.rectfill(p.x - 2, p.gapY + p.gapH, PIPE_W + 4, 6, 11)
  }
  api.rectfill(0, GROUND_Y, api.W, api.H - GROUND_Y, 4)
  api.rectfill(0, GROUND_Y, api.W, 3, 11)
  api.spr(BIRD, BIRD_X, g.y, false, g.vy < -1)
  if (!g.started) api.textCenter('PRESS A', 150, 7)
}
