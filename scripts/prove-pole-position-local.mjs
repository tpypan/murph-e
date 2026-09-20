// Input-only native proof for the local Pole Position artwork adaptation.
// pnpm --filter @htn/probe exec node --import tsx ../../scripts/prove-pole-position-local.mjs
// Exact private wrapper: add --factory /absolute/module.js --default-config --out /absolute/verification
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'
import { closeProbe, probe } from '../packages/probe/src/index.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = resolve(root, 'data/reference-cache/spriters-resource/pole-position')
const argument = (name) => {
  const index = process.argv.indexOf(`--${name}`)
  if (index < 0) return null
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`--${name} needs a path`)
  return resolve(value)
}
const factoryPath = argument('factory') ?? resolve(root, 'library/catalog/kart/module.js')
const configPath = argument('config') ?? resolve(sourceDir, 'kart-config.json')
const output = argument('out') ?? resolve(sourceDir, 'proof')
const defaults = process.argv.includes('--default-config')
const factorySource = readFileSync(factoryPath, 'utf8').trim().replace(/;\s*$/, '')
const sourceConfig = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : null
if (!defaults && !sourceConfig) throw new Error(`Missing imported art config: ${configPath}`)
const config = defaults ? {} : sourceConfig
const hash = (value) => createHash('sha256').update(value).digest('hex')
const buttons = ['up', 'down', 'left', 'right', 'a', 'b']
const factory = vm.runInNewContext(`(${factorySource})`, {}, { timeout: 3000 })
const code = `const FACTORY=(${factorySource});\nconst CONFIG=${JSON.stringify(config)};\nlet game;\nfunction init(api){game=FACTORY(CONFIG);game.init(api)}\nfunction update(api,dt){game.update(api,dt)}\nfunction draw(api){game.draw(api)}\n`
mkdirSync(output, { recursive: true })
const save = (name, value) => writeFileSync(resolve(output, name), value)
const json = (name, value) => save(name, `${JSON.stringify(value, null, 2)}\n`)
save('prototype-game.js', code)

function simulator(players) {
  let held = [new Set(), new Set()],
    previous = [new Set(), new Set()]
  let frame = 0,
    terminal = null
  const scores = Array(players).fill(0),
    scoreEvents = [],
    sound = new Set()
  const api = {
    W: 256,
    H: 224,
    players,
    frame: 0,
    t: 0,
    P1: 12,
    P2: 8,
    btn: (button, player = 0) => held[player]?.has(button) ?? false,
    btnp: (button, player = 0) => !!held[player]?.has(button) && !previous[player]?.has(button),
    score(value, player = 0) {
      assert.ok(player >= 0 && player < players, `Invalid human score target ${player}`)
      scores[player] = Math.max(0, Math.floor(value))
      scoreEvents.push({ frame, player, value: scores[player] })
    },
    getScore: (player = 0) => scores[player],
    addScore(value, player = 0) {
      this.score(this.getScore(player) + value, player)
    },
    win(player) {
      terminal ??= { state: 'win', winner: player ?? null, frame }
    },
    gameOver() {
      terminal ??= { state: 'gameover', winner: null, frame }
    },
    sfx: (name) => sound.add(name),
    tone() {},
    textWidth: (value, scale = 1) => String(value).length * 8 * scale,
  }
  const game = factory(config)
  game.init(api)
  assert.equal(typeof game.inspect, 'function', 'Proof requires read-only inspect telemetry')
  const initial = game.inspect(),
    events = []
  return {
    initial,
    events,
    scores,
    scoreEvents,
    sound,
    inspect: () => game.inspect(),
    get frame() {
      return frame
    },
    get terminal() {
      return terminal
    },
    step(next) {
      held = next
      for (let player = 0; player < players; player++)
        for (const button of buttons)
          if (held[player].has(button) !== previous[player].has(button))
            events.push({ at: frame, player, button, down: held[player].has(button) })
      frame++
      api.frame = frame
      api.t = frame / 60
      game.update(api, 1 / 60)
      previous = held.map((set) => new Set(set))
      return game.inspect()
    },
    reset() {
      held = [new Set(), new Set()]
      previous = [new Set(), new Set()]
      frame = 0
      terminal = null
      api.frame = api.t = 0
      game.init(api)
      return game.inspect()
    },
  }
}

