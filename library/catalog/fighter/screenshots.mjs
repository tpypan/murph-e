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
const demo = readFileSync(resolve(folder, 'demo.js'), 'utf8')
const code = `const ARCADE={fighter:${moduleCode}};\n${demo}`
const assets = JSON.parse(readFileSync(resolve(folder, 'assets.json'), 'utf8'))
const browser = await chromium.launch()
const checks = []
try {
  const page = await browser.newPage({ viewport: { width: 768, height: 672 } })
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  await page.waitForFunction(() => !!window.__probe)
  const key = (p, b, down) =>
    page.evaluate(([p, b, down]) => window.__probe.input(p, b, down), [p, b, down])
  const step = (n) => page.evaluate((n) => window.__probe.step(n), n)
  const confirmSelection = async (players) => {
    await key(0, 'a', true)
    if (players === 2) await key(1, 'a', true)
    await step(1)
    await key(0, 'a', false)
    if (players === 2) await key(1, 'a', false)
    await step(60)
  }
  const shot = async (name) => {
    const data = await page.evaluate(() => window.__probe.snapshot())
    writeFileSync(resolve(out, `${name}.png`), Buffer.from(data.split(',')[1], 'base64'))
  }
  for (const players of [1, 2]) {
    const loaded = await page.evaluate(
      ({ code, players }) => window.__probe.load(code, 19, 'MIDNIGHT DUEL', players),
      { code, players },
    )
    if (!loaded.ok) throw Error(loaded.error)
    await page.evaluate(() => window.__probe.start())
    await confirmSelection(players)
    await step(79)
    await shot(`${players}p-ready`)
    if (players === 2) {
      await key(0, 'right', true)
      await step(54)
      await key(0, 'right', false)
    }
    if (players === 2) {
      await key(0, 'b', true)
      await step(11)
      await shot('2p-kick')
      await key(0, 'b', false)
      await step(45)
      await key(1, 'down', true)
      await key(1, 'b', true)
      await step(12)
      await shot('2p-speed-dash')
      await key(1, 'b', false)
      await key(1, 'down', false)
      await step(40)
      await key(0, 'up', true)
      await step(8)
      await key(0, 'up', false)
      await key(0, 'b', true)
      await step(8)
      await shot('2p-air-kick')
      await key(0, 'b', false)
    } else {
      await key(0, 'down', true)
      await key(0, 'b', true)
      await step(16)
      await shot('1p-batarang')
      await key(0, 'b', false)
      await key(0, 'down', false)
    }
    const state = await step(1800),
      errors = await page.evaluate(() => window.__probe.errors())
    checks.push({
      players,
      load: loaded,
      state,
      errors,
      stats: await page.evaluate(() => window.__probe.frameStats()),
    })
    if (errors.length || state.error) throw Error(JSON.stringify(errors))
  }
  for (const players of [1, 2]) {
    const fast = code
      .replace('roundsToWin: 2', 'roundsToWin: 1')
      .replace('roundSeconds: 60', 'roundSeconds: 15')
    await page.evaluate(
      ({ code, players }) => {
        window.__probe.load(code, 19, 'MIDNIGHT DUEL', players)
        window.__probe.start()
      },
      { code: fast, players },
    )
    await confirmSelection(players)
    await step(79)
    if (players === 2) {
      await key(1, 'left', true)
      await step(74)
      for (let i = 0; i < 40; i++) {
        await key(1, 'b', true)
        await step(1)
        await key(1, 'b', false)
        await step(40)
      }
    } else await step(1500)
    const state = await step(1),
      errors = await page.evaluate(() => window.__probe.errors())
    checks.push({
      players,
      scenario: players === 1 ? 'idle human loss' : 'player two scripted win',
      state,
      errors,
    })
    if (
      state.state !== (players === 1 ? 'gameover' : 'win') ||
      (players === 2 && state.winner !== 1) ||
      errors.length
    )
      throw Error(`Terminal contract failed: ${JSON.stringify(state)}`)
    await shot(`${players}p-terminal`)
  }
  // Native-resolution contact sheets retain exact cached pixels and distinct poses.
  await page.goto('about:blank')
  for (const [name, character] of Object.entries(assets.characters)) {
    const data = await page.evaluate(
      ({ character }) => {
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
        canvas.width = 420
        canvas.height = 504
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = colors[5]
        ctx.fillRect(0, 0, 420, 504)
        ctx.font = '8px monospace'
        Object.entries(character.frames).forEach(([name, frame], i) => {
          const cx = (i % 5) * 84 + 35,
            cy = Math.floor(i / 5) * 84 + 68
          for (let y = 0; y < frame.pixels.length; y++)
            for (let x = 0; x < frame.pixels[y].length; x++) {
              const c = frame.pixels[y][x]
              if (c !== '.') {
                ctx.fillStyle = colors[parseInt(c, 16)]
                ctx.fillRect(cx - frame.anchor.x + x, cy - frame.anchor.y + y, 1, 1)
              }
            }
          ctx.fillStyle = colors[7]
          ctx.fillText(name, (i % 5) * 84 + 3, Math.floor(i / 5) * 84 + 81)
        })
        return canvas.toDataURL('image/png')
      },
      { character },
    )
    writeFileSync(resolve(out, `${name}-poses.png`), Buffer.from(data.split(',')[1], 'base64'))
  }
  writeFileSync(
    resolve(out, 'runtime.json'),
    JSON.stringify({ date: '2026-09-19', checks }, null, 2),
  )
  console.log(JSON.stringify(checks, null, 2))
} finally {
  await browser.close()
}
