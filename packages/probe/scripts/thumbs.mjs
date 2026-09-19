// Snapshot each run after a few seconds of scripted play: pnpm --filter @htn/probe exec node scripts/thumbs.mjs <outDir> <game.js>...
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(new URL('../../..', import.meta.url).pathname)
const [outDir, ...games] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
for (const g of games) {
  const code = readFileSync(resolve(root, g), 'utf8')
  const name = basename(dirname(resolve(root, g)))
  const r = await page.evaluate((c) => {
    const l = window.__probe.load(c, 3, '')
    if (!l.ok) return { error: l.error }
    window.__probe.start()
    window.__probe.inject([
      { at: 10, button: 'right', down: true },
      { at: 40, button: 'right', down: false },
      { at: 45, button: 'a', down: true },
      { at: 48, button: 'a', down: false },
      { at: 60, button: 'up', down: true },
      { at: 90, button: 'up', down: false },
      { at: 100, button: 'left', down: true },
      { at: 130, button: 'left', down: false },
    ])
    const s = window.__probe.step(150)
    return { ...s, png: window.__probe.snapshot() }
  }, code)
  if (r.error) {
    console.log(`${name}: ${r.error}`)
    continue
  }
  writeFileSync(resolve(outDir, `${name}.png`), Buffer.from(r.png.split(',')[1], 'base64'))
  console.log(`${name}: ${r.state} score ${r.score}`)
}
await browser.close()
