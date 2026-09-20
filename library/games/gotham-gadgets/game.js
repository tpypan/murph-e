// TITLE: GOTHAM GADGETS
// GENRE: platformer
// CONTROLS: left right a b
// A: variable-height jump. B: grapple to a marked beacon once airborne.
// Survive four 20-second districts before dawn. Damage breaks gadget chains.
const BATMAN = [
  '...1......1.....',
  '...11....11.....',
  '...11111111.....',
  '...17 forgiving....', // Replaced below by the fixed silhouette.
]
const HERO = [
  '...1......1.....',
  '...11....11.....',
  '...11111111.....',
  '...17111711.....',
  '...11ff1111.....',
  '..1116611111....',
  '.111666611111...',
  '11166a1a661111..',
  '11166aaa661111..',
  '111666666611111.',
  '11166aaaa611111.',
  '111666666611111.',
  '111166661111111.',
  '111166661111111.',
  '111166661111111.',
  '111166661111111.',
  '11.1666611.1111.',
  '1..1666611..111.',
  '...116611....11.',
  '...11..11.....1.',
  '...11..11.......',
  '..111..111......',
]
const DRONE = ['.5......5.', '555cccc555', '.cc7887cc.', '..cccccc..', '...9aa9...']
const RANG = ['1......1', '11.11.11', '.111111.', '..1..1..']
const GRAPNEL = ['..6666..', '.67..76.', '..6..6..', '...66...', '...44...', '...44...']
const SIGNAL = ['..aaaa..', '.a1111a.', 'aa1aa1aa', '.a1111a.', '..aaaa..', '...66...']
const GADGETS = [RANG, GRAPNEL, SIGNAL]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']
let g

function init(api) {
  g = { x: 16, y: 162, vy: 0, ground: true, coyote: 0.1,
    buffer: 0, face: 1, hearts: 3, hurt: 0, chain: 0, used: false,
    rope: null, district: 0, slide: 0, done: false, roofs: [],
    items: [], drones: [], anchors: [], buildings: [], pop: 0 }
  for (let i = 0; i < 16; i++)
    g.buildings.push({ x: i * 18, y: api.rndi(65, 125), w: api.rndi(12, 22) })
  makeDistrict(api)
  api.score(0)
}

function makeDistrict(api) {
  const risky = g.district % 2 === 1
  g.roofs = [
    { x: 0, y: 184, w: 78, h: 40 },
    { x: 98, y: 180, w: 62, h: 44 },
    { x: 182, y: 184, w: 74, h: 40 },
    { x: 48, y: 174, w: 12, h: 10 },
    { x: 210, y: 172, w: 12, h: 12 },
    { x: 115, y: 150, w: risky ? 25 : 40, h: 6 },
  ]
  g.anchors = [{ x: 128, y: 150 }, { x: 235, y: 184 }]
  g.items = []
  const spots = [30, 66, 110, 145, 193, 236]
  for (let i = 0; i < spots.length; i++)
    g.items.push({ x: spots[i], y: i === 2 || i === 3 ? 168 : 172, kind: i % 3 })
  g.items.push({ x: 124, y: 138, kind: 2 })
  if (risky) g.items.push({ x: 137, y: 126, kind: 1 })
  g.drones = [{ x: 200, y: 153, phase: 0 }]
  if (risky) g.drones.push({ x: 135, y: 120, phase: 2.4 })
  g.x = 16
  g.y = 162
  g.vy = 0
  g.ground = true
  g.coyote = 0.1
  g.rope = null
  g.used = false
  g.slide = g.district ? 256 : 0
}

function damage(api, fallen) {
  if (g.hurt <= 0) {
    g.hearts--
    g.chain = 0
    g.hurt = 1.6
    api.sfx('hit')
    api.flash(8, 3)
    api.shake(10)
    if (g.hearts === 0 && api.t > 2) {
      g.done = true
      api.sfx('die')
      api.gameOver()
    }
  }
  if (fallen) {
    g.x = 16
    g.y = 162
    g.vy = 0
    g.ground = true
    g.used = false
    g.rope = null
  }
}

