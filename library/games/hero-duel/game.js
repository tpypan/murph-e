// TITLE: HERO DUEL
// GENRE: versus
// PLAYERS: 2
// CONTROLS: up down left right a b

const GADGET = [
  '..2222..',
  '.2c22c2.',
  '.222222.',
  '..cccc..',
  '.2c22c2.',
  '22c22c22',
  '..c..c..',
  '.cc..cc.',
]
const POWER = [
  '..8888..',
  '.8a88a8.',
  '.888888.',
  '..7777..',
  '.888888.',
  '88a88a88',
  '..8..8..',
  '.88..88.',
]
const SIGN = [
  '..bbbb..',
  '.b7777b.',
  'b7bb777b',
  'b7777b7b',
  '.bbbbbb.',
  '...bb...',
  '...bb...',
  '..5555..',
]
const CAR = [
  '..666666..',
  '.67777776.',
  '6677777766',
  '9999999999',
  '95.9999.59',
  '.5......5.',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']
const TOP = 14
const FLOOR = 190
const PW = 8
const PH = 8
const ROUND_TIME = 32

let g

function init(api) {
  g = {
    players: [
      { x: 38, y: FLOOR - PH, vx: 0, vy: 0, face: 1, hp: 5, wins: 0, cool: 0, hurt: 0, attack: 0, kind: 0 },
      { x: 210, y: FLOOR - PH, vx: 0, vy: 0, face: -1, hp: 5, wins: 0, cool: 0, hurt: 0, attack: 0, kind: 0 },
    ],
    signs: [{ x: 124, y: 92, vx: 0.45, vy: 0.25 }],
    hazards: [],
    roundFrame: 0,
    hazardClock: 240,
    shrink: 0,
    roundPause: 0,
    roundWinner: -1,
    over: false,
  }
  api.score(0, 0)
  api.score(0, 1)
}

function resetRound(api) {
  for (let i = 0; i < 2; i++) {
    const p = g.players[i]
    p.x = i === 0 ? 38 : 210
    p.y = FLOOR - PH
    p.vx = 0
    p.vy = 0
    p.face = i === 0 ? 1 : -1
    p.hp = 5
    p.cool = 0
    p.hurt = 60
    p.attack = 0
  }
  g.roundFrame = 0
  g.shrink = 0
  g.hazards = []
  g.roundPause = 0
  g.roundWinner = -1
}

function attack(api, p, i, power) {
  p.kind = power
  p.attack = power ? 15 : 8
  p.cool = power ? 35 : 17
  p.vx += p.face * (power ? 1.2 : 0.45)
  api.sfx(power ? 'jump' : 'shoot')
  const other = g.players[1 - i]
  const reach = power ? 18 : 13
  const ax = p.face > 0 ? p.x + PW : p.x - reach
  if (api.collide(ax, p.y - 2, reach, PH + 4, other.x, other.y, PW, PH)) {
    hurt(api, 1 - i, i, power ? 2 : 1, power ? 3.7 : 2.4)
  }
}

function hurt(api, victim, attacker, damage, force) {
  const p = g.players[victim]
  if (p.hurt > 0 || g.roundPause > 0) return
  p.hp -= damage
  p.hurt = 38
  p.vx = (p.x < g.players[attacker].x ? -1 : 1) * force
  p.vy = -2.2
  api.addScore(damage * 10, attacker)
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (p.hp <= 0) winRound(api, attacker)
}

function winRound(api, winner) {
  if (g.roundPause > 0 || g.over) return
  g.players[winner].wins++
  g.roundWinner = winner
  g.roundPause = 100
  api.addScore(100, winner)
  api.sfx('explode')
  api.flash(10, 2)
  api.shake(14)
}

function moveHero(api, p, i) {
  if (p.hurt > 0) p.hurt--
  if (p.cool > 0) p.cool--
  if (p.attack > 0) p.attack--
  let dx = 0
  if (api.btn('left', i)) dx--
  if (api.btn('right', i)) dx++
  if (dx) {
    p.face = dx
    p.vx += dx * 0.32
  }
  const grounded = p.y >= FLOOR - PH
  if (api.btnp('up', i) && grounded) {
    p.vy = -4.5
    api.sfx('jump')
  }
  if (api.btnp('a', i) && p.cool === 0) attack(api, p, i, false)
  if (api.btnp('b', i) && p.cool === 0) attack(api, p, i, true)
  const crouch = api.btn('down', i) && grounded
  p.vx *= crouch ? 0.68 : 0.85
  p.vx = api.clamp(p.vx, -2.4, 2.4)
  p.vy += 0.22
  p.x += p.vx
  p.y += p.vy
  if (p.y >= FLOOR - PH) {
    p.y = FLOOR - PH
    p.vy = 0
  }
  const edge = 5 + g.shrink
  p.x = api.clamp(p.x, edge, api.W - edge - PW)
}

function update(api, dt) {
  if (g.over) return
  if (g.roundPause > 0) {
    g.roundPause--
    if (g.roundPause === 0) {
      if (g.players[g.roundWinner].wins >= 2) {
        g.over = true
        api.win(g.roundWinner)
      } else resetRound(api)
    }
    return
  }

  g.roundFrame++
  for (let i = 0; i < 2; i++) moveHero(api, g.players[i], i)

  if (g.roundFrame > 600) g.shrink += 0.025 + g.roundFrame * 0.00001
  const remaining = ROUND_TIME * 60 - g.roundFrame
  if (remaining <= 0) {
    const winner = g.players[0].hp === g.players[1].hp ? api.rndi(0, 1) :
      (g.players[0].hp > g.players[1].hp ? 0 : 1)
    winRound(api, winner)
  }

  g.hazardClock--
  if (g.hazardClock <= 0) {
    const fromLeft = api.rnd() < 0.5
    g.hazards.push({ x: fromLeft ? -12 : api.W + 2, y: FLOOR - 6, vx: fromLeft ? 2.2 : -2.2 })
    g.hazardClock = Math.max(70, 230 - api.t * 3)
    api.sfx('select')
  }
  for (const h of g.hazards) {
    h.x += h.vx * (1 + api.t * 0.008)
    for (let i = 0; i < 2; i++) {
      const p = g.players[i]
      if (!h.dead && api.collide(h.x, h.y, 10, 6, p.x, p.y, PW, PH)) {
        h.dead = true
        hurt(api, i, 1 - i, 1, 3)
      }
    }
  }
  g.hazards = g.hazards.filter((h) => !h.dead && h.x > -16 && h.x < api.W + 16)

  for (const s of g.signs) {
    s.x += s.vx
    s.y += s.vy
    if (s.x < 12 || s.x > api.W - 20) s.vx = -s.vx
    if (s.y < 65 || s.y > 125) s.vy = -s.vy
    for (let i = 0; i < 2; i++) {
      const p = g.players[i]
      if (api.collide(s.x, s.y, 8, 8, p.x, p.y, PW, PH)) {
        api.addScore(25, i)
        p.hp = Math.min(5, p.hp + 1)
        api.sfx('coin')
        api.flash(10, 1)
        s.x = api.rndi(30, 220)
        s.y = api.rndi(65, 125)
      }
    }
  }
}

function draw(api) {
  api.cls(12)
  api.rectfill(0, 14, api.W, 84, 13)
  api.circfill(215, 38, 14, 10)
  for (let x = 5; x < api.W; x += 22) {
    const h = 30 + (x * 7 % 35)
    api.rectfill(x, 98 - h, 18, h, x % 3 ? 5 : 2)
    api.rectfill(x + 4, 75, 4, 5, 10)
    api.rectfill(x + 11, 62, 4, 5, 10)
  }
  api.rectfill(0, 98, api.W, 22, 3)
  api.line(0, 119, api.W, 119, 11)
  api.rectfill(0, 120, api.W, 70, 6)
  for (let x = -16; x < api.W; x += 32) api.rectfill(x + (api.frame % 32), 153, 17, 3, 10)
  api.rectfill(0, FLOOR, api.W, api.H - FLOOR, 4)
  api.line(0, FLOOR, api.W, FLOOR, 7)
  api.text('WATERLOO', 92, 103, 7)

  if (g.shrink > 0) {
    const s = g.shrink
    const c = api.frame % 8 < 4 ? 8 : 9
    api.rectfill(0, TOP, s, api.H - TOP, c)
    api.rectfill(api.W - s, TOP, s, api.H - TOP, c)
  }

  for (const s of g.signs) api.spr(SIGN, s.x, s.y)
  for (const h of g.hazards) api.spr(CAR, h.x, h.y, h.vx < 0)

  for (let i = 0; i < 2; i++) {
    const p = g.players[i]
    const crouch = api.btn('down', i) && p.y >= FLOOR - PH
    if (p.hurt > 0 && api.frame % 6 < 3) continue
    const col = i === 0 ? api.P1 : api.P2
    api.rectfill(p.x - 1, p.y - 1 + (crouch ? 3 : 0), PW + 2, PH + 2 - (crouch ? 3 : 0), col)
    api.spr(i === 0 ? GADGET : POWER, p.x, p.y + (crouch ? 3 : 0), p.face < 0)
    if (p.attack > 0) {
      const reach = p.kind ? 11 : 7
      const ax = p.face > 0 ? p.x + PW : p.x - reach
      api.rectfill(ax, p.y + 2, reach, p.kind ? 4 : 2, p.kind ? 10 : 7)
    }
    for (let h = 0; h < p.hp; h++) api.rectfill(i === 0 ? 4 + h * 7 : 217 + h * 7, 17, 5, 3, col)
    for (let w = 0; w < p.wins; w++) api.spr(HEART, i === 0 ? 4 + w * 7 : 240 - w * 7, 23)
  }

  const secs = Math.max(0, Math.ceil((ROUND_TIME * 60 - g.roundFrame) / 60))
  api.textCenter('' + secs, 16, secs < 6 ? 8 : 7)
  if (g.roundPause > 0) api.textCenter('K.O.', 72, 10, 2)
}
