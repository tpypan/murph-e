// Native real-input coverage for the private source character; no game-state mutation.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..'),
  cache = resolve(root, 'data/reference-cache/spriters-resource/spider-man'),
  out = process.argv.includes('--adapter')
    ? resolve(root, 'data/local-catalog/spider-man-fighter-reference/evidence/coverage')
    : resolve(cache, 'complete-coverage'),
  module = readFileSync(
    resolve(
      root,
      process.argv.includes('--adapter')
        ? 'data/local-catalog/spider-man-fighter-reference/module.js'
        : 'library/catalog/fighter/module.js',
    ),
    'utf8',
  ),
  assets = JSON.parse(readFileSync(resolve(cache, 'custom-assets-web.json'))),
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
  for (const owner of [0, 1])
    for (const mode of [
      'idle',
      'walk',
      'jump',
      'crouch',
      'light',
      'heavy',
      'sweep',
      'airLight',
      'airHeavy',
      'special',
      'dash',
      'guard',
      'crouchGuard',
      'victory',
      'ko',
    ]) {
      const roster =
          owner === 0 ? ['spider-man-reference', 'flash'] : ['flash', 'spider-man-reference'],
        config = {
          ...(process.argv.includes('--adapter') ? {} : { assets }),
          roster,
          names: owner === 0 ? ['SPIDER-MAN', 'FLASH'] : ['FLASH', 'SPIDER-MAN'],
          roundsToWin: 1,
          roundSeconds: mode === 'ko' ? 60 : 15,
          sound: false,
          ...(mode === 'dash' ? { specials: ['dash', 'dash'] } : {}),
        },
        code = `const game=(${module})(${JSON.stringify(config)});function init(api){game.init(api)}function update(api){game.update(api)}function draw(api){game.draw(api);api.__capture?.(game.inspect())}`
      const result = await page.evaluate(
        ({ code, owner, mode }) => {
          const p = window.__probe,
            r = p.load(code, 19, 'SPIDER-MAN SOURCE DUEL', 2)
          if (!r.ok) throw Error(JSON.stringify(r))
          window.__runtime.api.__capture = (s) => (window.coverageState = s)
          p.start()
          p.step(79)
          const foe = 1 - owner,
            toward = owner === 0 ? 'right' : 'left',
            away = owner === 0 ? 'left' : 'right',
            captures = [],
            seen = new Set(),
            tick = () => {
              p.step(1)
              const s = window.coverageState,
                f = s.fighters[owner]
              const label =
                f.animation +
                (f.blockStun > 0 ? '-blocked' : '') +
                (['victory', 'ko'].includes(f.animation) && f.animationAge >= 45 ? '-held' : '') +
                (f.action
                  ? `-${f.age === ({ light: 5, heavy: 11, sweep: 9, airLight: 4, airHeavy: 8, special: 13, dash: 9 }[f.action]) ? 'active' : 'pose'}`
                  : '')
              if (!seen.has(label)) {
                seen.add(label)
                captures.push({ label, state: s, png: p.snapshot() })
              }
              return s
            },
            keys = (who, list) => {
              for (const k of ['left', 'right', 'up', 'down', 'a', 'b'])
                p.input(who, k, list.includes(k))
            }
          if (
            [
              'light',
              'heavy',
              'sweep',
              'airLight',
              'airHeavy',
              'guard',
              'crouchGuard',
              'ko',
            ].includes(mode)
          ) {
            keys(owner, [toward])
            for (
              let i = 0;
              i < 60 &&
              Math.abs(window.coverageState.fighters[0].x - window.coverageState.fighters[1].x) >
                46;
              i++
            )
              tick()
            keys(owner, [])
            p.step(2)
          }
          if (mode === 'walk') keys(owner, [toward])
          else if (mode === 'jump') keys(owner, ['up'])
          else if (mode === 'crouch') keys(owner, ['down'])
          else if (mode === 'guard' || mode === 'crouchGuard') {
            keys(owner, [away, ...(mode === 'crouchGuard' ? ['down'] : [])])
            keys(foe, mode === 'guard' ? ['a'] : ['down', 'a'])
          } else if (mode === 'ko') keys(foe, ['b'])
          else if (mode === 'airLight' || mode === 'airHeavy') {
            keys(owner, ['up'])
            p.step(mode === 'airLight' ? 30 : 24)
            keys(owner, [mode === 'airLight' ? 'a' : 'b'])
          } else if (['special', 'dash', 'victory'].includes(mode)) keys(owner, ['down', 'b'])
          else if (mode === 'light') keys(owner, ['a'])
          else if (mode === 'heavy') keys(owner, ['b'])
          else if (mode === 'sweep') keys(owner, ['down', 'a'])
          for (let i = 0; i < 80; i++) {
            tick()
            if (i === 20 && !['guard', 'crouchGuard'].includes(mode)) keys(owner, [])
            if (i === 20) keys(foe, [])
          }
          keys(owner, [])
          keys(foe, [])
          if (mode === 'ko') {
            for (let i = 0; i < 2200; i++) {
              const s = window.coverageState
              if (s.phase === 'complete') break
              const distance = Math.abs(s.fighters[0].x - s.fighters[1].x)
              keys(foe, [...(distance > 44 ? [away] : []), ...(i % 45 === 0 ? ['b'] : [])])
              tick()
            }
          } else if (mode === 'victory') for (let i = 0; i < 1100; i++) tick()
          return { mode, owner, captures, final: window.coverageState, errors: p.errors() }
        },
        { code, owner, mode },
      )
      assert.deepEqual(result.errors, [])
      writeFileSync(
        resolve(out, `latest-${owner}-${mode}.json`),
        JSON.stringify({ ...result, captures: result.captures.map(({ png, ...c }) => c) }, null, 2),
      )
      const wanted = mode
      assert.ok(
        result.captures.some((c) => c.label === wanted || c.label.startsWith(`${wanted}-`)),
        `${owner}/${mode} occurred: ${result.captures.map((c) => c.label)}`,
      )
      for (const c of result.captures) {
        const name = `p${owner + 1}-${mode}-${c.label}.png`
        writeFileSync(resolve(out, name), Buffer.from(c.png.split(',')[1], 'base64'))
        delete c.png
        c.file = name
        c.sha256 = sha(readFileSync(resolve(out, name)))
      }
      cases.push(result)
    }
  writeFileSync(
    resolve(out, 'proof.json'),
    `${JSON.stringify({ moduleSha256: sha(module), assetSha256: sha(readFileSync(resolve(cache, 'custom-assets-web.json'))), cases, limitations: ['Authored timing, geometry and state assignment', 'Dash coverage explicitly uses supported dash-special configuration; default Spider-Man uses web projectile', 'No original ROM behavior or human balance claim'] }, null, 2)}\n`,
  )
  console.log('30 real-input coverage cases passed')
} finally {
  await browser.close()
}
