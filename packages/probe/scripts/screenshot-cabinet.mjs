#!/usr/bin/env node
// Drives the cabinet page through every state with the keyboard and saves a
// screenshot of each. Does one real generation. Needs `pnpm dev` running.
// Run: pnpm screenshots:cabinet [outDir] [transcript]
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const out = resolve(process.argv[2] ?? 'bench/screenshots/cabinet')
const transcript =
  process.argv[3] ?? 'a game where a penguin slides on ice collecting fish and dodging seals'
mkdirSync(out, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:3000'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
page.on('pageerror', (e) => console.log('pageerror', e.message))
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log(`shot ${name}`)
}
const t0 = Date.now()
const since = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`

await page.goto(base)
await page.getByText('HOLD TALK AND SAY A GAME').waitFor({ timeout: 30000 })
await page.waitForTimeout(2500)
await shot('1-attract')

// START in attract plays the attract game directly.
await page.keyboard.press('Enter')
await page
  .getByText('START TO PLAY AGAIN')
  .or(page.getByText('HOLD TALK FOR A NEW GAME'))
  .first()
  .waitFor({ timeout: 5000 })
await page.waitForTimeout(800)
await shot('2-playing-library')

// TALK -> LISTENING, typed fallback -> BUILDING
await page.keyboard.down('Space')
await page.getByText('LISTENING').waitFor({ timeout: 5000 })
await page.keyboard.up('Space')
await page.waitForTimeout(300)
await page.locator('input').fill(transcript)
await page.waitForTimeout(300)
await shot('3-listening')
await page.keyboard.press('Enter')
await page.getByText('YOU SAID').waitFor({ timeout: 5000 })
console.log(`building started ${since()}`)
await page.waitForFunction(
  () =>
    document.body.innerText.includes('BUILDING...') &&
    !document.body.innerText.includes('THINKING'),
  null,
  { timeout: 30000 },
)
await page.waitForTimeout(6000)
await shot('4-building')
await page.getByText('HOLD TALK FOR A NEW GAME').waitFor({ timeout: 240000 })
console.log(`ready ${since()}`)
await page.waitForTimeout(500)
await shot('5-ready-title')
await page.keyboard.press('Enter')
await page.waitForTimeout(1500)
await page.keyboard.down('ArrowRight')
await page.waitForTimeout(500)
await page.keyboard.up('ArrowRight')
await page.keyboard.press('z')
await page.waitForTimeout(300)
await shot('6-playing-generated')

// Crash injection -> fallback path.
await page.keyboard.press('F8')
await page.getByText("HERE'S").waitFor({ timeout: 10000 })
await page.waitForTimeout(300)
await shot('7-crash-fallback')
await page.getByText('HOLD TALK FOR A NEW GAME').waitFor({ timeout: 10000 })
console.log('fallback landed in PLAYING')
console.log(`screenshots in ${out}`)
await browser.close()