function steering(held, racer, target = 0) {
  const turn = (target - racer.x) * 2 + racer.curve * 0.6
  if (turn < -0.035) held.add('left')
  if (turn > 0.035) held.add('right')
}
function raceButtons(state, frame, players) {
  const held = [new Set(), new Set()]
  for (let p = 0; p < players; p++) {
    const car = state.racers[p]
    held[p].add('a')
    steering(held[p], car, players === 2 ? (p === 0 ? -0.25 : 0.25) : 0)
    if (Math.abs(car.curve) > 0.3 && frame % 110 < 75) held[p].add('b')
  }
  return held
}

function racePlan(players, idle = false) {
  const sim = simulator(players),
    marks = new Map(),
    shots = new Set(),
    gates = []
  const note = (name, state, image = true) => {
    if (shots.has(name)) return
    shots.add(name)
    const entry = marks.get(sim.frame) ?? {
      frame: sim.frame,
      names: [],
      image: false,
      state,
      scores: [...sim.scores],
    }
    entry.names.push(name)
    entry.image ||= image
    marks.set(sim.frame, entry)
  }
  const maximum = Math.ceil((sim.initial.timeLimit + 6) * 60)
  let crashFrame = null
  let before = sim.initial
  for (let frame = 0; frame < maximum && !sim.terminal; frame++) {
    const state = sim.step(idle ? [new Set(), new Set()] : raceButtons(before, frame, players))
    if (sim.frame === 1) note('grid', state)
    if (sim.frame === 120) {
      assert.equal(state.phase, 'countdown')
      assert.ok(
        state.racers.every(
          (car, p) => car.distance === sim.initial.racers[p].distance && car.speed === 0,
        ),
      )
      note('countdown', state)
    }
    if (before.phase === 'countdown' && state.phase === 'racing') note('green-light', state)
    if (!idle) {
      const car = state.racers[0]
      if (car.speed > 900 && Math.abs(car.curve) < 0.1) note('straight', state)
      if (car.curve > 0.45 && car.speed > 600) note('right-turn', state)
      if (car.curve < -0.45 && car.speed > 600) note('left-turn', state)
      if (car.drift > 0.35) note('drift', state)
      if (car.boost > 0.5 && state.stats.driftBoosts > 0) note('turbo', state)
      if (state.racers.some((racer) => racer.human && racer.crash > 0.2)) {
        crashFrame ??= sim.frame
        note('crash', state)
      }
      if (crashFrame !== null && [10, 20, 30].includes(sim.frame - crashFrame))
        note(`crash-plus-${sim.frame - crashFrame}`, state)
      for (let p = 0; p < players; p++) {
        const prior = before.racers[p],
          after = state.racers[p]
        const start = prior.lap * 4 + prior.checkpoint,
          end = after.lap * 4 + after.checkpoint
        for (let gate = start + 1; gate <= end; gate++) {
          assert.ok(
            after.distance >= (gate * state.trackLength) / 4,
            'Gate awarded before crossing its physical coordinate',
          )
          gates.push({
            player: p,
            lap: Math.floor((gate - 1) / 4) + 1,
            gate: ((gate - 1) % 4) + 1,
            frame: sim.frame,
            distance: after.distance,
            score: sim.scores[p],
          })
          note(`p${p + 1}-gate-${gate}`, state, gate === 1)
        }
        if (prior.finishTime === null && after.finishTime !== null) note(`p${p + 1}-finish`, state)
      }
    }
    if (sim.terminal) note('terminal', state)
    before = state
  }
  const final = sim.inspect(),
    terminal = sim.terminal
  assert.ok(terminal, `${players}P ${idle ? 'idle' : 'race'} never terminated`)
  assert.equal(final.phase, 'finished')
  const scores = [...sim.scores]
  if (idle) {
    assert.ok(final.time >= final.timeLimit)
    assert.ok(
      final.racers
        .filter((r) => r.human)
        .every((r) => r.finishTime === null && r.lap === 0 && r.checkpoint === 0),
    )
    assert.ok(scores.every((score) => score === 0))
    assert.equal(terminal.state, players === 1 ? 'gameover' : 'win')
  } else {
    for (let p = 0; p < players; p++) {
      const own = gates.filter((gate) => gate.player === p)
      assert.deepEqual(
        own.map((gate) => [gate.lap, gate.gate]),
        Array.from({ length: final.laps * 4 }, (_, i) => [Math.floor(i / 4) + 1, (i % 4) + 1]),
        `P${p + 1} did not complete every ordered gate`,
      )
      assert.ok(final.racers[p].finishTime > 0)
      assert.ok(scores[p] >= final.laps * 400 + 1000)
    }
    if (players === 2) {
      const first = [...final.racers.filter((r) => r.human)].sort(
        (a, b) => a.finishTime - b.finishTime,
      )[0]
      assert.equal(terminal.state, 'win')
      assert.equal(terminal.winner, first.id)
    } else assert.equal(terminal.state, final.positions[0] === 0 ? 'win' : 'gameover')
    assert.ok(
      shots.has('left-turn') && shots.has('right-turn'),
      'Route must demonstrate both steering directions',
    )
  }
  const reset = sim.reset()
  assert.deepEqual(reset, sim.initial, 'Reset must restore the complete initial telemetry')
  assert.ok(sim.scores.every((score) => score === 0))
  return {
    name: `${players}p-${idle ? 'timeout' : 'race'}`,
    players,
    mode: idle ? 'timeout' : 'race',
    initial: sim.initial,
    frames: marks.size ? Math.max(...marks.keys()) : 0,
    events: sim.events,
    marks: [...marks.values()].sort((a, b) => a.frame - b.frame),
    gates,
    terminal,
    terminalReason: idle ? 'time-limit' : 'human-finish',
    final,
    scores,
    reset,
    scoreEvents: sim.scoreEvents,
  }
}

