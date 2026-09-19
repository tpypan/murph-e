// TITLE: BIG BALL BREAK
// GENRE: breakout
// CONTROLS: left right a b
// Keep a giant ball alive, smash patterned walls, and clear rows for bonuses.

const BIG_BALL = [
  '..7777..',
  '.7aaaa7.',
  '7aa99aa7',
  '7a9999a7',
  '7a9999a7',
  '7aa99aa7',
  '.7aaaa7.',
  '..7777..',
]
const PADDLE = [
  '.777777.',
  '7cccccc7',
  'cccccccc',
  '.111111.',
]
const BRICK = [
  '777777777777',
  '799999999997',
  '799999999997',
  '744444444447',
  '444444444444',
  '444444444444',
]
const TOUGH_BRICK = [
  '666666666666',
  '6eeeeeeeeee6',
  '6ee777777ee6',
  '6eeeeeeeeee6',
  '555555555555',
  '555555555555',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const TOP = 14
const BALL_SIZE = 8
const BRICK_W = 16
const BRICK_H = 8
const COLS = 16
const PAD_H = 4
const PAD_Y = 207

let g

function init(api) {
  g = {
    px: 105,
    padBase: 46,
    wide: 0,
    ball: { x: 124, y: PAD_Y - BALL_SIZE, vx: 0, vy: 0 },
    stuck: true,
    launchTimer: 120,
    speed: 2.25,
    bricks: [],
    rows: 0,
    lives: 3,
    level: 1,
    sparks: [],
    stars: [],
  }
  for (let i = 0; i < 28; i++) {
    g.stars.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(TOP + 1, api.H - 1),
      s: api.rndi(1, 3),
    })
  }
  buildWall(api)
  api.score(0)
}

function buildWall(api) {
  g.bricks = []
  g.rows = Math.min(9, 3 + g.level)
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const gap = g.level > 1 && (c + r + g.level) % 7 === 0
      if (gap) continue
      const tough = g.level >= 2 && (c * 3 + r + g.level) % 5 === 0
      g.bricks.push({
        x: c * BRICK_W,
        y: 25 + r * BRICK_H,
        row: r,
        hp: tough ? 2 : 1,
        c: 8 + ((r + g.level) % 7),
        alive: true,
      })
    }
  }
}

function launch(api) {
  const angle = api.rnd(1.1) - 0.55
  g.ball.vx = Math.sin(angle) * g.speed
  g.ball.vy = -Math.cos(angle) * g.speed
  g.stuck = false
  api.sfx('shoot')
}

function burst(api, x, y, c) {
  for (let i = 0; i < 6; i++) {
    g.sparks.push({
      x,
      y,
      vx: api.rnd(2.8) - 1.4,
      vy: api.rnd(2.8) - 1.4,
      life: 16,
      c,
    })
  }
}

function resetBall() {
  g.stuck = true
  g.launchTimer = 75
  g.ball.vx = 0
  g.ball.vy = 0
}

