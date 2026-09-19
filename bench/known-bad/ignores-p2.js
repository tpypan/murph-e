// TITLE: LASER DUEL (P2 IGNORED)
// GENRE: versus
// PLAYERS: 2
// CONTROLS: up down left right a b
// Two players in one arena. The d-pad moves, A fires a bolt the way you
// face, B dashes. Each hit is a point and costs the other player a life.
// Three lives each. An energy orb drifts around; grab it for points and a
// burst of bolts. After a while a storm closes in from the edges so nobody
// can hide. Last one standing wins.

const BODY = ['..cc..', '.cccc.', 'c7cc7c', 'cccccc', '.c..c.', '.c..c.']
const ORB = ['.aa.', 'a77a', 'a77a', '.aa.']
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']
const PILLARS = [
  { x: 64, y: 60, w: 8, h: 32 },
  { x: 184, y: 60, w: 8, h: 32 },
  { x: 64, y: 140, w: 8, h: 32 },
  { x: 184, y: 140, w: 8, h: 32 },
  { x: 120, y: 108, w: 16, h: 16 },
]
const SIZE = 6
const TOP = 14
const STORM_AT = 25 // seconds before the arena starts to shrink

let g

function init(api) {
  g = {
    players: [
      { x: 30, y: 110, fx: 1, fy: 0, lives: 3, cool: 0, dash: 0, dashCool: 0, hurt: 0, burst: 0 },
      { x: 220, y: 110, fx: -1, fy: 0, lives: 3, cool: 0, dash: 0, dashCool: 0, hurt: 0, burst: 0 },
    ],
    bolts: [], // { x, y, vx, vy, owner }
    orb: { x: 128, y: 60, vx: 0.7, vy: 0.5 },
    storm: 0, // how far the storm has closed in, in pixels
    over: false,
  }
  api.score(0)
}

// True if a SIZE x SIZE box at (x, y) overlaps a wall or a pillar.
function blocked(api, x, y) {
  if (x < 2 || y < TOP + 2 || x + SIZE > api.W - 2 || y + SIZE > api.H - 2) return true
  for (const p of PILLARS) if (api.collide(x, y, SIZE, SIZE, p.x, p.y, p.w, p.h)) return true
  return false
}

function movePlayer(api, p, i) {
  let dx = 0
  let dy = 0
  if (api.btn('left', i === 0 ? 0 : 5)) dx -= 1
  if (api.btn('right', i === 0 ? 0 : 5)) dx += 1
  if (api.btn('up', i === 0 ? 0 : 5)) dy -= 1
  if (api.btn('down', i === 0 ? 0 : 5)) dy += 1
  if (dx || dy) {
    p.fx = dx
    p.fy = dy
  }
  if (p.dashCool > 0) p.dashCool--
  if (api.btnp('b', i) && p.dashCool === 0) {
    p.dash = 8
    p.dashCool = 50
    api.sfx('jump')
  }
  const speed = p.dash > 0 ? 4 : 1.6
  if (p.dash > 0) {
    p.dash--
    dx = p.fx
    dy = p.fy
  }
  const nx = p.x + dx * speed
  const ny = p.y + dy * speed
  if (!blocked(api, nx, p.y)) p.x = nx
  if (!blocked(api, p.x, ny)) p.y = ny

  if (p.cool > 0) p.cool--
  const wantShot = api.btnp('a', i) || (p.burst > 0 && api.frame % 6 === 0)
  if (wantShot && p.cool === 0) {
    const v = 3 + Math.min(2, api.t * 0.05)
    g.bolts.push({ x: p.x + 2, y: p.y + 2, vx: p.fx * v, vy: p.fy * v, owner: i })
    p.cool = p.burst > 0 ? 4 : 14
    if (p.burst > 0) p.burst--
    api.sfx('shoot')
  }
  if (p.hurt > 0) p.hurt--
}

