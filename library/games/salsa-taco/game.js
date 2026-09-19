// TITLE: SALSA TACO
// GENRE: dodge
// CONTROLS: left right a
// Catch salsa, build streaks, and dodge fiery peppers.
// A dashes the taco in its facing direction.

const TACO = [
  '..aaaaaa..',
  '.aa9999aa.',
  'aa9b8b99aa',
  'a99b3b899a',
  '.a999999a.',
  '..aaaaaa..',
  '...4..4...',
  '..44..44..',
]
const SALSA = [
  '..7777..',
  '.666666.',
  '..8888..',
  '.8b8b88.',
  '.888888.',
  '.8b8888.',
  '..4444..',
  '...44...',
]
const PEPPER = [
  '...33...',
  '..3b3...',
  '...8....',
  '..888...',
  '.88888..',
  '8888888.',
  '.88888..',
  '..888...',
]
const HEART = [
  '.8.8.',
  '88888',
  '88888',
  '.888.',
  '..8..',
]
const SPARK = [
  '..a...',
  '.aaa..',
  'aaaaaa',
  '.aaa..',
  '..a...',
  '......',
]

const TACO_W = 10
const TACO_H = 8
const FLOOR_Y = 211

let g

function init(api) {
  g = {
    px: api.W / 2 - TACO_W / 2,
    py: FLOOR_Y - TACO_H,
    vx: 0,
    facing: 1,
    items: [],
    sparks: [],
    lives: 3,
    streak: 0,
    flavor: 0,
    hurt: 0,
    dash: 0,
    dashWait: 0,
    spawnTimer: 0.45,
    tiles: [],
    steam: [],
  }

  for (let i = 0; i < 16; i++) {
    g.tiles.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(18, 145),
      c: api.rnd() < 0.5 ? 14 : 10,
    })
  }
  for (let i = 0; i < 7; i++) {
    g.steam.push({
      x: api.rndi(5, api.W - 5),
      y: api.rndi(150, 205),
      speed: api.rnd(0.25) + 0.15,
    })
  }
  api.score(0)
}

function spawnItem(api) {
  const dangerChance = Math.min(0.58, 0.25 + api.t * 0.004)
  const pepper = api.rnd() < dangerChance
  const speed = (pepper ? 1.25 : 1.05) + api.t * 0.025 + api.rnd(0.65)

  g.items.push({
    x: api.rndi(4, api.W - 12),
    y: -8,
    vy: speed,
    sway: api.rnd(6.28),
    kind: pepper ? 'pepper' : 'salsa',
    dead: false,
  })
}

function addSparks(api, x, y, color) {
  for (let i = 0; i < 6; i++) {
    g.sparks.push({
      x,
      y,
      vx: api.rnd(3) - 1.5,
      vy: -api.rnd(2.4) - 0.4,
      life: 18 + api.rndi(0, 10),
      color,
    })
  }
}

function catchSalsa(api, item) {
  item.dead = true
  g.streak++
  g.flavor = Math.min(10, g.flavor + 1)
  const bonus = 10 + Math.min(40, (g.streak - 1) * 2)
  api.addScore(bonus)
  api.sfx('coin')
  api.flash(10, 1)
  addSparks(api, item.x + 4, g.py, 10)

  if (g.flavor >= 10) {
    g.flavor = 0
    api.addScore(100)
    api.sfx('powerup')
    addSparks(api, g.px + 5, g.py, 14)
  }
}

