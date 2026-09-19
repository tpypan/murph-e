// TITLE: STAR BLAST
// GENRE: shooter
// CONTROLS: left right a
// A ship at the bottom moves left and right and fires upward. Enemies come
// down in waves, sway, and drop bombs. The hook: an enemy that is about to
// dive flashes first and is worth triple, so the points are in the thing
// coming at you. Kills without being hit build a combo that multiplies them.
// Waves only until 20 s, then divers, then turrets that fire aimed shots.
// A killed enemy sometimes drops a pod that gives a few seconds of spread shot.
//
// The runtime calls init(api) once, then update(api, dt) and draw(api) at 60 Hz.
// The runtime owns the score HUD, the title card and the GAME OVER screen.

const SHIP = ['...cc...', '..cccc..', '.cc7ccc.', 'cccccccc', 'c.8cc8.c', '...99...']
const ENEMY = ['.b....b.', '..b..b..', '.bbbbbb.', 'bb7bb7bb', 'bbbbbbbb', 'b.b..b.b']
const DIVER = ['.9....9.', '..9..9..', '.999999.', '99a99a99', '.999999.', '..9..9..']
const TURRET = ['..5555..', '.577775.', '5578755.', '55555555', '.5.55.5.', '..8..8..']
const BOMB = ['.8.', '888', '.8.']
const POD = ['.aa.', 'a77a', 'a77a', '.aa.']
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..']

const SHIP_W = 8
const SHIP_H = 6
const SHIP_Y = 200

let g

function init(api) {
  g = {
    px: api.W / 2 - SHIP_W / 2,
    lives: 3,
    combo: 1,
    spread: 0,
    shots: [], // { x, y }
    bombs: [], // { x, y, vx, vy }
    pods: [], // { x, y }
    enemies: [], // { x, y, baseX, kind, wind, passed, dead }
    cooldown: 0,
    wave: 0,
    hurt: 0,
    time: 0,
    stars: [],
  }
  for (let i = 0; i < 30; i++)
    g.stars.push({ x: api.rndi(0, api.W - 1), y: api.rndi(14, api.H - 1) })
  spawnWave()
  api.score(0)
}

/** 0 before 20 s, 1 before 45 s, 2 after: each stage adds a kind of enemy. */
function stageOf() {
  return g.time >= 45 ? 2 : g.time >= 20 ? 1 : 0
}

function spawnWave() {
  g.wave++
  const stage = stageOf()
  const cols = Math.min(10, 5 + g.wave)
  const rows = Math.min(4, 1 + Math.floor(g.wave / 2))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = 24 + c * 20
      // Turrets only appear once the third stage starts.
      const kind = stage >= 2 && r === 0 && c % 3 === 0 ? 'turret' : 'grunt'
      g.enemies.push({ x, y: 24 + r * 14 - rows * 14, baseX: x, kind, wind: 0, dead: false })
    }
  }
}

