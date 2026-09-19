// TITLE: EXAM ESCAPE
// GENRE: dodge
// CONTROLS: arrows move, A dash
// Dodge hostile stationery and collect lucky notes before the bell.

const STUDENT = [
  '..ffff..',
  '.ffffff.',
  '.f1ff1f.',
  '.ffffff.',
  '..cccc..',
  '.c9cc9c.',
  '..c..c..',
  '.11..11.',
]
const PAPER = [
  '.777777.',
  '.766667.',
  '.677776.',
  '.766667.',
  '.677776.',
  '.766667.',
  '.777777.',
  '......6.',
]
const PENCIL = [
  '...99...',
  '..999...',
  '..aaa...',
  '.aaaa...',
  '.444....',
  '444.....',
  '84......',
  '8.......',
]
const CLOCK = [
  '..6666..',
  '.677776.',
  '677aa776',
  '67.7.776',
  '67..a776',
  '67777776',
  '.677776.',
  '..6666..',
]
const NOTE = [
  '..aaaa..',
  '.a7777a.',
  'a7a77a7a',
  'a77aa77a',
  'a777777a',
  '.a7777a.',
  '..aaaa..',
  '...a....',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const PLAYER_W = 8
const PLAYER_H = 8
const TOP = 18
const BOTTOM = 211
let g

function init(api) {
  g = {
    px: 124,
    py: 176,
    vx: 0,
    vy: 0,
    faceX: 0,
    faceY: -1,
    dash: 0,
    dashWait: 0,
    things: [],
    lives: 3,
    hurt: 0,
    spawnTimer: 0.7,
    noteTimer: 1.2,
    streak: 0,
    streakTime: 0,
    bell: 45,
    ended: false,
    desks: [],
    motes: [],
  }
  for (let i = 0; i < 8; i++) {
    g.desks.push({
      x: 10 + (i % 4) * 64,
      y: 40 + Math.floor(i / 4) * 94,
    })
  }
  for (let i = 0; i < 28; i++) {
    g.motes.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(13, api.H - 1),
      s: api.rnd(0.4) + 0.15,
    })
  }
  api.score(0)
}

function spawnHazard(api, difficulty) {
  const roll = api.rnd()
  const kind = roll < 0.56 ? 'paper' : roll < 0.82 ? 'pencil' : 'clock'
  const x = api.rndi(4, api.W - 12)
  const base = kind === 'clock' ? 0.85 : kind === 'pencil' ? 1.35 : 1.05
  g.things.push({
    x,
    y: -10,
    baseX: x,
    vx: api.rnd(1.2) - 0.6,
    vy: base + difficulty * 0.34 + api.rnd(0.5),
    phase: api.rnd(6.28),
    kind,
    dead: false,
  })
}

function spawnNote(api) {
  g.things.push({
    x: api.rndi(8, api.W - 16),
    y: -10,
    baseX: 0,
    vx: api.rnd(0.6) - 0.3,
    vy: 0.85 + api.rnd(0.4),
    phase: api.rnd(6.28),
    kind: 'note',
    dead: false,
  })
}

