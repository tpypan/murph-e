// TITLE: CAT CATCHER
// GENRE: dodge
// CONTROLS: left right a b
// Catch fish, leap over danger, and whistle fish closer.

const CAT = [
  '.9....9.',
  '999..999',
  '9ffffff9',
  'ff1ff1ff',
  'ffffffff',
  '.f9999f.',
  'ff9ff9ff',
  '.44..44.',
]
const FISH = [
  '........',
  '....c...',
  '.cccc.c.',
  'c7cccccc',
  '.cccc.c.',
  '....c...',
  '........',
  '........',
]
const BIRD = [
  '........',
  '6......6',
  '.66..66.',
  '..6666..',
  '..6776..',
  '.666666.',
  '...99...',
  '........',
]
const POT = [
  '..bbbb..',
  '.bbbbbb.',
  '..4444..',
  '..4aa4..',
  '..4aa4..',
  '..4444..',
  '...44...',
  '........',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']
const NOTE = ['..7.', '.77.', '..7.', '777.']
const CAT_W = 8
const CAT_H = 8
const ROOF_Y = 207

let g

function init(api) {
  g = {
    px: api.W / 2 - 4,
    py: ROOF_Y - CAT_H,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: 1,
    objects: [],
    lives: 3,
    hurt: 0,
    combo: 0,
    spawnTimer: 0.45,
    whistle: 0,
    whistleCooldown: 0,
    notes: [],
    clouds: [],
    windows: [],
  }
  for (let i = 0; i < 7; i++) {
    g.clouds.push({
      x: api.rndi(0, api.W),
      y: api.rndi(22, 90),
      speed: api.rnd(0.15) + 0.05,
    })
  }
  for (let i = 0; i < 14; i++) {
    g.windows.push({
      x: api.rndi(3, api.W - 8),
      y: api.rndi(130, 190),
      lit: api.rnd() < 0.45,
    })
  }
  api.score(0)
}

function spawnObject(api) {
  const roll = api.rnd()
  let kind = 'fish'
  if (api.t > 3.2 && roll > 0.52) kind = roll > 0.79 ? 'pot' : 'bird'
  const speed = 1.05 + api.t * 0.018 + api.rnd(0.65)
  g.objects.push({
    x: api.rndi(3, api.W - 11),
    y: -10,
    vy: kind === 'fish' ? speed * 0.82 : speed,
    vx: kind === 'bird' ? (api.rnd(0.8) - 0.4) : 0,
    kind,
    phase: api.rnd(6.28),
    dead: false,
  })
}

function hurtCat(api, object) {
  if (g.hurt > 0 || api.t <= 2) return
  object.dead = true
  g.lives--
  g.combo = 0
  g.hurt = 75
  g.vy = -2.5
  g.vx += object.x < g.px ? 2.2 : -2.2
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const accel = 0.55
  if (api.btn('left')) {
    g.vx -= accel
    g.facing = -1
  }
  if (api.btn('right')) {
    g.vx += accel
    g.facing = 1
  }
  g.vx *= 0.8
  g.px = api.clamp(g.px + g.vx, 0, api.W - CAT_W)

  if (api.btnp('a')) {
    if (g.grounded) {
      g.vy = -4.7
      g.grounded = false
    } else {
      g.vy -= 0.65
    }
    api.sfx('jump')
  }

  if (g.whistleCooldown > 0) g.whistleCooldown--
  if (api.btnp('b')) {
    g.whistle = 30
    g.whistleCooldown = 12
    g.notes.push({ x: g.px + 5, y: g.py - 3, life: 34, vx: g.facing * 0.45 })
    api.sfx('select')
  }
  if (g.whistle > 0) g.whistle--

  g.vy += 0.23
  g.py += g.vy
  if (g.py >= ROOF_Y - CAT_H) {
    g.py = ROOF_Y - CAT_H
    g.vy = 0
    g.grounded = true
  }

  g.spawnTimer -= dt
  if (g.spawnTimer <= 0) {
    spawnObject(api)
    if (api.t > 20 && api.rnd() < Math.min(0.7, api.t / 100)) spawnObject(api)
    g.spawnTimer = Math.max(0.15, 0.72 - api.t * 0.006)
  }

  for (const o of g.objects) {
    if (o.kind === 'bird') {
      o.x += o.vx + Math.sin(api.t * 5 + o.phase) * 0.3
    }
    if (o.kind === 'fish' && g.whistle > 0) {
      const dx = g.px + 4 - (o.x + 4)
      if (Math.abs(dx) < 90) o.x += api.clamp(dx * 0.035, -1.4, 1.4)
    }
    o.y += o.vy
    o.x = api.clamp(o.x, 0, api.W - 8)
    if (o.dead) continue
    if (api.collide(g.px + 1, g.py + 1, 6, 7, o.x + 1, o.y + 1, 6, 6)) {
      if (o.kind === 'fish') {
        o.dead = true
        g.combo++
        api.addScore(10 + Math.min(g.combo, 10) * 5)
        api.sfx('coin')
        api.flash(10, 1)
      } else {
        hurtCat(api, o)
      }
    }
    if (o.y > ROOF_Y && o.kind === 'fish' && !o.dead) g.combo = 0
  }

  for (const n of g.notes) {
    n.x += n.vx
    n.y -= 0.55
    n.life--
  }
  for (const c of g.clouds) {
    c.x += c.speed
    if (c.x > api.W + 18) c.x = -22
  }

  g.objects = g.objects.filter((o) => !o.dead && o.y < api.H + 10)
  g.notes = g.notes.filter((n) => n.life > 0)
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(12)

  api.circfill(218, 38, 15, 10)
  api.circfill(213, 34, 11, 14)
  for (const c of g.clouds) {
    api.circfill(c.x, c.y, 7, 7)
    api.circfill(c.x + 8, c.y - 3, 9, 7)
    api.circfill(c.x + 17, c.y, 6, 7)
  }

  api.rectfill(0, 120, api.W, 87, 2)
  api.rectfill(0, 126, 45, 81, 5)
  api.rectfill(49, 108, 58, 99, 3)
  api.rectfill(111, 137, 47, 70, 4)
  api.rectfill(162, 115, 55, 92, 5)
  api.rectfill(221, 132, 35, 75, 3)
  for (const w of g.windows) {
    api.rectfill(w.x, w.y, 5, 7, w.lit ? 10 : 1)
  }

  api.rectfill(0, ROOF_Y, api.W, api.H - ROOF_Y, 5)
  api.rectfill(0, ROOF_Y, api.W, 3, 6)
  for (let x = 0; x < api.W; x += 16) api.line(x, ROOF_Y + 4, x + 8, api.H, 4)

  for (const o of g.objects) {
    if (o.kind === 'fish') api.spr(FISH, o.x, o.y, o.vx < 0)
    else if (o.kind === 'bird') api.spr(BIRD, o.x, o.y, api.frame % 12 < 6)
    else api.spr(POT, o.x, o.y)
  }
  for (const n of g.notes) api.spr(NOTE, n.x, n.y)

  if (g.whistle > 0) {
    const r = 12 + (30 - g.whistle) * 2
    api.circ(g.px + 4, g.py + 3, r, 7)
  }
  if (g.hurt <= 0 || api.frame % 6 < 3) {
    api.spr(CAT, g.px, g.py, g.facing < 0)
  }

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
  if (g.combo > 1) api.text(`X${g.combo}`, 4, 14, 10)
}