function hurt(api) {
  if (g.hurt > 0) return
  g.lives--
  g.combo = 1
  g.spread = 0
  g.hurt = 60
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function fire(api) {
  const x = g.px + SHIP_W / 2 - 1
  g.shots.push({ x, y: SHIP_Y - 2, vx: 0 })
  if (g.spread > 0) {
    g.shots.push({ x, y: SHIP_Y - 2, vx: -1.4 })
    g.shots.push({ x, y: SHIP_Y - 2, vx: 1.4 })
  }
  g.cooldown = 12
  api.sfx('shoot')
}

function update(api, dt) {
  g.time += dt
  const stage = stageOf()
  const speed = 0.25 + g.wave * 0.08 + api.t * 0.004

  // Ship
  if (api.btn('left')) g.px -= 2.2
  if (api.btn('right')) g.px += 2.2
  g.px = api.clamp(g.px, 0, api.W - SHIP_W)
  if (g.cooldown > 0) g.cooldown--
  if (api.btn('a') && g.cooldown === 0) fire(api)
  if (g.spread > 0) g.spread -= dt

  // Shots
  for (const s of g.shots) {
    s.y -= 5
    s.x += s.vx
  }
  g.shots = g.shots.filter((s) => s.y > 10)

  // Enemies descend and sway. A grunt low enough winds up, flashes, then
  // dives: half a second of warning before it can reach the ship.
  for (const e of g.enemies) {
    if (e.wind > 0) {
      e.wind--
      if (e.wind === 0) e.kind = 'diver'
    }
    if (e.kind === 'diver') {
      e.y += 2.6 + speed
      e.x += Math.sign(g.px - e.x) * 0.7
    } else {
      e.y += speed
      e.x = e.baseX + Math.sin(api.t * 2 + e.baseX * 0.05) * 10
    }
    if (stage >= 1 && e.kind === 'grunt' && e.y > 60 && api.rnd() < 0.002) e.wind = 30
    if (e.kind === 'diver' && api.collide(e.x, e.y, 8, 6, g.px, SHIP_Y, SHIP_W, SHIP_H)) {
      e.dead = true
      hurt(api)
    } else if (e.kind === 'diver' && !e.passed && e.y > SHIP_Y + SHIP_H) {
      // A dodged diver is worth a couple of points: it paid to stand near it.
      e.passed = true
      if (Math.abs(e.x - g.px) < 16) {
        api.addScore(2)
        api.sfx('select')
      }
    }
    const fires = e.kind === 'turret' ? 0.004 : 0.0015 + g.wave * 0.0005
    if (!e.dead && api.rnd() < fires) {
      // A turret aims; a grunt just drops.
      const vx = e.kind === 'turret' ? api.clamp((g.px - e.x) * 0.02, -1.2, 1.2) : 0
      g.bombs.push({ x: e.x + 3, y: e.y + 6, vx, vy: 1.5 + g.wave * 0.2 })
    }
  }

  // Shots hit enemies. A diver is coming at you and pays triple.
  for (const s of g.shots) {
    for (const e of g.enemies) {
      if (e.dead || !api.collide(s.x, s.y, 2, 6, e.x, e.y, 8, 6)) continue
      e.dead = true
      s.y = -10
      g.combo = Math.min(8, g.combo + 1)
      const worth = e.kind === 'diver' ? 30 : e.kind === 'turret' ? 20 : 10
      api.addScore(worth * g.combo)
      api.sfx('explode')
      api.flash(10, 1)
      if (api.rnd() < 0.08) g.pods.push({ x: e.x + 2, y: e.y })
    }
  }
  g.enemies = g.enemies.filter((e) => !e.dead && e.y < api.H)

  // An enemy that reaches the bottom costs a life.
  for (const e of g.enemies) {
    if (e.y + 6 >= SHIP_Y && e.kind !== 'diver') {
      g.enemies = []
      g.bombs = []
      hurt(api)
      break
    }
  }

  // Bombs
  for (const b of g.bombs) {
    b.y += b.vy
    b.x += b.vx
    if (g.hurt <= 0 && api.collide(b.x, b.y, 3, 3, g.px, SHIP_Y, SHIP_W, SHIP_H)) {
      b.y = api.H + 10
      hurt(api)
    }
  }
  g.bombs = g.bombs.filter((b) => b.y < api.H)
  for (const p of g.pods) {
    p.y += 1.1
    if (!api.collide(p.x, p.y, 4, 4, g.px, SHIP_Y, SHIP_W, SHIP_H)) continue
    p.y = api.H + 10
    g.spread = 7
    api.addScore(25 * g.combo)
    api.sfx('powerup')
    api.flash(12, 2)
  }
  g.pods = g.pods.filter((p) => p.y < api.H)

  if (g.enemies.length === 0 && g.hurt <= 0) {
    api.addScore(50 * g.combo)
    api.sfx('powerup')
    spawnWave()
  }
  if (g.hurt > 0) g.hurt--
}

function draw(api) {
  api.cls(0)
  for (const s of g.stars)
    api.pset(s.x, (s.y + api.frame * 0.3) % api.H, 1 + (s.x % 3 === 0 ? 12 : 0))
  api.rectfill(0, api.H - 8, api.W, 8, 5)

  // A winding-up grunt blinks as a diver: the dive is telegraphed before it
  // starts.
  for (const e of g.enemies) {
    const winding = e.wind > 0 && api.frame % 6 < 3
    api.spr(winding || e.kind === 'diver' ? DIVER : e.kind === 'turret' ? TURRET : ENEMY, e.x, e.y)
  }
  for (const s of g.shots) api.rectfill(s.x, s.y, 2, 6, 10)
  for (const b of g.bombs) api.spr(BOMB, b.x, b.y)
  for (const p of g.pods) api.spr(POD, p.x, p.y)
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(SHIP, g.px, SHIP_Y)

  for (let i = 0; i < g.lives; i++) api.spr(HEART, 112 + i * 8, 4)
  if (g.combo > 1) api.text(`X${g.combo}`, 4, 14, 10)
  if (g.spread > 0) api.text('SPREAD', 40, 14, 11)
  api.text(`WAVE ${g.wave}`, 4, api.H - 7, 7)
}
