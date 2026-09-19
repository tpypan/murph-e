// TITLE: SWARM
// GENRE: coop
// PLAYERS: 2
// CONTROLS: up down left right a b
// Two players back to back in one arena. Bugs pour in from every edge and
// crawl toward the nearest player. The d-pad moves, A shoots the way you
// face, B drops a bomb that clears everything nearby (one every ten
// seconds). Every bug is shared points; every bite costs a shared life.
// Five lives between you. The swarm gets faster and thicker over time.

const HERO = ['.777.', '7c7c7', '77777', '.7.7.']
const BUG = ['b..b', '.bb.', 'bbbb', 'b..b']
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']
const SIZE = 5
const TOP = 14
const BOMB_COOL = 600

let g

function init(api) {
  g = {
    players: [
      { x: 110, y: 110, fx: -1, fy: 0, cool: 0, bomb: 0 },
      { x: 140, y: 110, fx: 1, fy: 0, cool: 0, bomb: 0 },
    ],
    bugs: [], // { x, y, dead }
    shots: [], // { x, y, vx, vy }
    booms: [], // { x, y, r }
    lives: 5,
    hurt: 0,
    spawnTimer: 2, // seconds until the first bug; they need time to walk in
  }
  api.score(0)
}

function spawnBug(api) {
  const side = api.rndi(0, 3)
  const bug = { x: 0, y: 0, dead: false }
  if (side === 0) {
    bug.x = api.rndi(0, api.W - 4)
    bug.y = TOP
  } else if (side === 1) {
    bug.x = api.rndi(0, api.W - 4)
    bug.y = api.H - 4
  } else if (side === 2) {
    bug.x = 0
    bug.y = api.rndi(TOP, api.H - 4)
  } else {
    bug.x = api.W - 4
    bug.y = api.rndi(TOP, api.H - 4)
  }
  g.bugs.push(bug)
}

function movePlayer(api, p, i) {
  let dx = 0
  let dy = 0
  if (api.btn('left', i)) dx -= 1
  if (api.btn('right', i)) dx += 1
  if (api.btn('up', i)) dy -= 1
  if (api.btn('down', i)) dy += 1
  if (dx || dy) {
    p.fx = dx
    p.fy = dy
  }
  p.x = api.clamp(p.x + dx * 1.8, 0, api.W - SIZE)
  p.y = api.clamp(p.y + dy * 1.8, TOP, api.H - SIZE)

  if (p.cool > 0) p.cool--
  if (api.btn('a', i) && p.cool === 0) {
    g.shots.push({ x: p.x + 2, y: p.y + 2, vx: p.fx * 4, vy: p.fy * 4 })
    p.cool = 10
    api.sfx('shoot')
  }
  if (p.bomb > 0) p.bomb--
  if (api.btnp('b', i) && p.bomb === 0) {
    p.bomb = BOMB_COOL
    g.booms.push({ x: p.x + 2, y: p.y + 2, r: 4 })
    api.sfx('explode')
    api.flash(7, 2)
    api.shake(10)
  }
}

function update(api, dt) {
  for (let i = 0; i < 2; i++) movePlayer(api, g.players[i], i)

  // Waves ramp: more bugs, faster bugs.
  const bugSpeed = 0.45 + Math.min(1.2, api.t * 0.02)
  g.spawnTimer -= dt
  if (g.spawnTimer <= 0) {
    spawnBug(api)
    if (api.t > 20) spawnBug(api)
    g.spawnTimer = Math.max(0.25, 1.1 - api.t * 0.02)
  }

  // Bugs crawl toward the nearest player.
  for (const b of g.bugs) {
    let target = g.players[0]
    let best = api.dist(b.x, b.y, target.x, target.y)
    const d1 = api.dist(b.x, b.y, g.players[1].x, g.players[1].y)
    if (d1 < best) {
      target = g.players[1]
      best = d1
    }
    if (best > 0.5) {
      b.x += ((target.x - b.x) / best) * bugSpeed
      b.y += ((target.y - b.y) / best) * bugSpeed
    }
  }

  // Shots and bombs kill bugs; each bug is shared points.
  for (const s of g.shots) {
    s.x += s.vx
    s.y += s.vy
    for (const b of g.bugs) {
      if (!b.dead && api.collide(s.x, s.y, 2, 2, b.x, b.y, 4, 4)) {
        b.dead = true
        s.dead = true
        api.addScore(10)
        api.sfx('hit')
      }
    }
  }
  for (const boom of g.booms) {
    boom.r += 3
    for (const b of g.bugs) {
      if (!b.dead && api.dist(boom.x, boom.y, b.x + 2, b.y + 2) < boom.r) {
        b.dead = true
        api.addScore(10)
      }
    }
  }
  g.booms = g.booms.filter((b) => b.r < 60)
  g.shots = g.shots.filter(
    (s) => !s.dead && s.x > -4 && s.x < api.W && s.y > TOP - 4 && s.y < api.H,
  )

  // A bite costs a shared life.
  if (g.hurt > 0) g.hurt--
  for (const b of g.bugs) {
    if (b.dead || g.hurt > 0) continue
    for (let i = 0; i < 2; i++) {
      const p = g.players[i]
      if (api.collide(b.x, b.y, 4, 4, p.x, p.y, SIZE, SIZE)) {
        b.dead = true
        g.lives--
        g.hurt = 60
        api.sfx('die')
        api.flash(8, 3)
        api.shake(12)
        if (g.lives <= 0) api.gameOver()
      }
    }
  }
  g.bugs = g.bugs.filter((b) => !b.dead)

  // Survival is worth something too.
  if (api.frame % 60 === 0) api.addScore(1)
}

function draw(api) {
  api.cls(3)
  for (let y = TOP; y < api.H; y += 8)
    for (let x = 0; x < api.W; x += 8) if ((x * 7 + y * 13) % 5 === 0) api.pset(x + 3, y + 5, 11)
  api.rect(0, TOP, api.W, api.H - TOP, 11)

  for (const boom of g.booms) api.circ(boom.x, boom.y, boom.r, api.frame % 2 ? 10 : 9)
  for (const b of g.bugs) api.spr(BUG, b.x, b.y)
  for (const s of g.shots) api.rectfill(s.x, s.y, 2, 2, 10)

  for (let i = 0; i < 2; i++) {
    const p = g.players[i]
    if (g.hurt > 0 && api.frame % 6 < 3) continue
    const c = i === 0 ? api.P1 : api.P2
    api.rectfill(p.x - 1, p.y - 1, SIZE + 2, SIZE + 2, c)
    api.spr(HERO, p.x, p.y)
    if (p.bomb === 0) api.pset(p.x + 2, p.y - 3, 10)
  }
  for (let h = 0; h < g.lives; h++) api.spr(HEART, 108 + h * 8, 4)
}