function hitPepper(api, item) {
  item.dead = true
  if (g.hurt > 0) return

  g.lives--
  g.streak = 0
  g.flavor = Math.max(0, g.flavor - 3)
  g.hurt = 75
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  addSparks(api, g.px + 5, g.py, 8)

  if (g.lives <= 0 && api.t > 2) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const movingLeft = api.btn('left')
  const movingRight = api.btn('right')

  if (movingLeft) {
    g.vx -= 0.55
    g.facing = -1
  }
  if (movingRight) {
    g.vx += 0.55
    g.facing = 1
  }

  if (api.btnp('a')) {
    g.dash = 9
    g.dashWait = 20
    g.vx = g.facing * 5.8
    api.sfx('jump')
    addSparks(api, g.px + (g.facing < 0 ? 10 : 0), g.py + 5, 10)
  }

  if (g.dash > 0) {
    g.vx = g.facing * 5.8
    g.dash--
  } else {
    g.vx *= 0.78
  }
  if (g.dashWait > 0) g.dashWait--

  g.px = api.clamp(g.px + g.vx, 2, api.W - TACO_W - 2)

  g.spawnTimer -= dt
  if (g.spawnTimer <= 0) {
    spawnItem(api)
    const tightening = Math.min(0.48, api.t * 0.006)
    g.spawnTimer = Math.max(0.18, 0.72 - tightening + api.rnd(0.18))
  }

  for (const item of g.items) {
    item.y += item.vy
    item.x += Math.sin(api.t * 3 + item.sway) * 0.18
    if (item.dead) continue

    if (api.collide(
      g.px + 1, g.py + 1, TACO_W - 2, TACO_H - 1,
      item.x + 1, item.y + 1, 6, 6
    )) {
      if (item.kind === 'salsa') catchSalsa(api, item)
      else hitPepper(api, item)
    }

    if (item.y > api.H && item.kind === 'salsa') g.streak = 0
  }

  g.items = g.items.filter((item) => !item.dead && item.y < api.H + 10)

  for (const spark of g.sparks) {
    spark.x += spark.vx
    spark.y += spark.vy
    spark.vy += 0.13
    spark.life--
  }
  g.sparks = g.sparks.filter((spark) => spark.life > 0)

  for (const steam of g.steam) {
    steam.y -= steam.speed + api.t * 0.001
    if (steam.y < 14) {
      steam.y = 205
      steam.x = api.rndi(5, api.W - 5)
    }
  }

  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(4)

  api.rectfill(0, 12, api.W, 143, 14)
  for (let y = 20; y < 155; y += 16) {
    api.line(0, y, api.W, y, 15)
  }
  for (let x = 0; x < api.W; x += 32) {
    api.line(x, 12, x, 155, 15)
  }
  for (const tile of g.tiles) api.pset(tile.x, tile.y, tile.c)

  api.rectfill(0, 155, api.W, 5, 5)
  api.rectfill(0, 160, api.W, 52, 6)
  for (let x = 0; x < api.W; x += 24) {
    api.line(x, 160, x + 10, 211, 7)
  }
  api.rectfill(0, FLOOR_Y, api.W, api.H - FLOOR_Y, 3)
  api.rectfill(0, FLOOR_Y, api.W, 2, 11)

  for (const steam of g.steam) {
    api.pset(steam.x, steam.y, 7)
    api.pset(steam.x + 1, steam.y - 3, 15)
  }

  for (const item of g.items) {
    api.spr(item.kind === 'salsa' ? SALSA : PEPPER, item.x, item.y)
  }

  for (const spark of g.sparks) {
    if (spark.life > 12) api.pset(spark.x, spark.y, spark.color)
    else api.spr(SPARK, spark.x - 3, spark.y - 3)
  }

  if (g.dash > 0) {
    const trailX = g.px - g.facing * 9
    api.spr(TACO, trailX, g.py, g.facing < 0)
  }

  const bob = Math.sin(api.t * 7) * 1
  if (g.hurt <= 0 || api.frame % 6 < 3) {
    api.spr(TACO, g.px, g.py + bob, g.facing < 0)
  }

  api.rect(87, 14, 82, 7, 5)
  api.rectfill(89, 16, g.flavor * 7.8, 3, g.flavor >= 7 ? 10 : 8)

  for (let i = 0; i < g.lives; i++) {
    api.spr(HEART, 4 + i * 7, 15)
  }

  if (g.streak >= 2) {
    api.text(`X${g.streak}`, 222, 15, 10)
  }
}
