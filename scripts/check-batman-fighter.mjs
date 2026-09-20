// Offline admission with exact source/crop, native behavior and actual-demo evidence.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadCatalog } from '../packages/harness/src/catalog.ts'
import { assetPackHash, loadSpriteCatalog } from '../packages/harness/src/sprite-catalog.ts'

const root = resolve(import.meta.dirname, '..'),
  assets = resolve(root, 'data/local-assets/dc-batman-atari-fighter'),
  pack = resolve(root, 'data/local-catalog/batman-atari-fighter-reference'),
  cache = resolve(root, 'data/reference-cache/spriters-resource/dc-arcade/batman-fighter'),
  old = resolve(root, 'data/local-assets/dc-batman-arcade')
const read = (d, n) => readFileSync(resolve(d, n)),
  json = (d, n) => JSON.parse(read(d, n)),
  sha = (x) => createHash('sha256').update(x).digest('hex'),
  write = (d, n, v) => writeFileSync(resolve(d, n), `${JSON.stringify(v, null, 2)}\n`)
const actor = json(assets, 'actor.json'),
  candidate = json(cache, 'actor.json'),
  source = json(cache, 'source-proof.json'),
  pixels = json(cache, 'native-pixels/proof.json'),
  link = json(pack, 'evidence/link.json'),
  coverage = json(pack, 'evidence/coverage/proof.json'),
  projectile = json(pack, 'evidence/projectile/proof.json'),
  selection = json(pack, 'evidence/selection/proof.json'),
  baseHash = sha(read(root, 'library/catalog/fighter/module.js')),
  moduleHash = sha(read(pack, 'module.js'))
assert.deepEqual(actor.frames, candidate.frames)
assert.deepEqual(actor.animations, candidate.animations)
assert.deepEqual(actor.projectile, candidate.projectile)
assert.equal(source.actorSha256, sha(read(cache, 'actor.json')))
assert.equal(source.mismatches, 0)
assert.equal(source.frames.length, 33)
assert.equal(source.sourceSha256, sha(read(assets, 'sources/31098.png')))
for (const [file, hash] of Object.entries(source.oldPackUnchanged))
  assert.equal(sha(read(old, file)), hash, `Old partial pack unchanged:${file}`)
assert.equal(pixels.actorSha256, source.actorSha256)
assert.equal(pixels.moduleSha256, baseHash)
assert.equal(pixels.comparisons, 66)
assert.equal(pixels.mismatches, 0)
assert.ok(pixels.results.every((r) => r.renders.every((v) => !v.mismatches && !v.clipped)))
assert.equal(link.actorSha256, sha(read(assets, 'actor.json')))
assert.equal(link.actorSha256, sha(read(pack, 'actor.json')))
assert.equal(link.moduleSha256, moduleHash)
assert.equal(link.baseModuleSha256, baseHash)
assert.equal(link.sourceCandidateSha256, source.actorSha256)
for (const p of [coverage, projectile, selection]) assert.equal(p.moduleSha256, moduleHash)
assert.equal(coverage.cases.length, 30)
assert.equal(projectile.cases.length, 5)
assert.equal(selection.cases.length, 2)
assert.equal(selection.demoSha256, sha(read(pack, 'demo.js')))
const damage = { light: 7, heavy: 14, sweep: 10, airLight: 8, airHeavy: 12 }
for (const c of coverage.cases) {
  assert.deepEqual(c.errors, [])
  if (damage[c.mode]) assert.equal(c.final.fighters[1 - c.owner].hp, 100 - damage[c.mode])
  if (['guard', 'crouchGuard'].includes(c.mode)) {
    assert.equal(c.final.fighters[c.owner].hp, 100)
    assert.ok(c.captures.some((s) => s.state.fighters[c.owner].blockStun > 0))
  }
  if (c.mode === 'ko') assert.equal(c.final.fighters[c.owner].hp, 0)
}
for (const c of projectile.cases) {
  assert.deepEqual(c.errors, [])
  if (['hit', 'mirrored'].includes(c.mode)) assert.equal(c.resolved.fighters[1 - c.owner].hp, 83)
  if (c.mode === 'guard') assert.equal(c.resolved.fighters[1 - c.owner].hp, 99)
  if (c.mode === 'jump') assert.equal(c.resolved.fighters[1 - c.owner].hp, 100)
}
for (const c of selection.cases) {
  assert.deepEqual(c.errors, [])
  const get = (n) => c.captures.find((s) => s.label === n)
  assert.equal(get('unlocked').state.phase, 'select')
  assert.equal(get('waiting').state.phase, 'select')
  assert.equal(get('fight').state.phase, 'fight')
  if (c.players === 2) {
    assert.deepEqual(get('unlocked').state.selection.locked, [false, false])
    assert.deepEqual(get('waiting-for-p2').state.selection.locked, [true, false])
    assert.deepEqual(
      get('fight').state.fighters.map((f) => f.id),
      ['flash', 'batman-atari-reference'],
    )
  } else assert.equal(get('unlocked').state.selection.humans, 1)
}
for (const [dir, p] of [
  ['coverage', coverage],
  ['projectile', projectile],
  ['selection', selection],
])
  for (const c of p.cases)
    for (const s of c.captures) assert.equal(s.sha256, sha(read(pack, `evidence/${dir}/${s.file}`)))
