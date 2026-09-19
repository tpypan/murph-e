#!/usr/bin/env node
// Screenshots every runtime state through the real dev page (live loop, real
// keyboard events), so a human can eyeball the runtime. Needs `pnpm serve`.
// Run: pnpm screenshots [outDir]
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const out = resolve(process.argv[2] ?? 'bench/screenshots')
mkdirSync(out, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:5173'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(`${base}/packages/runtime/dev.html`)
const stateText = () => page.locator('#state').textContent()
const waitState = async (s, ms = 10000) => {
  await page.waitForFunction(
    (st) => document.getElementById('state').textContent.includes(`state: ${st}`),
    s,
    {
      timeout: ms,
    },
  )
}
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log(`${name}: ${await stateText()}`)
}

await waitState('title')
const frame = page.frame({ url: /index\.html/ })
const canvasCss = await frame.evaluate(() => {
  const c = document.getElementById('screen')
  return { w: c.style.width, h: c.style.height, inner: [innerWidth, innerHeight] }
})
console.log('canvas css size', JSON.stringify(canvasCss))
await page.waitForTimeout(300)
await shot('1-title')

await page.keyboard.press('Enter')
await waitState('playing')
await page.keyboard.down('ArrowRight')
await page.waitForTimeout(700)
await page.keyboard.up('ArrowRight')
await page.keyboard.press('z')
await page.waitForTimeout(250)
await shot('2-playing-jump')
// Let anvils fall on a player that stands still until the game ends.
await waitState('gameover', 90000)
await page.waitForTimeout(400)
await shot('3-gameover')
await page.keyboard.press('Enter') // ignored: lockout
await page.waitForTimeout(1200)
await page.keyboard.press('Enter')
await waitState('playing')
console.log('restart after lockout ok')

await page.click('#b-crash')
await waitState('title')
await page.keyboard.press('Enter')
await waitState('error', 5000)
await page.waitForTimeout(200)
await shot('4-crash')

await page.click('#b-reload')
await waitState('title')
await page.click('#b-inject')
await waitState('playing')
await page.waitForTimeout(1500)
await shot('5-inject-demo')
await page.click('#b-reset')
await waitState('title')
console.log('reset ok')
console.log(`screenshots in ${out}`)
await browser.close()
