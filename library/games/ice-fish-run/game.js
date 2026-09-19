// TITLE: ICE FISH RUN
// GENRE: DODGE
// CONTROLS: D-PAD STEER, A HOP
// Slide across a frozen pond, chain fish pickups, and avoid hungry seals.

const PENGUIN = [
  '..5555..',
  '.500005.',
  '50077005',
  '50099005',
  '.500005.',
  '55555555',
  '.5ffff5.',
  '.99..99.',
]
const SEAL = [
  '..6666..',
  '.655556.',
  '65577556',
  '66699666',
  '.666666.',
  '66666666',
  '6.6..6.6',
  '.5....5.',
]
const FISH = [
  '........',
  '......cc',
  '..cccc.c',
  '.c77cccc',
  '..cccc.c',
  '......cc',
  '........',
  '........',
]
const HEART = [
  '.8.8.',
  '88888',
  '88888',
  '.888.',
  '..8..',
]
const SHADOW = [
  '........',
  '........',
  '........',
  '........',
  '........',
  '..5555..',
  '.555555.',
  '..5555..',
]

const ARENA_TOP = 18
const ARENA_BOTTOM = 216
const ACTOR_SIZE = 8

let g

function init(api) {
  g = {
    px: 124,
    py: 108,
    vx: 1.15,
    vy: 0.35,
    facing: 1,
    hop: 0,
    hurt: 0,
    lives: 3,
    streak: 0,
    streakTime: 0,
    fish: [],
    seals: [],
    cracks: [],
    sparkles: [],
    fishTimer: 0,
    sealTimer: 3.7,
  }

  for (let i = 0; i < 22; i++) {
    g.sparkles.push({
      x: api.rndi(4, api.W - 5),
      y: api.rndi(ARENA_TOP, ARENA_BOTTOM),
      phase: api.rndi(0, 59),
    })
  }

  for (let i = 0; i < 12; i++) {
    g.cracks.push({
      x: api.rndi(10, api.W - 11),
      y: api.rndi(ARENA_TOP + 8, ARENA_BOTTOM - 8),
      size: api.rndi(3, 8),
      phase: api.rndi(0, 99),
    })
  }

  spawnFish(api)
  api.score(0)
}

function spawnFish(api) {
  let x = api.rndi(12, api.W - 20)
  let y = api.rndi(ARENA_TOP + 12, ARENA_BOTTOM - 16)

  if (api.dist(x, y, g.px, g.py) > 115) {
    x = api.clamp(g.px + api.rndi(-90, 90), 12, api.W - 20)
    y = api.clamp(g.py + api.rndi(-70, 70), ARENA_TOP + 12, ARENA_BOTTOM - 16)
  }

  g.fish.push({
    x: x,
    y: y,
    phase: api.rnd(6.28),
    dead: false,
  })
}

function spawnSeal(api) {
  const edge = api.rndi(0, 3)
  let x
  let y
  let vx
  let vy

  if (edge === 0) {
    x = -10
    y = api.rndi(ARENA_TOP + 8, ARENA_BOTTOM - 12)
    vx = 1
    vy = 0
  } else if (edge === 1) {
    x = api.W + 2
    y = api.rndi(ARENA_TOP + 8, ARENA_BOTTOM - 12)
    vx = -1
    vy = 0
  } else if (edge === 2) {
    x = api.rndi(8, api.W - 16)
    y = ARENA_TOP - 10
    vx = 0
    vy = 1
  } else {
    x = api.rndi(8, api.W - 16)
    y = api.H + 2
    vx = 0
    vy = -1
  }

  const dx = g.px - x
  const dy = g.py - y
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  const speed = 0.75 + api.t * 0.012 + api.getScore() * 0.0015

  g.seals.push({
    x: x,
    y: y,
    vx: dx / length * speed + vx * 0.35,
    vy: dy / length * speed + vy * 0.35,
    wave: api.rnd(6.28),
    dead: false,
  })
}

