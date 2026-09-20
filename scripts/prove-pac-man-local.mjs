// Ordinary directional-input playthrough; inspection is read-only and no state is patched.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { closeProbe, probe } from '../packages/probe/src/index.ts'

const root = resolve(import.meta.dirname, '..')
const pack = resolve(root, 'data/local-catalog/pac-man-maze-reference')
const out = resolve(pack, 'verification')
mkdirSync(out, { recursive: true })
const source = readFileSync(resolve(pack, 'module.js'), 'utf8')
const factory = Function(`return ${source}`)()
const hash = (value) => createHash('sha256').update(value).digest('hex')
const save = (name, value) =>
  writeFileSync(resolve(out, name), `${JSON.stringify(value, null, 2)}\n`)
const directions = [
  [1, 0, 'right'],
  [0, 1, 'down'],
  [-1, 0, 'left'],
  [0, -1, 'up'],
]
function neighbor(layout, point, d) {
  let x = point.x + directions[d][0],
    y = point.y + directions[d][1]
  if (point.y === 9 && (x < 0 || x > 18)) x = (x + 19) % 19
  return !['#', 'H', '='].includes(layout[y]?.[x] ?? '#') ? { x, y } : null
}
function field(layout, start) {
  const queue = [start],
    distance = new Map([[start.y * 19 + start.x, 0]])
  for (let i = 0; i < queue.length; i++)
    for (let d = 0; d < 4; d++) {
      const next = neighbor(layout, queue[i], d)
      if (next && !distance.has(next.y * 19 + next.x)) {
        distance.set(next.y * 19 + next.x, distance.get(queue[i].y * 19 + queue[i].x) + 1)
        queue.push(next)
      }
    }
  return distance
}
function simulator(players) {
  let held = [new Set(), new Set()],
    previous = [new Set(), new Set()],
    tick = 0,
    terminal = null
  const inputs = [],
    scores = Array(players).fill(0),
    game = factory()
  const api = {
    players,
    W: 256,
    H: 224,
    P1: 12,
    P2: 8,
    btn: (b, p = 0) => held[p].has(b),
    btnp: (b, p = 0) => held[p].has(b) && !previous[p].has(b),
    score(n, p) {
      if (p === undefined) scores.fill(n)
      else scores[p] = n
    },
    addScore(n, p) {
      if (p === undefined) scores.forEach((s, i) => (scores[i] += n))
      else scores[p] += n
    },
    getScore: (p = 0) => scores[p],
    sfx() {},
    shake() {},
    win: () => {
      terminal = 'win'
    },
    gameOver: () => {
      terminal = 'gameover'
    },
  }
  game.init(api)
  return {
    game,
    inputs,
    scores,
    get tick() {
      return tick
    },
    get terminal() {
      return terminal
    },
    step(next) {
      held = next
      for (let p = 0; p < players; p++)
        for (const [, , b] of directions)
          if (held[p].has(b) !== previous[p].has(b))
            inputs.push({ at: tick, player: p, button: b, down: held[p].has(b) })
      game.update(api, 1 / 60)
      tick++
      previous = held.map((s) => new Set(s))
      return game.inspect()
    },
  }
}
// Weighted shortest routes toward remaining pellets. Danger uses current visible
// ghost positions, never future simulation or mutation of the game world.
function choose(state, p, reserved, bias = 0) {
  const player = state.players[p]
  if (player.to) return player.dir
  const threats = state.ghosts
    .filter((g) => ['chase', 'scatter'].includes(g.state))
    .map((g) => field(state.layout, g.to ?? g))
  const danger = (point) =>
    player.invulnerable > 0 || state.power > 55
      ? 30
      : Math.min(30, ...threats.map((f) => f.get(point.y * 19 + point.x) ?? 30))
  const queue = [{ x: player.x, y: player.y, cost: 0, first: null, steps: 0 }]
  const seen = new Map([[player.y * 19 + player.x, 0]])
  let best = null,
    bestValue = Infinity
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost)
    const cur = queue.shift(),
      key = cur.y * 19 + cur.x
    if (cur.cost > seen.get(key)) continue
    if (cur.first !== null && state.pellets[cur.y][cur.x]) {
      const power = state.pellets[cur.y][cur.x] === 2
      const value = cur.cost + (reserved === key ? 15 : 0) + (power && state.power < 80 ? -3 : 0)
      if (value < bestValue) {
        best = cur
        bestValue = value
      }
    }
    for (let n = 0; n < 4; n++) {
      const d = (n + bias) % 4,
        next = neighbor(state.layout, cur, d)
      if (!next) continue
      const dist = danger(next),
        cost =
          cur.cost + 1 + (dist <= 1 ? 500 : dist === 2 ? 80 : dist === 3 ? 15 : dist === 4 ? 3 : 0)
      const k = next.y * 19 + next.x
      if (cost < (seen.get(k) ?? Infinity)) {
        seen.set(k, cost)
        queue.push({ ...next, cost, first: cur.first ?? d, steps: cur.steps + 1 })
      }
    }
  }
  if (best) {
    reserved = best.y * 19 + best.x
    return { direction: best.first, reserved }
  }
  return { direction: player.dir, reserved }
}
function plan(players, idle = false) {
  const sim = simulator(players),
    marks = [],
    named = new Set(),
    held = [new Set(), new Set()]
  let before = sim.game.inspect(),
    lastScore = 0
  const note = (name, state) => {
    if (named.has(name)) return
    named.add(name)
    marks.push({ name, at: sim.tick, scores: [...sim.scores], state })
  }
  for (let tick = 0; tick < 40000 && !sim.terminal; tick++) {
    let reserved = null
    for (let p = 0; p < players; p++)
      if (!idle && !before.players[p].to) {
        const choice = choose(before, p, reserved, p * 2)
        reserved = choice.reserved
        held[p] = new Set(choice.direction >= 0 ? [directions[choice.direction][2]] : [])
      }
    const state = sim.step(held)
    if (sim.tick === 1) note('house', state)
    if (sim.tick === 260) note('play', state)
    if (state.power > 0) note('power', state)
    if (state.ghosts.some((g) => g.state === 'returning')) note('returning-eyes', state)
    if (state.ghosts.some((g) => g.state === 'reforming')) note('reforming', state)
    if (state.phase === 'death') {
      note('death-start', state)
      if (before.phase !== 'death') note(`death-${state.lives}`, state)
    }
    if (state.phase === 'clear' && before.phase !== 'clear')
      note(`round-${state.level}-clear`, state)
    if (sim.tick % 300 === 0 && sim.scores[0] !== lastScore) {
      note(`checkpoint-${sim.tick}`, state)
      lastScore = sim.scores[0]
    }
    before = state
  }
  note('terminal', before)
  const result = {
    players,
    idle,
    frames: sim.tick,
    terminal: sim.terminal,
    scores: sim.scores,
    inputs: sim.inputs,
    marks,
  }
  save(`${players}p-${idle ? 'idle' : 'play'}-plan.json`, result)
  console.log(
    JSON.stringify({
      players,
      idle,
      frames: sim.tick,
      terminal: sim.terminal,
      scores: sim.scores,
      remaining: before.remaining,
      level: before.level,
      lives: before.lives,
    }),
  )
  return result
}
const plans = [plan(1), plan(2), plan(1, true), plan(2, true)]
if (process.argv.includes('--plan-only'))
  process.exit(plans.slice(0, 2).every((p) => p.terminal === 'win') ? 0 : 1)
