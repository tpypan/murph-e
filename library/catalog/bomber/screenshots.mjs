import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..'),
  out = resolve(import.meta.dirname, 'evidence'),
  require = createRequire(resolve(root, 'packages/probe/package.json')),
  { chromium } = require('playwright'),
  source = readFileSync(resolve(import.meta.dirname, 'module.js'), 'utf8')
mkdirSync(out, { recursive: true })
const code = (config) =>
  `const ARCADE={bomber:${source}};let game;function init(api){game=ARCADE.bomber(${JSON.stringify(config)});game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api)}`
const browser = await chromium.launch(),
  checks = []
try {
  const page = await browser.newPage()
  await page.route('**/*', (r) =>
    r.request().url().startsWith('file:') ? r.continue() : r.abort(),
  )
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  await page.waitForFunction(() => !!window.__probe)
  const load = async (config, players) => {
    const result = await page.evaluate(
      ({ source, players }) => {
        const r = window.__probe.load(source, 19, 'BLAST PATROL', players)
        window.__probe.start()
        return r
      },
      { source: code(config), players },
    )
    if (!result.ok) throw Error(result.error)
  }
  const shot = async (name) => {
    const d = await page.evaluate(() => window.__probe.snapshot())
    writeFileSync(resolve(out, `${name}.png`), Buffer.from(d.split(',')[1], 'base64'))
  }
  for (const players of [1, 2]) {
    await load({}, players)
    const state = await page.evaluate(() => window.__probe.step(1))
    await shot(`${players}p-start`)
    checks.push({ scenario: 'native default start', players, state })
  }
  await load({ crateDensity: 0, enemyCount: 0 }, 1)
  await page.evaluate(() =>
    window.__probe.inject([
      { at: 0, player: 0, button: 'a', down: true },
      { at: 1, player: 0, button: 'a', down: false },
      { at: 1, player: 0, button: 'right', down: true },
      { at: 25, player: 0, button: 'right', down: false },
      { at: 25, player: 0, button: 'down', down: true },
      { at: 41, player: 0, button: 'down', down: false },
    ]),
  )
  await page.evaluate(() => window.__probe.step(86))
  await shot('bomb-fuse')
  await page.evaluate(() => window.__probe.step(14))
  await shot('connected-cross-blast')
  for (const name of ['solo', 'versus', 'coop']) {
    const replay = JSON.parse(readFileSync(resolve(out, `${name}-replay.json`), 'utf8'))
    await load(replay.config, replay.players)
    await page.evaluate((replay) => window.__probe.inject(replay.inputs), replay)
    const state = await page.evaluate((n) => window.__probe.step(n), replay.frames),
      errors = await page.evaluate(() => window.__probe.errors())
    if (
      errors.length ||
      state.state !== replay.expectedState ||
      state.scores.some((n, i) => n !== replay.expectedScores[i])
    )
      throw Error(JSON.stringify({ name, state, errors, expected: replay.expectedScores }))
    checks.push({
      scenario: `${name} complete input replay`,
      players: replay.players,
      frames: replay.frames,
      state,
      errors,
    })
    await shot(`${name}-complete`)
  }
  await load({ roundSeconds: 20 }, 2)
  const state = await page.evaluate(() => window.__probe.step(1280))
  if (state.state !== 'gameover') throw Error('Versus timeout failed')
  checks.push({ scenario: 'versus tied timeout', players: 2, state })
  writeFileSync(resolve(out, 'runtime.json'), JSON.stringify({ checks }, null, 2))
  console.log(JSON.stringify(checks, null, 2))
} finally {
  await browser.close()
}