function hurtPenguin(api, seal) {
  seal.dead = true
  g.lives--
  g.hurt = 90
  g.streak = 0
  g.streakTime = 0
  g.vx = -seal.vx * 2.2
  g.vy = -seal.vy * 2.2
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)

  if (g.lives <= 0 && api.t > 2) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const steer = 0.085
  if (api.btn('left')) {
    g.vx -= steer
    g.facing = -1
  }
  if (api.btn('right')) {
    g.vx += steer
    g.facing = 1
  }
  if (api.btn('up')) g.vy -= steer
  if (api.btn('down')) g.vy += steer

  if (api.btnp('a')) {
    g.hop = 38
    g.vx *= 1.18
    g.vy *= 1.18
    api.sfx('jump')
  }

  const maxSpeed = 3.25
  const speed = Math.sqrt(g.vx * g.vx + g.vy * g.vy)
  if (speed > maxSpeed) {
    g.vx = g.vx / speed * maxSpeed
    g.vy = g.vy / speed * maxSpeed
  }

  g.vx *= 0.994
  g.vy *= 0.994
  g.px += g.vx
  g.py += g.vy

  if (g.px < 3) {
    g.px = 3
    g.vx = Math.abs(g.vx) * 0.8
    api.sfx('select')
  }
  if (g.px > api.W - 11) {
    g.px = api.W - 11
    g.vx = -Math.abs(g.vx) * 0.8
    api.sfx('select')
  }
  if (g.py < ARENA_TOP) {
    g.py = ARENA_TOP
    g.vy = Math.abs(g.vy) * 0.8
    api.sfx('select')
  }
  if (g.py > ARENA_BOTTOM - 8) {
    g.py = ARENA_BOTTOM - 8
    g.vy = -Math.abs(g.vy) * 0.8
    api.sfx('select')
  }

  if (g.hop > 0) g.hop--
  if (g.hurt > 0) g.hurt--
  if (g.streakTime > 0) g.streakTime--
  else g.streak = 0

  g.fishTimer -= dt
  if (g.fishTimer <= 0 && g.fish.length < 3) {
    spawnFish(api)
    g.fishTimer = 1.6
  }

  g.sealTimer -= dt
  if (g.sealTimer <= 0) {
    spawnSeal(api)
    g.sealTimer = Math.max(0.38, 2.6 - api.t * 0.025 - api.getScore() * 0.003)
  }

  for (const fish of g.fish) {
    if (fish.dead) continue
    if (api.collide(g.px, g.py, 8, 8, fish.x, fish.y, 8, 7)) {
      fish.dead = true
      g.streak++
      g.streakTime = 180
      api.addScore(10 + Math.min(50, (g.streak - 1) * 5))
      api.sfx('coin')
      api.flash(10, 1)
      g.fishTimer = Math.min(g.fishTimer, 0.25)
    }
  }

  for (const seal of g.seals) {
    seal.x += seal.vx
    seal.y += seal.vy
    seal.wave += 0.08

    if (
      !seal.dead &&
      g.hop <= 8 &&
      g.hurt <= 0 &&
      api.collide(g.px + 1, g.py + 1, 6, 6, seal.x + 1, seal.y + 1, 6, 6)
    ) {
      hurtPenguin(api, seal)
    }
  }

  g.fish = g.fish.filter((fish) => !fish.dead)
  g.seals = g.seals.filter((seal) =>
    !seal.dead &&
    seal.x > -24 &&
    seal.x < api.W + 24 &&
    seal.y > -24 &&
    seal.y < api.H + 24
  )
}

function draw(api) {
  api.cls(12)
  api.rectfill(0, 12, api.W, api.H - 12, 6)
  api.rectfill(4, ARENA_TOP - 4, api.W - 8, ARENA_BOTTOM - ARENA_TOP + 8, 13)
  api.rectfill(7, ARENA_TOP - 1, api.W - 14, ARENA_BOTTOM - ARENA_TOP + 2, 7)
  api.rect(4, ARENA_TOP - 4, api.W - 8, ARENA_BOTTOM - ARENA_TOP + 8, 1)

  for (const s of g.sparkles) {
    const twinkle = (api.frame + s.phase) % 60
    api.pset(s.x, s.y, twinkle < 8 ? 7 : 12)
  }

  for (const c of g.cracks) {
    const drift = (api.frame + c.phase) % 180 < 4 ? 13 : 12
    api.line(c.x - c.size, c.y, c.x, c.y + 2, drift)
    api.line(c.x, c.y + 2, c.x + c.size, c.y - 2, drift)
    api.line(c.x, c.y + 2, c.x - 2, c.y + c.size, drift)
  }

  for (const fish of g.fish) {
    const bob = Math.sin(api.t * 4 + fish.phase) * 2
    api.spr(FISH, fish.x, fish.y + bob, api.frame % 80 > 40)
  }

  for (const seal of g.seals) {
    const bob = Math.sin(seal.wave) * 2
    api.spr(SEAL, seal.x, seal.y + bob, seal.vx < 0)
  }

  const lift = g.hop > 0 ? Math.sin((38 - g.hop) / 38 * Math.PI) * 11 : 0
  api.spr(SHADOW, g.px, g.py + 2)
  if (g.hurt <= 0 || api.frame % 6 < 3) {
    api.spr(PENGUIN, g.px, g.py - lift, g.facing < 0)
  }

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 13)
  if (g.streak > 1) api.text('X' + g.streak, 7, 15, 9)
}
