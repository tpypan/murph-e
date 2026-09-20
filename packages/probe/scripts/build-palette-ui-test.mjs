// Isolated actual cabinet UI; controlled stream, fake microphone, no model calls.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(new URL('../../..', import.meta.url).pathname)
const out = resolve(root, 'bench/screenshots/palette-literals')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const palette = ['#000000', '#0033ee', '#0066ff', '#0088ff', '#f0e8db']
const rows = [
  '....1111....',
  '...122221...',
  '..12333321..',
  '..13400431..',
  '..13444431..',
  '...144441...',
  '..22211222..',
  '.1233333321.',
  '.4423333244.',
  '...222222...',
  '...12..21...',
  '..000..000..',
]
const observations = []
try {
  const page = await browser.newPage({
    viewport: { width: 960, height: 720 },
    permissions: ['microphone'],
  })
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    const origin = new URL(process.env.BASE ?? 'http://localhost:3000').origin
    return url.pathname === '/api/generate' ||
      (url.protocol.startsWith('http') && url.origin !== origin)
      ? route.abort()
      : route.fallback()
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    if (window !== window.top) return
    const fetch = window.fetch.bind(window)
    window.paletteTest = { push: () => false }
    window.fetch = async (url, options) => {
      if (url !== '/api/generate') return fetch(url, options)
      return new Response(
        new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder()
            window.paletteTest.push = (event) =>
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
            options.signal.addEventListener('abort', () => controller.close(), { once: true })
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      )
    }
  })
  await page.route('**/api/stt', (route) =>
    route.fulfill({ json: { text: 'A blue robot collects stars' } }),
  )
  await page.goto(process.env.BASE ?? 'http://localhost:3000')
  await page.getByRole('button', { name: '1 PLAYER', exact: true }).click()
  await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
  await page.keyboard.down('Space')
  await page.getByRole('heading', { name: 'LISTENING' }).waitFor()
  await page.waitForTimeout(800)
  await page.keyboard.up('Space')
  await page.getByRole('heading', { name: 'YOU SAID' }).waitFor()
  await page.keyboard.press('Enter')
  await page.getByRole('region', { name: 'Live game build', exact: true }).waitFor()
  const send = (event) => page.evaluate((data) => window.paletteTest.push(data), event)
  const shot = async (name) => {
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    )
    await page.screenshot({ path: resolve(out, `${name}.png`), animations: 'disabled' })
  }
  const colors = async () =>
    page
      .locator('.build-sprite')
      .first()
      .evaluate((canvas) => {
        const data = canvas.getContext('2d').getImageData(0, 0, 128, 128).data
        const colors = new Set()
        let transparent = 0,
          opaqueBlack = 0
        for (let i = 0; i < data.length; i += 4) {
          if (!data[i + 3]) transparent++
          else {
            const color =
              '#' +
              [data[i], data[i + 1], data[i + 2]]
                .map((v) => v.toString(16).padStart(2, '0'))
                .join('')
            colors.add(color)
            if (color === '#000000') opaqueBlack++
          }
        }
        return { colors: [...colors].sort(), transparent, opaqueBlack }
      })
  await send({
    type: 'spec',
    spec: { title: 'BLUE ROBOT', oneLiner: 'COLLECT STARS', note: '' },
    ms: 10,
  })
  await send({ type: 'token', variant: 1, text: "const HERO_PALETTE = ['#000000', '#0033" })
  await page.waitForFunction(() =>
    document.querySelector('.build-code')?.textContent.includes('HERO_PALETTE'),
  )
  assert.equal(await page.locator('.build-sprite').count(), 0)
  await shot('01-palette-still-streaming')
  await send({
    type: 'token',
    variant: 1,
    text:
      "ee', '#0066ff', '#0088ff', '#f0e8db'];\nconst HERO = [\n" +
      rows
        .slice(0, 2)
        .map((row) => ` '${row}',\n`)
        .join(''),
  })
  await page.getByRole('img', { name: 'Sprite taking shape: HERO' }).waitFor()
  await send({
    type: 'token',
    variant: 1,
    text:
      rows
        .slice(2)
        .map((row) => ` '${row}',\n`)
        .join('') + '];\n',
  })
  await page.waitForFunction(() =>
    document.querySelector('.build-code')?.textContent.includes('000..000'),
  )
  await page.waitForTimeout(80)
  const exact = await colors()
  assert.deepEqual(exact.colors, [...palette].sort())
  assert.ok(exact.transparent > 0 && exact.opaqueBlack > 0)
  observations.push({
    test: 'exact literal palette including opaque black and transparent holes',
    ...exact,
  })
  await shot('02-exact-palette-sprite')
  await send({ type: 'repair', phase: 'start', observations: [] })
  await send({
    type: 'token',
    variant: 1,
    stage: 'repair',
    text: "const HERO_PALETTE=['#000000','#GGGGGG'];\nconst HERO=['01','10'];\nconst STAR=['aa','a.'];",
  })
  await page.getByRole('img', { name: 'Sprite taking shape: STAR' }).waitFor()
  assert.equal(await page.getByRole('img', { name: 'Sprite taking shape: HERO' }).count(), 0)
  assert.deepEqual((await colors()).colors, ['#ffec27'])
  observations.push({
    test: 'malformed custom sprite skipped; adjacent legacy sprite keeps PICO colors',
  })
  await shot('03-invalid-palette-legacy-safe')
  await send({ type: 'repair', phase: 'start', observations: [] })
  await send({
    type: 'token',
    variant: 1,
    stage: 'repair',
    text: "const HERO_PALETTE=(()=>{window.paletteExecuted=true;return ['#000000']})();\nconst HERO=['00','00'];",
  })
  await page.getByText('WAITING FOR ART', { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.paletteExecuted), undefined)
  assert.equal(await page.locator('.build-sprite').count(), 0)
  observations.push({ test: 'expression never evaluated and no false legacy preview' })
  await shot('04-expression-not-evaluated')
  await page.getByRole('button', { name: 'CANCEL', exact: true }).click()
  assert.deepEqual(errors, [])
  writeFileSync(
    resolve(out, 'results.json'),
    JSON.stringify({ observations, errors }, null, 2) + '\n',
  )
  console.log(JSON.stringify({ observations, errors }, null, 2))
} finally {
  await browser.close()
}
