// TITLE: CRAFT DASH
// GENRE: runner
// CONTROLS: left right a b
// Gather scraps, craft tools to break hazards, and dash through the wilds.

const EXPLORER = [
  '..999...',
  '.9aaa9..',
  '.95559..',
  '..444...',
  '.4cccc4.',
  '.4c44c4.',
  '..4..4..',
  '.33..33.',
]
const ROCK = [
  '..55....',
  '.5665...',
  '565665..',
  '5565555.',
  '55565555',
  '.555555.',
]
const BRAMBLE = [
  '...3.3..',
  '.3.3b.3.',
  '..b3b3..',
  '.3bbb.3.',
  '3b3bbb3.',
  '.33b33..',
]
const BEAST = [
  '.4....4.',
  '444..444',
  '.499994.',
  '44911944',
  '44499444',
  '.4.44.4.',
  '44....44',
]
const WOOD = ['..9...', '.944..', '94449.', '.944..', '..9...']
const ORE = ['..6...', '.655..', '65556.', '.655..', '..6...']
const CRYSTAL = ['..d...', '.dcd..', 'dcccd.', '.dcd..', '..d...']
const TOOL = ['..7.....', '.777....', '..7.....', '..7.....', '..4444..', '...44...']
const HEART = ['.8.8.', '88888', '.888.', '..8..']

const GROUND_Y = 202
const PLAYER_Y = 184
const PLAYER_W = 8
const PLAYER_H = 8

let g

function init(api) {
  g = {
    px: 42,
    vx: 0,
    speed: 2,
    dist: 0,
    stamina: 100,
    things: [],
    spawnIn: 190,
    resources: { wood: 0, ore: 0, crystal: 0 },
    tool: null,
    craftFx: 0,
    dash: 0,
    dashCharge: 100,
    hurt: 0,
    lives: 3,
    dust: [],
    hills: [],
  }
  for (let i = 0; i < 7; i++)
    g.hills.push({ x: i * 48, h: api.rndi(14, 35) })
  for (let i = 0; i < 18; i++)
    g.dust.push({ x: api.rndi(0, api.W), y: api.rndi(GROUND_Y + 4, api.H - 2) })
  api.score(0)
}

function spawn(api) {
  const danger = 0.48 + Math.min(0.35, api.t * 0.004)
  const r = api.rnd()
  if (r > danger) {
    const kinds = ['wood', 'ore', 'crystal']
    const kind = kinds[api.rndi(0, 2)]
    g.things.push({
      x: api.W + 8,
      y: PLAYER_Y + api.rndi(-4, 4),
      kind,
      gone: false,
    })
  } else {
    const kinds = ['rock', 'bramble', 'beast']
    const kind = kinds[api.rndi(0, 2)]
    g.things.push({
      x: api.W + 8,
      y: kind === 'rock' ? 196 : kind === 'bramble' ? 195 : 194,
      kind,
      gone: false,
      phase: api.rnd(6),
    })
  }
}

function bestTool() {
  if (g.resources.crystal > 0) return 'crystal'
  if (g.resources.ore > 0) return 'ore'
  if (g.resources.wood > 0) return 'wood'
  return null
}

function craft(api) {
  const material = bestTool()
  g.craftFx = 16
  if (material) {
    g.resources[material]--
    g.tool = material
    api.addScore(material === 'crystal' ? 30 : material === 'ore' ? 20 : 10)
    api.sfx('powerup')
    api.flash(10, 1)
  } else {
    api.sfx('shoot')
  }

  let target = null
  for (const t of g.things) {
    if (!t.gone && isHazard(t.kind) && t.x > g.px && t.x < g.px + 70) {
      if (!target || t.x < target.x) target = t
    }
  }
  if (target && g.tool) {
    target.gone = true
    api.addScore(40)
    api.sfx('explode')
    api.flash(10, 1)
    g.tool = null
  }
}

function isHazard(kind) {
  return kind === 'rock' || kind === 'bramble' || kind === 'beast'
}

function takeHit(api, t) {
  if (g.hurt > 0 || g.dash > 0 || api.t <= 2) return
  t.gone = true
  g.lives--
  g.stamina -= 28
  g.hurt = 75
  api.sfx('hit')
  api.flash(8, 3)
  api.shake(10)
  if (g.lives <= 0 || g.stamina <= 0) {
    api.sfx('die')
    api.gameOver()
  }
}

