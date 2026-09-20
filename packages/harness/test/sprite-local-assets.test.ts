import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { digest } from '../src/catalog.ts'
import { assetPackHash, loadSpriteCatalog } from '../src/sprite-catalog.ts'
import { selectSpriteAssets } from '../src/sprite-link.ts'

function pack(root: string, id: string, approved = false) {
  const dir = resolve(root, id)
  mkdirSync(dir, { recursive: true })
  const manifest = {
    id,
    camera: 'side-view',
    actors: [{ file: 'actor.json', tags: ['fixture'] }],
    license: { localNotice: 'LICENSE.md' },
  }
  const actor = {
    id: 'fixture',
    frames: { idle: { pixels: ['01'], anchor: { x: 0, y: 1 }, durationTicks: 6 } },
    animations: { idle: { frames: ['idle'], loop: true } },
    source: { path: 'original.bin' },
  }
  writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest))
  writeFileSync(resolve(dir, 'actor.json'), JSON.stringify(actor))
  writeFileSync(resolve(dir, 'original.bin'), 'original fixture bytes')
  writeFileSync(resolve(dir, 'LICENSE.md'), 'Original test fixture')
  if (approved) {
    const evidence = 'reviewed fixture only'
    writeFileSync(resolve(dir, 'review.json'), evidence)
    writeFileSync(
      resolve(dir, 'quality.json'),
      JSON.stringify({
        contentHash: assetPackHash(dir, manifest),
        checks: ['integrity', 'visual', 'provenance'].map((name) => ({
          name,
          passed: true,
          artifact: 'review.json',
          artifactHash: digest(evidence),
        })),
      }),
    )
  }
  return dir
}

test('multiple asset roots use identical admission gates while explicit roots stay isolated', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'sprite-local-'))
  try {
    const originals = resolve(dir, 'library'),
      local = resolve(dir, 'private')
    pack(originals, 'original', true)
    const privatePack = pack(local, 'local', true)
    pack(local, 'draft')
    const sprites = loadSpriteCatalog([], [originals, local])
    assert.deepEqual(
      sprites.map((sprite) => [sprite.id, sprite.status]),
      [
        ['original/fixture', 'source-checked'],
        ['draft/fixture', 'draft'],
        ['local/fixture', 'source-checked'],
      ],
    )
    assert.deepEqual(
      selectSpriteAssets('fixture', {}, sprites).map((sprite) => sprite.id),
      ['local/fixture'],
      'both copies remain indexed, but retrieval offers one reviewed set per identity',
    )
    assert.deepEqual(
      loadSpriteCatalog([], originals).map((sprite) => sprite.id),
      ['original/fixture'],
    )
    assert.deepEqual(
      loadSpriteCatalog([], []).map((sprite) => sprite.id),
      [],
    )
    writeFileSync(resolve(privatePack, 'review.json'), 'modified proof')
    assert.equal(
      loadSpriteCatalog([], local).find((sprite) => sprite.id === 'local/fixture')!.status,
      'draft',
    )
    assert.deepEqual(selectSpriteAssets('fixture', {}, loadSpriteCatalog([], local)), [])
    assert.deepEqual(
      selectSpriteAssets('fixture', {}, loadSpriteCatalog([], [originals, local])).map(
        (sprite) => sprite.id,
      ),
      ['original/fixture'],
      'a stale preferred copy falls back to the other reviewed set',
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a private duplicate cannot replace or coexist with a reviewed public sprite ID', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'sprite-duplicate-'))
  try {
    const originals = resolve(dir, 'library'),
      local = resolve(dir, 'private')
    pack(originals, 'shared', true)
    pack(local, 'shared')
    pack(local, 'unique')
    for (const roots of [
      [originals, local],
      [local, originals],
    ]) {
      const issues: { id: string; message: string }[] = []
      const sprites = loadSpriteCatalog([], roots, issues)
      assert.deepEqual(
        sprites.map((sprite) => sprite.id),
        ['unique/fixture'],
      )
      assert.deepEqual(issues, [
        { id: 'shared/fixture', message: 'Duplicate sprite ID; all conflicting entries omitted' },
      ])
    }
    assert.equal(loadSpriteCatalog([], originals)[0]!.status, 'source-checked')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