function update(api, dt) {
  if (g.done) return
  if (api.t >= 80) {
    g.done = true
    api.sfx('powerup')
    api.win()
    return
  }
  const district = Math.floor(api.t / 20)
  if (district !== g.district) {
    g.district = district
    makeDistrict(api)
    api.sfx('select')
  }
  g.slide = Math.max(0, g.slide - 640 * dt)
  g.hurt = Math.max(0, g.hurt - dt)
  g.pop = Math.max(0, g.pop - dt)
  g.buffer = api.btnp('a') ? 0.1 : Math.max(0, g.buffer - dt)
  g.coyote = g.ground ? 0.1 : Math.max(0, g.coyote - dt)
  if (g.buffer > 0 && g.coyote > 0 && !g.rope) {
    g.vy = -200
    g.ground = false
    g.coyote = 0
    g.buffer = 0
    api.sfx('jump')
  }
  if (!api.btn('a') && g.vy < -85 && !g.rope) g.vy = -85
  const move = (api.btn('right') ? 1 : 0) - (api.btn('left') ? 1 : 0)
  if (move) g.face = move
  if (api.btnp('b') && !g.ground && !g.used) {
    let target = null
    let best = 106
    for (const a of g.anchors) {
      const d = api.dist(g.x + 8, g.y + 22, a.x, a.y)
      if (d < best && (a.x - g.x - 8) * g.face > 0) { best = d; target = a }
    }
    if (target) {
      g.rope = target
      g.used = true
      api.sfx('shoot')
    }
  }
  if (g.rope) {
    const dx = g.rope.x - 8 - g.x
    const dy = g.rope.y - 24 - g.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < 4) { g.rope = null; g.vy = 0 }
    else { g.x += dx / d * Math.min(d, 180 * dt); g.y += dy / d * Math.min(d, 180 * dt) }
  } else {
    g.x = api.clamp(g.x + move * (86 + 8 * Math.min(1, api.t / 30)) * dt, 0, 240)
    for (const p of g.roofs) {
      if (api.collide(g.x + 3, g.y + 2, 10, 19, p.x, p.y, p.w, p.h))
        g.x = move > 0 ? p.x - 13 : move < 0 ? p.x + p.w - 3 : g.x
    }
    const bottom = g.y + 22
    g.y += g.vy * dt + 312.5 * dt * dt
    g.vy = Math.min(260, g.vy + 625 * dt)
    const wasGround = g.ground
    g.ground = false
    for (const p of g.roofs) {
      if (g.vy >= 0 && bottom <= p.y + 0.1 && g.y + 22 >= p.y &&
          g.x + 13 > p.x && g.x + 3 < p.x + p.w) {
        g.y = p.y - 22
        g.vy = 0
        g.ground = true
        g.used = false
        if (!wasGround) api.sfx('jump')
      }
    }
  }
  if (g.y > 224) damage(api, true)
  for (const item of g.items) {
    if (!item.dead && api.collide(g.x + 2, g.y, 12, 22, item.x, item.y, 8, 6)) {
      item.dead = true
      g.chain++
      api.addScore(g.chain >= 3 ? 200 : 100)
      g.pop = 0.6
      api.sfx('coin')
      api.flash(10, 1)
    }
  }
  g.items = g.items.filter(i => !i.dead)
  for (const d of g.drones) {
    const recovery = api.t % 20 < 4
    d.x = 190 + Math.sin(api.t * (0.75 + Math.min(api.t / 30, 1) * 0.4) + d.phase) * 43
    if (!recovery && g.hurt <= 0 && api.collide(g.x + 3, g.y + 3, 10, 18, d.x, d.y, 10, 5))
      damage(api, false)
  }
}

function draw(api) {
  api.cls(1)
  api.circfill(215, 42, 15, 6)
  for (const b of g.buildings) {
    api.rectfill(b.x, b.y, b.w, 159, 2)
    for (let y = b.y + 8; y < 210; y += 16) api.rectfill(b.x + 4, y, 2, 4, 5)
  }
  for (let i = 0; i < 16; i++) api.pset((i * 37 + api.frame * 0.2) % 256, 36 + i % 4 * 7, 13)
  for (const p of g.roofs) {
    api.rectfill(p.x + g.slide, p.y, p.w, p.h, 5)
    api.rectfill(p.x + g.slide, p.y, p.w, 2, 6)
    for (let x = p.x + 8; x < p.x + p.w; x += 18) api.rectfill(x + g.slide, p.y + 10, 4, 6, 9)
  }
  for (const a of g.anchors) {
    api.line(a.x + g.slide, a.y - 13, a.x + g.slide, a.y, 12)
    api.circ(a.x + g.slide, a.y - 14, 3, g.used ? 5 : 11)
  }
  for (const i of g.items) api.spr(GADGETS[i.kind], i.x + g.slide, i.y + Math.sin(api.t * 4 + i.x))
  for (const d of g.drones) {
    const c = api.t % 20 < 4 ? 5 : 10
    api.line(d.x + 5 + g.slide, d.y + 5, d.x - 7 + g.slide, d.y + 24, c)
    api.line(d.x + 5 + g.slide, d.y + 5, d.x + 17 + g.slide, d.y + 24, c)
    api.spr(DRONE, d.x + g.slide, d.y)
  }
  if (g.rope) api.line(g.x + 8 + g.slide, g.y + 9, g.rope.x + g.slide, g.rope.y - 14, 7)
  if (g.hurt <= 0 || api.frame % 8 < 4) api.spr(HERO, g.x + g.slide, g.y, g.face < 0)
  for (let i = 0; i < g.hearts; i++) api.spr(HEART, 5 + i * 9, 16)
  api.text(g.chain >= 3 ? '2X' : '1X', 40, 16, g.pop > 0 ? 10 : 7)
  api.text('DAWN ' + Math.ceil(80 - api.t), 184, 16, 13)
  if (api.t < 7) api.textCenter('A JUMP  B AIR GRAPPLE', 31, 7)
  if (api.t % 20 > 17) api.textCenter('NEXT ROOFTOPS SOON', 52, 10)
}
