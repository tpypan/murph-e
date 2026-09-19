// TITLE: SEAL SLIDE
// GENRE: dodge
// CONTROLS: left right a b
// Slide across the ice, collect fish, and avoid hungry seals.

const PENGUIN = [
  '..1111..',
  '.117711.',
  '.1f77f1.',
  '.111111.',
  '..9999..',
  '.199991.',
  '11999911',
  '.9....9.',
]
const SEAL = [
  '...55...',
  '..5555..',
  '.577575.',
  '55555555',
  '55666655',
  '.555555.',
  '55....55',
  '.5....5.',
]
const FISH = [
  '........',
  '......cc',
  '.6...ccc',
  '666ccccc',
  '.6...ccc',
  '......cc',
  '........',
  '........',
]
const HEART = [
  '.8.8.',
  '88888',
  '88888',
  '.888.',
  '..8..',
]
const BURST = [
  'a.a.a.a.',
  '.a.a.a.a',
  '..7.a...',
  '.a.a.a.a',
  'a.a.a.a.',
  '.a.a.a.a',
]
const PUFF = [
  '..7.7...',
  '.7...7..',
  '7..7..7.',
  '.7...7..',
  '..7.7...',
  '........',
]

const ICE_TOP = 24
const ICE_BOTTOM = 212
const PLAYER_Y = 194
const PLAYER_W = 8
const PLAYER_H = 8

let g

function init(api) {
  g = {
    px: api.W / 2 - 4,
    vx: 0.7,
    facing: 1,
    things: [],
    flakes: [],
    cracks: [],
    lives: 3,
    streak: 0,
    bestStreak: 0,
    spawnTimer: 0.8,
    hurt: 0,
    burst: 0,
    brake: 0,
    trail: [],
  }
  for (let i = 0; i < 28; i++) {
    g.flakes.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(12, ICE_BOTTOM - 1),
      speed: 0.15 + api.rnd(0.35),
    })
  }
  for (let i = 0; i < 14; i++) {
    g.cracks.push({
      x: api.rndi(8, api.W - 12),
      y: api.rndi(ICE_TOP + 8, ICE_BOTTOM - 8),
      len: api.rndi(3, 8),
    })
  }
  api.score(0)
}

function spawnThing(api) {
  const fishChance = Math.max(0.24, 0.42 - api.t * 0.0015)
  const fish = api.rnd() < fishChance
  g.things.push({
    x: api.rndi(4, api.W - 12),
    y: fish ? ICE_TOP - 8 : ICE_TOP,
    vx: fish ? api.rnd(0.5) - 0.25 : (api.rnd() < 0.5 ? -1 : 1) * (0.25 + api.rnd(0.35)),
    vy: (fish ? 1.05 : 0.85) + api.t * 0.018 + api.rnd(0.45),
    kind: fish ? 'fish' : 'seal',
    phase: api.rnd(6.28),
    dead: false,
  })
}

function makeTrail(api, kind) {
  if (g.trail.length < 24) {
    g.trail.push({
      x: g.px + (g.facing > 0 ? -2 : 8),
      y: PLAYER_Y + api.rndi(3, 7),
      life: kind === 'burst' ? 18 : 10,
      kind,
    })
  }
}