function update(api, dt) {
  g.speed = 2 + api.t * 0.045
  g.dist += g.speed + (g.dash > 0 ? 3 : 0)
  if (api.frame % 15 === 0) api.addScore(1)

  if (api.btn('left')) g.vx -= 0.38
  if (api.btn('right')) g.vx += 0.38
  g.vx *= 0.78
  g.px = api.clamp(g.px + g.vx, 12, 126)

  if (api.btnp('a')) craft(api)
  if (api.btnp('b')) {
    g.dash = 24
    g.dashCharge = Math.max(0, g.dashCharge - 18)
    api.sfx('jump')
  }
  if (g.dash > 0) g.dash--
  else g.dashCharge = Math.min(100, g.dashCharge + 0.16)
  if (g.craftFx > 0) g.craftFx--
  if (g.hurt > 0) g.hurt--

  g.stamina -= (0.012 + api.t * 0.00025) * (g.dash > 0 ? 1.4 : 1)
  if (g.stamina <= 0 && api.t > 3) {
    api.sfx('die')
    api.gameOver()
    return
  }

  g.spawnIn--
  if (g.spawnIn <= 0) {
    spawn(api)
    const density = Math.min(50, api.t * 0.7)
    g.spawnIn = Math.max(18, api.rndi(48, 82) - density)
  }

  for (const t of g.things) {
    t.x -= g.speed + (g.dash > 0 ? 2.5 : 0)
    if (t.kind === 'beast') t.y += Math.sin(api.t * 7 + t.phase) * 0.35
    if (t.gone) continue
    const size = isHazard(t.kind) ? 7 : 5
    if (api.collide(g.px + 1, PLAYER_Y + 1, 6, 7, t.x, t.y, size, size)) {
      if (isHazard(t.kind)) {
        if (g.dash > 0) {
          t.gone = true
          api.addScore(25)
          api.sfx('explode')
          api.flash(10, 1)
        } else if (g.tool) {
          t.gone = true
          g.tool = null
          api.addScore(35)
          api.sfx('explode')
          api.flash(10, 1)
        } else takeHit(api, t)
      } else {
        t.gone = true
        g.resources[t.kind]++
        g.stamina = Math.min(100, g.stamina + 5)
        api.addScore(t.kind === 'crystal' ? 20 : 10)
        api.sfx('coin')
        api.flash(10, 1)
      }
    }
  }
  g.things = g.things.filter((t) => !t.gone && t.x > -12)
}

function draw(api) {
  api.cls(12)
  api.rectfill(0, 12, api.W, 45, 13)
  api.circfill(218, 36, 13, 10)

  for (const h of g.hills) {
    const x = ((h.x - g.dist * 0.16) % 336 + 336) % 336 - 40
    api.circfill(x, GROUND_Y, h.h, 3)
  }
  api.rectfill(0, 164, api.W, 38, 11)
  api.rectfill(0, 183, api.W, 19, 3)
  api.rectfill(0, GROUND_Y, api.W, api.H - GROUND_Y, 4)
  api.rectfill(0, GROUND_Y, api.W, 2, 9)

  for (let x = -((g.dist | 0) % 20); x < api.W; x += 20)
    api.rectfill(x, 210, 10, 2, 9)
  for (const d of g.dust)
    api.pset(((d.x - g.dist * 0.7) % api.W + api.W) % api.W, d.y, 6)

  for (const t of g.things) {
    const sprite =
      t.kind === 'rock' ? ROCK :
      t.kind === 'bramble' ? BRAMBLE :
      t.kind === 'beast' ? BEAST :
      t.kind === 'wood' ? WOOD :
      t.kind === 'ore' ? ORE : CRYSTAL
    api.spr(sprite, t.x, t.y)
  }

  if (g.dash > 0) {
    api.line(g.px - 18, PLAYER_Y + 2, g.px - 3, PLAYER_Y + 2, 7)
    api.line(g.px - 13, PLAYER_Y + 6, g.px - 2, PLAYER_Y + 6, 10)
  }
  if (g.craftFx > 0) {
    api.circ(g.px + 4, PLAYER_Y + 3, 10 - (g.craftFx >> 1), 10)
    api.spr(TOOL, g.px + 8, PLAYER_Y - 9)
  }
  if (g.hurt <= 0 || api.frame % 6 < 3) api.spr(EXPLORER, g.px, PLAYER_Y)

  api.rect(4, 15, 102, 7, 7)
  api.rectfill(5, 16, g.stamina, 5, g.stamina > 30 ? 11 : 8)
  api.text(`W${g.resources.wood}`, 112, 14, 9)
  api.text(`O${g.resources.ore}`, 152, 14, 6)
  api.text(`C${g.resources.crystal}`, 192, 14, 13)
  for (let i = 0; i < g.lives; i++) api.spr(HEART, 230 + i * 7, 16)
}
