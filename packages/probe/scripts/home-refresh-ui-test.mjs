// Actual cabinet UI with deterministic catalog HTTP fixtures. No model/STT calls,
// external network, persisted scores or changes to the shared physical badges.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const out = resolve(root, 'bench/audits/home-refresh-ui')
mkdirSync(out, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:3000'
const summary = (id, revision, title) => ({
  id,
  revision,
  title,
  description: 'OFFLINE REFRESH FIXTURE',
  genre: 'arcade',
  players: [1, 2],
})
const alpha = summary('alpha', 'a1', 'ALPHA'),
  beta = summary('beta', 'b1', 'BETA'),
  gamma = summary('gamma', 'c1', 'GAMMA'),
  delta = summary('delta', 'd1', 'DELTA')
let catalog = [alpha, beta, gamma],
  failList = false,
  lists = 0,
  forbidden = 0,
  writes = 0
const details = [],
  errors = [],
  checks = []
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } })
  await page.route('**/*', (route) => {
    const request = route.request(),
      url = new URL(request.url())
    if (url.pathname === '/api/generate' || url.pathname === '/api/stt') {
      forbidden++
      return route.abort()
    }
    if (url.pathname === '/api/badges')
      return route.fulfill({
        contentType: 'text/event-stream',
        body: 'data: {"type":"roster","badges":[]}\n\n',
      })
    if (
      url.pathname.startsWith('/api/badges/') ||
      (url.pathname.startsWith('/api/scores') && request.method() !== 'GET')
    ) {
      writes++
      return route.fulfill({ json: {} })
    }
    if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) return route.abort()
    if (url.pathname === '/api/demos') {
      lists++
      return failList
        ? route.fulfill({ status: 503, json: { error: 'Transient offline fixture' } })
        : route.fulfill({ json: { games: catalog }, headers: { 'cache-control': 'no-store' } })
    }
    if (url.pathname.startsWith('/api/demos/')) {
      const id = url.pathname.split('/').at(-1),
        game = catalog.find((g) => g.id === id),
        players = Number(url.searchParams.get('players'))
      if (!game) return route.fulfill({ status: 404, json: { error: 'Missing fixture' } })
      const color = game.revision === 'b2' ? 11 : id === 'beta' ? 2 : id === 'delta' ? 10 : 1
      const code = `let x=64;function init(api){x=64;api.__homeRevision=${JSON.stringify(game.revision)}}function update(api){if(api.btn('right',0))x=(x+1)%230;if(api.btn('left',0))x=(x+229)%230}function draw(api){api.cls(${color});api.rectfill(x,120,16,20,7);api.text('${game.title}',20,60,7)}`
      details.push({ id, revision: game.revision, players })
      return route.fulfill({
        headers: { 'cache-control': 'no-store' },
        json: {
          ...game,
          code,
          spec: {
            title: game.title,
            oneLiner: game.description,
            genre: 'arcade',
            players,
            controls: { left: 'MOVE', right: 'MOVE', up: null, down: null, a: null, b: null },
          },
        },
      })
    }
    return route.fallback()
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    if (window !== window.top) return
    window.homeRefreshTest = { mic: 0 }
    navigator.mediaDevices.getUserMedia = async () => {
      window.homeRefreshTest.mic++
      throw Error('Microphone must stay off')
    }
  })
  const title = page.locator('.home-caption h2')
  const preview = () => page.locator('.home-current .home-preview[data-ready="true"]')
  const runtime = () => page.frames().find((f) => f.url().includes('/runtime/index.html'))
  const selected = async (id, label) => {
    await page.waitForFunction(
      ({ id, label }) => {
        const el = document.querySelector('.home-current .home-preview[data-ready="true"]')
        return (
          el?.getAttribute('data-game-id') === id &&
          document.querySelector('.home-caption h2')?.textContent === label
        )
      },
      { id, label },
    )
  }
  const twoPlayers = async () =>
    assert.equal(
      await page
        .getByRole('button', { name: '2 PLAYERS', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    )
  const noAutoplay = async () =>
    assert.equal(await runtime().evaluate(() => window.__runtime.gameFrame), 0)
  const refresh = async () => {
    const response = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/demos')
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    return response
  }
  await page.goto(base)
  await selected('alpha', 'ALPHA')
  await runtime().waitForFunction(() => Boolean(window.__runtime))
  await noAutoplay()
  await page.getByRole('button', { name: 'Next game', exact: true }).click()
  await selected('beta', 'BETA')
  await page.getByRole('button', { name: '2 PLAYERS', exact: true }).click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('.home-current .home-preview[data-ready="true"]')
        ?.getAttribute('data-players') === '2',
  )
  const oldIframe = await page.locator('.home-current iframe').elementHandle()
  const oldPreviewFrame = await oldIframe.contentFrame()
  assert.deepEqual(
    await oldPreviewFrame.evaluate(() => [
      ...document.querySelector('canvas').getContext('2d').getImageData(5, 90, 1, 1).data,
    ]),
    [126, 37, 83, 255],
  )

  catalog = [delta, gamma, beta, alpha]
  await refresh()
  await selected('beta', 'BETA')
  await twoPlayers()
  await page.waitForFunction(
    () =>
      document
        .querySelector('.home-peek.is-previous .home-preview')
        ?.getAttribute('data-game-id') === 'gamma' &&
      document.querySelector('.home-peek.is-next .home-preview')?.getAttribute('data-game-id') ===
        'alpha',
  )
  checks.push('Focus refresh preserves selected ID and2P across a reordered list')
  await page.getByRole('button', { name: 'Next game', exact: true }).click()
  await selected('alpha', 'ALPHA')
  await page.getByRole('button', { name: 'Next game', exact: true }).click()
  await selected('delta', 'DELTA')
  await twoPlayers()
  checks.push('Newly added game is browsable without reloading the page')
  await page.getByRole('button', { name: 'Previous game', exact: true }).click()
  await page.getByRole('button', { name: 'Previous game', exact: true }).click()
  await selected('beta', 'BETA')

  const beta2 = summary('beta', 'b2', 'BETA TWO')
  catalog = [delta, gamma, beta2, alpha]
  // Let the real5second interval discover the revision; no synthetic timer or reload.
  await selected('beta', 'BETA TWO')
  await twoPlayers()
  const changed = await (await page.locator('.home-current iframe').elementHandle()).contentFrame()
  assert.deepEqual(
    await changed.evaluate(() => [
      ...document.querySelector('canvas').getContext('2d').getImageData(5, 90, 1, 1).data,
    ]),
    [0, 228, 54, 255],
  )
  assert.ok(details.some((d) => d.id === 'beta' && d.revision === 'b2' && d.players === 2))
  checks.push(
    'Periodic refresh fetches revised detail and replaces preview pixels at the same selected ID',
  )
  await noAutoplay()
  await page.screenshot({ path: resolve(out, 'revised-menu-640.png') })

  failList = true
  assert.equal((await refresh()).status(), 503)
  await page.waitForTimeout(150)
  assert.equal(await title.innerText(), 'BETA TWO')
  await preview().waitFor()
  await twoPlayers()
  assert.equal(await page.getByText('GAMES UNAVAILABLE', { exact: true }).count(), 0)
  await noAutoplay()
  checks.push('Transient refresh failure retains the last successful catalog and preview')
  failList = false
  await refresh()
  await page.getByRole('button', { name: /^> PLAY$/ }).click()
  await page.getByRole('heading', { name: 'READY!', exact: true }).waitFor()
  await runtime().waitForFunction(() => window.__runtime.api.__homeRevision === 'b2')
  assert.equal(await runtime().evaluate(() => window.__runtime.players), 2)
  await noAutoplay()
  await page.waitForTimeout(300)
  await noAutoplay()
  await page.screenshot({ path: resolve(out, 'revised-ready-640.png') })
  checks.push('PLAY loads the revised2P game at Ready and still requires explicit start')
  assert.equal(forbidden, 0)
  assert.equal(await page.evaluate(() => window.homeRefreshTest.mic), 0)
  assert.deepEqual(errors, [])
  writeFileSync(
    resolve(out, 'results.json'),
    `${JSON.stringify({ passed: true, checks, lists, details, forbiddenModelOrSpeechRequests: forbidden, interceptedWrites: writes, pageErrors: errors }, null, 2)}\n`,
  )
  console.log(JSON.stringify({ passed: true, checks, lists, forbidden, writes }))
} finally {
  await browser.close()
}
