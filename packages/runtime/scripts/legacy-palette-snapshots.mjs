import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const artifact = process.argv[3] || '/tmp/arcade-legacy-palette-baseline.json'
const mode = process.argv[2] || 'compare'
const entries = []
for (const file of readdirSync(resolve(root, 'library/templates')).filter((f) =>
  f.endsWith('.js'),
)) {
  entries.push({
    id: `template/${file}`,
    players: /coop|versus/.test(file) ? 2 : 1,
    code: readFileSync(resolve(root, 'library/templates', file), 'utf8'),
  })
}
for (const { name: id } of readdirSync(resolve(root, 'library/catalog'), {
  withFileTypes: true,
}).filter((entry) => entry.isDirectory())) {
  const dir = resolve(root, 'library/catalog', id)
  const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8'))
  const code = `const ARCADE={${manifest.entry}:${readFileSync(resolve(dir, manifest.module), 'utf8')}};\n${readFileSync(resolve(dir, 'demo.js'), 'utf8')}`
  for (const players of manifest.supportsPlayers)
    entries.push({ id: `catalog/${id}/${players}p`, players, code })
}
entries.push({
  id: 'protocol/flash-primitives',
  players: 2,
  code: `
const P=['.7cf','08a.'];function init(api){api.score(0)}
function update(api){if(api.frame===2)api.flash(8,3);if(api.frame===30)api.shake(6);api.addScore(1,0)}
function draw(api){api.cls(1);api.rectfill(5,5,40,40,2);api.line(-8,15,90,180,5);api.rect(40,45,20,31,6);api.circ(100,90,22,12);api.circfill(180,150,16,10);api.spr(P,-1,15,true,true);api.text('LEGACY',12,200,7);api.textCenter('HUD',20,9,2);api.pset(250,220,api.pget(100,90))}`,
})
const browser = await chromium.launch()
const results = {}
try {
  const page = await browser.newPage()
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  for (const entry of entries) {
    const snapshots = await page.evaluate(({ code, players, id }) => {
      const p = window.__probe
      const loaded = p.load(code, 7, id.slice(0, 20), players)
      if (!loaded.ok) throw Error(`${id}: ${loaded.error}`)
      const output = []
      const capture = (name) =>
        output.push({
          name,
          hash: p.frameHash(),
          stats: p.frameStats(),
          png: p.snapshot(),
          state: p.state(),
        })
      p.step(1)
      capture('title')
      p.start()
      p.step(3)
      capture('early-flash')
      p.step(57)
      capture('idle-60')
      p.input(0, 'left', true)
      p.input(0, 'a', true)
      p.input(1, 'right', true)
      p.input(1, 'a', true)
      p.step(20)
      capture('inputs')
      p.input(0, 'left', false)
      p.input(0, 'a', false)
      p.input(1, 'right', false)
      p.input(1, 'a', false)
      window.__runtime.end()
      p.step(2)
      capture('gameover')
      p.reset()
      p.step(1)
      capture('reset-title')
      p.start()
      p.step(60)
      capture('reset-playing')
      if (p.errors().length) throw Error(JSON.stringify(p.errors()))
      return output
    }, entry)
    results[entry.id] = snapshots.map(({ png, ...snapshot }) => ({
      ...snapshot,
      pngHash: createHash('sha256')
        .update(Buffer.from(png.split(',')[1], 'base64'))
        .digest('hex'),
    }))
  }
} finally {
  await browser.close()
}
if (mode === 'capture') {
  mkdirSync(resolve(artifact, '..'), { recursive: true })
  writeFileSync(artifact, JSON.stringify(results, null, 2))
} else {
  assert.deepEqual(
    results,
    JSON.parse(readFileSync(artifact, 'utf8')),
    'Legacy framebuffer hashes, PNG bytes, stats and state must remain identical',
  )
}
console.log(
  `${mode}: ${entries.length} games, ${Object.values(results).reduce((n, s) => n + s.length, 0)} exact native snapshots`,
)
