// TITLE: SKY FALL
// GENRE: dodge
// CONTROLS: left right a
// A player at the bottom moves left and right and can hop. Anvils fall and
// hurt; pies fall and feed. The hook: the fuel bar always drains, so waiting
// in a safe corner starves you, and the pies fall where the anvils are.
// Catching pies builds a combo that multiplies them and breaks when you are
// hit; a hazard that misses you narrowly pays a couple of points. Anvils only
// until 20 s, then drifting spikes, then telegraphed bombs. A rare star gives
// a few seconds of shield.
//
// The runtime calls init(api) once, then update(api, dt) and draw(api) at 60 Hz.
// The runtime owns the score HUD, the title card and the GAME OVER screen.

const PLAYER = ['..ffff..', '.f1ff1f.', '.ffffff.', 'f888888f', '.8....8.', '.1....1.']
const ANVIL = ['66666666', '67777776', '..6666..', '...66...', '.555555.', '55555555']
const SPIKE = ['...8....', '..888...', '.88a88..', '8888a888', '.88a88..', '..888...']
const BOMB = ['..5555..', '.555555.', '55588555', '55555555', '.555555.', '..5555..']
const PIE = ['...8....', '..9999..', '.9aaaa9.', '99999999', '.444444.', '..4444..']
const STAR = ['...aa...', '.aa77aa.', 'aa7777aa', '.aa77aa.', '...aa...']
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']
const SPRITES = { anvil: ANVIL, spike: SPIKE, bomb: BOMB, pie: PIE, star: STAR }

const GROUND_Y = 212 // top of the ground strip
const TW = 8 // sprites are 8 wide so they read at cabinet distance
const TH = 6 // and 6 tall, which keeps each one on a single source line
const FUEL_MAX = 100

// All mutable state lives in one object so init() can rebuild it from scratch.
let g

function init(api) {
  g = {
    px: api.W / 2 - TW / 2,
    py: GROUND_Y - TH,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    things: [], // { x, y, vy, vx, kind, passed, dead }
    warns: [], // { x, ttl } a bomb is coming down this column
    lives: 3,
    combo: 1,
    fuel: 70,
    shield: 0,
    spawnTimer: 0.6,
    starTimer: 14,
    time: 0,
    hurt: 0, // invulnerability frames after a hit
    stars: [],
  }
  for (let i = 0; i < 24; i++) g.stars.push({ x: api.rndi(0, api.W - 1), y: api.rndi(14, 150) })
  api.score(0)
}

function add(kind, x, vy, vx) {
  g.things.push({ x, y: -TH, vy, vx, kind, passed: false, dead: false })
}

function spawn(api) {
  // Stage 0 before 20 s, 1 before 45 s, 2 after: each adds a kind of hazard.
  const stage = g.time >= 45 ? 2 : g.time >= 20 ? 1 : 0
  const d = Math.min(3, g.time / 30)
  const roll = api.rnd()
  const anywhere = () => api.rndi(0, api.W - TW)
  if (roll < 0.34) {
    // Pies fall near whatever is already falling: the food is in the traffic.
    const near = g.things.find((t) => t.kind !== 'pie' && t.kind !== 'star')
    const x = near ? api.clamp(near.x + api.rndi(-14, 14), 0, api.W - TW) : anywhere()
    add('pie', x, 1.2 + d * 0.5, 0)
  } else if (stage >= 1 && roll < 0.55) {
    add('spike', anywhere(), 2.4 + d * 0.9, api.rnd() < 0.5 ? -0.7 : 0.7)
  } else if (stage >= 2 && roll < 0.72) {
    g.warns.push({ x: anywhere(), ttl: 34 }) // telegraphed, about 0.6 s
  } else {
    add('anvil', anywhere(), 1.6 + d * 0.8 + api.rnd(0.6), 0)
  }
}

