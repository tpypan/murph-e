import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listDemos } from '../src/demos.ts'
import { gameCreator, loadGameAttributions } from '../src/game-attribution.ts'
import { listLibrary } from '../src/library.ts'
import { loadTemplates } from '../src/prompt.ts'

test('every current catalog, saved and fallback game has an assigned creator', () => {
  const games = [...listDemos(), ...listLibrary(), ...loadTemplates()]
  assert.ok(games.length > 0)
  for (const game of games) {
    assert.ok(game.creator?.name.trim(), game.title)
    assert.notEqual(game.creator?.name, 'GUEST', game.title)
  }
  const assignments = loadGameAttributions()
  for (const name of [
    'Eddie Bian',
    'Daniel Ching',
    'Kaibo Huang',
    'Chinmay Jindal',
    'Arjun Virk',
    'Rohanth Marem',
    'Casper Dong',
    'Srinikesh Singarapu',
  ]) {
    assert.equal(assignments.filter((row) => row.creatorName === name).length, 1, name)
  }
})

test('a saved creator identity wins over manual assignments; unknown games stay guests', () => {
  const saved = { name: ' Real Creator ', badgeId: 'badge-123', attribution: 'badge' as const }
  assert.deepEqual(gameCreator('library', 'casper-climb', saved), {
    ...saved,
    name: 'Real Creator',
  })
  assert.equal(gameCreator('library', 'casper-climb').name, 'Casper Dong')
  assert.equal(gameCreator('library', 'unassigned-future-game').name, 'GUEST')
})
