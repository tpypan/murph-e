import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogContext, loadCatalog } from '../src/catalog.ts'
import { listDemos, loadDemo } from '../src/demos.ts'
import { jevRequest } from '../src/jev.ts'
import { loadSpriteCatalog } from '../src/sprite-catalog.ts'

test('arcade expedition contracts route to both new admitted co-op foundations', () => {
  const parts = loadCatalog()
  for (const [id, prompts] of [
    ['arena-survivor', ['An arena shooter', 'Two wizards survive waves of monsters']],
    [
      'dungeon-gauntlet',
      ['A Gauntlet game', 'Clear rooms of monsters, collect keys and unlock doors'],
    ],
  ] as const) {
    const part = parts.find((p) => p.manifest.id === id)!
    assert.equal(part.status, 'verified')
    assert.deepEqual(part.manifest.supportsPlayers, [1, 2])
    for (const prompt of prompts) {
      assert.equal(
        catalogContext(prompt, { players: 2, requireMultiplayer: true }, parts).parts[0]?.manifest
          .id,
        id,
      )
    }
    for (const players of [1, 2] as const) {
      const demo = loadDemo(id, players, parts)!
      assert.ok(demo)
      assert.ok(demo.spec.multiplayer)
      const prepared = jevRequest(prompts[0], demo.spec, parts)
      assert.ok(prepared.candidates.some((p) => p.manifest.id === id))
      assert.ok(Object.hasOwn(prepared.request.questions.foundation!.criteria, 'no_match'))
      assert.ok(JSON.stringify(prepared.request).length < 96_000)
    }
    const sprites = loadSpriteCatalog([part], [])
    assert.equal(sprites.length, 7)
    assert.ok(sprites.every((s) => s.status === 'verified' && s.camera === 'top-down'))
  }
  assert.ok(listDemos(parts).some((d) => d.id === 'arena-survivor'))
  const spec = loadDemo('arena-survivor', 1, parts)!.spec
  // Unknown requests retain the complete candidate menu without exceeding the routing budget.
  assert.ok(
    JSON.stringify(
      jevRequest('An unfamiliar new game', { ...spec, genre: 'unknown' }, parts).request,
    ).length < 96_000,
  )
})

test('unsupported RPG/platform rules and mixed foundations cannot silently select these shooters', () => {
  const parts = loadCatalog()
  for (const request of [
    'Gauntlet with swords and quests',
    'An arena shooter with tower building',
    'An arena shooter combined with Gauntlet',
    'A dungeon crawler without keys or doors',
  ]) {
    assert.deepEqual(
      catalogContext(request, { players: 2, requireMultiplayer: true }, parts).parts,
      [],
      request,
    )
  }
})
