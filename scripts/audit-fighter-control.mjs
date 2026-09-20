// Offline adversarial policies. No generation/provider calls, state injection or pack edits.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const arg = (name, fallback) =>
  process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback
const revision = arg('--label', 'current')
const folder = resolve(root, 'bench/audits/fighter-control', revision)
const sourcePath = resolve(root, arg('--factory', 'library/catalog/fighter/module.js'))
const source = readFileSync(sourcePath, 'utf8')
const sha = (x) => createHash('sha256').update(x).digest('hex')
const factory = Function(`return ${source}`)()
mkdirSync(folder, { recursive: true })

function policyKeys(policy, s, t) {
  const [human, cpu] = s.fighters
  const toward = cpu.x > human.x ? 'right' : 'left'
  const away = cpu.x > human.x ? 'left' : 'right'
  if (policy === 'back' || (policy === 'jab-then-back' && cpu.hp < 100)) return [away]
  const keys = Math.abs(cpu.x - human.x) > 30 ? [toward] : []
  if (policy === 'sweep') keys.push('down')
  // Five taps/second is physically plausible; no frame-perfect recovery reading.
  if (t % 12 === 0) keys.push('a')
  return keys
}

function simulate(policy, seed, difficulty) {
  let rng = seed,
    ticks = 0
  const held = [new Set(), new Set()],
    previous = [new Set(), new Set()],
    events = []
  const game = factory({ difficulty, characterSelect: false })
  const api = new Proxy(
    {
      players: 1,
      btn: (k, i = 0) => held[i].has(k),
      btnp: (k, i = 0) => held[i].has(k) && !previous[i].has(k),
      rnd: (n = 1) => {
        rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0
        return (rng / 4294967296) * n
      },
      win: (p) => events.push({ type: 'win', player: p ?? 0 }),
      gameOver: () => events.push({ type: 'loss' }),
    },
    { get: (target, key) => target[key] ?? (() => {}) },
  )
  game.init(api)
  const attacks = {},
    rounds = [],
    snapshots = []
  let minHumanHp = 100,
    lastRound = 0,
    previousAction = null
  for (; ticks < 18000 && !game.inspect().terminal; ticks++) {
    const before = game.inspect()
    held[0] = new Set(policyKeys(policy, before, ticks))
    game.update(api, 1 / 60)
    previous[0] = new Set(held[0])
    const state = game.inspect(),
      cpu = state.fighters[1]
    minHumanHp = Math.min(minHumanHp, state.fighters[0].hp)
    if (cpu.action && cpu.action !== previousAction)
      attacks[cpu.action] = (attacks[cpu.action] ?? 0) + 1
    previousAction = cpu.action
    if (state.phase === 'roundEnd' && state.round !== lastRound) {
      rounds.push({
        round: state.round,
        hp: state.fighters.map((f) => f.hp),
        winner: state.lastWinner,
      })
      lastRound = state.round
    }
    if (ticks % 3600 === 0)
      snapshots.push({ ticks, round: state.round, hp: state.fighters.map((f) => f.hp) })
  }
  const state = game.inspect()
  return {
    policy,
    seed,
    difficulty,
    ticks,
    minHumanHp,
    attacks,
    rounds,
    snapshots,
    terminal: state.terminal,
    round: state.round,
    hp: state.fighters.map((f) => f.hp),
    wins: state.fighters.map((f) => f.wins),
    events,
  }
}

const matrix = []
for (const difficulty of [0, 0.6, 1])
  for (const policy of ['back', 'jab-then-back', 'jab', 'sweep'])
    for (let seed = 1; seed <= 16; seed++) matrix.push(simulate(policy, seed, difficulty))
