// The real cabinet, microphone lifecycle and runtime; transcription and generation
// are intercepted locally so this regression never calls a paid API.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(root, 'bench/audits/generation-error')
mkdirSync(output, { recursive: true })
const transcript = 'Street Fighter but with Marvel characters'
const spendError =
  '429 Your project has reached its configured enforced spend limit. Update your limit at https://platform.openai.com/settings/proj_fixture_private/limits.'
const code = `function init(api) {}
function update(api) {}
function draw(api) { api.cls(1); api.rectfill(50, 140, 16, 20, 10); api.rectfill(0, 160, 256, 64, 3); }`
const spec = {
  title: 'RECOVERED GAME',
  players: 2,
  oneLiner: 'MOVE AND ATTACK.',
  controls: { left: 'MOVE LEFT', right: 'MOVE RIGHT', a: 'ATTACK' },
}
const ready = {
  type: 'ready',
  title: spec.title,
  code,
  note: '',
  source: 'build',
  players: 2,
  slug: 'generation-error-fixture',
  spec,
  runId: 'generation-error-fixture',
  totalMs: 1,
}
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})

try {
  const context = await browser.newContext({
    permissions: ['microphone'],
    viewport: { width: 640, height: 480 },
  })
  const page = await context.newPage()
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    const origin = new URL(process.env.BASE ?? 'http://localhost:3000').origin
    return url.pathname === '/api/generate' ||
      (url.protocol.startsWith('http') && url.origin !== origin)
      ? route.abort()
      : route.fallback()
  })
  const errors = []
  const requests = []
  page.on('pageerror', (error) => errors.push(error.message))
  await context.addInitScript(() => {
    if (window !== window.top) return
    window.generationErrorTest = { calls: 0, streams: [], loads: [] }
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'load') window.generationErrorTest.loads.push(event.data)
    })
    if (!navigator.mediaDevices?.getUserMedia) return
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      window.generationErrorTest.calls++
      const stream = await original(constraints)
      window.generationErrorTest.streams.push(stream)
      return stream
    }
  })
  await page.route('**/api/stt', (route) => route.fulfill({ json: { text: transcript } }))
  await page.route('**/api/generate', async (route) => {
    requests.push(route.request().postDataJSON())
    const events =
      requests.length === 1
        ? [
            { type: 'error', message: spendError, terminal: true },
            { type: 'fallback', reason: spendError, title: 'WRONG FALLBACK', slug: 'wrong' },
            { ...ready, title: 'WRONG FALLBACK', source: 'library', slug: 'wrong' },
          ]
        : [{ type: 'error', message: 'build 0: Request timed out.', terminal: false }, ready]
    // One chunk deliberately reproduces error + fallback + ready racing the UI.
    await route.fulfill({
      contentType: 'text/event-stream',
      body: events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''),
    })
  })

  const assertMicOff = async () => {
    assert.equal(await page.evaluate(() => window.generationErrorTest.calls), 1)
    assert.ok(
      await page.evaluate(() =>
        window.generationErrorTest.streams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === 'ended'),
        ),
      ),
      'the microphone must be released after recording, including on build failure',
    )
  }
  const safeBounds = []
  const assertSafeArea = async (width) => {
    const screen = await page.locator('.arcade-screen').boundingBox()
    assert.ok(screen)
    const safe = {
      left: screen.x + screen.width * 0.08,
      right: screen.x + screen.width * 0.92,
      top: screen.y + screen.height * 0.08,
      bottom: screen.y + screen.height * 0.92,
    }
    const elements = page.locator(
      '.voice-stage h1, .voice-transcript, [role=alert], .voice-stage button',
    )
    const bounds = []
    for (const element of await elements.all()) {
      if (!(await element.isVisible())) continue
      const box = await element.boundingBox()
      const text = (await element.innerText()).trim()
      assert.ok(box, `${text}: missing bounds`)
      assert.ok(
        box.x >= safe.left - 1 && box.x + box.width <= safe.right + 1,
        `${width}px: ${text} exceeds horizontal CRT safe area`,
      )
      assert.ok(
        box.y >= safe.top - 1 && box.y + box.height <= safe.bottom + 1,
        `${width}px: ${text} exceeds vertical CRT safe area`,
      )
      bounds.push({ text, box })
    }
    safeBounds.push({ width, safe, bounds })
  }

  await page.goto(process.env.BASE ?? 'http://localhost:3000')
  await page.getByRole('button', { name: '2 PLAYERS', exact: true }).click()
  await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
  await page.getByRole('heading', { name: 'DESCRIBE YOUR GAME', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.generationErrorTest.calls), 0)
  const talk = await page.getByRole('button', { name: /HOLD TO TALK/ }).boundingBox()
  assert.ok(talk)
  await page.mouse.move(talk.x + talk.width / 2, talk.y + talk.height / 2)
  await page.mouse.down()
  await page.getByRole('heading', { name: 'LISTENING', exact: true }).waitFor()
  await page.waitForTimeout(400)
  await page.mouse.up()
  await page.getByRole('heading', { name: 'YOU SAID', exact: true }).waitFor()
  await assertMicOff()
  assert.equal(requests.length, 0)
  await page.getByRole('button', { name: /MAKE GAME/ }).click()
  await page.getByRole('alert').filter({ hasText: 'OPENAI PROJECT SPEND LIMIT REACHED' }).waitFor()
  await page.waitForTimeout(500)
  assert.equal(requests.length, 1, 'generation failures must not retry automatically')
  assert.deepEqual(requests[0], { transcript, players: 2 })
  assert.equal(await page.getByRole('heading', { name: 'YOU SAID', exact: true }).count(), 1)
  assert.equal(
    (await page.locator('.voice-transcript').innerText()).toUpperCase(),
    transcript.toUpperCase(),
  )
  assert.doesNotMatch(
    await page.locator('.arcade-screen').innerText(),
    /proj_fixture_private|https:|WRONG FALLBACK/,
  )
  assert.equal(await page.getByRole('heading', { name: 'READY!', exact: true }).count(), 0)
  for (const frame of page.frames()) {
    assert.deepEqual(
      await frame.evaluate(() => window.generationErrorTest?.loads ?? []),
      [],
      'fallback must never load',
    )
  }
  await assertMicOff()
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: width * 0.75 })
    await page.screenshot({ path: resolve(output, `spend-limit-${width}.png`) })
    await assertSafeArea(width)
  }
  console.log(`Error screenshots: ${output}/spend-limit-{640,320}.png`)

  await page.setViewportSize({ width: 640, height: 480 })
  await page.getByRole('button', { name: /MAKE GAME/ }).click()
  await page.getByRole('heading', { name: 'READY!', exact: true }).waitFor()
  assert.equal(requests.length, 2, 'only the explicit retry should generate again')
  assert.deepEqual(requests[1], requests[0], 'retry preserves the exact idea and player count')
  assert.equal(await page.locator('.arcade-screen [role=alert]').count(), 0)
  const runtime = page.frames().find((frame) => frame.url().includes('/runtime/index.html'))
  assert.ok(runtime)
  await runtime.waitForFunction(() => Boolean(window.__runtime))
  await page.waitForTimeout(300)
  assert.equal(await runtime.evaluate(() => window.__runtime.players), 2)
  assert.equal(
    await runtime.evaluate(() => window.__runtime.gameFrame),
    0,
    'Ready must not autoplay',
  )
  assert.equal(await runtime.evaluate(() => window.generationErrorTest.loads.length), 1)
  assert.equal(await runtime.evaluate(() => window.generationErrorTest.loads[0].title), spec.title)
  await assertMicOff()
  await page.screenshot({ path: resolve(output, 'recovered-ready-640.png') })
  assert.deepEqual(errors, [])
  writeFileSync(
    resolve(output, 'results.json'),
    JSON.stringify({ passed: true, requests, safeBounds, pageErrors: errors }, null, 2),
  )
  console.log(
    'PASS spend-limit classification, same-chunk fallback guard, retained idea/2P, microphone cleanup, explicit retry, nonterminal failure recovery and no autoplay',
  )
  await context.close()
} finally {
  await browser.close()
}
