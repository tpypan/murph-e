// Local fixtures only: no model, speech, physical badge writes or persisted scores.
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const base = process.env.BASE ?? 'http://127.0.0.1:3010'
const out = resolve(import.meta.dirname, '../../../bench/audits/creator-player-ui')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const badge = (slot, name) => ({
  path: `/offline/${slot}`,
  slot,
  identity: { badgeId: `offline-${slot}`, name, color: slot ? [255, 85, 170] : [85, 170, 255] },
})
let forbidden = 0
try {
  for (const scenario of [
    { id: 'solo', mode: 1, badges: [badge(0, 'Chinmay Jindal')], names: ['Chinmay Jindal'] },
    {
      id: 'duo',
      mode: 2,
      badges: [badge(0, 'Shayaan Azeem'), badge(1, 'Srinikesh Singarapu')],
      names: ['Shayaan Azeem', 'Srinikesh Singarapu'],
    },
    { id: 'solo-slot-two', mode: 1, badges: [badge(1, 'Tony Pan')], names: ['Tony Pan'] },
    { id: 'guest', mode: 1, badges: [], names: ['GUEST'] },
  ]) {
    const page = await browser.newPage({ viewport: { width: 640, height: 480 } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.addInitScript((roster) => {
      if (window !== window.top) return
      window.EventSource = class {
        constructor(url) {
          if (!String(url).endsWith('/api/badges')) throw new Error('Unexpected event stream')
          window.setTestRoster = (badges) =>
            this.onmessage?.({ data: JSON.stringify({ type: 'roster', badges }) })
          setTimeout(() => window.setTestRoster(roster), 0)
        }
        close() {}
      }
    }, scenario.badges)
    await page.route('**/*', (route) => {
      const request = route.request(),
        url = new URL(request.url())
      if (url.pathname === '/api/generate' || url.pathname === '/api/stt') {
        forbidden++
        return route.abort()
      }
      if (
        url.pathname.startsWith('/api/badges/') ||
        (url.pathname === '/api/scores' && request.method() !== 'GET')
      )
        return route.fulfill({ json: {} })
      if (url.origin !== new URL(base).origin) return route.abort()
      return route.continue()
    })
    await page.goto(base)
    await page.locator('.home-current .home-preview[data-ready="true"]').waitFor()
    const catalog = (await (await page.request.get(`${base}/api/demos`)).json()).games
    const library = (await (await page.request.get(`${base}/api/library`)).json()).games
    for (const game of [...catalog, ...library]) {
      assert.ok(game.creator?.name.trim(), `Missing author: ${game.title}`)
      assert.notEqual(game.creator.name, 'GUEST', game.title)
    }
    await page
      .getByRole('button', { name: scenario.mode === 1 ? '1 PLAYER' : '2 PLAYERS', exact: true })
      .click()
    await page.getByRole('button', { name: /^(?:> )?PLAY$/ }).click()
    await page.getByRole('heading', { name: 'READY!', exact: true }).waitFor()
    await page.getByRole('button', { name: /^(?:> )?PLAY$/ }).click()
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
    assert.equal(await page.locator('.player-name').count(), scenario.mode)
    for (let i = 0; i < scenario.names.length; i++) {
      assert.equal(await page.locator('.player-number').nth(i).textContent(), `P${i + 1}`)
      assert.equal(
        await page.locator('.player-label').nth(i).textContent(),
        `(${scenario.names[i]})`,
      )
      assert.equal(
        await page.locator('.player-name').nth(i).getAttribute('title'),
        `P${i + 1} (${scenario.names[i]})`,
      )
    }
    for (const width of [640, 320]) {
      await page.setViewportSize({ width, height: width * 0.75 })
      const header = await page.locator('.arcade-header').boundingBox()
      const game = await page.locator('.game-frame').boundingBox()
      assert.ok(header.y + header.height <= game.y, 'Names stay above gameplay')
      for (const item of await page.locator('.player-name').all()) {
        const box = await item.boundingBox()
        assert.ok(
          box.x >= width * 0.079 && box.x + box.width <= width * 0.921,
          'Names stay inside safe area',
        )
      }
      for (const label of await page.locator('.player-label').all())
        assert.ok(
          await label.evaluate((el) => el.scrollWidth <= el.clientWidth),
          'Full player names fit',
        )
      await page.screenshot({ path: resolve(out, `${scenario.id}-${width}.png`) })
    }
    if (scenario.id === 'duo') {
      await page.evaluate(() => window.setTestRoster([]))
      await page.locator('.player-detached').first().waitFor()
      assert.equal(await page.locator('.player-detached').count(), 2)
      assert.equal(await page.locator('.player-label').first().textContent(), '(Shayaan Azeem)')
      await page.evaluate((roster) => window.setTestRoster(roster), scenario.badges)
      await page.waitForFunction(() => !document.querySelector('.player-detached'))
    }
    assert.deepEqual(errors, [])
    console.log(`PASS ${scenario.id}: names, authors, safe area`)
    await page.close()
  }
  assert.equal(forbidden, 0)
} finally {
  await browser.close()
}
