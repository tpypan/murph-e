// TITLE: DUEL BYTE
// GENRE: dodge
// CONTROLS: left right a b
// Close in, strike, and dash through a one-screen neon duel.

const HERO = [
  '..cccc..',
  '.c7777c.',
  '.c7c17c.',
  '..7777..',
  '.cc88cc.',
  'c.c88c.c',
  '..c..c..',
  '.cc..cc.',
]
const RIVAL = [
  '..eeee..',
  '.e7777e.',
  '.e7e17e.',
  '..7777..',
  '.ee99ee.',
  'e.e99e.e',
  '..e..e..',
  '.ee..ee.',
]
const BLADE = [
  '......7.',
  '.....7c.',
  '....7c..',
  '...7c...',
  '..7c....',
  '.7c.....',
  '44......',
  '44......',
]
const SPARK = [
  '..a...',
  'a.a.a.',
  '.aaa..',
  'aaaaaa',
  '.aaa..',
  'a.a.a.',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const FLOOR_Y = 195
const FIGHTER_W = 8
const FIGHTER_H = 8
let g

function init(api) {
  g = {
    px: 48,
    pv: 0,
    pf: 1,
    pHealth: 5,
    pHurt: 0,
    pAttack: 0,
    pCooldown: 0,
    dash: 0,
    dashCooldown: 0,
    ex: 200,
    ev: 0,
    ef: -1,
    eHurt: 0,
    eAttack: 0,
    eCooldown: 150,
    think: 0,
    sparks: [],
    lights: [],
  }
  for (let i = 0; i < 25; i++) {
    g.lights.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(16, 164),
      speed: api.rnd(0.25) + 0.1,
    })
  }
  api.score(0)
}

function burst(api, x, colour) {
  for (let i = 0; i < 8; i++) {
    g.sparks.push({
      x,
      y: FLOOR_Y - 8,
      vx: api.rnd(3) - 1.5,
      vy: api.rnd(3) - 2.3,
      life: api.rndi(10, 22),
      colour,
    })
  }
}

function playerStrike(api) {
  g.pAttack = 10
  api.sfx('shoot')
  burst(api, g.px + 4 + g.pf * 7, 10)

  if (g.pCooldown > 0) return
  g.pCooldown = 17
  const tip = g.px + (g.pf > 0 ? 7 : -8)
  if (g.eHurt <= 0 && Math.abs(g.ex - tip) < 17) {
    g.eHurt = 28
    g.ev = g.pf * 3.8
    api.addScore(1)
    api.sfx('hit')
    api.flash(10, 1)
    burst(api, (g.px + g.ex) / 2 + 4, 10)
  }
}

function enemyStrike(api) {
  g.eAttack = 12
  g.eCooldown = Math.max(18, 65 - api.t * 0.8)
  api.sfx('shoot')
  const tip = g.ex + (g.ef > 0 ? 7 : -8)
  if (g.pHurt <= 0 && Math.abs(g.px - tip) < 17) hurtPlayer(api)
}

