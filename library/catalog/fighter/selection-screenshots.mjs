import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const folder = import.meta.dirname,
  root = resolve(folder, '../../..'),
  out = resolve(folder, 'evidence'),
  require = createRequire(resolve(root, 'packages/probe/package.json')),
  { chromium } = require('playwright')
const moduleCode = readFileSync(resolve(folder, 'module.js'), 'utf8'),
  demo = readFileSync(resolve(folder, 'demo.js'), 'utf8'),
  code = `const ARCADE={fighter:${moduleCode}};\n${demo.replace('game.draw(api)', 'game.draw(api); api.__capture?.(game.inspect())')}`
mkdirSync(out, { recursive: true })
const checks = [],
  shots = []
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 768, height: 672 } })
  await page.route('**/*', (route) =>
    route.request().url().startsWith('http') ? route.abort() : route.continue(),
  )
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  await page.waitForFunction(() => !!window.__probe)
  const inspect = () => page.evaluate(() => window.__fighterState)
  const key = (p, key, down) =>
    page.evaluate((args) => window.__probe.input(...args), [p, key, down])
  const step = (n) => page.evaluate((n) => window.__probe.step(n), n)
  const tap = async (p, name) => {
    await key(p, name, true)
    await step(1)
    await key(p, name, false)
    await step(1)
  }
  const load = async (players) => {
    const result = await page.evaluate(
      ({ code, players }) => {
        const loaded = window.__probe.load(code, 19, 'MIDNIGHT DUEL', players)
        window.__runtime.api.__capture = (state) => {
          window.__fighterState = state
        }
        window.__probe.start()
        return loaded
      },
      { code, players },
    )
    assert.equal(result.ok, true, JSON.stringify(result))
    await step(1)
  }
  const shot = async (name) => {
    const png = await page.evaluate(() => window.__probe.snapshot())
    writeFileSync(resolve(out, `${name}.png`), Buffer.from(png.split(',')[1], 'base64'))
    shots.push({
      file: `${name}.png`,
      sha256: createHash('sha256')
        .update(readFileSync(resolve(out, `${name}.png`)))
        .digest('hex'),
    })
  }
  for (const players of [1, 2]) {
    await load(players)
    assert.equal((await inspect()).phase, 'select')
    await shot(`${players}p-select`)
    await step(240)
    assert.equal((await inspect()).phase, 'select', 'no automatic lock or play')
    await tap(0, 'right')
    if (players === 2) await tap(1, 'left')
    assert.deepEqual((await inspect()).selection.selected, ['flash', 'batman'])
    await tap(0, 'a')
    if (players === 2) {
      await step(90)
      assert.equal((await inspect()).phase, 'select')
      assert.deepEqual((await inspect()).selection.locked, [true, false])
      await shot('2p-select-p1-locked')
      await tap(1, 'a')
    }
    assert.equal((await inspect()).phase, 'versus')
    await shot(`${players}p-versus`)
    const lastHuman = players === 2 ? 1 : 0
    await tap(lastHuman, 'b')
    assert.equal((await inspect()).phase, 'select')
    assert.equal((await inspect()).selection.locked[lastHuman], false)
    await key(lastHuman, 'a', true)
    await step(1)
    await step(139)
    const fighting = await inspect()
    assert.equal(fighting.phase, 'fight')
    assert.deepEqual(
      fighting.fighters.map((f) => f.id),
      ['flash', 'batman'],
    )
    assert.equal(fighting.fighters[lastHuman].action, null, 'held confirm does not attack')
    await key(lastHuman, 'a', false)
    await step(1)
    await shot(`${players}p-selected-fight`)
    const errors = await page.evaluate(() => window.__probe.errors())
    assert.deepEqual(errors, [])
    checks.push({
      players,
      selected: fighting.selection.selected,
      allConfirmed: fighting.selection.locked,
      phase: fighting.phase,
      errors,
    })
  }
  await load(2)
  await tap(0, 'right')
  await shot('2p-select-same-character')
  await tap(0, 'a')
  await tap(1, 'a')
  await step(140)
  assert.deepEqual(
    (await inspect()).fighters.map((f) => f.id),
    ['flash', 'flash'],
  )
  await shot('2p-same-character-fight')
  const before = (await inspect()).fighters.map((f) => f.x)
  await key(0, 'right', true)
  await step(10)
  await key(0, 'right', false)
  const after = (await inspect()).fighters.map((f) => f.x)
  assert.ok(after[0] > before[0])
  assert.equal(after[1], before[1])
  assert.deepEqual(await page.evaluate(() => window.__probe.errors()), [])
  checks.push({
    players: 2,
    scenario: 'same identity, independent input',
    before,
    after,
    errors: [],
  })
  writeFileSync(
    resolve(out, 'selection-runtime.json'),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        passed: true,
        nativeSize: [256, 224],
        moduleHash: createHash('sha256').update(moduleCode).digest('hex'),
        demoHash: createHash('sha256').update(demo).digest('hex'),
        runtimeHash: createHash('sha256')
          .update(readFileSync(resolve(root, 'packages/runtime/runtime.js')))
          .digest('hex'),
        checks,
        shots,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({ passed: true, checks, screenshots: shots.map((s) => s.file) }, null, 2),
  )
} finally {
  await browser.close()
}
