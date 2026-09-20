import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { digest, loadCatalog } from '../src/catalog.ts'
import { listDemos, loadDemo } from '../src/demos.ts'

test('demo list is metadata only and every admitted mode assembles and runs locally without models', async () => {
  // Dynamic import keeps the runtime bundler module resolution out of NodeNext.
  const { Runtime } = await import(new URL('../../runtime/src/runtime.ts', import.meta.url).href)
  const parts = loadCatalog()
  const games = listDemos(parts)
  assert.ok(games.length >= 12, `Expected public foundations, got ${games.length}`)
  assert.deepEqual(
    games.slice(0, 2).map((game) => game.id),
    ['kart', 'fighter'],
  )
  for (const part of parts.filter((part) => part.status === 'verified'))
    assert.ok(
      games.some((game) => game.id === part.manifest.id),
      part.manifest.id,
    )
  for (const game of games) {
    assert.deepEqual(Object.keys(game).sort(), [
      'description',
      'genre',
      'id',
      'players',
      'revision',
      'title',
    ])
    assert.equal(game.revision, parts.find((part) => part.manifest.id === game.id)!.hash)
    for (const players of game.players) {
      const demo = loadDemo(game.id, players, parts)
      assert.ok(demo, `${game.id}/${players}p`)
      assert.equal(demo.spec.players, players)
      assert.deepEqual(demo.players, game.players)
      assert.equal(demo.spec.title, game.title)
      assert.equal(demo.code, loadDemo(game.id, players, parts)!.code, 'deterministic assembly')
      assert.match(demo.code, /const ARCADE = Object.freeze/)
      const runtime = new Runtime(null, { probe: true, post: () => {} })
      assert.deepEqual(
        runtime.load(demo.code, 7, demo.title, 0, players),
        { ok: true },
        `${game.id}/${players}p loads`,
      )
      runtime.start()
      runtime.step(3)
      assert.notEqual(runtime.state, 'error', `${game.id}/${players}p draws`)
    }
  }
  for (const id of ['missing', '../kart', '/kart', 'kart/../../x', '%2e%2e', 'a'.repeat(81)])
    assert.equal(loadDemo(id, 1, parts), null)
  assert.equal(loadDemo('kart', 3 as 1, parts), null)
  assert.deepEqual(listDemos(parts.map((part) => ({ ...part, status: 'draft' }))), [])
  assert.equal(
    loadDemo(
      'kart',
      1,
      parts.map((part) => ({ ...part, status: 'draft' })),
    ),
    null,
  )
})

test('fresh admission excludes a stale demo pack and rejects escaping metadata paths', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'demo-catalog-'))
  const pack = resolve(root, 'fixture')
  mkdirSync(pack)
  try {
    const reference = loadCatalog().find((part) => part.manifest.id === 'kart')!
    const manifest = {
      ...reference.manifest,
      id: 'fixture',
      supportsPlayers: [1],
      entry: 'fixture',
      files: ['demo.js', 'spec.json'],
      assets: [],
    }
    writeFileSync(resolve(pack, 'manifest.json'), JSON.stringify(manifest))
    writeFileSync(resolve(pack, 'module.js'), '()=>({init(){},update(){},draw(){}})')
    writeFileSync(resolve(pack, 'api.md'), 'Fixture API')
    writeFileSync(resolve(pack, 'spec.json'), readFileSync(resolve(reference.dir, 'spec.json')))
    writeFileSync(
      resolve(pack, 'demo.js'),
      'const game=ARCADE.fixture();function init(api){game.init(api)}function update(api){game.update(api)}function draw(api){game.draw(api)}',
    )
    const parts = () => loadCatalog(root)
    assert.deepEqual(listDemos(parts()), [])
    writeFileSync(resolve(pack, 'audit.json'), '{}')
    writeFileSync(
      resolve(pack, 'quality.json'),
      JSON.stringify({
        contentHash: parts()[0]!.hash,
        checks: ['behavior', 'visual', 'runtime-1p'].map((name) => ({
          name,
          passed: true,
          artifact: 'audit.json',
          artifactHash: digest('{}'),
        })),
      }),
    )
    assert.equal(listDemos(parts()).length, 1)
    assert.ok(loadDemo('fixture', 1, parts()))
    assert.equal(loadDemo('fixture', 2, parts()), null)
    const escaping = parts()
    escaping[0]!.manifest.spec = '../outside.json'
    assert.deepEqual(listDemos(escaping), [])
    writeFileSync(resolve(pack, 'module.js'), '()=>({init(){},update(){},draw(){/*edited*/}})')
    assert.deepEqual(listDemos(parts()), [])
    assert.equal(loadDemo('fixture', 1, parts()), null)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('demo HTTP routes separate metadata from code and return 404 for invalid selections', async () => {
  const list = await import(
    new URL('../../../apps/cabinet/app/api/demos/route.ts', import.meta.url).href
  )
  const detail = await import(
    new URL('../../../apps/cabinet/app/api/demos/[id]/route.ts', import.meta.url).href
  )
  const response = list.GET()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  const { games } = await response.json()
  assert.ok(games.length >= 12)
  assert.ok(games.every((game: object) => !('code' in game) && !('spec' in game)))
  for (const [id, query, status] of [
    ['kart', '1', 200],
    ['kart', '2', 200],
    ['kart', '3', 404],
    ['missing', '1', 404],
    ['../kart', '1', 404],
  ] as const) {
    const result = await detail.GET(
      new Request(`http://localhost/api/demos/selection?players=${query}`),
      { params: Promise.resolve({ id }) },
    )
    assert.equal(result.status, status)
    const body = await result.json()
    if (status === 200) {
      assert.equal(body.spec.players, Number(query))
      assert.equal(typeof body.code, 'string')
    } else assert.deepEqual(body, { error: 'Demo not found' })
  }
})
