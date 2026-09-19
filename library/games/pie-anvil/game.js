// TITLE: PIE ANVIL
// GENRE: dodge
// CONTROLS: left right a
// Catch pies for 10 points, dodge anvils, and dash with A.

const BAKER = [
  '..ffff..',
  '.ffffff.',
  '..f77f..',
  '.ff44ff.',
  '..9999..',
  '.977779.',
  '..9..9..',
  '.44..44.',
]
const ANVIL = [
  '66666666',
  '.677776.',
  '..6666..',
  '...66...',
  '..6666..',
  '.555555.',
  '55555555',
  '.555555.',
]
const PIE = [
  '...8....',
  '..888...',
  '.999999.',
  '9aaaaaa9',
  '94444449',
  '.444444.',
  '..4444..',
  '........',
]
const CLOUD = [
  '...77...',
  '.777777.',
  '77777777',
  '.777777.',
  '........',
  '........',
]
const DASH_PUFF = [
  '..6...',
  '.677..',
  '6776..',
  '.66...',
  '..6...',
  '......',
]

const GROUND_Y = 210
const BAKER_W = 8
const BAKER_H = 8

let g

function init(api) {
  g = {
    px: api.W / 2 - 4,
    vx: 0,
    facing: 1,
    dash: 0,
    dashCooldown: 0,
    items: [],
    clouds: [],
    crumbs: [],
    spawnTimer: 0.4,
    awningOffset: 0,
    ended: false,
  }

  for (let i = 0; i < 8; i++) {
    g.clouds.push({
      x: api.rndi(0, api.W - 8),
      y: api.rndi(20, 125),
      speed: 0.08 + api.rnd(0.15),
    })
  }

  // Early pies make scoring possible quickly; the first anvils arrive later.
  g.items.push({ x: 124, y: 35, vy: 1.05, kind: 'pie', dead: false })
  g.items.push({ x: 52, y: -130, vy: 1.25, kind: 'anvil', dead: false })
  api.score(0)
}

function spawnItem(api) {
  const pieChance = Math.max(0.22, 0.42 - api.t * 0.0015)
  const kind = api.rnd() < pieChance ? 'pie' : 'anvil'
  const base = kind === 'pie' ? 1.25 : 1.5

  g.items.push({
    x: api.rndi(3, api.W - 11),
    y: -8,
    vy: base + api.t * 0.025 + api.rnd(0.7),
    kind,
    dead: false,
  })
}

function makeCrumbs(api, x, y, colour) {
  for (let i = 0; i < 7; i++) {
    g.crumbs.push({
      x: x + 4,
      y: y + 4,
      vx: api.rnd(2.4) - 1.2,
      vy: -api.rnd(2.2),
      life: api.rndi(14, 28),
      colour,
    })
  }
}

function update(api, dt) {
  if (g.ended) return

  g.awningOffset = (g.awningOffset + 0.25) % 16

  for (const cloud of g.clouds) {
    cloud.x += cloud.speed
    if (cloud.x > api.W) {
      cloud.x = -8
      cloud.y = api.rndi(20, 125)
    }
  }

  if (api.btn('left')) {
    g.vx -= 0.55
    g.facing = -1
  }
  if (api.btn('right')) {
    g.vx += 0.55
    g.facing = 1
  }

  if (api.btnp('a')) {
    g.dash = 10
    g.dashCooldown = 16
    g.vx = g.facing * 5.8
    makeCrumbs(api, g.px - g.facing * 3, GROUND_Y - 5, 6)
    api.sfx('jump')
  }

  if (g.dash > 0) {
    g.dash--
    g.vx = g.facing * 5.8
  } else {
    g.vx *= 0.78
  }
  if (g.dashCooldown > 0) g.dashCooldown--

  g.px += g.vx
  if (g.px < 0) {
    g.px = 0
    g.vx = 0
  }
  if (g.px > api.W - BAKER_W) {
    g.px = api.W - BAKER_W
    g.vx = 0
  }

  g.spawnTimer -= dt
  if (g.spawnTimer <= 0) {
    spawnItem(api)
    // Frequency ramps forever, approaching a very dense rain.
    g.spawnTimer = Math.max(0.09, 0.72 / (1 + api.t * 0.018))
  }

  for (const item of g.items) {
    item.y += item.vy

    if (
      !item.dead &&
      api.collide(
        g.px + 1,
        GROUND_Y - BAKER_H + 1,
        6,
        7,
        item.x + 1,
        item.y + 1,
        6,
        6
      )
    ) {
      item.dead = true

      if (item.kind === 'pie') {
        api.addScore(10)
        makeCrumbs(api, item.x, item.y, 10)
        api.sfx('coin')
        api.flash(10, 1)
      } else if (api.t > 2) {
        makeCrumbs(api, item.x, item.y, 5)
        api.sfx('hit')
        api.flash(8, 3)
        api.shake(10)
        api.sfx('die')
        g.ended = true
        api.gameOver()
      }
    }
  }

  for (const crumb of g.crumbs) {
    crumb.x += crumb.vx
    crumb.y += crumb.vy
    crumb.vy += 0.12
    crumb.life--
  }

  g.items = g.items.filter((item) => !item.dead && item.y < api.H + 10)
  g.crumbs = g.crumbs.filter((crumb) => crumb.life > 0)
}

function draw(api) {
  api.cls(12)

  // Sky bands and drifting clouds.
  api.rectfill(0, 12, api.W, 42, 1)
  api.rectfill(0, 54, api.W, 92, 12)
  api.rectfill(0, 146, api.W, 64, 13)
  api.circfill(220, 37, 12, 10)
  api.circfill(220, 37, 8, 9)

  for (const cloud of g.clouds) {
    api.spr(CLOUD, cloud.x, cloud.y)
  }

  // Bakery skyline.
  api.rectfill(0, 166, 38, 44, 4)
  api.rectfill(43, 178, 52, 32, 5)
  api.rectfill(101, 158, 39, 52, 3)
  api.rectfill(148, 173, 47, 37, 4)
  api.rectfill(201, 151, 55, 59, 5)

  for (let x = -16; x < api.W + 16; x += 16) {
    const stripe = ((x + g.awningOffset) / 16) & 1
    api.rectfill(x + g.awningOffset, 184, 8, 10, stripe ? 7 : 8)
    api.rectfill(x + 8 + g.awningOffset, 184, 8, 10, stripe ? 8 : 7)
  }

  api.rectfill(0, 194, api.W, 16, 4)
  api.rectfill(0, 194, api.W, 2, 14)
  api.rectfill(0, GROUND_Y, api.W, api.H - GROUND_Y, 5)
  api.rectfill(0, GROUND_Y, api.W, 2, 6)

  for (let x = 0; x < api.W; x += 16) {
    api.line(x, 216, x + 8, 210, 4)
  }

  for (const item of g.items) {
    api.spr(item.kind === 'pie' ? PIE : ANVIL, item.x, item.y)
  }

  for (const crumb of g.crumbs) {
    api.pset(crumb.x, crumb.y, crumb.colour)
  }

  if (g.dash > 0) {
    const puffX = g.facing > 0 ? g.px - 7 : g.px + 9
    api.spr(DASH_PUFF, puffX, GROUND_Y - 7, g.facing < 0)
    api.line(
      g.px - g.facing * 2,
      GROUND_Y - 5,
      g.px - g.facing * 10,
      GROUND_Y - 5,
      7
    )
  }

  api.spr(
    BAKER,
    g.px,
    GROUND_Y - BAKER_H + Math.floor(Math.sin(api.t * 7) * 0.8),
    g.facing < 0
  )
}
