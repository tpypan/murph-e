// Offline home/carousel regression. No model, speech, or persisted-score requests.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(root, 'bench/audits/home-ui')
mkdirSync(output, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:3000'
const browser = await chromium.launch()
const errors = []
let generated = 0
let scores = 0
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } })
  await page.route('**/*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === '/api/badges')
      return route.fulfill({
        contentType: 'text/event-stream',
        body: 'data: {"type":"roster","badges":[]}\n\n',
      })
    // The shared dev server owns real USB badges. UI checks must not change them.
    if (url.pathname.startsWith('/api/badges/')) return route.fulfill({ json: {} })
    if (url.pathname === '/api/generate' || url.pathname === '/api/stt') {
      generated++
      return route.abort()
    }
    if (url.pathname === '/api/scores' && request.method() === 'POST') {
      scores++
      return route.fulfill({ json: {} })
    }
    if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) return route.abort()
    return route.fallback()
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    if (window !== window.top) return
    window.homeTest = { frames: 0, sideFrames: 0, mic: 0 }
    window.addEventListener('message', (event) => {
      if (event.data?.type !== 'preview-frame') return
      const current = document.querySelector('.home-current iframe')
      if (event.source === current?.contentWindow) window.homeTest.frames++
      else if (
        [...document.querySelectorAll('.home-peek iframe')].some(
          (frame) => event.source === frame.contentWindow,
        )
      )
        window.homeTest.sideFrames++
    })
    navigator.mediaDevices.getUserMedia = async () => {
      window.homeTest.mic++
      throw new Error('Microphone must stay off on home')
    }
  })
  const home = page.getByRole('region', { name: 'Choose a game', exact: true })
  const title = page.locator('.home-caption h2')
  const runtime = () => page.frames().find((frame) => frame.url().includes('/runtime/index.html'))
  const preview = () => page.locator('.home-current .home-preview[data-ready="true"]')
  const currentId = () => preview().getAttribute('data-game-id')
  const adjacent = (side) => page.locator(`.home-peek.is-${side} .home-preview[data-ready="true"]`)
  const play = () => page.getByRole('button', { name: /^> PLAY$/ })
  const screenshot = (name) => page.screenshot({ path: resolve(output, `${name}.png`) })
  const games = (await (await page.request.get(`${base}/api/demos`)).json()).games
  assert.ok(games.length >= 3, 'the local catalog provides distinct adjacent games')
  const checkNeighbors = async () => {
    await preview().waitFor()
    const id = await currentId()
    const selected = games.findIndex((game) => game.id === id)
    assert.ok(selected >= 0, `selected game ${id} is in the catalog`)
    for (const [side, offset] of [
      ['previous', -1],
      ['next', 1],
    ]) {
      await adjacent(side).waitFor()
      assert.equal(
        await adjacent(side).getAttribute('data-game-id'),
        games[(selected + offset + games.length) % games.length].id,
        `${side} preview shows the actual adjacent game`,
      )
    }
  }
  await page.goto(base)
  await preview().waitFor()
  await checkNeighbors()
  assert.equal(await home.getByText('ARCADE', { exact: true }).count(), 0)
  assert.equal(await home.getByText('DEMO', { exact: true }).count(), 0)
  assert.equal(await home.getByText(/^\d+\s*\/\s*\d+$/).count(), 0)
  assert.equal(await home.locator('.home-arrow').count(), 0)
  await runtime().waitForFunction(() => Boolean(window.__runtime))
  assert.equal(await runtime().evaluate(() => window.__runtime.gameFrame), 0)
  const first = await title.innerText()
  await page.waitForFunction(() => window.homeTest.frames > 4)
  const sides = await page.evaluate(() => window.homeTest.sideFrames)
  const moving = await page.evaluate(() => window.homeTest.frames)
  await page.waitForTimeout(500)
  assert.equal(
    await page.evaluate(() => window.homeTest.sideFrames),
    sides,
    'side previews stay still',
  )
  assert.ok(
    (await page.evaluate(() => window.homeTest.frames)) > moving,
    'the center preview animates',
  )
  assert.equal(scores, 0)
  for (const width of [320, 640, 1280]) {
    const height = width === 1280 ? 720 : width * 0.75
    await page.setViewportSize({ width, height })
    const bounds = await page.locator('.arcade-screen').boundingBox()
    for (const item of await home.locator('button,h1,h2').all()) {
      const box = await item.boundingBox()
      assert.ok(
        box &&
          box.x >= bounds.x + bounds.width * 0.079 &&
          box.y >= bounds.y + bounds.height * 0.079,
      )
      assert.ok(
        box.x + box.width <= bounds.x + bounds.width * 0.921 &&
          box.y + box.height <= bounds.y + bounds.height * 0.921,
      )
    }
    assert.ok(
      await page
        .locator('.home-showcase')
        .evaluate(
          (el) =>
            el.getBoundingClientRect().height >
            document.querySelector('.arcade-screen').clientHeight * 0.3,
        ),
    )
    await preview().waitFor()
    await screenshot(`home-${width}`)
  }
  await page.setViewportSize({ width: 640, height: 480 })
  // Cropped neighbors, pointer swipe, and left/right browse without starting play.
  const nextId = await adjacent('next').getAttribute('data-game-id')
  await page.getByRole('button', { name: 'Next game' }).click()
  await preview().waitFor()
  assert.equal(await currentId(), nextId)
  await checkNeighbors()
  assert.notEqual(await title.innerText(), first)
  await screenshot('fighter-preview')
  const second = await title.innerText()
  await page.getByRole('button', { name: 'Previous game' }).click()
  await preview().waitFor()
  assert.equal(await title.innerText(), first)
  await page.getByRole('button', { name: 'Next game' }).click()
  await preview().waitFor()
  const box = await page.locator('.home-current .home-preview').boundingBox()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  await preview().waitFor()
  assert.notEqual(await title.innerText(), second)
  await checkNeighbors()
  await page.locator('.arcade-screen').focus()
  await page.keyboard.press('ArrowLeft')
  await preview().waitFor()
  assert.equal(await title.innerText(), second)
  await checkNeighbors()
  // Verify every locally available demo produces a real sandboxed frame.
  const titles = []
  const ids = []
  const total = games.length
  const namedScreenshots = {}
  // The Sonic, Batman and Spider-Man packs are private (data/local-catalog,
  // gitignored, built from downloaded sheets). Expect their screenshots only
  // on a checkout that has them; everything else is checked regardless.
  const privatePacks = ['batman', 'sonic', 'spider'].filter((name) =>
    games.some((game) => String(game.id).includes(name)),
  )
  if (privatePacks.length < 3)
    console.log(
      `private packs absent on this checkout: ${['batman', 'sonic', 'spider'].filter((n) => !privatePacks.includes(n)).join(', ')}`,
    )
  for (let i = 0; i < total; i++) {
    await preview().waitFor()
    await checkNeighbors()
    titles.push(await title.innerText())
    const id = await preview().getAttribute('data-game-id')
    ids.push(id)
    for (const name of ['sonic', 'batman', 'spider']) {
      if (id.includes(name)) {
        await page.waitForTimeout(700)
        await screenshot(`home-${name}`)
        namedScreenshots[name] = `home-${name}.png`
      }
    }
    await page.getByRole('button', { name: 'Next game' }).click()
  }
  await preview().waitFor()
  assert.equal(new Set(ids).size, total, JSON.stringify({ titles, ids }))
  assert.deepEqual(Object.keys(namedScreenshots).sort(), privatePacks)
  assert.equal(await runtime().evaluate(() => window.__runtime.gameFrame), 0)
  assert.equal(scores, 0, 'preview must never submit scores')
  await page.keyboard.press('KeyV')
  assert.equal(await page.evaluate(() => window.homeTest.mic), 0)

  await page.getByRole('button', { name: '2 PLAYERS', exact: true }).click()
  await preview().waitFor()
  await play().click()
  await page.getByRole('heading', { name: 'READY!', exact: true }).waitFor()
  await runtime().waitForFunction(() => window.__runtime.players === 2)
  assert.equal(await runtime().evaluate(() => window.__runtime.gameFrame), 0)
  assert.equal(await page.locator('.home-preview').count(), 0)
  await play().click()
  await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
  await runtime().waitForFunction(() => window.__runtime.gameFrame > 15)
  await screenshot('selected-game-playing')
  await page.keyboard.press('Enter')
  await home.waitFor()
  await runtime().waitForFunction(() => window.__runtime.paused)
  const paused = await runtime().evaluate(() => window.__runtime.gameFrame)
  await page.getByRole('button', { name: '1 PLAYER', exact: true }).click()
  await preview().waitFor()
  assert.equal(await runtime().evaluate(() => window.__runtime.gameFrame), paused)
  await page.getByRole('button', { name: 'RESUME GAME', exact: true }).click()
  await runtime().waitForFunction((n) => window.__runtime.gameFrame > n, paused)
  assert.equal(await runtime().evaluate(() => window.__runtime.players), 2)
  await page.keyboard.press('Enter')
  await home.waitFor()
  await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
  await page.getByRole('heading', { name: 'DESCRIBE YOUR GAME', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.homeTest.mic), 0)
  await page.getByRole('button', { name: 'CANCEL', exact: true }).click()
  await home.waitFor()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await preview().waitFor()
  await page.waitForTimeout(400)
  const still = await page.evaluate(() => window.homeTest.frames)
  await page.waitForTimeout(500)
  assert.equal(await page.evaluate(() => window.homeTest.frames), still)
  await screenshot('reduced-motion')
  assert.equal(generated, 0, 'no model or speech requests')
  assert.deepEqual(errors, [])
  writeFileSync(
    resolve(output, 'results.json'),
    JSON.stringify(
      { passed: true, total, titles, ids, namedScreenshots, generated, scores, errors },
      null,
      2,
    ),
  )
  console.log(
    `PASS ${total} previews, swipe/keyboard, 1P/2P, ready, pause/resume, voice entrance, reduced motion, safe area; no model requests`,
  )
} finally {
  await browser.close()
}