function controlPlan(players, action) {
  const sim = simulator(players)
  const active = players - 1
  let beforeAction = null
  for (let frame = 0; frame < 331; frame++) {
    const state = sim.inspect(),
      held = [new Set(), new Set()]
    if (frame >= 181 && frame < 301) {
      held[active].add('a')
      steering(held[active], state.racers[active], active === 0 ? -0.28 : 0.28)
    }
    if (frame === 301) beforeAction = state
    if (frame >= 301 && action !== 'coast') held[active].add(action)
    sim.step(held)
  }
  const final = sim.inspect()
  assert.ok(beforeAction.racers[active].speed > 700 && beforeAction.racers[active].distance > 400)
  if (players === 2) assert.equal(final.racers[0].distance, 0, 'P2 inputs moved the idle P1 kart')
  return {
    name: `${players}p-control-${action}`,
    players,
    active,
    frames: sim.frame,
    events: sim.events,
    initial: sim.initial,
    beforeAction,
    final,
    scores: [...sim.scores],
  }
}

const plans = [racePlan(1), racePlan(2), racePlan(1, true), racePlan(2, true)]
const controls = [1, 2].flatMap((players) =>
  ['coast', 'left', 'right', 'down'].map((action) => controlPlan(players, action)),
)
for (const players of [1, 2]) {
  const group = controls.filter((c) => c.players === players),
    p = players - 1
  const [coast, left, right, brake] = group.map((c) => c.final.racers[p])
  assert.ok(left.x < coast.x - 0.2 && right.x > coast.x + 0.2)
  assert.ok(brake.speed < coast.speed - 400)
}
assert.ok(
  plans.some((p) => p.mode === 'race' && p.marks.some((m) => m.names.includes('crash'))),
  'Need a real input-driven crash capture',
)
json('input-plans.json', { plans, controls })
if (process.argv.includes('--plan-only')) {
  console.log(
    JSON.stringify(
      plans.map(({ name, frames, terminal, scores }) => ({ name, frames, terminal, scores })),
      null,
      2,
    ),
  )
  process.exit(0)
}

