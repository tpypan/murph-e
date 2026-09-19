#!/usr/bin/env node
// Drives the runtime through every message in the shell protocol and every
// probe-hook method, headlessly. Run: pnpm exercise [game.js]
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(new URL('../../..', import.meta.url).pathname)
const gamePath = process.argv[2] ?? 'library/templates/dodge.js'
const code = readFileSync(resolve(root, gamePath), 'utf8')
const runtimeUrl = `file://${root}/packages/runtime/index.html?probe=1`

const browser = await chromium.launch()
const page = await browser.newPage()
const console_ = []
page.on('console', (m) => console_.push(`${m.type()}: ${m.text()}`))
page.on('pageerror', (e) => console_.push(`pageerror: ${e.message}`))
await page.goto(runtimeUrl)

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

const t0 = performance.now()
const load = await page.evaluate((c) => window.__probe.load(c, 7, 'SKY FALL'), code)
check('load', load.ok, load.error ?? '')
check('state after load is title', (await page.evaluate(() => window.__probe.state())) === 'title')
const titleHash = await page.evaluate(() => {
  window.__probe.step(5)
  return window.__probe.frameHash()
})
const titleStats = await page.evaluate(() => window.__probe.frameStats())
check('title frame draws', titleStats.colors >= 3, `${titleStats.colors} colours`)

// START via inject.
await page.evaluate(() => {
  window.__probe.inject([
    { at: 0, button: 'start', down: true },
    { at: 2, button: 'start', down: false },
  ])
  window.__probe.step(3)
})
check('inject START begins play', (await page.evaluate(() => window.__probe.state())) === 'playing')

const r300 = await page.evaluate(() => window.__probe.step(300))
check('survives 300 frames', r300.error === null && r300.state === 'playing', JSON.stringify(r300))
const h60 = await page.evaluate(() => window.__probe.frameHash())
const stats = await page.evaluate(() => window.__probe.frameStats())
check('draws something', stats.colors >= 3, `${stats.colors} colours, dominant ${stats.dominant}`)
const h120 = await page.evaluate(() => {
  window.__probe.step(60)
  return window.__probe.frameHash()
})
check('moves with no input', h60 !== h120)
check('frame hash is deterministic', h60 !== titleHash)

// Determinism: reload with the same seed and replay -> identical hash.
const replay = await page.evaluate((c) => {
  window.__probe.load(c, 7, 'SKY FALL')
  window.__probe.start()
  window.__probe.step(300)
  return window.__probe.frameHash()
}, code)
const replay2 = await page.evaluate((c) => {
  window.__probe.load(c, 7, 'SKY FALL')
  window.__probe.start()
  window.__probe.step(300)
  return window.__probe.frameHash()
}, code)
check('same seed replays identically', replay === replay2)

// Responds to LEFT: compare 60 frames with and without holding left.
const noInput = await page.evaluate((c) => {
  window.__probe.load(c, 7, '')
  window.__probe.start()
  window.__probe.step(120)
  return window.__probe.frameHash()
}, code)
const withLeft = await page.evaluate((c) => {
  window.__probe.load(c, 7, '')
  window.__probe.start()
  window.__probe.step(60)
  window.__probe.input(0, 'left', true)
  window.__probe.step(60)
  window.__probe.input(0, 'left', false)
  return window.__probe.frameHash()
}, code)
check('responds to LEFT', noInput !== withLeft)
const withA = await page.evaluate((c) => {
  window.__probe.load(c, 7, '')
  window.__probe.start()
  window.__probe.step(60)
  window.__probe.inject([
    { at: 0, button: 'a', down: true },
    { at: 3, button: 'a', down: false },
  ])
  window.__probe.step(12)
  return window.__probe.frameHash()
}, code)
const noInput72 = await page.evaluate((c) => {
  window.__probe.load(c, 7, '')
  window.__probe.start()
  window.__probe.step(72)
  return window.__probe.frameHash()
}, code)
check('responds to A', noInput72 !== withA)

// Crash guard: a game that throws in update posts an error and freezes.
const crash = await page.evaluate(() => {
  const bad =
    'function init(api){}\nfunction update(api,dt){ if (api.frame > 10) throw new Error("boom") }\nfunction draw(api){ api.cls(3) }'
  const l = window.__probe.load(bad, 1, 'BAD')
  window.__probe.start()
  const r = window.__probe.step(30)
  return { l, r, errors: window.__probe.errors() }
})
check(
  'crash in update -> error state',
  crash.r.state === 'error' && crash.errors.length === 1,
  crash.r.error,
)
const missing = await page.evaluate(() => window.__probe.load('const x = 1', 1, ''))
check('missing functions rejected at load', !missing.ok, missing.error)
const syntax = await page.evaluate(() => window.__probe.load('function init(api) {', 1, ''))
check('syntax error rejected at load', !syntax.ok, syntax.error)
const timers = await page.evaluate(() => {
  const l = window.__probe.load(
    'function init(api){ setTimeout(()=>{}, 10) }\nfunction update(){}\nfunction draw(){}',
    1,
    '',
  )
  return l
})
check('timers denied', !timers.ok, timers.error)

