// TITLE: PIE ANVIL DASH
// GENRE: dodge
// CONTROLS: left right a
// Catch pies, dodge anvils, and dash across the bakery floor.

const BAKER = [
  '..ffff..',
  '.ffffff.',
  '..f77f..',
  '.f7171f.',
  '..ffff..',
  '.888888.',
  '8.7777.8',
  '..4..4..',
]
const ANVIL = [
  '55555555',
  '.566665.',
  '..6666..',
  '...66...',
  '..6666..',
  '.655556.',
  '55555555',
  '.555555.',
]
const PIE = [
  '...8....',
  '..888...',
  '.999999.',
  '9aaa9aa9',
  '94444449',
  '.444444.',
  '..4444..',
  '........',
]
const GOLD_PIE = [
  '...a....',
  '..aaaa..',
  '.aaaaaa.',
  'a7aa7aaa',
  'a999999a',
  '.999999.',
  '..9999..',
  '........',
]
const PUFF = [
  '..6...',
  '.677..',
  '67776.',
  '.666..',
  '......',
  '......',
]
const DASH_SPARK = [
  '...a..',
  'a.aaa.',
  '.aaa.a',
  'a.aaa.',
  '...a..',
  '......',
]

const FLOOR_Y = 207
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
    crumbs: [],
    spawnTimer: 0.35,
    awning: [],
    tiles: [],
  }
  for (let i = 0; i < 14; i++) {
    g.awning.push({
      x: i * 20 + api.rndi(-4, 4),
      y: api.rndi(24, 65),
      phase: api.rnd(6.28),
    })
  }
  for (let i = 0; i < 20; i++) {
    g.tiles.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(FLOOR_Y + 3, api.H - 1),
    })
  }
  api.score(0)
}

function spawnItem(api) {
  let kind = 'anvil'
  const roll = api.rnd()
  const pieChance = Math.min(0.48, 0.35 + api.t * 0.0015)
  if (roll < 0.055) kind = 'gold'
  else if (roll < pieChance) kind = 'pie'

  const early = api.t < 3.1
  if (early) kind = roll < 0.72 ? 'pie' : 'gold'

  let speed = 1.15 + api.t * 0.025 + api.rnd(0.7)
  if (kind === 'anvil') speed += 0.45 + api.t * 0.008

  g.items.push({
    x: api.rndi(5, api.W - 13),
    y: early ? 48 : -8,
    vy: speed,
    kind,
    wobble: api.rnd(6.28),
    dead: false,
  })
}

function burst(api, x, y, colour) {
  for (let i = 0; i < 7; i++) {
    g.crumbs.push({
      x,
      y,
      vx: api.rnd(2.8) - 1.4,
      vy: api.rnd(2.2) - 2.5,
      life: api.rndi(15, 26),
      colour,
    })
  }
}

function catchPie(api, item) {
  item.dead = true
  const golden = item.kind === 'gold'
  api.addScore(golden ? 100 : 25)
  api.sfx(golden ? 'powerup' : 'coin')
  api.flash(10, 1)
  burst(api, item.x + 4, item.y + 4, golden ? 10 : 9)
}

function update(api, dt) {
  let direction = 0
  if (api.btn('left')) {
    direction--
    g.facing = -1
  }
  if (api.btn('right')) {
    direction++
    g.facing = 1
  }

  if (direction !== 0) g.vx += direction * 0.48
  else g.vx *= 0.76
  g.vx = api.clamp(g.vx, -3.1, 3.1)

  if (g.dashCooldown > 0) g.dashCooldown--
  if (api.btnp('a')) {
    let dashDirection = direction || g.facing
    g.facing = dashDirection
    g.dash = 11
    g.dashCooldown = 18
    g.vx = dashDirection * 7.2
    api.sfx('jump')
    burst(api, g.px + 4, FLOOR_Y - 2, 10)
  }

  if (g.dash > 0) {
    g.dash--
    if (api.frame % 2 === 0) {
      g.crumbs.push({
        x: g.px + (g.facing < 0 ? 8 : 0),
        y: FLOOR_Y - 6,
        vx: -g.facing * 0.5,
        vy: 0,
        life: 9,
        colour: 10,
      })
    }
  }
  g.px = api.clamp(g.px + g.vx, 2, api.W - BAKER_W - 2)

  g.spawnTimer -= dt
  if (g.spawnTimer <= 0) {
    spawnItem(api)
    const density = 0.78 / (1 + api.t * 0.018)
    g.spawnTimer = Math.max(0.11, density + api.rnd(0.22))
  }

  for (const item of g.items) {
    item.y += item.vy
    if (item.kind !== 'anvil') {
      item.x += Math.sin(api.t * 4 + item.wobble) * 0.22
    }
    if (
      !item.dead &&
      api.collide(g.px + 1, FLOOR_Y - BAKER_H + 1, 6, 7,
        item.x + 1, item.y + 1, 6, 6)
    ) {
      if (item.kind === 'anvil') {
        item.dead = true
        api.sfx('hit')
        api.flash(8, 3)
        api.shake(10)
        api.sfx('die')
        api.gameOver()
      } else {
        catchPie(api, item)
      }
    }
  }

  for (const p of g.crumbs) {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.13
    p.life--
  }

  g.items = g.items.filter((item) => !item.dead && item.y < api.H + 10)
  g.crumbs = g.crumbs.filter((p) => p.life > 0)
}

function draw(api) {
  api.cls(13)

  api.rectfill(0, 12, api.W, 15, 14)
  for (let x = 0; x < api.W; x += 24) {
    api.rectfill(x, 12, 12, 15, 7)
    api.rectfill(x + 12, 12, 12, 15, 8)
  }

  api.rectfill(0, 27, api.W, FLOOR_Y - 27, 15)
  api.rectfill(5, 32, 44, 78, 4)
  api.rectfill(9, 36, 36, 70, 10)
  api.rectfill(13, 40, 28, 62, 9)
  api.rectfill(207, 32, 44, 78, 4)
  api.rectfill(211, 36, 36, 70, 12)
  api.rectfill(215, 40, 28, 62, 7)

  for (const d of g.awning) {
    const y = d.y + Math.sin(api.t * 1.8 + d.phase) * 2
    api.circfill(d.x, y, 2, 7)
    api.pset(d.x + 2, y - 1, 10)
  }

  api.line(0, 118, api.W, 118, 4)
  api.line(0, 121, api.W, 121, 9)
  api.rectfill(0, FLOOR_Y, api.W, api.H - FLOOR_Y, 4)
  api.rectfill(0, FLOOR_Y, api.W, 3, 9)
  for (const tile of g.tiles) api.pset(tile.x, tile.y, 6)

  for (const item of g.items) {
    if (item.kind === 'anvil') api.spr(ANVIL, item.x, item.y)
    else if (item.kind === 'gold') api.spr(GOLD_PIE, item.x, item.y)
    else api.spr(PIE, item.x, item.y)
  }

  for (const p of g.crumbs) {
    if (p.colour === 10 && p.life < 10) api.spr(DASH_SPARK, p.x - 3, p.y - 3)
    else api.pset(p.x, p.y, p.colour)
  }

  if (g.dash > 0) {
    api.spr(PUFF, g.px - g.facing * 7, FLOOR_Y - 7, g.facing < 0)
  }
  const bob = Math.sin(api.t * 7) * 0.5
  api.spr(BAKER, g.px, FLOOR_Y - BAKER_H + bob, g.facing < 0)
}
