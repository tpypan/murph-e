// Persist the reviewed local study for curation, without admitting it to generation.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const cache = resolve(root, 'data/reference-cache/spriters-resource/spider-man')
const dir = resolve(root, 'data/local-assets/spider-man-reference')
const hash = (data) => createHash('sha256').update(data).digest('hex')
const read = (name) => readFileSync(resolve(cache, name))
const json = (name) => JSON.parse(read(name))
const character = json('custom-assets-web.json')['spider-man-reference']
const pixels = json('fighter-web-pixels-proof/proof.json')
const gameplay = json('fighter-web-gameplay-proof/proof.json')
const coreHash = hash(readFileSync(resolve(root, 'library/catalog/fighter/module.js')))
assert.equal(pixels.assetSha256, hash(read('custom-assets-web.json')))
assert.equal(gameplay.assetSha256, pixels.assetSha256)
assert.equal(pixels.moduleSha256, coreHash)
assert.equal(gameplay.moduleSha256, coreHash)
assert.equal(pixels.frames, 84)
assert.equal(pixels.mismatches, 0)
assert.equal(pixels.nativeComparisons, 168)
assert.deepEqual(
  gameplay.cases.map((c) => c.mode),
  ['hit', 'mirrored', 'block', 'jump', 'cpu'],
)
for (const c of gameplay.cases) assert.deepEqual(c.errors, [])
assert.ok(
  !existsSync(resolve(dir, 'quality.json')),
  'Do not overwrite an admitted actor with this draft importer',
)
mkdirSync(resolve(dir, 'evidence'), { recursive: true })
mkdirSync(resolve(dir, 'sources'), { recursive: true })
const sheet = resolve(cache, '../marvel-spider-man-275483.png')
assert.equal(hash(readFileSync(sheet)), character.provenance.sourceSha256)
copyFileSync(sheet, resolve(dir, 'sources/275483.png'))
const write = (name, value) =>
  writeFileSync(
    resolve(dir, name),
    typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
  )
write(
  'LICENSE.md',
  'Commercial game artwork from Marvel vs. Capcom, cached for this private local study. Archive availability does not grant redistribution rights. Original controller code, effect timing, anchors and collision are authored by this project.\n',
)
write('actor.json', {
  id: 'spider-man',
  subject: 'Spider-Man — authored side-view fighter adaptation',
  camera: 'side-view',
  ...character,
  coordinates:
    'feet-relative boxes; source frame pixel-center anchors; right-facing positive x and negative y above feet',
  source: {
    path: 'sources/275483.png',
    sha256: character.provenance.sourceSha256,
    url: character.provenance.sourcePage,
  },
  unsupportedStates: ['throws', 'wall-climb', 'air-web-swing', 'original-game combo tree'],
  integration: {
    factory: 'ARCADE.fighter',
    version: '1.2.0',
    moduleSha256: coreHash,
    assetSha256: pixels.assetSha256,
    status: 'draft',
    pending: [
      'Full move-by-move visual/gameplay review beyond web and reaction states',
      'Body proportions and staging at native screen resolution',
      'Human playfeel and balance review',
    ],
    originalTimingRecovered: false,
  },
})
write('manifest.json', {
  schemaVersion: 1,
  id: 'spider-man-reference',
  version: '0.1.0',
  title: 'Spider-Man local fighter study',
  camera: 'side-view',
  description:
    'Draft 84-frame source-art adaptation: 16 character clips, three web effects, authored emission and finite bind metadata. Not admitted for generator retrieval.',
  license: {
    spdx: 'LicenseRef-Commercial-Reference',
    localNotice: 'LICENSE.md',
    notes: 'Private cached commercial artwork; no redistribution permission inferred.',
  },
  provenance: {
    kind: 'derived',
    sourcePage: character.provenance.sourcePage,
    uploader: character.provenance.uploader,
    sourceSha256: character.provenance.sourceSha256,
    importScript: 'scripts/import-spider-web.py',
    storeScript: 'scripts/store-spider-draft.mjs',
  },
  actors: [
    {
      id: 'spider-man',
      file: 'actor.json',
      tags: ['spider man', 'spiderman', 'marvel', 'fighter', 'side view'],
    },
  ],
  props: [],
})
write('evidence/native-pixels.json', pixels)
write('evidence/gameplay.json', gameplay)
write('evidence/web-import.json', json('web-import/proof.json'))
write('evidence/reactions-import.json', json('reviewed-reactions/proof.json'))
write(
  'README.md',
  '# Private Spider-Man draft\n\nThis set is discoverable and indexed as draft. It must not be offered to generation until reviewed and admitted through the normal content-hash evidence gate. Source artwork and authored 60Hz timing, anchors, hit/hurt geometry, emission sockets and web behavior are preserved together in actor.json. The original game timing/state semantics have not been recovered. Evidence covers source-color parity and web gameplay, not the complete quality requirement. Regenerate with scripts/store-spider-draft.mjs after offline source/gameplay proof.\n',
)
console.log(
  JSON.stringify({
    path: dir,
    frames: Object.keys(character.frames).length,
    clips: Object.keys(character.animations).length,
    status: 'draft',
  }),
)
