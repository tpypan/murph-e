// TITLE: TWIN TUG
// GENRE: coop
// PLAYERS: 2
// CONTROLS: up down left right a b
// Touch or tether the runaway star, collect sparks, and cross bonus gates.
// Shifting walls stun tugboats. Keep the star away from every arena edge.

const TUGGER = [
  '..77..',
  '.7777.',
  '77aa77',
  '.7777.',
  '..77..',
  '.7..7.',
]
const STAR = [
  '...a...',
  'a..a..a',
  '.aaaaa.',
  '..aaa..',
  '.aaaaa.',
  'a..a..a',
  '...a...',
]
const SPARK = ['.a.', 'a7a', '.a.']
const TOP = 14
const PS = 6
const SS = 7
let g

function init(api) {
  g = {
    players: [
      { x: 42, y: 116, fx: 1, fy: 0, cool: 0, shove: 0, stun: 0 },
      { x: 208, y: 116, fx: -1, fy: 0, cool: 0, shove: 0, stun: 0 },
    ],
    star: { x: 125, y: 112, vx: 0.32, vy: -0.18 },
    tethers: [],
    waves: [],
    sparks: [],
    walls: [],
    gate: { x: 118, gapY: 84, gapH: 42, vertical: true, hit: false },
    sparkTimer: 0,
    wallTimer: 0,
    gateTimer: 0,
    over: false,
  }
  makeWalls(api)
  for (let i = 0; i < 4; i++) spawnSpark(api)
  api.score(0)
}

function makeWalls(api) {
  g.walls = [
    { x: 62, y: 38, w: 10, h: 54, axis: 1, phase: 0 },
    { x: 184, y: 142, w: 10, h: 54, axis: 1, phase: 2 },
    { x: 82, y: 164, w: 52, h: 10, axis: 0, phase: 4 },
    { x: 140, y: 54, w: 52, h: 10, axis: 0, phase: 6 },
  ]
}

function spawnSpark(api) {
  g.sparks.push({
    x: api.rndi(22, api.W - 25),
    y: api.rndi(TOP + 18, api.H - 22),
    phase: api.rnd(6),
  })
}

function blocked(api, x, y, w, h) {
  if (x < 3 || x + w > api.W - 3 || y < TOP + 3 || y + h > api.H - 3) return true
  for (const wall of g.walls)
    if (api.collide(x, y, w, h, wall.x, wall.y, wall.w, wall.h)) return true
  return false
}

function movePlayer(api, p, i) {
  if (p.cool > 0) p.cool--
  if (p.shove > 0) p.shove--
  if (p.stun > 0) p.stun--

  let dx = 0
  let dy = 0
  if (api.btn('left', i)) dx--
  if (api.btn('right', i)) dx++
  if (api.btn('up', i)) dy--
  if (api.btn('down', i)) dy++
  if (dx || dy) {
    p.fx = dx
    p.fy = dy
  }

  if (p.stun === 0) {
    const nx = p.x + dx * 1.7
    const ny = p.y + dy * 1.7
    if (!blocked(api, nx, p.y, PS, PS)) p.x = nx
    if (!blocked(api, p.x, ny, PS, PS)) p.y = ny
  }

  if (api.btnp('a', i)) {
    g.tethers.push({ owner: i, life: 14 })
    p.cool = 14
    api.sfx('shoot')
    const sx = g.star.x + 3
    const sy = g.star.y + 3
    const px = p.x + 3
    const py = p.y + 3
    const d = api.dist(px, py, sx, sy)
    if (d < 68) {
      g.star.vx += ((px - sx) / Math.max(1, d)) * 1.05
      g.star.vy += ((py - sy) / Math.max(1, d)) * 1.05
    }
  }

  if (api.btnp('b', i)) {
    p.shove = 12
    g.waves.push({ x: p.x + 3, y: p.y + 3, r: 3, owner: i })
    api.sfx('jump')
    const sx = g.star.x + 3
    const sy = g.star.y + 3
    const d = api.dist(p.x + 3, p.y + 3, sx, sy)
    if (d < 42) {
      g.star.vx += ((sx - p.x - 3) / Math.max(1, d)) * 1.8
      g.star.vy += ((sy - p.y - 3) / Math.max(1, d)) * 1.8
    }
  }
}

function stunPlayer(api, p) {
  if (p.stun > 0) return
  p.stun = 75
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.players[0].stun > 0 && g.players[1].stun > 0 && api.t > 2) lose(api)
}

function lose(api) {
  if (g.over) return
  g.over = true
  api.sfx('die')
  api.gameOver()
}

