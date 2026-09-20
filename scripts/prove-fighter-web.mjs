// Real local gameplay, with source web art. No model calls or network access.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const folder = resolve(root, 'data/reference-cache/spriters-resource/spider-man')
const adapter = process.argv.includes('--adapter')
const out = adapter
  ? resolve(root, 'data/local-catalog/spider-man-fighter-reference/evidence/web')
  : resolve(folder, 'fighter-web-gameplay-proof')
const require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const hash = (value) => createHash('sha256').update(value).digest('hex')
const source = readFileSync(resolve(folder, 'custom-assets-web.json'))
const assets = JSON.parse(source)
const module = readFileSync(
  resolve(
    root,
    adapter
      ? 'data/local-catalog/spider-man-fighter-reference/module.js'
      : 'library/catalog/fighter/module.js',
  ),
  'utf8',
)
mkdirSync(out, { recursive: true })
const codeFor = (
  mirror = false,
) => `const factory=${module};const assets=${JSON.stringify(assets)};let game;
function init(api){game=factory({${adapter ? '' : 'assets,'}roster:${JSON.stringify(mirror ? ['flash', 'spider-man-reference'] : ['spider-man-reference', 'flash'])},names:${JSON.stringify(mirror ? ['FLASH', 'SPIDER-MAN'] : ['SPIDER-MAN', 'FLASH'])},roundsToWin:1,roundSeconds:20,sound:false});game.init(api)}
function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api);api.__capture?.(game.inspect())}`
writeFileSync(resolve(out, 'game.js'), codeFor())
const browser = await chromium.launch()
const cases = []
try {
  const page = await browser.newPage()
  await page.route('**/*', (route) =>
    route.request().url().startsWith('http') ? route.abort() : route.continue(),
  )
  await page.goto(`${pathToFileURL(resolve(root, 'packages/runtime/index.html')).href}?probe=1`)
  await page.waitForFunction(() => Boolean(window.__probe))
  for (const mode of ['hit', 'mirrored', 'block', 'jump', 'cpu']) {
    const owner = mode === 'mirrored' ? 1 : 0
    const players = mode === 'cpu' ? 1 : 2
    const result = await page.evaluate(
      ({ code, owner, players, mode }) => {
        const p = window.__probe
        const loaded = p.load(code, 19, 'WEB DUEL', players)
        if (!loaded.ok) throw Error(loaded.error)
        window.__runtime.api.__capture = (s) => {
          window.webState = s
        }
        p.start()
        p.step(79)
        const captures = []
        const seen = new Set()
        const capture = (label) => {
          if (seen.has(label)) return
          seen.add(label)
          captures.push({ label, state: window.webState, png: p.snapshot() })
        }
        capture('ready')
        const before = window.webState.fighters[owner]
        const defender = 1 - owner
        if (mode === 'block') p.input(defender, 'right', true)
        p.input(owner, 'down', true)
        p.input(owner, 'b', true)
        p.step(13)
        const emitted = window.webState.projectiles[0]
        capture('emission')
        p.input(owner, 'down', false)
        p.input(owner, 'b', false)
        // Ordinary jump input after emission makes the source projectile pass below.
        if (mode === 'jump') p.input(defender, 'up', true)
        const timeline = []
        for (let i = 0; i < 150; i++) {
          p.step(1)
          const state = window.webState
          timeline.push(state)
          if (state.projectiles.length && i === 9) capture('travel')
          if (state.effects.some((e) => e.type === 'sprite')) capture('impact')
          const target = state.fighters[defender]
          if (target.bind && target.bind.age >= 12) capture('wrapped')
          if (seen.has('wrapped') && !target.bind && !target.stun) capture('released')
        }
        p.input(defender, 'up', false)
        p.input(defender, 'right', false)
        const final = window.webState
        // Let ordinary CPU/timeout round flow finish, without mutating combat state.
        const terminal = p.step(1500)
        capture('terminal')
        return {
          mode,
          owner,
          players,
          before,
          emitted,
          final,
          timeline,
          terminal,
          captures,
          errors: p.errors(),
        }
      },
      { code: codeFor(owner === 1), owner, players, mode },
    )
    assert.deepEqual(result.errors, [])
    assert.equal(result.terminal.error, null)
    if (mode === 'jump') {
      // A clean miss leaves equal health: the tied round correctly starts another.
      assert.equal(result.terminal.state, 'playing')
      assert.ok(result.captures.find((c) => c.label === 'terminal').state.round >= 2)
    } else assert.ok(['gameover', 'win'].includes(result.terminal.state), `${mode} reaches result`)
    assert.ok(result.emitted, `${mode} emitted`)
    assert.ok(
      Math.abs(result.emitted.x - (result.before.x + result.before.face * (31 + 3.6))) < 1e-8,
    )
    assert.equal(result.emitted.y, result.before.y - 28)
    const target = result.final.fighters[1 - owner]
    if (mode === 'hit' || mode === 'mirrored') {
      assert.equal(target.hp, 83)
      assert.equal(result.final.scores[owner], 170)
      assert.equal(target.bind, null)
      assert.ok(result.captures.some((c) => c.label === 'wrapped'))
      assert.ok(result.captures.some((c) => c.label === 'released'))
      assert.equal(result.final.projectiles.length, 0)
    } else if (mode === 'block') {
      assert.equal(target.hp, 99)
      assert.equal(target.bind, null)
      assert.equal(result.final.scores[owner], 0)
      assert.ok(!result.timeline.some((s) => s.fighters[1 - owner].bind))
    } else if (mode === 'jump') {
      assert.equal(target.hp, 100)
      assert.equal(result.final.scores[owner], 0)
    }
    for (const capture of result.captures) {
      writeFileSync(
        resolve(out, `${mode}-${capture.label}.png`),
        Buffer.from(capture.png.split(',')[1], 'base64'),
      )
      delete capture.png
    }
    cases.push(result)
  }
  const gallery = await browser.newPage({ viewport: { width: 1536, height: 496 } })
  const panels = [
    ['hit-emission.png', 'HAND → WEB'],
    ['hit-wrapped.png', 'BRIEF WEB TRAP'],
    ['mirrored-travel.png', 'EITHER CONTROLLER'],
  ].map(
    ([file, label]) =>
      `<section><h2>${label}</h2><img src="data:image/png;base64,${readFileSync(resolve(out, file)).toString('base64')}" /></section>`,
  )
  await gallery.setContent(
    `<style>body{margin:0;background:#000;color:white;font:16px monospace;display:flex}section{width:512px}h2{height:48px;margin:0;display:grid;place-items:center;font-size:16px;font-weight:normal}img{width:512px;height:448px;image-rendering:pixelated;display:block}</style>${panels.join('')}`,
  )
  await gallery.screenshot({ path: resolve(out, 'native-overview.png') })
  await gallery.close()
  writeFileSync(
    resolve(out, 'proof.json'),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        moduleSha256: hash(module),
        assetSha256: hash(source),
        cases,
        limits: [
          'Authored mechanics and timings; original game behavior is not recovered.',
          'Deterministic native input scenarios, not human balance or physical CRT approval.',
        ],
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify(
      cases.map(({ mode, owner, players, final, terminal, captures }) => ({
        mode,
        owner,
        players,
        hp: final.fighters.map((f) => f.hp),
        scores: final.scores,
        result: terminal.state,
        captures: captures.map((c) => c.label),
      })),
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
