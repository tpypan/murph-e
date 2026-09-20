// Separate private source pack and ART-linked fighter adapter; old partial actor stays immutable.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadSpriteCatalog } from '../packages/harness/src/sprite-catalog.ts'
import { linkSpriteAssets } from '../packages/harness/src/sprite-link.ts'

const root = resolve(import.meta.dirname, '..'),
  cache = resolve(root, 'data/reference-cache/spriters-resource/dc-arcade/batman-fighter'),
  assets = resolve(root, 'data/local-assets/dc-batman-atari-fighter'),
  pack = resolve(root, 'data/local-catalog/batman-atari-fighter-reference'),
  base = resolve(root, 'library/catalog/fighter')
const read = (d, n) => readFileSync(resolve(d, n), 'utf8'),
  json = (d, n) => JSON.parse(read(d, n)),
  sha = (x) => createHash('sha256').update(x).digest('hex'),
  write = (d, n, v) =>
    writeFileSync(resolve(d, n), typeof v === 'string' ? v : `${JSON.stringify(v, null, 2)}\n`)
assert.ok(!existsSync(resolve(assets, 'quality.json')), 'Do not overwrite admitted source actor')
const actor = json(cache, 'actor.json'),
  module = read(base, 'module.js')
actor.id = 'batman'
actor.integration = {
  fighterCompatible: true,
  factory: 'ARCADE.fighter',
  version: '1.3.0',
  status: 'compatible; admission is reported by quality.json',
  originalTimingRecovered: false,
}
for (const dir of [assets, pack]) {
  mkdirSync(resolve(dir, 'sources'), { recursive: true })
  mkdirSync(resolve(dir, 'evidence'), { recursive: true })
  copyFileSync(
    resolve(root, 'data/local-assets/dc-batman-arcade/sources/31098.png'),
    resolve(dir, 'sources/31098.png'),
  )
  write(dir, 'actor.json', actor)
  write(
    dir,
    'LICENSE.md',
    'Private commercial Batman Atari1991 source reference, sheet31098 uploaded by Yawackhary. No redistribution grant inferred. Authored crop encoding, two-thirds scaling, pose mapping, timing, pivots, collision and projectile motion.\n',
  )
}
write(assets, 'manifest.json', {
  schemaVersion: 1,
  id: 'dc-batman-atari-fighter',
  version: '1.0.0',
  title: 'Batman Atari — authored source fighter',
  camera: 'side-view',
  description:
    '33 exact-color scaled source frames,16 character clips and a held-prop extraction. Explicit neutral/guard/aerial pose reuse and authored flight; not original-game animation semantics.',
  license: {
    spdx: 'LicenseRef-Commercial-Reference',
    localNotice: 'LICENSE.md',
    notes: 'Private source reference.',
  },
  provenance: {
    kind: 'derived',
    sourcePage: actor.source.url,
    uploader: 'Yawackhary',
    sourceSha256: actor.source.sha256,
    importScript: 'scripts/import-batman-fighter.py',
  },
  actors: [
    {
      id: 'batman',
      file: 'actor.json',
      tags: ['batman', 'dc comics', 'dc universe', 'fighter', 'side view', 'atari batman'],
    },
  ],
  props: [],
})
const sprite = loadSpriteCatalog([], resolve(root, 'data/local-assets')).find(
  (s) => s.id === 'dc-batman-atari-fighter/batman',
)
assert.ok(sprite)
const linked = linkSpriteAssets([sprite])
const converted = Function(
  `${linked};return ART.get('dc-batman-atari-fighter/batman').character()`,
)()
for (const [n, f] of Object.entries(actor.frames)) {
  for (const key of ['pixels', 'palette', 'layers', 'anchor'])
    assert.deepEqual(converted.frames[n][key], f[key])
}
assert.deepEqual(converted.projectile, actor.projectile)
const defaults = {
  roster: ['batman-atari-reference', 'flash'],
  selectionNames: { 'batman-atari-reference': 'BATMAN', flash: 'FLASH' },
  roundsToWin: 2,
  stageColors: { sky: 13 },
}
write(
  pack,
  'module.js',
  `(function(){${linked}\nconst base=(${module.trim().replace(/;\s*$/, '')});return function(config={}){return base({...${JSON.stringify(defaults)},...config,assets:{'batman-atari-reference':ART.get('dc-batman-atari-fighter/batman').character(),...(config.assets||{})}})}})()\n`,
)
write(
  pack,
  'demo.js',
  "let game;function init(api){game=ARCADE.fighter({characterSelect:true,selectableRoster:['batman-atari-reference','flash']});game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api)}\n",
)
write(
  pack,
  'api.md',
  "# ARCADE.fighter(config): Batman Atari Rooftop Duel\n\nPrivate named demo adapter using actual Atari Batman source artwork through ART.get('dc-batman-atari-fighter/batman').character(), with Flash as opponent. Factory defaults roster ['batman-atari-reference','flash'], identity-based selectionNames and2 rounds. Actual demo enables independent character selection; factory defaults direct combat for explicit fixtures. Left/Right chooses, A confirms, B unlocks. Both2P humans must confirm;1P has CPU opponent. Combat: Left/Right move, away guards, Up jumps, Down crouches, A light, B heavy, Down+A low kick, Down+B metered throw; A/B in air both use actual flying-kick art with distinct authored timing. Victory uses a neutral ready hold; no original celebration claimed. Curved held-object crop travels with authored motion; it is not a separately labelled recovered batarang animation. Original source RGB retained after nearest2/3 scaling; timing, collision and pivots are authored. Original grappling, throws and original game physics unsupported. Custom stage sky improves black-suit contrast without recoloring source. Supported common fighter1.3 config includes roster/names/selectionNames, characterSelect/selectableRoster/cpuCharacter, roundsToWin/roundSeconds/difficulty/sound/moves/specials/assets/stageColors/debugHitboxes. Only exact demo-title requests should select this foundation.\n",
)
write(pack, 'spec.json', {
  ...json(base, 'spec.json'),
  title: 'BATMAN ATARI: ROOFTOP DUEL',
  oneLiner: 'Select source-art Atari Batman or Flash for an authored rooftop duel.',
  artDirection:
    'Native black-suit Atari Batman colors after two-thirds nearest scaling, brighter original skyline for contrast.',
  referenceIntent: {
    reference: 'Atari Batman source fighter adaptation',
    preserve: [
      'actual recognizable black-suit Batman art',
      'source kick and actual collapse/prone',
      'curved held-prop pixels',
    ],
    change: [
      'authored controller and rounds',
      'neutral victory hold',
      'shared flying-kick poses for both aerial buttons',
      'authored projectile travel',
    ],
  },
})
write(pack, 'manifest.json', {
  schemaVersion: 1,
  id: 'batman-atari-fighter-reference',
  version: '1.0.0',
  title: 'Batman Atari — Rooftop Duel',
  description: 'Source-art Atari Batman and Flash duel with honest authored animation reuse.',
  tags: ['atari batman', 'batman', 'fighting'],
  match: {
    phrases: ['batman atari rooftop duel', 'atari rooftop duel'],
    genres: [],
    requirePhrase: true,
    priority: 1,
  },
  supportsPlayers: [1, 2],
  module: 'module.js',
  entry: 'fighter',
  apiVersion: 1,
  license: {
    spdx: 'LicenseRef-Commercial-Reference',
    notes: 'Private source artwork; original project controller.',
  },
  provenance: {
    kind: 'derived',
    authors: ['Arcade project', 'Yawackhary (source uploader)'],
    createdAt: '2026-09-19',
    sources: [actor.source.url],
    baseModuleSha256: sha(module),
  },
  quality: { status: 'draft' },
  assets: [],
  files: ['actor.json', 'sources/31098.png', 'LICENSE.md', 'demo.js', 'spec.json'],
})
write(pack, 'evidence/link.json', {
  actorSha256: sha(read(assets, 'actor.json')),
  sourceCandidateSha256: sha(read(cache, 'actor.json')),
  moduleSha256: sha(read(pack, 'module.js')),
  baseModuleSha256: sha(module),
  helper: 'ART.get(...).character()',
  exactPlanesAnchorsProjectile: true,
})
console.log(
  'Built separate candidate source actor and title-only ART-linked adapter; prior partial actor untouched',
)
