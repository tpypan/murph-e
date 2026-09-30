// Offline Pi check: uses the installed Chromium and the saved catalog only.
const assert = require('node:assert/strict')
const { chromium } = require('../packages/probe/node_modules/playwright')

async function main() {
  const base = process.env.MURPH_URL || 'http://127.0.0.1:3000'
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 480 } })
    const response = await page.request.get(`${base}/api/demos`)
    assert.equal(response.status(), 200)
    const { games } = await response.json()
    assert.equal(games.length, 16)
    assert(games.every((game) => game.players.length === 1 && game.players[0] === 1))
    for (const game of games) {
      const detail = await page.request.get(`${base}/api/demos/${game.id}?players=1`)
      assert.equal(detail.status(), 200, `solo game unavailable: ${game.id}`)
    }

    await page.goto(`${base}/?cabinet=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () => !document.querySelector('.home-actions button.primary')?.disabled,
    )
    assert.equal(await page.getByText('MAKE A GAME').count(), 0)
    assert.equal(await page.getByText('2 PLAYERS').count(), 0)
    assert.equal(await page.locator('.pi-banner').innerText(), 'made with <3 by zane & tony')
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).cursor), 'none')
    await page.screenshot({ path: '/tmp/murph-e-menu-640.png' })

    await page.keyboard.press('Numpad1')
    await page.locator('.ready-stage').waitFor()
    await page.keyboard.press('Numpad1')
    await page.waitForFunction(
      () => document.querySelector('iframe.game-frame')?.style.visibility === 'visible',
    )
    assert(await page.locator('.pi-banner').isVisible())
    await page.screenshot({ path: '/tmp/murph-e-playing-640.png' })

    await page.keyboard.press('Numpad7')
    await page.locator('.home-stage').waitFor()
    await page.getByText('RESUME GAME').click()
    await page.waitForFunction(
      () => document.querySelector('iframe.game-frame')?.style.visibility === 'visible',
    )
    await page.keyboard.press('F9')
    await page.getByText('GAME OVER').waitFor()
    assert(await page.locator('.pi-banner').isVisible())
    await page.keyboard.press('Numpad1')
    await page.locator('.ready-stage').waitFor()
    await page.keyboard.press('Numpad1')
    await page.waitForFunction(
      () => document.querySelector('iframe.game-frame')?.style.visibility === 'visible',
    )
    console.log(
      `Pi smoke test passed: ${games.length} solo games, play, pause, resume, result, replay.`,
    )
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
