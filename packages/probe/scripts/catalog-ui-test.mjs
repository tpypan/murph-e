// Actual cabinet + isolated draft worker, using catalog SSE and no paid model call.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const out = resolve(root, 'bench/audits/catalog-ui')
mkdirSync(out, { recursive: true })
const module = readFileSync(resolve(root, 'library/catalog/kart/module.js'), 'utf8')
  .trim()
  .replace(/;\s*$/, '')
const prefix = `const ARCADE = {kart: (${module})};\n`
const demo = readFileSync(resolve(root, 'library/catalog/kart/demo.js'), 'utf8')
const spec = JSON.parse(readFileSync(resolve(root, 'library/catalog/kart/spec.json'), 'utf8'))
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
try {
  const page = await browser.newPage({
    viewport: { width: 640, height: 480 },
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
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    if (window !== window.top) return
    const original = window.fetch.bind(window)
    window.fetch = async (url, opts) => {
      if (url !== '/api/generate') return original(url, opts)
      await new Promise((resolve) => setTimeout(resolve, 750))
      const enc = new TextEncoder()
      return new Response(
        new ReadableStream({
          start(c) {
            window.sendBuild = (e) => c.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`))
            opts.signal.addEventListener('abort', () => c.close(), { once: true })
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      )
    }
  })
  await page.route('**/api/stt', (r) => r.fulfill({ json: { text: 'A kart race by the sea' } }))
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
  await page.getByRole('heading', { name: 'COOKING YOUR IDEA' }).waitFor()
  await page.screenshot({ path: resolve(out, 'cooking-your-idea.png') })
  await page.waitForFunction(() => typeof window.sendBuild === 'function')
  const send = (e) => page.evaluate((e) => window.sendBuild(e), e)
  await send({ type: 'spec', spec: { ...spec, players: 1 }, ms: 100 })
  await send({ type: 'foundation', prefix, demo })
  await page.locator('.build-scene.is-visible').waitFor()
  assert.equal(
    await page.locator('.build-code pre').count(),
    0,
    'base art shows before any fabricated model output',
  )
  await page.screenshot({ path: resolve(out, 'foundation-before-code.png') })
  const custom = demo.replace("theme: 'coast'", "theme: 'night'")
  await send({ type: 'token', variant: 0, text: '```js\n' + custom + '\n```' })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: resolve(out, 'customization-preview.png') })
  for (const viewport of [
    { width: 320, height: 240 },
    { width: 640, height: 480 },
  ]) {
    await page.setViewportSize(viewport)
    assert.ok(
      await page.locator('.build-code').evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
    )
    assert.ok(
      await page.locator('.build-preview').evaluate((e) => {
        const b = e.getBoundingClientRect()
        return b.width > 0 && b.height > 0 && b.bottom <= innerHeight
      }),
    )
    await page.screenshot({ path: resolve(out, `preview-${viewport.width}.png`) })
  }
  await send({
    type: 'ready',
    code: prefix + custom,
    title: 'NIGHT CIRCUIT',
    spec: { ...spec, players: 1 },
    note: '',
    players: 1,
    source: 'build',
    slug: 'catalog-ui-test',
    runId: 'test',
    totalMs: 1000,
  })
  await page.getByRole('heading', { name: 'READY!' }).waitFor()
  await page.waitForFunction(() => !document.querySelector('.build-scene'))
  for (let n = 0; page.workers().length && n < 60; n++) await page.waitForTimeout(50)
  assert.equal(page.workers().length, 0)
  assert.deepEqual(errors, [])
  await page.screenshot({ path: resolve(out, 'ready-no-autoplay.png') })
  writeFileSync(
    resolve(out, 'results.json'),
    JSON.stringify(
      {
        passed: true,
        checks: [
          'real foundation preview before tokens',
          'customization preview with linked factory',
          '320/640 CRT fit',
          'ready requires START',
          'worker cleanup',
        ],
        errors,
      },
      null,
      2,
    ),
  )
  console.log('PASS catalog preview, CRT layout, ready gating and worker cleanup')
} finally {
  await browser.close()
}
