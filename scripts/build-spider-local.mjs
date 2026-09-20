// Offline packaging of reviewed source metadata and ART.get(...).character() adapter.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadSpriteCatalog } from '../packages/harness/src/sprite-catalog.ts'
import { linkSpriteAssets } from '../packages/harness/src/sprite-link.ts'

const root = resolve(import.meta.dirname, '..'),
  assets = resolve(root, 'data/local-assets/spider-man-reference'),
  pack = resolve(root, 'data/local-catalog/spider-man-fighter-reference'),
  base = resolve(root, 'library/catalog/fighter'),
  cache = resolve(root, 'data/reference-cache/spriters-resource/spider-man')
const read = (d, f) => readFileSync(resolve(d, f), 'utf8'),
  json = (d, f) => JSON.parse(read(d, f)),
  write = (d, f, v) =>
    writeFileSync(resolve(d, f), typeof v === 'string' ? v : `${JSON.stringify(v, null, 2)}\n`),
  sha = (x) => createHash('sha256').update(x).digest('hex')
assert.ok(
  !existsSync(resolve(assets, 'quality.json')),
  'Review existing admission before rebuilding source',
)
const actor = json(assets, 'actor.json'),
  original = json(cache, 'custom-assets-web.json')['spider-man-reference'],
  module = read(base, 'module.js')
assert.deepEqual(actor.frames, original.frames)
actor.name = 'Spider-Man — source-art fighter adaptation'
actor.provenance = {
  ...actor.provenance,
  coverage:
    '84 exact-color scaled source frames;16 controller character clips and3 actual source web effect clips. Complete for the documented fighter adapter only.',
  limitations: [
    'Nearest9/16 spatial scaling and facing normalization; exact resulting source RGB retained in layered planes',
    'Original Capcom timing, pivots, state labels and collision geometry were not recovered',
    'Jump/guard/victory assignments are reviewed authored adaptations of observed poses',
    'Two-dimensional rooftop duel, not original Marvel vs. Capcom physics, combos, throws or wall movement',
  ],
}
actor.animations.special.mappingNote =
  'Observed hand web-emission poses with actual traveling, impact and bind source effects; authored projectile rules.'
actor.integration = {
  factory: 'ARCADE.fighter',
  version: '1.3.0',
  moduleSha256: sha(module),
  status: 'compatible; admission evidence checked separately',
  fighterCompatible: true,
  originalTimingRecovered: false,
  humanPlayfeelReviewed: false,
}
write(assets, 'actor.json', actor)
const manifest = json(assets, 'manifest.json')
manifest.version = '1.0.0'
manifest.title = 'Spider-Man — source fighter artwork'
manifest.description =
  '84 exact-color scaled source frames,16 complete fighter-adapter clips and3 source web effects; reviewed authored timing and collision, not original ROM mechanics.'
