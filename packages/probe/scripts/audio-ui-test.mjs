// Offline cabinet audio regression: real Web Audio, normal browser autoplay policy.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const base = process.env.BASE ?? 'http://localhost:3000'
const output = resolve(import.meta.dirname, '../../../bench/audits/audio-ui')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chromium', ignoreDefaultArgs: ['--mute-audio'] })
let forbidden = 0
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } })
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/badges')
      return route.fulfill({
        contentType: 'text/event-stream',
        body: 'data: {"type":"roster","badges":[]}\n\n',
      })
    if (url.pathname.startsWith('/api/badges/')) return route.fulfill({ json: {} })
    if (url.pathname === '/api/generate' || url.pathname === '/api/stt') {
      forbidden++
      return route.abort()
    }
    if (url.pathname === '/api/scores' && route.request().method() === 'POST')
      return route.fulfill({ json: {} })
    if (url.protocol.startsWith('http') && url.origin !== new URL(base).origin) return route.abort()
    return route.fallback()
  })
  // Tap the real master output with an analyser; do not replace AudioContext,
  // resume it from test code, or use a permissive autoplay-policy launch flag.
  await page.addInitScript(() => {
    window.audioAudit = { starts: 0, peak: 0 }
    const start = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (...args) {
      window.audioAudit.starts++
      return start.apply(this, args)
    }
  })
  await page.goto(base)
  await page.locator('.home-current .home-preview[data-ready="true"]').waitFor()
  const runtime = page.frames().find((f) => f.url().includes('/runtime/index.html'))
  await runtime.waitForFunction(() => Boolean(window.__runtime))
  const inspect = () =>
    runtime.evaluate(() => {
      const s = window.__runtime.synth
      return {
        muted: s.muted,
        state: s.ctx?.state ?? null,
        gain: s.master?.gain.value ?? null,
        starts: window.audioAudit.starts,
        peak: window.audioAudit.peak,
      }
    })
  assert.equal((await inspect()).muted, true, 'home is muted')
  const demos = (await (await page.request.get(`${base}/api/demos`)).json()).games
  const shooter = demos.find((game) => game.id.includes('formation-shooter'))
  assert.ok(shooter, 'a real local shooter is available')
  while (
    (await page
      .locator('.home-current .home-preview[data-ready="true"]')
      .getAttribute('data-game-id')) !== shooter.id
  ) {
    await page.getByRole('button', { name: 'Next game' }).click()
    await page.locator('.home-current .home-preview[data-ready="true"]').waitFor()
  }
  const play = page.getByRole('button', { name: /^> PLAY$/ })
  await play.click()
  await page.getByRole('heading', { name: 'READY!', exact: true }).waitFor()
  assert.equal((await inspect()).muted, true, 'ready is muted')
  await play.click()
  await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
  await page.keyboard.press('KeyZ')
  await runtime.waitForFunction(() => window.__runtime.synth.ctx)
  await runtime.evaluate(() => {
    const s = window.__runtime.synth
    const analyser = s.ctx.createAnalyser()
    analyser.fftSize = 2048
    s.master.connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    const sample = () => {
      analyser.getFloatTimeDomainData(samples)
      window.audioAudit.peak = Math.max(window.audioAudit.peak, ...samples.map(Math.abs))
    }
    // Results hide the game iframe, which stops its animation frames while
    // Web Audio tails continue. Sample independently of visual rendering.
    setInterval(sample, 10)
    sample()
  })
  await page.keyboard.down('KeyZ')
  await page.waitForTimeout(1200)
  await page.keyboard.up('KeyZ')
  const playing = await inspect()
  console.log(JSON.stringify({ playing }))
  assert.equal(playing.muted, false)
  assert.equal(playing.state, 'running', 'shell input unlocks real audio in the sandbox')
  assert.ok(playing.starts > 0, 'game schedules real oscillator nodes')
  assert.ok(playing.peak > 0.001, 'master output contains an audible waveform')
  await page.screenshot({ path: resolve(output, 'gameplay.png') })
  await page.keyboard.press('Enter')
  await page.getByRole('region', { name: 'Choose a game', exact: true }).waitFor()
  await runtime.waitForFunction(() => window.__runtime.synth.muted)
  assert.equal((await inspect()).gain, 0, 'pause silences existing tails')
  await page.getByRole('button', { name: /OPTIONS/ }).click()
  await page.getByRole('button', { name: /SOUND ON/ }).click()
  await page.getByRole('button', { name: /BACK/ }).click()
  await page.getByRole('button', { name: 'RESUME GAME', exact: true }).click()
  await page.keyboard.press('KeyZ')
  assert.equal((await inspect()).muted, true, 'explicit mute survives resume')
  assert.equal((await inspect()).gain, 0)
  await page.waitForTimeout(150)
  await runtime.evaluate(() => {
    window.audioAudit.peak = 0
  })
  await page.keyboard.press('KeyZ')
  await page.waitForTimeout(250)
  assert.equal((await inspect()).peak, 0, 'muted master output has no waveform')

  // Use a deterministic local game to reach the real shell results transition.
  // Its terminal cue is authored explicitly, not injected through the synth.
  await page.keyboard.press('Enter')
  await page.getByRole('region', { name: 'Choose a game', exact: true }).waitFor()
  await page.getByRole('button', { name: /OPTIONS/ }).click()
  await page.getByRole('button', { name: /SOUND OFF/ }).click()
  await page.getByRole('button', { name: /BACK/ }).click()
  await page.route(`**/api/demos/${shooter.id}?*`, async (route) => {
    const response = await route.fetch()
    const demo = await response.json()
    demo.code = `function init() {}\nfunction update(api) { if (api.btnp('a')) { api.sfx('die'); api.gameOver(); } }\nfunction draw(api) { api.cls(1); api.text('TERMINAL SOUND TEST', 32, 100, 7); }`
    await route.fulfill({ json: demo })
  })
  await play.click()
  await page.getByRole('heading', { name: 'READY!', exact: true }).waitFor()
  await play.click()
  await page.getByRole('region', { name: 'Game controls', exact: true }).waitFor()
  await page.keyboard.down('KeyZ')
  await runtime.waitForFunction(() => window.__runtime.state === 'gameover')
  await page.keyboard.up('KeyZ')
  await page.waitForTimeout(100)
  await runtime.evaluate(() => {
    window.audioAudit.peak = 0
  })
  await page.waitForTimeout(100)
  const terminal = await inspect()
  assert.equal(terminal.muted, false, 'results preserve the terminal gameplay cue')
  assert.ok(terminal.peak > 0.001, 'terminal waveform continues after the results transition')
  assert.equal(forbidden, 0)
  writeFileSync(
    resolve(output, 'results.json'),
    JSON.stringify(
      {
        passed: true,
        playing,
        terminal,
        forbidden,
        policy: 'Chromium default; no autoplay bypass; real analyser output',
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
