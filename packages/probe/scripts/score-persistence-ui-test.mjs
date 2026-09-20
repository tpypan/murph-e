// Isolated HTN_CLOUD_SYNC=off cabinet only. No model calls or physical badge writes.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.env.BASE || 'http://localhost:3088'
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  let forbidden = 0,
    failNext = false
  const results = [],
    sessions = []
  await page.route('**/*', (route) => {
    const r = route.request(),
      u = new URL(r.url())
    if (u.pathname === '/api/generate' || u.pathname === '/api/stt') {
      forbidden++
      return route.abort()
    }
    if (u.pathname === '/api/badges')
      return route.fulfill({
        contentType: 'text/event-stream',
        body: 'data: {"type":"roster","badges":[]}\n\n',
      })
    if (u.pathname.startsWith('/api/badges/')) return route.fulfill({ json: {} })
    if (u.origin !== new URL(base).origin) return route.abort()
    if (u.pathname === '/api/scores' && r.method() === 'POST') {
      results.push(r.postDataJSON())
      if (failNext) {
        failNext = false
        return route.fulfill({ status: 503, json: { error: 'Offline fixture' } })
      }
    }
    return route.continue()
  })
  page.on('response', async (r) => {
    if (new URL(r.url()).pathname === '/api/play-sessions' && r.ok())
      sessions.push((await r.json()).sessionId)
  })
  await page.goto(base + '/?keyboard=1')
  for (const players of [1, 2]) {
    await page.locator('.home-current .home-preview[data-ready="true"]').waitFor()
    await page
      .getByRole('button', { name: players === 1 ? '1 PLAYER' : '2 PLAYERS', exact: true })
      .click()
    await page.getByRole('button', { name: /^(?:> )?PLAY$/ }).click()
    await page.getByRole('heading', { name: 'READY!', exact: true }).waitFor()
    await page.getByRole('button', { name: /^(?:> )?PLAY$/ }).click()
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
    const runtime = page
      .frames()
      .find((f) => f.url().includes('/runtime/index.html') && !f.url().includes('preview'))
    await runtime.waitForFunction(() => window.__runtime?.state === 'playing')
    if (players === 2) failNext = true
    const delivered = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/scores' && r.request().method() === 'POST',
    )
    await page.keyboard.press('F9')
    await delivered
    await page.getByRole('heading', { name: 'GAME OVER', exact: true }).waitFor()
    const result = results.at(-1)
    assert.equal(result.scores.length, players)
    assert.ok(result.sessionId)
    assert.equal(result.badgeId, undefined, 'Client does not submit player identity')
    if (players === 2) {
      assert.equal(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('murph-e.pending-results.v1')).length,
        ),
        1,
      )
      const retried = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === '/api/scores' &&
          r.request().method() === 'POST' &&
          r.status() === 202,
      )
      await page.evaluate(() => window.dispatchEvent(new Event('online')))
      await retried
      await page.waitForFunction(
        () => JSON.parse(localStorage.getItem('murph-e.pending-results.v1')).length === 0,
      )
    }
    const again = await page.request.post(base + '/api/scores', { data: result })
    assert.equal(again.status(), 202)
    const rows = (await again.json()).entries
    assert.equal(rows.length, players)
    const altered = await page.request.post(base + '/api/scores', {
      data: { ...result, scores: result.scores.map((n) => n + 1) },
    })
    assert.equal(altered.status(), 409)
    await page.keyboard.press('Escape')
  }
  assert.equal(new Set(sessions).size, 2, 'Each new round gets its own id')
  assert.equal(forbidden, 0)
  console.log(
    'PASS real game-over => server session => durable scores; solo/2P, offline browser retry, deduplication, conflict rejection',
  )
} finally {
  await browser.close()
}
