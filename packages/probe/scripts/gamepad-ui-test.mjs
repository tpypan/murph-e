// Isolated cabinet regression for the real panel's transport: a fake Gamepad
// API pad shaped like the ESP32-S3 Arcade Controller (analog stick on axes
// 0/1 with up as +Y, A B X Y on buttons 0..3) drives the menus, the F3
// overlay and a game through the same routing as the numpad placeholders.
// Never touches the model API. Needs `pnpm dev` running.
// Run: pnpm --filter @htn/probe exec node scripts/gamepad-ui-test.mjs
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(root, 'bench/audits/gamepad')
mkdirSync(output, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:3000'
const code = `let x = 64;
function init(api) { x = 64; }
function update(api) { if (api.btn('left')) x--; if (api.btn('right')) x++; if (api.btnp('a')) api.addScore(1); }
function draw(api) { api.cls(1); api.rectfill(x, 140, 16, 20, 10); api.rectfill(0, 160, 256, 64, 3); }
`
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
  await page.route('**/api/stt', (route) => route.fulfill({ json: { text: 'a penguin game' } }))
  await page.route('**/api/generate', async (route) => {
    const spec = {
      title: 'PAD TEST',
      oneLiner: 'CATCH FISH.',
      controls: { left: 'MOVE LEFT', right: 'MOVE RIGHT', a: 'JUMP' },
    }
    await route.fulfill({
      contentType: 'text/event-stream',
      body: [1, 2]
        .map(
          (players) =>
            `data: ${JSON.stringify({ type: 'ready', players, title: 'PAD TEST', code, note: '', source: 'build', slug: players === 2 ? 'pad-test-2p' : 'pad-test', spec: { ...spec, players }, runId: `pad-${players}p`, totalMs: 1 })}\n\n`,
        )
        .join(''),
    })
  })
  // The fake pad: the page reads it through navigator.getGamepads() exactly as
  // it would read the real board.
  await page.addInitScript(() => {
    if (window !== window.top) return
    const pad = {
      id: 'ESP32-S3 Arcade Controller (Vendor: 303a Product: 1001)',
      index: 0,
      connected: true,
      mapping: '',
      timestamp: 0,
      axes: [0, 0, 0, 0, 0, 0],
      buttons: Array.from({ length: 32 }, () => ({ pressed: false, touched: false, value: 0 })),
    }
    window.__pad = pad
    window.__gamepadTest = true // opt this automated page into reading the pad
    navigator.getGamepads = () => [pad, null, null, null]
  })
  const set = (axes, pressed = []) =>
    page.evaluate(
      ([axes, pressed]) => {
        window.__pad.axes = axes
        window.__pad.buttons.forEach((b, i) => {
          b.pressed = pressed.includes(i)
          b.value = b.pressed ? 1 : 0
        })
      },
      [axes, pressed],
    )
  const centre = [0, 0, 0, 0, 0, 0]
  const tap = async (button) => {
    await set(centre, [button])
    await page.waitForTimeout(80)
    await set(centre, [])
    await page.waitForTimeout(80)
  }
  const flick = async (axes) => {
    await set(axes, [])
    await page.waitForTimeout(80)
    await set(centre, [])
    await page.waitForTimeout(80)
  }
  const DOWN = [0, -1, 0, 0, 0, 0]
  const RIGHT = [1, 0, 0, 0, 0, 0]
  const A = 0
  const B = 1
  const X = 2 // START
  const Y = 3 // TALK
  const heading = (name) => page.getByRole('heading', { name, exact: true })
  const runtime = () => page.frames().find((frame) => frame.url().includes('/runtime/index.html'))
  const shot = (name) => page.screenshot({ path: resolve(output, `${name}.png`) })
  const step = async (name, fn) => {
    await fn()
    results.steps.push(name)
    console.log(`ok ${name}`)
  }

  await page.goto(`${base}/?cabinet=1`)
  await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).waitFor()
  await step('the overlay lights from the pad', async () => {
    await page.keyboard.press('F3')
    const panel = page.getByRole('region', { name: 'Cabinet panel' })
    await panel.waitFor()
    // RIGHT and Y are harmless on the home screen (browse, and TALK is ignored there).
    await set(RIGHT, [Y])
    await panel
      .getByRole('button', { name: 'Panel RIGHT', exact: true })
      .and(page.locator('[data-lit="true"]'))
      .waitFor()
    await panel
      .getByRole('button', { name: 'Panel Y', exact: true })
      .and(page.locator('[data-lit="true"]'))
      .waitFor()
    await shot('overlay-right-y')
    await set(centre, [])
    await panel
      .getByRole('button', { name: 'Panel RIGHT', exact: true })
      .and(page.locator('[data-lit="false"]'))
      .waitFor()
    await page.keyboard.press('F3')
  })
  await step('stick down and A open MAKE A GAME; Y talks; A builds', async () => {
    await flick(DOWN) // PLAY -> MAKE A GAME
    await tap(A)
    await heading('DESCRIBE YOUR GAME').waitFor()
    await set(centre, [Y])
    await heading('LISTENING').waitFor()
    await page.waitForTimeout(300)
    await set(centre, [])
    await heading('YOU SAID').waitFor()
    await tap(A)
    await heading('READY!').waitFor()
  })
  await step('B is back, A plays, the stick and A reach the game', async () => {
    await tap(B)
    await page.getByRole('button', { name: /RESUME GAME/ }).waitFor()
    await flick(DOWN)
    await flick(DOWN)
    await tap(A) // RESUME -> READY
    await heading('READY!').waitFor()
    await tap(A)
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
    await runtime().waitForFunction(() => window.__runtime.gameFrame > 5)
    await set(RIGHT, [])
    await runtime().waitForFunction(() => window.__runtime.input.btn('right', 0))
    await set(centre, [])
    await runtime().waitForFunction(() => !window.__runtime.input.btn('right', 0))
    const before = await runtime().evaluate(() => window.__runtime.scores[0])
    await tap(A)
    await runtime().waitForFunction((n) => window.__runtime.scores[0] > n, before)
    await shot('playing')
  })
  await step('X is START: pause to the menu', async () => {
    await tap(X)
    await page.getByRole('button', { name: /RESUME GAME/ }).waitFor()
  })
  assert.deepEqual(errors, [])
  results.passed = true
  writeFileSync(resolve(output, 'results.json'), `${JSON.stringify(results, null, 2)}\n`)
  console.log("PASS gamepad: the board's pad shape drives the overlay, the menus and a game")
} finally {
  await browser.close()
}
