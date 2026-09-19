// TITLE: ICE FISH DASH
// GENRE: runner
// CONTROLS: left right a b
// Steer across the ice, hop over seals and cracks, and chain fish pickups.
// B brakes and slides the penguin backward. Three hits end the run.

const PENGUIN = [
  '..5555..',
  '.500005.',
  '.507705.',
  '.500005.',
  '55555555',
  '.5cccc5.',
  '..c55c..',
  '.99..99.',
]
const SEAL = [
  '...55...',
  '..5665..',
  '.566665.',
  '55677655',
  '55555555',
  '.555555.',
  '55....55',
]
const FISH = [
  '....cc..',
  '9..cccc.',
  '99cccccc',
  '9..cccc.',
  '....cc..',
]
const CRACK = [
  '.1......',
  '..11....',
  '...1.1..',
  '...111..',
  '.....11.',
  '......1.',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']
const PUFF = ['.7.7.', '77777', '.777.', '..7..']

const ICE_TOP = 28
const PLAYER_W = 8
const PLAYER_H = 8

let g

function init(api) {
  g = {
    px: api.W / 2 - 4,
    py: 184,
    baseY: 184,
    vx: 0,
    vy: 0,
    airborne: false,
    lives: 3,
    hurt: 0,
    speed: 1.7,
    scroll: 0,
    spawnIn: 190,
    things: [],
    chain: 0,
    puffs: [],
    floes: [],
  }
  for (let i = 0; i < 12; i++) {
    g.floes.push({
      x: api.rndi(0, api.W - 20),
      y: api.rndi(ICE_TOP, api.H - 8),
      w: api.rndi(10, 30),
    })
  }
  g.things.push({ x: api.W / 2 - 3, y: 105, kind: 'fish', dead: false })
  api.score(0)
}

function spawnThing(api) {
  const lane = api.rndi(0, 4)
  const x = 20 + lane * 53 + api.rndi(-8, 8)
  const hazardChance = 0.52 + Math.min(0.3, api.t * 0.004)
  const r = api.rnd()
  let kind = 'fish'
  if (r < hazardChance * 0.7) kind = 'seal'
  else if (r < hazardChance) kind = 'crack'
  g.things.push({ x: api.clamp(x, 3, api.W - 11), y: ICE_TOP - 10, kind, dead: false })
}

function makePuff(api, x, y) {
  if (g.puffs.length < 20) {
    g.puffs.push({
      x,
      y,
      vx: api.rnd(1.6) - 0.8,
      life: 18,
    })
  }
}

function hurtPlayer(api, thing) {
  if (g.hurt > 0 || api.t <= 2) return
  thing.dead = true
  g.lives--
  g.chain = 0
  g.hurt = 75
  g.vy = -3
  g.airborne = true
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const braking = api.btn('b')
  const steer = 0.42

  if (api.btn('left')) g.vx -= steer
  if (api.btn('right')) g.vx += steer
  g.vx *= 0.82
  g.px = api.clamp(g.px + g.vx, 8, api.W - PLAYER_W - 8)

  if (api.btnp('a')) {
    if (!g.airborne) {
      g.vy = -4.5
      g.airborne = true
    } else {
      g.vy -= 1.2
    }
    makePuff(api, g.px + 2, g.py + 7)
    api.sfx('jump')
  }

  if (braking) {
    g.baseY = Math.min(202, g.baseY + 0.7)
    if (api.frame % 5 === 0) makePuff(api, g.px + 3, g.py + 7)
  } else {
    g.baseY += (184 - g.baseY) * 0.12
  }

  g.vy += 0.25
  g.py += g.vy
  if (g.py >= g.baseY) {
    if (g.airborne && g.vy > 2) api.sfx('select')
    g.py = g.baseY
    g.vy = 0
    g.airborne = false
  }

  g.speed = (1.7 + api.t * 0.045) * (braking ? 0.48 : 1)
  g.scroll += g.speed

  g.spawnIn--
  if (g.spawnIn <= 0) {
    spawnThing(api)
    const density = 78 / (1 + api.t * 0.018)
    g.spawnIn = Math.max(18, density + api.rndi(-12, 12))
  }

  for (const t of g.things) {
    t.y += g.speed
    if (t.kind === 'fish') t.x += Math.sin(api.t * 5 + t.y * 0.05) * 0.25
    if (t.dead) continue

    const tw = t.kind === 'fish' ? 8 : 8
    const th = t.kind === 'crack' ? 6 : 7
    const safeHop = g.baseY - g.py > (t.kind === 'seal' ? 9 : 6)

    if (api.collide(g.px + 1, g.py + 1, 6, 7, t.x, t.y, tw, th)) {
      if (t.kind === 'fish') {
        t.dead = true
        g.chain++
        api.addScore(10 + Math.min(g.chain, 10) * 5)
        api.sfx('coin')
        api.flash(10, 1)
      } else if (!safeHop) {
        hurtPlayer(api, t)
      }
    }

    if (t.kind === 'fish' && t.y > api.H && !t.dead) g.chain = 0
  }

  for (const p of g.puffs) {
    p.x += p.vx
    p.y += 0.25
    p.life--
  }

  g.things = g.things.filter((t) => !t.dead && t.y < api.H + 12)
  g.puffs = g.puffs.filter((p) => p.life > 0)
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(12)

  api.rectfill(0, 12, api.W, 16, 1)
  api.rectfill(0, 26, api.W, 3, 7)
  for (let x = 0; x < api.W; x += 20) {
    api.circfill(x, 25, 10, x % 40 === 0 ? 6 : 7)
  }

  api.rectfill(7, ICE_TOP, api.W - 14, api.H - ICE_TOP, 6)
  api.rect(7, ICE_TOP, api.W - 14, api.H - ICE_TOP, 7)
  api.line(8, ICE_TOP, 8, api.H, 13)
  api.line(api.W - 9, ICE_TOP, api.W - 9, api.H, 13)

  for (const f of g.floes) {
    const y = ICE_TOP + ((f.y - ICE_TOP + g.scroll * 0.35) % (api.H - ICE_TOP))
    api.line(f.x, y, f.x + f.w, y, 7)
    api.pset(f.x + f.w / 2, y + 1, 13)
  }

  for (let y = ICE_TOP - (g.scroll % 32); y < api.H; y += 32) {
    api.line(12, y, 17, y + 3, 13)
    api.line(api.W - 18, y + 8, api.W - 13, y + 5, 7)
  }

  for (const t of g.things) {
    if (t.kind === 'fish') api.spr(FISH, t.x, t.y)
    else if (t.kind === 'seal') api.spr(SEAL, t.x, t.y)
    else api.spr(CRACK, t.x, t.y)
  }

  for (const p of g.puffs) api.spr(PUFF, p.x, p.y)

  api.rectfill(g.px + 1, g.baseY + 8, 7, 2, 13)
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(PENGUIN, g.px, g.py)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 10 + i * 7, 15)
  if (g.chain > 1) api.text(`X${g.chain}`, 218, 15, 10)
}