const report = {
  sourcePath,
  sourceSha256: sha(source),
  policy:
    'Direction follows visible positions; jab/sweep taps every12ticks; no controller state mutation. Default2rounds/60seconds. 16seeds perpolicy/difficulty. Bot outcomes are not human balance certification.',
  cases: matrix,
}
writeFileSync(resolve(folder, 'behavior.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(
  JSON.stringify(
    {
      revision,
      sourceSha256: report.sourceSha256,
      summary: [0, 0.6, 1].flatMap((difficulty) =>
        ['back', 'jab-then-back', 'jab', 'sweep'].map((policy) => {
          const rows = matrix.filter((r) => r.difficulty === difficulty && r.policy === policy)
          return {
            difficulty,
            policy,
            wins: rows.filter((r) => r.events.some((e) => e.type === 'win')).length,
            losses: rows.filter((r) => r.events.some((e) => e.type === 'loss')).length,
            nonterminal: rows.filter((r) => !r.terminal).length,
            undamaged: rows.filter((r) => r.minHumanHp === 100).length,
          }
        }),
      ),
    },
    null,
    2,
  ),
)

if (process.argv.includes('--native')) {
  const require = createRequire(resolve(root, 'packages/probe/package.json'))
  const { chromium } = require('playwright')
  const browser = await chromium.launch({ headless: true })
  const cases = []
  try {
    const page = await browser.newPage()
    await page.route('**/*', (r) =>
      r.request().url().startsWith('http') ? r.abort() : r.continue(),
    )
    await page.goto(`${pathToFileURL(resolve(root, 'packages/runtime/index.html')).href}?probe=1`)
    await page.waitForFunction(() => Boolean(window.__probe))
    for (const policy of ['back', 'jab-then-back', 'sweep']) {
      const code = `const factory=${source};let game;function init(api){game=factory({characterSelect:false});game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api);api.__capture?.(game.inspect())}`
      const result = await page.evaluate(
        ({ code, policy, policyCode }) => {
          const choose = Function(`return ${policyCode}`)(),
            p = window.__probe,
            loaded = p.load(code, 19, 'FIGHTER AUDIT', 1)
          if (!loaded.ok) throw Error(loaded.error)
          window.__runtime.api.__capture = (s) => {
            window.auditState = s
          }
          p.start()
          p.step(1)
          const allKeys = ['left', 'right', 'up', 'down', 'a', 'b'],
            shots = [],
            rounds = []
          let minHumanHp = 100,
            previousRound = 0,
            frames = 0
          for (; frames < 18000 && !window.auditState.terminal; frames++) {
            const keys = choose(policy, window.auditState, frames)
            for (const k of allKeys) p.input(0, k, keys.includes(k))
            p.step(1)
            const s = window.auditState
            minHumanHp = Math.min(minHumanHp, s.fighters[0].hp)
            if (
              frames === 600 ||
              (shots.length < 2 && s.fighters[1].action === 'sweep' && s.fighters[1].age >= 9)
            )
              shots.push({ label: `combat-${shots.length}`, state: s, png: p.snapshot() })
            if (s.phase === 'roundEnd' && s.round !== previousRound) {
              rounds.push({ round: s.round, hp: s.fighters.map((f) => f.hp), winner: s.lastWinner })
              previousRound = s.round
            }
          }
          shots.push({ label: 'final', state: window.auditState, png: p.snapshot() })
          return {
            policy,
            frames,
            minHumanHp,
            final: window.auditState,
            rounds,
            errors: p.errors(),
            shots,
          }
        },
        { code, policy, policyCode: policyKeys.toString() },
      )
      assert.deepEqual(result.errors, [])
      for (const shot of result.shots) {
        const filename = `${policy}-${shot.label}.png`
        const bytes = Buffer.from(shot.png.split(',')[1], 'base64')
        writeFileSync(resolve(folder, filename), bytes)
        delete shot.png
        shot.image = filename
        shot.sha256 = sha(bytes)
      }
      cases.push(result)
      console.log(
        JSON.stringify({
          native: policy,
          frames: result.frames,
          hp: result.final.fighters.map((f) => f.hp),
          wins: result.final.fighters.map((f) => f.wins),
          terminal: result.final.terminal,
        }),
      )
    }
  } finally {
    await browser.close()
  }
  writeFileSync(
    resolve(folder, 'native.json'),
    `${JSON.stringify({ sourceSha256: sha(source), runtimeSha256: sha(readFileSync(resolve(root, 'packages/runtime/runtime.js'))), cases }, null, 2)}\n`,
  )
}
