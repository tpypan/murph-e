// TITLE: SPEED PONG
// GENRE: pong
// CONTROLS: up down a
// Return the neon pulse and score past the computer. Every point permanently
// increases its speed. The match ends if the computer reaches seven points.

const PLAYER_PAD = [
  'cc77',
  'c777',
  'cc77',
  'c777',
  'cc77',
  'c777',
  'cc77',
  'c777',
]
const CPU_PAD = [
  '8877',
  '8777',
  '8877',
  '8777',
  '8877',
  '8777',
  '8877',
  '8777',
]
const PULSE = [
  '.aa.',
  'a77a',
  'a77a',
  '.aa.',
]

const PAD_W = 4
const PAD_H = 24
const BALL_SIZE = 4
const TOP = 18
const BOTTOM = 216
const PLAYER_X = 10
const CPU_X = 242

let g

function init(api) {
  g = {
    py: 106,
    cy: 106,
    ball: { x: 126, y: 114, vx: 0, vy: 0 },
    serving: true,
    serveTimer: 120,
    baseSpeed: 2.15,
    playerPoints: 0,
    cpuPoints: 0,
    trail: [],
    sparks: [],
    stars: [],
    hurt: 0,
  }
  for (let i = 0; i < 28; i++) {
    g.stars.push({
      x: api.rndi(2, api.W - 3),
      y: api.rndi(TOP + 2, BOTTOM - 3),
      speed: api.rnd(0.35) + 0.1,
      color: api.rnd() < 0.5 ? 13 : 12,
    })
  }
  api.score(0)
}

function serve(api, towardPlayer) {
  const angle = api.rnd(0.7) - 0.35
  g.ball.x = 126
  g.ball.y = api.rndi(55, 177)
  g.ball.vx = (towardPlayer ? -1 : 1) * g.baseSpeed * Math.cos(angle)
  g.ball.vy = g.baseSpeed * Math.sin(angle) * 1.4
  g.serving = false
  g.trail = []
  api.sfx('shoot')
}

function addSparks(api, x, y, color) {
  for (let i = 0; i < 7; i++) {
    g.sparks.push({
      x: x,
      y: y,
      vx: api.rnd(3) - 1.5,
      vy: api.rnd(3) - 1.5,
      life: api.rndi(8, 16),
      color: color,
    })
  }
}

function resetRound(api, towardPlayer) {
  g.serving = true
  g.serveTimer = 50
  g.ball.x = 126
  g.ball.y = 114
  g.ball.vx = 0
  g.ball.vy = 0
  g.trail = []
  g.nextTowardPlayer = towardPlayer
}

function bounce(api, padY, direction) {
  const b = g.ball
  const center = b.y + BALL_SIZE / 2
  const relative = (center - (padY + PAD_H / 2)) / (PAD_H / 2)
  const hitSpeed = g.baseSpeed + api.t * 0.004
  b.vx = direction * hitSpeed
  b.vy = relative * hitSpeed * 1.25
  b.x = direction > 0 ? PLAYER_X + PAD_W : CPU_X - BALL_SIZE
  addSparks(api, b.x + 2, b.y + 2, direction > 0 ? 12 : 8)
  api.sfx('jump')
}

