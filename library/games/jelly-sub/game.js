// TITLE: JELLY SUB
// GENRE: flappy
// CONTROLS: a b
// Tap A to boost upward and thread the swaying jellyfish gates.
// B toggles a visible sonar pulse. Touching sea life or an edge ends the run.

const SUB = [
  '...aa...',
  '.aaaaa..',
  'aa7aaa99',
  'aaaaaaa.',
  '.a8a8...',
  '..4.....',
]
const JELLY = [
  '..eeee..',
  '.e7777e.',
  'e7eeee7e',
  'eeeeeeee',
  '.e.e.e..',
  '.e.e.e..',
  'e..e..e.',
  'e..e..e.',
]
const FISH = [
  '..99....',
  '.9999.9.',
  '99999999',
  '.9999.9.',
  '..99....',
]
const SUB_W = 8
const SUB_H = 6
const SUB_X = 56
const JELLY_W = 8
const TOP = 14
const BOTTOM = 216

let g

function init(api) {
  g = {
    y: 108,
    vy: 0,
    started: false,
    dead: false,
    gates: [],
    spawnIn: 115,
    speed: 1.45,
    sonar: false,
    pulse: 0,
    bubbles: [],
    fish: [],
  }
  for (let i = 0; i < 28; i++) {
    g.bubbles.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(TOP, BOTTOM - 1),
      r: api.rndi(1, 2),
      s: api.rnd(0.3) + 0.15,
    })
  }
  for (let i = 0; i < 4; i++) {
    g.fish.push({
      x: api.rndi(0, api.W),
      y: api.rndi(30, 190),
      s: api.rnd(0.4) + 0.25,
    })
  }
  api.score(0)
}

function spawnGate(api) {
  const score = api.getScore()
  const gapH = Math.max(46, 78 - score * 1.5 - api.t * 0.12)
  const margin = 24
  const center = api.rndi(
    TOP + margin + gapH / 2,
    BOTTOM - margin - gapH / 2
  )
  g.gates.push({
    x: api.W + 8,
    center: center,
    gapH: gapH,
    phase: api.rnd(6.28),
    passed: false,
  })
}

function boost(api) {
  g.started = true
  g.vy = -3.45
  api.sfx('jump')
  for (let i = 0; i < 3; i++) {
    g.bubbles.push({
      x: SUB_X - api.rndi(1, 8),
      y: g.y + api.rndi(2, 5),
      r: 1,
      s: api.rnd(0.4) + 0.4,
    })
  }
}

function update(api, dt) {
  if (g.dead) return

  if (api.btnp('a')) boost(api)

  if (api.btnp('b')) {
    g.sonar = !g.sonar
    g.pulse = 2
    api.sfx('select')
  }

  if (g.sonar) {
    g.pulse += 1.8
    if (g.pulse > 90) {
      g.pulse = 2
      api.tone(660, 35, 'triangle')
    }
  } else if (g.pulse > 0) {
    g.pulse += 2.5
    if (g.pulse > 90) g.pulse = 0
  }

  if (g.started) {
    g.vy = Math.min(5.2, g.vy + 0.205)
    g.y += g.vy
  } else {
    g.y = 108 + Math.sin(api.t * 3.5) * 4
  }

  for (const b of g.bubbles) {
    b.y -= b.s
    b.x -= 0.12
    if (b.y < TOP) {
      b.y = BOTTOM - 2
      b.x = api.rndi(0, api.W)
    }
  }
  if (g.bubbles.length > 45) g.bubbles.splice(0, g.bubbles.length - 45)

  for (const f of g.fish) {
    f.x -= f.s
    if (f.x < -8) {
      f.x = api.W + api.rndi(10, 80)
      f.y = api.rndi(28, 196)
    }
  }

  g.speed = 1.45 + api.t * 0.012 + api.getScore() * 0.035
  g.spawnIn--
  if (g.spawnIn <= 0) {
    spawnGate(api)
    g.spawnIn = Math.max(68, 112 - api.t * 0.22 - api.getScore())
  }

  for (const gate of g.gates) {
    gate.x -= g.speed
    const swaySpeed = 2 + api.getScore() * 0.07
    const swaySize = 7 + Math.min(12, api.getScore() * 0.35)
    const middle = gate.center + Math.sin(api.t * swaySpeed + gate.phase) * swaySize
    const gapTop = middle - gate.gapH / 2
    const gapBottom = middle + gate.gapH / 2

    if (!gate.passed && gate.x + JELLY_W < SUB_X) {
      gate.passed = true
      api.addScore(1)
      api.sfx('coin')
      api.flash(10, 1)
    }

    if (g.started && gate.x < SUB_X + SUB_W && gate.x + JELLY_W > SUB_X) {
      if (g.y < gapTop || g.y + SUB_H > gapBottom) {
        die(api)
        return
      }
    }
  }
  g.gates = g.gates.filter((gate) => gate.x > -JELLY_W)

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

function drawJellyColumn(api, x, fromY, toY, upward, phase) {
  const step = 12
  let count = 0
  for (let y = fromY; y < toY && count < 18; y += step) {
    const wiggle = Math.sin(api.t * 4 + phase + y * 0.08) * 2
    const py = upward ? toY - (y - fromY) - 8 : y
    api.spr(JELLY, x + wiggle, py, count % 2 === 0, upward)
    count++
  }
}

function draw(api) {
  api.cls(1)

  api.rectfill(0, TOP, api.W, BOTTOM - TOP, 12)
  api.rectfill(0, TOP, api.W, 4, 6)
  api.rectfill(0, TOP + 4, api.W, 3, 13)

  for (let y = 32; y < 190; y += 32) {
    api.line(0, y, api.W, y + 12, y % 64 === 0 ? 1 : 13)
  }

  for (const b of g.bubbles) api.circ(b.x, b.y, b.r, 7)
  for (const f of g.fish) api.spr(FISH, f.x, f.y, true)

  for (const gate of g.gates) {
    const swaySpeed = 2 + api.getScore() * 0.07
    const swaySize = 7 + Math.min(12, api.getScore() * 0.35)
    const middle = gate.center + Math.sin(api.t * swaySpeed + gate.phase) * swaySize
    const gapTop = middle - gate.gapH / 2
    const gapBottom = middle + gate.gapH / 2
    drawJellyColumn(api, gate.x, TOP, gapTop, true, gate.phase)
    drawJellyColumn(api, gate.x, gapBottom, BOTTOM, false, gate.phase)
  }

  api.rectfill(0, BOTTOM, api.W, api.H - BOTTOM, 4)
  api.rectfill(0, BOTTOM, api.W, 2, 10)
  for (let x = 6; x < api.W; x += 22) {
    api.line(x, BOTTOM, x + 3, BOTTOM - 5, 3)
    api.line(x + 3, BOTTOM - 5, x + 6, BOTTOM, 11)
  }

  if (g.pulse > 0) {
    api.circ(SUB_X + 5, g.y + 3, g.pulse, g.sonar ? 10 : 6)
    if (g.sonar) api.circ(SUB_X + 5, g.y + 3, g.pulse + 3, 11)
  }

  api.spr(SUB, SUB_X, g.y, false, g.vy < -1)
  api.rectfill(SUB_X - 3, g.y + 2, 3, 2, api.frame % 4 < 2 ? 10 : 14)

  if (!g.started) api.textCenter('TAP A TO DIVE', 174, 7)
  api.text(g.sonar ? 'SONAR ON' : 'SONAR OFF', 4, 18, g.sonar ? 10 : 6)
}
