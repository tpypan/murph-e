// Offline admission of exact private source art and its verified native adapter.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadCatalog } from '../packages/harness/src/catalog.ts'
import { assetPackHash, loadSpriteCatalog } from '../packages/harness/src/sprite-catalog.ts'

const root = resolve(import.meta.dirname, '..'),
  pack = resolve(root, 'data/local-catalog/sonic-speed-reference'),
  assets = resolve(root, 'data/local-assets/sonic-two-reference')
const sha = (b) => createHash('sha256').update(b).digest('hex'),
  read = (d, n) => readFileSync(resolve(d, n)),
  json = (d, n) => JSON.parse(read(d, n)),
  write = (d, n, v) => writeFileSync(resolve(d, n), `${JSON.stringify(v, null, 2)}\n`)
const pixels = json(pack, 'evidence/pixels.json'),
  routes = json(pack, 'evidence/routes.json'),
  integrity = json(pack, 'import-integrity.json')
assert.equal(pixels.moduleSha256, sha(read(pack, 'module.js')))
assert.equal(routes.moduleSha256, pixels.moduleSha256)
assert.equal(pixels.heroSha256, sha(read(pack, 'hero.json')))
assert.equal(pixels.objectsSha256, sha(read(pack, 'objects.json')))
assert.equal(pixels.comparisons.length, 92)
assert.ok(pixels.comparisons.every((p) => !p.mismatches && !p.clipped))
assert.equal(integrity.mismatches, 0)
assert.equal(routes.routes.length, 3)
for (const route of routes.routes) {
  assert.equal(route.captures.at(-1).runtimeState, 'win')
  assert.equal(route.reset.runtimeState, 'playing')
  assert.deepEqual(route.reset.errors, [])
  assert.ok(route.reset.state.people.every((p) => p.act === 0 && p.lives === 3 && p.score === 0))
  const last = route.captures.at(-1).state
  assert.equal(last.phase, 'complete')
  assert.equal(last.people[last.winner].act, 1)
  if (route.players === 2) assert.equal(last.winner, 1 - route.delayPlayer)
  for (const c of route.captures) assert.equal(c.sha256, sha(read(pack, `evidence/${c.file}`)))
}
for (const [id, hash] of Object.entries(integrity.sources))
  for (const dir of [pack, assets]) assert.equal(sha(read(dir, `sources/${id}.png`)), hash)
mkdirSync(resolve(assets, 'evidence'), { recursive: true })
copyFileSync(
  resolve(root, 'data/reference-cache/spriters-resource/sonic/contact.png'),
  resolve(assets, 'evidence/contact.png'),
)
const review = {
  date: '2026-09-19',
  scope:
    'Native Sonic 2 source sprites and original two-act platformer adapter. No original ROM physics/timing or fighter readiness claim.',
  visual:
    'Manually inspected complete46-frame source contact and native1P/2P screenshots at hills, physical loop, second act and terminal completion. Character colors and silhouettes are intact; native source remains recognizable on both split views. Reviewed the authored layered coast/dusk scenery, continuous loop ring, shaded terrain and palms against saved pre-polish captures at native size and nearest-neighbor3x. Final pacing pass reviewed the forward camera, source-sized actor headroom during spring flights, connected high route, forgiving first valley and both physical loops. Three fresh default-input native routes include neutral-input reset. High spring flights can briefly show mostly sky/ocean; no physical cabinet or human play acceptance asserted.',
  provenance:
    'Privately retained Spriters Resource10073 and85563 sheets and sidecars; credit Triangly and Tiaremoana. Source RGB exact; timing, anchors, geometry and levels authored.',
  moduleSha256: pixels.moduleSha256,
  sourceHashes: integrity.sources,
  heroFrames: 38,
  heroClips: 12,
  objectFrames: 8,
  comparisons: 92,
  mismatches: 0,
  routes: routes.routes.map((r) => ({
    players: r.players,
    delayedPlayer: r.delayPlayer,
    winner: r.captures.at(-1).state.winner,
    ticks: r.captures.at(-1).state.ticks,
  })),
  evidence: Object.fromEntries(
    ['import-integrity.json', 'evidence/routes.json', 'evidence/pixels.json'].map((f) => [
      f,
      sha(read(pack, f)),
    ]),
  ),
  contactSha256: sha(read(assets, 'evidence/contact.png')),
  limitations: [
    'Two original acts, not Sonic 2 ROM gameplay',
    'Victory hold uses sourced idle/look-up art with authored timing',
    'Original authored enemies, springs and coastal/ridge scenery; no source-game backgrounds',
    'No fighter adapter asserted',
  ],
}
write(pack, 'evidence/review.json', review)
write(assets, 'evidence/review.json', review)
const part = loadCatalog(resolve(root, 'data/local-catalog')).find(
  (p) => p.manifest.id === 'sonic-speed-reference',
)
assert.ok(part)
const checks = (dir, names) =>
  names.map((name) => ({
    name,
    passed: true,
    artifact: 'evidence/review.json',
    artifactHash: sha(read(dir, 'evidence/review.json')),
  }))
write(pack, 'quality.json', {
  schemaVersion: 1,
  contentHash: part.hash,
  status: 'verified',
  checks: checks(pack, ['behavior', 'visual', 'runtime-1p', 'runtime-2p', 'source-rgba']),
})
write(assets, 'quality.json', {
  schemaVersion: 1,
  contentHash: assetPackHash(assets, json(assets, 'manifest.json')),
  status: 'source-checked',
  fighterReady: false,
  checks: checks(assets, ['integrity', 'visual', 'provenance']),
})
assert.equal(
  loadCatalog(resolve(root, 'data/local-catalog')).find(
    (p) => p.manifest.id === 'sonic-speed-reference',
  ).status,
  'verified',
)
const sprites = loadSpriteCatalog([], resolve(root, 'data/local-assets')).filter(
  (s) => s.packId === 'sonic-two-reference',
)
assert.equal(sprites.length, 4)
assert.ok(sprites.every((s) => s.status === 'source-checked'))
console.log(
  JSON.stringify(
    { adapter: 'verified', sourceActors: 4, status: 'source-checked', ...review },
    null,
    2,
  ),
)