function hurt(api) {
  if (g.hurt > 0) return
  if (g.shield > 0) {
    g.shield = 0
    api.sfx('select')
    api.flash(12, 2)
    return
  }
  g.lives--
  g.combo = 1
  g.hurt = 70
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(12)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  g.time += dt
  const d = Math.min(3, g.time / 30) // 0 at start, 3 after 90 s

  // Horizontal movement with a little acceleration and friction.
  if (api.btn('left')) {
    g.vx -= 0.5
    g.facing = -1
  }
  if (api.btn('right')) {
    g.vx += 0.5
    g.facing = 1
  }
  g.vx *= 0.82
  g.px = api.clamp(g.px + g.vx, 0, api.W - TW)

  // Hop. A or B both work.
  if ((api.btnp('a') || api.btnp('b')) && g.onGround) {
    g.vy = -4.2
    g.onGround = false
    api.sfx('jump')
  }
  g.vy += 0.22
  g.py += g.vy
  if (g.py >= GROUND_Y - TH) {
    g.py = GROUND_Y - TH
    g.vy = 0
    g.onGround = true
  }

  // Fuel always drains, so there is no safe corner to wait in.
  g.fuel -= (5 + d) * dt
  if (g.fuel <= 0) {
    g.fuel = 55
    hurt(api)
  }
  if (g.shield > 0) g.shield -= dt

  // Spawning gets denser as time passes.
  g.spawnTimer -= dt
  if (g.spawnTimer <= 0) {
    spawn(api)
    g.spawnTimer = Math.max(0.2, 0.75 - d * 0.17)
  }
  g.starTimer -= dt
  if (g.starTimer <= 0) {
    g.starTimer = 16 + api.rnd(8)
    add('star', api.rndi(0, api.W - TW), 1.1, 0)
  }

  // Telegraphed bombs drop when their warning runs out.
  for (const w of g.warns) {
    w.ttl--
    if (w.ttl <= 0) {
      add('bomb', w.x, 4 + d, 0)
      api.sfx('select')
    }
  }
  g.warns = g.warns.filter((w) => w.ttl > 0)

  // One loop over one array; the kind field decides what happens.
  for (const t of g.things) {
    t.y += t.vy
    t.x = api.clamp(t.x + t.vx, 0, api.W - TW)
    if (t.vx !== 0 && (t.x <= 0 || t.x >= api.W - TW)) t.vx = -t.vx
    if (t.dead) continue
    const hazard = t.kind !== 'pie' && t.kind !== 'star'
    // A hazard that goes past close by pays: standing near the traffic is
    // worth something, which is why the pies fall there.
    if (hazard && !t.passed && t.y > g.py + TH) {
      t.passed = true
      if (Math.abs(t.x - g.px) < 14) {
        api.addScore(2)
        api.sfx('select')
      }
    }
    if (!api.collide(g.px, g.py, TW, TH, t.x + 1, t.y + 1, TW - 2, TH - 2)) continue
    t.dead = true
    if (t.kind === 'pie') {
      g.combo = Math.min(8, g.combo + 1)
      g.fuel = Math.min(FUEL_MAX, g.fuel + 28)
      api.addScore(10 * g.combo)
      api.sfx('coin')
      api.flash(10, 1)
    } else if (t.kind === 'star') {
      g.shield = 6
      api.addScore(25 * g.combo)
      api.sfx('powerup')
      api.flash(12, 2)
    } else {
      hurt(api)
    }
  }
  g.things = g.things.filter((t) => !t.dead && t.y < api.H)
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(1)
  for (const s of g.stars) api.pset(s.x, s.y, (s.x + api.frame / 8) % 20 < 2 ? 7 : 13)
  api.rectfill(0, GROUND_Y, api.W, api.H - GROUND_Y, 3)
  api.rectfill(0, GROUND_Y, api.W, 2, 11)

  // Warnings blink above the column a bomb is about to fall down.
  for (const w of g.warns) {
    if (api.frame % 8 < 5) {
      api.rectfill(w.x, 14, TW, 2, 8)
      api.text('!', w.x, 17, 10)
    }
  }
  for (const t of g.things) api.spr(SPRITES[t.kind], t.x, t.y)

  // Blink while invulnerable.
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(PLAYER, g.px, g.py, g.facing < 0)
  if (g.shield > 0 && api.frame % 4 < 3) api.circ(g.px + 4, g.py + 3, 8, 12)

  // Fuel bar and combo, both below the runtime's HUD strip.
  api.rectfill(4, 14, 52, 5, 5)
  api.rectfill(4, 14, Math.max(0, (g.fuel / FUEL_MAX) * 52), 5, g.fuel < 30 ? 8 : 11)
  if (g.combo > 1) api.text(`X${g.combo}`, 60, 14, 10)
  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
}
