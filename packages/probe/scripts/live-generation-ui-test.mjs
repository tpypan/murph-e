// LIVE cabinet check: one spoken idea through the real /api/generate, which
// builds a one-player and a two-player version with the model. Costs about two
// game builds. Transcription is stubbed; everything else is the real path.
// Needs `HTN_BADGES=off pnpm dev` and OPENAI_API_KEY in .env.
// Run: pnpm --filter @htn/probe exec node scripts/live-generation-ui-test.mjs ["idea"]
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(root, 'bench/audits/live-generation')
mkdirSync(output, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:3000'
const idea = process.argv[2] ?? 'a penguin sliding on ice collecting fish and dodging seals'
const BUILD_TIMEOUT = 420_000
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const results = { passed: false, idea, versions: {}, ms: {} }
const t0 = Date.now()
const since = () => Date.now() - t0

try {
  const context = await browser.newContext({
    permissions: ['microphone'],
    viewport: { width: 640, height: 480 },
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/badges', (route) =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: 'data: {"type":"roster","badges":[]}\n\n',
    }),
  )
  await page.route('**/api/stt', (route) => route.fulfill({ json: { text: idea } }))
  const shot = (name) => page.screenshot({ path: resolve(output, `${name}.png`) })
  const heading = (name) => page.getByRole('heading', { name, exact: true })
  const runtime = () => page.frames().find((frame) => frame.url().includes('/runtime/index.html'))
  const versionLine = () => page.locator('.version-line').innerText()

  await page.goto(`${base}/?cabinet=1`)
  await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
  await heading('DESCRIBE YOUR GAME').waitFor()
  const talk = page.getByRole('button', { name: /HOLD TO TALK/ })
  const box = await talk.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await heading('LISTENING').waitFor()
  await page.waitForTimeout(300)
  await page.mouse.up()
  await heading('YOU SAID').waitFor()
  await page.getByRole('button', { name: /MAKE GAME/ }).click()
  console.log(`building "${idea}"`)
  await page.waitForTimeout(8000)
  await shot('building')
  await heading('READY!').waitFor({ timeout: BUILD_TIMEOUT })
  results.ms.firstReady = since()
  console.log(`first version ready after ${(since() / 1000).toFixed(1)}s: ${await versionLine()}`)
  assert.match(await versionLine(), /1 PLAYER · CABINET/, 'no badges: the 1P version opens first')
  await shot('ready-first')
  // The other version keeps building in the background; wait until it is
  // switchable or the page says it could not be made.
  await page.waitForFunction(
    () => /UP \/ DOWN|COULDN'T/.test(document.querySelector('.version-line')?.textContent ?? ''),
    null,
    { timeout: BUILD_TIMEOUT },
  )
  results.ms.bothDone = since()
  const line = await versionLine()
  console.log(`second version after ${(since() / 1000).toFixed(1)}s: ${line.replace('\n', ' / ')}`)
  assert.match(line, /UP \/ DOWN: 2 PLAYER VERSION/, 'the 2P version must land too')
  await shot('ready-both')

  const play = async (players) => {
    const title = await page.locator('.ready-stage h2').innerText()
    await page.getByRole('button', { name: /^(?:>\s*)?PLAY$/ }).click()
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
    await runtime().waitForFunction(() => window.__runtime.gameFrame > 30)
    assert.equal(await runtime().evaluate(() => window.__runtime.players), players)
    const before = await runtime().evaluate(() => window.__runtime.gameFrame)
    await page.keyboard.down('Numpad6')
    await page.waitForTimeout(500)
    await page.keyboard.up('Numpad6')
    await page.keyboard.press('Numpad1')
    await page.waitForTimeout(500)
    const after = await runtime().evaluate(() => window.__runtime.gameFrame)
    assert.ok(after > before + 20, 'the game keeps running under input')
    assert.equal(await runtime().evaluate(() => window.__runtime.state), 'playing')
    await shot(`playing-${players}p`)
    results.versions[players] = { title, frames: after }
    console.log(`${players}P "${title}" plays`)
    await page.keyboard.press('Numpad7') // START: pause to the menu
    await page.getByRole('button', { name: /RESUME GAME/ }).waitFor()
    await page.getByRole('button', { name: /RESUME GAME/ }).click()
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
    await page.keyboard.press('F9')
    await heading('GAME OVER').waitFor()
    await page.keyboard.press('Numpad1') // A: back to READY for this version
    await heading('READY!').waitFor()
  }
  await play(1)
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() =>
    document.querySelector('.version-line')?.textContent?.includes('2 PLAYERS · BADGES'),
  )
  await shot('ready-2p')
  await play(2)
  assert.deepEqual(errors, [])
  results.passed = true
  writeFileSync(resolve(output, 'results.json'), `${JSON.stringify(results, null, 2)}\n`)
  console.log(
    `PASS live: both versions built, switched and played (first ready ${(results.ms.firstReady / 1000).toFixed(1)}s, both ${(results.ms.bothDone / 1000).toFixed(1)}s)`,
  )
} finally {
  await browser.close()
}
