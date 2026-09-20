// Isolated cabinet regression for who plays: a one-player game is played on
// the cabinet controls and a two-player game on the two badges, with every
// device still working the shell screens. Drives the cabinet through the
// encoder's placeholder codes and two fake badges on the real hub
// (/api/badges/fake), with local transcription/build fixtures. Never touches
// the model API. Needs `pnpm dev` running with HTN_BADGES=off (or no real
// badge held by another process); it only plugs and unplugs the two fake
// presets, which no real badge shares.
// Run: pnpm --filter @htn/probe exec node scripts/input-routing-ui-test.mjs
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(root, 'bench/audits/input-routing')
mkdirSync(output, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:3000'
// Both players move with left/right and score with A, so any source can be
// told apart by which player index changed.
const code = `const x = [64, 160];
function init(api) { x[0] = 64; x[1] = 160; }
function update(api) {
  for (let p = 0; p < api.players; p++) {
    if (api.btn('left', p)) x[p]--; if (api.btn('right', p)) x[p]++;
    if (api.btnp('a', p)) api.addScore(1, p);
  }
}
function draw(api) { api.cls(1); api.rectfill(x[0], 140, 16, 20, api.P1); if (api.players > 1) api.rectfill(x[1], 140, 16, 20, api.P2); api.rectfill(0, 160, 256, 64, 3); }
`
const KEY = {
  down: 'Numpad2',
  up: 'Numpad8',
  right: 'Numpad6',
  a: 'Numpad1',
  b: 'Numpad3',
  x: 'Numpad7',
  y: 'Numpad9',
}
const BADGE = ['FA:KE:00:00:00:01', 'FA:KE:00:00:00:02']
const forbiddenHints = /\bSTICK\b|START:\s*OK|B:\s*(?:BACK|CANCEL|MENU)/i
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const results = { passed: false, steps: [] }
const api = async (body) => {
  const r = await fetch(`${base}/api/badges/fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  assert.ok(r.ok, `fake badge api ${JSON.stringify(body)}: ${r.status}`)
  return r.json()
}
const plugged = async () => (await (await fetch(`${base}/api/badges/fake`)).json()).badges
const unplugAll = async () => {
  for (const b of await plugged()) await api({ op: 'unplug', serial: b.serial })
}
// A plugged preset gets the app pushed (several seconds of paced chunks) and
// only then says its real hello; wait for that, not for a name on screen,
// which a kept session may still be showing from before an unplug.
const APP_VERSION = /^version=(\S+)/m.exec(
  readFileSync(resolve(root, 'packages/badge/app/manifest.cfg'), 'utf8'),
)[1]
const plug = async (n) => {
  const { plugged: on } = await api({ op: 'toggle', n })
  assert.ok(on, `badge ${n} plugged`)
  for (let i = 0; i < 300; i++) {
    const b = (await plugged()).find((x) => x.serial === BADGE[n - 1])
    if (b?.inApp && b.installedVersion === APP_VERSION) return
    await new Promise((f) => setTimeout(f, 100))
  }
  assert.fail(`badge ${n} never opened the installed app`)
}
const badge = (n, button, down) => api({ op: 'press', serial: BADGE[n - 1], button, down })
const tapBadge = (n, button) => api({ op: 'tap', serial: BADGE[n - 1], button })

try {
  await unplugAll()
  const context = await browser.newContext({
    permissions: ['microphone'],
    viewport: { width: 640, height: 480 },
  })
  const page = await context.newPage()
  const counts = { generate: 0, stt: 0 }
  const scores = []
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    return url.protocol.startsWith('http') && url.origin !== new URL(base).origin
      ? route.abort()
      : route.fallback()
  })
  await page.route('**/api/stt', (route) => {
    counts.stt++
    return route.fulfill({ json: { text: 'A penguin collecting fish and dodging seals' } })
  })
  await page.route('**/api/scores', (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    scores.push(route.request().postDataJSON())
    return route.fulfill({ json: { ok: true } })
  })
  await page.route('**/api/generate', async (route) => {
    counts.generate++
    const request = route.request().postDataJSON()
    assert.equal(request.players, undefined, 'nobody is asked how many players')
    const spec = {
      title: 'ROUTING TEST',
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
              title: 'ROUTING TEST',
              code: code,
              note: '',
              source: 'build',
              slug: players === 2 ? 'routing-test-2p' : 'routing-test',
              spec: { ...spec, players },
              runId: `routing-test-${players}p`,
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
  const rt = (fn, arg) => runtime().evaluate(fn, arg)
  const held = (button, player) =>
    rt(([b, p]) => window.__runtime.input.btn(b, p), [button, player])
  const score = (player) => rt((p) => window.__runtime.scores[p] ?? 0, player)
  const settle = () => page.waitForTimeout(250)
  const home = async () => {
    await page.getByRole('button', { name: '1 PLAYER', exact: true }).waitFor()
    await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).waitFor()
  }
  const roster = () => page.locator('.arcade-header .player-label').allInnerTexts()
  const versionLine = () => page.locator('.version-line').innerText()
  const waitVersion = (want) =>
    page.waitForFunction(
      (w) => document.querySelector('.version-line')?.textContent?.includes(w),
      want,
    )
  // Home opens on PLAY; MAKE A GAME is one row down. Nobody is asked how many
  // players: both versions are built and the badges decide which one opens.
  const makeGame = async (players) => {
    await home()
    await press(KEY.down)
    await press(KEY.a)
    await heading('DESCRIBE YOUR GAME').waitFor()
    await page.keyboard.down(KEY.y)
    await heading('LISTENING').waitFor()
    await page.waitForTimeout(300)
    await page.keyboard.up(KEY.y)
    await heading('YOU SAID').waitFor()
    await press(KEY.a)
    await heading('READY!').waitFor()
    await runtime().waitForFunction(() => Boolean(window.__runtime))
    await waitVersion(players === 2 ? '2 PLAYERS · BADGES' : '1 PLAYER · CABINET')
    assert.equal(await rt(() => window.__runtime.players), players)
  }
  const play = async () => {
    await press(KEY.a)
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
    await runtime().waitForFunction(() => window.__runtime.gameFrame > 5)
  }
  // The header shows a label per slot (GUEST when empty), so wait for names.
  const waitBadges = async (...names) => {
    await page.waitForFunction(
      (want) =>
        want.every((name) =>
          [...document.querySelectorAll('.arcade-header .player-label')].some(
            (el) => el.textContent?.trim() === name,
          ),
        ),
      names,
    )
  }

  await page.goto(`${base}/?cabinet=1`)

  // ---- one player: the cabinet controls play, the badge only names the score
  await step('1P: build a game on the panel', () => makeGame(1))
  await step('1P: a plugged-in badge names player one', async () => {
    await plug(1)
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.arcade-header .player-label')].some(
        (el) => el.textContent?.trim() === 'Tony Pan',
      ),
    )
    assert.match(await screen.innerText(), /PLAY ON THE CABINET CONTROLS/)
    await shot('1p-ready-with-badge')
  })
  await step('1P: the panel moves and scores', async () => {
    await play()
    await page.keyboard.down(KEY.right)
    await runtime().waitForFunction(() => window.__runtime.input.btn('right', 0))
    await page.keyboard.up(KEY.right)
    await runtime().waitForFunction(() => !window.__runtime.input.btn('right', 0))
    const before = await score(0)
    await press(KEY.a)
    await runtime().waitForFunction((n) => window.__runtime.scores[0] > n, before)
  })
  await step('1P: the badge does not reach the game', async () => {
    await badge(1, 'right', true)
    await settle()
    assert.equal(await held('right', 0), false, 'badge d-pad ignored in 1P')
    await badge(1, 'right', false)
    const before = await score(0)
    await tapBadge(1, 'a')
    await settle()
    assert.equal(await score(0), before, 'badge A ignored in 1P')
    await tapBadge(1, 'start')
    await settle()
    assert.equal(await page.locator('.game-controls').count(), 1, 'badge START does not pause 1P')
    await shot('1p-playing')
  })
  await step('1P: the score is saved under the badge name', async () => {
    await page.keyboard.press('F9')
    await heading('GAME OVER').waitFor()
    await page.waitForFunction(() => true)
    for (let i = 0; i < 20 && scores.length === 0; i++) await page.waitForTimeout(100)
    assert.equal(scores.length, 1)
    assert.equal(scores[0].name, 'Tony Pan')
    assert.equal(scores[0].players, 1)
  })
  await step('1P: a badge works the menus', async () => {
    await tapBadge(1, 'b') // back to home from the game over card
    await home()
    await tapBadge(1, 'down') // PLAY -> MAKE A GAME
    await tapBadge(1, 'a')
    await heading('DESCRIBE YOUR GAME').waitFor()
    await tapBadge(1, 'b')
    await home()
    await api({ op: 'unplug', serial: BADGE[0] })
  })

  // ---- two players: the badges play, the panel only works the shell
  await step('both versions: READY follows the badges', async () => {
    await makeGame(1)
    assert.match(await versionLine(), /2 PLAYER VERSION/)
    await plug(1)
    await waitBadges('Tony Pan')
    assert.match(await versionLine(), /1 PLAYER · CABINET/, 'one badge is still a 1P game')
    await plug(2) // preset 2 gets the app pushed first: several seconds of paced chunks
    await waitVersion('2 PLAYERS · BADGES')
    await waitBadges('Tony Pan', 'Sam Rivera')
    await runtime().waitForFunction(() => window.__runtime.players === 2)
    await shot('2p-ready-two-badges')
    await api({ op: 'unplug', serial: BADGE[1] })
    await waitVersion('1 PLAYER · CABINET')
    assert.equal(await rt(() => window.__runtime.players), 1)
  })
  await step('2P: up/down picks the 2P version by hand; one badge is enough to start', async () => {
    await press(KEY.up)
    await waitVersion('2 PLAYERS · BADGES')
    assert.match(await screen.innerText(), /PLUG IN BOTH BADGES/)
    await shot('2p-ready-one-badge')
    await api({ op: 'unplug', serial: BADGE[0] })
    await page.waitForTimeout(300)
    assert.match(await versionLine(), /2 PLAYERS · BADGES/, 'a hand-picked version stays')
    await plug(1)
    await waitBadges('Tony Pan')
    await play()
    await badge(1, 'right', true)
    await runtime().waitForFunction(() => window.__runtime.input.btn('right', 0))
    await badge(1, 'right', false)
  })
  await step('2P: the panel does not reach the game', async () => {
    await page.keyboard.down(KEY.right)
    await settle()
    assert.equal(await held('right', 0), false, 'panel stick ignored in 2P')
    assert.equal(await held('right', 1), false)
    await page.keyboard.up(KEY.right)
    const before = await score(0)
    await press(KEY.a)
    await settle()
    assert.equal(await score(0), before, 'panel A ignored in 2P')
  })
  await step('2P: the panel START still pauses; RESUME continues', async () => {
    await press(KEY.x)
    await page.getByRole('button', { name: /RESUME GAME/ }).waitFor()
    await press(KEY.down)
    await press(KEY.down)
    await press(KEY.a)
    await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
  })
  await step('2P: the second badge is player two', async () => {
    await plug(2)
    await waitBadges('Tony Pan', 'Sam Rivera')
    assert.deepEqual(
      (await roster()).map((s) => s.toUpperCase()),
      ['TONY PAN', 'SAM RIVERA'],
    )
    await badge(2, 'right', true)
    await runtime().waitForFunction(() => window.__runtime.input.btn('right', 1))
    assert.equal(await held('right', 0), false, 'badge two never moves player one')
    await badge(2, 'right', false)
    const before = await score(1)
    await tapBadge(2, 'a')
    await runtime().waitForFunction((n) => window.__runtime.scores[1] > n, before)
    await shot('2p-playing-two-badges')
  })
  await step('2P: pulling a badge keeps the game and the name', async () => {
    await api({ op: 'unplug', serial: BADGE[1] })
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.arcade-header .player-label')].some((el) =>
        /UNPLUGGED|Sam Rivera/.test(el.textContent ?? ''),
      ),
    )
    assert.equal(await page.locator('.game-controls').count(), 1, 'still playing')
    await badge(1, 'right', true)
    await runtime().waitForFunction(() => window.__runtime.input.btn('right', 0))
    await badge(1, 'right', false)
  })
  await step('2P: both scores are posted, badge one named', async () => {
    scores.length = 0
    await page.keyboard.press('F9')
    await heading('GAME OVER').waitFor()
    for (let i = 0; i < 20 && scores.length < 2; i++) await page.waitForTimeout(100)
    assert.equal(scores.length, 2)
    assert.equal(scores[0].name, 'Tony Pan')
    assert.equal(scores[0].players, 2)
    await shot('2p-gameover')
    await tapBadge(1, 'b')
    await home()
  })

  // ---- off the cabinet the keyboard stands in for the badges in 2P
  await step('laptop 2P: arrows and I J K L stand in for the badges', async () => {
    await unplugAll()
    await page.goto(base)
    await makeGame(1)
    await press(KEY.down)
    await waitVersion('2 PLAYERS · BADGES')
    await play()
    await page.keyboard.down('ArrowRight')
    await runtime().waitForFunction(() => window.__runtime.input.btn('right', 0))
    await page.keyboard.up('ArrowRight')
    await page.keyboard.down('KeyL')
    await runtime().waitForFunction(() => window.__runtime.input.btn('right', 1))
    await page.keyboard.up('KeyL')
    await page.keyboard.press('Enter')
    await home()
  })

  assert.equal(counts.generate, 3)
  assert.deepEqual(errors, [])
  results.passed = true
  writeFileSync(resolve(output, 'results.json'), `${JSON.stringify(results, null, 2)}\n`)
  console.log('PASS routing: 1P on the cabinet controls, 2P on the badges, menus from either')
} finally {
  await unplugAll().catch(() => {})
  await browser.close()
}
