// TITLE: SPEED PONG
// GENRE: pong
// CONTROLS: up down a b
// Return the pulse ball, shift paddle sides with B, and score seven points.
// Every point raises the permanent ball speed; long rallies sharpen the CPU.

const RACER = [
  '.cc.',
  'c77c',
  'c77c',
  'c77c',
  'c77c',
  'c77c',
  'c77c',
  '.cc.',
]
const CPU = [
  '.88.',
  '8998',
  '8998',
  '8998',
  '8998',
  '8998',
  '8998',
  '.88.',
]
const ORB = [
  '.aa.',
  'a77a',
  'a77a',
  '.aa.',
]
const SPARK = [
  '.9.',
  '9a9',
  '.9.',
]

const PAD_W = 4
const PAD_H = 24
const BALL = 4
const TOP = 16
const BOTTOM = 218
const WIN_SCORE = 7

let g

function init(api) {
  g = {
    py: 106,
    cy: 106,
    side: 0,
    ball: { x: 126, y: 114, vx: 0, vy: 0 },
    serving: true,
    serveTimer: 210,
    baseSpeed: 2.25,
    playerPoints: 0,
    cpuPoints: 0,
    rally: 0,
    hurt: 0,
    trail: [],
    sparks: [],
    stars: [],
  }
  for (let i = 0; i < 30; i++) {
    g.stars.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(TOP + 2, BOTTOM - 2),
      speed: api.rnd(0.7) + 0.25,
      color: api.rnd() < 0.5 ? 13 : 12,
    })
  }
  api.score(0)
}

function playerX() {
  return g.side === 0 ? 9 : 25
}

function serve(api, towardPlayer) {
  const angle = api.rnd(0.7) - 0.35
  g.ball.x = 126
  g.ball.y = api.rndi(55, 178)
  g.ball.vx = (towardPlayer ? -1 : 1) * g.baseSpeed * Math.cos(angle)
  g.ball.vy = g.baseSpeed * Math.sin(angle) * 1.45
  g.serving = false
  g.rally = 0
  api.sfx('shoot')
}

function resetRally(api, towardPlayer) {
  g.serving = true
  g.serveTimer = 48
  g.ball.x = 126
  g.ball.y = 114
  g.ball.vx = 0
  g.ball.vy = 0
  g.rally = 0
  g.trail = []
  g.baseSpeed = 2.25 + (g.playerPoints + g.cpuPoints) * 0.32 + api.t * 0.004
  g.nextTowardPlayer = towardPlayer
}

function burst(api, x, y, color) {
  for (let i = 0; i < 7; i++) {
    g.sparks.push({
      x: x,
      y: y,
      vx: api.rnd(3) - 1.5,
      vy: api.rnd(3) - 1.5,
      life: 18,
      color: color,
    })
  }
}

function bounce(api, padY, dir, x) {
  const b = g.ball
  const rel = api.clamp(
    (b.y + BALL / 2 - (padY + PAD_H / 2)) / (PAD_H / 2),
    -1,
    1
  )
  g.rally++
  const speed = g.baseSpeed + g.rally * 0.16 + api.t * 0.003
  b.vx = dir * speed
  b.vy = rel * speed * 1.15
  b.x = dir > 0 ? x + PAD_W : x - BALL
  burst(api, b.x + 2, b.y + 2, dir > 0 ? 12 : 8)
  api.sfx('jump')
}