function hurtStudent(api, thing) {
  if (g.hurt > 0 || g.ended) return
  thing.dead = true
  g.lives--
  g.hurt = 75
  g.streak = 0
  g.streakTime = 0
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0 && api.t > 2) {
    g.ended = true
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  if (g.ended) return
  const difficulty = api.t / 18
  g.bell -= dt

  let ix = 0
  let iy = 0
  if (api.btn('left')) ix--
  if (api.btn('right')) ix++
  if (api.btn('up')) iy--
  if (api.btn('down')) iy++

  if (ix || iy) {
    const length = Math.sqrt(ix * ix + iy * iy)
    ix /= length
    iy /= length
    g.faceX = ix
    g.faceY = iy
  }

  if (api.btnp('a')) {
    g.dash = 10
    g.dashWait = 24
    api.sfx('jump')
  }
  if (g.dashWait > 0) g.dashWait--
  if (g.dash > 0) {
    g.vx = g.faceX * 5.2
    g.vy = g.faceY * 5.2
    g.dash--
  } else {
    g.vx += ix * 0.55
    g.vy += iy * 0.55
    g.vx *= 0.76
    g.vy *= 0.76
  }

  g.px = api.clamp(g.px + g.vx, 2, api.W - PLAYER_W - 2)
  g.py = api.clamp(g.py + g.vy, TOP, BOTTOM - PLAYER_H)

  g.spawnTimer -= dt
  if (g.spawnTimer <= 0) {
    spawnHazard(api, difficulty)
    if (api.rnd() < Math.min(0.65, difficulty * 0.12)) spawnHazard(api, difficulty)
    g.spawnTimer = Math.max(0.13, 0.72 - difficulty * 0.055)
  }

  g.noteTimer -= dt
  if (g.noteTimer <= 0) {
    spawnNote(api)
    g.noteTimer = 2.2 + api.rnd(1.5)
  }

  for (const t of g.things) {
    t.y += t.vy
    if (t.kind === 'paper') {
      t.x = t.baseX + Math.sin(api.t * 3 + t.phase) * 15
    } else {
      t.x += t.vx
      if (t.x < 1 || t.x > api.W - 9) t.vx *= -1
    }
    if (t.dead) continue
    if (api.collide(g.px + 1, g.py + 1, 6, 6, t.x + 1, t.y + 1, 6, 6)) {
      if (t.kind === 'note') {
        t.dead = true
        g.streak++
        g.streakTime = 180
        api.addScore(20 + Math.min(10, g.streak) * 5)
        api.sfx('coin')
        api.flash(10, 1)
      } else {
        hurtStudent(api, t)
      }
    }
  }

  g.things = g.things.filter((t) => !t.dead && t.y < api.H + 12)
  if (g.hurt > 0) g.hurt--
  if (g.streakTime > 0) g.streakTime--
  else g.streak = 0

  if (g.bell <= 0 && api.t > 2) {
    g.ended = true
    api.sfx('die')
    api.gameOver()
  }
}

function draw(api) {
  api.cls(13)

  for (const m of g.motes) {
    const y = TOP + ((m.y - TOP + api.frame * m.s) % (api.H - TOP))
    api.pset(m.x, y, m.x % 3 ? 7 : 10)
  }

  api.rectfill(0, 12, api.W, 5, 2)
  api.rectfill(0, BOTTOM, api.W, api.H - BOTTOM, 4)
  api.rectfill(0, BOTTOM, api.W, 2, 10)
  for (const d of g.desks) {
    api.rectfill(d.x, d.y, 42, 5, 4)
    api.rectfill(d.x + 3, d.y + 5, 4, 8, 5)
    api.rectfill(d.x + 35, d.y + 5, 4, 8, 5)
    api.line(d.x + 8, d.y + 2, d.x + 30, d.y + 2, 14)
  }

  for (const t of g.things) {
    if (t.kind === 'note') {
      api.circ(t.x + 4, t.y + 4, 6 + (api.frame % 10 < 5 ? 1 : 0), 10)
      api.spr(NOTE, t.x, t.y)
    } else if (t.kind === 'paper') {
      api.spr(PAPER, t.x, t.y, api.frame % 20 < 10)
    } else if (t.kind === 'pencil') {
      api.spr(PENCIL, t.x, t.y)
    } else {
      api.spr(CLOCK, t.x, t.y)
    }
  }

  if (g.dash > 0) {
    api.line(g.px + 4, g.py + 4, g.px + 4 - g.faceX * 13, g.py + 4 - g.faceY * 13, 12)
  }
  if (g.hurt <= 0 || api.frame % 6 < 3) {
    api.spr(STUDENT, g.px, g.py, g.faceX < 0)
  }

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 5)
  api.text('BELL ' + Math.max(0, Math.ceil(g.bell)), 4, 17, g.bell < 10 ? 8 : 2)
  if (g.streak > 1) api.text('STREAK X' + g.streak, 160, 17, 10)
}
