import assert from 'node:assert/strict'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import {
  assembleCatalog,
  catalogContext,
  digest,
  indexCatalog,
  loadCatalog,
  loadCatalogRoots,
  openCatalogDb,
} from '../src/catalog.ts'

type Match = {
  phrases: string[]
  genres: string[]
  priority?: number
  requirePhrase?: boolean
}

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'arcade-private-catalog-'))
  const shared = resolve(root, 'library/catalog')
  const local = resolve(root, 'data/local-catalog')
  mkdirSync(shared, { recursive: true })
  return { root, shared, local, dispose: () => rmSync(root, { recursive: true, force: true }) }
}

function pack(
  root: string,
  id = 'climber',
  match: Match = { phrases: ['donkey kong', 'barrel'], genres: ['platformer'] },
) {
  const dir = resolve(root, id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    resolve(dir, 'manifest.json'),
    JSON.stringify({
      schemaVersion: 1,
      id,
      version: '1.0.0',
      title: id,
      description: 'Isolated local catalog test fixture',
      tags: ['platformer'],
      supportsPlayers: [1, 2],
      module: 'module.js',
      entry: 'climber',
      apiVersion: 1,
      license: { spdx: 'CC0-1.0', notes: 'Original test data, no source game pixels' },
      provenance: { kind: 'original', authors: ['Test'], sources: [], createdAt: '2026-09-19' },
      match,
      files: ['demo.js'],
      assets: ['pixels.json'],
    }),
  )
  writeFileSync(
    resolve(dir, 'module.js'),
    `(config) => ({init(api){api.score(${JSON.stringify(id)});},update(){},draw(){}})`,
  )
  writeFileSync(resolve(dir, 'api.md'), 'ARCADE.climber({}); delegates init/update/draw.')
  writeFileSync(
    resolve(dir, 'demo.js'),
    'let game; function init(api){game=ARCADE.climber({});game.init(api);}',
  )
  writeFileSync(resolve(dir, 'pixels.json'), JSON.stringify({ frames: ['.77.', '7777'] }))
  return dir
}

function approve(
  root: string,
  dir: string,
  names = ['behavior', 'visual', 'runtime-1p', 'runtime-2p'],
) {
  const part = loadCatalog(root).find((part) => part.dir === dir)
  assert.ok(part)
  const artifact = JSON.stringify({ result: 'fixture evidence, not a real foundation audit' })
  writeFileSync(resolve(dir, 'audit.json'), artifact)
  writeFileSync(
    resolve(dir, 'quality.json'),
    JSON.stringify({
      contentHash: part.hash,
      checks: names.map((name) => ({
        name,
        passed: true,
        artifact: 'audit.json',
        artifactHash: digest(artifact),
      })),
    }),
  )
}

const namedMatch: Match = {
  phrases: ['donkey kong'],
  genres: ['platformer'],
  priority: 1,
  requirePhrase: true,
}

test('root composition tolerates missing private data and explicit directories stay isolated', () => {
  const f = fixture()
  try {
    const publicPack = pack(f.shared)
    approve(f.shared, publicPack)
    assert.deepEqual(loadCatalogRoots([f.shared, f.local]), loadCatalog(f.shared))
    assert.deepEqual(loadCatalog(f.local), [])
    const privatePack = pack(f.local, 'dk-climber-reference', namedMatch)
    approve(f.local, privatePack)
    const parts = loadCatalogRoots([f.shared, f.local])
    assert.deepEqual(
      parts.map((part) => part.manifest.id),
      ['climber', 'dk-climber-reference'],
    )
    assert.deepEqual(
      loadCatalog(f.shared).map((part) => part.manifest.id),
      ['climber'],
    )
    assert.deepEqual(
      loadCatalog(f.local).map((part) => part.manifest.id),
      ['dk-climber-reference'],
    )
    assert.deepEqual(loadCatalogRoots([f.shared, f.shared]), loadCatalog(f.shared))
  } finally {
    f.dispose()
  }
})