function update(api, dt) {
  const move = 3.2 + api.t * 0.002
  if (api.btn('up')) g.py -= move
  if (api.btn('down')) g.py += move
  g.py = api.clamp(g.py, TOP, BOTTOM - PAD_H)

  if (api.btnp('b')) {
    g.side = 1 - g.side
    burst(api, playerX() + 2, g.py + PAD_H / 2, 13)
    api.sfx('select')
  }

  if (api.btnp('a')) {
    if (g.serving) {
      serve(api, g.nextTowardPlayer === undefined ? api.rnd() < 0.5 : g.nextTowardPlayer)
    } else {
      g.ball.vy += g.ball.y < g.py + PAD_H / 2 ? -0.7 : 0.7
      burst(api, playerX() + 2, g.py + PAD_H / 2, 10)
      api.sfx('shoot')
    }
  }

  if (g.serving) {
    g.serveTimer--
    if (g.serveTimer <= 0) serve(api, g.nextTowardPlayer !== false)
  }

  const b = g.ball
  const cpuGain = 1.45 + g.rally * 0.13 + api.t * 0.012
  const target = !g.serving && b.vx > 0 ? b.y - PAD_H / 2 + BALL / 2 : 106
  if (g.cy < target - 2) g.cy += cpuGain
  if (g.cy > target + 2) g.cy -= cpuGain
  g.cy = api.clamp(g.cy, TOP, BOTTOM - PAD_H)

  if (!g.serving) {
    g.trail.push({ x: b.x, y: b.y, life: 10 })
    if (g.trail.length > 12) g.trail.shift()
    b.x += b.vx
    b.y += b.vy

    if (b.y <= TOP || b.y + BALL >= BOTTOM) {
      b.y = api.clamp(b.y, TOP, BOTTOM - BALL)
      b.vy = -b.vy
      api.sfx('jump')
    }

    const px = playerX()
    if (b.vx < 0 && api.collide(b.x, b.y, BALL, BALL, px, g.py, PAD_W, PAD_H)) {
      bounce(api, g.py, 1, px)
    }
    const cx = api.W - 13
    if (b.vx > 0 && api.collide(b.x, b.y, BALL, BALL, cx, g.cy, PAD_W, PAD_H)) {
      bounce(api, g.cy, -1, cx)
    }

    if (b.x < -BALL) {
      g.cpuPoints++
      g.hurt = 55
      g.baseSpeed += 0.34
      api.sfx('hit')
      api.flash(8, 3)
      api.shake(10)
      if (g.cpuPoints >= WIN_SCORE && api.t > 2) {
        api.sfx('die')
        api.gameOver()
        return
      }
      resetRally(api, true)
    } else if (b.x > api.W) {
      g.playerPoints++
      g.baseSpeed += 0.34
      api.addScore(1)
      api.sfx('coin')
      api.flash(10, 1)
      if (g.playerPoints >= WIN_SCORE) {
        api.sfx('powerup')
        api.win()
        return
      }
      resetRally(api, false)
    }
  }

  for (const t of g.trail) t.life--
  g.trail = g.trail.filter((t) => t.life > 0)
  for (const s of g.sparks) {
    s.x += s.vx
    s.y += s.vy
    s.life--
  }
  g.sparks = g.sparks.filter((s) => s.life > 0)
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(1)
  api.rectfill(0, TOP, api.W, BOTTOM - TOP, 2)
  for (const s of g.stars) {
    const x = (s.x - api.frame * s.speed + api.W * 4) % api.W
    api.pset(x, s.y, s.color)
  }

  api.rectfill(0, TOP, api.W, 2, 6)
  api.rectfill(0, BOTTOM - 2, api.W, 2, 6)
  for (let y = TOP + 5; y < BOTTOM - 4; y += 10) {
    api.rectfill(127, y, 2, 5, 13)
  }
  api.rectfill(3, TOP + 3, 2, BOTTOM - TOP - 6, 12)
  api.rectfill(api.W - 5, TOP + 3, 2, BOTTOM - TOP - 6, 8)

  for (const t of g.trail) {
    const color = t.life > 6 ? 10 : t.life > 3 ? 9 : 4
    api.rectfill(t.x, t.y, BALL, BALL, color)
  }
  for (const s of g.sparks) api.spr(SPARK, s.x, s.y)

  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(RACER, playerX(), g.py)
  for (let i = 0; i < 3; i++) api.spr(CPU, api.W - 13, g.cy + i * 8)
  if (!g.serving || api.frame % 8 < 4) api.spr(ORB, g.ball.x, g.ball.y)

  api.text(`${g.playerPoints}`, 103, TOP + 6, 12, 2)
  api.text(`${g.cpuPoints}`, 143, TOP + 6, 8, 2)
  api.text(`R${g.rally}`, 116, BOTTOM - 11, 6)
  if (g.serving && g.serveTimer > 18) api.textCenter('A SERVE  B SHIFT', 194, 10)
}
