// Controlled SSE delivery through the real cabinet UI. No model calls.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(new URL('../../..', import.meta.url).pathname)
const out = resolve(root, 'bench/screenshots/live-build')
mkdirSync(out, { recursive: true })
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
  await page.route('**/api/badges', (route) =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: 'data: {"type":"roster","badges":[]}\n\n',
    }),
  )
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    // Playwright also injects into opaque preview iframes, which intentionally
    // have no microphone API. These test hooks belong to the cabinet only.
    if (window !== window.top) return
    const original = window.fetch.bind(window)
    window.buildTest = { cancelled: 0, micStarts: 0, requests: [], push: () => false }
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = (...args) => {
      window.buildTest.micStarts++
      return getUserMedia(...args)
    }
    window.fetch = async (url, options) => {
      if (url !== '/api/generate') return original(url, options)
      window.buildTest.requests.push(JSON.parse(options.body))
      const encoder = new TextEncoder()
      return new Response(
        new ReadableStream({
          start(controller) {
            window.buildTest.push = (event) => {
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
                return true
              } catch {
                return false
              }
            }
            options.signal.addEventListener(
              'abort',
              () => {
                window.buildTest.cancelled++
                try {
                  controller.close()
                } catch {}
              },
              { once: true },
            )
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      )
    }
  })
  await page.route('**/api/stt', (route) =>
    route.fulfill({ json: { text: 'A monkey swinging between rooftops' } }),
  )
  await page.goto(process.env.BASE ?? 'http://localhost:3000')
  await page.getByRole('button', { name: '1 PLAYER', exact: true }).waitFor()
  const begin = async () => {
    await page.getByRole('button', { name: '1 PLAYER', exact: true }).click()
    await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
    await page.keyboard.down('Space')
    await page.getByRole('heading', { name: 'LISTENING' }).waitFor()
    await page.waitForTimeout(800)
    await page.keyboard.up('Space')
    await page.getByRole('heading', { name: 'YOU SAID' }).waitFor()
    await page.keyboard.press('Enter')
    await page.getByRole('region', { name: 'Live game build', exact: true }).waitFor()
  }
  const send = (e) => page.evaluate((event) => window.buildTest.push(event), e)
  const shot = async (name) => {
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    )
    return page.screenshot({ path: resolve(out, `${name}.png`), animations: 'disabled' })
  }
  await begin()
  assert.equal(await page.getByText('LIVE BUILD', { exact: true }).count(), 0)
  await shot('01-waiting')
  await send({
    type: 'spec',
    spec: { title: 'ROOFTOP SWING', oneLiner: 'SWING ACROSS THE SKY', note: '' },
    ms: 1000,
  })
  await send({
    type: 'token',
    variant: 1,
    text: "const MONKEY = [\n  '....4444....',\n  '..44ffff44..',\n",
  })
  await page.getByText('const MONKEY = [', { exact: false }).waitFor()
  const partial = await page.locator('.build-code').innerText()
  await page.getByRole('img', { name: 'Sprite taking shape: MONKEY' }).waitFor()
  const partialPixels = await page.locator('.build-sprite').evaluate((c) => c.toDataURL())
  await shot('01-partial-sprite')
  await send({ type: 'token', variant: 0, text: 'const WRONG_CANDIDATE = ["8888","ffff"];' })
  await send({
    type: 'token',
    variant: 1,
    text: "  '.44f1ff1f44.',\n  '.44ffffff44.',\n  '..44444444..',\n  '....4444....',\n  '..44444444..',\n  '.4444ff4444.',\n  '..44.ff.44..',\n  '..44....44..',\n];\nconst BANANA = ['...a..','..aa..','.aaa..','aaaa..','.aa...'];\nconst BIRD = ['7......7','.77..77.','..7777..','..6699..'];\nfunction update(api, dt) {\n  monkey.vy += gravity * dt;\n  monkey.x += monkey.vx * dt;\n  if (api.btn('a')) catchRope();\n}\n",
  })
  await page.waitForFunction(() =>
    document.querySelector('.build-code').textContent.includes('catchRope'),
  )
  assert.notEqual(await page.locator('.build-code').innerText(), partial)
  assert.notEqual(
    await page
      .locator('.build-sprite')
      .first()
      .evaluate((c) => c.toDataURL()),
    partialPixels,
  )
  assert.equal(await page.locator('.build-sprite').count(), 3)
  assert.doesNotMatch(await page.locator('.build-code').innerText(), /WRONG_CANDIDATE/)
  assert.match(await page.locator('.build-code').innerText(), /catchRope/)
  for (const viewport of [
    { width: 640, height: 480 },
    { width: 320, height: 240 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport)
    assert.ok(
      await page.locator('.build-code').evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    )
    const layout = await page.evaluate(() => {
      const screen = document.querySelector('.arcade-screen').getBoundingClientRect()
      return [
        ...document.querySelectorAll(
          '.build-stage h1,.build-workbench,.build-stage button,.arcade-footer',
        ),
      ].map((el) => {
        const b = el.getBoundingClientRect()
        return {
          text: el.textContent?.slice(0, 25),
          safe:
            b.left >= screen.left + screen.width * 0.08 - 1 &&
            b.right <= screen.right - screen.width * 0.08 + 1 &&
            b.top >= screen.top + screen.height * 0.08 - 1 &&
            b.bottom <= screen.bottom - screen.height * 0.08 + 1,
        }
      })
    })
    assert.ok(
      layout.every((x) => x.safe),
      JSON.stringify(layout),
    )
    await shot(`02-streaming-${viewport.width}`)
  }
  const positions = await page.evaluate(() => ({
    code: document.querySelector('.build-code').getBoundingClientRect().right,
    art: document.querySelector('.build-preview').getBoundingClientRect().left,
  }))
  assert.ok(positions.art > positions.code, 'art belongs beside the streamed code')
  await page.setViewportSize({ width: 640, height: 480 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(
    await page.locator('.build-cursor').evaluate((el) => getComputedStyle(el).animationName),
    'none',
  )
  await send({ type: 'built', variant: 1, ms: 10000, tokens: 1000, syntaxError: null })
  await page.getByText('TESTING THE CONTROLS', { exact: true }).waitFor()
  await shot('03-checking')
  await send({ type: 'repair', phase: 'start', observations: ['A did not jump'] })
  await send({
    type: 'token',
    variant: 1,
    stage: 'repair',
    text: 'function update(api, dt) {\n  if (api.btnp("a")) jump();\n}\n',
  })
  await page.getByText('FIXING A GLITCH', { exact: true }).waitFor()
  assert.equal(await page.locator('.build-sprite').count(), 0)
  assert.doesNotMatch(await page.locator('.build-code').innerText(), /catchRope/)
  await shot('04-repair')
  // Procedural drawing arrives before the closing function brace. It renders
  // in the isolated draft worker; incomplete expressions leave the prior frame.
  await send({ type: 'repair', phase: 'start', observations: [] })
  await send({
    type: 'token',
    variant: 1,
    stage: 'repair',
    text: `
let tick = 0;
function init(api) { tick = 0; }
function update(api) { tick++; }
function draw(api) {
 api.cls(1);
 api.rectfill(0,170,256,54,3);
 api.circfill(175,48,18,10);
 api.rectfill(98,85,35,48,8);
 api.rectfill(100,65,30,26,15);
 api.pset(107,75,0);
 api.pset(122,75,0);
 api.rectfill(98,133,12,26,12);
 api.rectfill(121,133,12,26,12);
 api.rectfill(133,90,12+Math.sin(tick/5)*6,8,15);
 api.rectfill(`,
  })
  await page.locator('.build-scene.is-visible').waitFor()
  const preview = page.frames().find((f) => f.url().includes('/runtime/build-preview.html'))
  const firstFrame = await preview.locator('canvas').evaluate((c) => c.toDataURL())
  await page.waitForTimeout(300)
  assert.equal(
    await preview.locator('canvas').evaluate((c) => c.toDataURL()),
    firstFrame,
    'reduced motion freezes the draft',
  )
  await shot('04-procedural-draft')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(400)
  assert.notEqual(
    await preview.locator('canvas').evaluate((c) => c.toDataURL()),
    firstFrame,
    'actual update/draw code animates procedural art',
  )
  if (process.env.ARCADE_PREVIEW_SAMPLE) {
    const sample = readFileSync(process.env.ARCADE_PREVIEW_SAMPLE, 'utf8')
    const artStart = sample.indexOf('function draw(')
    await send({ type: 'repair', phase: 'start', observations: [] })
    await send({ type: 'token', variant: 1, stage: 'repair', text: sample.slice(0, artStart) })
    await send({ type: 'token', variant: 1, stage: 'repair', text: sample.slice(artStart) })
    await page.waitForTimeout(1200)
    await shot('04-generated-game-draft')
  }
  // A real linked fighter includes >150k of art/controller data, even though the
  // generated customization is tiny. Exercise the iframe, not just its worker.
  const fighter = readFileSync(resolve(root, 'library/catalog/fighter/module.js'), 'utf8')
    .trim()
    .replace(/;\s*$/, '')
  const largeDraft =
    `const ARCADE={fighter:(${fighter})};\n` +
    readFileSync(resolve(root, 'library/catalog/fighter/demo.js'), 'utf8')
  assert(largeDraft.length > 150_000)
  const previewResult = (code) =>
    page.evaluate(
      (code) =>
        new Promise((resolve, reject) => {
          const target = document.querySelector('.build-scene').contentWindow
          const timer = setTimeout(() => {
            window.removeEventListener('message', receive)
            reject(Error('preview response timed out'))
          }, 5000)
          function receive(event) {
            if (
              event.source !== target ||
              !['preview-frame', 'preview-unavailable'].includes(event.data?.type)
            )
              return
            clearTimeout(timer)
            window.removeEventListener('message', receive)
            resolve(event.data.type)
          }
          window.addEventListener('message', receive)
          target.postMessage({ type: 'preview-code', code, players: 2, motion: false }, '*')
        }),
      code,
    )
  assert.equal(await previewResult(largeDraft), 'preview-frame')
  await shot('04-large-catalog-preview')
  assert.equal(await previewResult(' '.repeat(1_000_001)), 'preview-unavailable')
  assert.equal(
    await previewResult(largeDraft),
    'preview-frame',
    'valid preview recovers after rejected oversized payload',
  )
  // A non-terminating large draft must not block CANCEL or the page.
  await page.evaluate(() => {
    window.previewFailed = false
    const previewWindow = document.querySelector('.build-scene').contentWindow
    window.addEventListener('message', (e) => {
      if (e.source === previewWindow && e.data?.type === 'preview-unavailable')
        window.previewFailed = true
    })
    document.querySelector('.build-scene').contentWindow.postMessage(
      {
        type: 'preview-code',
        code:
          '/*' +
          'x'.repeat(200_000) +
          '*/function init(){while(true){}} function update(){} function draw(){}',
        players: 1,
        motion: true,
      },
      '*',
    )
  })
  await page.waitForFunction(() => window.previewFailed)
  assert.equal(await page.getByRole('button', { name: 'CANCEL', exact: true }).isEnabled(), true)
  await send({
    type: 'ready',
    title: 'ROOFTOP SWING',
    code: readFileSync(resolve(root, 'library/templates/dodge.js'), 'utf8'),
    note: '',
    source: 'repair',
    players: 1,
    slug: 'build-test',
    runId: 'test',
    totalMs: 14000,
    spec: {
      oneLiner: 'CATCH PIES',
      controls: {
        left: 'Move left; also choose a fighter in character select.',
        right: 'Move right; also choose a fighter in character select.',
        up: 'Jump during a round; move selection upward in character select if applicable.',
        down: 'Crouch during a round; move selection downward in character select if applicable.',
        a: 'Quick attack during active play; confirm fighter selection and advance after results.',
        b: "Hold to block while grounded or crouching; tap to use the fighter's special when not blocking and energy is at least 25; cancel menus if applicable.",
      },
    },
  })
  await page.getByRole('heading', { name: 'READY!' }).waitFor()
  await page.waitForFunction(() => !document.querySelector('.build-scene'))
  // Worker close notifications can arrive after the iframe's DOM removal.
  for (let tries = 0; page.workers().length && tries < 60; tries++) await page.waitForTimeout(50)
  assert.equal(
    page.workers().length,
    0,
    `leaving the build screen destroys the preview worker: ${page
      .workers()
      .map((w) => w.url())
      .join(',')}`,
  )
  const frame = page.frames().find((f) => f.url().includes('/runtime/index.html'))
  assert.equal(
    await frame.evaluate(() => window.__runtime.gameFrame),
    0,
    'draft code and READY must never autoplay',
  )
  await shot('05-ready')
  const micStarts = await page.evaluate(() => window.buildTest.micStarts)
  await page.keyboard.press('Space')
  await page.getByRole('heading', { name: 'READY!' }).waitFor()
  assert.equal(await page.evaluate(() => window.buildTest.micStarts), micStarts)
  await page.keyboard.press('Enter')
  await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
  for (const viewport of [
    { width: 320, height: 240 },
    { width: 640, height: 480 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport)
    await page.waitForTimeout(100)
    const layout = await page.evaluate(() => {
      const screen = document.querySelector('.arcade-screen').getBoundingClientRect()
      const game = document.querySelector('.game-frame').getBoundingClientRect()
      const controls = document.querySelector('.game-controls').getBoundingClientRect()
      return {
        gameHeight: game.height,
        screenHeight: screen.height,
        gameBottom: game.bottom,
        controlsTop: controls.top,
      }
    })
    assert.ok(layout.gameHeight >= layout.screenHeight * 0.42, JSON.stringify(layout))
    assert.ok(layout.gameBottom <= layout.controlsTop, JSON.stringify(layout))
    await shot(`05-playing-long-controls-${viewport.width}`)
  }
  await page.setViewportSize({ width: 640, height: 480 })
  for (const key of ['Space', 'KeyV']) {
    await page.keyboard.down(key)
    await page.waitForTimeout(150)
    await page.keyboard.up(key)
  }
  assert.equal(
    await page.evaluate(() => window.buildTest.micStarts),
    micStarts,
    'TALK during play must not open the microphone',
  )
  await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
  assert.equal(await page.getByText('TALK: CHANGE', { exact: true }).count(), 0)
  await page.keyboard.press('F9')
  await page.getByRole('heading', { name: 'GAME OVER', exact: true }).waitFor()
  await page.keyboard.press('Space')
  assert.equal(await page.evaluate(() => window.buildTest.micStarts), micStarts)
  assert.equal(await page.getByRole('button', { name: /CHANGE GAME/ }).count(), 0)
  await shot('06-game-over-no-remix')
  await page.keyboard.press('KeyX')
  await page.getByRole('button', { name: '1 PLAYER', exact: true }).waitFor()
  await begin()
  assert.equal(await page.evaluate(() => window.buildTest.micStarts), micStarts + 1)
  assert.ok(
    await page.evaluate(() => window.buildTest.requests.every((body) => !('current' in body))),
    'new games never send the previous game as remix context',
  )
  await send({
    type: 'spec',
    spec: { title: 'ROOFTOP SWING', oneLiner: 'SWING', note: '' },
    ms: 10,
  })
  await send({
    type: 'token',
    variant: 0,
    stage: 'build',
    text: 'function init(api) {}\nfunction update(api) {}\nfunction draw(api) {',
  })
  await page.getByText('WRITING YOUR GAME', { exact: true }).waitFor()
  await shot('07-new-game-from-menu')
  await page.keyboard.press('KeyX')
  await page.getByRole('button', { name: /CURRENT GAME|RESUME GAME/ }).waitFor()
  assert.ok((await page.evaluate(() => window.buildTest.cancelled)) > 0)
  assert.equal(await page.getByRole('region', { name: 'Live game build', exact: true }).count(), 0)
  assert.equal(errors.length, 0, errors.join('\n'))
  console.log(
    'PASS: live preview, worker cleanup, CRT layout, no autoplay, menu-only voice creation, no in-game mic or remix context, cancellation',
  )
} finally {
  await browser.close()
}
