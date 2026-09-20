import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import {
  archiveCandidate,
  assembleCatalog,
  catalogContext,
  catalogSource,
  digest,
  indexCatalog,
  loadCatalog,
  openCatalogDb,
} from '../src/catalog.ts'

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'arcade-catalog-'))
  const pack = resolve(root, 'fighter')
  mkdirSync(pack)
  const manifest = {
    schemaVersion: 1,
    id: 'fighter',
    version: '1.0.0',
    title: 'Fighter',
    description: 'Tested fighter',
    tags: ['fighter'],
    supportsPlayers: [1, 2],
    module: 'module.js',
    entry: 'fighter',
    apiVersion: 1,
    license: { spdx: 'CC0-1.0', notes: 'Test fixture' },
    provenance: { kind: 'original', authors: ['Test'], sources: [], createdAt: '2026-09-19' },
    match: { phrases: ['street fighter', 'fighter'], genres: ['fighting'] },
    files: ['frames.json'],
  }
  writeFileSync(resolve(pack, 'manifest.json'), JSON.stringify(manifest))
  writeFileSync(
    resolve(pack, 'module.js'),
    '(config) => ({ init(api) { api.score(config.points); }, update(){}, draw(){} })',
  )
  writeFileSync(
    resolve(pack, 'api.md'),
    'ARCADE.fighter({ points: 5 }); delegates init/update/draw.',
  )
  writeFileSync(resolve(pack, 'frames.json'), JSON.stringify({ frames: ['777'] }))
  return { root, pack, dispose: () => rmSync(root, { recursive: true, force: true }) }
}

function approve(root: string, pack: string) {
  const hash = loadCatalog(root)[0]!.hash
  writeFileSync(resolve(pack, 'audit.json'), JSON.stringify({ result: 'fixture verification' }))
  const artifactHash = digest(readFileSync(resolve(pack, 'audit.json'), 'utf8'))
  writeFileSync(
    resolve(pack, 'quality.json'),
    JSON.stringify({
      contentHash: hash,
      checks: ['behavior', 'visual', 'runtime-1p', 'runtime-2p'].map((name) => ({
        name,
        passed: true,
        artifact: 'audit.json',
        artifactHash,
      })),
    }),
  )
}

test('catalog excludes drafts, requires both player modes, and invalidates changed source/assets/evidence', () => {
  const f = fixture()
  try {
    assert.equal(loadCatalog(f.root)[0]?.status, 'draft')
    assert.equal(
      catalogContext('Street Fighter', { players: 1 }, loadCatalog(f.root)).parts.length,
      0,
    )
    approve(f.root, f.pack)
    assert.equal(loadCatalog(f.root)[0]?.status, 'verified')
    assert.equal(
      catalogContext('Street Fighter', { players: 2 }, loadCatalog(f.root)).parts.length,
      1,
    )
    writeFileSync(resolve(f.pack, 'frames.json'), '{"frames":["888"]}')
    assert.equal(loadCatalog(f.root)[0]?.status, 'draft')
    approve(f.root, f.pack)
    writeFileSync(resolve(f.pack, 'audit.json'), 'changed evidence')
    assert.equal(loadCatalog(f.root)[0]?.status, 'draft')
  } finally {
    f.dispose()
  }
})

test('an incomplete pack is diagnosed and excluded without taking the collection offline', () => {
  const f = fixture()
  try {
    rmSync(resolve(f.pack, 'api.md'))
    const issues: { id: string; message: string }[] = []
    assert.deepEqual(loadCatalog(f.root, issues), [])
    assert.equal(issues[0]?.id, 'fighter')
    assert.match(issues[0]?.message ?? '', /api.md/)
  } finally {
    f.dispose()
  }
})

test('retrieval is bounded, deterministic, respects player count/moderation and does not coerce unknown genres', () => {
  const f = fixture()
  try {
    approve(f.root, f.pack)
    const parts = loadCatalog(f.root)
    const a = catalogContext('Street Fighter but with cats', { genre: 'duel', players: 2 }, parts)
    assert.equal(a.parts[0]?.manifest.id, 'fighter')
    assert.equal(
      a.hash,
      catalogContext('Street Fighter but with cats', { genre: 'duel', players: 2 }, parts).hash,
    )
    assert.equal(catalogContext('relaxing music garden', { genre: 'music' }, parts).parts.length, 0)
    assert.equal(
      catalogContext('Street Fighter', { moderated: true, genre: 'catch' }, parts).parts.length,
      0,
    )
    const onePlayer = [
      { ...parts[0]!, manifest: { ...parts[0]!.manifest, supportsPlayers: [1 as const] } },
    ]
    assert.equal(catalogContext('Street Fighter', { players: 2 }, onePlayer).parts.length, 0)
    assert.ok(a.text.includes('ARCADE.fighter'))
    assert.ok(!a.text.includes('api.score(config.points)'))
  } finally {
    f.dispose()
  }
})

test('compiler links selected factories deterministically and strips bundle for repair without duplication', () => {
  const f = fixture()
  try {
    approve(f.root, f.pack)
    const context = catalogContext('Street Fighter', { players: 1 }, loadCatalog(f.root))
    const source =
      'let game; function init(api) { game=ARCADE.fighter({points:7}); game.init(api); }'
    const code = assembleCatalog(source, context)
    let score = 0
    runInNewContext(
      `${code}\ninit(api);`,
      {
        api: {
          score: (n: number) => {
            score = n
          },
        },
      },
      { timeout: 100 },
    )
    assert.equal(score, 7)
    assert.equal(catalogSource(code), source)
    assert.equal(assembleCatalog(code, context), code)
    assert.equal(assembleCatalog('function init() {}', context), 'function init() {}')
    assert.throws(() => assembleCatalog('ARCADE.notInstalled({})', context), /Unavailable catalog/)
    assert.throws(() => assembleCatalog(source), /Unavailable catalog/)
  } finally {
    f.dispose()
  }
})

test('SQLite indexes parts and deduplicates generated candidates without promoting runtime passes', () => {
  const f = fixture()
  const dbPath = resolve(f.root, 'catalog.sqlite')
  try {
    indexCatalog(loadCatalog(f.root), dbPath)
    const input = {
      runId: 'r1',
      code: 'function init() {}',
      transcript: 'my idea',
      spec: { title: 'TEST', genre: 'fighting', players: 2 },
      validation: { runtimePassed: true, observations: [] },
      model: 'test',
      effort: 'medium',
    }
    const hash = archiveCandidate(input, dbPath, resolve(f.root, 'candidates'))
    archiveCandidate(input, dbPath, resolve(f.root, 'candidates'))
    archiveCandidate({ ...input, runId: 'r2' }, dbPath, resolve(f.root, 'candidates'))
    const db = openCatalogDb(dbPath)
    try {
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM catalog_parts').get()?.n, 1)
      const candidate = db.prepare('SELECT * FROM generated_candidates').get()!
      assert.equal(candidate.code_hash, hash)
      assert.equal(candidate.occurrences, 2)
      assert.equal(candidate.status, 'quarantined')
      assert.equal(candidate.first_run_id, 'r1')
      assert.equal(candidate.latest_run_id, 'r2')
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM candidate_runs').get()?.n, 2)
      assert.equal(readFileSync(resolve(f.root, 'candidates', hash, 'game.js'), 'utf8'), input.code)
    } finally {
      db.close()
    }
  } finally {
    f.dispose()
  }
})