function update(api, dt) {
  const padW = g.padBase + (g.wide > 0 ? 20 : 0)
  if (api.btn('left')) g.px -= 3.5
  if (api.btn('right')) g.px += 3.5
  g.px = api.clamp(g.px, 0, api.W - padW)

  if (api.btnp('b')) {
    g.wide = 90
    g.px = api.clamp(g.px - 10, 0, api.W - g.padBase - 20)
    api.sfx('powerup')
  }
  if (g.wide > 0) g.wide--

  for (const s of g.sparks) {
    s.x += s.vx
    s.y += s.vy
    s.vy += 0.05
    s.life--
  }
  g.sparks = g.sparks.filter((s) => s.life > 0)

  const b = g.ball
  if (g.stuck) {
    b.x = g.px + padW / 2 - BALL_SIZE / 2
    b.y = PAD_Y - BALL_SIZE
    g.launchTimer--
    if (api.btnp('a') || g.launchTimer <= 0) launch(api)
    return
  }

  if (api.btnp('a')) {
    const mag = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1
    b.vx += (b.vx / mag) * 0.3
    b.vy += (b.vy / mag) * 0.3
    burst(api, b.x + 4, b.y + 4, 10)
    api.sfx('shoot')
  }

  const ramp = 1 + api.t * 0.0012
  b.x += b.vx * ramp
  b.y += b.vy * ramp

  if (b.x <= 0 || b.x + BALL_SIZE >= api.W) {
    b.vx = -b.vx
    b.x = api.clamp(b.x, 0, api.W - BALL_SIZE)
    api.sfx('jump')
  }
  if (b.y <= TOP) {
    b.vy = Math.abs(b.vy)
    b.y = TOP
    api.sfx('jump')
  }

  if (b.vy > 0 && api.collide(b.x, b.y, BALL_SIZE, BALL_SIZE, g.px, PAD_Y, padW, PAD_H)) {
    const rel = (b.x + BALL_SIZE / 2 - (g.px + padW / 2)) / (padW / 2)
    g.speed += 0.06
    b.vx = rel * g.speed * 0.92
    b.vy = -Math.sqrt(Math.max(1.4, g.speed * g.speed - b.vx * b.vx))
    b.y = PAD_Y - BALL_SIZE
    burst(api, b.x + 4, PAD_Y, 12)
    api.sfx('jump')
  }

  for (const br of g.bricks) {
    if (!br.alive) continue
    if (api.collide(b.x, b.y, BALL_SIZE, BALL_SIZE, br.x, br.y, BRICK_W, BRICK_H)) {
      br.hp--
      const overlapX = Math.min(b.x + BALL_SIZE, br.x + BRICK_W) - Math.max(b.x, br.x)
      const overlapY = Math.min(b.y + BALL_SIZE, br.y + BRICK_H) - Math.max(b.y, br.y)
      if (overlapX < overlapY) b.vx = -b.vx
      else b.vy = -b.vy
      if (br.hp <= 0) {
        br.alive = false
        api.addScore(10 + g.level * 2)
        burst(api, br.x + 8, br.y + 4, br.c)
        api.sfx('explode')
        api.flash(10, 1)
        if (!g.bricks.some((q) => q.alive && q.row === br.row)) {
          api.addScore(50)
          api.sfx('coin')
        }
      } else {
        api.sfx('hit')
      }
      break
    }
  }

  if (!g.bricks.some((br) => br.alive)) {
    g.level++
    g.speed += 0.35
    api.addScore(150)
    api.sfx('powerup')
    api.flash(10, 1)
    buildWall(api)
    resetBall()
  }

  if (b.y > api.H) {
    g.lives--
    api.sfx('die')
    api.flash(8, 3)
    api.shake(10)
    if (g.lives <= 0 && api.t > 2) {
      api.gameOver()
      return
    }
    resetBall()
  }
}

function draw(api) {
  api.cls(2)
  api.rectfill(0, TOP, api.W, api.H - TOP, 1)
  for (const s of g.stars) {
    const y = TOP + ((s.y - TOP + api.frame * s.s * 0.08) % (api.H - TOP))
    api.pset(s.x, y, s.s === 3 ? 13 : 12)
  }
  api.rectfill(0, TOP, api.W, 2, 14)
  api.rectfill(0, PAD_Y + 10, api.W, api.H - PAD_Y - 10, 3)

  for (const br of g.bricks) {
    if (!br.alive) continue
    api.spr(br.hp > 1 ? TOUGH_BRICK : BRICK, br.x + 2, br.y + 1)
    api.rectfill(br.x + 1, br.y + 1, 1, BRICK_H - 2, br.c)
  }

  for (const s of g.sparks) api.rectfill(s.x, s.y, 2, 2, s.c)

  const padW = g.padBase + (g.wide > 0 ? 20 : 0)
  api.rectfill(g.px, PAD_Y, padW, PAD_H, 12)
  api.rectfill(g.px + 3, PAD_Y, padW - 6, 1, 7)
  api.spr(PADDLE, g.px - 4, PAD_Y)
  api.spr(PADDLE, g.px + padW - 4, PAD_Y, true)
  api.spr(BIG_BALL, g.ball.x, g.ball.y)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
  api.text(`LV ${g.level}`, 4, api.H - 8, 10)
  if (g.wide > 0) api.text('WIDE', 216, api.H - 8, 14)
}
