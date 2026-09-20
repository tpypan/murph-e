import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const folder = import.meta.dirname,
  out = resolve(folder, 'evidence')
mkdirSync(out, { recursive: true })
const moduleCode = readFileSync(resolve(folder, 'module.js'), 'utf8')
const assets = JSON.parse(readFileSync(resolve(folder, 'assets.json'), 'utf8'))
const browser = await chromium.launch()
const checks = []
try {
  const page = await browser.newPage({ viewport: { width: 768, height: 672 } })
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  await page.waitForFunction(() => !!window.__probe)
  const codeFor = (config) =>
    `const ARCADE={maze:${moduleCode}};let game;function init(api){game=ARCADE.maze(${JSON.stringify(config)});game.init(api);}function update(api,dt){game.update(api,dt);}function draw(api){game.draw(api);}`
  const step = (n) => page.evaluate((n) => window.__probe.step(n), n)
  const key = (p, b, down) =>
    page.evaluate(([p, b, down]) => window.__probe.input(p, b, down), [p, b, down])
  const shot = async (name) => {
    const data = await page.evaluate(() => window.__probe.snapshot())
    writeFileSync(resolve(out, `${name}.png`), Buffer.from(data.split(',')[1], 'base64'))
  }
  for (const scenario of [
    {
      name: 'classic-1p',
      players: 1,
      config: { avatar: 'chomper', huntMode: 'classic', levels: 1, lives: 1 },
    },
    {
      name: 'goose-hunt-2p',
      players: 2,
      config: { avatar: 'goose', huntMode: 'player-hunts', levels: 1, huntSeconds: 20 },
    },
  ]) {
    const loaded = await page.evaluate(
      ({ code, players }) => window.__probe.load(code, 19, 'MAZE CHASE', players),
      { code: codeFor(scenario.config), players: scenario.players },
    )
    if (!loaded.ok) throw Error(loaded.error)
    await page.evaluate(() => window.__probe.start())
    await step(1)
    await shot(`${scenario.name}-house`)
    await step(260)
    await shot(`${scenario.name}-release`)
    await key(0, 'left', true)
    if (scenario.players === 2) await key(1, 'right', true)
    await step(110)
    await key(0, 'up', true)
    await key(0, 'left', false)
    if (scenario.players === 2) {
      await key(1, 'up', true)
      await key(1, 'right', false)
    }
    await step(200)
    await shot(`${scenario.name}-play`)
    const state = await step(1200),
      errors = await page.evaluate(() => window.__probe.errors())
    checks.push({
      scenario: scenario.name,
      players: scenario.players,
      load: loaded,
      state,
      errors,
      stats: await page.evaluate(() => window.__probe.frameStats()),
    })
    if (errors.length || state.error) throw Error(JSON.stringify(errors))
    if (state.state !== 'gameover')
      throw Error('Classic life loss / hunt timeout did not terminate')
  }
  // Replay full behavior-test inputs through the actual runtime, not a one-pellet
  // shortcut. Classic collection disables ghosts; hunting uses all four ghosts.
  for (const name of ['cooperative', 'hunt']) {
    const replay = JSON.parse(readFileSync(resolve(out, `${name}-replay.json`), 'utf8'))
    await page.evaluate(
      ({ code, players, inputs }) => {
        window.__probe.load(code, 19, 'MAZE CHASE', players)
        window.__probe.start()
        window.__probe.inject(inputs)
      },
      { code: codeFor(replay.config), players: replay.players, inputs: replay.inputs },
    )
    if (name === 'hunt') {
      await step(500)
      await shot('goose-hunt-2p-capture')
      await step(replay.frames - 500)
    } else await step(replay.frames)
    const terminal = await step(1),
      errors = await page.evaluate(() => window.__probe.errors())
    checks.push({
      scenario: `full ${name} replay`,
      players: replay.players,
      replayFrames: replay.frames,
      state: terminal,
      errors,
    })
    if (
      terminal.state !== 'win' ||
      terminal.scores.some((s, i) => s !== replay.expectedScores[i]) ||
      errors.length
    )
      throw Error(JSON.stringify(terminal))
    await shot(`${name}-2p-terminal`)
  }
  await page.goto('about:blank')
  const data = await page.evaluate(
    ({ assets }) => {
      const colors = [
        '#000000',
        '#1d2b53',
        '#7e2553',
        '#008751',
        '#ab5236',
        '#5f574f',
        '#c2c3c7',
        '#fff1e8',
        '#ff004d',
        '#ffa300',
        '#ffec27',
        '#00e436',
        '#29adff',
        '#83769c',
        '#ff77a8',
        '#ffccaa',
      ]
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 520
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#111111'
      ctx.fillRect(0, 0, 512, 520)
      ctx.font = '7px monospace'
      Object.entries(assets.animations).forEach(([name, clip], index) => {
        const x = (index % 4) * 128,
          y = Math.floor(index / 4) * 37
        ctx.fillStyle = colors[6]
        ctx.fillText(name, x + 2, y + 9)
        clip.frames.forEach((fr, i) => {
          const f = assets.frames[fr.frame]
          for (let yy = 0; yy < f.pixels.length; yy++)
            for (let xx = 0; xx < f.pixels[yy].length; xx++) {
              const c = f.pixels[yy][xx]
              if (c !== '.') {
                ctx.fillStyle = colors[parseInt(c, 16)]
                ctx.fillRect(x + 3 + i * 19 + xx, y + 15 + yy, 1, 1)
              }
            }
        })
      })
      return canvas.toDataURL('image/png')
    },
    { assets },
  )
  writeFileSync(resolve(out, 'animation-clips.png'), Buffer.from(data.split(',')[1], 'base64'))
  writeFileSync(
    resolve(out, 'runtime.json'),
    JSON.stringify({ date: '2026-09-19', checks }, null, 2),
  )
  console.log(JSON.stringify(checks, null, 2))
} finally {
  await browser.close()
}
