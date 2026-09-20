// Build a private draft from the inspected local import. This does not download
// art or grant admission; the ordinary content/evidence gates still apply.

import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'data/reference-cache/spriters-resource/donkey-kong')
const out = resolve(root, 'data/local-catalog/dk-climber-reference')
const base = resolve(root, 'library/catalog/climber')
const read = (dir, name) => readFileSync(resolve(dir, name), 'utf8')
const json = (dir, name) => JSON.parse(read(dir, name))
const write = (name, value) =>
  writeFileSync(
    resolve(out, name),
    typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
  )
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const config = json(source, 'climber-config.json')
const factory = read(base, 'module.js')
const audit = json(source, 'integrity.json')
if (!audit.originalPixelsPreserved || audit.spatialScalingApplied)
  throw Error('Expected reviewed native-size source crops')
mkdirSync(resolve(out, 'sources'), { recursive: true })
for (const id of ['252263', '106602']) {
  const bytes = readFileSync(resolve(source, `${id}.png`))
  const metadata = json(source, `${id}.json`)
  if (sha(bytes) !== metadata.sha256) throw Error(`Source changed: ${id}`)
  copyFileSync(resolve(source, `${id}.png`), resolve(out, 'sources', `${id}.png`))
  write(`sources/${id}.json`, metadata)
}
write('assets.json', json(source, 'source-assets.json'))
write('import-integrity.json', audit)
write('source-map.json', json(source, 'sheet-map.json'))
write(
  'module.js',
  `(function(){\nconst base=(${factory});\nconst look=${JSON.stringify(config)};\nreturn function(config={}){return base({...look,...config,art:{...look.art,...config.art}})};\n})()\n`,
)
write(
  'demo.js',
  'let game;\nfunction init(api){game=ARCADE.climber();game.init(api)}\nfunction update(api,dt){game.update(api,dt)}\nfunction draw(api){game.draw(api)}\n',
)
const spec = json(base, 'spec.json')
write('spec.json', {
  ...spec,
  title: 'DONKEY KONG CLIMB',
  oneLiner: 'Climb the girders, jump barrels and reach Pauline.',
  mechanics: spec.mechanics.map((s) =>
    s
      .replaceAll('kitten', 'Pauline')
      .replaceAll('at the upper-right cage', 'on the upper-right girder'),
  ),
  scoring: spec.scoring.replaceAll('kitten', 'Pauline'),
  note: 'Local source-art adaptation of the project climber. Not a reproduction of original arcade code or levels.',
})
write(
  'api.md',
  `# Local Donkey Kong art adaptation: ARCADE.climber(config)\n\nThis local pack bundles inspected Mario, Pauline, Donkey Kong, barrel and flame sprite frames from The Spriters Resource with exact PNG colors and native dimensions. Use ARCADE.climber() to use them; do not print their pixel arrays. The ordinary climber configuration below remains supported. The default avatars are Mario (both players, with separate P1/P2 markers), target is Pauline, cage is hidden, and stage-clear text is PAULINE RESCUED! Overrides supplied by the user still take precedence.\n\nThe levels, physics, scoring and cooperative mode remain the project's tested climber, not original Donkey Kong code or stage topology. Hammer combat, lifts and rivet removal are NOT provided. Hurt uses a death pose, rescued uses waiting poses, and explosion uses a source impact effect; these are documented adapter choices, not recovered animation semantics. Keep these limits truthful. Tile/hammer images in the source cache are references, not implemented mechanics.\n\n${read(base, 'api.md').replace('The bundled factory includes the complete original scene, 33 saved sprite frames and physics.', 'The bundled factory includes the project scene/physics and local source sprite overrides.').replaceAll('kitten', 'Pauline').replaceAll('original workers in blue/red overalls and distinct helmets', 'imported Mario frames with separate player markers').replace('default target is an original Pauline', 'default target is imported Pauline').replace('default true; false removes', 'default false in this local pack; false removes').replace('Default `CAT RESCUED!`', 'Default `PAULINE RESCUED!`').replace('The gorilla/worker/Pauline are original themed characters. This captures a classic barrel-and-ladder arcade structure; it does not reproduce a copyrighted level, art sheet or original source.', 'This local variant uses the imported characters described above on original project mechanics. It does not reproduce original levels or source code.')}\n`,
)
write('manifest.json', {
  schemaVersion: 1,
  id: 'dk-climber-reference',
  version: '1.0.0',
  title: 'Donkey Kong — local source-art climber',
  description:
    'Native-size source Mario, Pauline, Donkey Kong and hazards on the tested barrel/ladder controller. Original project levels and cooperative rules; no hammer, lifts or original ROM behavior.',
  tags: ['donkey kong', 'barrel ladder platformer', 'mario', 'pauline'],
  match: {
    phrases: ['donkey kong'],
    genres: ['barrel ladder platformer', 'barrel climber', 'ladder platformer'],
    priority: 1,
    requirePhrase: true,
  },
  supportsPlayers: [1, 2],
  module: 'module.js',
  entry: 'climber',
  apiVersion: 1,
  license: {
    spdx: 'LicenseRef-Commercial-Reference',
    notes:
      'Private local source-art adaptation. No redistribution license inferred from archive availability.',
  },
  provenance: {
    kind: 'derived',
    authors: [
      'Arcade project (controller and adapter)',
      '125scratch (character sheet uploader)',
      'Superjustinbros (tile sheet uploader)',
    ],
    sources: [
      'https://www.spriters-resource.com/arcade/dk/asset/252263/',
      'https://www.spriters-resource.com/arcade/dk/asset/106602/',
    ],
    createdAt: '2026-09-19',
    baseModuleSha256: sha(factory),
  },
  quality: { status: 'draft' },
  assets: ['assets.json'],
  files: [
    'sources/252263.png',
    'sources/252263.json',
    'sources/106602.png',
    'sources/106602.json',
    'source-map.json',
    'import-integrity.json',
  ],
  api: 'api.md',
  demo: 'demo.js',
  spec: 'spec.json',
})
console.log(
  `Built private draft: ${out}. Verify current content and bind evidence before admission.`,
)
