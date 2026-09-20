#!/usr/bin/env node
// Feeds a WAV file through Chromium's fake microphone, holds TALK on the
// cabinet page, releases, and prints the local Whisper transcript (no game generation).
// Run: pnpm --filter @htn/probe exec node scripts/stt-test.mjs <file.wav> "<expected words>"
import { chromium } from 'playwright'

const [wav, expected = ''] = process.argv.slice(2)
if (!wav) {
  console.error('usage: stt-test.mjs <file.wav> [expected]')
  process.exit(2)
}
const base = process.env.BASE ?? 'http://localhost:3000'
const browser = await chromium.launch({
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}`,
  ],
})
const context = await browser.newContext({
  permissions: ['microphone'],
  viewport: { width: 1280, height: 720 },
})
const page = await context.newPage()
page.on('console', (m) => {
  if (m.type() === 'error') console.log('console.error', m.text().slice(0, 200))
})
await page.goto(base)
await page.getByRole('button', { name: '1 PLAYER', exact: true }).click({ timeout: 30000 })
const t0 = Date.now()
await page.keyboard.down('Space')
await page.getByText('LISTENING', { exact: true }).waitFor({ timeout: 5000 })
// The fake device loops the file; hold long enough for one full pass.
await page.waitForTimeout(Number(process.env.HOLD_MS ?? 6000))
await page.keyboard.up('Space')
const released = Date.now()
try {
  await page.getByText('YOU SAID', { exact: true }).waitFor({ timeout: 100000 })
} catch {
  console.log(`page text at failure:\n${await page.locator('main').innerText()}`)
  await page.screenshot({ path: `${process.env.SHOT_DIR ?? '.'}/stt-fail.png` })
  process.exit(1)
}
const said = (await page.locator('.voice-transcript').innerText()).trim()
console.log(
  `heard: "${said}"  (transcript ready ${Date.now() - released} ms after release, ${Date.now() - t0} ms after press)`,
)
if (expected) {
  const words = expected.toLowerCase().split(/\s+/)
  const hit = words.filter((w) => said.toLowerCase().includes(w))
  console.log(`expected words matched: ${hit.length}/${words.length}`)
  if (hit.length !== words.length) process.exitCode = 1
}
await browser.close()
