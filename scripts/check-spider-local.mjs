// Admit only current source pixels, reviewed full coverage and actual ART-linked native adapter.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadCatalog } from '../packages/harness/src/catalog.ts'
import { assetPackHash, loadSpriteCatalog } from '../packages/harness/src/sprite-catalog.ts'

const root = resolve(import.meta.dirname, '..'),
  assets = resolve(root, 'data/local-assets/spider-man-reference'),
  pack = resolve(root, 'data/local-catalog/spider-man-fighter-reference'),
  cache = resolve(root, 'data/reference-cache/spriters-resource/spider-man')
const read = (d, n) => readFileSync(resolve(d, n)),
  json = (d, n) => JSON.parse(read(d, n)),
  sha = (x) => createHash('sha256').update(x).digest('hex'),
  write = (d, n, v) => writeFileSync(resolve(d, n), `${JSON.stringify(v, null, 2)}\n`)
const actor = json(assets, 'actor.json'),
  original = json(cache, 'custom-assets-web.json')['spider-man-reference'],
  pixel = json(cache, 'fighter-web-pixels-proof/proof.json'),
  link = json(pack, 'evidence/link.json'),
  coverage = json(pack, 'evidence/coverage/proof.json'),
  web = json(pack, 'evidence/web/proof.json'),
  selection = json(pack, 'evidence/selection/proof.json'),
  moduleHash = sha(read(root, 'library/catalog/fighter/module.js')),
  adapterHash = sha(read(pack, 'module.js'))
assert.deepEqual(actor.frames, original.frames)
assert.deepEqual(actor.projectile, original.projectile)
for (const [name, clip] of Object.entries(original.animations)) {
  assert.deepEqual(actor.animations[name].frames, clip.frames)
  assert.equal(actor.animations[name].loop, clip.loop)
}
assert.equal(sha(read(assets, actor.source.path)), actor.source.sha256)
assert.equal(
  actor.source.sha256,
  '140acafe486efc32761c98cf60134eed376f2f08a1896904abb2e1f3d4ba8c3f',
)
assert.equal(pixel.moduleSha256, moduleHash)
assert.equal(pixel.assetSha256, sha(read(cache, 'custom-assets-web.json')))
assert.equal(pixel.frames, 84)
assert.equal(pixel.nativeComparisons, 168)
assert.equal(pixel.mismatches, 0)
assert.equal(link.baseModuleSha256, moduleHash)
assert.equal(link.moduleSha256, adapterHash)
assert.equal(link.sourceActorSha256, sha(read(assets, 'actor.json')))
assert.equal(sha(read(pack, 'actor.json')), link.sourceActorSha256)
for (const p of [coverage, web, selection]) assert.equal(p.moduleSha256, adapterHash)
assert.equal(selection.demoSha256, sha(read(pack, 'demo.js')))
assert.equal(selection.cases.length, 2)
for (const c of selection.cases) {
  assert.deepEqual(c.errors, [])
  const get = (name) => c.captures.find((s) => s.label === name)
  assert.equal(get('unlocked').state.phase, 'select')
  assert.equal(get('waiting').state.phase, 'select')
  assert.equal(get('fight').state.phase, 'fight')
  if (c.players === 2) {
    assert.deepEqual(get('unlocked').state.selection.locked, [false, false])
    assert.deepEqual(get('waiting-for-p2').state.selection.locked, [true, false])
    assert.deepEqual(
      get('fight').state.fighters.map((f) => f.id),
      ['batman', 'spider-man-reference'],
    )
    assert.ok(get('fight').text.includes('BATMAN') && get('fight').text.includes('SPIDER-MAN'))
  } else assert.equal(get('unlocked').state.selection.humans, 1)
  for (const shot of c.captures)
    assert.equal(shot.sha256, sha(read(pack, `evidence/selection/${shot.file}`)))
}
assert.equal(coverage.cases.length, 30)
assert.equal(web.cases.length, 5)
const damage = { light: 7, heavy: 14, sweep: 10, airLight: 8, airHeavy: 12 }
for (const c of coverage.cases) {
  assert.deepEqual(c.errors, [])
  if (damage[c.mode]) assert.equal(c.final.fighters[1 - c.owner].hp, 100 - damage[c.mode])
  if (['guard', 'crouchGuard'].includes(c.mode)) {
    assert.equal(c.final.fighters[c.owner].hp, 100)
    assert.ok(
      c.captures.some((s) => s.state.fighters[c.owner].blockStun > 0),
      'Actual blocked melee contact',
    )
  }
  if (c.mode === 'ko') assert.equal(c.final.fighters[c.owner].hp, 0)
  for (const shot of c.captures)
    assert.equal(shot.sha256, sha(read(pack, `evidence/coverage/${shot.file}`)))
}
for (const c of web.cases) assert.deepEqual(c.errors, [])
const seen = new Set(
  coverage.cases.flatMap((c) => c.captures.map((s) => s.state.fighters[c.owner].animation)),
)
for (const clip of [
  'idle',
  'walk',
  'jump',
  'crouch',
  'light',
  'heavy',
  'airLight',
  'airHeavy',
  'sweep',
  'guard',
  'crouchGuard',
  'hurt',
  'ko',
  'victory',
  'special',
  'dash',
])
  assert.ok(seen.has(clip), clip)
