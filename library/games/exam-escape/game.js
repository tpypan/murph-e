// TITLE: EXAM ESCAPE
// GENRE: dodge
// CONTROLS: arrows move, a dash
// Dodge marked exams and collect lucky pencils.

const STUDENT = [
  '..4444..',
  '.4ffff4.',
  '.4f1ff4.',
  '..ffff..',
  '.cccccc.',
  '.c.c..c.',
  '..c..c..',
  '.11..11.',
]
const PAPER = [
  '.777777.',
  '.766667.',
  '.768887.',
  '.766667.',
  '.788887.',
  '.766667.',
  '.777777.',
  '......7.',
]
const PENCIL = [
  '......aa',
  '.....a99',
  '....a99.',
  '...a99..',
  '..a99...',
  '.a99....',
  '499.....',
  '44......',
]
const HEART = [
  '.8.8.',
  '88888',
  '88888',
  '.888.',
  '..8..',
]

const STUDENT_W = 8
const STUDENT_H = 8
const TOP = 14
const BOTTOM = 216

let g

function init(api) {
  g = {
    px: api.W / 2 - 4,
    py: 160,
    vx: 0,
    vy: 0,
    faceX: 1,
    faceY: 0,
    papers: [],
    pencils: [],
    motes: [],
    desks: [],
    lives: 3,
    hurt: 0,
    dash: 0,
    dashWait: 0,
    boost: 0,
    paperTimer: 3.1,
    pencilTimer: 1.2,
  }
  for (let i = 0; i < 24; i++) {
    g.motes.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(TOP, BOTTOM - 1),
      speed: api.rnd(0.25) + 0.1,
    })
  }
  for (let i = 0; i < 5; i++) {
    g.desks.push({ x: 12 + i * 51, y: 50 + (i % 2) * 92 })
  }
  api.score(0)
}

function spawnPaper(api) {
  const side = api.rndi(0, 3)
  const speed = 1.25 + api.t * 0.025 + api.rnd(0.65)
  let x
  let y
  let vx
  let vy
  if (side === 0) {
    x = -9
    y = api.rndi(TOP + 8, BOTTOM - 9)
    vx = speed
    vy = api.rnd(0.8) - 0.4
  } else if (side === 1) {
    x = api.W + 1
    y = api.rndi(TOP + 8, BOTTOM - 9)
    vx = -speed
    vy = api.rnd(0.8) - 0.4
  } else if (side === 2) {
    x = api.rndi(0, api.W - 8)
    y = TOP - 9
    vx = api.rnd(0.8) - 0.4
    vy = speed
  } else {
    x = api.rndi(0, api.W - 8)
    y = BOTTOM + 1
    vx = api.rnd(0.8) - 0.4
    vy = -speed
  }
  g.papers.push({
    x: x,
    y: y,
    vx: vx,
    vy: vy,
    spin: api.rndi(0, 1),
    dead: false,
  })
}

function spawnPencil(api) {
  g.pencils.push({
    x: api.rndi(12, api.W - 20),
    y: api.rndi(TOP + 16, BOTTOM - 20),
    age: 0,
    dead: false,
  })
}

