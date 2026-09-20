// Saved original fighter, actual cabinet UI; no model, speech or persistent writes.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(root, 'bench/audits/control-layout')
const base = process.env.BASE ?? 'http://localhost:3000'
const spec = JSON.parse(readFileSync(resolve(root, 'library/catalog/fighter/spec.json'), 'utf8'))
const module = readFileSync(resolve(root, 'library/catalog/fighter/module.js'), 'utf8')
const wrapper = readFileSync(resolve(root, 'library/catalog/fighter/demo.js'), 'utf8')
const code = `const ARCADE={fighter:${module}};\n${wrapper}`
const game = {
  id: 'fighter',
  title: spec.title,
  description: spec.oneLiner,
  genre: spec.genre,
  players: [1, 2],
  code,
  spec,
}
const results = [],
  errors = [],
  blocked = { generation: 0, speech: 0, external: 0, score: 0 }
mkdirSync(output, { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } })
  await page.route('**/*', (route) => {
    const request = route.request(),
      url = new URL(request.url())
    if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) {
      blocked.external++
      return route.abort()
    }
    if (url.pathname === '/api/generate' || url.pathname === '/api/stt') {
      blocked[url.pathname === '/api/generate' ? 'generation' : 'speech']++
      return route.abort()
    }
    if (url.pathname === '/api/badges')
      return route.fulfill({
        contentType: 'text/event-stream',
        body: 'data: {"type":"roster","badges":[]}\n\n',
      })
    if (url.pathname.startsWith('/api/badges/')) return route.fulfill({ json: {} })
    if (url.pathname === '/api/scores' && request.method() !== 'GET') {
      blocked.score++
      return route.fulfill({ json: {} })
    }
    if (url.pathname === '/api/demos') return route.fulfill({ json: { games: [game] } })
    if (url.pathname === '/api/demos/fighter')
      return route.fulfill({
        json: { ...game, spec: { ...spec, players: Number(url.searchParams.get('players') ?? 1) } },
      })
    return route.fallback()
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(base)
  await page.getByRole('button', { name: '2 PLAYERS', exact: true }).click()
  await page.getByRole('button', { name: /^> PLAY$/ }).click()
  await page.getByRole('heading', { name: 'READY!', exact: true }).waitFor()
  const frame = page.frames().find((f) => f.url().includes('/runtime/index.html'))
  assert.ok(frame)
  assert.equal(await frame.evaluate(() => window.__runtime.gameFrame), 0)
  await page.getByRole('button', { name: /^> PLAY$/ }).click()
  const controls = page.getByRole('region', { name: 'Game controls', exact: true })
  await controls.waitFor()
  assert.match(await controls.innerText(), /DOWN\+A: SWEEP/)
  assert.match(await controls.innerText(), /DOWN\+B: SPECIAL/)
  for (const width of [640, 320, 1280]) {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : width * 0.75 })
    await page.waitForTimeout(150)
    const bounds = await page.evaluate(() => {
      const screen = document.querySelector('.arcade-screen').getBoundingClientRect()
      const game = document.querySelector('.game-frame').getBoundingClientRect()
      const legend = document.querySelector('.game-controls').getBoundingClientRect()
      const rows = [...document.querySelectorAll('.game-control-legend > div')].map((el) => ({
        text: el.textContent,
        box: el.getBoundingClientRect().toJSON(),
        overflow: el.scrollWidth > el.clientWidth + 1,
      }))
      return { screen: screen.toJSON(), game: game.toJSON(), legend: legend.toJSON(), rows }
    })
    assert.ok(bounds.game.bottom < bounds.legend.top, 'controls must never cover gameplay')
    assert.ok(
      bounds.legend.bottom <= bounds.screen.bottom - bounds.screen.height * 0.08 + 1,
      'CRT bottom margin',
    )
    assert.ok(
      bounds.rows.every((row) => !row.overflow),
      'all control meanings stay inside their column',
    )
    const canvas = await frame.locator('canvas').boundingBox()
    assert.ok(canvas)
    await page.screenshot({ path: resolve(output, `selection-${width}.png`) })
    results.push({
      width,
      ...bounds,
      canvas,
      nativeScale: Math.min(canvas.width / 256, canvas.height / 224),
    })
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(blocked, { generation: 0, speech: 0, external: 0, score: 0 })
  writeFileSync(
    resolve(output, 'results.json'),
    `${JSON.stringify({ passed: true, fixtureCodeHash: createHash('sha256').update(code).digest('hex'), results, errors, blocked, limitation: '320x240 cannot fit 224 native game rows, the existing 8% safe margin, and a persistent legend; do not claim native legibility.' }, null, 2)}\n`,
  )
  console.log(
    JSON.stringify(
      results.map(({ width, nativeScale, game, legend }) => ({
        width,
        nativeScale,
        gameHeight: game.height,
        legendHeight: legend.height,
      })),
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
