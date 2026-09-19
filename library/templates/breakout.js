// TITLE: BRICK BUST
// GENRE: breakout
// CONTROLS: left right a
// A paddle at the bottom, a ball, rows of bricks. Left and right move, A
// launches the ball. Clear the wall for a faster next wall. Losing the ball
// costs a life. Three lives.

const PAD_W = 32
const PAD_H = 4
const PAD_Y = 208
const BALL = 4
const BRICK_W = 16
const BRICK_H = 6
const COLS = 16
const TOP = 14

let g

function init(api) {
  g = {
    px: 112,
    ball: { x: 126, y: PAD_Y - BALL, vx: 0, vy: 0 },
    stuck: true,
    launchTimer: 90, // auto-launch so it moves without input
    speed: 2.4,
    bricks: [], // { x, y, c, alive }
    lives: 3,
    level: 1,
  }
  buildWall(api)
  api.score(0)
}

function buildWall(api) {
  g.bricks = []
  const rows = Math.min(7, 3 + g.level)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      g.bricks.push({ x: c * BRICK_W, y: TOP + 10 + r * BRICK_H, c: 8 + (r % 6), alive: true })
    }
  }
}

function launch(api) {
  const ang = api.rnd(1.2) - 0.6
  g.ball.vx = Math.sin(ang) * g.speed
  g.ball.vy = -Math.cos(ang) * g.speed
  g.stuck = false
  api.sfx('select')
}

function update(api, dt) {
  if (api.btn('left')) g.px -= 3.2
  if (api.btn('right')) g.px += 3.2
  g.px = api.clamp(g.px, 0, api.W - PAD_W)

  const b = g.ball
  if (g.stuck) {
    b.x = g.px + PAD_W / 2 - BALL / 2
    b.y = PAD_Y - BALL
    g.launchTimer--
    if (api.btnp('a') || g.launchTimer <= 0) launch(api)
    return
  }

  b.x += b.vx
  b.y += b.vy
  if (b.x <= 0 || b.x + BALL >= api.W) {
    b.vx = -b.vx
    b.x = api.clamp(b.x, 0, api.W - BALL)
    api.sfx('jump')
  }
  if (b.y <= TOP) {
    b.vy = -b.vy
    b.y = TOP
    api.sfx('jump')
  }

  // Paddle: angle from where the ball hit.
  if (b.vy > 0 && api.collide(b.x, b.y, BALL, BALL, g.px, PAD_Y, PAD_W, PAD_H)) {
    const rel = (b.x + BALL / 2 - (g.px + PAD_W / 2)) / (PAD_W / 2)
    g.speed = Math.min(6, g.speed + 0.05)
    b.vx = rel * g.speed
    b.vy = -Math.sqrt(Math.max(1, g.speed * g.speed - b.vx * b.vx))
    b.y = PAD_Y - BALL
    api.sfx('jump')
  }

  // Bricks
  for (const br of g.bricks) {
    if (!br.alive) continue
    if (api.collide(b.x, b.y, BALL, BALL, br.x, br.y, BRICK_W, BRICK_H)) {
      br.alive = false
      const fromSide = b.x + BALL - 1 < br.x + 1 || b.x + 1 > br.x + BRICK_W - 1
      if (fromSide) b.vx = -b.vx
      else b.vy = -b.vy
      api.addScore(5)
      api.sfx('hit')
      api.flash(br.c, 1)
      break
    }
  }
  if (g.bricks.every((br) => !br.alive)) {
    g.level++
    g.speed += 0.5
    api.addScore(100)
    api.sfx('powerup')
    buildWall(api)
    g.stuck = true
    g.launchTimer = 60
  }

  // Lost ball
  if (b.y > api.H) {
    g.lives--
    api.sfx('die')
    api.flash(8, 3)
    api.shake(10)
    if (g.lives <= 0) {
      api.gameOver()
      return
    }
    g.stuck = true
    g.launchTimer = 60
  }
}

function draw(api) {
  api.cls(1)
  api.rectfill(0, TOP - 1, api.W, 1, 6)
  for (const br of g.bricks) {
    if (!br.alive) continue
    api.rectfill(br.x + 1, br.y + 1, BRICK_W - 2, BRICK_H - 2, br.c)
    api.rectfill(br.x + 1, br.y + 1, BRICK_W - 2, 1, 7)
  }
  api.rectfill(g.px, PAD_Y, PAD_W, PAD_H, 12)
  api.rectfill(g.px + 2, PAD_Y, PAD_W - 4, 1, 7)
  api.rectfill(g.ball.x, g.ball.y, BALL, BALL, 7)
  for (let i = 0; i < g.lives; i++) api.rectfill(112 + i * 8, 5, 5, 3, 12)
  api.text(`LV ${g.level}`, 4, api.H - 8, 6)
}
