// Prepare a private draft from reviewed source crops. Admission is a separate,
// content-bound review after native playthrough and visual checks.
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'data/reference-cache/spriters-resource/pole-position')
const out = resolve(root, 'data/local-catalog/pole-position-racer-reference')
const base = resolve(root, 'library/catalog/kart')
const read = (dir, name) => readFileSync(resolve(dir, name), 'utf8')
const json = (dir, name) => JSON.parse(read(dir, name))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const write = (name, value) =>
  writeFileSync(
    resolve(out, name),
    typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
  )

const look = json(source, 'kart-config.json')
const assets = json(source, 'source-assets.json')
const integrity = json(source, 'integrity.json')
const factory = read(base, 'module.js')
if (!integrity.exactSourceColors || integrity.quantization || integrity.spatialResampling)
  throw Error('Expected reviewed native source crops with exact palettes')
if (!Array.isArray(look.drivers) || !look.drivers.length)
  throw Error('Expected reviewed source driver configuration')
mkdirSync(resolve(out, 'sources'), { recursive: true })
for (const id of ['94319', '97926']) {
  const bytes = readFileSync(resolve(source, `${id}.png`))
  const metadata = json(source, `${id}.json`)
  if (sha(bytes) !== metadata.sha256) throw Error(`Source changed: ${id}`)
  copyFileSync(resolve(source, `${id}.png`), resolve(out, 'sources', `${id}.png`))
  write(`sources/${id}.json`, metadata)
}
write('assets.json', {
  schemaVersion: 1,
  sets: Object.fromEntries(assets.vehicles.map((vehicle) => [vehicle.id, vehicle])),
  provenance: assets.provenance,
  license: {
    spdx: 'LicenseRef-Commercial-Reference',
    notes:
      'Private imported artwork; archive availability does not confer a redistribution license.',
  },
})
write('source-map.json', json(source, 'sheet-map.json'))
write('import-integrity.json', integrity)
write(
  'module.js',
  `(function(){
const base=(${factory});
const look=${JSON.stringify(look)};
return function(config={}){
  const drivers=look.drivers.map((driver,i)=>({...driver,...(config.drivers?.[i]||{})}));
  return base({...look,...config,drivers,assets:{...look.assets,...config.assets}});
};
})()\n`,
)
write(
  'demo.js',
  'let game;\nfunction init(api){game=ARCADE.kart();game.init(api)}\nfunction update(api,dt){game.update(api,dt)}\nfunction draw(api){game.draw(api)}\n',
)
const spec = json(base, 'spec.json')
write('spec.json', {
  ...spec,
  title: 'POLE POSITION CIRCUIT',
  oneLiner: 'Steer the F1 car through bends and beat the rivals to the finish.',
  note: 'Local source-art adaptation of the project racer. Original circuit, drift and split-screen rules; no original Pole Position program or qualification mode.',
})
write(
  'api.md',
  `# Local Pole Position art adaptation: ARCADE.kart(config)

This local pack bundles reviewed F1 car steering, wheel and crash frames from The Spriters Resource with exact source palettes. Call ARCADE.kart() to use them; do not emit their pixel arrays. Driver name overrides preserve the imported sprite set unless sprites are explicitly replaced. Native crops are retained in the catalog; road-distance projection scales them with nearest-neighbor sampling at draw time.

The driving physics, road projection, circuit layout, AI rivals, scoring, drift boosts and two-player split-screen rules remain the project's kart engine. This is not original Pole Position code, original track topology, qualification-to-race structure or recovered animation timing. Source gantries, signs and maps remain reference material unless explicitly supported by the art configuration. Keep these limits truthful.

${read(base, 'api.md').replace('all 18 original 32×32 vehicle frames and scenery logic are bundled', 'source vehicle overrides and the project scenery logic are bundled')}
`,
)
write('manifest.json', {
  schemaVersion: 1,
  id: 'pole-position-racer-reference',
  version: '1.0.0',
  title: 'Pole Position — local source-art racer',
  description:
    'Reviewed source F1 car poses on the project racing controller. Original circuit and drift mechanics with 1P AI rivals or 2P split-screen.',
  tags: ['pole position', 'racing', 'rear-view', 'f1', 'circuit'],
  match: {
    phrases: ['pole position'],
    genres: ['racing', 'arcade racing', 'circuit racing'],
    priority: 1,
    requirePhrase: true,
  },
  supportsPlayers: [1, 2],
  module: 'module.js',
  entry: 'kart',
  apiVersion: 1,
  license: {
    spdx: 'LicenseRef-Commercial-Reference',
    notes:
      'Private local source-art adaptation; no redistribution license inferred from archive availability.',
  },
  provenance: {
    kind: 'derived',
    authors: [
      'Arcade project (controller and adapter)',
      'Sonicfan32 (car sheet and miscellaneous contributor)',
      'Yawackhary (miscellaneous sheet uploader)',
    ],
    sources: [
      'https://www.spriters-resource.com/arcade/poleposition/asset/94319/',
      'https://www.spriters-resource.com/arcade/poleposition/asset/97926/',
    ],
    createdAt: '2026-09-19',
    baseModuleSha256: sha(factory),
  },
  quality: { status: 'draft' },
  assets: ['assets.json'],
  files: [
    'sources/94319.png',
    'sources/94319.json',
    'sources/97926.png',
    'sources/97926.json',
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
