#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
// Feeds a WAV file through Chromium's fake microphone, holds TALK on the
// cabinet page, releases, and prints the local Whisper transcript. Intercept STT
// locally even when the app uses OpenAI; this script never sends paid requests.
// Run: pnpm --filter @htn/probe exec node scripts/stt-test.mjs <file.wav> "<expected words>"
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../..')
function localTranscript(audio) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      resolve(root, '.venv-stt/bin/python'),
      ['-u', resolve(root, 'scripts/whisper-worker.py')],
      {
        cwd: root,
        env: { ...process.env, HF_HUB_OFFLINE: '1', TOKENIZERS_PARALLELISM: 'false' },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )
    let output = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('Local speech test timed out'))
    }, 90_000)
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.stderr.on('data', () => {})
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.stdin.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      try {
        if (code !== 0) throw new Error('Local Whisper worker failed')
        const result = output
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line))
          .find((line) => line.id === 1)
        if (!result || result.error) throw new Error('Local Whisper transcription failed')
        resolveResult(result)
      } catch (error) {
        reject(error)
      }
    })
    child.stdin.end(`${JSON.stringify({ id: 1, audio: audio.toString('base64') })}\n`)
  })
}

const [wav, expected = ''] = process.argv.slice(2)
if (!wav) {
  console.error('usage: stt-test.mjs <file.wav> [expected]')
  process.exit(2)
}
const base = process.env.BASE ?? 'http://localhost:3000'
const browser = await chromium.launch({
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}`,
  ],
})
const context = await browser.newContext({
  permissions: ['microphone'],
  viewport: { width: 1280, height: 720 },
})
const page = await context.newPage()
await page.route('**/*', (route) => {
  const url = new URL(route.request().url())
  if (
    url.pathname === '/api/generate' ||
    (url.protocol.startsWith('http') && url.origin !== new URL(base).origin)
  )
    return route.abort()
  return route.fallback()
})
await page.route('**/api/stt', async (route) => {
  try {
    const request = route.request()
    const form = await new Request(request.url(), {
      method: 'POST',
      headers: request.headers(),
      body: request.postDataBuffer(),
    }).formData()
    const audio = form.get('audio')
    if (!(audio instanceof Blob)) throw new Error('Missing offline test audio')
    await route.fulfill({ json: await localTranscript(Buffer.from(await audio.arrayBuffer())) })
  } catch {
    await route.fulfill({ status: 503, json: { error: 'Offline local speech test failed.' } })
  }
})
page.on('console', (m) => {
  if (m.type() === 'error') console.log('console.error', m.text().slice(0, 200))
})
await page.goto(base)
await page.getByRole('button', { name: '1 PLAYER', exact: true }).click({ timeout: 30000 })
await page.getByRole('button', { name: 'MAKE A GAME', exact: true }).click()
const t0 = Date.now()
// Wait for the chosen player mode to render before pressing its TALK control.
const talk = page.getByRole('button', { name: /HOLD TO TALK/ })
await talk.waitFor()
const bounds = await talk.boundingBox()
await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
await page.mouse.down()
await page.getByText('LISTENING', { exact: true }).waitFor({ timeout: 5000 })
// The fake device loops the file; hold long enough for one full pass.
await page.waitForTimeout(Number(process.env.HOLD_MS ?? 6000))
await page.mouse.up()
const released = Date.now()
try {
  await page.getByText('YOU SAID', { exact: true }).waitFor({ timeout: 100000 })
} catch {
  console.log(`page text at failure:\n${await page.locator('main').innerText()}`)
  await page.screenshot({ path: `${process.env.SHOT_DIR ?? '.'}/stt-fail.png` })
  process.exit(1)
}
const said = (await page.locator('.voice-transcript').innerText()).trim()
console.log(
  `heard: "${said}"  (transcript ready ${Date.now() - released} ms after release, ${Date.now() - t0} ms after press)`,
)
if (expected) {
  const words = expected.toLowerCase().split(/\s+/)
  const hit = words.filter((w) => said.toLowerCase().includes(w))
  console.log(`expected words matched: ${hit.length}/${words.length}`)
  if (hit.length !== words.length) process.exitCode = 1
}
await browser.close()
