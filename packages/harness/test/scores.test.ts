import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { addScore, GUEST, topScores } from '../src/scores.ts'

const fresh = () => join(mkdtempSync(join(tmpdir(), 'htn-scores-')), 'scores.json')
const frog = { slug: 'frog-dodge', title: 'FROG DODGE' }
const pong = { slug: 'speed-pong', title: 'SPEED PONG' }

test('best score per badge and game, guests kept as separate rows', () => {
  const file = fresh()
  addScore({ badgeId: 'tony', name: 'Tony Pan', score: 10, game: frog }, file)
  addScore({ badgeId: 'tony', name: 'Tony Pan', score: 40, game: frog }, file)
  addScore({ badgeId: 'tony', name: 'Tony Pan', score: 25, game: frog }, file)
  addScore({ badgeId: 'sam', name: 'Sam Rivera', score: 30, game: frog }, file)
  addScore({ score: 35, game: frog }, file)
  addScore({ score: 5, game: frog }, file)
  addScore({ badgeId: 'tony', name: 'Tony Pan', score: 99, game: pong }, file)

  const frogBoard = topScores({ game: 'frog-dodge', file })
  assert.deepEqual(
    frogBoard.map((e) => [e.name, e.score]),
    [
      ['Tony Pan', 40],
      [GUEST, 35],
      ['Sam Rivera', 30],
      [GUEST, 5],
    ],
  )
  const overall = topScores({ file })
  assert.deepEqual(overall[0], { ...overall[0]!, name: 'Tony Pan', score: 99, game: pong })
  assert.equal(overall.length, 5)
  assert.equal(topScores({ file, limit: 2 }).length, 2)
})

test('a name without a badge is still a guest; scores are clamped', () => {
  const file = fresh()
  const e = addScore({ name: 'Nobody', score: -3.7, game: frog }, file)
  assert.equal(e.name, GUEST)
  assert.equal(e.badgeId, null)
  assert.equal(e.score, 0)
  assert.equal(addScore({ badgeId: 'x', name: '  ', score: 1, game: frog }, file).name, GUEST)
})

test('survives a corrupt file and writes atomically', () => {
  const file = fresh()
  writeFileSync(file, '{"entries": [')
  assert.deepEqual(topScores({ file }), [])
  addScore({ score: 7, game: frog }, file)
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(raw.entries.length, 1)
  assert.equal(topScores({ file })[0]!.score, 7)
})

test('persists across loads', () => {
  const file = fresh()
  addScore({ badgeId: 'a', name: 'A', score: 1, game: frog, players: 2 }, file)
  const again = topScores({ file })
  assert.equal(again.length, 1)
  assert.equal(again[0]!.players, 2)
})
