// Source-only admission for the visually reviewed partial DC actors; no fighter admission.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assetPackHash, loadSpriteCatalog } from '../packages/harness/src/sprite-catalog.ts'

const root = resolve(import.meta.dirname, '..')
const digest = (data) => createHash('sha256').update(data).digest('hex')
const expected = {
  batman: {
    frames: 22,
    source: 'b394fc88ff78734fe1976da90d3d081e1665c5f151d7fad5975d8e1f20b23c2a',
  },
  joker: { frames: 23, source: '01fb6386debd5cf978af52806e64dd0f3a21d128dc5671072c03205c0346f8f0' },
  superman: {
    frames: 16,
    source: 'f4a0cd3f73623bb2d1b441cb269c46b4aa25dac187d48b456e5f374db27f5579',
  },
}
for (const [name, known] of Object.entries(expected)) {
  const dir = resolve(root, `data/local-assets/dc-${name}-arcade`)
  const read = (p) => readFileSync(resolve(dir, p))
  const json = (p) => JSON.parse(read(p))
  const manifest = json('manifest.json'),
    actor = json('actor.json'),
    proof = json('evidence/source-rgba.json')
  assert.equal(digest(read(actor.source.path)), known.source)
  assert.equal(proof.actorSha256, digest(read('actor.json')))
  assert.equal(proof.totalFrames, known.frames)
  assert.equal(Object.keys(actor.frames).length, known.frames)
  assert.equal(proof.mismatchPixels, 0)
  assert.equal(proof.sourceUnchanged, true)
  assert.ok(proof.frames.every((f) => f.mismatchPixels === 0))
  assert.equal(actor.integration.fighterCompatible, false)
  assert.equal(actor.camera, 'side-view')
  assert.equal(actor.provenance.platform, 'Arcade')
  const evidence = {
    date: '2026-09-19',
    scope:
      'Source integrity, visual crop review and provenance for declared partial clips only. No fighter/gameplay readiness asserted.',
    sourcePage: actor.source.url,
    sourceSha256: known.source,
    actorSha256: proof.actorSha256,
    importProofSha256: digest(read('evidence/source-rgba.json')),
    contactSha256: digest(read('evidence/contact.png')),
    reviewedFrames: Object.keys(actor.frames),
    integrity:
      'Native RGB/palette-plane decoding was independently compared against original source crops; all reported locations match.',
    visual:
      'Original sheet and final labeled native contact were visually inspected. Neighboring frame cutoffs were corrected before this admission. Joker hat/no-hat groups remain separate; only clearly separated crouch art is included.',
    provenance:
      'Archive game and character pages verified Arcade category, game title and uploader; exact observed PNG downloads are privately retained with hashes and rights notice.',
    limitations: [
      'Partial pose clips only',
      'Authored preview timing and bottom-center anchors',
      'No hit/hurt collision boxes',
      'No complete fighter adapter or gameplay proof',
    ],
  }
  const text = `${JSON.stringify(evidence, null, 2)}\n`
  writeFileSync(resolve(dir, 'evidence/source-review.json'), text)
  const quality = {
    schemaVersion: 1,
    contentHash: assetPackHash(dir, manifest),
    status: 'source-checked',
    fighterReady: false,
    scope: evidence.scope,
    checks: ['integrity', 'visual', 'provenance'].map((name) => ({
      name,
      passed: true,
      artifact: 'evidence/source-review.json',
      artifactHash: digest(text),
    })),
  }
  writeFileSync(resolve(dir, 'quality.json'), `${JSON.stringify(quality, null, 2)}\n`)
}
const issues = []
const sprites = loadSpriteCatalog([], resolve(root, 'data/local-assets'), issues).filter((s) =>
  s.packId.startsWith('dc-'),
)
assert.deepEqual(issues, [])
assert.equal(sprites.length, 3)
assert.ok(sprites.every((s) => s.status === 'source-checked'))
console.log(
  JSON.stringify(
    sprites.map((s) => ({
      id: s.id,
      status: s.status,
      frames: Object.keys(s.frames).length,
      clips: Object.keys(s.animations),
      fighterReady: false,
    })),
    null,
    2,
  ),
)
