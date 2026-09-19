// TITLE: BIG BALL BREAK
// GENRE: breakout
// CONTROLS: left right a
// Keep an oversized ball in play and smash advancing walls.
// A launches or gives the paddle a short, visible speed boost.

const GIANT_BALL = [
  '...777...',
  '.77aaa77.',
  '.7afffa7.',
  '7af777fa7',
  '7af777fa7',
  '.7afffa7.',
  '.77aaa77.',
  '...777...',
]
const POWER_BRICK = [
  '6666666666',
  '6eeeeeeee5',
  '6e99999ee5',
  '6e99999ee5',
  '5eeeeeeee5',
  '5555555555',
]
const PADDLE = [
  '.7777777777777777777777.',
  '7cccccccccccccccccccccc7',
  '.1cccccccccccccccccccc1.',
  '..11111111111111111111..',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const PAD_W = 24
const PAD_H = 4
const PAD_Y = 207
const BALL_SIZE = 8
const BRICK_W = 16
const BRICK_H = 8
const COLS = 16
const CEILING = 14

let g

function init(api) {
  g = {
    px: 116,
    ball: { x: 124, y: PAD_Y - BALL_SIZE, vx: 0, vy: 0 },
    stuck: true,
    launchTimer: 210,
    speed: 2.15,
    bricks: [],
    lives: 3,
    level: 1,
    boost: 0,
    hurt: 0,
    sparks: [],
    stars: [],
  }
  for (let i = 0; i < 30; i++) {
    g.stars.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(CEILING, api.H - 15),
      c: api.rnd() < 0.25 ? 13 : 12,
    })
  }
  buildWall(api)
  api.score(0)
}

function buildWall(api) {
  g.bricks = []
  const rows = Math.min(9, 3 + Math.floor(g.level / 2))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const gapPattern = g.level > 2 && (c + r * 3 + g.level) % 11 === 0
      if (gapPattern) continue
      const tough = g.level > 1 && (c * 2 + r + g.level) % 6 === 0
      g.bricks.push({
        x: c * BRICK_W,
        y: 24 + r * BRICK_H,
        row: r,
        hp: tough ? 2 + Math.floor(g.level / 5) : 1,
        maxHp: tough ? 2 + Math.floor(g.level / 5) : 1,
        c: 8 + ((r + g.level) % 7),
        alive: true,
      })
    }
  }
}

function launch(api) {
  const angle = api.rnd(1.05) - 0.525
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
      vx: api.rnd(3) - 1.5,
      vy: api.rnd(3) - 1.8,
      life: 18,
      c,
    })
  }
}

function rowCleared(row) {
  for (const br of g.bricks) {
    if (br.row === row && br.alive) return false
  }
  return true
}

function loseBall(api) {
  g.lives--
  g.hurt = 45
  api.sfx('die')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.gameOver()
    return
  }
  g.stuck = true
  g.launchTimer = 70
  g.ball.vx = 0
  g.ball.vy = 0
}

