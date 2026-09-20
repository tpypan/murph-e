// Build a private draft; admission still requires behavior, visual and native play evidence.
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'data/reference-cache/spriters-resource/pac-man')
const out = resolve(root, 'data/local-catalog/pac-man-maze-reference')
const base = resolve(root, 'library/catalog/maze')
const read = (dir, name) => readFileSync(resolve(dir, name), 'utf8')
const json = (dir, name) => JSON.parse(read(dir, name))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const write = (name, value) =>
  writeFileSync(
    resolve(out, name),
    typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
  )
const look = json(source, 'maze-config.json')
const integrity = json(source, 'integrity.json')
const factory = read(base, 'module.js')
if (
  !integrity.exactOpaqueSourceColors ||
  integrity.colorQuantization ||
  integrity.spatialResampling
)
  throw Error('Expected exact native source sprites')
// Validate against the actual adapter before writing a pack.
Function(`return ${factory}`)()(look)
mkdirSync(resolve(out, 'sources'), { recursive: true })
const bytes = readFileSync(resolve(source, '52631.png'))
const metadata = json(source, '52631.json')
if (sha(bytes) !== metadata.sha256 || sha(bytes) !== integrity.sourceSha256)
  throw Error('Source sheet changed')
copyFileSync(resolve(source, '52631.png'), resolve(out, 'sources/52631.png'))
write('sources/52631.json', metadata)
write('assets.json', json(source, 'source-assets.json'))
write('source-map.json', json(source, 'sheet-map.json'))
write('import-integrity.json', integrity)
write(
  'module.js',
  `(function(){
const base=(${factory});
const look=${JSON.stringify(look)};
return function(config={}){
  const options={...look,...config};
  // Named goose requests keep their complete original movement/honk artwork.
  if(options.avatar==='goose' && config.assets===undefined) delete options.assets;
  return base(options);
};
})()\n`,
)
write(
  'demo.js',
  'let game;\nfunction init(api){game=ARCADE.maze();game.init(api)}\nfunction update(api,dt){game.update(api,dt)}\nfunction draw(api){game.draw(api)}\n',
)
write('spec.json', {
  ...json(base, 'spec.json'),
  title: 'PAC-MAN MAZE',
  oneLiner: 'Clear the maze, avoid the ghosts, and turn the chase with power pellets.',
  mechanics: [
    'Collect every pellet to clear each of three rounds.',
    'Four ghosts exit the central house, chase and scatter; power pellets allow captures.',
    'Captured eyes return through the door, reform at home and rejoin the chase.',
    '2P shares score, pellets and lives with independent directional controls.',
  ],
  artDirection:
    'Native source Pac-Man and four ghost sprites; original project maze with visible ghost house.',
  referenceIntent: {
    reference: 'Pac-Man',
    preserve: ['source actor art', 'pellet maze', 'ghost house', 'power pickups', 'returning eyes'],
    change: ['original map and controller', 'optional 2P cooperation'],
  },
  controls: {
    left: 'Turn left',
    right: 'Turn right',
    up: 'Turn up',
    down: 'Turn down',
    a: null,
    b: null,
  },
  lose: 'Run out of shared lives after unpowered contact with an active ghost.',
  scoring:
    '10 per pellet, 50 per power pellet, 200/400/800/1600 chained captures, 500 times round for clearing.',
  note: 'Imported source actors on original project maze and rules; no original ROM or timing fidelity claim.',
})
write(
  'api.md',
  `# Local source-art maze: ARCADE.maze(config)

Call ARCADE.maze() for the complete source Pac-Man and four ghost animation sets on the project maze controller. Original source RGB, native 16×16 cells and authored 60Hz timing/anchors are bundled; do not reproduce pixels. Both players use source-yellow Pac-Man with colored 1/2 markers. Source states include directional mouths/ghost gait, frightened/flash, returning eyes and death. Reform is an authored transition between source eyes and body poses.

This pack uses the project's original maze, speed, enemy strategy, scoring and cooperative 2P rules. It does not contain the original Pac-Man ROM, original 28×31 board, fruit progression, sound samples or recovered original frame timings. For a goose request, avatar:'goose' selects the complete ORIGINAL project goose art; source ghosts are not mixed into that mode. Unavailable named identities need additional artwork, not labels.

${read(base, 'api.md')}
`,
)
write('manifest.json', {
  schemaVersion: 1,
  id: 'pac-man-maze-reference',
  version: '1.0.0',
  title: 'Pac-Man — local source-art maze',
  description:
    'Reviewed source Pac-Man and four ghost states on a tested original maze, with full house lifecycle and 1P/2P cooperative play.',
  tags: ['pac man', 'pacman', 'maze', 'ghosts', 'pellets'],
  match: {
    phrases: ['pac man', 'pacman'],
    genres: ['maze', 'maze chase', 'maze-chase'],
    requirePhrase: true,
    priority: 1,
  },
  supportsPlayers: [1, 2],
  module: 'module.js',
  entry: 'maze',
  apiVersion: 1,
  license: {
    spdx: 'LicenseRef-Commercial-Reference',
    notes:
      'Private local imported artwork; archive availability does not grant redistribution rights.',
  },
  provenance: {
    kind: 'derived',
    authors: [
      'Arcade project (controller, adapter and authored timing)',
      'Superjustinbros (source sheet uploader)',
    ],
    sources: [metadata.sourcePage],
    createdAt: '2026-09-19',
    baseModuleSha256: sha(factory),
  },
  quality: { status: 'draft' },
  assets: ['assets.json'],
  files: [
    'sources/52631.png',
    'sources/52631.json',
    'source-map.json',
    'import-integrity.json',
    'demo.js',
    'spec.json',
  ],
})
console.log(`Built private draft ${out}; native review and admission pending.`)
