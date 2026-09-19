// TITLE: JELLY SUB
// GENRE: flappy
// CONTROLS: a b
// Tap A to boost upward. B sends a sonar pulse that briefly lights the deep.
// Pass through swaying jellyfish gates, but avoid their bodies and tentacles.

const SUB = [
  '..aaaaaa..',
  '.aa7777aa.',
  'aa7cc77aa9',
  'aa77777799',
  '.aaaaaaaa.',
  '...8..8...',
]
const JELLY = [
  '..dddd..',
  '.dffffd.',
  'dff7fffd',
  'dddddddd',
  '.d.d.d..',
  '.d.d.d..',
  'd..d..d.',
  'd..d..d.',
]
const MINE = [
  '...5...',
  '.5.8.5.',
  '..888..',
  '5888885',
  '..888..',
  '.5.8.5.',
  '...5...',
]
const BUBBLE = [
  '.7.',
  '7.7',
  '.7.',
]

const SUB_X = 54
const SUB_W = 10
const SUB_H = 6
const JELLY_W = 8
const TOP = 14
const BOTTOM = 216

let g

function init(api) {
  g = {
    y: 108,
    vy: 0,
    started: false,
    gates: [],
    bubbles: [],
    fish: [],
    rocks: [],
    spawnIn: 85,
    sonar: 0,
    pulse: 0,
    dead: false,
  }
  for (let i = 0; i < 30; i++) {
    g.bubbles.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(TOP, BOTTOM),
      s: api.rnd(0.35) + 0.15,
    })
  }
  for (let i = 0; i < 9; i++) {
    g.rocks.push({
      x: api.rndi(0, api.W - 1),
      w: api.rndi(8, 24),
      h: api.rndi(3, 10),
    })
  }
  for (let i = 0; i < 5; i++) {
    g.fish.push({
      x: api.rndi(0, api.W),
      y: api.rndi(30, 190),
      speed: api.rnd(0.25) + 0.15,
    })
  }
  api.score(0)
}

function makeGate(api) {
  const score = api.getScore()
  const gapH = Math.max(48, 76 - score * 1.2)
  const center = api.rndi(TOP + 44, BOTTOM - 44)
  g.gates.push({
    x: api.W + 8,
    center,
    gapH,
    phase: api.rnd(6.28),
    sway: 5 + score * 0.45 + api.t * 0.04,
    passed: false,
  })
}

function update(api, dt) {
  if (api.btnp('a')) {
    g.started = true
    g.vy = -3.5
    api.sfx('jump')
    for (let i = 0; i < 3; i++) {
      g.bubbles.push({
        x: SUB_X - api.rnd(5),
        y: g.y + 3 + api.rnd(3),
        s: 0.7 + api.rnd(0.5),
      })
    }
  }

  if (api.btnp('b')) {
    g.sonar = 28
    g.pulse = 2
    api.sfx('select')
    api.tone(520, 90, 'triangle')
  }

  if (g.started) {
    g.vy = Math.min(4.8, g.vy + 0.18)
    g.y += g.vy
  } else {
    g.y = 108 + Math.sin(api.t * 3.5) * 5
  }

  if (g.sonar > 0) {
    g.sonar--
    g.pulse += 5
  }

  const score = api.getScore()
  const speed = 1.55 + api.t * 0.012 + score * 0.045
  g.spawnIn--
  if (g.spawnIn <= 0) {
    makeGate(api)
    g.spawnIn = Math.max(48, 100 - score * 1.5 - api.t * 0.18)
  }

  for (const b of g.bubbles) {
    b.y -= b.s
    b.x -= b.s * 0.08
    if (b.y < TOP) {
      b.y = BOTTOM
      b.x = api.rndi(0, api.W - 1)
    }
  }
  if (g.bubbles.length > 55) g.bubbles.splice(0, g.bubbles.length - 55)

  for (const f of g.fish) {
    f.x -= f.speed + speed * 0.08
    if (f.x < -8) {
      f.x = api.W + api.rndi(0, 50)
      f.y = api.rndi(25, 195)
    }
  }

  for (const gate of g.gates) {
    gate.x -= speed
    const wave = Math.sin(api.t * (1.5 + score * 0.025) + gate.phase)
    const gapY = api.clamp(
      gate.center + wave * gate.sway - gate.gapH / 2,
      TOP + 12,
      BOTTOM - gate.gapH - 12
    )
    gate.gapY = gapY

    if (!gate.passed && gate.x + JELLY_W < SUB_X) {
      gate.passed = true
      api.addScore(1)
      api.sfx('coin')
      api.flash(10, 1)
    }

    const topH = gapY - TOP
    const bottomY = gapY + gate.gapH
    const hitTop = api.collide(
      SUB_X + 1, g.y, SUB_W - 2, SUB_H,
      gate.x, TOP, JELLY_W, topH
    )
    const hitBottom = api.collide(
      SUB_X + 1, g.y, SUB_W - 2, SUB_H,
      gate.x, bottomY, JELLY_W, BOTTOM - bottomY
    )
    if (g.started && (hitTop || hitBottom)) die(api)
  }

  g.gates = g.gates.filter((gate) => gate.x > -JELLY_W - 2)

  if (g.started && (g.y <= TOP || g.y + SUB_H >= BOTTOM)) die(api)
}