const require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright'),
  browser = await chromium.launch()
const code = `const base=(${source});let game;function init(api){game=base();game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api)}`
const results = [],
  probes = []
try {
  const page = await browser.newPage()
  await page.goto(`${pathToFileURL(resolve(root, 'packages/runtime/index.html'))}?probe=1`)
  for (const plan of plans) {
    const loaded = await page.evaluate(
      ({ code, players, inputs }) => {
        const p = window.__probe
        const r = p.load(code, 19, 'PAC-MAN MAZE', players)
        p.start()
        p.inject(inputs)
        return r
      },
      { code, players: plan.players, inputs: plan.inputs },
    )
    assert(loaded.ok)
    let at = 0
    const checks = []
    for (const mark of plan.marks) {
      const state = await page.evaluate((n) => window.__probe.step(n), mark.at - at)
      at = mark.at
      assert.deepEqual(state.scores, mark.scores)
      if (!mark.name.startsWith('checkpoint-')) {
        const png = await page.evaluate(() => window.__probe.snapshot())
        writeFileSync(
          resolve(out, `${plan.players}p-${plan.idle ? 'idle' : 'play'}-${mark.name}.png`),
          Buffer.from(png.split(',')[1], 'base64'),
        )
      }
      checks.push({ name: mark.name, frame: at, scores: state.scores, state: state.state })
    }
    const state = await page.evaluate(() => window.__probe.step(1)),
      errors = await page.evaluate(() => window.__probe.errors())
    assert.equal(errors.length, 0)
    assert.equal(state.state, plan.terminal)
    if (!plan.idle)
      assert.equal(
        state.state,
        'win',
        'Default classic play must clear all3 rounds with all4 ghosts active',
      )
    else assert.equal(state.state, 'gameover')
    // Fresh init must reset actors, score and state, not carry the preceding terminal.
    const fresh = await page.evaluate(
      ({ code, players }) => {
        const p = window.__probe
        p.load(code, 19, 'PAC-MAN MAZE', players)
        p.start()
        return p.step(0)
      },
      { code, players: plan.players },
    )
    assert.equal(fresh.state, 'playing')
    assert(fresh.scores.every((s) => s === 0))
    results.push({
      players: plan.players,
      idle: plan.idle,
      frames: plan.frames,
      checks,
      state,
      errors,
      fresh,
    })
  }
  for (const players of [1, 2]) {
    const { thumb, ...result } = await probe(code, {
      players,
      title: 'PAC-MAN MAZE',
      controls: ['left', 'right', 'up', 'down'],
    })
    if (thumb) writeFileSync(resolve(out, `${players}p-probe.png`), thumb)
    assert(result.ok, JSON.stringify(result.observations))
    probes.push({ players, ...result })
  }
  save('native-play.json', {
    passed: true,
    factorySha256: hash(source),
    scriptSha256: hash(readFileSync(import.meta.filename)),
    config: {},
    results,
    probes,
    limitations: [
      'Read-only telemetry planner is not a human balance study',
      'Project maze/controller, not original ROM rules',
      'Native scores/terminal compared at checkpoints; individual lifecycle transitions inspected in VM and screenshots',
    ],
  })
} finally {
  await browser.close()
  await closeProbe()
}
