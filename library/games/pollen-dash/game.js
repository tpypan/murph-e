// TITLE: POLLEN DASH
// GENRE: dodge
// CONTROLS: arrows move, a darts
// Gather blooms quickly for combos while angry wasps multiply and chase.

const BEE = [
  '..7..7..',
  '.77..77.',
  '..aaaa..',
  '.a4444a.',
  'aa4aa4aa',
  '.a4444a.',
  '..a..a..',
  '.9....9.',
]
const WASP = [
  '.6....6.',
  '66.88.66',
  '..8998..',
  '.844448.',
  '88488488',
  '.844448.',
  '..8..8..',
  '.......5',
]
const BLOOM = [
  '..e.e...',
  '.eeaee..',
  '..aaa...',
  '.eaaae..',
  '..aaa...',
  '...b....',
  '..bbb...',
  '...3....',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const BEE_W = 8
const BEE_H = 8
const TOP = 14
const BOTTOM = 214

let g

function init(api) {
  g = {
    px: api.W / 2 - 4,
    py: 112,
    vx: 0,
    vy: 0,
    facing: 1,
    dart: 0,
    dartCooldown: 0,
    hurt: 0,
    lives: 3,
    blooms: [],
    wasps: [],
    motes: [],
    flowers: [],
    bloomTimer: 0.25,
    waspTimer: 3.7,
    combo: 0,
    comboTimer: 0,
  }
  for (let i = 0; i < 30; i++) {
    g.motes.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(TOP, BOTTOM - 1),
      speed: 0.08 + api.rnd(0.18),
    })
  }
  for (let i = 0; i < 12; i++) {
    g.flowers.push({
      x: api.rndi(3, api.W - 8),
      y: api.rndi(18, BOTTOM - 8),
      c: api.rnd() < 0.5 ? 13 : 14,
    })
  }
  api.score(0)
}

function spawnBloom(api) {
  if (g.blooms.length >= 4) return
  g.blooms.push({
    x: api.rndi(10, api.W - 18),
    y: api.rndi(TOP + 10, BOTTOM - 18),
    phase: api.rnd(6.28),
    dead: false,
  })
}

function spawnWasp(api) {
  const side = api.rndi(0, 3)
  let x
  let y
  if (side === 0) {
    x = -10
    y = api.rndi(TOP, BOTTOM - 8)
  } else if (side === 1) {
    x = api.W + 2
    y = api.rndi(TOP, BOTTOM - 8)
  } else if (side === 2) {
    x = api.rndi(0, api.W - 8)
    y = TOP - 10
  } else {
    x = api.rndi(0, api.W - 8)
    y = BOTTOM + 2
  }
  g.wasps.push({
    x: x,
    y: y,
    vx: 0,
    vy: 0,
    phase: api.rnd(6.28),
  })
}

