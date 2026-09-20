#!/usr/bin/env node
// Drives the cabinet page through every state with the keyboard and saves a
// screenshot of each. Uses stubbed transcription with real generation. Needs `pnpm dev` running.
// Run: pnpm screenshots:cabinet [outDir] [transcript] [2p transcript] [remix words]
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(new URL('../../..', import.meta.url).pathname)
const out = resolve(process.argv[2] ?? resolve(root, 'bench/screenshots/cabinet'))
const transcript =
  process.argv[3] ?? 'a game where a penguin slides on ice collecting fish and dodging seals'
mkdirSync(out, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:3000'

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
// Voice-only UI: feed fixture transcripts through the recorded-clip endpoint.
let spoken = transcript
await page.route('**/api/stt', (route) => route.fulfill({ json: { text: spoken } }))
const dictate = async (text) => {
  spoken = text
  await page.keyboard.down('Space')
  await page.getByRole('heading', { name: 'LISTENING' }).waitFor()
  await page.waitForTimeout(2500)
  await page.keyboard.up('Space')
  await page.getByRole('heading', { name: 'YOU SAID' }).waitFor()
}
page.on('pageerror', (e) => console.log('pageerror', e.message))
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log(`shot ${name}`)
}
const scorePosts = []
page.on('request', (request) => {
  if (request.method() === 'POST' && request.url().endsWith('/api/scores'))
    scorePosts.push(request.postDataJSON())
})
const t0 = Date.now()
const since = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`

await page.goto(base)
await page.getByRole('button', { name: /HOLD TALK TO SPEAK/ }).waitFor({ timeout: 30000 })
await page.waitForTimeout(2500)
await shot('1-attract')

// Select an explicit demo, review controls, then START.
await page.keyboard.press('ArrowDown')
await page.keyboard.press('Enter')
await page.getByRole('heading', { name: 'READY!' }).waitFor()
await page.keyboard.press('Enter')
await page.getByText('START: PAUSE', { exact: true }).waitFor()
await page.waitForTimeout(800)
await shot('2-playing-library')

// TALK -> read-only review -> BUILDING
await dictate(transcript)
await shot('3-listening')
await page.getByRole('button', { name: /START: MAKE GAME/ }).click()
await page.getByRole('heading', { name: 'MAKING GAME' }).waitFor({ timeout: 5000 })
console.log(`building started ${since()}`)
await page.waitForTimeout(6000)
await shot('4-building')
await page.getByRole('heading', { name: 'READY!' }).waitFor({ timeout: 240000 })
console.log(`ready ${since()}`)
await page.waitForTimeout(500)
await shot('5-ready-title')
await page.keyboard.press('Enter')
await page.waitForTimeout(1500)
await page.keyboard.down('ArrowRight')
await page.waitForTimeout(500)
await page.keyboard.up('ArrowRight')
await page.keyboard.press('z')
await page.waitForTimeout(300)
await shot('6-playing-generated')

// Crash injection -> fallback path.
await page.keyboard.press('F8')
await page.getByText(/THAT GAME CRASHED/).waitFor({ timeout: 10000 })
await page.waitForTimeout(300)
await shot('7-crash-fallback')
await page.getByRole('heading', { name: 'READY!' }).waitFor({ timeout: 10000 })
console.log('fallback waits at READY')

// ---- tier 2: two players on fake badges, leaderboard, cable pull, remix ----
// The fake badges go through the real hub (docs/plans/tier-2.md M0).
const api = async (path, body) => {
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${path} ${r.status}: ${await r.text()}`)
  return r.json()
}
const fake = (body) => api('/api/badges/fake', body)
const transcript2p = process.argv[4] ?? 'two wizards duelling with fireballs in a haunted library'
const remixWords = process.argv[5] ?? 'make it faster and add a boss'

// Player count lives in joystick-driven Options.
await page.keyboard.press('Escape')
await page.getByRole('button', { name: /HOLD TALK TO SPEAK/ }).waitFor()
for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown')
await page.keyboard.press('Enter')
await page.getByRole('heading', { name: 'OPTIONS' }).waitFor()
await page.keyboard.press('Enter')
await page.getByRole('button', { name: /2 PLAYERS/ }).waitFor()
await shot('8-attract-menu')

// Badge 1 already has the app; badge 2 gets it pushed. Both open it.
await fake({ op: 'toggle', n: 1 })
await page.getByText(/1 BADGES CONNECTED/).waitFor({ timeout: 10000 })
await page.waitForTimeout(400)
await shot('9-2p-plug')
await fake({ op: 'toggle', n: 2 })
await page.getByText(/2 BADGES CONNECTED/).waitFor({ timeout: 15000 })
await page.waitForTimeout(400)
await shot('10-2p-both')

// A real two-player generation.
await dictate(transcript2p)
await page.getByRole('button', { name: /START: MAKE GAME/ }).click()
await page.getByRole('heading', { name: 'MAKING GAME' }).waitFor({ timeout: 5000 })
console.log(`2p build started ${since()}`)
await page.waitForTimeout(5000)
await shot('11-2p-building')
await page.getByRole('heading', { name: 'READY!' }).waitFor({ timeout: 240000 })
console.log(`2p ready ${since()}`)
await page.waitForTimeout(500)
await page.keyboard.press('Enter')
await page.waitForTimeout(1200)
// Player 1 on the keyboard, player 2 on the fake badge.
await page.keyboard.down('ArrowRight')
await fake({ op: 'press', serial: 'FA:KE:00:00:00:02', button: 'left', down: true })
await page.waitForTimeout(600)
await page.keyboard.up('ArrowRight')
await fake({ op: 'press', serial: 'FA:KE:00:00:00:02', button: 'left', down: false })
await fake({ op: 'tap', serial: 'FA:KE:00:00:00:02', button: 'a' })
await page.keyboard.press('z')
await page.waitForTimeout(300)
await shot('12-2p-playing')

// Pull badge 2 mid-game: the game keeps running and the name is kept.
await fake({ op: 'toggle', n: 2 })
// Identity is retained internally; verify the named score submission below.
await page.waitForTimeout(400)
if (document_has(await page.innerText('body'), "HERE'S"))
  throw new Error('unplug caused a fallback')
await shot('13-2p-unplug')

// End the round: both scores post to the leaderboard, named.
await page.keyboard.press('F9')
await page.getByRole('button', { name: /START: PLAY AGAIN/ }).waitFor({ timeout: 10000 })

await page.waitForTimeout(800)
await shot('14-2p-gameover')
if (!scorePosts.some((score) => score.name?.toUpperCase() === 'SAM RIVERA'))
  throw new Error('unplugged player lost their score')

// Remix the running game.
await dictate(remixWords)
await shot('15-remix-listening')
await page.getByRole('button', { name: /START: MAKE GAME/ }).click()
await page.getByRole('heading', { name: 'MAKING GAME' }).waitFor({ timeout: 5000 })
console.log(`remix started ${since()}`)
await page.getByRole('heading', { name: 'READY!' }).waitFor({ timeout: 240000 })
console.log(`remix ready ${since()}`)
await page.waitForTimeout(600)
await shot('16-remix-ready')

await fake({ op: 'toggle', n: 1 })
console.log(`screenshots in ${out}`)
await browser.close()

function document_has(text, needle) {
  return text.includes(needle)
}