function die(api) {
  if (g.dead || api.t <= 2) return
  g.dead = true
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  api.sfx('die')
  api.gameOver()
}

function drawJellyColumn(api, gate, top) {
  const gapY = gate.gapY
  if (top) {
    for (let y = TOP - 3; y < gapY - 8; y += 10)
      api.spr(JELLY, gate.x, y, false, true)
    api.spr(JELLY, gate.x, gapY - 8, false, true)
  } else {
    for (let y = gapY + gate.gapH; y < BOTTOM; y += 10)
      api.spr(JELLY, gate.x, y)
  }
}

function draw(api) {
  api.cls(g.sonar > 0 ? 12 : 1)

  api.rectfill(0, TOP, api.W, 2, 12)
  api.rectfill(0, 177, api.W, 39, g.sonar > 0 ? 12 : 2)
  api.line(0, 177, api.W, 177, 13)

  for (const r of g.rocks) {
    api.rectfill(r.x, BOTTOM - r.h, r.w, r.h, 5)
    api.rectfill(r.x + 2, BOTTOM - r.h, r.w - 3, 2, 6)
  }

  for (const b of g.bubbles) {
    if (b.s > 0.7) api.spr(BUBBLE, b.x, b.y)
    else api.pset(b.x, b.y, g.sonar > 0 ? 7 : 12)
  }

  for (const f of g.fish) {
    api.line(f.x, f.y, f.x + 5, f.y, 3)
    api.pset(f.x + 5, f.y - 1, 11)
    api.pset(f.x + 5, f.y + 1, 11)
  }

  for (const gate of g.gates) {
    drawJellyColumn(api, gate, true)
    drawJellyColumn(api, gate, false)
    api.line(gate.x + 1, gate.gapY - 1, gate.x + 1, gate.gapY + 4, 14)
    api.line(
      gate.x + 6,
      gate.gapY + gate.gapH - 5,
      gate.x + 6,
      gate.gapY + gate.gapH + 1,
      14
    )
  }

  api.rectfill(0, BOTTOM, api.W, api.H - BOTTOM, 4)
  api.rectfill(0, BOTTOM, api.W, 2, 9)

  if (g.sonar > 0) {
    api.circ(SUB_X + 5, g.y + 3, g.pulse, 10)
    if (g.pulse > 30) api.circ(SUB_X + 5, g.y + 3, g.pulse - 30, 7)
  }

  api.spr(SUB, SUB_X, g.y, false, g.vy > 2)
  api.pset(SUB_X - 2, g.y + 3, api.frame % 6 < 3 ? 10 : 9)

  if (!g.started) api.textCenter('A BOOST  B SONAR', 148, 7)
}
