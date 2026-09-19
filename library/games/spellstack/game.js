// TITLE: SPELLSTACK
// GENRE: VERSUS
// PLAYERS: 2
// CONTROLS: UP DOWN LEFT RIGHT A B
// Bounce fireballs through a haunted library. Burning book piles become
// temporary walls, shelves collapse, and the cursed arena closes in.

const WIZARD = [
  '...7....',
  '..777...',
  '.77777..',
  '..7f7...',
  '.7c7c7..',
  '7777777.',
  '.7...7..',
  '7.....7.',
]
const FIREBALL = ['.9a.', '9aaa', 'aa79', '.99.']
const BOOK = ['.44444.', '4666664', '4c9c4c4', '4666664', '.44444.']
const FLAME = ['..a...', '.a9...', '.9a9..', '9a8a9.', '.888..', '..8...']
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']
const GHOST = ['.777.', '7d7d7', '77777', '.7.7.']
const TOP = 14
const SIZE = 8
const SHELVES = [
  { x: 58, y: 54, w: 10, h: 40 },
  { x: 188, y: 54, w: 10, h: 40 },
  { x: 58, y: 144, w: 10, h: 40 },
  { x: 188, y: 144, w: 10, h: 40 },
  { x: 113, y: 102, w: 30, h: 10 },
]
let g

function init(api) {
  g = {
    players: [
      { x: 22, y: 112, fx: 1, fy: 0, lives: 3, cool: 0, blink: 0, hurt: 0 },
      { x: 226, y: 112, fx: -1, fy: 0, lives: 3, cool: 0, blink: 0, hurt: 0 },
    ],
    balls: [],
    piles: [
      { x: 84, y: 72, burn: 0 },
      { x: 164, y: 72, burn: 0 },
      { x: 84, y: 166, burn: 0 },
      { x: 164, y: 166, burn: 0 },
    ],
    books: [],
    ghosts: [
      { x: 120, y: 35, vx: 0.45 },
      { x: 130, y: 194, vx: -0.35 },
    ],
    fallTimer: 4,
    close: 0,
    over: false,
  }
  api.score(0, 0)
  api.score(0, 1)
}

function solid(api, x, y) {
  if (x < 3 || y < TOP + 3 || x + SIZE > api.W - 3 || y + SIZE > api.H - 3) return true
  for (const s of SHELVES)
    if (api.collide(x, y, SIZE, SIZE, s.x, s.y, s.w, s.h)) return true
  for (const p of g.piles)
    if (p.burn > 0 && api.collide(x, y, SIZE, SIZE, p.x, p.y, 8, 8)) return true
  return false
}

function hurt(api, victim, attacker) {
  const p = g.players[victim]
  if (p.hurt > 0 || g.over) return
  p.lives--
  p.hurt = 55
  if (attacker >= 0) api.addScore(1, attacker)
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (p.lives <= 0) {
    g.over = true
    const winner = attacker >= 0 ? attacker : 1 - victim
    const bonus = Math.max(1, Math.floor((45 - api.t) / 5))
    api.addScore(bonus, winner)
    api.sfx('die')
    api.win(winner)
  }
}

function moveWizard(api, p, i) {
  let dx = 0
  let dy = 0
  if (api.btn('left', i)) dx--
  if (api.btn('right', i)) dx++
  if (api.btn('up', i)) dy--
  if (api.btn('down', i)) dy++
  if (dx || dy) {
    const d = Math.sqrt(dx * dx + dy * dy)
    dx /= d
    dy /= d
    p.fx = dx
    p.fy = dy
  }
  const nx = p.x + dx * 1.55
  const ny = p.y + dy * 1.55
  if (!solid(api, nx, p.y)) p.x = nx
  if (!solid(api, p.x, ny)) p.y = ny

  if (p.blink > 0) p.blink--
  if (api.btnp('b', i)) {
    const bx = p.x + p.fx * (p.blink === 0 ? 28 : 5)
    const by = p.y + p.fy * (p.blink === 0 ? 28 : 5)
    if (p.blink === 0 && !solid(api, bx, by)) {
      p.x = bx
      p.y = by
      p.blink = 100
    }
    api.sfx('jump')
  }

  if (p.cool > 0) p.cool--
  if (api.btnp('a', i)) {
    const speed = 2.8 + api.t * 0.018
    g.balls.push({
      x: p.x + 2 + p.fx * 5,
      y: p.y + 2 + p.fy * 5,
      vx: p.fx * speed,
      vy: p.fy * speed,
      owner: i,
      life: 300,
    })
    p.cool = 14
    api.sfx('shoot')
  }
  if (p.hurt > 0) p.hurt--
}

