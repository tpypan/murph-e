// Audit saved model outputs. Inputs are planned using read-only snapshots in a VM,
// then replayed against the ORIGINAL, UNMODIFIED game.js in the real browser runtime.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'bench/audits/catalog-generations')
mkdirSync(out, { recursive: true })
const require = createRequire(join(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const cases = [
  [
    'fighter-1p',
    '2026-09-19-211144657-street-fighter-but-with-batman-a-qljlj3',
    'game',
    1,
    'fighter',
    15000,
  ],
  [
    'fighter-2p',
    '2026-09-19-211146666-street-fighter-but-with-batman-a-BKjcS0',
    'game',
    2,
    'fighter',
    15000,
  ],
  [
    'kart-1p',
    '2026-09-19-211144675-a-kart-racing-game-around-a-coas-XuHLfP',
    'coastGame',
    1,
    'kart',
    11000,
  ],
  [
    'kart-1p-idle-audit',
    '2026-09-19-211144675-a-kart-racing-game-around-a-coas-XuHLfP',
    'coastGame',
    1,
    'kart-idle',
    11000,
  ],
  [
    'kart-2p',
    '2026-09-19-211146680-a-kart-racing-game-around-a-coas-7dafTY',
    'race',
    2,
    'kart',
    11000,
  ],
  [
    'climber-1p',
    '2026-09-19-212228451-donkey-kong-style-climb-a-constr-Ifg12N',
    'kittyKong',
    1,
    'climber',
    22000,
  ],
  [
    'pong-1p',
    '2026-09-19-212228482-classic-pong-with-satisfying-spi-ViM0GJ',
    'game',
    1,
    'pong',
    14000,
  ],
  [
    'breakout-1p',
    '2026-09-19-212248206-breakout-with-three-brick-format-4ZaE5n',
    'game',
    1,
    'breakout',
    22000,
  ],
  [
    'ninja-1p',
    '2026-09-19-212231442-a-top-down-blue-ninja-in-a-moonl-MkrhM9',
    '',
    1,
    'ninja',
    7200,
  ],
]
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
function fold(x, min, max) {
  const range = max - min,
    n = (((x - min) % (range * 2)) + range * 2) % (range * 2)
  return min + (n > range ? range * 2 - n : n)
}
function controller(type, s, f, players, ctx) {
  const h = [new Set(), new Set()]
  if (type === 'fighter')
    for (let p = 0; p < players; p++) {
      if (f < 100 || (p === 1 && f < 450)) continue
      const me = s.fighters[p],
        enemy = s.fighters[1 - p],
        gap = Math.abs(me.x - enemy.x),
        toward = me.x < enemy.x ? 'right' : 'left'
      if (gap > 39) h[p].add(toward)
      if (f % 32 === 0) h[p].add('a')
      if (f % 79 === 0) h[p].add('b')
      if (f % 239 === 0) h[p].add('up')
      if (f % 181 === 0) {
        h[p].add('down')
        h[p].add('b')
      }
    }
  if (type === 'kart')
    for (let p = 0; p < players; p++) {
      const c = s.racers[p],
        turn = -c.x * 2 + c.curve * 0.6
      h[p].add('a')
      if (turn < -0.035) h[p].add('left')
      if (turn > 0.035) h[p].add('right')
      if (Math.abs(c.curve) > 0.3 && f % 110 < 75) h[p].add('b')
    }
  if (type === 'climber')
    for (const p of s.people) {
      if (p.dead || p.lives <= 0) continue
      const target =
        p.floor === 4 ? s.goal.x : s.ladders.find((l) => l.bottom === p.floor && l.main).x
      let dir = Math.abs(p.x - target) > 2 ? Math.sign(target - p.x) : 0
      if (p.ladder !== null) {
        const l = s.ladders[p.ladder],
          upper = s.floors[l.top],
          topY = upper.y + (l.x - 128) * upper.slope
        if (
          !s.barrels.some((b) => b.floor === l.top && Math.abs(b.x - p.x) < 18 && p.y < topY + 21)
        )
          h[p.id].add('up')
      } else if (Math.abs(p.x - target) < 3 && p.floor < 4) h[p.id].add('up')
      else {
        if (
          s.barrels.some(
            (b) =>
              b.floor === p.floor &&
              b.mode === 'roll' &&
              b.dir === dir &&
              (b.x - p.x) * dir > 0 &&
              (b.x - p.x) * dir < 23,
          )
        )
          dir = 0
        if (dir) h[p.id].add(dir > 0 ? 'right' : 'left')
      }
      const danger = s.barrels.some((b) => {
        const relative = dir * 72 - b.dir * b.speed,
          time = (b.x - p.x) / relative
        return (
          b.floor === p.floor &&
          Math.abs(b.y - (p.y - 6)) <= 12 &&
          Math.abs(relative) > 30 &&
          time > 0 &&
          time < 0.33
        )
      })
      if ((danger || !p.grounded) && p.ladder === null) h[p.id].add('a')
    }
  if (type === 'pong') {
    const p = s.paddles[0],
      b = s.ball
    let target = b.y
    if (b.vx < 0)
      target = fold(b.y + b.vy * ((21 - b.x) / b.vx), 38, 196) - (s.stats.hits[0] % 2 ? -7 : 7)
    if (Math.abs(target - p.y) > 2) h[0].add(target > p.y ? 'down' : 'up')
    if ((s.phase === 'serve' && f % 12 === 0) || (s.phase === 'rally' && b.vx < 0 && b.x < 155))
      h[0].add('a')
  }
  if (type === 'breakout') {
    const p = s.paddles[0]
    if (s.phase === 'serve') {
      if (f % 10 === 0) h[0].add('a')
    } else {
      const incoming = s.balls
        .map((b) => ({
          ...b,
          landing: fold(b.x + (b.vx * (188 - b.y)) / Math.max(b.vy, 1), 14, 242),
          time: (188 - b.y) / Math.max(b.vy, 1),
        }))
        .filter((b) => b.vy > 0)
        .sort((a, b) => a.time - b.time)[0]
      if (incoming) {
        const targets = s.bricks.filter((b) => b.hp > 0),
          brick = targets[Math.floor(s.clock / 4) % Math.max(1, targets.length)],
          angle = brick ? Math.atan2(brick.x + 11 - incoming.landing, 188 - brick.y) : 0.4
        const target = incoming.landing - clamp(angle / 1.05, -0.88, 0.88) * (p.wide > 0 ? 26 : 20)
        if (Math.abs(target - p.x) > 1.5) h[0].add(target > p.x ? 'right' : 'left')
        if (incoming.time < 0.12 && f % 18 === 0) h[0].add('a')
      }
    }
  }
  if (type === 'ninja') {
    // Waypoints follow the authored garden lanes. No teleportation or state edits.
    const path = [
      [60, 184],
      [35, 184],
      [35, 135],
      [35, 65],
      [46, 65],
      [101, 64],
      [145, 64],
      [176, 64],
      [221, 64],
      [221, 95],
      [221, 110],
      [118, 111],
      [166, 111],
      [166, 139],
      [201, 139],
      [219, 192],
      [146, 185],
    ]
    ctx.waypoint ??= 0
    let target = path[Math.min(ctx.waypoint, path.length - 1)],
      p = s.player
    if (Math.hypot(p.x - target[0], p.y - target[1]) < 4 && ctx.waypoint < path.length - 1) {
      ctx.waypoint++
      target = path[ctx.waypoint]
    }
    const dx = target[0] - p.x,
      dy = target[1] - p.y
    if (Math.abs(dx) > 2) h[0].add(dx > 0 ? 'right' : 'left')
    if (Math.abs(dy) > 2) h[0].add(dy > 0 ? 'down' : 'up')
    if (
      (f === 7 || s.beetles.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 30)) &&
      p.cooldown <= 0
    )
      h[0].add('a')
  }
  return h
}
function plan(c) {
  const [name, id, variable, players, type, max] = c
  const dir = join(root, 'runs', id),
    code = readFileSync(join(dir, 'game.js'), 'utf8'),
    spec = JSON.parse(readFileSync(join(dir, 'spec.json'), 'utf8'))
  const rand = rng(7),
    math = Object.create(Math)
  math.random = rand
  const sandbox = vm.createContext({ Math: math })
  vm.runInContext(code, sandbox)
  const inspect = vm.runInContext(
    type === 'ninja'
      ? '()=>JSON.parse(JSON.stringify({player,scrolls,beetles,mode,lives,collected,clip,clipTicks,dashVisible}))'
      : `()=>${variable}.inspect()`,
    sandbox,
  )
  let held = [new Set(), new Set()],
    prev = [new Set(), new Set()],
    terminal = null,
    frame = 0
  const scores = [0, 0],
    events = [],
    audio = new Set(),
    inputs = [],
    shots = [],
    seen = new Set(),
    ctx = {}
  let invalidTargets = 0
  function score(value, p, add) {
    let targets = players === 2 ? (p === undefined ? [0, 1] : [clamp(p | 0, 0, 1)]) : [0]
    if (typeof p === 'number' && p >= players) invalidTargets++
    for (const i of targets) {
      const old = scores[i]
      scores[i] = Math.max(0, Math.floor((add ? old : 0) + value))
      events.push({
        frame,
        type: add ? 'addScore' : 'score',
        player: p ?? null,
        target: i,
        value,
        old,
        new: scores[i],
      })
    }
  }
  const api = {
    W: 256,
    H: 224,
    players,
    P1: 12,
    P2: 8,
    frame: 0,
    t: 0,
    btn: (b, p = 0) => held[p]?.has(b) || false,
    btnp: (b, p = 0) => (held[p]?.has(b) && !prev[p]?.has(b)) || false,
    score: (n, p) => score(n, p, false),
    addScore: (n, p) => score(n, p, true),
    getScore: (p) => scores[players === 2 ? clamp(p ?? 0, 0, 1) : 0],
    win: (p) => (terminal ??= { state: 'win', winner: p ?? null, frame }),
    gameOver: () => (terminal ??= { state: 'gameover', frame }),
    rnd: (n = 1) => rand() * (Number(n) || 0),
    rndi: (a, b) => Math.min(a, b) + Math.floor(rand() * (Math.abs(b - a) + 1)),
    clamp,
    dist: (x, y, a, b) => Math.hypot(x - a, y - b),
    sfx: (n) => audio.add(n),
    tone: () => {},
    textWidth: (s, n = 1) => String(s).length * 8 * n,
  }
  for (const key of [
    'cls',
    'pset',
    'pget',
    'line',
    'rect',
    'rectfill',
    'circ',
    'circfill',
    'spr',
    'text',
    'textCenter',
    'flash',
    'shake',
  ])
    api[key] = () => {}
  sandbox.init(api)
  let last = inspect(),
    failure = null
  const initial = JSON.parse(JSON.stringify(last))
  function shot(label, s) {
    if (seen.has(label)) return
    seen.add(label)
    shots.push({
      name: label,
      frame: frame + 1,
      state: JSON.parse(JSON.stringify(s)),
      scores: scores.slice(0, players),
    })
  }
  for (frame = 0; frame < max && !terminal; frame++) {
    held = controller(type, last, frame, players, ctx)
    for (let p = 0; p < players; p++)
      for (const b of ['up', 'down', 'left', 'right', 'a', 'b'])
        if (held[p].has(b) !== prev[p].has(b))
          inputs.push({ at: frame, player: p, button: b, down: held[p].has(b) })
    api.frame = frame + 1
    api.t = (frame + 1) / 60
    try {
      sandbox.update(api, 1 / 60)
      sandbox.draw(api)
    } catch (e) {
      failure = { frame, error: e.stack }
      break
    }
    const s = inspect()
    if (frame === 0) shot('idle', s)
    if (type === 'fighter') {
      if (s.fighters[0].action === 'light' && s.fighters[0].age >= 5) shot('attack', s)
      if (s.projectiles.length) shot('special', s)
      if (s.round > 1) shot('round-two', s)
    }
    if (type.startsWith('kart')) {
      if (s.racers[0].speed > 900 && Math.abs(s.racers[0].curve) < 0.1) shot('straight', s)
      if (s.racers[0].drift > 0.15) shot('drift', s)
      if (s.stats.driftBoosts > 0 && s.racers[0].boost > 0.1) shot('turbo', s)
      if (s.racers[0].checkpoint >= 1) shot('checkpoint', s)
      if (
        type.startsWith('kart') &&
        players === 1 &&
        s.racers[0].lap === 0 &&
        s.racers[0].checkpoint === 0 &&
        scores[0] > last.racers[0].score + 40
      )
        shot('rival-score', s)
      if (s.racers[0].lap >= 2) shot('final-lap', s)
      if (s.racers[0].finishTime !== null) shot('finish-banner', s)
      if (
        s.racers.some((r) => r.id > 0 && r.finishTime !== null) &&
        s.racers[0].finishTime === null
      )
        shot('rival-finish', s)
    }
    if (type === 'climber') {
      if (s.people[0].ladder !== null && s.barrels.length) shot('ladder', s)
      if (s.people[0].floor >= 2 && s.barrels.length >= 3) shot('barrels', s)
      if (s.stage >= 2) shot('stage-two', s)
    }
    if (type === 'pong') {
      if (s.stats.hits[0] >= 2 && s.phase === 'rally') shot('rally', s)
      if (s.stats.powerHits[0] > 0 && s.phase === 'rally') shot('charged-return', s)
      if (s.points[0] > 0) shot('point', s)
    }
    if (type === 'breakout') {
      if (s.stats.brickHits > 0 && s.bricks.some((b) => b.hp > 0 && b.hp < b.maxHp))
        shot('cracked-bricks', s)
      if (s.pickups.length) shot('pickup', s)
      if (s.stage >= 1) shot('stage-two', s)
      if (s.stage >= 2) shot('stage-three', s)
    }
    if (type === 'ninja') {
      if (s.clip.startsWith('walk') && s.clipTicks >= 3) shot('walking', s)
      if (s.dashVisible) shot('dash', s)
      if (s.collected >= 7) shot('seven-scrolls', s)
    }
    prev = held.map((a) => new Set(a))
    last = s
  }
  shots.push({
    name: terminal ? 'terminal' : 'end',
    frame: Math.max(1, frame),
    state: last,
    scores: scores.slice(0, players),
  })
  const resetTerminal = terminal
  sandbox.init(api)
  const reset = inspect()
  return {
    name,
    id,
    players,
    type,
    code,
    spec,
    sourceHash: createHash('sha256').update(code).digest('hex'),
    inputs,
    shots,
    final: last,
    initial,
    reset,
    terminal: resetTerminal,
    failure,
    invalidScoreTargets: invalidTargets,
    audio: [...audio],
    scoreEvents: events,
  }
}
const browser = await chromium.launch({ headless: true })
const reports = []
try {
  for (const c of cases) {
    if (process.argv[2] && !c[0].includes(process.argv[2])) continue
    const r = plan(c)
    const page = await browser.newPage()
    await page.goto('file://' + root + '/packages/runtime/index.html?probe=1')
    r.runtimeHash = createHash('sha256')
      .update(readFileSync(join(root, 'packages/runtime/runtime.js')))
      .digest('hex')
    r.load = await page.evaluate(
      ({ code, players, title }) => window.__probe.load(code, 7, title, players),
      { code: r.code, players: r.players, title: r.spec.title },
    )
    await page.evaluate(() => window.__probe.start())
    await page.evaluate((inputs) => window.__probe.inject(inputs), r.inputs)
    let now = 0
    for (const shot of r.shots.sort((a, b) => a.frame - b.frame)) {
      shot.runtime = await page.evaluate((n) => window.__probe.step(n), shot.frame - now)
      now = shot.frame
      shot.scoreMatches = JSON.stringify(shot.runtime.scores) === JSON.stringify(shot.scores)
      shot.frameHash = await page.evaluate(() => window.__probe.frameHash())
      const data = await page.evaluate(() => window.__probe.snapshot())
      shot.file = `${r.name}-${shot.name}.png`
      writeFileSync(join(out, shot.file), Buffer.from(data.split(',')[1], 'base64'))
      const enlarged = await page.evaluate(async (data) => {
        const image = new Image()
        image.src = data
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 896
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(image, 0, 0, 1024, 896)
        return canvas.toDataURL()
      }, data)
      writeFileSync(
        join(out, shot.file.replace('.png', '-4x.png')),
        Buffer.from(enlarged.split(',')[1], 'base64'),
      )
    }
    r.errors = await page.evaluate(() => window.__probe.errors())
    r.runtimeReset = await page.evaluate(() => {
      for (let p = 0; p < 2; p++)
        for (const b of ['up', 'down', 'left', 'right', 'a', 'b']) window.__probe.input(p, b, false)
      window.__probe.reset()
      window.__probe.start()
      return window.__probe.step(1)
    })
    await page.close()
    delete r.code
    writeFileSync(join(out, r.name + '.json'), JSON.stringify(r, null, 2) + '\n')
    reports.push({
      name: r.name,
      id: r.id,
      sourceHash: r.sourceHash,
      runtimeReset: r.runtimeReset,
      terminal: r.terminal,
      final: r.final,
      invalidScoreTargets: r.invalidScoreTargets,
      failure: r.failure,
      errors: r.errors,
      shots: r.shots.map(({ name, frame, file, runtime, scoreMatches }) => ({
        name,
        frame,
        file,
        runtime,
        scoreMatches,
      })),
    })
    console.log(
      JSON.stringify({
        name: r.name,
        terminal: r.terminal,
        errors: r.errors,
        invalidScoreTargets: r.invalidScoreTargets,
        shots: r.shots.map((s) => ({
          file: s.file,
          state: s.runtime.state,
          scoreMatches: s.scoreMatches,
        })),
      }),
    )
  }
} finally {
  await browser.close()
}
writeFileSync(
  join(out, process.argv[2] ? 'summary-' + process.argv[2] + '.json' : 'summary.json'),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      method:
        'Read-only VM inspection plans button transitions; original unchanged saved game.js replayed in isolated real Chromium runtime. No teleports, internal state mutations, or model calls. Native 256x224 PNGs and nearest-neighbor 4x copies.',
      reports,
    },
    null,
    2,
  ) + '\n',
)

