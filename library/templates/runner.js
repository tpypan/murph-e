// TITLE: DASH DOG
// GENRE: runner
// CONTROLS: a down
// The ground scrolls. Jump over rocks with A, duck under birds with down.
// The world speeds up. Score is distance, with a bonus for each bone. One
// hit ends the run.

const DOG = ['.....99.', '....9999', '.9999919', '99999999', '.999999.', '.9....9.', '.9....9.']
const DOG_DUCK = ['........', '........', '....99..', '.999999.', '99999919', '9......9']
const ROCK = ['..55..', '.5655.', '565555', '555555']
const BIRD = ['.8.8..', '8888..', '.8888.', '..88..']
const BONE = ['7..7', '7777', '7..7']

const GROUND_Y = 200
const DOG_X = 40

let g

function init(api) {
  g = {
    y: GROUND_Y - 7,
    vy: 0,
    onGround: true,
    ducking: false,
    speed: 2.5,
    things: [], // { x, y, kind: 'rock' | 'bird' | 'bone' }
    spawnIn: 160, // frames until the first obstacle, so a fresh run has a beat
    dist: 0,
    hills: [],
  }
  for (let i = 0; i < 6; i++) g.hills.push({ x: i * 50, h: api.rndi(10, 30) })
  api.score(0)
}

function spawn(api) {
  const r = api.rnd()
  if (r < 0.55) g.things.push({ x: api.W + 8, y: GROUND_Y - 4, kind: 'rock' })
  else if (r < 0.8) g.things.push({ x: api.W + 8, y: GROUND_Y - 16, kind: 'bird' })
  else g.things.push({ x: api.W + 8, y: GROUND_Y - 30, kind: 'bone' })
}

function update(api, dt) {
  g.speed = 2.5 + api.t * 0.06
  g.dist += g.speed
  if (api.frame % 10 === 0) api.addScore(1)

  g.ducking = api.btn('down') && g.onGround
  if (api.btnp('a') && g.onGround) {
    g.vy = -4.8
    g.onGround = false
    api.sfx('jump')
  }
  g.vy += 0.26
  g.y += g.vy
  if (g.y >= GROUND_Y - 7) {
    g.y = GROUND_Y - 7
    g.vy = 0
    g.onGround = true
  }

  g.spawnIn--
  if (g.spawnIn <= 0) {
    spawn(api)
    g.spawnIn = api.rndi(45, 90) - Math.min(25, api.t)
  }

  const dogH = g.ducking ? 4 : 7
  const dogY = g.ducking ? GROUND_Y - 4 : g.y
  for (const t of g.things) {
    t.x -= g.speed
    if (t.kind === 'bird') t.y += Math.sin(api.t * 6 + t.x * 0.1) * 0.6
    const w = t.kind === 'bone' ? 4 : 6
    const h = t.kind === 'bone' ? 3 : 4
    if (api.collide(DOG_X + 1, dogY, 6, dogH, t.x, t.y, w, h)) {
      if (t.kind === 'bone') {
        t.x = -20
        api.addScore(20)
        api.sfx('coin')
        api.flash(10, 1)
      } else {
        api.sfx('die')
        api.flash(8, 3)
        api.shake(14)
        api.gameOver()
        return
      }
    }
  }
  g.things = g.things.filter((t) => t.x > -10)
}

function draw(api) {
  api.cls(12)
  // Distant hills scroll slowly.
  for (const h of g.hills) {
    const x = (h.x - g.dist * 0.2) % 300
    api.circfill((((x % 300) + 300) % 300) - 20, GROUND_Y, h.h, 3)
  }
  api.rectfill(0, GROUND_Y, api.W, api.H - GROUND_Y, 4)
  api.rectfill(0, GROUND_Y, api.W, 2, 11)
  for (let x = -((g.dist | 0) % 16); x < api.W; x += 16) api.rectfill(x, GROUND_Y + 8, 8, 1, 9)

  for (const t of g.things)
    api.spr(t.kind === 'rock' ? ROCK : t.kind === 'bird' ? BIRD : BONE, t.x, t.y)
  if (g.ducking) api.spr(DOG_DUCK, DOG_X, GROUND_Y - 6)
  else api.spr(DOG, DOG_X, g.y)
}
