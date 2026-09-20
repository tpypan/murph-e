// Exercise the actual cabinet, saved fighter demo and physical keyboard path.
// Observer hooks record rendered labels/input delivery; no game state is changed.
// No generation, speech, badge writes, score writes or external traffic reaches a server.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
const output = resolve(root, 'bench/audits/fighter-selection-ui')
mkdirSync(output, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:3000'
const origin = new URL(base).origin
const blocked = { generation: 0, speech: 0, badgeWrites: 0, scoreWrites: 0, external: 0 }
const errors = [],
  checks = [],
  screenshots = [],
  visualLimitations = []
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } })
  await page.route('**/*', (route) => {
    const request = route.request(),
      url = new URL(request.url())
    if (url.protocol.startsWith('http') && url.origin !== origin) {
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
    if (url.pathname.startsWith('/api/badges/')) {
      blocked.badgeWrites++
      return route.fulfill({ json: {} })
    }
    if (url.pathname === '/api/scores' && request.method() !== 'GET') {
      blocked.scoreWrites++
      return route.fulfill({ json: {} })
    }
    return route.fallback()
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    if (window !== window.top) return
    window.fighterMicCalls = 0
    navigator.mediaDevices.getUserMedia = async () => {
      window.fighterMicCalls++
      throw Error('Microphone is disabled during offline UI verification')
    }
  })
  const home = page.getByRole('region', { name: 'Choose a game', exact: true })
  const controls = page.getByRole('region', { name: 'Game controls', exact: true })
  const play = () => page.getByRole('button', { name: /^> PLAY$/ })
  const preview = page.locator('.home-current .home-preview[data-game-id]')
  const runtime = () => page.frames().find((frame) => frame.url().includes('/runtime/index.html'))
  await page.goto(base)
  await home.waitFor()
  const games = await page.evaluate(async () => (await (await fetch('/api/demos')).json()).games)
  assert.ok(
    games.some((game) => game.id === 'fighter'),
    'the verified fighter is available on actual home',
  )
  for (let i = 0; i < games.length; i++) {
    await preview.waitFor()
    if ((await preview.getAttribute('data-game-id')) === 'fighter') break
    await page.getByRole('button', { name: 'Next game', exact: true }).click()
  }
  assert.equal(await preview.getAttribute('data-game-id'), 'fighter')
  await page.getByRole('button', { name: '2 PLAYERS', exact: true }).click()
  await play().click()
  await page.getByRole('heading', { name: 'READY!', exact: true }).waitFor()
  const frame = runtime()
  assert.ok(frame)
  await frame.waitForFunction(
    () => window.__runtime?.players === 2 && window.__runtime.gameFrame === 0,
  )
  checks.push({ name: 'home -> 2P -> Play -> Ready', players: 2, gameFrame: 0 })

  // Wrap only draw/input observation, after the untouched saved demo was loaded.
  // The picker state is inferred from what the real canvas draws, not patched.
  await frame.evaluate(() => {
    const rt = window.__runtime
    const observed = { texts: [], inputs: [], draws: 0 }
    window.fighterUI = observed
    const text = rt.api.text,
      center = rt.api.textCenter,
      draw = rt.game.draw,
      input = rt.setInput
    rt.api.text = (...args) => {
      observed.texts.push({ text: String(args[0]), x: args[1], y: args[2], color: args[3] })
      return text(...args)
    }
    rt.api.textCenter = (...args) => {
      observed.texts.push({ text: String(args[0]), x: 128, y: args[1], color: args[2] })
      return center(...args)
    }
    rt.game.draw = (api) => {
      observed.texts = []
      draw(api)
      observed.draws++
    }
    rt.setInput = function (player, button, down) {
      observed.inputs.push({ player, button, down })
      return input.call(this, player, button, down)
    }
  })
  await play().click()
  await controls.waitFor()
  await page.locator('.arcade-screen').focus()
  const waitTitle = (title) =>
    frame.waitForFunction(
      (title) => window.fighterUI.texts.some((row) => row.text === title),
      title,
    )
  const state = () =>
    frame.evaluate(() => {
      const data = window.fighterUI
      const row = (y) =>
        data.texts
          .filter((item) => item.y === y)
          .sort((a, b) => a.x - b.x)
          .map((item) => item.text)
      return {
        names: row(128),
        locks: row(139),
        selecting: data.texts.some((item) => item.text === 'SELECT YOUR FIGHTER'),
        versus: data.texts.some((item) => item.text === 'VERSUS'),
        round: data.texts.find((item) => /^ROUND \d+$/.test(item.text))?.text ?? null,
        gameFrame: window.__runtime.gameFrame,
      }
    })
  const tap = async (code) => {
    await page.keyboard.down(code)
    await page.waitForTimeout(70)
    await page.keyboard.up(code)
    await page.waitForTimeout(45)
  }
  const assertInGame = async () => {
    assert.equal(await home.count(), 0, 'B must stay inside the game, not return to home')
    assert.equal(await controls.count(), 1)
    assert.equal(await frame.evaluate(() => window.__runtime.paused), false)
  }
  const shot = async (name, width) => {
    const path = resolve(output, `${name}-${width}.png`)
    await page.screenshot({ path })
    screenshots.push({
      path,
      sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
    })
  }
  await waitTitle('SELECT YOUR FIGHTER')
  assert.deepEqual((await state()).names, ['BATMAN', 'FLASH'])
  assert.deepEqual((await state()).locks, ['CHOOSE', 'CHOOSE'])
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: width * 0.75 })
    await frame.waitForFunction(() => {
      const box = document.querySelector('canvas').getBoundingClientRect()
      return box.width <= innerWidth + 1 && box.height <= innerHeight + 1 && box.top >= -1
    })
    const bounds = await page.locator('.game-frame').boundingBox()
    const canvas = await frame.locator('canvas').boundingBox()
    assert.ok(bounds && bounds.width > 0 && bounds.height > 0)
    assert.ok(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= width + 1 &&
        bounds.y + bounds.height <= width * 0.75 + 1,
    )
    await shot('selection', width)
    assert.ok(canvas)
    const nativeScale = Math.min(canvas.width / 256, canvas.height / 224)
    if (nativeScale < 1)
      visualLimitations.push({
        width,
        nativeScale,
        note: 'The shell fits the game but reduces it below native resolution. Fine selector lettering loses pixel strokes; this is not a legibility pass.',
      })
    checks.push({
      name: 'selection fits cabinet viewport',
      width,
      height: width * 0.75,
      bounds,
      canvas,
      nativeScale,
    })
  }
  await page.setViewportSize({ width: 640, height: 480 })
  await page.locator('.arcade-screen').focus()
  await tap('ArrowRight')
  assert.deepEqual((await state()).names, ['FLASH', 'FLASH'])
  await tap('KeyJ')
  assert.deepEqual((await state()).names, ['FLASH', 'BATMAN'])
  await tap('KeyZ')
  assert.deepEqual((await state()).locks, ['READY', 'CHOOSE'])
  await tap('ArrowLeft')
  assert.deepEqual((await state()).names, ['FLASH', 'BATMAN'], 'P1 locked cursor cannot move')
  await tap('KeyL')
  assert.deepEqual((await state()).names, ['FLASH', 'FLASH'], 'P2 can move while P1 is locked')
  await tap('KeyJ')
  await page.waitForTimeout(300)
  assert.deepEqual((await state()).locks, ['READY', 'CHOOSE'], 'P1 never confirms P2')
  await shot('p1-locked-p2-choosing', 640)
  checks.push({ name: 'independent cursor and P1 lock', ...(await state()) })
  await tap('KeyX')
  await assertInGame()
  assert.deepEqual((await state()).locks, ['CHOOSE', 'CHOOSE'], 'X unlocks only P1')
  await tap('KeyZ')
  await tap('KeyN')
  await waitTitle('VERSUS')
  await tap('KeyM')
  await assertInGame()
  await waitTitle('SELECT YOUR FIGHTER')
  assert.deepEqual(
    (await state()).locks,
    ['READY', 'CHOOSE'],
    'M unlocks P2 during versus without clearing P1',
  )
  checks.push({ name: 'X and M unlock within game', ...(await state()) })
  await page.keyboard.down('KeyN')
  await waitTitle('VERSUS')
  await shot('versus', 640)
  await waitTitle('ROUND 1')
  await page.waitForTimeout(1500)
  await page.keyboard.up('KeyN')
  await assertInGame()
  const after = await state()
  assert.equal(after.selecting, false)
  assert.equal(after.versus, false)
  assert.equal(after.round, null)
  await shot('fight', 640)
  // All development directions/actions cross the actual shell -> runtime input
  // channel, including P2 up/down and both B keys during active combat.
  for (const key of ['ArrowUp', 'ArrowDown', 'KeyI', 'KeyK', 'KeyX', 'KeyM']) await tap(key)
  await assertInGame()
  const inputs = await frame.evaluate(() => window.fighterUI.inputs)
  for (const [player, buttons] of [
    [0, ['up', 'down', 'left', 'right', 'a', 'b']],
    [1, ['up', 'down', 'left', 'right', 'a', 'b']],
  ])
    for (const button of buttons) {
      assert.ok(
        inputs.some((event) => event.player === player && event.button === button && event.down),
        `${player}/${button} down arrived`,
      )
      assert.ok(
        inputs.some((event) => event.player === player && event.button === button && !event.down),
        `${player}/${button} up arrived`,
      )
    }
  checks.push({
    name: 'both confirmations reach fight via physical mappings',
    ...after,
    deliveredControls: inputs,
  })
  assert.equal(await page.evaluate(() => window.fighterMicCalls), 0)
  assert.equal(blocked.generation, 0)
  assert.equal(blocked.speech, 0)
  assert.deepEqual(errors, [])
  writeFileSync(
    resolve(output, 'results.json'),
    JSON.stringify(
      {
        passed: true,
        base,
        checks,
        blocked,
        micCalls: 0,
        errors,
        screenshots,
        visualLimitations,
      },
      null,
      2,
    ),
  )
  rmSync(resolve(output, 'failure.json'), { force: true })
  console.log(
    JSON.stringify(
      {
        passed: true,
        checks: checks.map((check) => check.name),
        blocked,
        visualLimitations,
        screenshots: screenshots.map((shot) => shot.path),
      },
      null,
      2,
    ),
  )
} catch (error) {
  writeFileSync(
    resolve(output, 'failure.json'),
    JSON.stringify({ passed: false, error: String(error), errors, blocked, checks }, null, 2),
  )
  throw error
} finally {
  await browser.close()
}
