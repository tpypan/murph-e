// The actual private demo, with inspect/text observation only; all choices use native inputs.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..'),
  pack = resolve(root, 'data/local-catalog/batman-atari-fighter-reference'),
  out = resolve(pack, 'evidence/selection'),
  module = readFileSync(resolve(pack, 'module.js'), 'utf8'),
  demo = readFileSync(resolve(pack, 'demo.js'), 'utf8'),
  sha = (x) => createHash('sha256').update(x).digest('hex')
mkdirSync(out, { recursive: true })
assert.ok(demo.includes('characterSelect:true'))
const code = `const ARCADE={fighter:(${module})};\n${demo.replace('game.draw(api)', 'game.draw(api);api.__capture?.(game.inspect())')}`
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
  for (const players of [1, 2]) {
    const result = await page.evaluate(
      ({ code, players }) => {
        const p = window.__probe,
          load = p.load(code, 19, 'BATMAN ATARI: ROOFTOP DUEL', players)
        if (!load.ok) throw Error(JSON.stringify(load))
        window.__runtime.api.__capture = (s) => (window.selectionState = s)
        const text = window.__runtime.api.text
        window.hudText = []
        window.__runtime.api.text = (...args) => {
          window.hudText.push(args[0])
          text(...args)
        }
        p.start()
        p.step(1)
        const captures = [],
          capture = (label) => {
            captures.push({
              label,
              state: window.selectionState,
              png: p.snapshot(),
              text: [...new Set(window.hudText)],
            })
            window.hudText = []
          },
          tap = (who, key) => {
            p.input(who, key, true)
            p.step(1)
            p.input(who, key, false)
            p.step(1)
          }
        capture('unlocked')
        p.step(180)
        capture('waiting')
        tap(0, 'right')
        capture('p1-flash')
        tap(0, 'a')
        capture('p1-locked')
        if (players === 2) {
          p.step(90)
          capture('waiting-for-p2')
          tap(0, 'right')
          capture('p1-remains-locked')
          tap(1, 'left')
          capture('p2-batman')
          tap(1, 'a')
          capture('both-locked')
        }
        p.step(150)
        capture('fight')
        tap(0, 'right')
        tap(players === 2 ? 1 : 0, 'a')
        p.step(15)
        capture('playable')
        return { players, captures, errors: p.errors() }
      },
      { code, players },
    )
    assert.deepEqual(result.errors, [])
    const get = (label) => result.captures.find((c) => c.label === label)
    assert.equal(get('unlocked').state.phase, 'select')
    assert.equal(get('waiting').state.phase, 'select')
    assert.equal(get('unlocked').state.selection.locked[0], false)
    assert.equal(
      get('p1-flash').state.selection.available[get('p1-flash').state.selection.cursors[0]],
      'flash',
    )
    if (players === 2) {
      assert.deepEqual(get('unlocked').state.selection.locked, [false, false])
      assert.equal(get('waiting-for-p2').state.phase, 'select')
      assert.deepEqual(get('waiting-for-p2').state.selection.locked, [true, false])
      assert.equal(get('p1-remains-locked').state.selection.cursors[0], 1)
      assert.deepEqual(get('both-locked').state.selection.locked, [true, true])
      assert.equal(get('both-locked').state.phase, 'versus')
      assert.deepEqual(
        get('fight').state.fighters.map((f) => f.id),
        ['flash', 'batman-atari-reference'],
      )
      assert.ok(get('fight').text.includes('BATMAN'))
      assert.ok(get('fight').text.includes('FLASH'))
    } else {
      assert.equal(get('unlocked').state.selection.humans, 1)
      assert.equal(get('p1-locked').state.phase, 'versus')
      assert.equal(get('fight').state.fighters[0].id, 'flash')
      assert.notEqual(get('fight').state.fighters[1].id, 'flash')
      assert.ok(get('unlocked').text.some((t) => String(t).includes('CPU')))
    }
    assert.equal(get('fight').state.phase, 'fight')
    assert.equal(get('playable').state.phase, 'fight')
    for (const c of result.captures) {
      const file = `${players}p-${c.label}.png`
      writeFileSync(resolve(out, file), Buffer.from(c.png.split(',')[1], 'base64'))
      delete c.png
      c.file = file
      c.sha256 = sha(readFileSync(resolve(out, file)))
    }
    cases.push(result)
  }
  writeFileSync(
    resolve(out, 'proof.json'),
    `${JSON.stringify({ moduleSha256: sha(module), demoSha256: sha(demo), method: 'Actual demo code; native runtime inputs; read-only inspect and text observations', cases }, null, 2)}\n`,
  )
  console.log(
    'Actual Batman demo1P/2P selection, independent locks, identity labels and fight passed',
  )
} finally {
  await browser.close()
}
