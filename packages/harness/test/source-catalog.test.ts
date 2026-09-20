import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { openCatalogDb } from '../src/catalog.ts'
import {
  findSourceReferences,
  indexSources,
  loadSourceManifest,
  sourceSheets,
} from '../src/source-catalog.ts'

test('external discovery keeps assist and portrait sheets distinct from playable art', () => {
  const manifest = loadSourceManifest()
  const sheets = sourceSheets(manifest)
  assert.equal(manifest.games.length, 19)
  assert.equal(sheets.length, 92)
  assert.equal(findSourceReferences('spider man', sheets)[0]?.assetId, '275483')
  assert.equal(findSourceReferences('thor', sheets)[0]?.kind, 'assist')
  assert.equal(findSourceReferences('mario kart vehicle', sheets).length, 0)
  assert.equal(findSourceReferences('out run vehicle', sheets)[0]?.kind, 'vehicle')
  assert.equal(findSourceReferences('pole position vehicle', sheets)[0]?.assetId, '94319')
  assert.ok(sheets.every((sheet) => !sheet.runtimeReady))
  assert.equal(findSourceReferences('batman character', sheets)[0]?.assetId, '31098')
  assert.equal(findSourceReferences('joker', sheets)[0]?.assetId, '110272')
  assert.equal(findSourceReferences('superman', sheets)[0]?.assetId, '108348')
  assert.equal(findSourceReferences('sonic character', sheets)[0]?.assetId, '10073')
  assert.match(findSourceReferences('sonic character', sheets)[0]!.url, /sega_genesis/)
})

test('source cache status checks real bytes and safely rebuilds the SQLite index', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'arcade-source-test-'))
  try {
    const manifest = loadSourceManifest()
    const ryu = manifest.games
      .flatMap((game) => game.sheets)
      .find((sheet) => sheet.assetId === '60224')!
    const cache = ryu.cache!
    assert.equal(
      sourceSheets(manifest, root).find((sheet) => sheet.assetId === '60224')?.status,
      'discovered',
    )
    mkdirSync(resolve(root, 'data/reference-cache/spriters-resource'), { recursive: true })
    writeFileSync(resolve(root, cache.path), 'fixture')
    assert.match(
      sourceSheets(manifest, root).find((sheet) => sheet.assetId === '60224')?.cacheIssue ?? '',
      /hash mismatch/,
    )
    cache.sha256 = createHash('sha256').update('fixture').digest('hex')
    assert.match(
      sourceSheets(manifest, root).find((sheet) => sheet.assetId === '60224')?.cacheIssue ?? '',
      /not a PNG/,
    )
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hU8AAAAASUVORK5CYII=',
      'base64',
    )
    writeFileSync(resolve(root, cache.path), png)
    cache.sha256 = createHash('sha256').update(png).digest('hex')
    assert.match(
      sourceSheets(manifest, root).find((sheet) => sheet.assetId === '60224')?.cacheIssue ?? '',
      /dimensions differ/,
    )
    cache.dimensions = [1, 1]
    assert.match(
      sourceSheets(manifest, root).find((sheet) => sheet.assetId === '60224')?.cacheIssue ?? '',
      /metadata missing/,
    )
    writeFileSync(
      resolve(root, cache.metadataPath),
      JSON.stringify({
        sha256: cache.sha256,
        sourcePage: ryu.url,
        assetId: ryu.assetId,
        sourceImage: cache.sourceImage,
      }),
    )
    const path = resolve(root, 'catalog.sqlite')
    const indexed = indexSources(manifest, path, root)
    assert.equal(indexed.downloaded, 1)
    assert.equal(indexed.runtimeReady, 0)
    indexSources(manifest, path, root)
    const db = openCatalogDb(path)
    try {
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM reference_sheets').get()?.n, 92)
      assert.equal(
        db.prepare('SELECT status FROM reference_sheets WHERE asset_id=?').get('60224')?.status,
        'downloaded',
      )
      assert.equal(
        db.prepare('SELECT COUNT(*) AS n FROM reference_sheets WHERE runtime_ready!=0').get()?.n,
        0,
      )
    } finally {
      db.close()
    }
    const outside = resolve(root, 'outside.png')
    writeFileSync(outside, png)
    symlinkSync(outside, resolve(root, 'data/reference-cache/escape.png'))
    cache.path = 'data/reference-cache/escape.png'
    assert.throws(() => sourceSheets(manifest, root), /escapes reference cache/)
    cache.path = '../outside.png'
    assert.throws(() => sourceSheets(manifest, root), /escapes reference cache/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('reference manifest rejects duplicate or incorrectly attributed source sheets', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'arcade-source-schema-'))
  try {
    const manifest = loadSourceManifest()
    const file = resolve(root, 'sources.json')
    manifest.games[0]!.sheets[0]!.url =
      'https://www.spriters-resource.com/arcade/wrong/asset/60224/'
    writeFileSync(file, JSON.stringify(manifest))
    assert.throws(() => loadSourceManifest(file), /does not belong/)
    const duplicate = loadSourceManifest()
    duplicate.games.push(duplicate.games[0]!)
    writeFileSync(file, JSON.stringify(duplicate))
    assert.throws(() => loadSourceManifest(file), /Duplicate source game/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