function update(api, dt) {
  if (g.over) return
  for (let i = 0; i < 2; i++) movePlayer(api, g.players[i], i)

  const shift = 12 + api.t * 0.45
  for (const w of g.walls) {
    if (w.axis) w.y += Math.sin(api.t * (0.8 + api.t * 0.01) + w.phase) * shift * dt
    else w.x += Math.sin(api.t * (0.8 + api.t * 0.01) + w.phase) * shift * dt
    w.x = api.clamp(w.x, 12, api.W - w.w - 12)
    w.y = api.clamp(w.y, TOP + 12, api.H - w.h - 12)
    for (const p of g.players)
      if (api.collide(p.x, p.y, PS, PS, w.x, w.y, w.w, w.h)) stunPlayer(api, p)
  }

  const s = g.star
  s.vx *= 0.994
  s.vy *= 0.994
  s.vx += Math.sin(api.t * 1.7) * (0.002 + api.t * 0.00025)
  s.vy += Math.cos(api.t * 1.3) * (0.002 + api.t * 0.00025)
  s.x += s.vx
  s.y += s.vy

  for (const p of g.players) {
    const d = api.dist(p.x + 3, p.y + 3, s.x + 3, s.y + 3)
    if (d < 10 && p.stun === 0) {
      s.vx += (p.x - s.x) * 0.006
      s.vy += (p.y - s.y) * 0.006
    }
  }

  for (const w of g.walls) {
    if (!api.collide(s.x, s.y, SS, SS, w.x, w.y, w.w, w.h)) continue
    if (s.x + 3 < w.x || s.x + 3 > w.x + w.w) s.vx *= -1.08
    else s.vy *= -1.08
    s.x -= s.vx * 2
    s.y -= s.vy * 2
    api.sfx('hit')
  }

  for (const spark of g.sparks) {
    if (!spark.dead && api.collide(s.x, s.y, SS, SS, spark.x, spark.y, 3, 3)) {
      spark.dead = true
      api.addScore(10)
      api.sfx('coin')
      api.flash(10, 1)
    }
  }
  g.sparks = g.sparks.filter((spark) => !spark.dead)
  g.sparkTimer -= dt
  if (g.sparkTimer <= 0) {
    spawnSpark(api)
    g.sparkTimer = Math.max(0.7, 2.5 - api.t * 0.025)
  }

  const gate = g.gate
  if (gate.vertical) {
    if (!gate.hit && s.x < gate.x && s.x + s.vx >= gate.x &&
        s.y + 3 > gate.gapY && s.y + 3 < gate.gapY + gate.gapH) gate.hit = true
  } else if (!gate.hit && s.y < gate.gapY && s.y + s.vy >= gate.gapY &&
    s.x + 3 > gate.x && s.x + 3 < gate.x + gate.gapH) gate.hit = true
  if (gate.hit) {
    api.addScore(50)
    api.sfx('powerup')
    api.flash(10, 1)
    gate.vertical = !gate.vertical
    gate.x = api.rndi(48, 166)
    gate.gapY = api.rndi(46, 142)
    gate.gapH = api.rndi(34, 50)
    gate.hit = false
  }

  for (const t of g.tethers) t.life--
  for (const w of g.waves) {
    w.r += 3
    w.life = (w.life || 12) - 1
  }
  g.tethers = g.tethers.filter((t) => t.life > 0)
  g.waves = g.waves.filter((w) => w.life > 0)

  if ((s.x < 1 || s.x + SS > api.W - 1 || s.y < TOP + 1 || s.y + SS > api.H - 1) &&
      api.t > 3) lose(api)
}

function draw(api) {
  api.cls(1)
  for (let y = TOP; y < api.H; y += 16)
    for (let x = 0; x < api.W; x += 16)
      if ((x + y) % 32 === 0) api.pset(x + 5, y + 7, 13)
  api.rect(1, TOP + 1, api.W - 2, api.H - TOP - 2, api.frame % 10 < 5 ? 8 : 14)

  const gate = g.gate
  if (gate.vertical) {
    api.rectfill(gate.x, TOP + 4, 4, gate.gapY - TOP - 4, 11)
    api.rectfill(gate.x, gate.gapY + gate.gapH, 4, api.H - gate.gapY - gate.gapH - 4, 11)
  } else {
    api.rectfill(4, gate.gapY, gate.x - 4, 4, 11)
    api.rectfill(gate.x + gate.gapH, gate.gapY, api.W - gate.x - gate.gapH - 4, 4, 11)
  }

  for (const wall of g.walls) {
    api.rectfill(wall.x, wall.y, wall.w, wall.h, 5)
    api.rect(wall.x, wall.y, wall.w, wall.h, 6)
  }
  for (const spark of g.sparks)
    api.spr(SPARK, spark.x, spark.y + Math.sin(api.t * 4 + spark.phase) * 2)

  for (const wave of g.waves) api.circ(wave.x, wave.y, wave.r, wave.owner ? api.P2 : api.P1)
  for (const tether of g.tethers) {
    const p = g.players[tether.owner]
    api.line(p.x + 3, p.y + 3, g.star.x + 3, g.star.y + 3,
      tether.owner ? api.P2 : api.P1)
  }

  api.circfill(g.star.x + 3, g.star.y + 3, 6, 9)
  api.spr(STAR, g.star.x, g.star.y)

  for (let i = 0; i < 2; i++) {
    const p = g.players[i]
    if (p.stun > 0 && api.frame % 6 < 3) continue
    const c = i === 0 ? api.P2 : api.P1
    api.rectfill(p.x - 1, p.y - 1, PS + 2, PS + 2, c)
    api.spr(TUGGER, p.x, p.y)
    api.pset(p.x + 3 + p.fx * 4, p.y + 3 + p.fy * 4, c)
    if (p.stun > 0) api.circ(p.x + 3, p.y - 2, 3, 10)
  }
}