function updateFireballs(api) {
  for (const b of g.balls) {
    b.x += b.vx
    b.y += b.vy
    b.life--
    if (b.x < 3 || b.x > api.W - 7) {
      b.vx = -b.vx
      b.x = api.clamp(b.x, 3, api.W - 7)
      api.sfx('select')
    }
    if (b.y < TOP + 3 || b.y > api.H - 7) {
      b.vy = -b.vy
      b.y = api.clamp(b.y, TOP + 3, api.H - 7)
      api.sfx('select')
    }
    for (const s of SHELVES) {
      if (api.collide(b.x, b.y, 4, 4, s.x, s.y, s.w, s.h)) {
        const cx = s.x + s.w / 2
        const cy = s.y + s.h / 2
        if (Math.abs(b.x - cx) / s.w > Math.abs(b.y - cy) / s.h) b.vx = -b.vx
        else b.vy = -b.vy
        b.x += b.vx
        b.y += b.vy
        api.sfx('select')
      }
    }
    for (const p of g.piles) {
      if (api.collide(b.x, b.y, 4, 4, p.x, p.y, 8, 8)) {
        p.burn = 240
        b.dead = true
        api.sfx('explode')
      }
    }
    const rival = g.players[1 - b.owner]
    if (!b.dead && api.collide(b.x, b.y, 4, 4, rival.x, rival.y, SIZE, SIZE)) {
      b.dead = true
      hurt(api, 1 - b.owner, b.owner)
    }
  }
  g.balls = g.balls.filter(b =>
    !b.dead && b.life > 0 && b.x > -8 && b.x < api.W + 8 &&
    b.y > TOP - 8 && b.y < api.H + 8
  )
}

function update(api, dt) {
  for (let i = 0; i < 2; i++) moveWizard(api, g.players[i], i)
  updateFireballs(api)

  for (const p of g.piles) {
    if (p.burn > 0) {
      p.burn--
      for (let i = 0; i < 2; i++)
        if (api.collide(p.x - 3, p.y - 5, 14, 16,
          g.players[i].x, g.players[i].y, SIZE, SIZE)) hurt(api, i, 1 - i)
    }
  }

  g.fallTimer -= dt
  if (g.fallTimer <= 0) {
    g.books.push({
      x: api.rndi(8, api.W - 14), y: TOP, vy: 1 + api.t * 0.025,
      spin: api.rndi(0, 1), owner: api.rndi(0, 1),
    })
    if (api.t > 22) g.books.push({
      x: api.rndi(8, api.W - 14), y: TOP, vy: 1.2 + api.t * 0.025,
      spin: 0, owner: api.rndi(0, 1),
    })
    g.fallTimer = Math.max(0.35, 2.2 - api.t * 0.035)
  }
  for (const b of g.books) {
    b.y += b.vy
    for (let i = 0; i < 2; i++) {
      const p = g.players[i]
      if (!b.dead && api.collide(b.x, b.y, 7, 7, p.x, p.y, SIZE, SIZE)) {
        b.dead = true
        hurt(api, i, 1 - i)
      }
    }
  }
  g.books = g.books.filter(b => !b.dead && b.y < api.H + 8)

  if (api.t > 18) g.close = (api.t - 18) * 2.4
  for (let i = 0; i < 2; i++) {
    const p = g.players[i]
    const doomed = p.x < g.close || p.x + SIZE > api.W - g.close ||
      p.y < TOP + g.close || p.y + SIZE > api.H - g.close
    if (doomed && api.frame % 40 === 0) hurt(api, i, 1 - i)
  }

  for (const h of g.ghosts) {
    h.x += h.vx
    if (h.x < 8 || h.x > api.W - 14) h.vx = -h.vx
  }
}

function draw(api) {
  api.cls(2)
  for (let y = TOP; y < api.H; y += 16)
    for (let x = 0; x < api.W; x += 16)
      api.rectfill(x, y, 15, 15, (x + y) % 32 ? 4 : 5)
  api.rect(1, TOP, api.W - 2, api.H - TOP - 1, 13)

  for (const s of SHELVES) {
    api.rectfill(s.x, s.y, s.w, s.h, 3)
    api.rect(s.x, s.y, s.w, s.h, 10)
    for (let y = s.y + 3; y < s.y + s.h - 2; y += 7)
      api.line(s.x + 2, y, s.x + s.w - 2, y, (y / 7) % 2 ? 8 : 12)
  }
  for (const h of g.ghosts) api.spr(GHOST, h.x, h.y)

  if (g.close > 0) {
    const s = g.close
    const c = api.frame % 8 < 4 ? 1 : 2
    api.rectfill(0, TOP, s, api.H - TOP, c)
    api.rectfill(api.W - s, TOP, s, api.H - TOP, c)
    api.rectfill(0, TOP, api.W, s, c)
    api.rectfill(0, api.H - s, api.W, s, c)
  }

  for (const p of g.piles) {
    api.spr(BOOK, p.x, p.y)
    if (p.burn > 0) api.spr(FLAME, p.x + 1, p.y - 5)
  }
  for (const b of g.books)
    api.spr(BOOK, b.x, b.y, b.spin && api.frame % 8 < 4, false)
  for (const b of g.balls) api.spr(FIREBALL, b.x, b.y)

  for (let i = 0; i < 2; i++) {
    const p = g.players[i]
    if (p.hurt > 0 && api.frame % 6 < 3) continue
    const c = i === 0 ? api.P2 : api.P1
    api.rectfill(p.x, p.y + 2, SIZE, 6, c)
    api.spr(WIZARD, p.x, p.y)
    api.pset(p.x + 3 + p.fx * 5, p.y + 4 + p.fy * 5, 10)
    for (let h = 0; h < p.lives; h++)
      api.spr(HEART, i === 0 ? 63 + h * 7 : 172 + h * 7, 4)
  }
}
