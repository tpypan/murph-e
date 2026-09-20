// Actual source held-prop throw via ART-linked adapter; flight is explicitly authored.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..'),
  pack = resolve(root, 'data/local-catalog/batman-atari-fighter-reference'),
  out = resolve(pack, 'evidence/projectile'),
  module = readFileSync(resolve(pack, 'module.js'), 'utf8'),
  sha = (x) => createHash('sha256').update(x).digest('hex')
mkdirSync(out, { recursive: true })
const { chromium } = createRequire(resolve(root, 'packages/probe/package.json'))('playwright'),
  browser = await chromium.launch(),
  page = await browser.newPage(),
  cases = []
try {
  await page.route('**/*', (r) =>
    r.request().url().startsWith('file:') ? r.continue() : r.abort(),
  )
  await page.goto(`${pathToFileURL(resolve(root, 'packages/runtime/index.html')).href}?probe=1`)
  await page.waitForFunction(() => Boolean(window.__probe))
  for (const mode of ['hit', 'mirrored', 'guard', 'jump', 'cpu']) {
    const owner = mode === 'mirrored' ? 1 : 0,
      players = mode === 'cpu' ? 1 : 2,
      roster = owner ? ['flash', 'batman-atari-reference'] : ['batman-atari-reference', 'flash']
    const code = `const game=(${module})({roster:${JSON.stringify(roster)},roundsToWin:1,roundSeconds:15,sound:false});function init(api){game.init(api)}function update(api){game.update(api)}function draw(api){game.draw(api);api.__capture?.(game.inspect())}`
    const r = await page.evaluate(
      ({ code, owner, players, mode }) => {
        const p = window.__probe,
          load = p.load(code, 19, 'ATARI BATMAN SOURCE THROW', players)
        if (!load.ok) throw Error(JSON.stringify(load))
        window.__runtime.api.__capture = (s) => (window.batState = s)
        p.start()
        p.step(79)
        const before = window.batState,
          captures = [],
          capture = (label) => captures.push({ label, state: window.batState, png: p.snapshot() })
        capture('ready')
        if (mode === 'guard') p.input(1 - owner, owner ? 'left' : 'right', true)
        p.input(owner, 'down', true)
        p.input(owner, 'b', true)
        p.step(13)
        capture('emission')
        const emitted = window.batState.projectiles[0]
        p.input(owner, 'down', false)
        p.input(owner, 'b', false)
        if (mode === 'jump') p.input(1 - owner, 'up', true)
        p.step(10)
        capture('travel')
        p.step(100)
        capture('resolved')
        const resolved = window.batState
        p.input(1 - owner, 'up', false)
        p.input(1 - owner, 'right', false)
        p.input(1 - owner, 'left', false)
        p.step(1200)
        capture('result')
        return { mode, owner, players, before, emitted, resolved, captures, errors: p.errors() }
      },
      { code, owner, players, mode },
    )
    assert.deepEqual(r.errors, [])
    assert.ok(r.emitted)
    assert.ok(r.emitted.vx * (owner ? -1 : 1) > 0)
    const target = r.resolved.fighters[1 - owner]
    if (['hit', 'mirrored'].includes(mode)) assert.equal(target.hp, 83)
    if (mode === 'guard') assert.equal(target.hp, 99)
    if (mode === 'jump') assert.equal(target.hp, 100)
    if (mode !== 'jump') assert.equal(r.captures.at(-1).state.phase, 'complete')
    for (const c of r.captures) {
      const file = `${mode}-${c.label}.png`
      writeFileSync(resolve(out, file), Buffer.from(c.png.split(',')[1], 'base64'))
      delete c.png
      c.file = file
      c.sha256 = sha(readFileSync(resolve(out, file)))
    }
    cases.push(r)
  }
  writeFileSync(
    resolve(out, 'proof.json'),
    `${JSON.stringify({ moduleSha256: sha(module), cases, limits: ['Curved held-prop extraction, not original independent flight art', 'Original prop identity/action labels and original timing are not recovered', 'Native real-input scenarios, not human balance testing'] }, null, 2)}\n`,
  )
  console.log('Both-direction source throw hit/guard/jump/CPU native scenarios passed')
} finally {
  await browser.close()
}