function sting(api, w) {
  if (g.hurt > 0 || api.t <= 2) return
  g.lives--
  g.hurt = 90
  g.combo = 0
  g.comboTimer = 0
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)

  const dx = w.x - g.px
  const dy = w.y - g.py
  const d = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  w.x += dx / d * 30
  w.y += dy / d * 30

  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const ax = (api.btn('right') ? 1 : 0) - (api.btn('left') ? 1 : 0)
  const ay = (api.btn('down') ? 1 : 0) - (api.btn('up') ? 1 : 0)

  if (ax !== 0 || ay !== 0) {
    const length = Math.sqrt(ax * ax + ay * ay)
    g.vx += ax / length * 0.42
    g.vy += ay / length * 0.42
    if (ax !== 0) g.facing = ax
  }
  g.vx *= 0.82
  g.vy *= 0.82

  if (g.dartCooldown > 0) g.dartCooldown--
  if (api.btnp('a')) {
    let dx = ax
    let dy = ay
    if (dx === 0 && dy === 0) dx = g.facing
    const length = Math.sqrt(dx * dx + dy * dy)
    g.vx = dx / length * 6.5
    g.vy = dy / length * 6.5
    g.dart = 10
    g.dartCooldown = 12
    api.sfx('jump')
  }
  if (g.dart > 0) g.dart--

  g.px = api.clamp(g.px + g.vx, 2, api.W - BEE_W - 2)
  g.py = api.clamp(g.py + g.vy, TOP, BOTTOM - BEE_H)

  g.bloomTimer -= dt
  if (g.bloomTimer <= 0) {
    spawnBloom(api)
    g.bloomTimer = 1.3 + api.rnd(0.9)
  }

  g.waspTimer -= dt
  if (g.waspTimer <= 0) {
    spawnWasp(api)
    g.waspTimer = Math.max(0.38, 3.2 - api.t * 0.035)
  }

  for (const b of g.blooms) {
    if (!b.dead && api.collide(g.px + 1, g.py + 1, 6, 6, b.x, b.y, 8, 8)) {
      b.dead = true
      g.combo = g.comboTimer > 0 ? g.combo + 1 : 1
      g.comboTimer = 150
      api.addScore(10 * g.combo)
      api.sfx('coin')
      api.flash(10, 1)
      g.bloomTimer = Math.min(g.bloomTimer, 0.25)
    }
  }
  g.blooms = g.blooms.filter((b) => !b.dead)

  const chase = 0.014 + api.t * 0.00045
  const maxSpeed = 0.75 + api.t * 0.018
  for (const w of g.wasps) {
    const dx = g.px - w.x
    const dy = g.py - w.y
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    w.vx += dx / dist * chase
    w.vy += dy / dist * chase
    const speed = Math.sqrt(w.vx * w.vx + w.vy * w.vy)
    if (speed > maxSpeed) {
      w.vx = w.vx / speed * maxSpeed
      w.vy = w.vy / speed * maxSpeed
    }
    w.x += w.vx + Math.sin(api.t * 5 + w.phase) * 0.12
    w.y += w.vy
    if (api.collide(g.px + 1, g.py + 1, 6, 6, w.x + 1, w.y + 1, 6, 6)) {
      sting(api, w)
    }
  }
  g.wasps = g.wasps.filter((w) =>
    w.x > -50 && w.x < api.W + 50 && w.y > -50 && w.y < api.H + 50
  )

  if (g.comboTimer > 0) {
    g.comboTimer--
    if (g.comboTimer === 0) g.combo = 0
  }
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(3)

  for (let y = TOP; y < BOTTOM; y += 16) {
    api.line(0, y, api.W, y, y % 32 === 0 ? 11 : 3)
  }
  for (const f of g.flowers) {
    api.pset(f.x - 1, f.y, f.c)
    api.pset(f.x + 1, f.y, f.c)
    api.pset(f.x, f.y - 1, f.c)
    api.pset(f.x, f.y + 1, f.c)
    api.pset(f.x, f.y, 10)
  }
  for (const m of g.motes) {
    const y = TOP + ((m.y - TOP + api.frame * m.speed) % (BOTTOM - TOP))
    api.pset(m.x, y, m.x % 3 === 0 ? 10 : 7)
  }

  api.rectfill(0, BOTTOM, api.W, api.H - BOTTOM, 4)
  api.rectfill(0, BOTTOM, api.W, 2, 11)

  for (const b of g.blooms) {
    const bob = Math.sin(api.t * 3 + b.phase) * 2
    api.spr(BLOOM, b.x, b.y + bob)
  }
  for (const w of g.wasps) {
    api.spr(WASP, w.x, w.y, w.vx < 0)
  }

  if (g.dart > 0) {
    api.line(g.px + 4 - g.vx * 2, g.py + 4 - g.vy * 2, g.px + 4, g.py + 4, 10)
  }
  if (g.hurt <= 0 || api.frame % 6 < 3) {
    const bob = Math.sin(api.t * 8) * 1.2
    api.spr(BEE, g.px, g.py + bob, g.facing < 0)
  }

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
  if (g.combo > 1) api.text(`X${g.combo}`, 4, 14, 10)
}