function hit(api, victim, shooter) {
  const v = g.players[victim]
  if (v.hurt > 0) return
  v.lives--
  v.hurt = 45
  api.addScore(1, shooter)
  api.sfx('hit')
  api.flash(8, 2)
  api.shake(8)
  if (v.lives <= 0 && !g.over) {
    g.over = true
    api.sfx('powerup')
    api.win(shooter)
  }
}

function update(api, dt) {
  for (let i = 0; i < 2; i++) movePlayer(api, g.players[i], i)

  // Bolts fly, stop at walls and pillars, hit the other player.
  for (const b of g.bolts) {
    b.x += b.vx
    b.y += b.vy
    if (blocked(api, b.x, b.y)) b.dead = true
    const other = g.players[1 - b.owner]
    if (!b.dead && api.collide(b.x, b.y, 2, 2, other.x, other.y, SIZE, SIZE)) {
      b.dead = true
      hit(api, 1 - b.owner, b.owner)
    }
  }
  g.bolts = g.bolts.filter((b) => !b.dead)

  // The orb bounces around; whoever grabs it gets points and a burst.
  const o = g.orb
  o.x += o.vx
  o.y += o.vy
  if (o.x < 4 || o.x > api.W - 8) o.vx = -o.vx
  if (o.y < TOP + 4 || o.y > api.H - 8) o.vy = -o.vy
  for (let i = 0; i < 2; i++) {
    const p = g.players[i]
    if (api.collide(o.x, o.y, 4, 4, p.x, p.y, SIZE, SIZE)) {
      api.addScore(5, i)
      p.burst = 6
      api.sfx('coin')
      api.flash(10, 1)
      o.x = api.rndi(20, api.W - 24)
      o.y = api.rndi(TOP + 10, api.H - 20)
      o.vx = (api.rnd() < 0.5 ? -1 : 1) * (0.7 + api.t * 0.01)
      o.vy = (api.rnd() < 0.5 ? -1 : 1) * (0.5 + api.t * 0.01)
    }
  }

  // The storm closes in so a stand-off cannot last forever.
  if (api.t > STORM_AT) {
    g.storm = Math.min(90, (api.t - STORM_AT) * 2)
    for (let i = 0; i < 2; i++) {
      const p = g.players[i]
      const inStorm =
        p.x < g.storm ||
        p.x + SIZE > api.W - g.storm ||
        p.y < TOP + g.storm ||
        p.y + SIZE > api.H - g.storm
      if (inStorm && api.frame % 45 === 0) hit(api, i, 1 - i)
    }
  }
}

function draw(api) {
  api.cls(1)
  // Floor tiles and the arena border.
  for (let y = TOP; y < api.H; y += 16)
    for (let x = 0; x < api.W; x += 16) if ((x + y) % 32 === 0) api.rectfill(x, y, 16, 16, 0)
  api.rect(0, TOP, api.W, api.H - TOP, 6)
  for (const p of PILLARS) api.rectfill(p.x, p.y, p.w, p.h, 13)

  if (g.storm > 0) {
    const s = g.storm
    const c = api.frame % 8 < 4 ? 2 : 14
    api.rectfill(0, TOP, s, api.H - TOP, c)
    api.rectfill(api.W - s, TOP, s, api.H - TOP, c)
    api.rectfill(0, TOP, api.W, s, c)
    api.rectfill(0, api.H - s, api.W, s, c)
  }

  api.spr(ORB, g.orb.x, g.orb.y)
  for (const b of g.bolts) api.rectfill(b.x, b.y, 2, 2, b.owner === 0 ? api.P1 : api.P2)

  for (let i = 0; i < 2; i++) {
    const p = g.players[i]
    if (p.hurt > 0 && api.frame % 6 < 3) continue
    const c = i === 0 ? api.P1 : api.P2
    api.rectfill(p.x, p.y, SIZE, SIZE, c)
    api.spr(BODY, p.x, p.y)
    api.rectfill(p.x + 2 + p.fx * 3, p.y + 2 + p.fy * 3, 2, 2, c)
    for (let h = 0; h < p.lives; h++) api.spr(HEART, i === 0 ? 64 + h * 7 : 170 + h * 7, 4)
  }
}
