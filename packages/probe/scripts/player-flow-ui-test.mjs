// Isolated cabinet regression: real microphone lifecycle and runtime, with local
// transcription/build fixtures. Never touches the user's open browser or the model API.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(root, 'bench/audits/player-flow')
mkdirSync(output, { recursive: true })
const code = `let x = 64;
function init(api) { x = 64; }
function update(api) { if (api.btn('left')) x--; if (api.btn('right')) x++; }
function draw(api) { api.cls(1); api.rectfill(x, 140, 16, 20, 10); api.rectfill(0, 160, 256, 64, 3); }
`
const forbiddenHints = /\bSTICK\b|START:\s*OK|B:\s*(?:BACK|CANCEL|MENU)/i
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const results = []

try {
  for (const players of [1, 2]) {
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
    // Two badges that already said hello make the 2P version the one shown.
    const roster =
      players === 2
        ? [
            {
              path: 'fake-a',
              slot: 0,
              identity: { badgeId: 'one', name: 'One', color: [1, 2, 3] },
            },
            {
              path: 'fake-b',
              slot: 1,
              identity: { badgeId: 'two', name: 'Two', color: [4, 5, 6] },
            },
          ]
        : []
    await page.route('**/api/badges', (route) =>
      route.fulfill({
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({ type: 'roster', badges: roster })}\n\n`,
      }),
    )
    const errors = []
    const builds = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(() => {
      if (window !== window.top) return
      window.playerFlowTest = { calls: 0, streams: [] }
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        window.playerFlowTest.calls++
        const stream = await original(constraints)
        window.playerFlowTest.streams.push(stream)
        return stream
      }
    })
    await page.route('**/api/stt', (route) =>
      route.fulfill({ json: { text: 'A penguin collecting fish and dodging seals' } }),
    )
    await page.route('**/api/generate', async (route) => {
      const request = route.request().postDataJSON()
      builds.push(request)
      const spec = {
        title: 'PLAYER FLOW TEST',
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
                title: 'PLAYER FLOW TEST',
                code: code,
                note: '',
                source: 'build',
                slug: players === 2 ? 'player-flow-test-2p' : 'player-flow-test',
                spec: { ...spec, players },
                runId: `player-flow-test-${players}p`,
                totalMs: 1,
              })}\n\n`,
          )
          .join(''),
      })
    })
    const shot = (name) => page.screenshot({ path: resolve(output, `${players}p-${name}.png`) })
    const assertHintsRemoved = async () => {
      assert.doesNotMatch(await page.locator('.arcade-screen').innerText(), forbiddenHints)
    }
    const assertMicOff = async () => {
      assert.ok(
        await page.evaluate(() =>
          window.playerFlowTest.streams.every((stream) =>
            stream.getTracks().every((track) => track.readyState === 'ended'),
          ),
        ),
        'all microphone tracks must be stopped',
      )
    }
    const choose = async (count) => {
      await page
        .getByRole('button', { name: count === 1 ? '1 PLAYER' : '2 PLAYERS', exact: true })
        .click()
      assert.equal(await page.locator('.voice-stage').count(), 0, 'player selection stays on home')
      await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
      await page.getByRole('heading', { name: 'DESCRIBE YOUR GAME', exact: true }).waitFor()
      await assertHintsRemoved()
    }
    const runtime = () => page.frames().find((frame) => frame.url().includes('/runtime/index.html'))

    await page.goto(process.env.BASE ?? 'http://localhost:3000')
    await page.getByRole('button', { name: '1 PLAYER', exact: true }).waitFor()
    await page.getByRole('button', { name: '2 PLAYERS', exact: true }).waitFor()
    await assertHintsRemoved()
    // Off the cabinet the strip names the keyboard, never the panel.
    assert.match(await page.locator('.controls-strip').innerText(), /ARROWS: CHOOSE · Z: SELECT/)
    assert.equal(await page.getByRole('button', { name: /HOLD.*TALK/ }).count(), 0)
    await page.keyboard.press('Space')
    await page.keyboard.press('KeyV')
    await page.waitForTimeout(100)
    assert.equal(
      await page.evaluate(() => window.playerFlowTest.calls),
      0,
      'no mic before player choice',
    )
    assert.equal(builds.length, 0)
    for (const width of [640, 320]) {
      await page.setViewportSize({ width, height: width * 0.75 })
      for (const count of [1, 2]) {
        const bounds = await page
          .getByRole('button', { name: count === 1 ? '1 PLAYER' : '2 PLAYERS', exact: true })
          .boundingBox()
        assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0)
        assert.ok(bounds.x + bounds.width <= width && bounds.y + bounds.height <= width * 0.75)
      }
      await shot(`choose-${width}`)
    }
    await page.setViewportSize({ width: 640, height: 480 })

    // Cancelling a choice is reversible and the eventual choice controls the request.
    await choose(players === 1 ? 2 : 1)
    await page.getByRole('button', { name: 'CANCEL', exact: true }).click()
    await choose(players)
    assert.equal(
      await page.evaluate(() => window.playerFlowTest.calls),
      0,
      'selection itself never opens the mic',
    )
    assert.equal(await page.locator('input, textarea, [contenteditable=true]').count(), 0)
    await shot('describe-640')
    await page.setViewportSize({ width: 320, height: 240 })
    await shot('describe-320')
    await page.setViewportSize({ width: 640, height: 480 })
    const talk = page.getByRole('button', { name: /HOLD TO TALK/ })
    const bounds = await talk.boundingBox()
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.getByRole('heading', { name: 'LISTENING', exact: true }).waitFor()
    await page.waitForTimeout(400)
    await shot('recording')
    await page.mouse.up()
    await page.getByRole('heading', { name: 'YOU SAID', exact: true }).waitFor()
    await assertMicOff()
    await assertHintsRemoved()
    assert.equal(builds.length, 0, 'voice release must wait for explicit generation confirmation')
    await shot('review')
    await page.getByRole('button', { name: /MAKE GAME/ }).click()
    await page.getByRole('heading', { name: 'READY!', exact: true }).waitFor()
    assert.equal(builds.length, 1)
    assert.equal(builds[0].players, undefined, 'nobody is asked how many players')
    assert.match(builds[0].transcript, /penguin/)
    await assertHintsRemoved()
    await page.waitForFunction(() => {
      const frame = document.querySelector('.game-frame')
      return Boolean(frame)
    })
    await runtime().waitForFunction(() => Boolean(window.__runtime))
    assert.equal(
      await runtime().evaluate(() => window.__runtime.gameFrame),
      0,
      'ready must not autoplay',
    )
    assert.equal(await runtime().evaluate(() => window.__runtime.players), players)
    // Both versions exist; the badges decide which one opens, up/down switches.
    const versionLine = () => page.locator('.version-line').innerText()
    assert.match(await versionLine(), players === 2 ? /2 PLAYERS · BADGES/ : /1 PLAYER · CABINET/)
    assert.match(await versionLine(), players === 2 ? /1 PLAYER VERSION/ : /2 PLAYER VERSION/)
    await shot('ready')
    await page.keyboard.press('ArrowDown')
    await page.waitForFunction(
      (want) => document.querySelector('.version-line')?.textContent?.includes(want),
      players === 2 ? '1 PLAYER · CABINET' : '2 PLAYERS · BADGES',
    )
    await runtime().waitForFunction(
      (want) => window.__runtime.players === want,
      players === 2 ? 1 : 2,
    )
    await page.keyboard.press('ArrowUp')
    await page.waitForFunction(
      (want) => document.querySelector('.version-line')?.textContent?.includes(want),
      players === 2 ? '2 PLAYERS · BADGES' : '1 PLAYER · CABINET',
    )
    await runtime().waitForFunction((want) => window.__runtime.players === want, players)
    assert.equal(builds.length, 1, 'switching versions never regenerates')

    if (players === 1) {
      await page.getByRole('button', { name: /^(?:>\s*)?PLAY$/ }).click()
      await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
      await runtime().waitForFunction(() => window.__runtime.gameFrame > 5)
      assert.match(await page.locator('.game-control-legend').innerText(), /JUMP/)
      await assertHintsRemoved()
      await shot('playing-controls')
      await page.keyboard.press('Enter')
      await page.getByRole('button', { name: /RESUME GAME/ }).waitFor()
      await choose(2)
      await page.getByRole('button', { name: 'CANCEL', exact: true }).click()
      await page.getByRole('button', { name: /RESUME GAME/ }).click()
      await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
      assert.equal(
        await runtime().evaluate(() => window.__runtime.players),
        1,
        'resuming retains the existing game player count',
      )
      assert.equal(await page.locator('.game-control-p2').count(), 0)
      assert.equal(builds.length, 1, 'cancelled second choice does not regenerate')
    }
    await assertMicOff()
    assert.deepEqual(errors, [])
    results.push({ players, passed: true, request: builds[0], pageErrors: errors })
    await context.close()
  }
  writeFileSync(resolve(output, 'results.json'), JSON.stringify({ passed: true, results }, null, 2))
  console.log(
    'PASS player choice, microphone gating, cancellation, 1P/2P payloads, no autoplay, controls and resume',
  )
} finally {
  await browser.close()
}
