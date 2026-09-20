import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { catalogContext, loadCatalog } from '../src/catalog.ts'
import { ROOT } from '../src/env.ts'
import { loadSpriteCatalog, type SpriteRecord } from '../src/sprite-catalog.ts'
import { fighterCompatibility, selectSpriteAssets, spriteContract } from '../src/sprite-link.ts'

const parts = loadCatalog(resolve(ROOT, 'library/catalog'))
const originals = loadSpriteCatalog(parts, [])
const batman = originals.find((s) => s.id === 'fighter/batman')!
const flash = originals.find((s) => s.id === 'fighter/flash')!
const partial: SpriteRecord = {
  ...batman,
  id: 'arcade/batman',
  status: 'source-checked',
  camera: 'side-view',
  tags: ['batman', 'dc comics', 'arcade'],
  animations: { walk: batman.animations.walk! },
}
const selected = (request: string, pool: SpriteRecord[], genre = 'fighting') =>
  selectSpriteAssets(request, { genre }, pool).map((s) => s.id)

test('fighting retrieval uses complete matching originals instead of incomplete source poses', () => {
  assert.deepEqual(fighterCompatibility(batman), [])
  assert.ok(fighterCompatibility(partial).includes('missing guard'))
  assert.deepEqual(selected('Street Fighter with Batman and The Flash', [partial, batman, flash]), [
    'fighter/batman',
    'fighter/flash',
  ])
  assert.deepEqual(selected('Batman', [partial]), [])
  assert.deepEqual(selected('Batman walks along the roof', [partial], 'side view animation'), [
    'arcade/batman',
  ])
  assert.match(spriteContract([partial]), /Fighter adapter: incompatible/)
  assert.match(spriteContract([batman]), /complete ART.get\(id\).character\(\) contract/)
})

test('negative identities and franchise/theme-only mentions do not retrieve characters', () => {
  const superman = {
    ...partial,
    id: 'arcade/superman',
    subject: 'Superman',
    tags: ['superman', 'dc comics', 'arcade'],
    animations: batman.animations,
  }
  assert.deepEqual(selected('No Batman; Superman instead', [batman, superman]), ['arcade/superman'])
  assert.deepEqual(selected('The Flash without Batman', [batman, flash]), ['fighter/flash'])
  assert.deepEqual(selected('Not only Batman but The Flash', [batman, flash]), [
    'fighter/batman',
    'fighter/flash',
  ])
  assert.deepEqual(selected('A DC comics arcade game', [partial, superman]), [])
  assert.deepEqual(selected('Do not use Batman', [batman], 'Batman fighting game'), [])
})

test('the original fighter fallback retains its known side-view camera during retrieval', () => {
  assert.equal(batman.camera, 'side-view')
  assert.equal(flash.camera, 'side-view')
  assert.deepEqual(selected('Batman in a top-down maze', originals, 'top-down maze'), ['maze/maze'])
  assert.deepEqual(selected('Street Fighter with Batman', originals), ['fighter/batman'])
})

test('identity aliases, admission, source preference and camera compatibility remain deterministic', () => {
  const spider = {
    ...batman,
    id: 'spider-man-reference/spider-man',
    subject: 'Spider-Man',
    tags: ['spider man', 'spiderman', 'marvel', 'fighter'],
    status: 'source-checked' as const,
    camera: 'side-view',
  }
  assert.deepEqual(selected('Spiderman versus Batman', [spider, batman]), [
    'spider-man-reference/spider-man',
    'fighter/batman',
  ])
  assert.deepEqual(selected('Marvel fighting game', [spider]), [])
  assert.deepEqual(selected('Spider-Man', [{ ...spider, status: 'draft' }]), [])
  assert.deepEqual(selected('Spider-Man', [{ ...spider, camera: 'top-down' }]), [])
  assert.deepEqual(selected('Spider-Man', [spider], 'top-down exploration'), [])
  const source = { ...batman, id: 'source/batman', status: 'source-checked' as const }
  assert.deepEqual(selected('Batman', [batman, source]), ['source/batman'])
  assert.deepEqual(selected('Batman', [source, batman]), ['source/batman'])
})

test('combat compatibility checks the same geometry/timing/phase requirements as the runtime adapter', () => {
  assert.ok(fighterCompatibility({ ...batman, coordinates: 'frame-local pixels' }).length)
  const animations = structuredClone(batman.animations)
  animations.light!.steps = animations.light!.steps.slice(0, 1)
  assert.ok(
    fighterCompatibility({ ...batman, animations }).some((reason) =>
      reason.includes('incomplete attack phases'),
    ),
  )
  animations.light = structuredClone(batman.animations.light!)
  animations.light.steps[0]!.durationTicks = 1.5
  assert.ok(
    fighterCompatibility({ ...batman, animations }).some((reason) =>
      reason.includes('non-integer'),
    ),
  )
})

test('foundation context does not offer its already-bundled characters a second time', () => {
  const context = catalogContext(
    'Street Fighter with Batman and Flash',
    { genre: 'fighting', players: 2 },
    parts,
  )
  assert.equal(context.parts[0]?.manifest.id, 'fighter')
  assert.ok(!context.sprites?.some((sprite) => sprite.packId === 'fighter'))
  assert.ok(!context.sprites?.some((sprite) => fighterCompatibility(sprite).length))
})