test('reviewed private named art wins only matching semantic ties and bundles the selected module', () => {
  const f = fixture()
  try {
    const publicPack = pack(f.shared)
    const privatePack = pack(f.local, 'dk-climber-reference', namedMatch)
    approve(f.shared, publicPack)
    let parts = loadCatalogRoots([f.shared, f.local])
    assert.equal(
      catalogContext('Donkey Kong', { genre: 'platformer' }, parts).parts[0]?.manifest.id,
      'climber',
    )
    approve(f.local, privatePack)
    parts = loadCatalogRoots([f.shared, f.local])
    assert.equal(parts[0]?.manifest.match?.priority, 0)
    assert.equal(parts[0]?.manifest.match?.requirePhrase, false)
    for (const players of [1, 2]) {
      const context = catalogContext(
        'Donkey Kong on the girders',
        { genre: 'platformer', players },
        parts,
      )
      assert.equal(context.parts[0]?.manifest.id, 'dk-climber-reference')
      let executed = ''
      const code = assembleCatalog('ARCADE.climber({}).init(api);', context)
      runInNewContext(
        code,
        {
          api: {
            score: (id: string) => {
              executed = id
            },
          },
        },
        { timeout: 100 },
      )
      assert.equal(executed, 'dk-climber-reference')
      assert.equal(
        context.hash,
        catalogContext(
          'Donkey Kong on the girders',
          { genre: 'platformer', players },
          [...parts].reverse(),
        ).hash,
      )
    }
    assert.equal(
      catalogContext('A barrel platformer', { genre: 'platformer' }, parts).parts[0]?.manifest.id,
      'climber',
    )
    assert.equal(
      catalogContext('Jump between floors', { genre: 'platformer' }, parts).parts[0]?.manifest.id,
      'climber',
    )
    assert.equal(
      catalogContext('Donkey Kong', { genre: 'platformer', moderated: true }, parts).parts[0]
        ?.manifest.id,
      'climber',
    )
    assert.equal(catalogContext('A space garden', { genre: 'puzzle' }, parts).parts.length, 0)

    // Priority is applied after the score, not added to it. A three-word match wins.
    const specific = pack(f.shared, 'kong-rescue', {
      phrases: ['donkey kong rescue'],
      genres: ['platformer'],
    })
    approve(f.shared, specific)
    parts = loadCatalogRoots([f.shared, f.local])
    assert.equal(
      catalogContext('Donkey Kong rescue', { genre: 'platformer' }, parts).parts[0]?.manifest.id,
      'kong-rescue',
    )
  } finally {
    f.dispose()
  }
})

test('priority cannot force an unrelated pack into retrieval and invalid priority values are rejected', () => {
  const f = fixture()
  try {
    const publicPack = pack(f.shared)
    approve(f.shared, publicPack)
    const unrelated = pack(f.local, 'space-reference', {
      phrases: ['space duel'],
      genres: ['shooter'],
      priority: 10,
    })
    approve(f.local, unrelated)
    let parts = loadCatalogRoots([f.shared, f.local])
    assert.equal(
      catalogContext('Donkey Kong', { genre: 'platformer' }, parts).parts[0]?.manifest.id,
      'climber',
    )
    assert.equal(catalogContext('quiet garden', { genre: 'puzzle' }, parts).parts.length, 0)
    const manifestPath = resolve(unrelated, 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    for (const priority of [-1, 11, 1.5, '1']) {
      writeFileSync(
        manifestPath,
        JSON.stringify({ ...manifest, match: { ...manifest.match, priority } }),
      )
      const issues: { id: string; message: string }[] = []
      parts = loadCatalogRoots([f.shared, f.local], issues)
      assert.deepEqual(
        parts.map((part) => part.manifest.id),
        ['climber'],
      )
      assert.ok(
        issues.some(
          (issue) => issue.id === 'space-reference' && issue.message.includes('priority'),
        ),
      )
    }
  } finally {
    f.dispose()
  }
})

test('local admission binds every shipped file and all advertised player-mode evidence', () => {
  const f = fixture()
  try {
    const publicPack = pack(f.shared)
    const privatePack = pack(f.local, 'dk-climber-reference', namedMatch)
    approve(f.shared, publicPack)
    const selected = () =>
      catalogContext('Donkey Kong', { genre: 'platformer' }, loadCatalogRoots([f.shared, f.local]))
        .parts[0]?.manifest.id
    approve(f.local, privatePack, ['behavior', 'visual', 'runtime-1p'])
    assert.equal(selected(), 'climber')
    for (const file of [
      'module.js',
      'api.md',
      'manifest.json',
      'pixels.json',
      'demo.js',
      'audit.json',
    ]) {
      approve(f.local, privatePack)
      assert.equal(selected(), 'dk-climber-reference')
      const path = resolve(privatePack, file)
      const original = readFileSync(path, 'utf8')
      writeFileSync(
        path,
        file === 'module.js' ? `/* changed source */${original}` : `${original}\n `,
      )
      assert.equal(selected(), 'climber', `${file} mutation must invalidate private admission`)
      assert.equal(loadCatalog(f.local)[0]?.status, 'draft')
      writeFileSync(path, original)
    }
  } finally {
    f.dispose()
  }
})

test('duplicate IDs exclude all claimants, even a broken private claimant, without dropping other packs', () => {
  const f = fixture()
  try {
    const publicPack = pack(f.shared)
    const unaffected = pack(f.shared, 'other-foundation')
    approve(f.shared, publicPack)
    approve(f.shared, unaffected)
    const duplicate = pack(f.local)
    writeFileSync(resolve(duplicate, 'module.js'), 'not valid javascript @')
    const issues: { id: string; message: string }[] = []
    const parts = loadCatalogRoots([f.shared, f.local], issues)
    assert.deepEqual(
      parts.map((part) => part.manifest.id),
      ['other-foundation'],
    )
    assert.equal(issues.length, 1)
    assert.equal(issues[0]?.id, 'climber')
    assert.match(issues[0]!.message, /Duplicate catalog id climber; excluded all packs/)
    assert.ok(issues[0]!.message.includes(publicPack) && issues[0]!.message.includes(duplicate))
    assert.ok(loadCatalog(f.shared).some((part) => part.manifest.id === 'climber'))
  } finally {
    f.dispose()
  }
})

test('private packs reject traversal and external symlinks in code, metadata, pixels and evidence', () => {
  const f = fixture()
  try {
    const dir = pack(f.local, 'dk-climber-reference', namedMatch)
    const manifestPath = resolve(dir, 'manifest.json')
    const originalManifest = readFileSync(manifestPath, 'utf8')
    const manifest = JSON.parse(originalManifest)
    writeFileSync(resolve(f.local, 'outside.js'), '(config)=>({})')
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, module: '../outside.js' }))
    let issues: { id: string; message: string }[] = []
    assert.deepEqual(loadCatalog(f.local, issues), [])
    assert.match(issues[0]!.message, /path escapes pack/)
    writeFileSync(manifestPath, originalManifest)
    approve(f.local, dir)
    for (const file of [
      'module.js',
      'api.md',
      'manifest.json',
      'pixels.json',
      'quality.json',
      'audit.json',
    ]) {
      const path = resolve(dir, file)
      const original = readFileSync(path, 'utf8')
      const outside = resolve(f.root, `outside-${file}`)
      writeFileSync(outside, original)
      rmSync(path)
      symlinkSync(outside, path)
      issues = []
      assert.deepEqual(loadCatalog(f.local, issues), [], `${file} symlink must be rejected`)
      assert.match(issues[0]!.message, /symlink escapes pack/)
      rmSync(path)
      writeFileSync(path, original)
    }
    // A traversal in the evidence path must not be admitted even with the correct digest.
    const qualityPath = resolve(dir, 'quality.json')
    const quality = JSON.parse(readFileSync(qualityPath, 'utf8'))
    writeFileSync(resolve(f.local, 'external-audit.json'), readFileSync(resolve(dir, 'audit.json')))
    quality.checks[0].artifact = '../external-audit.json'
    writeFileSync(qualityPath, JSON.stringify(quality))
    issues = []
    assert.deepEqual(loadCatalog(f.local, issues), [])
    assert.match(issues[0]!.message, /path escapes pack/)
  } finally {
    f.dispose()
  }
})

