// Offline assembly of reviewed source art and the original momentum controller.
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'data/reference-cache/spriters-resource/sonic')
const base = resolve(root, 'library/catalog/speed-platformer')
const assets = resolve(root, 'data/local-assets/sonic-two-reference')
const pack = resolve(root, 'data/local-catalog/sonic-speed-reference')
const read = (dir, name) => readFileSync(resolve(dir, name), 'utf8')
const json = (dir, name) => JSON.parse(read(dir, name))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const write = (dir, name, data) =>
  writeFileSync(
    resolve(dir, name),
    typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`,
  )
const hero = json(source, 'hero.json')
const objects = json(source, 'objects.json')
const integrity = json(source, 'integrity.json')
const module = read(base, 'module.js').trim().replace(/;\s*$/, '')
const look = { title: 'SONIC: COAST DASH', hero, objects }
if (!integrity.exactRgb || integrity.resampling || integrity.quantization || integrity.mismatches)
  throw Error('Source import did not preserve native pixels')
Function(`return ${module}`)()(look)
const metadata = ['10073', '85563'].map((id) => json(source, `${id}.json`))
for (const dir of [assets, pack]) {
  mkdirSync(resolve(dir, 'sources'), { recursive: true })
  for (const info of metadata) {
    const id = info.assetId
    const bytes = readFileSync(resolve(source, `${id}.png`))
    if (sha(bytes) !== info.sha256 || info.sha256 !== integrity.sources[id])
      throw Error(`Source sheet changed: ${id}`)
    copyFileSync(resolve(source, `${id}.png`), resolve(dir, `sources/${id}.png`))
    write(dir, `sources/${id}.json`, info)
  }
  write(dir, 'import-integrity.json', integrity)
  write(
    dir,
    'LICENSE.md',
    '# Private source reference\n\nSonic the Hedgehog and the Sonic 2 artwork belong to their respective rights holders. The Spriters Resource is the source archive, not a grant of redistribution rights. Keep this private import and its original source sheets under ignored data/.\n\nSonic sheet: Triangly, with Tiaremoana credited. Common Objects: Tiaremoana. Native RGB/cells are preserved. Animation timing, anchors, collision geometry, controller and level layouts are authored adaptations, not recovered original ROM data.\n',
  )
}
write(assets, 'hero.json', hero)
for (const [name, actor] of Object.entries(objects)) write(assets, `${name}.json`, actor)
write(assets, 'manifest.json', {
  schemaVersion: 1,
  id: 'sonic-two-reference',
  version: '1.0.0',
  title: 'Sonic 2 — native source platformer art',
  camera: 'side-view',
  description:
    'Native Sonic movement poses, spinning rings, checkpoint and goal sign; authored runtime timing and anchors.',
  license: {
    spdx: 'LicenseRef-Commercial-Reference',
    localNotice: 'LICENSE.md',
    notes: 'Private local source import; no redistribution grant.',
  },
  provenance: {
    kind: 'derived',
    sources: metadata.map((m) => m.sourcePage),
    importScript: 'scripts/import-sonic-reference.py',
  },
  actors: [
    {
      id: 'sonic',
      file: 'hero.json',
      tags: ['sonic', 'sonic the hedgehog', 'sonic 2', 'side view', 'momentum platformer'],
    },
    ...Object.keys(objects).map((name) => ({
      id: name,
      file: `${name}.json`,
      tags: ['sonic 2', name],
    })),
  ],
  props: [],
})
write(
  pack,
  'module.js',
  `(function(){\nconst base=(${module});\nconst look=${JSON.stringify(look)};\nreturn function(config={}){return base({...look,...config});};\n})()\n`,
)
write(pack, 'hero.json', hero)
write(pack, 'objects.json', objects)
write(
  pack,
  'demo.js',
  'let game;\nfunction init(api){game=ARCADE.speedPlatformer();game.init(api)}\nfunction update(api,dt){game.update(api,dt)}\nfunction draw(api){game.draw(api)}\n',
)
write(pack, 'spec.json', {
  ...json(base, 'spec.json'),
  title: look.title,
  oneLiner: 'Run, roll and spin-dash across two original acts with source Sonic artwork.',
  artDirection:
    'Native Sonic 2 animation, rings and goal objects over original coastal pixel scenery.',
  note: 'Source Sonic artwork with original project levels, mechanics and authored timing. This is not the Sonic 2 ROM or a physics-perfect port.',
  referenceIntent: {
    reference: 'Sonic the Hedgehog',
    preserve: [
      'recognizable source art',
      'momentum',
      'rolling and spin dash',
      'rings and damage recovery',
      'slopes, springs and physical loop',
    ],
    change: ['two original acts', 'independent two-player race', 'authored controller and timings'],
  },
})
write(
  pack,
  'api.md',
  `# Local Sonic source-art game: ARCADE.speedPlatformer(config)\n\nARCADE.speedPlatformer() already contains the reviewed Sonic 2 movement sprite set and original source rings/checkpoint/goal. Use it for explicit Sonic requests. It has two original project acts and independent split-screen 2P racing. Do not emit/reconstruct its pixels. Art is native RGB and size; physics, levels and timings are original adaptations. This is not a ROM port. A different named character needs its own complete sprite set, not a renamed Sonic.\n\n${read(base, 'api.md')}`,
)
write(pack, 'manifest.json', {
  schemaVersion: 1,
  id: 'sonic-speed-reference',
  version: '1.0.0',
  title: 'Sonic — Coast Dash',
  description:
    'Source Sonic 2 art on an original two-act momentum platformer: slopes, spin dash, physical loop, rings, springs, checkpoints and independent 2P racing.',
  tags: ['sonic', 'sonic the hedgehog', 'sonic 2', 'momentum platformer', 'speed platformer'],
  match: {
    phrases: ['sonic', 'sonic the hedgehog', 'sonic 2', 'sonic style'],
    genres: ['platformer', 'speed platformer', 'momentum platformer'],
    requirePhrase: true,
    priority: 1,
  },
  supportsPlayers: [1, 2],
  module: 'module.js',
  entry: 'speedPlatformer',
  apiVersion: 1,
  license: {
    spdx: 'LicenseRef-Commercial-Reference',
    notes: 'Private local source artwork; original project controller and levels.',
  },
  provenance: {
    kind: 'derived',
    authors: [
      'Arcade project',
      'Triangly (source sheet)',
      'Tiaremoana (source contributor and object sheet)',
    ],
    sources: metadata.map((m) => m.sourcePage),
    createdAt: '2026-09-19',
    baseModuleSha256: sha(module),
  },
  quality: { status: 'draft' },
  assets: [],
  files: [
    'hero.json',
    'objects.json',
    'import-integrity.json',
    'LICENSE.md',
    'sources/10073.png',
    'sources/10073.json',
    'sources/85563.png',
    'sources/85563.json',
    'demo.js',
    'spec.json',
  ],
})
console.log(
  JSON.stringify({
    pack,
    assets,
    heroFrames: Object.keys(hero.frames).length,
    objectSets: Object.keys(objects),
    status: 'draft; verification required',
  }),
)