write(assets, 'manifest.json', manifest)
write(
  assets,
  'README.md',
  '# Private Spider-Man source adaptation\n\nComplete for fighter1.3 through ART.get("spider-man-reference/spider-man").character():16 character clips plus actual source traveling web, impact and finite bind. Source colors are exact after nearest9/16 scaling; anchors, timings, boxes, state assignments and mechanics are authored. No original Capcom behavior or human balance certification. quality.json binds actual source/native/gameplay review evidence; absent or stale quality means draft. Unsupported throws, wall-climb, air-web-swing and original combo tree remain explicit.\n',
)
const sprite = loadSpriteCatalog([], resolve(root, 'data/local-assets')).find(
  (s) => s.id === 'spider-man-reference/spider-man',
)
assert.ok(sprite)
const linked = linkSpriteAssets([sprite])
const converted = Function(
  `${linked};return ART.get('spider-man-reference/spider-man').character()`,
)()
for (const [name, f] of Object.entries(actor.frames)) {
  assert.deepEqual(converted.frames[name].pixels, f.pixels)
  assert.deepEqual(converted.frames[name].palette, f.palette)
  assert.deepEqual(converted.frames[name].layers, f.layers)
  assert.deepEqual(converted.frames[name].anchor, f.anchor)
}
assert.deepEqual(converted.projectile, actor.projectile)
mkdirSync(resolve(pack, 'evidence'), { recursive: true })
mkdirSync(resolve(pack, 'sources'), { recursive: true })
copyFileSync(resolve(assets, 'sources/275483.png'), resolve(pack, 'sources/275483.png'))
copyFileSync(resolve(assets, 'LICENSE.md'), resolve(pack, 'LICENSE.md'))
copyFileSync(resolve(assets, 'actor.json'), resolve(pack, 'actor.json'))
const config = {
  roster: ['spider-man-reference', 'flash'],
  selectionNames: { 'spider-man-reference': 'SPIDER-MAN', batman: 'BATMAN', flash: 'FLASH' },
  roundsToWin: 2,
}
write(
  pack,
  'module.js',
  `(function(){${linked}\nconst base=(${module.trim().replace(/;\s*$/, '')});return function(config={}){const character=ART.get('spider-man-reference/spider-man').character();return base({...${JSON.stringify(config)},...config,assets:{'spider-man-reference':character,...(config.assets||{})}})}})()\n`,
)
write(
  pack,
  'demo.js',
  "let game;function init(api){game=ARCADE.fighter({characterSelect:true,selectableRoster:['spider-man-reference','batman','flash'],selectionNames:{'spider-man-reference':'SPIDER-MAN',batman:'BATMAN',flash:'FLASH'}});game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api)}\n",
)
write(
  pack,
  'api.md',
  "# Private Spider-Man adapter: ARCADE.fighter(config)\n\nARCADE.fighter() returns {init(api), update(api,dt), draw(api), inspect()}. This named adapter contains the actual private Spider-Man source set through ART.get('spider-man-reference/spider-man').character(). Its default roster is ['spider-man-reference','flash'], with identity-based selectionNames for Spider-Man, Batman and Flash; the original project-art Batman and Flash sets are also available as 'batman' and 'flash'. Do not recreate pixels or rename another character to Spider-Man.\n\nCreate the factory inside init and delegate update/draw. It owns round flow, HUD and runtime win/gameOver. api.players controls 1P CPU or independent 2P. Default roundsToWin is 2; roundSeconds defaults to 60. Default Spider-Man special is a sourced web projectile with impact art and a temporary grounded bind; Flash uses his dash. This is an authored rooftop fighting adaptation, not the Marvel vs. Capcom ROM.\n\nControls: Left/Right move; hold away to guard. Up jumps. Down crouches. A punches, B kicks, Down+A sweeps, Down+B spends 60 meter on the special. A/B attack in air. Standing guard stops mid/high; crouching guard stops mid/low. Throws, wall-climb, air-web-swing and the original combo tree are unsupported.\n\nOptional configuration: roster (two available IDs), names (optional explicit labels; normally omit so labels follow selected identity), roundsToWin (1\u20135), roundSeconds (15\u2013120), difficulty (0\u20131), sound (boolean), characterSelect (boolean, default false), selectableRoster (available IDs), cpuCharacter and selectionNames. Selection uses Left/Right, A confirms, B unlocks; each human confirms independently. The private demo enables characterSelect with Spider-Man/Batman/Flash; both human cursors begin unlocked and need independent confirmation. Factory callers may opt out; selectionNames supplies identity-based combat labels. No automatic human confirmation.\n\nAdvanced fighter1.3 options remain: moves (per-move startup/active/recovery/stun/damage/push), specials (projectile/dash), debugHitboxes, stageColors and drawStageOverlay. assets may add complete compatible characters; this adapter always provides 'spider-man-reference' unless explicitly overridden. Timing, feet-relative hit/hurt geometry, anchors and web rules are authored and tested. Source RGB is exact after nearest9/16 scaling and mirroring; original source animation labels/timing were not recovered. Do not claim a different requested identity without its own complete compatible set.\n\nExample:\nlet game;\nfunction init(api) { game = ARCADE.fighter(); game.init(api); }\nfunction update(api, dt) { game.update(api, dt); }\nfunction draw(api) { game.draw(api); }\n",
)
write(pack, 'spec.json', {
  ...json(base, 'spec.json'),
  title: 'SPIDER-MAN: ROOFTOP WEB DUEL',
  oneLiner: 'Source-art Spider-Man faces Flash in an authored rooftop fighting adaptation.',
  artDirection:
    'Actual scaled source Spider-Man colors and poses with sourced web effects, on the original rooftop arena.',
  referenceIntent: {
    reference: 'Spider-Man fighter adaptation',
    preserve: [
      'recognizable actual source Spider-Man art',
      'web projectile and temporary grounded trap',
      'source punch/kick/guard/reaction poses',
    ],
    change: [
      'authored move timing and collision',
      'original rooftop arena',
      'project round flow and CPU',
    ],
  },
})
write(pack, 'manifest.json', {
  schemaVersion: 1,
  id: 'spider-man-fighter-reference',
  version: '1.0.0',
  title: 'Spider-Man — Rooftop Web Duel',
  description:
    'Actual source-art Spider-Man on fighter1.3 with full declared move set and source web projectile, impact and brief trap.',
  tags: ['spider man', 'spiderman', 'marvel', 'fighting'],
  match: {
    phrases: ['spider man rooftop web duel', 'rooftop web duel'],
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
    notes: 'Private source artwork; authored controller and levels.',
  },
  provenance: {
    kind: 'derived',
    authors: ['Arcade project', 'kilburto (source sheet uploader)'],
    createdAt: '2026-09-19',
    sources: [actor.source.url],
    baseModuleSha256: sha(module),
  },
  quality: { status: 'draft' },
  assets: [],
  files: ['actor.json', 'sources/275483.png', 'LICENSE.md', 'demo.js', 'spec.json'],
})
write(pack, 'evidence/link.json', {
  sourceActorSha256: sha(read(assets, 'actor.json')),
  baseModuleSha256: sha(module),
  moduleSha256: sha(read(pack, 'module.js')),
  frames: 84,
  clips: 19,
  helper: 'ART.get("spider-man-reference/spider-man").character()',
  exactFramePlanesAnchorsAndProjectile: true,
})
console.log('Built private ART-linked Spider-Man adapter; native verification/admission pending')
