#!/usr/bin/env node
// Feeds a WAV file through Chromium's fake microphone, holds TALK on the
// cabinet page, releases, and prints what the pipeline heard.
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
await page.getByText('HOLD TALK AND SAY A GAME').waitFor({ timeout: 30000 })
await page.waitForTimeout(1500) // mic + token warm-up
const t0 = Date.now()
await page.keyboard.down('Space')
await page.getByText('LISTENING').waitFor({ timeout: 5000 })
// The fake device loops the file; hold long enough for one full pass.
await page.waitForTimeout(Number(process.env.HOLD_MS ?? 6000))
const live =
  (await page.locator('main').innerText())
    .split('\n')
    .find((l) => l.trim() && !/LISTENING|SAY A GAME|ESC|TYPE IT/.test(l)) ?? ''
console.log(`live transcript while holding: "${live.trim()}"`)
await page.keyboard.up('Space')
const released = Date.now()
try {
  await page.getByText('YOU SAID').waitFor({ timeout: 15000 })
} catch {
  console.log('page text at failure:\n' + (await page.locator('main').innerText()))
  await page.screenshot({ path: `${process.env.SHOT_DIR ?? '.'}/stt-fail.png` })
  process.exit(1)
}
const said = (await page.getByText('YOU SAID').innerText()).replace(/^YOU SAID:\s*/i, '').trim()
console.log(
  `heard: "${said}"  (build started ${Date.now() - released} ms after release, ${Date.now() - t0} ms after press)`,
)
if (expected) {
  const words = expected.toLowerCase().split(/\s+/)
  const hit = words.filter((w) => said.toLowerCase().includes(w))
  console.log(`expected words matched: ${hit.length}/${words.length}`)
}
await browser.close()