function update(api, dt) {
  const moveSpeed = 3.2
  if (api.btn('up')) g.py -= moveSpeed
  if (api.btn('down')) g.py += moveSpeed
  g.py = api.clamp(g.py, TOP, BOTTOM - PAD_H)

  if (api.btnp('a')) {
    if (g.serving) {
      serve(api, g.nextTowardPlayer === undefined ? api.rnd() < 0.5 : g.nextTowardPlayer)
    } else {
      addSparks(api, PLAYER_X + 5, g.py + PAD_H / 2, 10)
      api.sfx('shoot')
    }
  }

  if (g.serving) {
    g.serveTimer--
    if (g.serveTimer <= 0) {
      serve(api, g.nextTowardPlayer === undefined ? true : g.nextTowardPlayer)
    }
  }

  const cpuSpeed = 1.45 + g.baseSpeed * 0.22 + api.t * 0.006
  const cpuTarget = g.ball.vx > 0 ? g.ball.y - PAD_H / 2 + 2 : 98
  if (g.cy < cpuTarget - 3) g.cy += cpuSpeed
  if (g.cy > cpuTarget + 3) g.cy -= cpuSpeed
  g.cy = api.clamp(g.cy, TOP, BOTTOM - PAD_H)

  if (!g.serving) {
    const b = g.ball
    g.trail.push({ x: b.x, y: b.y, life: 8 })
    if (g.trail.length > 16) g.trail.shift()
    b.x += b.vx
    b.y += b.vy

    if (b.y <= TOP || b.y + BALL_SIZE >= BOTTOM) {
      b.y = api.clamp(b.y, TOP, BOTTOM - BALL_SIZE)
      b.vy = -b.vy
      addSparks(api, b.x + 2, b.y + 2, 13)
      api.sfx('jump')
    }

    if (b.vx < 0 &&
        api.collide(b.x, b.y, BALL_SIZE, BALL_SIZE, PLAYER_X, g.py, PAD_W, PAD_H)) {
      bounce(api, g.py, 1)
    }
    if (b.vx > 0 &&
        api.collide(b.x, b.y, BALL_SIZE, BALL_SIZE, CPU_X, g.cy, PAD_W, PAD_H)) {
      bounce(api, g.cy, -1)
    }

    if (b.x < -BALL_SIZE) {
      g.cpuPoints++
      g.baseSpeed += 0.38
      g.hurt = 50
      api.sfx('hit')
      api.flash(8, 3)
      api.shake(10)
      if (g.cpuPoints >= 7 && api.t > 2) {
        api.sfx('die')
        api.gameOver()
        return
      }
      resetRound(api, false)
    } else if (b.x > api.W) {
      g.playerPoints++
      g.baseSpeed += 0.38
      api.addScore(1)
      api.sfx('coin')
      api.flash(10, 1)
      resetRound(api, true)
    }
  }

  for (const s of g.stars) {
    s.x -= s.speed + g.baseSpeed * 0.02
    if (s.x < 1) s.x = api.W - 2
  }
  for (const t of g.trail) t.life--
  g.trail = g.trail.filter((t) => t.life > 0)
  for (const p of g.sparks) {
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.92
    p.vy *= 0.92
    p.life--
  }
  g.sparks = g.sparks.filter((p) => p.life > 0)
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(1)

  api.rectfill(0, TOP, api.W, BOTTOM - TOP, 2)
  for (const s of g.stars) api.pset(s.x, s.y, s.color)
  api.rectfill(0, TOP, api.W, 2, 13)
  api.rectfill(0, BOTTOM - 2, api.W, 2, 13)

  for (let y = TOP + 5; y < BOTTOM - 4; y += 10) {
    api.rectfill(127, y, 2, 5, api.frame % 20 < 10 ? 6 : 5)
  }

  for (const t of g.trail) {
    const color = t.life > 5 ? 10 : t.life > 2 ? 9 : 4
    api.rectfill(t.x, t.y, BALL_SIZE, BALL_SIZE, color)
  }
  for (const p of g.sparks) api.pset(p.x, p.y, p.color)

  api.spr(PLAYER_PAD, PLAYER_X, g.py)
  api.spr(PLAYER_PAD, PLAYER_X, g.py + 8)
  api.spr(PLAYER_PAD, PLAYER_X, g.py + 16)
  api.spr(CPU_PAD, CPU_X, g.cy)
  api.spr(CPU_PAD, CPU_X, g.cy + 8)
  api.spr(CPU_PAD, CPU_X, g.cy + 16)

  if (!g.serving || api.frame % 10 < 5) api.spr(PULSE, g.ball.x, g.ball.y)

  api.text(`${g.playerPoints}`, 96, TOP + 6, 12, 2)
  api.text(`${g.cpuPoints}`, 146, TOP + 6, 8, 2)
  api.text(`SPD ${g.baseSpeed.toFixed(1)}`, 96, BOTTOM - 12, 10)

  if (g.serving && g.serveTimer > 18) {
    api.textCenter('A TO SERVE', 190, api.frame % 20 < 10 ? 7 : 10)
  }
}
