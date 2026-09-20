import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { queueComponentIndex } from '../src/component-queue.ts'
import {
  componentStats,
  exportComponent,
  extractComponents,
  findComponents,
  harvestComponents,
  indexGameComponents,
} from '../src/components.ts'

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'game-components-'))
  return {
    root,
    db: resolve(root, 'catalog.sqlite'),
    storage: resolve(root, 'sources'),
    dispose: () => rmSync(root, { recursive: true, force: true }),
  }
}

test('parses functions, art, shared state and nested scopes without executing code', () => {
  const result = extractComponents(`const ART=['.7.','777']; let shared=0;
    function draw(api){const local=1; function inner(){return local}; api.spr(ART,0,0); shared++;}
    globalThis.COMPONENT_TEST_SHOULD_NOT_RUN=true;`)
  assert.deepEqual(result.errors, [])
  assert.equal(result.components.find((c) => c.name === 'ART')!.kind, 'sprite-data')
  const draw = result.components.find((c) => c.name === 'draw')!
  assert.equal(draw.dependencies.length, 2)
  assert.match(result.components.find((c) => c.name === 'shared')!.blockers.join(), /Mutable/)
  assert.match(result.components.find((c) => c.name === 'inner')!.blockers.join(), /Nested/)
  assert.equal((globalThis as Record<string, unknown>).COMPONENT_TEST_SHOULD_NOT_RUN, undefined)
})

test('exports complete dependency closure, including shorthand references, and preserves order', () => {
  const f = fixture()
  try {
    indexGameComponents(
      {
        code: 'const colors=[3,7]; function pick(n){return colors[n%2]}; function bundle(n){return {value:pick(n),colors}}',
        sourcePath: 'one/game.js',
      },
      f.db,
      f.storage,
    )
    const c = findComponents(f.db, 'bundle')[0]!
    const exported = exportComponent(f.db, String(c.id))
    assert.equal(exported.dependencies, 2)
    const value = runInNewContext(exported.source)(1)
    assert.equal(value.value, 7)
    assert.deepEqual(Array.from(value.colors), [3, 7])
    assert.equal(exported.status, 'needs-review')
  } finally {
    f.dispose()
  }
})

test('refuses mutable closures, implicit receivers, unresolved globals and computed initializers', () => {
  const f = fixture()
  try {
    const code =
      'let state=0; const generated=Math.random(); function stateful(){return ++state}; function bad(){return window.x}; function receiver(){return this.x}; function computed(){return generated}'
    indexGameComponents({ code, sourcePath: 'game.js' }, f.db, f.storage)
    for (const name of ['stateful', 'bad', 'receiver', 'computed']) {
      const c = findComponents(f.db, name).find((c) => c.name === name)!
      assert.throws(() => exportComponent(f.db, String(c.id)), /needs adaptation/)
    }
  } finally {
    f.dispose()
  }
})

test('scope resolution does not confuse locals, property names, or strings with dependencies', () => {
  const cs = extractComponents(
    'let x=0; function helper(x){const item={x:2}; return item.x+x+"window".length}',
  ).components
  assert.deepEqual(cs.find((c) => c.name === 'helper')!.dependencies, [])
  assert.deepEqual(cs.find((c) => c.name === 'helper')!.blockers, [])
})

test('deferred collection persists a newly saved game without network or evaluation', async () => {
  const f = fixture()
  try {
    await queueComponentIndex(
      {
        code: 'function checkpoint(n){return n+1}',
        sourcePath: 'new/game.js',
        metadata: { runId: 'new-run' },
      },
      f.db,
      f.storage,
    )
    const found = findComponents(f.db, 'checkpoint')
    assert.equal(found.length, 1)
    assert.deepEqual(found[0]!.origins, ['new/game.js'])
  } finally {
    f.dispose()
  }
})

test('export refuses modified archived bytes and retains source metadata', () => {
  const f = fixture()
  try {
    const result = indexGameComponents(
      {
        code: 'function clamp(n){return n}',
        sourcePath: 'source/game.js',
        metadata: { license: 'fixture-license' },
      },
      f.db,
      f.storage,
    )
    const id = String(findComponents(f.db, 'clamp')[0]!.id)
    assert.match(JSON.stringify(exportComponent(f.db, id).provenance), /fixture-license/)
    writeFileSync(resolve(f.storage, result.hash, 'game.js'), 'function different(){}')
    assert.throws(() => exportComponent(f.db, id), /hash mismatch/)
  } finally {
    f.dispose()
  }
})

test('deduplicates identical sources while preserving origins and changed versions', () => {
  const f = fixture()
  try {
    const input = { code: 'function clamp(x){return Math.max(0,x)}', sourcePath: 'one/game.js' }
    const first = indexGameComponents(input, f.db, f.storage)
    assert.equal(indexGameComponents(input, f.db, f.storage).cached, true)
    indexGameComponents({ ...input, sourcePath: 'two/game.js' }, f.db, f.storage)
    assert.equal(componentStats(f.db).uniqueGames, 1)
    assert.equal(findComponents(f.db, 'clamp')[0]!.origins.length, 2)
    indexGameComponents({ ...input, code: input.code.replace('max', 'min') }, f.db, f.storage)
    assert.equal(componentStats(f.db).uniqueGames, 2)
    assert.equal(readFileSync(resolve(f.storage, first.hash, 'game.js'), 'utf8'), input.code)
    const db = new DatabaseSync(f.db)
    try {
      assert.equal(
        db.prepare('SELECT count(*) n FROM component_origins WHERE current=1').get()!.n,
        2,
      )
    } finally {
      db.close()
    }
  } finally {
    f.dispose()
  }
})

test('archives syntax errors without admitting fragments and scans all supported collections', () => {
  const f = fixture()
  try {
    for (const collection of [
      'library/games',
      'library/catalog',
      'data/local-catalog',
      'data/catalog/candidates',
      'runs',
    ]) {
      const dir = resolve(f.root, collection, 'demo')
      mkdirSync(dir, { recursive: true })
      writeFileSync(
        resolve(dir, collection.endsWith('catalog') ? 'module.js' : 'game.js'),
        'function helper(a){return a*2}',
      )
    }
    mkdirSync(resolve(f.root, 'library/templates'), { recursive: true })
    writeFileSync(resolve(f.root, 'library/templates/broken.js'), 'function broken(')
    const report = harvestComponents(f.root, f.db, f.storage)
    assert.equal(report.sources, 6)
    assert.equal(report.results.filter((r) => r.errors.length).length, 1)
    assert.equal(report.uniqueGames, 2)
    assert.equal(report.components, 1)
  } finally {
    f.dispose()
  }
})