const require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const sourceColors = [
  ...new Set(
    (sourceConfig?.assets?.vehicles ?? [])
      .flatMap((vehicle) => Object.values(vehicle.frames).flatMap((frame) => frame.palette ?? []))
      .map((color) => color.toLowerCase()),
  ),
]
const legacy = new Set([
  '#000000',
  '#1d2b53',
  '#7e2553',
  '#008751',
  '#ab5236',
  '#5f574f',
  '#c2c3c7',
  '#fff1e8',
  '#ff004d',
  '#ffa300',
  '#ffec27',
  '#00e436',
  '#29adff',
  '#83769c',
  '#ff77a8',
  '#ffccaa',
])
const sourceOnlyColors = sourceColors.filter((color) => !legacy.has(color))
const browser = await chromium.launch({ headless: true })
const reports = [],
  controlReports = [],
  genericReports = [],
  failures = []
const page = await browser.newPage()
page.on('pageerror', (error) => failures.push(error.stack ?? error.message))
const check = (condition, message) => {
  if (!condition) failures.push(message)
}
const snapshot = async (name) => {
  const captured = await page.evaluate((colors) => {
    const p = window.__probe,
      buffer = new Uint32Array(256 * 224)
    window.__runtime.screen.blit(buffer)
    const matches = Object.fromEntries(colors.map((color) => [color, 0]))
    for (const pixel of buffer) {
      const color = `#${(pixel & 255).toString(16).padStart(2, '0')}${((pixel >>> 8) & 255).toString(16).padStart(2, '0')}${((pixel >>> 16) & 255).toString(16).padStart(2, '0')}`
      if (color in matches) matches[color]++
    }
    return { png: p.snapshot(), hash: p.frameHash(), stats: p.frameStats(), matches }
  }, sourceColors)
  const file = `${name}.png`
  save(file, Buffer.from(captured.png.split(',')[1], 'base64'))
  delete captured.png
  return { file, ...captured }
}
const load = async (players, events = []) =>
  page.evaluate(
    ({ code, players, events }) => {
      const p = window.__probe,
        result = p.load(code, 7, '', players)
      p.start()
      p.inject(events)
      return result
    },
    { code, players, events },
  )
