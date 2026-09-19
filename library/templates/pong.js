// TITLE: PONG
// GENRE: pong
// CONTROLS: up down a
// You are the left paddle. Up and down move it, A serves. The computer holds
// the right paddle. The ball speeds up on every hit. First to lose 5 points
// loses. Each point you win scores.

const PAD_W = 4
const PAD_H = 24
const BALL = 4
const TOP = 14
const BOTTOM = 220

let g

function init(api) {
  g = {
    py: 110,
    cy: 110,
    ball: { x: 128, y: 117, vx: 0, vy: 0 },
    serving: true,
    serveTimer: 90, // auto-serve so the game moves without input
    speed: 2.2,
    myLosses: 0,
    cpuLosses: 0,
    flashLine: 0,
  }
  api.score(0)
}

function serve(api, towardMe) {
  const ang = api.rnd(0.8) - 0.4
  g.ball.x = 128
  g.ball.y = api.rndi(60, 170)
  g.ball.vx = (towardMe ? -1 : 1) * g.speed * Math.cos(ang)
  g.ball.vy = g.speed * Math.sin(ang) * 1.5
  g.serving = false
  api.sfx('select')
}

function update(api, dt) {
  // Player paddle
  if (api.btn('up')) g.py -= 3
  if (api.btn('down')) g.py += 3
  g.py = api.clamp(g.py, TOP, BOTTOM - PAD_H)

  if (g.serving) {
    g.serveTimer--
    if (api.btnp('a') || g.serveTimer <= 0) serve(api, api.rnd() < 0.5)
  }

  // Computer paddle: tracks the ball with a speed limit that grows slowly.
  const cpuSpeed = 1.6 + api.t * 0.01
  const target = g.ball.vx > 0 ? g.ball.y - PAD_H / 2 : 110
  if (g.cy < target - 2) g.cy += cpuSpeed
  else if (g.cy > target + 2) g.cy -= cpuSpeed
  g.cy = api.clamp(g.cy, TOP, BOTTOM - PAD_H)

  if (g.serving) return

  const b = g.ball
  b.x += b.vx
  b.y += b.vy
  if (b.y <= TOP || b.y + BALL >= BOTTOM) {
    b.vy = -b.vy
    b.y = api.clamp(b.y, TOP, BOTTOM - BALL)
    api.sfx('jump')
  }

  // Paddle hits: angle depends on where the ball struck.
  if (b.vx < 0 && api.collide(b.x, b.y, BALL, BALL, 8, g.py, PAD_W, PAD_H)) {
    bounce(api, b, g.py, 1)
  }
  if (b.vx > 0 && api.collide(b.x, b.y, BALL, BALL, api.W - 12, g.cy, PAD_W, PAD_H)) {
    bounce(api, b, g.cy, -1)
  }

  if (b.x < -BALL) {
    g.myLosses++
    api.sfx('hit')
    api.flash(8, 2)
    api.shake(8)
    if (g.myLosses >= 5) {
      api.sfx('die')
      api.gameOver()
      return
    }
    reset(api, true)
  } else if (b.x > api.W) {
    g.cpuLosses++
    api.addScore(1)
    api.sfx('coin')
    api.flash(10, 1)
    reset(api, false)
  }
}

function bounce(api, b, padY, dir) {
  const rel = (b.y + BALL / 2 - (padY + PAD_H / 2)) / (PAD_H / 2) // -1..1
  g.speed = Math.min(7, g.speed + 0.25)
  b.vx = dir * g.speed
  b.vy = rel * g.speed * 1.2
  b.x = dir > 0 ? 8 + PAD_W : api.W - 12 - BALL
  api.sfx('jump')
}

function reset(api, towardMe) {
  g.serving = true
  g.serveTimer = 45
  g.ball.x = 128
  g.ball.y = 117
  g.ball.vx = 0
  g.ball.vy = 0
  g.speed = 2.2 + api.t * 0.01
}

function draw(api) {
  api.cls(1)
  for (let y = TOP; y < BOTTOM; y += 8) api.rectfill(127, y, 2, 4, 13)
  api.rectfill(0, TOP - 1, api.W, 1, 6)
  api.rectfill(0, BOTTOM, api.W, 1, 6)

  api.rectfill(8, g.py, PAD_W, PAD_H, 12)
  api.rectfill(api.W - 12, g.cy, PAD_W, PAD_H, 8)
  if (!g.serving || api.frame % 10 < 5) api.rectfill(g.ball.x, g.ball.y, BALL, BALL, 7)

  api.text(`${5 - g.myLosses}`, 96, TOP + 4, 12)
  api.text(`${5 - g.cpuLosses}`, 152, TOP + 4, 8)
  if (g.serving && g.serveTimer > 20) api.textCenter('A TO SERVE', 200, 6)
}