function update(api, dt) {
  const move = g.boost > 0 ? 6 : 3.1
  if (api.btn('left')) g.px -= move
  if (api.btn('right')) g.px += move
  g.px = api.clamp(g.px, 0, api.W - PAD_W)

  if (api.btnp('a')) {
    if (g.stuck) {
      launch(api)
    } else {
      g.boost = 15
      burst(api, g.px + PAD_W / 2, PAD_Y, 10)
      api.sfx('powerup')
    }
  }
  if (g.boost > 0) g.boost--
  if (g.hurt > 0) g.hurt--

  for (const p of g.sparks) {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.08
    p.life--
  }
  g.sparks = g.sparks.filter((p) => p.life > 0)

  const b = g.ball
  if (g.stuck) {
    b.x = g.px + PAD_W / 2 - BALL_SIZE / 2
    b.y = PAD_Y - BALL_SIZE
    g.launchTimer--
    if (g.launchTimer <= 0) launch(api)
    return
  }

  const ramp = api.t * 0.0007
  const mag = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
  if (mag > 0) {
    b.vx *= (mag + ramp) / mag
    b.vy *= (mag + ramp) / mag
  }
  b.x += b.vx
  b.y += b.vy

  if (b.x <= 0 || b.x + BALL_SIZE >= api.W) {
    b.vx = -b.vx
    b.x = api.clamp(b.x, 0, api.W - BALL_SIZE)
    api.sfx('jump')
  }
  if (b.y <= CEILING) {
    b.vy = Math.abs(b.vy)
    b.y = CEILING
    api.sfx('jump')
  }

  if (b.vy > 0 && api.collide(b.x, b.y, BALL_SIZE, BALL_SIZE, g.px, PAD_Y, PAD_W, PAD_H)) {
    const rel = (b.x + BALL_SIZE / 2 - (g.px + PAD_W / 2)) / (PAD_W / 2)
    g.speed += 0.045 + api.t * 0.00015
    b.vx = rel * g.speed * 0.9
    b.vy = -Math.sqrt(Math.max(1.2, g.speed * g.speed - b.vx * b.vx))
    b.y = PAD_Y - BALL_SIZE
    burst(api, b.x + 4, PAD_Y, 12)
    api.sfx('jump')
  }

  for (const br of g.bricks) {
    if (!br.alive) continue
    if (api.collide(b.x, b.y, BALL_SIZE, BALL_SIZE, br.x, br.y, BRICK_W, BRICK_H)) {
      const oldRow = br.row
      br.hp--
      b.vy = -b.vy
      burst(api, b.x + 4, b.y + 4, br.c)
      if (br.hp <= 0) {
        br.alive = false
        api.addScore(10 * br.maxHp)
        api.sfx('explode')
        api.flash(10, 1)
        if (rowCleared(oldRow)) {
          api.addScore(75)
          api.sfx('coin')
        }
      } else {
        api.addScore(2)
        api.sfx('hit')
      }
      break
    }
  }

  if (!g.bricks.some((br) => br.alive)) {
    g.level++
    g.speed += 0.4
    api.addScore(150)
    api.sfx('powerup')
    buildWall(api)
    g.stuck = true
    g.launchTimer = 50
  }

  if (b.y > api.H && api.t > 2) loseBall(api)
}

function draw(api) {
  api.cls(2)
  api.rectfill(0, 12, api.W, api.H - 12, 1)
  for (const s of g.stars) {
    const y = 13 + ((s.y - 13 + api.frame * 0.18) % (api.H - 25))
    api.pset(s.x, y, (api.frame + s.x) % 24 < 3 ? 7 : s.c)
  }
  api.rectfill(0, CEILING, api.W, 2, 13)
  api.rectfill(0, api.H - 9, api.W, 9, 3)
  api.rectfill(0, api.H - 9, api.W, 2, 11)

  for (const br of g.bricks) {
    if (!br.alive) continue
    if (br.maxHp > 1) {
      api.spr(POWER_BRICK, br.x + 3, br.y + 1)
      api.rectfill(br.x, br.y + 2, 3, 4, br.c)
      api.rectfill(br.x + 13, br.y + 2, 3, 4, br.c)
    } else {
      api.rectfill(br.x + 1, br.y + 1, BRICK_W - 2, BRICK_H - 2, br.c)
      api.rectfill(br.x + 2, br.y + 1, BRICK_W - 4, 1, 7)
      api.rectfill(br.x + 1, br.y + 6, BRICK_W - 2, 1, 4)
    }
    if (br.hp < br.maxHp) api.line(br.x + 4, br.y + 1, br.x + 9, br.y + 6, 0)
  }

  for (const p of g.sparks) api.rectfill(p.x, p.y, 2, 2, p.c)
  if (g.hurt <= 0 || api.frame % 6 < 3) {
    api.spr(PADDLE, g.px, PAD_Y)
    if (g.boost > 0) {
      api.line(g.px - 8, PAD_Y + 2, g.px - 2, PAD_Y + 2, 10)
      api.line(g.px + PAD_W + 2, PAD_Y + 2, g.px + PAD_W + 8, PAD_Y + 2, 10)
    }
  }
  api.spr(GIANT_BALL, g.ball.x, g.ball.y)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
  api.text(`WALL ${g.level}`, 4, api.H - 8, 7)
}