try {
  await page.goto(`${pathToFileURL(resolve(root, 'packages/runtime/index.html'))}?probe=1`)
  const paletteWorks = await page.evaluate(() => {
    const p = window.__probe
    p.load(
      'function init(){} function update(){} function draw(api){api.cls(0);api.spr(["0"],20,20,false,false,["#123456"])}',
    )
    p.start()
    p.step(1)
    const buffer = new Uint32Array(256 * 224)
    window.__runtime.screen.blit(buffer)
    return buffer[20 * 256 + 20] === 0xff563412
  })
  assert.ok(paletteWorks, 'Rebuild runtime: exact sprite palette support is missing')
  for (const players of [1, 2]) {
    const result = await probe(code, {
      players,
      title: 'POLE POSITION ART',
      controls: ['left', 'right', 'up', 'down', 'a', 'b'],
    })
    if (result.thumb) save(`${players}p-probe.png`, result.thumb)
    genericReports.push({
      players,
      ...result,
      thumb: result.thumb ? `${players}p-probe.png` : null,
    })
    check(
      result.ok,
      `${players}P generic input probe failed: ${JSON.stringify(result.observations)}`,
    )
  }
  for (const planned of plans) {
    const loaded = await load(planned.players, planned.events)
    check(loaded.ok, `${planned.name} load failed`)
    let at = 0
    const captures = [],
      checks = []
    for (const mark of planned.marks) {
      const state = await page.evaluate((frames) => window.__probe.step(frames), mark.frame - at)
      at = mark.frame
      const scoresMatch = JSON.stringify(state.scores) === JSON.stringify(mark.scores)
      check(scoresMatch, `${planned.name} native score mismatch at ${mark.frame}`)
      checks.push({ frame: mark.frame, names: mark.names, scoresMatch, state })
      if (mark.image)
        captures.push({
          frame: mark.frame,
          names: mark.names,
          state,
          ...(await snapshot(`${planned.name}-${mark.names[0]}`)),
        })
    }
    const final = await page.evaluate(() => window.__probe.step(1))
    check(
      final.state === planned.terminal.state && final.winner === planned.terminal.winner,
      `${planned.name} native terminal differs from input-only plan`,
    )
    captures.push({
      frame: at + 1,
      names: ['terminal-overlay'],
      state: final,
      ...(await snapshot(`${planned.name}-terminal-overlay`)),
    })
    const errors = await page.evaluate(() => window.__probe.errors())
    check(errors.length === 0, `${planned.name} runtime errors: ${JSON.stringify(errors)}`)
    const reset = await page.evaluate(() => {
      const p = window.__probe
      for (let player = 0; player < 2; player++)
        for (const button of ['up', 'down', 'left', 'right', 'a', 'b'])
          p.input(player, button, false)
      p.reset()
      p.start()
      return { state: p.step(1), hash: p.frameHash() }
    })
    check(
      reset.state.state === 'playing' &&
        reset.state.winner === null &&
        reset.state.scores.every((score) => score === 0),
      `${planned.name} reset did not clear terminal/scores`,
    )
    await load(planned.players)
    const fresh = await page.evaluate(() => {
      const state = window.__probe.step(1)
      return { state, hash: window.__probe.frameHash() }
    })
    check(reset.hash === fresh.hash, `${planned.name} reset pixels do not match a fresh grid`)
    if (planned.mode === 'race' && sourceOnlyColors.length) {
      for (const capture of captures.filter((c) =>
        c.names.some((n) => ['grid', 'straight', 'left-turn', 'right-turn'].includes(n)),
      ))
        check(
          sourceOnlyColors.some((color) => capture.matches[color] > 0),
          `${planned.name} ${capture.names} has no exact source-only sprite colors`,
        )
    }
    reports.push({
      name: planned.name,
      players: planned.players,
      mode: planned.mode,
      loaded,
      checks,
      captures,
      terminalReason: planned.terminalReason,
      plannedTerminal: planned.terminal,
      final,
      reset,
      fresh,
      errors,
    })
    console.log(
      JSON.stringify({
        name: planned.name,
        terminal: final.state,
        reason: planned.terminalReason,
        winner: final.winner,
        scores: final.scores,
        errors,
      }),
    )
  }
  for (const planned of controls) {
    await load(planned.players, planned.events)
    const state = await page.evaluate((frames) => window.__probe.step(frames), planned.frames)
    const capture = await snapshot(planned.name)
    const errors = await page.evaluate(() => window.__probe.errors())
    check(!errors.length && state.state === 'playing', `${planned.name} failed in native runtime`)
    check(
      JSON.stringify(state.scores) === JSON.stringify(planned.scores),
      `${planned.name} score mismatch`,
    )
    controlReports.push({ name: planned.name, players: planned.players, state, errors, ...capture })
  }
  for (const players of [1, 2]) {
    const group = controlReports.filter((r) => r.players === players)
    for (const result of group.slice(1))
      check(
        result.hash !== group[0].hash,
        `${result.name} changed no rendered pixels versus coasting`,
      )
  }
} finally {
  await browser.close()
  await closeProbe()
}
const report = {
  at: new Date().toISOString(),
  passed: failures.length === 0,
  failures,
  factoryPath,
  configPath,
  output,
  configMode: defaults ? 'exact factory defaults ({})' : 'imported art config',
  method:
    'Read-only VM telemetry plans ordinary button transitions. Identical game.js runs in native Chromium with __probe.inject only; no state mutation, teleportation, API replacement, source rendering mock, model calls or network. Every ordered checkpoint is checked against native scores. Native 256x224 framebuffer PNGs preserve exact source palettes.',
  sourceArt:
    'Local commercial-reference artwork; this proof does not establish redistribution rights or reproduce the original ROM physics.',
  hashes: {
    factory: hash(factorySource),
    config: hash(JSON.stringify(config)),
    code: hash(code),
    runtime: hash(readFileSync(resolve(root, 'packages/runtime/runtime.js'))),
    script: hash(readFileSync(fileURLToPath(import.meta.url))),
  },
  sourceColors,
  sourceOnlyColors,
  generic: genericReports,
  races: reports,
  controls: controlReports,
}
json('runtime-proof.json', report)
console.log(JSON.stringify({ passed: report.passed, failures, output }, null, 2))
if (failures.length) process.exitCode = 1