function hurtPlayer(api, thing) {
  if (g.hurt > 0 || api.t <= 2) return
  thing.dead = true
  g.lives--
  g.streak = 0
  g.hurt = 75
  g.vx = -g.facing * 3
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const steer = 0.12
  if (api.btn('left')) {
    g.vx -= steer
    g.facing = -1
  }
  if (api.btn('right')) {
    g.vx += steer
    g.facing = 1
  }

  if (api.btnp('a')) {
    const direction = api.btn('left') ? -1 : api.btn('right') ? 1 : g.facing
    g.vx += direction * 2.8
    g.burst = 18
    api.sfx('powerup')
    makeTrail(api, 'burst')
  }
  if (api.btn('b')) {
    g.vx *= 0.88
    g.brake = 5
    if (api.frame % 6 === 0) makeTrail(api, 'brake')
  } else {
    g.vx *= 0.994
  }

  g.vx = api.clamp(g.vx, -5.8, 5.8)
  g.px += g.vx
  if (g.px < 2) {
    g.px = 2
    g.vx = Math.abs(g.vx) * 0.65
    g.facing = 1
    api.sfx('jump')
  }
  if (g.px > api.W - PLAYER_W - 2) {
    g.px = api.W - PLAYER_W - 2
    g.vx = -Math.abs(g.vx) * 0.65
    g.facing = -1
    api.sfx('jump')
  }

  if (Math.abs(g.vx) > 3 && api.frame % 4 === 0) makeTrail(api, 'burst')
  if (g.burst > 0) g.burst--
  if (g.brake > 0) g.brake--
  if (g.hurt > 0) g.hurt--

  g.spawnTimer -= dt
  if (g.spawnTimer <= 0) {
    spawnThing(api)
    if (api.t > 14 && api.rnd() < Math.min(0.55, api.t * 0.008)) spawnThing(api)
    g.spawnTimer = Math.max(0.18, 0.92 - api.t * 0.012) + api.rnd(0.18)
  }

  for (const t of g.things) {
    t.y += t.vy
    t.x += t.vx + Math.sin(api.t * 3 + t.phase) * (t.kind === 'seal' ? 0.28 : 0.1)
    if (t.x < 1 || t.x > api.W - 9) t.vx *= -1
    if (t.dead) continue
    if (api.collide(g.px + 1, PLAYER_Y + 1, 6, 7, t.x + 1, t.y + 1, 6, 6)) {
      if (t.kind === 'fish') {
        t.dead = true
        g.streak++
        g.bestStreak = Math.max(g.bestStreak, g.streak)
        api.addScore(10 + Math.min(90, (g.streak - 1) * 5))
        api.sfx('coin')
        api.flash(10, 1)
      } else {
        hurtPlayer(api, t)
      }
    }
  }

  for (const t of g.things) {
    if (t.kind === 'fish' && t.y > api.H) g.streak = 0
  }
  g.things = g.things.filter((t) =>
    !t.dead && t.y < api.H + 10 && t.x > -12 && t.x < api.W + 12
  )

  for (const p of g.trail) p.life--
  g.trail = g.trail.filter((p) => p.life > 0)
}

function draw(api) {
  api.cls(12)

  api.rectfill(0, 12, api.W, 12, 1)
  api.rectfill(0, ICE_TOP, api.W, ICE_BOTTOM - ICE_TOP, 6)
  api.rectfill(0, ICE_TOP, api.W, 3, 7)
  api.rectfill(0, ICE_BOTTOM, api.W, api.H - ICE_BOTTOM, 12)
  api.rectfill(0, ICE_BOTTOM, api.W, 3, 1)

  for (const f of g.flakes) {
    const y = ICE_TOP + ((f.y - ICE_TOP + api.frame * f.speed) % (ICE_BOTTOM - ICE_TOP))
    api.pset(f.x, y, f.x % 3 === 0 ? 7 : 13)
  }
  for (const c of g.cracks) {
    api.line(c.x, c.y, c.x + c.len, c.y + 2, 12)
    api.line(c.x + c.len, c.y + 2, c.x + c.len + 2, c.y - 1, 12)
  }

  for (const p of g.trail) {
    if (p.kind === 'burst') api.spr(BURST, p.x, p.y - 3, g.facing < 0)
    else api.spr(PUFF, p.x, p.y - 3)
  }

  for (const t of g.things) {
    if (t.kind === 'fish') api.spr(FISH, t.x, t.y, t.vx < 0)
    else api.spr(SEAL, t.x, t.y, t.vx < 0)
  }

  if (g.hurt <= 0 || api.frame % 6 < 3) {
    const bob = Math.sin(api.t * 8) * Math.min(1, Math.abs(g.vx) * 0.2)
    api.spr(PENGUIN, g.px, PLAYER_Y + bob, g.facing < 0)
  }

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 14)
  if (g.streak > 1) api.text(`X${g.streak}`, 4, 14, 10)
  if (g.brake > 0) api.text('SKRR', 216, 14, 7)
}
