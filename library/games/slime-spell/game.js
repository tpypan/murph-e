// TITLE: SLIME SPELL
// GENRE: dungeon shooter
// CONTROLS: arrows move, A bolt, B panic spell

const WIZARD = [
  '...dd...',
  '..dddd..',
  '.dddddd.',
  '...ff...',
  '..f1f...',
  '..ffff..',
  '.c2222c.',
  'cc2cc2cc',
]
const SLIME_BIG = [
  '..bbbb..',
  '.bbbbbb.',
  'bbbbbbbb',
  'bb7bb7bb',
  'bbbbbbbb',
  '.b3bb3b.',
  'b.bbbb.b',
  '.bb..bb.',
]
const SLIME_MED = [
  '.bbbb.',
  'bbbbbb',
  'b7bb7b',
  'bbbbbb',
  '.b33b.',
  'bb..bb',
]
const SLIME_SMALL = [
  '.bb.',
  'bbbb',
  'b7b7',
  'b33b',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const ROOM_X = 8
const ROOM_Y = 20
const ROOM_W = 240
const ROOM_H = 196
const WIZ_W = 8
const WIZ_H = 8

let g

function init(api) {
  g = {
    px: 124,
    py: 170,
    faceX: 0,
    faceY: -1,
    lives: 3,
    hurt: 0,
    cast: 0,
    panic: 0,
    shots: [],
    slimes: [],
    sparks: [],
    spawnTimer: 3.8,
    torches: [],
  }
  for (let i = 0; i < 6; i++) {
    g.torches.push({ x: 24 + i * 41, y: i % 2 ? 206 : 25 })
  }
  addSlime(api, 2, 112, 125, 0.35, -0.15)
  addSlime(api, 2, 34, 42, 0.45, 0.35)
  api.score(0)
}

function addSlime(api, size, x, y, vx, vy) {
  const speed = 0.45 + api.t * 0.006
  const angle = api.rnd(6.28)
  g.slimes.push({
    x: x,
    y: y,
    vx: vx === undefined ? Math.cos(angle) * speed : vx,
    vy: vy === undefined ? Math.sin(angle) * speed : vy,
    size: size,
    squash: api.rndi(0, 20),
    dead: false,
  })
}

function burst(api, x, y, colour, count) {
  for (let i = 0; i < count; i++) {
    const a = api.rnd(6.28)
    const speed = api.rnd(1.8) + 0.5
    g.sparks.push({
      x: x,
      y: y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: api.rndi(10, 24),
      c: colour,
    })
  }
}

function splitSlime(api, slime, panicHit) {
  slime.dead = true
  const points = slime.size === 2 ? 10 : slime.size === 1 ? 20 : 35
  api.addScore(panicHit ? Math.ceil(points / 2) : points)
  api.sfx('explode')
  api.flash(10, 1)
  burst(api, slime.x + 4, slime.y + 4, 11, 7)

  if (slime.size > 0) {
    for (let i = 0; i < 2; i++) {
      const a = i === 0 ? -0.7 : 0.7
      const speed = 1.05 + api.t * 0.008
      addSlime(
        api,
        slime.size - 1,
        slime.x + i * 4,
        slime.y,
        Math.cos(a) * speed * (i ? 1 : -1),
        Math.sin(a) * speed
      )
    }
  }
}

function hurtWizard(api, slime) {
  if (g.hurt > 0) return
  g.lives--
  g.hurt = 75
  slime.vx *= -1.8
  slime.vy *= -1.8
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  burst(api, g.px + 4, g.py + 4, 8, 10)
  if (g.lives <= 0 && api.t > 2) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  let mx = 0
  let my = 0
  if (api.btn('left')) mx--
  if (api.btn('right')) mx++
  if (api.btn('up')) my--
  if (api.btn('down')) my++

  if (mx !== 0 || my !== 0) {
    const diagonal = mx !== 0 && my !== 0 ? 0.72 : 1
    g.px += mx * 1.65 * diagonal
    g.py += my * 1.65 * diagonal
    g.faceX = mx
    g.faceY = my
  }
  g.px = api.clamp(g.px, ROOM_X + 5, ROOM_X + ROOM_W - WIZ_W - 5)
  g.py = api.clamp(g.py, ROOM_Y + 5, ROOM_Y + ROOM_H - WIZ_H - 5)

  if (api.btnp('a')) {
    let dx = g.faceX
    let dy = g.faceY
    if (dx === 0 && dy === 0) dy = -1
    const length = Math.sqrt(dx * dx + dy * dy)
    g.shots.push({
      x: g.px + 3,
      y: g.py + 3,
      vx: dx / length * 4.5,
      vy: dy / length * 4.5,
      life: 55,
    })
    g.cast = 7
    api.sfx('shoot')
  }

  if (api.btnp('b')) {
    g.panic = 18
    api.sfx('powerup')
    burst(api, g.px + 4, g.py + 4, 13, 12)
    for (const s of g.slimes) {
      if (!s.dead && api.dist(g.px + 4, g.py + 4, s.x + 4, s.y + 4) < 34) {
        splitSlime(api, s, true)
      }
    }
  }

  for (const shot of g.shots) {
    shot.x += shot.vx
    shot.y += shot.vy
    shot.life--
    if (shot.x < ROOM_X || shot.x > ROOM_X + ROOM_W ||
        shot.y < ROOM_Y || shot.y > ROOM_Y + ROOM_H) shot.life = 0
  }

  for (const shot of g.shots) {
    for (const s of g.slimes) {
      const w = s.size === 2 ? 8 : s.size === 1 ? 6 : 4
      if (shot.life > 0 && !s.dead &&
          api.collide(shot.x, shot.y, 3, 3, s.x, s.y, w, w)) {
        shot.life = 0
        splitSlime(api, s, false)
      }
    }
  }

  const chase = 0.002 + api.t * 0.00008
  for (const s of g.slimes) {
    const w = s.size === 2 ? 8 : s.size === 1 ? 6 : 4
    s.vx += (g.px - s.x) * chase
    s.vy += (g.py - s.y) * chase
    s.x += s.vx
    s.y += s.vy
    s.squash++

    if (s.x < ROOM_X + 3 || s.x + w > ROOM_X + ROOM_W - 3) {
      s.vx *= -1
      s.x = api.clamp(s.x, ROOM_X + 3, ROOM_X + ROOM_W - w - 3)
      api.sfx('jump')
    }
    if (s.y < ROOM_Y + 3 || s.y + w > ROOM_Y + ROOM_H - 3) {
      s.vy *= -1
      s.y = api.clamp(s.y, ROOM_Y + 3, ROOM_Y + ROOM_H - w - 3)
      api.sfx('jump')
    }
    if (!s.dead && api.collide(g.px + 1, g.py + 1, 6, 7, s.x, s.y, w, w)) {
      hurtWizard(api, s)
    }
  }

  g.spawnTimer -= dt
  if (g.spawnTimer <= 0) {
    const edge = api.rndi(0, 3)
    const x = edge < 2 ? (edge ? 235 : 13) : api.rndi(16, 232)
    const y = edge >= 2 ? (edge === 2 ? 25 : 202) : api.rndi(28, 198)
    addSlime(api, 2, x, y)
    g.spawnTimer = Math.max(0.35, 3.1 - api.t * 0.035)
  }

  for (const p of g.sparks) {
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.94
    p.vy *= 0.94
    p.life--
  }
  g.shots = g.shots.filter((s) => s.life > 0)
  g.slimes = g.slimes.filter((s) => !s.dead)
  g.sparks = g.sparks.filter((p) => p.life > 0)
  if (g.hurt > 0) g.hurt--
  if (g.cast > 0) g.cast--
  if (g.panic > 0) g.panic--
}

function draw(api) {
  api.cls(2)
  api.rectfill(ROOM_X, ROOM_Y, ROOM_W, ROOM_H, 5)
  for (let y = 28; y < 214; y += 16) {
    for (let x = 12; x < 248; x += 24) {
      api.line(x + ((y / 16) % 2) * 8, y, x + 13, y, 6)
    }
  }
  api.rect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H, 4)
  api.rect(ROOM_X + 2, ROOM_Y + 2, ROOM_W - 4, ROOM_H - 4, 1)

  for (const t of g.torches) {
    api.rectfill(t.x, t.y, 3, 5, 4)
    api.circfill(t.x + 1, t.y - 2, 3 + (api.frame % 6 === 0 ? 1 : 0), 9)
    api.pset(t.x + 1, t.y - 3, 10)
  }

  for (const s of g.slimes) {
    const sprite = s.size === 2 ? SLIME_BIG : s.size === 1 ? SLIME_MED : SLIME_SMALL
    api.spr(sprite, s.x, s.y + (s.squash % 24 < 12 ? 0 : 1), s.vx < 0)
  }
  for (const shot of g.shots) {
    api.circfill(shot.x, shot.y, 2, 13)
    api.pset(shot.x, shot.y, 7)
  }
  for (const p of g.sparks) api.pset(p.x, p.y, p.c)

  if (g.panic > 0) api.circ(g.px + 4, g.py + 4, 36 - g.panic * 2, 13)
  if (g.cast > 0) api.circfill(g.px + 4 + g.faceX * 7, g.py + 4 + g.faceY * 7, 2, 10)
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(WIZARD, g.px, g.py, g.faceX < 0)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 10 + i * 7, 13)
}