test('symlink roots and pack directories are diagnosed rather than silently followed', () => {
  const f = fixture()
  try {
    const original = pack(f.shared)
    approve(f.shared, original)
    mkdirSync(resolve(f.root, 'data'))
    symlinkSync(f.shared, f.local, 'dir')
    let issues: { id: string; message: string }[] = []
    assert.deepEqual(
      loadCatalogRoots([f.shared, f.local], issues).map((part) => part.manifest.id),
      ['climber'],
    )
    assert.match(issues[0]!.message, /root is a symlink/)
    unlinkSync(f.local)
    mkdirSync(f.local)
    symlinkSync(original, resolve(f.local, 'linked-foundation'), 'dir')
    issues = []
    assert.deepEqual(loadCatalog(f.local, issues), [])
    assert.match(issues[0]!.message, /pack is a symlink/)
  } finally {
    f.dispose()
  }
})

test('SQLite indexes reviewed private packs from files without granting reference-only entries admission', () => {
  const f = fixture()
  try {
    const privatePack = pack(f.local, 'dk-climber-reference', namedMatch)
    // Cached source discovery is not even a catalog candidate without a manifest/module contract.
    const reference = resolve(f.local, 'downloaded-sheet')
    mkdirSync(reference)
    writeFileSync(
      resolve(reference, 'source.json'),
      JSON.stringify({ runtimeReady: true, url: 'https://example.invalid/reference.png' }),
    )
    approve(f.local, privatePack)
    const parts = loadCatalogRoots([f.shared, f.local])
    const dbPath = resolve(f.root, 'catalog.sqlite')
    indexCatalog(parts, dbPath)
    const db = openCatalogDb(dbPath)
    try {
      const rows = db
        .prepare('SELECT id, status, content_hash, source_path FROM catalog_parts')
        .all()
      assert.equal(rows.length, 1)
      assert.equal(rows[0]?.id, 'dk-climber-reference')
      assert.equal(rows[0]?.status, 'verified')
      assert.equal(rows[0]?.content_hash, parts[0]?.hash)
      assert.ok(String(rows[0]?.source_path).endsWith('data/local-catalog/dk-climber-reference'))
    } finally {
      db.close()
    }
  } finally {
    f.dispose()
  }
})
