// TITLE: ASTEROID DASH
// GENRE: shooter
// CONTROLS: left right up a b
// Rotate, thrust, blast splitting rocks, and hypershift out of danger.

const SHIP = [
  '...7....',
  '..7c7...',
  '.7ccc7..',
  '7cccccc.',
  '.7ccc7..',
  '..797...',
  '...9....',
]
const ROCK_BIG = [
  '..6556....',
  '.654456...',
  '65455446..',
  '644665546.',
  '655445566.',
  '.64556446.',
  '..664456..',
  '...6666...',
]
const ROCK_MED = [
  '.6556.',
  '654446',
  '645566',
  '655446',
  '.6666.',
  '..66..',
]
const ROCK_SMALL = [
  '.66.',
  '6546',
  '6456',
  '.66.',
]
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const SHIP_W = 8
const SHIP_H = 7
const TOP = 13

let g

function init(api) {
  g = {
    x: api.W / 2,
    y: api.H / 2,
    vx: 0,
    vy: 0,
    ang: -Math.PI / 2,
    lives: 3,
    shots: [],
    rocks: [],
    stars: [],
    cooldown: 0,
    hurt: 150,
    shift: 0,
    spawn: 3.4,
    thrusting: false,
  }
  for (let i = 0; i < 40; i++) {
    g.stars.push({
      x: api.rndi(0, api.W - 1),
      y: api.rndi(TOP, api.H - 1),
      c: api.rnd() < 0.25 ? 13 : 7,
    })
  }
  spawnRock(api, 2, true)
  api.score(0)
}

function spawnRock(api, size, distant) {
  let x
  let y
  const edge = api.rndi(0, 3)
  if (edge === 0) {
    x = -12
    y = api.rndi(TOP + 8, api.H - 8)
  } else if (edge === 1) {
    x = api.W + 12
    y = api.rndi(TOP + 8, api.H - 8)
  } else if (edge === 2) {
    x = api.rndi(8, api.W - 8)
    y = TOP - 12
  } else {
    x = api.rndi(8, api.W - 8)
    y = api.H + 12
  }
  if (distant) {
    x = 18
    y = 30
  }
  const dx = g.x - x
  const dy = g.y - y
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  const pace = 0.45 + api.t * 0.009 + api.getScore() * 0.0006
  g.rocks.push({
    x,
    y,
    vx: dx / len * pace + api.rnd(0.5) - 0.25,
    vy: dy / len * pace + api.rnd(0.5) - 0.25,
    size,
    spin: api.rnd(0.12) - 0.06,
    rot: api.rnd(Math.PI * 2),
    dead: false,
  })
}

function wrapThing(o, api, pad) {
  if (o.x < -pad) o.x = api.W + pad
  if (o.x > api.W + pad) o.x = -pad
  if (o.y < TOP - pad) o.y = api.H + pad
  if (o.y > api.H + pad) o.y = TOP - pad
}

function splitRock(api, r) {
  r.dead = true
  const points = r.size === 2 ? 20 : r.size === 1 ? 50 : 100
  api.addScore(points)
  api.sfx('explode')
  api.flash(10, 1)
  if (r.size > 0) {
    for (let i = 0; i < 2; i++) {
      const a = api.rnd(Math.PI * 2)
      const speed = 1.2 + (2 - r.size) * 0.5 + api.t * 0.006
      g.rocks.push({
        x: r.x,
        y: r.y,
        vx: r.vx * 0.5 + Math.cos(a) * speed,
        vy: r.vy * 0.5 + Math.sin(a) * speed,
        size: r.size - 1,
        spin: api.rnd(0.2) - 0.1,
        rot: a,
        dead: false,
      })
    }
  }
}

function hypershift(api) {
  if (g.shift > 0) return
  let bestX = g.x
  let bestY = g.y
  let bestGap = -1
  for (let i = 0; i < 12; i++) {
    const x = api.rndi(16, api.W - 16)
    const y = api.rndi(TOP + 16, api.H - 16)
    let gap = 999
    for (const r of g.rocks) gap = Math.min(gap, api.dist(x, y, r.x, r.y))
    if (gap > bestGap) {
      bestGap = gap
      bestX = x
      bestY = y
    }
  }
  g.x = bestX
  g.y = bestY
  g.vx = 0
  g.vy = 0
  g.shift = 180
  g.hurt = Math.max(g.hurt, 35)
  api.sfx('powerup')
  api.flash(13, 2)
}