function hurtPlayer(api) {
  if (g.pHurt > 0 || api.t <= 2) return
  g.pHealth--
  g.pHurt = 65
  g.pv = g.ef * 4.5
  burst(api, g.px + 4, 8)
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.pHealth <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  const enemySpeed = 0.65 + api.t * 0.018

  if (api.btn('left')) {
    g.pv -= 0.45
    g.pf = -1
  }
  if (api.btn('right')) {
    g.pv += 0.45
    g.pf = 1
  }

  if (api.btnp('a')) playerStrike(api)
  if (api.btnp('b')) {
    let direction = g.pf
    if (api.btn('left')) direction = -1
    if (api.btn('right')) direction = 1
    g.pf = direction
    g.pv = direction * (g.dashCooldown <= 0 ? 7 : 3.5)
    g.dash = g.dashCooldown <= 0 ? 9 : 4
    if (g.dashCooldown <= 0) g.dashCooldown = 28
    api.sfx('jump')
    burst(api, g.px + 4, 12)
  }

  const oldPx = g.px
  g.pv *= g.dash > 0 ? 0.9 : 0.78
  g.px = api.clamp(g.px + g.pv, 8, api.W - 16)
  if (g.dash > 0) {
    if (api.frame % 2 === 0) {
      g.sparks.push({
        x: oldPx + 4,
        y: FLOOR_Y - 4,
        vx: -g.pf,
        vy: 0,
        life: 8,
        colour: 12,
      })
    }
    g.dash--
  }

  const gap = g.px - g.ex
  g.ef = gap < 0 ? -1 : 1
  if (g.eHurt <= 0) {
    if (Math.abs(gap) > 19) {
      g.ev += (gap < 0 ? -1 : 1) * (0.08 + enemySpeed * 0.04)
    } else {
      g.ev -= (gap < 0 ? -1 : 1) * 0.035
    }
    g.think--
    if (g.think <= 0) {
      g.think = api.rndi(12, 35)
      if (api.rnd() < 0.18 + api.t * 0.003) {
        g.ev += (api.rnd() < 0.5 ? -1 : 1) * 2
      }
    }
    if (g.eCooldown <= 0 && Math.abs(gap) < 22) enemyStrike(api)
  }

  g.ev *= 0.88
  g.ex = api.clamp(g.ex + g.ev, 8, api.W - 16)
  if (Math.abs(g.px - g.ex) < 7) {
    const push = g.px < g.ex ? -0.35 : 0.35
    g.px = api.clamp(g.px + push, 8, api.W - 16)
    g.ex = api.clamp(g.ex - push, 8, api.W - 16)
  }

  for (const s of g.sparks) {
    s.x += s.vx
    s.y += s.vy
    s.vy += 0.12
    s.life--
  }
  g.sparks = g.sparks.filter((s) => s.life > 0 && s.y < api.H)

  if (g.pAttack > 0) g.pAttack--
  if (g.eAttack > 0) g.eAttack--
  if (g.pCooldown > 0) g.pCooldown--
  if (g.eCooldown > 0) g.eCooldown--
  if (g.dashCooldown > 0) g.dashCooldown--
  if (g.pHurt > 0) g.pHurt--
  if (g.eHurt > 0) g.eHurt--
}

function draw(api) {
  api.cls(1)

  for (const l of g.lights) {
    const y = 16 + ((l.y - 16 + api.frame * l.speed) % 148)
    api.pset(l.x, y, l.x % 3 === 0 ? 13 : 12)
  }

  api.rect(5, 15, api.W - 10, 183, 13)
  api.line(5, 45, 250, 45, 2)
  api.line(5, 165, 250, 165, 12)
  for (let x = 8; x < api.W; x += 24) api.line(128, 165, x, FLOOR_Y, 2)
  for (let y = 171; y < FLOOR_Y; y += 7) api.line(6, y, 249, y, 5)

  api.rectfill(0, FLOOR_Y, api.W, api.H - FLOOR_Y, 2)
  api.rectfill(0, FLOOR_Y, api.W, 3, 14)
  for (let x = 0; x < api.W; x += 16) {
    api.rectfill(x, 207, 8, 2, x % 32 === 0 ? 12 : 8)
  }

  if (g.pAttack > 0) {
    const bx = g.pf > 0 ? g.px + 7 : g.px - 7
    api.spr(BLADE, bx, FLOOR_Y - 16, g.pf < 0)
  }
  if (g.eAttack > 0) {
    const bx = g.ef > 0 ? g.ex + 7 : g.ex - 7
    api.spr(BLADE, bx, FLOOR_Y - 16, g.ef < 0)
  }

  for (const s of g.sparks) {
    if (s.life > 12) api.spr(SPARK, s.x - 3, s.y - 3)
    else api.pset(s.x, s.y, s.colour)
  }

  const bob = Math.sin(api.t * 7) * 1.2
  if (g.pHurt <= 0 || api.frame % 6 < 3) {
    api.spr(HERO, g.px, FLOOR_Y - FIGHTER_H + bob, g.pf < 0)
  }
  if (g.eHurt <= 0 || api.frame % 5 < 2) {
    api.spr(RIVAL, g.ex, FLOOR_Y - FIGHTER_H - bob, g.ef < 0)
  }

  api.text('YOU', 7, 18, 12)
  api.rect(7, 28, 52, 6, 7)
  api.rectfill(9, 30, g.pHealth * 10, 2, 11)
  api.text('CPU', 225, 18, 14)
  api.rect(197, 28, 52, 6, 7)
  const pressure = Math.max(1, 50 - Math.floor(api.t / 3))
  api.rectfill(199 + 50 - pressure, 30, pressure, 2, 9)

  for (let i = 0; i < g.pHealth; i++) api.spr(HEART, 108 + i * 8, 16)
}