for (const [file, dest] of [
  ['source-proof.json', 'source-rgba.json'],
  ['native-pixels/proof.json', 'native-pixels.json'],
  ['contact.png', 'contact.png'],
  ['throw-contact.png', 'throw-contact.png'],
])
  copyFileSync(resolve(cache, file), resolve(assets, 'evidence', dest))
const review = {
  date: '2026-09-19',
  scope:
    'Complete documented fighter1.3 adaptation using actual source Batman poses, with explicit reused neutral/defensive/aerial poses. Not original-game animation completeness.',
  frames: 33,
  clips: 17,
  nativeComparisons: 66,
  mismatches: 0,
  coverageCases: 30,
  projectileCases: 5,
  actualDemoCases: 2,
  sourceSha256: source.sourceSha256,
  actorSha256: link.actorSha256,
  baseModuleSha256: baseHash,
  adapterSha256: moduleHash,
  old22FramePackUnchanged: true,
  visual:
    'Source sheet,33-frame contact, actual kick and proneKO, guard contact, source throw/socket/held-prop crop, brighter-sky native gameplay and1P/2P selection inspected. Dark source suit retained without recolor.',
  provenance:
    'Atari Batman arcade sheet31098, Yawackhary. Native source RGB after nearest2/3 scaling; green backing transparent, two disconnected unused-marker asterisks excluded at explicit rectangles. Authored timing/anchors/boxes. Source prop is extracted from held pixels, not a separately labelled flight sprite; identity and original animation semantics uncertain.',
  limitations: candidate.provenance.limitations,
  evidence: Object.fromEntries(
    [
      ['source', read(cache, 'source-proof.json')],
      ['pixels', read(cache, 'native-pixels/proof.json')],
      ['coverage', read(pack, 'evidence/coverage/proof.json')],
      ['projectile', read(pack, 'evidence/projectile/proof.json')],
      ['selection', read(pack, 'evidence/selection/proof.json')],
      ['contact', read(cache, 'contact.png')],
      ['held-prop-contact', read(cache, 'throw-contact.png')],
    ].map(([n, b]) => [n, sha(b)]),
  ),
}
write(assets, 'evidence/review.json', review)
write(pack, 'evidence/review.json', review)
const check = (dir, name, artifact) => ({
  name,
  passed: true,
  artifact,
  artifactHash: sha(read(dir, artifact)),
})
write(assets, 'quality.json', {
  schemaVersion: 1,
  status: 'source-checked',
  fighterReady: true,
  fighterReadyScope:
    'Complete tested authored fighter1.3 adaptation; declared source-pose reuse, not original state recovery',
  contentHash: assetPackHash(assets, json(assets, 'manifest.json')),
  checks: [
    check(assets, 'integrity', 'evidence/source-rgba.json'),
    check(assets, 'visual', 'evidence/review.json'),
    check(assets, 'provenance', 'evidence/review.json'),
  ],
})
const part = loadCatalog(resolve(root, 'data/local-catalog')).find(
  (p) => p.manifest.id === 'batman-atari-fighter-reference',
)
assert.ok(part)
write(pack, 'quality.json', {
  schemaVersion: 1,
  status: 'verified',
  contentHash: part.hash,
  checks: [
    check(pack, 'behavior', 'evidence/coverage/proof.json'),
    check(pack, 'visual', 'evidence/review.json'),
    check(pack, 'runtime-1p', 'evidence/projectile/proof.json'),
    check(pack, 'runtime-2p', 'evidence/projectile/proof.json'),
    check(pack, 'character-selection', 'evidence/selection/proof.json'),
  ],
})
assert.equal(
  loadSpriteCatalog([], resolve(root, 'data/local-assets')).find(
    (s) => s.id === 'dc-batman-atari-fighter/batman',
  ).status,
  'source-checked',
)
assert.equal(
  loadCatalog(resolve(root, 'data/local-catalog')).find(
    (p) => p.manifest.id === 'batman-atari-fighter-reference',
  ).status,
  'verified',
)
console.log(JSON.stringify(review, null, 2))
