import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { type CatalogPart, catalogMatchEvidence } from '../src/catalog.ts'

const manifest = JSON.parse(
  readFileSync(
    new URL('../../../library/catalog/speed-platformer/manifest.json', import.meta.url),
    'utf8',
  ),
)
const original: CatalogPart = {
  manifest,
  dir: '',
  hash: 'fixture',
  module: '',
  api: '',
  checks: [],
  status: 'verified',
}
const sonic: CatalogPart = {
  ...original,
  manifest: {
    ...manifest,
    id: 'sonic-speed-reference',
    match: {
      phrases: ['sonic', 'sonic 2', 'sonic the hedgehog', 'sonic style'],
      genres: ['platformer', 'speed platformer', 'momentum platformer'],
      requirePhrase: true,
      priority: 1,
    },
  },
}
const choose = (text: string, genre = '', parts = [original, sonic]) =>
  catalogMatchEvidence(text, { genre, players: 2 }, parts).filter((row) => row.score > 0)[0]?.part
    .manifest.id

test('Sonic chooses admitted named art; generic momentum remains original and no key/model is needed', () => {
  for (const name of ['Sonic', 'Sonic 2', 'Sonic the Hedgehog', 'Sonic-style platformer'])
    assert.equal(choose(name), 'sonic-speed-reference', name)
  assert.equal(choose('Roll through slopes and loops'), 'speed-platformer')
  assert.equal(choose('Build a game', 'high-speed platformer'), 'speed-platformer')
  assert.equal(choose('A momentum platformer with an original creature'), 'speed-platformer')
  assert.equal(choose('Not Sonic; a momentum platformer'), 'speed-platformer')
  assert.equal(
    choose('Sonic', 'platformer', [original, { ...sonic, status: 'draft' }]),
    'speed-platformer',
  )
})

test('named art does not erase unrelated Sonic genres or explicit removal of platformer mechanics', () => {
  for (const text of [
    'Sonic kart racing',
    'Sonic fighting game',
    'A top-down Sonic game',
    'Sonic without momentum',
    'No Sonic',
  ])
    assert.equal(choose(text), undefined, text)
  for (const text of ['blue hedgehog', 'gold rings', 'clouds rolling over a city'])
    assert.equal(choose(text), undefined, text)
})
