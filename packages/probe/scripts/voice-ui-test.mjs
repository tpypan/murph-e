// Local voice-flow regression: real browser audio/recording, synthetic microphone,
// mocked transcription and generation. No API key or external requests required.
// Run with pnpm dev running:
// pnpm --filter @htn/probe exec node scripts/voice-ui-test.mjs
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(new URL('../../..', import.meta.url).pathname)
const output = resolve(root, 'bench/screenshots/voice')
const temp = mkdtempSync(resolve(tmpdir(), 'htn-voice-'))
mkdirSync(output, { recursive: true })
const sampleRate = 24000
const count = sampleRate * 8
const wav = Buffer.alloc(44 + count * 2)
wav.write('RIFF', 0)
wav.writeUInt32LE(wav.length - 8, 4)
wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(sampleRate, 24)
wav.writeUInt32LE(sampleRate * 2, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(count * 2, 40)
for (let i = 0; i < count; i++) {
  const t = i / sampleRate
  const gain = t < 1 ? 0 : 0.2 + Math.sin(t * 7) * 0.15
  wav.writeInt16LE(Math.round(Math.sin(t * Math.PI * 440) * gain * 32767), 44 + i * 2)
}
const file = resolve(temp, 'voice.wav')
writeFileSync(file, wav)
const browser = await chromium.launch({
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${file}`,
  ],
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
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    if (window !== window.top) return
    window.voiceTest = { streams: [], contexts: [] }
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints)
      window.voiceTest.streams.push(stream)
      return stream
    }
    const Audio = window.AudioContext
    window.AudioContext = class extends Audio {
      constructor(...args) {
        super(...args)
        window.voiceTest.contexts.push(this)
      }
    }
  })
  await page.route('**/api/stt', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    await route.fulfill({ json: { text: 'A penguin collecting fish and dodging seals' } })
  })
  let builds = 0
  const generationRequests = []
  await page.route('**/api/generate', (route) => {
    builds++
    generationRequests.push(route.request().postDataJSON())
    return route.fulfill({
      contentType: 'text/event-stream',
      body: `data: ${JSON.stringify({ type: 'ready', title: 'VOICE TEST', code: readFileSync(resolve(root, 'library/templates/dodge.js'), 'utf8'), note: '', source: 'build', players: 1, slug: 'voice-test', spec: { oneLiner: 'CATCH PIES. DODGE ANVILS.', controls: { left: 'MOVE LEFT', right: 'MOVE RIGHT', a: 'JUMP' } }, runId: 'test', totalMs: 1 })}\n\n`,
    })
  })
  const shot = (name) => page.screenshot({ path: resolve(output, `${name}.png`) })
  const assertTalkIgnored = async (phase) => {
    const streams = await page.evaluate(() => window.voiceTest.streams.length)
    await page.locator('.arcade-screen').focus()
    await page.keyboard.down('KeyV')
    await page.waitForTimeout(150)
    await page.keyboard.up('KeyV')
    assert.equal(
      await page.evaluate(() => window.voiceTest.streams.length),
      streams,
      `${phase}: talk must not open the mic`,
    )
    assert.equal(
      await page.locator('.voice-stage').count(),
      0,
      `${phase}: talk must not open voice editing`,
    )
  }
  const assertNoShellHints = async () => {
    assert.doesNotMatch(
      await page.locator('.arcade-screen').innerText(),
      /STICK|START:\s*OK|B:\s*(BACK|CANCEL|MENU)/,
    )
  }
  await page.goto(process.env.BASE ?? 'http://localhost:3000')
  await page.getByRole('button', { name: '1 PLAYER', exact: true }).waitFor()
  await page.getByRole('button', { name: '2 PLAYERS', exact: true }).waitFor()
  assert.equal(await page.title(), 'Arcade')
  await page.getByRole('heading', { name: 'ARCADE', exact: true }).waitFor()
  await shot('00-menu-crt')
  await page.getByRole('region', { name: 'Choose a game', exact: true }).waitFor()
  assert.equal(
    await page.locator('.talk-button').count(),
    0,
    'choose players before talk is offered',
  )
  await assertTalkIgnored('player selection')
  await assertNoShellHints()
  await page.getByRole('button', { name: 'OPTIONS', exact: true }).click()
  await page.getByRole('heading', { name: 'OPTIONS' }).waitFor()
  assert.equal(
    await page.getByRole('button', { name: /PLAYER/ }).count(),
    0,
    'player count belongs on the first screen',
  )
  await shot('00-options-crt')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /SOUND ON/ }).waitFor()
  await page.keyboard.press('KeyX')
  await page.getByRole('button', { name: '2 PLAYERS', exact: true }).click()
  await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
  await page.getByRole('heading', { name: 'DESCRIBE YOUR GAME' }).waitFor()
  assert.equal(await page.locator('.player-number').count(), 2)
  assert.equal(
    await page.evaluate(() => window.voiceTest.streams.length),
    0,
    'choosing two players does not record',
  )
  await shot('01-ready-2p')
  await page.getByRole('button', { name: 'CANCEL', exact: true }).click()
  await page.getByRole('button', { name: '1 PLAYER', exact: true }).click()
  await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
  await page.getByRole('heading', { name: 'DESCRIBE YOUR GAME' }).waitFor()
  assert.equal(await page.evaluate(() => window.voiceTest.streams.length), 0)
  assert.equal(await page.locator('input, textarea, [contenteditable=true]').count(), 0)
  await shot('01-ready')
  const box = await page.locator('.arcade-screen').boundingBox()
  assert.ok(Math.abs(box.width / box.height - 4 / 3) < 0.001)
  await assertNoShellHints()
  const talk = page.getByRole('button', { name: '> HOLD TO TALK', exact: true })
  await talk.focus()
  await page.keyboard.down('Space')
  await page.getByRole('heading', { name: 'LISTENING' }).waitFor()
  // The fixture starts silent. Confirm actual audio makes the bars taller.
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.pixel-meter')
    const data = canvas.getContext('2d').getImageData(0, 0, 160, 14).data
    return data.some((value, i) => i % 4 === 3 && value > 150)
  })
  assert.doesNotMatch(await page.locator('.voice-stage').innerText(), /\d+\s*\/\s*30 SEC/)
  await shot('02-recording')
  await page.keyboard.up('Space')
  await page.getByRole('heading', { name: 'ONE MOMENT' }).waitFor()
  assert.ok(
    await page.evaluate(() =>
      window.voiceTest.streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended')),
    ),
  )
  await shot('03-finishing')
  await page.getByRole('heading', { name: 'YOU SAID' }).waitFor()
  assert.equal(builds, 0, 'release must not automatically generate a game')
  assert.match(await page.locator('.voice-transcript').innerText(), /penguin/i)
  assert.equal(await page.locator('input, textarea, [contenteditable=true]').count(), 0)
  await page.waitForFunction(() => window.voiceTest.contexts.every((c) => c.state === 'closed'))
  await shot('04-review')
  await page.getByRole('button', { name: 'HOLD TO RETRY', exact: true }).waitFor()
  await assertNoShellHints()
  await page.getByRole('button', { name: '> MAKE GAME', exact: true }).click()
  await page.getByRole('heading', { name: 'READY!' }).waitFor()
  assert.equal(builds, 1)
  assert.equal(generationRequests[0].players, 1)
  assert.match(generationRequests[0].transcript, /penguin/)
  await assertTalkIgnored('ready')
  await page.getByRole('heading', { name: 'READY!' }).waitFor()
  await assertNoShellHints()
  await shot('05-controls')
  const runtime = () => page.frames().find((f) => f.url().includes('/runtime/index.html'))
  assert.equal(
    await runtime().evaluate(() => window.__runtime.gameFrame),
    0,
    'ready must not autoplay',
  )
  await page.keyboard.press('Enter')
  await page.getByRole('region', { name: 'Game controls' }).waitFor()
  await runtime().waitForFunction(() => window.__runtime.gameFrame > 10)
  await page.getByRole('region', { name: 'Game controls' }).waitFor()
  assert.match(await page.locator('.game-control-legend').innerText(), /A \/ Z/)
  assert.match(await page.locator('.game-control-legend').innerText(), /JUMP/)
  for (const size of [
    { width: 640, height: 480 },
    { width: 320, height: 240 },
  ]) {
    await page.setViewportSize(size)
    await page.waitForFunction(() => {
      const game = document.querySelector('.game-frame').getBoundingClientRect()
      const legend = document.querySelector('.game-controls').getBoundingClientRect()
      return game.bottom < legend.top && legend.bottom <= innerHeight * 0.92 + 1
    })
    await shot(`06-playing-${size.width}`)
  }
  await page.setViewportSize({ width: 640, height: 480 })
  await shot('06-playing')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /RESUME GAME/ }).waitFor()
  await runtime().evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  )
  const pausedFrame = await runtime().evaluate(() => window.__runtime.gameFrame)
  await page.waitForTimeout(200)
  assert.equal(
    await runtime().evaluate(() => window.__runtime.gameFrame),
    pausedFrame,
    'menu freezes run',
  )
  await page.getByRole('button', { name: 'RESUME GAME', exact: true }).click()
  await page.getByRole('region', { name: 'Game controls' }).waitFor()
  const beforeTalkFrame = await runtime().evaluate(() => window.__runtime.gameFrame)
  await assertTalkIgnored('playing')
  assert.ok(
    (await runtime().evaluate(() => window.__runtime.gameFrame)) > beforeTalkFrame,
    'talk does not pause a running game',
  )
  await page.getByRole('region', { name: 'Game controls' }).waitFor()
  await page.keyboard.press('F9')
  await page.getByRole('heading', { name: 'GAME OVER' }).waitFor()
  await assertTalkIgnored('results')
  await page.getByRole('heading', { name: 'GAME OVER' }).waitFor()
  await shot('07-result')
  await page.keyboard.press('Enter')
  await page.getByRole('heading', { name: 'READY!' }).waitFor()

  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '2 PLAYERS', exact: true }).click()
  await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await shot('05-mobile-ready')
  assert.ok(
    await page.evaluate(
      () => document.querySelector('.arcade-screen').getBoundingClientRect().right <= innerWidth,
    ),
  )
  const bounds = await page
    .getByRole('button', { name: '> HOLD TO TALK', exact: true })
    .boundingBox()
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.getByRole('heading', { name: 'LISTENING' }).waitFor()
  await page.waitForTimeout(300)
  await page.mouse.up()
  await page.getByText('MIC OFF', { exact: true }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '1 PLAYER', exact: true }).waitFor()
  assert.ok(
    await page.evaluate(() =>
      window.voiceTest.streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended')),
    ),
  )
  await page.setViewportSize({ width: 320, height: 240 })
  await shot('08-menu-320x240')
  const safe = await page.locator('.arcade-screen').boundingBox()
  for (const button of await page.locator('.home-stage button').all()) {
    const bounds = await button.boundingBox()
    assert.ok(bounds.x >= safe.width * 0.08 - 1 && bounds.y >= safe.height * 0.08 - 1)
    assert.ok(bounds.y + bounds.height < safe.height * 0.92 + 1)
  }
  await page.route('**/api/generate', (route) => {
    generationRequests.push(route.request().postDataJSON())
    return route.fulfill({
      contentType: 'text/event-stream',
      body: `data: ${JSON.stringify({ type: 'ready', title: 'FALLBACK', source: 'template' })}\n\n`,
    })
  })
  await page.getByRole('button', { name: '2 PLAYERS', exact: true }).click()
  await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
  await page.getByRole('heading', { name: 'DESCRIBE YOUR GAME' }).waitFor()
  await page.keyboard.down('KeyV')
  await page.getByRole('heading', { name: 'LISTENING' }).waitFor()
  await page.waitForTimeout(300)
  await page.keyboard.up('KeyV')
  await page.getByRole('heading', { name: 'YOU SAID' }).waitFor()
  await page.keyboard.press('Enter')
  await page
    .getByRole('alert')
    .filter({ hasText: /Could not make that game/i })
    .waitFor()
  await shot('09-error-320x240')
  assert.equal(generationRequests[1].players, 2, 'two-player choice reaches generation')
  await page.getByRole('heading', { name: 'YOU SAID' }).waitFor()
  await page.getByRole('button', { name: 'CANCEL', exact: true }).click()
  await page.getByRole('button', { name: 'RESUME GAME', exact: true }).click()
  await page.getByRole('heading', { name: 'VOICE TEST', exact: true }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'FALLBACK', exact: true }).count(), 0)
  assert.deepEqual(errors, [])
  console.log(
    'PASS: player choice before voice, 1P/2P generation payloads, idle mic, real audio waveform, held-key and pointer capture, immediate release, read-only review, explicit game start, no in-game remix, pause/resume, CRT/mobile layout, and cancellation.',
  )
  console.log(`Screenshots: ${output}`)
} finally {
  await browser.close()
  rmSync(temp, { recursive: true, force: true })
}
