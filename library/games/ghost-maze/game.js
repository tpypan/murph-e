// TITLE: GHOST MAZE
// GENRE: dodge
// CONTROLS: arrows move, a drops decoy
// Collect every key, then reach the glowing exit before the ghost catches you.

const HERO = [
  '..aaaa..',
  '.affffa.',
  '.af1ffa.',
  '.affffa.',
  '..cccc..',
  '.cc77cc.',
  '.c....c.',
  '.3....3.',
]
const GHOST = [
  '..7777..',
  '.7dddd7.',
  '7d1dd1d7',
  '7dddddd7',
  '7d7dd7d7',
  '77777777',
  '77.77.77',
  '7..77..7',
]
const KEY = [
  '..aa....',
  '.a..a...',
  '.a..a...',
  '..aa....',
  '..a.....',
  '..aaaa..',
  '..a.a...',
  '..aaaa..',
]
const DECOY = [
  '...e....',
  '..eee...',
  '.e9e9e..',
  '..eee...',
  '.eeeee..',
  '..e.e...',
  '.e...e..',
  '........',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const TILE = 16
const OX = 8
const OY = 16
const COLS = 15
const ROWS = 12
const MAP = [
  '###############',
  '#.....#.......#',
  '#.###.#.#####.#',
  '#.#...#.....#.#',
  '#.#.#######.#.#',
  '#.#.........#.#',
  '#.#####.#####.#',
  '#.....#.#.....#',
  '#####.#.#.###.#',
  '#.....#...#...#',
  '#.#########.#E#',
  '###############',
]

let g

function init(api) {
  g = {
    px: OX + TILE + 4,
    py: OY + TILE + 4,
    gx: OX + TILE * 7 + 4,
    gy: OY + TILE * 5 + 4,
    lives: 3,
    hurt: 0,
    keys: [],
    decoys: [],
    blocks: [],
    exitOpen: false,
    trail: [],
    trailTick: 0,
    ghostStep: 0,
    blockTimer: 9,
    motes: [],
  }
  const spots = [[5, 1], [13, 1], [1, 7], [9, 7], [11, 9]]
  for (const p of spots) {
    g.keys.push({ x: OX + p[0] * TILE + 4, y: OY + p[1] * TILE + 4, got: false })
  }
  for (let i = 0; i < 28; i++) {
    g.motes.push({ x: api.rndi(0, 255), y: api.rndi(13, 223), s: api.rnd(0.3) + 0.1 })
  }
  api.score(0)
}

function wallAt(x, y) {
  const c = Math.floor((x - OX) / TILE)
  const r = Math.floor((y - OY) / TILE)
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true
  if (MAP[r][c] === '#') return true
  for (const b of g.blocks) {
    if (c === b.c && r === b.r) return true
  }
  return false
}

function blocked(x, y) {
  return wallAt(x + 1, y + 1) || wallAt(x + 6, y + 1) ||
    wallAt(x + 1, y + 6) || wallAt(x + 6, y + 6)
}

function hurtPlayer(api) {
  if (g.hurt > 0 || api.t <= 2) return
  g.lives--
  g.hurt = 90
  g.gx = OX + TILE * 7 + 4
  g.gy = OY + TILE * 5 + 4
  g.trail = []
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function addDeadEnd(api) {
  const choices = [[3, 3], [7, 5], [5, 7], [11, 7], [11, 9], [13, 9]]
  for (let tries = 0; tries < 8; tries++) {
    const p = choices[api.rndi(0, choices.length - 1)]
    const bx = OX + p[0] * TILE
    const by = OY + p[1] * TILE
    if (!api.collide(g.px, g.py, 8, 8, bx, by, TILE, TILE) &&
        !api.collide(g.gx, g.gy, 8, 8, bx, by, TILE, TILE)) {
      g.blocks.push({ c: p[0], r: p[1], life: 12 })
      break
    }
  }
}

function update(api, dt) {
  let dx = 0
  let dy = 0
  if (api.btn('left')) dx--
  if (api.btn('right')) dx++
  if (api.btn('up')) dy--
  if (api.btn('down')) dy++
  if (dx && dy) {
    dx *= 0.707
    dy *= 0.707
  }
  const speed = 1.45
  if (!blocked(g.px + dx * speed, g.py)) g.px += dx * speed
  if (!blocked(g.px, g.py + dy * speed)) g.py += dy * speed

  g.trailTick++
  if ((dx || dy) && g.trailTick >= 5) {
    g.trail.push({ x: g.px, y: g.py })
    g.trailTick = 0
    if (g.trail.length > 300) g.trail.shift()
  }

  if (api.btnp('a')) {
    g.decoys.push({ x: g.px, y: g.py, life: 150 })
    api.sfx('shoot')
    api.flash(13, 1)
  }

  for (const d of g.decoys) d.life--
  g.decoys = g.decoys.filter((d) => d.life > 0)

  let target = null
  if (g.decoys.length) target = g.decoys[g.decoys.length - 1]
  else if (g.trail.length) target = g.trail[0]
  else target = { x: g.px, y: g.py }

  const ghostSpeed = 0.32 + api.t * 0.012
  const dist = Math.max(1, api.dist(g.gx, g.gy, target.x, target.y))
  const nx = g.gx + (target.x - g.gx) / dist * ghostSpeed
  const ny = g.gy + (target.y - g.gy) / dist * ghostSpeed
  if (!blocked(nx, g.gy)) g.gx = nx
  if (!blocked(g.gx, ny)) g.gy = ny

  if (g.trail.length && api.dist(g.gx, g.gy, target.x, target.y) < 5) g.trail.shift()
  if (g.decoys.length && api.dist(g.gx, g.gy, target.x, target.y) < 7) {
    g.decoys.pop()
    api.sfx('explode')
  }

  for (const k of g.keys) {
    if (!k.got && api.collide(g.px, g.py, 8, 8, k.x, k.y, 8, 8)) {
      k.got = true
      api.addScore(100)
      api.sfx('coin')
      api.flash(10, 1)
    }
  }
  g.exitOpen = g.keys.every((k) => k.got)

  const ex = OX + TILE * 13
  const ey = OY + TILE * 10
  if (g.exitOpen && api.collide(g.px, g.py, 8, 8, ex, ey, TILE, TILE)) {
    api.addScore(500)
    api.sfx('powerup')
    api.win()
  }

  if (api.collide(g.px, g.py, 8, 8, g.gx, g.gy, 8, 8)) hurtPlayer(api)
  if (g.hurt > 0) g.hurt--

  g.blockTimer -= dt
  if (g.blockTimer <= 0) {
    addDeadEnd(api)
    g.blockTimer = Math.max(2, 10 - api.t * 0.08)
  }
  for (const b of g.blocks) b.life -= dt
  g.blocks = g.blocks.filter((b) => b.life > 0)
}

function draw(api) {
  api.cls(2)
  for (const m of g.motes) {
    const y = (m.y + api.frame * m.s) % api.H
    api.pset(m.x, y, api.frame % 24 < 12 ? 13 : 5)
  }

  api.rectfill(OX, OY, COLS * TILE, ROWS * TILE, 1)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = OX + c * TILE
      const y = OY + r * TILE
      if (MAP[r][c] === '#') {
        api.rectfill(x, y, TILE, TILE, 5)
        api.rect(x + 1, y + 1, TILE - 2, TILE - 2, 6)
        api.pset(x + 4, y + 5, 3)
        api.pset(x + 12, y + 11, 4)
      }
    }
  }

  for (const b of g.blocks) {
    const x = OX + b.c * TILE
    const y = OY + b.r * TILE
    api.rectfill(x, y, TILE, TILE, 4)
    api.rect(x + 2, y + 2, 12, 12, 9)
  }

  const ex = OX + TILE * 13
  const ey = OY + TILE * 10
  api.rectfill(ex + 3, ey + 2, 10, 14, g.exitOpen ? 11 : 8)
  api.rect(ex + 4, ey + 3, 8, 13, g.exitOpen ? 10 : 4)

  for (const k of g.keys) {
    if (!k.got) api.spr(KEY, k.x, k.y + Math.sin(api.t * 5 + k.x) * 2)
  }
  for (const d of g.decoys) {
    if (d.life % 8 < 5) api.spr(DECOY, d.x, d.y)
  }

  api.spr(GHOST, g.gx, g.gy + Math.sin(api.t * 7) * 2)
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(HERO, g.px, g.py)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
}