if (!process.argv[2] || process.argv[2] === 'breakout-native') {
  const c = cases.find((c) => c[0] === 'breakout-1p'),
    source = readFileSync(join(root, 'runs', c[1], 'game.js'), 'utf8')
  const reports = [],
    browser = await chromium.launch({ headless: true }),
    page = await browser.newPage()
  page.on('console', (m) => {
    if (m.text().startsWith('CATALOG_AUDIT ')) reports.push(JSON.parse(m.text().slice(14)))
  })
  await page.goto('file://' + root + '/packages/runtime/index.html?probe=1')
  const observer = `
 const __auditUpdate=update,__auditControl=${controller.toString()},__auditCtx={};
 const clamp=${clamp.toString()},fold=${fold.toString()};
 update=function(api,dt){
  const before=game.inspect(),held=__auditControl('breakout',before,api.frame-1,api.players,__auditCtx),saved=api.btn;
  api.btn=(button,p=0)=>held[p].has(button);
  try{__auditUpdate(api,dt)}finally{api.btn=saved}
  const s=game.inspect();
  if(s.phase==='finished'||s.stats.stagesCleared!==before.stats.stagesCleared||api.frame%1800===0)console.log('CATALOG_AUDIT '+JSON.stringify({frame:api.frame,score:api.getScore(),state:s}));
 };
 `
  const load = await page.evaluate(
    (code) => window.__probe.load(code, 7, 'CRACKOUT', 1),
    source + observer,
  )
  await page.evaluate(() => window.__probe.start())
  let result = null,
    frames = 0
  while (frames < 22000) {
    result = await page.evaluate(() => window.__probe.step(60))
    frames += 60
    if (result.state !== 'playing') break
  }
  const data = await page.evaluate(() => window.__probe.snapshot())
  writeFileSync(
    join(out, 'breakout-1p-native-feedback-terminal.png'),
    Buffer.from(data.split(',')[1], 'base64'),
  )
  const errors = await page.evaluate(() => window.__probe.errors())
  await browser.close()
  writeFileSync(
    join(out, 'breakout-native-feedback.json'),
    JSON.stringify(
      {
        method:
          'Saved source unchanged on disk; an in-memory input-only wrapper reads game.inspect() and overrides api.btn for one update, restores it immediately, and logs read-only telemetry. No physics, game state, drawing, or config changes.',
        sourceHash: createHash('sha256').update(source).digest('hex'),
        load,
        result,
        errors,
        reports,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(
    JSON.stringify({ name: 'breakout-native-feedback', result, errors, final: reports.at(-1) }),
  )
}