copyFileSync(
  resolve(cache, 'fighter-web-pixels-proof/proof.json'),
  resolve(assets, 'evidence/native-pixels.json'),
)
copyFileSync(
  resolve(pack, 'evidence/coverage/proof.json'),
  resolve(assets, 'evidence/complete-coverage.json'),
)
copyFileSync(resolve(pack, 'evidence/web/proof.json'), resolve(assets, 'evidence/linked-web.json'))
const review = {
  date: '2026-09-19',
  scope:
    'Complete16-clip source character for documented fighter1.3 adapter, plus3 source web effects. Source-checked and native adapter verified; original game fidelity and human balance are not asserted.',
  sourceSha256: actor.source.sha256,
  sourceActorSha256: link.sourceActorSha256,
  baseModuleSha256: moduleHash,
  adapterSha256: adapterHash,
  frames: 84,
  clips: 19,
  nativeComparisons: 168,
  mismatchPixels: 0,
  realInputCoverageCases: 30,
  webCases: 5,
  actualDemoSelectionCases: 2,
  visual:
    'Reviewed original pose contact, guard/crouch guard, jump, active punch/kick contacts, salute/thumbs-up victory and actual zero-HP grounded KO. Both directions remain recognizable. Exact source suit colors are orange/red-highlighted in this sheet; no canonical-red recolor introduced.',
  behavior:
    'Both-facing grounded and descending air attacks damage exactly once for7/14/10/8/12; guards preserve HP; actual attack sequences reach0HP and groundedKO. Web hits deal17, blocks1, jump misses0; grounded wrap releases, CPU1P and independent2P results complete.',
  provenance:
    'Spriters Resource Marvel vs.Capcom source275483, uploader kilburto; source hashes frozen. Timings, anchors, boxes and jump/guard/victory assignments are explicitly authored; no original state labels inferred.',
  sourcePage: actor.source.url,
  evidence: Object.fromEntries(
    [
      ['native-pixels', read(assets, 'evidence/native-pixels.json')],
      ['complete-coverage', read(pack, 'evidence/coverage/proof.json')],
      ['linked-web', read(pack, 'evidence/web/proof.json')],
      ['link', read(pack, 'evidence/link.json')],
      ['actual-demo-selection', read(pack, 'evidence/selection/proof.json')],
    ].map(([name, bytes]) => [name, sha(bytes)]),
  ),
  limits: actor.provenance.limitations,
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
  fighterReadyScope: 'Tested documented fighter1.3 adapter only',
  contentHash: assetPackHash(assets, json(assets, 'manifest.json')),
  checks: [
    check(assets, 'integrity', 'evidence/native-pixels.json'),
    check(assets, 'visual', 'evidence/review.json'),
    check(assets, 'provenance', 'evidence/review.json'),
  ],
})
const part = loadCatalog(resolve(root, 'data/local-catalog')).find(
  (p) => p.manifest.id === 'spider-man-fighter-reference',
)
assert.ok(part)
write(pack, 'quality.json', {
  schemaVersion: 1,
  status: 'verified',
  contentHash: part.hash,
  checks: [
    check(pack, 'behavior', 'evidence/coverage/proof.json'),
    check(pack, 'visual', 'evidence/review.json'),
    check(pack, 'runtime-1p', 'evidence/web/proof.json'),
    check(pack, 'runtime-2p', 'evidence/web/proof.json'),
    check(pack, 'character-selection', 'evidence/selection/proof.json'),
  ],
})
assert.equal(
  loadSpriteCatalog([], resolve(root, 'data/local-assets')).find(
    (s) => s.id === 'spider-man-reference/spider-man',
  ).status,
  'source-checked',
)
assert.equal(
  loadCatalog(resolve(root, 'data/local-catalog')).find(
    (p) => p.manifest.id === 'spider-man-fighter-reference',
  ).status,
  'verified',
)
console.log(JSON.stringify(review, null, 2))