function update(api, dt) {
  if (api.btn('left')) g.ang -= 0.075
  if (api.btn('right')) g.ang += 0.075
  g.thrusting = api.btn('up')
  if (g.thrusting) {
    g.vx += Math.cos(g.ang) * 0.075
    g.vy += Math.sin(g.ang) * 0.075
  }
  g.vx *= 0.993
  g.vy *= 0.993
  g.x += g.vx
  g.y += g.vy
  wrapThing(g, api, 5)

  if (g.cooldown > 0) g.cooldown--
  if (g.shift > 0) g.shift--
  if (g.hurt > 0) g.hurt--
  if (api.btnp('b')) hypershift(api)

  if (api.btnp('a')) {
    const dx = Math.cos(g.ang)
    const dy = Math.sin(g.ang)
    g.shots.push({ x: g.x + dx * 7, y: g.y + dy * 7, vx: dx * 5 + g.vx, vy: dy * 5 + g.vy, age: 0 })
    g.cooldown = 7
    api.sfx('shoot')
  }

  for (const s of g.shots) {
    s.x += s.vx
    s.y += s.vy
    s.age++
  }
  g.shots = g.shots.filter((s) => s.age < 55 && s.x > 0 && s.x < api.W && s.y > TOP && s.y < api.H)

  g.spawn -= dt
  if (g.spawn <= 0) {
    spawnRock(api, 2, false)
    g.spawn = Math.max(0.3, 2.2 - api.t * 0.018 - api.getScore() * 0.0007)
  }

  for (const r of g.rocks) {
    r.x += r.vx
    r.y += r.vy
    r.rot += r.spin
    wrapThing(r, api, 10)
  }

  for (const s of g.shots) {
    for (const r of g.rocks) {
      const radius = r.size === 2 ? 7 : r.size === 1 ? 5 : 3
      if (!r.dead && s.age < 55 && api.dist(s.x, s.y, r.x, r.y) < radius) {
        s.age = 99
        splitRock(api, r)
        break
      }
    }
  }
  g.rocks = g.rocks.filter((r) => !r.dead)
  g.shots = g.shots.filter((s) => s.age < 55)

  if (g.hurt <= 0 && api.t > 3) {
    for (const r of g.rocks) {
      const radius = r.size === 2 ? 8 : r.size === 1 ? 6 : 4
      if (api.dist(g.x, g.y, r.x, r.y) < radius + 3) {
        g.lives--
        g.hurt = 100
        r.dead = true
        g.vx = -g.vx
        g.vy = -g.vy
        api.sfx('hit')
        api.flash(8, 3)
        api.shake(10)
        if (g.lives <= 0) {
          api.sfx('die')
          api.gameOver()
        }
        break
      }
    }
  }
  g.rocks = g.rocks.filter((r) => !r.dead)
}

function drawShip(api) {
  const noseX = g.x + Math.cos(g.ang) * 7
  const noseY = g.y + Math.sin(g.ang) * 7
  const leftX = g.x + Math.cos(g.ang + 2.45) * 6
  const leftY = g.y + Math.sin(g.ang + 2.45) * 6
  const rightX = g.x + Math.cos(g.ang - 2.45) * 6
  const rightY = g.y + Math.sin(g.ang - 2.45) * 6
  api.line(noseX, noseY, leftX, leftY, 7)
  api.line(leftX, leftY, rightX, rightY, 12)
  api.line(rightX, rightY, noseX, noseY, 7)
  api.pset(g.x, g.y, 14)
  if (g.thrusting) {
    api.line(g.x - Math.cos(g.ang) * 5, g.y - Math.sin(g.ang) * 5,
      g.x - Math.cos(g.ang) * (9 + api.frame % 3), g.y - Math.sin(g.ang) * (9 + api.frame % 3), 9)
  }
}

function draw(api) {
  api.cls(1)
  for (const s of g.stars) {
    const twinkle = (api.frame + s.x) % 40 < 4 ? 10 : s.c
    api.pset(s.x, s.y, twinkle)
  }
  api.rect(0, TOP, api.W, api.H - TOP, 2)

  for (const r of g.rocks) {
    const sprite = r.size === 2 ? ROCK_BIG : r.size === 1 ? ROCK_MED : ROCK_SMALL
    const half = r.size === 2 ? 5 : r.size === 1 ? 3 : 2
    api.spr(sprite, r.x - half, r.y - half, Math.cos(r.rot) < 0, Math.sin(r.rot) < 0)
  }
  for (const s of g.shots) {
    api.line(s.x, s.y, s.x - s.vx * 0.8, s.y - s.vy * 0.8, 10)
    api.pset(s.x, s.y, 7)
  }

  if (g.hurt <= 0 || api.frame % 6 < 3) drawShip(api)
  if (g.shift <= 0) api.text('B', api.W - 10, 15, 13)
  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 3)
}
