// Real home UI, rendered pixels only. No generated code, state hooks, or model calls.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..'),
  out = resolve(root, 'bench/audits/pong-home-ui'),
  base = process.env.BASE ?? 'http://localhost:3000'
mkdirSync(out, { recursive: true })
for (const file of ['build-preview.html', 'runtime.js', 'index.html'])
  assert.deepEqual(
    readFileSync(resolve(root, 'apps/cabinet/public/runtime', file)),
    readFileSync(resolve(root, 'packages/runtime', file)),
    `Served ${file} is stale; run cabinet sync-runtime`,
  )
const browser = await chromium.launch(),
  errors = [],
  samples = []
let generated = 0,
  scores = 0,
  external = 0
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } })
  await page.route('**/*', (route) => {
    const request = route.request(),
      url = new URL(request.url())
    if (url.pathname === '/api/badges')
      return route.fulfill({
        contentType: 'text/event-stream',
        body: 'data: {"type":"roster","badges":[]}\n\n',
      })
    if (url.pathname.startsWith('/api/badges/')) return route.fulfill({ json: {} })
    if (url.pathname === '/api/generate' || url.pathname === '/api/stt') {
      generated++
      return route.abort()
    }
    if (url.pathname === '/api/scores' && request.method() === 'POST') {
      scores++
      return route.fulfill({ json: {} })
    }
    if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) {
      external++
      return route.abort()
    }
    return route.fallback()
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    if (window !== window.top) return
    window.pongHome = { mic: 0 }
    navigator.mediaDevices.getUserMedia = async () => {
      window.pongHome.mic++
      throw Error('Home microphone forbidden')
    }
  })
  const games = (await (await page.request.get(`${base}/api/demos`)).json()).games
  const pong = games.find((g) => g.id === 'pong' || /pong/i.test(`${g.genre} ${g.title}`))
  assert.ok(pong)
  await page.goto(base)
  const current = () => page.locator('.home-current .home-preview[data-ready="true"]')
  for (let i = 0; i < games.length; i++) {
    await current().waitFor()
    if ((await current().getAttribute('data-game-id')) === pong.id) break
    await page.getByRole('button', { name: 'Next game', exact: true }).click()
  }
  assert.equal(await current().getAttribute('data-game-id'), pong.id)
  const iframe = await page.locator('.home-current iframe').elementHandle(),
    frame = await iframe.contentFrame()
  assert.ok(frame)
  const read = () =>
    frame.evaluate(() => {
      const canvas = document.querySelector('canvas'),
        d = canvas.getContext('2d').getImageData(0, 0, 256, 224).data
      const rgb = (x, y) => [...d.slice((y * 256 + x) * 4, (y * 256 + x) * 4 + 3)]
      const yellow = []
      for (let y = 38; y < 196; y++)
        for (let x = 20; x < 235; x++) {
          const i = (y * 256 + x) * 4
          if (d[i] === 255 && d[i + 1] === 236 && d[i + 2] === 39) yellow.push({ x, y })
        }
      const points = [0, 0]
      for (let i = 0; i < 7; i++) {
        if (rgb(111 - i * 6, 24).join(',') === '41,173,255') points[0]++
        if (rgb(143 + i * 6, 24).join(',') === '255,0,77') points[1]++
      }
      return {
        ball: yellow.length
          ? {
              x: yellow.reduce((s, p) => s + p.x, 0) / yellow.length,
              y: yellow.reduce((s, p) => s + p.y, 0) / yellow.length,
            }
          : null,
        points,
      }
    })
  let returned = false,
    sawRightward = false,
    last = null,
    rallyShot = false
  const start = Date.now()
  while (Date.now() - start < 22000) {
    const sample = { ms: Date.now() - start, ...(await read()) }
    samples.push(sample)
    if (sample.ball && last?.ball) {
      const dx = sample.ball.x - last.ball.x
      if (dx > 3) sawRightward = true
      if (sawRightward && last.ball.x > 215 && dx < -3) returned = true
    }
    if (returned && !rallyShot && sample.ball && sample.ball.x > 40 && sample.ball.x < 220) {
      await page.screenshot({ path: resolve(out, 'pong-home-rally.png') })
      const png = await frame.evaluate(() =>
        document.querySelector('canvas').toDataURL('image/png'),
      )
      writeFileSync(
        resolve(out, 'pong-preview-native.png'),
        Buffer.from(png.split(',')[1], 'base64'),
      )
      rallyShot = true
    }
    if (returned && sample.points.some((n) => n > 0) && rallyShot) break
    if (sample.ball) last = sample
    await page.waitForTimeout(100)
  }
  await page.screenshot({ path: resolve(out, 'pong-home-observed.png') })
  writeFileSync(
    resolve(out, 'observations.json'),
    `${JSON.stringify({ pong, samples, generated, scores, errors }, null, 2)}\n`,
  )
  const positions = samples.filter((s) => s.ball).map((s) => s.ball.x)
  assert.ok(
    new Set(positions.map((x) => Math.round(x))).size > 6,
    'actual ball must travel, not just paddles or frames',
  )
  assert.ok(Math.max(...positions) - Math.min(...positions) > 150, 'serve crosses the court')
  assert.ok(returned, 'right paddle returns the served ball')
  assert.ok(
    samples.some((s) => s.points.some((n) => n > 0)),
    'a real preview rally awards a rendered point',
  )
  const gameRuntime = page.frames().find((f) => f.url().includes('/runtime/index.html'))
  assert.equal(
    await gameRuntime.evaluate(() => window.__runtime.gameFrame),
    0,
    'preview never starts the real cabinet game',
  )
  assert.equal(await page.evaluate(() => window.pongHome.mic), 0)
  assert.equal(generated, 0)
  assert.equal(scores, 0)
  assert.deepEqual(errors, [])
  const sha = (b) => createHash('sha256').update(b).digest('hex')
  writeFileSync(
    resolve(out, 'results.json'),
    `${JSON.stringify(
      {
        passed: true,
        revision: 'pong-home-pixels-v1',
        catalogCount: games.length,
        id: pong.id,
        returned,
        samples,
        generated,
        scores,
        external,
        errors,
        hashes: {
          worker: sha(readFileSync(resolve(root, 'packages/runtime/src/preview-playback.ts'))),
          bundle: sha(
            readFileSync(resolve(root, 'apps/cabinet/public/runtime/build-preview.html')),
          ),
          runtime: sha(readFileSync(resolve(root, 'apps/cabinet/public/runtime/runtime.js'))),
          script: sha(readFileSync(import.meta.filename)),
        },
      },
      null,
      2,
    )}\n`,
  )
  console.log(
    `PASS Pong real home: serve, paddle return, rendered point, game stays idle; ${games.length} catalog entries; no generation or score writes`,
  )
} finally {
  await browser.close()
}