function hurt(api, paper) {
  if (g.hurt > 0 || api.t <= 2) return
  paper.dead = true
  g.lives--
  g.hurt = 75
  g.vx = -paper.vx * 2
  g.vy = -paper.vy * 2
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  let ix = 0
  let iy = 0
  if (api.btn('left')) ix--
  if (api.btn('right')) ix++
  if (api.btn('up')) iy--
  if (api.btn('down')) iy++

  if (ix !== 0 || iy !== 0) {
    const length = Math.sqrt(ix * ix + iy * iy)
    ix /= length
    iy /= length
    g.faceX = ix
    g.faceY = iy
  }

  if (g.dashWait > 0) g.dashWait--
  if (api.btnp('a')) {
    if (g.dashWait <= 0) {
      g.dash = 9
      g.dashWait = 24
    } else {
      g.dash = Math.max(g.dash, 4)
    }
    api.sfx('jump')
  }

  const moveSpeed = g.boost > 0 ? 2.7 : 1.75
  if (g.dash > 0) {
    g.vx = g.faceX * 5.4
    g.vy = g.faceY * 5.4
    g.dash--
  } else {
    g.vx += ix * 0.55
    g.vy += iy * 0.55
    g.vx *= 0.72
    g.vy *= 0.72
    g.vx = api.clamp(g.vx, -moveSpeed, moveSpeed)
    g.vy = api.clamp(g.vy, -moveSpeed, moveSpeed)
  }

  g.px = api.clamp(g.px + g.vx, 2, api.W - STUDENT_W - 2)
  g.py = api.clamp(g.py + g.vy, TOP, BOTTOM - STUDENT_H)
  if (g.boost > 0) g.boost--
  if (g.hurt > 0) g.hurt--

  g.paperTimer -= dt
  if (g.paperTimer <= 0) {
    spawnPaper(api)
    if (api.t > 18 && api.rnd() < Math.min(0.75, api.t / 80)) spawnPaper(api)
    g.paperTimer = Math.max(0.16, 0.82 - api.t * 0.009)
  }

  g.pencilTimer -= dt
  if (g.pencilTimer <= 0) {
    if (g.pencils.length < 2) spawnPencil(api)
    g.pencilTimer = 2.5 + api.rnd(1.8)
  }

  for (const p of g.papers) {
    p.x += p.vx
    p.y += p.vy
    if (!p.dead && api.collide(g.px + 1, g.py + 1, 6, 7, p.x + 1, p.y + 1, 6, 6)) {
      hurt(api, p)
    }
  }

  for (const p of g.pencils) {
    p.age++
    if (!p.dead && api.collide(g.px, g.py, 8, 8, p.x + 1, p.y + 1, 6, 6)) {
      p.dead = true
      g.boost = 180
      api.addScore(100)
      api.sfx('coin')
      api.flash(10, 1)
    }
  }

  g.papers = g.papers.filter((p) =>
    !p.dead && p.x > -20 && p.x < api.W + 20 &&
    p.y > -20 && p.y < api.H + 20
  )
  g.pencils = g.pencils.filter((p) => !p.dead && p.age < 600)

  for (const m of g.motes) {
    m.x -= m.speed
    if (m.x < 0) m.x = api.W - 1
  }
}

function draw(api) {
  api.cls(13)

  api.rectfill(0, TOP, api.W, BOTTOM - TOP, 6)
  for (let y = TOP; y < BOTTOM; y += 16) {
    api.line(0, y, api.W - 1, y, 7)
  }
  for (let x = 0; x < api.W; x += 16) {
    api.line(x, TOP, x, BOTTOM - 1, 7)
  }

  api.rectfill(0, TOP, api.W, 3, 4)
  api.rectfill(0, BOTTOM, api.W, api.H - BOTTOM, 4)
  api.rectfill(0, BOTTOM, api.W, 2, 10)

  for (const d of g.desks) {
    api.rectfill(d.x, d.y, 30, 11, 4)
    api.rectfill(d.x + 2, d.y + 2, 26, 3, 9)
    api.rectfill(d.x + 3, d.y + 11, 3, 8, 5)
    api.rectfill(d.x + 24, d.y + 11, 3, 8, 5)
  }

  for (const m of g.motes) {
    api.pset(m.x, m.y, api.frame % 20 < 10 ? 7 : 13)
  }

  for (const p of g.pencils) {
    if (p.age < 500 || api.frame % 8 < 4) {
      api.spr(PENCIL, p.x, p.y + Math.sin((p.age + p.x) * 0.08) * 2)
    }
  }

  for (const p of g.papers) {
    api.spr(PAPER, p.x, p.y, p.spin && api.frame % 12 < 6, p.vy < 0)
  }

  if (g.dash > 0) {
    api.line(
      g.px + 4,
      g.py + 4,
      g.px + 4 - g.faceX * 13,
      g.py + 4 - g.faceY * 13,
      12
    )
  }

  if (g.hurt <= 0 || api.frame % 6 < 3) {
    api.spr(STUDENT, g.px, g.py, g.faceX < 0)
  }

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 5)
  if (g.boost > 0) api.text('LUCKY!', 4, 16, 10)
}
