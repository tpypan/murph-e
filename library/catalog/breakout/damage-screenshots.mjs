import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const dir = import.meta.dirname
const root = resolve(dir, '../../..')
const require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const baseline = process.argv.includes('--baseline')
const source = readFileSync(resolve(dir, 'module.js'), 'utf8')
const replay = baseline
  ? { config: { stages: [['12300000']], timeLimit: 900 }, inputs: [], milestones: [{ name: 'before-fix-fresh', frame: 1 }] }
  : JSON.parse(readFileSync(resolve(dir, 'damage-replay.json'), 'utf8'))
const code = `const game=(${source})(${JSON.stringify(replay.config)});function init(api){game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api)}`
const browser = await chromium.launch()
const images = []
try {
  const page = await browser.newPage()
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  const loaded = await page.evaluate(code => {
    const loaded = window.__probe.load(code, 7, 'PRISM BREAK', 1)
    window.__probe.start()
    return loaded
  }, code)
  assert.equal(loaded.ok, true, loaded.error)
  await page.evaluate(inputs => window.__probe.inject(inputs), replay.inputs)
  mkdirSync(resolve(dir, 'screenshots'), { recursive: true })
  let previous = 0
  for (const milestone of replay.milestones) {
    const state = await page.evaluate(n => window.__probe.step(n), milestone.frame - previous)
    previous = milestone.frame
    assert.equal(state.error, null)
    const data = await page.evaluate(() => window.__probe.snapshot())
    const bytes = Buffer.from(data.split(',')[1], 'base64')
    const file = `screenshots/damage-${milestone.name}.png`
    writeFileSync(resolve(dir, file), bytes)
    images.push({ ...milestone, file, sha256: createHash('sha256').update(bytes).digest('hex'), state })
  }
  if (!baseline) assert.equal(images.at(-1).state.state, 'win')
  writeFileSync(resolve(dir, baseline ? 'damage-baseline.json' : 'damage-render-results.json'), JSON.stringify({ sourceHash: createHash('sha256').update(source).digest('hex'), images }, null, 2))
  console.log(JSON.stringify(images, null, 2))
} finally {
  await browser.close()
}
