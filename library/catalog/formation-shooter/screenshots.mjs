import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const dir = dirname(fileURLToPath(import.meta.url)),
  root = resolve(dir, '../../..'),
  require = createRequire(join(root, 'packages/probe/package.json')),
  { chromium } = require('playwright')
const module = readFileSync(join(dir, 'module.js'), 'utf8'),
  test = readFileSync(join(dir, 'verify.mjs'), 'utf8'),
  control = test.slice(test.indexOf('function control('), test.indexOf('function auto('))
const browser = await chromium.launch(),
  page = await browser.newPage()
await page.goto('file://' + root + '/packages/runtime/index.html?probe=1')
mkdirSync(join(dir, 'screenshots'), { recursive: true })
const results = []
for (const players of [1, 2]) {
  const code = `const game=(${module})({waves:3,lives:3});${control}
function init(api){game.init(api)} function update(api,dt){const held=[new Set(),new Set()];control({game,held});const old=api.btn;api.btn=(b,p=0)=>held[p].has(b);game.update(api,dt);api.btn=old;}function draw(api){game.draw(api)}`
  const load = await page.evaluate(
    ({ code, players }) => window.__probe.load(code, 7, 'ARCADE', players),
    { code, players },
  )
  await page.evaluate(() => window.__probe.start())
  let last = 0
  for (const [name, n] of [
    ['start', 30],
    ['action', 300],
    ['wave', 900],
    ['later', 1800],
    ['finished', 18000],
  ]) {
    const begin = performance.now(),
      state = await page.evaluate((n) => window.__probe.step(n), n - last)
    last = n
    const png = await page.evaluate(() => window.__probe.snapshot())
    writeFileSync(
      join(dir, 'screenshots', `${players}p-${name}.png`),
      Buffer.from(png.split(',')[1], 'base64'),
    )
    results.push({ players, name, load, state, ms: Math.round(performance.now() - begin) })
  }
}
await browser.close()
writeFileSync(join(dir, 'render-results.json'), JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify(results, null, 2))
if (results.some((r) => !r.load.ok || r.state.error || (r.name === 'finished' && r.state.state !== 'win'))) process.exitCode = 1