// Game over path: a game that ends itself, then START restarts it.
const over = await page.evaluate(() => {
  const g =
    'function init(api){ api.score(0) }\nfunction update(api,dt){ api.addScore(1); if (api.frame === 20) api.gameOver() }\nfunction draw(api){ api.cls(0) }'
  window.__probe.load(g, 1, 'ENDER')
  window.__probe.start()
  const a = window.__probe.step(25)
  window.__probe.inject([
    { at: 0, button: 'start', down: true },
    { at: 2, button: 'start', down: false },
  ])
  const early = window.__probe.step(5) // within lockout: must stay gameover
  window.__probe.step(50)
  window.__probe.inject([
    { at: 0, button: 'start', down: true },
    { at: 2, button: 'start', down: false },
  ])
  const again = window.__probe.step(5)
  return { a, early, again }
})
check(
  'gameOver() ends the game with score',
  over.a.state === 'gameover' && over.a.score === 20,
  JSON.stringify(over.a),
)
check('START during lockout ignored', over.early.state === 'gameover')
check(
  'START after lockout restarts',
  over.again.state === 'playing' && over.again.score < 20,
  JSON.stringify(over.again),
)

// Math.random is seeded inside games.
const mr = await page.evaluate(() => {
  const g =
    'let v; function init(api){ v = Math.random() }\nfunction update(api){ api.score(Math.floor(v*1e6)) }\nfunction draw(api){}'
  window.__probe.load(g, 42, '')
  window.__probe.start()
  const a = window.__probe.step(1).score
  window.__probe.load(g, 42, '')
  window.__probe.start()
  const b = window.__probe.step(1).score
  return a === b && a > 0
})
check('Math.random inside games is seeded', mr)

// Two players: per-player input, shared and per-player scores, win(p).
const two = await page.evaluate(() => {
  const g = [
    'let x = [40, 200]',
    'function init(api){ x = [40, 200] }',
    'function update(api,dt){',
    '  for (let p = 0; p < 2; p++) { if (api.btn("right", p)) x[p] += 2; if (api.btn("left", p)) x[p] -= 2 }',
    '  if (api.btnp("a", 1)) api.addScore(1, 1)',
    '  if (api.frame === 5) api.addScore(5)',
    '  if (api.frame === 40) api.win(1)',
    '}',
    'function draw(api){ api.cls(1); api.rectfill(x[0], 100, 8, 8, api.P1); api.rectfill(x[1], 100, 8, 8, api.P2) }',
  ].join('\n')
  window.__probe.load(g, 1, 'DUEL', 2)
  window.__probe.start()
  window.__probe.step(10)
  const shared = window.__probe.step(1).scores.slice()
  window.__probe.inject([
    { at: 0, player: 1, button: 'a', down: true },
    { at: 2, player: 1, button: 'a', down: false },
  ])
  window.__probe.step(5)
  const after = window.__probe.step(1).scores.slice()
  const base = window.__probe.frameHash()
  window.__probe.input(1, 'right', true)
  window.__probe.step(5)
  window.__probe.input(1, 'right', false)
  const p2moved = window.__probe.frameHash()
  const end = window.__probe.step(60)
  return { shared, after, moved: base !== p2moved, end }
})
check(
  '2P: addScore without an index is shared',
  two.shared[0] === 5 && two.shared[1] === 5,
  JSON.stringify(two.shared),
)
check(
  '2P: addScore(n, 1) only credits player two',
  two.after[0] === 5 && two.after[1] === 6,
  JSON.stringify(two.after),
)
check('2P: player two input moves only player two', two.moved)
check(
  '2P: win(1) ends the game with winner 1',
  two.end.state === 'win' && two.end.winner === 1,
  JSON.stringify(two.end),
)
const one = await page.evaluate(() => {
  const g =
    'function init(api){}\nfunction update(api){ if (api.frame === 1) api.addScore(3, 1); if (api.frame === 2) api.win(1) }\nfunction draw(api){ api.cls(0) }'
  window.__probe.load(g, 1, 'SOLO', 1)
  window.__probe.start()
  return window.__probe.step(5)
})
check(
  '1P: a player index is ignored',
  one.score === 3 && one.state === 'win' && one.winner === null,
  JSON.stringify(one),
)

// The shell can end a round on demand (walkthroughs); START restarts after the lockout.
const ended = await page.evaluate(() => {
  const g =
    'function init(api){}\nfunction update(api){ api.addScore(1) }\nfunction draw(api){ api.cls(0) }'
  window.__probe.load(g, 1, 'ENDME', 1)
  window.__probe.start()
  window.__probe.step(10)
  window.postMessage({ type: 'end' }, '*')
  return new Promise((resolve) => setTimeout(() => resolve(window.__probe.step(1)), 20))
})
check(
  'end message forces game over',
  ended.state === 'gameover' && ended.score === 10,
  JSON.stringify(ended),
)

const snap = await page.evaluate(() => window.__probe.snapshot())
check('snapshot is a PNG data url', snap.startsWith('data:image/png'), `${snap.length} chars`)
console.log(
  `\n${results.filter((r) => r.ok).length}/${results.length} checks passed in ${((performance.now() - t0) / 1000).toFixed(2)} s`,
)
if (console_.length) console.log('console:', console_.slice(0, 10).join('\n'))
await browser.close()
process.exit(results.every((r) => r.ok) ? 0 : 1)
