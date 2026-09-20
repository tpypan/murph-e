// Snapshot a saved generated game in isolation; never touches the live cabinet.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const run = resolve(root, process.argv[2])
const out = resolve(root, process.argv[3] || 'bench/audits/medium-references')
mkdirSync(out, { recursive: true })
const code = readFileSync(resolve(run, 'game.js'), 'utf8')
const spec = JSON.parse(readFileSync(resolve(run, 'spec.json'), 'utf8'))
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 768, height: 672 } })
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  await page.waitForFunction(() => !!window.__probe)
  const loaded = await page.evaluate(
    ({ code, spec }) => window.__probe.load(code, 7, spec.title, spec.players),
    { code, spec },
  )
  if (!loaded.ok) throw Error(loaded.error)
  await page.evaluate(() => window.__probe.start())
  for (const [name, steps] of [
    ['start', 1],
    ['release', 239],
    ['later', 240],
  ]) {
    const state = await page.evaluate((n) => window.__probe.step(n), steps)
    const data = await page.evaluate(() => window.__probe.snapshot())
    writeFileSync(
      resolve(out, `${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${name}.png`),
      Buffer.from(data.split(',')[1], 'base64'),
    )
    console.log(name, JSON.stringify(state))
  }
} finally {
  await browser.close()
}
