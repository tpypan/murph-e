import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assembleCatalog, loadCatalog } from '../packages/harness/src/catalog.ts'
import { playtest } from '../packages/probe/src/playtest.ts'
import { closeProbe, openRuntime, probe } from '../packages/probe/src/probe.ts'

const part = loadCatalog().find((p) => p.manifest.id === 'sky-racer')!
assert.ok(part, 'sky-racer pack must load')
const folder = resolve(part.dir, 'verification')
mkdirSync(folder, { recursive: true })
const context = { parts: [part], hash: part.hash, text: part.api }
const source = readFileSync(resolve(part.dir, 'demo.js'), 'utf8')
const code = assembleCatalog(source, context)
const controls = ['left', 'right', 'up', 'down', 'a', 'b']
try {
  const result = await probe(code, { players: 1, controls })
  assert.ok(result.ok, JSON.stringify(result.observations))
  writeFileSync(
    resolve(folder, 'runtime.json'),
    JSON.stringify({ contentHash: part.hash, ...result, thumb: undefined }, null, 2),
  )
  const page = await openRuntime()
  try {
    const original = readFileSync(resolve(part.dir, 'source-game.js'), 'utf8')
    const equivalence = await page.evaluate(
      ({ original, bundled }) => {
        const p = window.__probe!
        p.load(original, 7, 'SKY RACER', 1)
        p.start()
        p.step(120)
        const before = { frame: p.frameHash(), score: p.score() }
        p.load(bundled, 7, 'SKY RACER', 1)
        p.start()
        p.step(120)
        return { before, after: { frame: p.frameHash(), score: p.score() } }
      },
      { original, bundled: code },
    )
    assert.deepEqual(equivalence.before, equivalence.after)
    writeFileSync(resolve(folder, 'equivalence.json'), JSON.stringify(equivalence, null, 2))
  } finally {
    await page.close()
  }
  for (const [name, demo] of [
    ['default', source],
    [
      'custom',
      source.replace(
        'ARCADE.skyRacer({})',
        `ARCADE.skyRacer({rivalSpeed:0.6,boostCooldown:1.5,racerNames:['ACE','BEE','COMET','DART'],planePalette:['#182747','#e64ace','#ff80da','#fff1d0','#c6bca9','#714be0','#71dafa','#ffffff']})`,
      ),
    ],
  ]) {
    const assembled = assembleCatalog(demo!, context)
    const metrics = await playtest(assembled, {
      players: 1,
      seed: 7,
      controls,
      seconds: 150,
      shots: true,
    })
    assert.ok(metrics.ok, metrics.error ?? 'runtime failure')
    const shots = metrics.shots.map((data, index) => {
      const file = `${name}-${[2, 15, 40][index]}s.png`
      writeFileSync(resolve(folder, file), Buffer.from(data.split(',')[1]!, 'base64'))
      return file
    })
    writeFileSync(
      resolve(folder, `${name}-playtest.json`),
      JSON.stringify({ ...metrics, shots }, null, 2),
    )
  }
  console.log(
    JSON.stringify({
      id: part.manifest.id,
      ok: true,
      customizationCharacters: source.length,
      bundledCharacters: code.length,
      observations: result.observations,
    }),
  )
} finally {
  await closeProbe()
}
