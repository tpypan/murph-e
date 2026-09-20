// Isolated cabinet regression for the physical panel: the whole loop driven
// only by the encoder's key codes (the numpad placeholders in
// apps/cabinet/app/input.ts), then the F3 overlay pressed with the mouse, then
// the ?cabinet=1 keycaps. Local transcription/build fixtures; never touches the
// user's open browser, the badges or the model API. Needs `pnpm dev` running.
// Run: pnpm --filter @htn/probe exec node scripts/panel-ui-test.mjs
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(root, 'bench/audits/panel')
mkdirSync(output, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:3000'
const code = `let x = 64;
function init(api) { x = 64; }
function update(api) { if (api.btn('left')) x--; if (api.btn('right')) x++; if (api.btnp('a')) api.addScore(1); }
function draw(api) { api.cls(1); api.rectfill(x, 140, 16, 20, 10); api.rectfill(0, 160, 256, 64, 3); }
`
// The panel, as the encoder sends it (input.ts ENCODER_KEYS + PANEL_ROLES).
const KEY = {
  up: 'Numpad8',
  down: 'Numpad2',
  left: 'Numpad4',
  right: 'Numpad6',
  a: 'Numpad1',
  b: 'Numpad3',
  x: 'Numpad7', // START
  y: 'Numpad9', // TALK
}
const forbiddenHints = /\bSTICK\b|START:\s*OK|B:\s*(?:BACK|CANCEL|MENU)/i
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const results = { passed: false, steps: [] }

try {
  const context = await browser.newContext({
    permissions: ['microphone'],
    viewport: { width: 640, height: 480 },
  })
  const page = await context.newPage()
  const counts = { generate: 0, stt: 0 }
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    return url.protocol.startsWith('http') && url.origin !== new URL(base).origin
      ? route.abort()
      : route.fallback()
  })
  await page.route('**/api/badges', (route) =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: 'data: {"type":"roster","badges":[]}\n\n',
    }),
  )
  await page.route('**/api/badges/*', (route) => route.fulfill({ json: {} }))
  await page.route('**/api/stt', (route) => {
    counts.stt++
    return route.fulfill({ json: { text: 'A penguin collecting fish and dodging seals' } })
  })
  await page.route('**/api/generate', async (route) => {
    counts.generate++
    const request = route.request().postDataJSON()
    assert.equal(request.players, undefined, 'nobody is asked how many players')
    const spec = {
      title: 'PANEL TEST',
      oneLiner: 'CATCH FISH. DODGE SEALS.',
      controls: { left: 'MOVE LEFT', right: 'MOVE RIGHT', a: 'JUMP' },
    }
    await route.fulfill({
      contentType: 'text/event-stream',
      // The server builds both versions; the page picks by the badges.
      body: [1, 2]
        .map(
          (players) =>
            `data: ${JSON.stringify({
              type: 'ready',
              players,
              title: 'PANEL TEST',
              code: code,
              note: '',
              source: 'build',
              slug: players === 2 ? 'panel-test-2p' : 'panel-test',
              spec: { ...spec, players },
              runId: `panel-test-${players}p`,
              totalMs: 1,
            })}\n\n`,
        )
        .join(''),
    })
  })

  const shot = (name) => page.screenshot({ path: resolve(output, `${name}.png`) })
  const screen = page.locator('.arcade-screen')
  const heading = (name) => page.getByRole('heading', { name, exact: true })
  const step = async (name, fn) => {
    await fn()
    assert.doesNotMatch(await screen.innerText(), forbiddenHints, `${name}: no shell hints`)
    results.steps.push(name)
    console.log(`ok ${name}`)
  }
  const press = async (key) => {
    await page.keyboard.down(key)
    await page.waitForTimeout(40)
    await page.keyboard.up(key)
  }
  const runtime = () => page.frames().find((frame) => frame.url().includes('/runtime/index.html'))
  const home = async () => {
    await page.getByRole('button', { name: '1 PLAYER', exact: true }).waitFor()
    await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).waitFor()
  }
  // Home opens on PLAY; MAKE A GAME is one row down.
  const describe = async () => {
    await home()
    await press(KEY.down)
    await press(KEY.a)
    await heading('DESCRIBE YOUR GAME').waitFor()
  }
  const talkAndReview = async () => {
    await page.keyboard.down(KEY.y)
    await heading('LISTENING').waitFor()
    await page.waitForTimeout(300)
    await page.keyboard.up(KEY.y)
    await heading('YOU SAID').waitFor()
  }

  await page.goto(base)
  await step('home on the encoder', home)
  await step('A selects MAKE A GAME', describe)
  await step('Y is TALK: hold to record, release to review', talkAndReview)
  await step('B is back: cancel returns home', async () => {
    await press(KEY.b)
    await home()
    assert.equal(counts.generate, 0)
  })
  await step('A confirms the transcript and builds', async () => {
    await describe()
    await talkAndReview()
    await press(KEY.a)
    await heading('READY!').waitFor()
    assert.equal(counts.generate, 1)
    await runtime().waitForFunction(() => Boolean(window.__runtime))
    assert.equal(await runtime().evaluate(() => window.__runtime.gameFrame), 0, 'no autoplay')
  })
  await step('A plays; the stick reaches the game', async () => {
    await press(KEY.a)
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
    await runtime().waitForFunction(() => window.__runtime.gameFrame > 5)
    assert.match(await page.locator('.game-control-legend').innerText(), /JUMP/)
    await page.keyboard.down(KEY.right)
    await runtime().waitForFunction(() => window.__runtime.input.btn('right', 0))
    await page.keyboard.up(KEY.right)
    await runtime().waitForFunction(() => !window.__runtime.input.btn('right', 0))
    const before = await runtime().evaluate(() => window.__runtime.scores[0])
    await press(KEY.a)
    await runtime().waitForFunction((n) => window.__runtime.scores[0] > n, before)
  })
  await step('X is START: pause to the menu, RESUME continues', async () => {
    await press(KEY.x)
    await page.getByRole('button', { name: /RESUME GAME/ }).waitFor()
    await press(KEY.down)
    await press(KEY.down)
    await press(KEY.a)
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
    assert.equal(counts.generate, 1, 'resume does not regenerate')
  })
  await step('B leaves the game over card', async () => {
    await page.keyboard.press('F9')
    await heading('GAME OVER').waitFor()
    await press(KEY.b)
    await home()
  })
  await step('F3 overlay: a mouse press takes the encoder path', async () => {
    await press(KEY.down)
    await press(KEY.down)
    await press(KEY.a) // RESUME after a game over lands on READY
    await heading('READY!').waitFor()
    assert.equal(await page.locator('.panel-sim').count(), 0, 'hidden by default')
    await page.keyboard.press('F3')
    const panel = page.getByRole('region', { name: 'Cabinet panel' })
    await panel.waitFor()
    const a = panel.getByRole('button', { name: 'Panel A', exact: true })
    const box = await a.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await a.and(page.locator('[data-lit="true"]')).waitFor()
    await page.mouse.up()
    await a.and(page.locator('[data-lit="false"]')).waitFor()
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
    // Real key presses light the overlay too.
    await page.keyboard.down(KEY.right)
    await panel
      .getByRole('button', { name: 'Panel RIGHT', exact: true })
      .and(page.locator('[data-lit="true"]'))
      .waitFor()
    assert.match(await panel.innerText(), /RIGHT NUMPAD6/i)
    const settled = await runtime().evaluate(() => window.__runtime.gameFrame)
    await runtime().waitForFunction((n) => window.__runtime.gameFrame > n + 10, settled)
    await shot('overlay-playing-640')
    await page.setViewportSize({ width: 320, height: 240 })
    await page.waitForTimeout(200)
    await shot('overlay-playing-320')
    await page.setViewportSize({ width: 640, height: 480 })
    await page.keyboard.up(KEY.right)
    const bounds = await panel.boundingBox()
    const frame = await screen.boundingBox()
    assert.ok(bounds.x + bounds.width <= frame.x + frame.width * 0.92 + 1, 'inside the CRT margin')
    assert.ok(
      bounds.y + bounds.height <= frame.y + frame.height * 0.92 + 1,
      'inside the CRT margin',
    )
    await page.keyboard.press('F3')
    await page.locator('.panel-sim').waitFor({ state: 'detached' })
  })
  await step('?cabinet=1: keycaps are the panel letters', async () => {
    await page.goto(`${base}/?cabinet=1`)
    await describe()
    await talkAndReview()
    await press(KEY.a)
    await heading('READY!').waitFor()
    await press(KEY.a)
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
    const legend = await page.locator('.game-control-legend').innerText()
    assert.doesNotMatch(legend, /A \/ Z|B \/ X/)
    assert.match(legend, /\bA\b/)
    assert.equal(await page.locator('.game-control-p2').count(), 0)
    await shot('cabinet-playing-640')
    await press(KEY.x)
    await home()
    await press(KEY.up) // from PLAY up past players and the title wraps to OPTIONS
    await press(KEY.up)
    await press(KEY.up)
    await press(KEY.a)
    await heading('OPTIONS').waitFor()
    assert.match(await screen.innerText(), /PANEL: A B X Y/)
    assert.doesNotMatch(await screen.innerText(), /KEYBOARD/)
    await shot('cabinet-options-640')
    await press(KEY.b)
    await home()
  })
  assert.equal(counts.generate, 2)
  assert.equal(counts.stt, 3)
  assert.deepEqual(errors, [])
  results.passed = true
  writeFileSync(resolve(output, 'results.json'), `${JSON.stringify(results, null, 2)}\n`)
  console.log('PASS panel: encoder codes drive the whole loop, F3 overlay, cabinet keycaps')
} finally {
  await browser.close()
}
