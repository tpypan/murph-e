import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..'),
  dir = import.meta.dirname,
  out = resolve(dir, 'evidence'),
  require = createRequire(resolve(root, 'packages/probe/package.json')),
  { chromium } = require('playwright'),
  source = readFileSync(resolve(dir, 'module.js'), 'utf8')
mkdirSync(out, { recursive: true })
const code = (config) =>
  `const ARCADE={crossing:${source}};let game;function init(api){game=ARCADE.crossing(${JSON.stringify(config)});game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api)}`
const browser = await chromium.launch(),
  checks = []
try {
  const page = await browser.newPage()
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  await page.waitForFunction(() => !!window.__probe)
  const shot = async (name) => {
    const d = await page.evaluate(() => window.__probe.snapshot())
    writeFileSync(resolve(out, `${name}.png`), Buffer.from(d.split(',')[1], 'base64'))
  }
  for (const players of [1, 2]) {
    const result = await page.evaluate(
      ({ code, players }) => {
        const load = window.__probe.load(code, 19, 'RIVER RUN', players)
        window.__probe.start()
        return { load, state: window.__probe.step(1) }
      },
      { code: code({}), players },
    )
    if (!result.load.ok) throw Error(result.load.error)
    await shot(`${players}p-start`)
    await page.evaluate(() => window.__probe.step(210))
    await shot(`${players}p-turtle-warning`)
    checks.push({ players, ...result })
  }
  for (const name of ['solo', 'coop']) {
    const replay = JSON.parse(readFileSync(resolve(out, `${name}-replay.json`)))
    await page.evaluate(
      ({ code, replay }) => {
        window.__probe.load(code, 19, 'RIVER RUN', replay.players)
        window.__probe.start()
        window.__probe.inject(replay.inputs)
      },
      { code: code(replay.config), replay },
    )
    const state = await page.evaluate((n) => window.__probe.step(n), replay.frames)
    const errors = await page.evaluate(() => window.__probe.errors())
    checks.push({
      scenario: `${name} complete route`,
      players: replay.players,
      state,
      errors,
      frames: replay.frames,
    })
    if (
      errors.length ||
      state.scores.some((n, i) => n !== replay.expectedScores[i]) ||
      (name === 'solo' && state.state !== 'win')
    )
      throw Error(JSON.stringify(state))
    await shot(`${name}-complete`)
  }
  await page.evaluate(
    ({ code }) => {
      window.__probe.load(code, 19, 'RIVER RUN', 1)
      window.__probe.start()
    },
    { code: code({ lives: 1, timeLimit: 10 }) },
  )
  const lost = await page.evaluate(() => window.__probe.step(610))
  if (lost.state !== 'gameover') throw Error('timer did not terminate')
  checks.push({ scenario: 'timer loss', state: lost })
  writeFileSync(resolve(out, 'runtime.json'), JSON.stringify({ checks }, null, 2))
  console.log(JSON.stringify(checks, null, 2))
} finally {
  await browser.close()
}
