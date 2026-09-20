import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const base = process.env.BASE || 'http://localhost:3020'
const out = resolve(import.meta.dirname, '../../../bench/audits/showcase')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(base)
  await page.locator('.game-card').first().waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.locator('img').evaluateAll((imgs) =>
    Promise.all(
      imgs.map((img) => {
        img.loading = 'eager'
        return img.decode()
      }),
    ),
  )
  assert.ok((await page.locator('.game-card').count()) > 0)
  await page.screenshot({ path: resolve(out, 'gallery-desktop.png'), fullPage: true })
  const first = await page.locator('.game-card').first().getAttribute('href')
  await page.locator('input[name="q"]').fill('Chinmay')
  await page.getByRole('button', { name: /Find games/i }).click()
  await page.waitForURL(/q=Chinmay/)
  assert.ok(
    (await page.locator('.game-card').allTextContents()).every((s) => s.includes('Chinmay')),
  )
  await page.goto(base + first)
  await page.locator('.game-detail').waitFor()
  await page.screenshot({ path: resolve(out, 'game-detail.png') })
  await page.goto(base + '/leaderboard')
  await page.locator('.leaderboard-panel').waitFor()
  assert.ok((await page.locator('tbody tr').count()) > 0, 'Historical scores visible')
  await page.screenshot({ path: resolve(out, 'leaderboard-desktop.png'), fullPage: true })
  await page.getByRole('combobox', { name: 'Filter by player mode' }).selectOption('1')
  await page.getByRole('button', { name: /Apply/i }).click()
  await page.waitForURL(/mode=1/)
  assert.ok((await page.locator('.table-mode').allTextContents()).every((s) => s === '1P'))
  await page.locator('input[name="q"]').fill('no-such-offline-player-xyz')
  await page.getByRole('button', { name: /Apply/i }).click()
  await page.getByText('NO SCORES YET').waitFor()
  for (const route of ['/', '/leaderboard']) {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(base + route)
    await page
      .locator(route === '/' ? '.game-card' : '.leaderboard-panel')
      .first()
      .waitFor()
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'No mobile page overflow',
    )
    await page.locator('img').evaluateAll((imgs) =>
      Promise.all(
        imgs.map((img) => {
          img.loading = 'eager'
          return img.decode()
        }),
      ),
    )
    await page.screenshot({
      path: resolve(out, route === '/' ? 'gallery-mobile.png' : 'leaderboard-mobile.png'),
      fullPage: true,
    })
  }
  assert.deepEqual(errors, [])
  console.log(
    'PASS live gallery, real thumbnails, creator search, detail pages, leaderboard, filters, empty states, mobile layout',
  )
} finally {
  await browser.close()
}
