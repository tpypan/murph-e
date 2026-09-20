import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import {
  acknowledgeCloudItem,
  beginPlaySession,
  completePlaySession,
  type PublicGame,
  pendingCloudItems,
  queueCloudItem,
} from '../src/arcade-store.ts'
import { allScores } from '../src/scores.ts'

const game: PublicGame = {
  slug: 'fixture',
  title: 'Fixture',
  description: 'Offline test',
  genre: 'arcade',
  creator_name: 'Creator',
  supported_players: [1, 2],
  source: 'catalog',
  created_at: '2026-09-20T00:00:00Z',
}
const fresh = () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'arcade-store-'))
  return { dir, file: resolve(dir, 'scores.json') }
}
test('two-player results keep the starting identity, persist both scores, and deduplicate retries', () => {
  const { dir, file } = fresh()
  const identities = [
    { name: 'Player One', badgeId: 'badge-1' },
    { name: 'Player Two', badgeId: 'badge-2' },
  ]
  const session = beginPlaySession(game, 2, identities, dir)
  identities[0]!.name = 'Someone Else'
  const first = completePlaySession(session.id, [120, 30], 'win', 0, dir, file)
  const retry = completePlaySession(session.id, [120, 30], 'win', 0, dir, file)
  assert.deepEqual(first, retry)
  assert.equal(allScores(file).length, 2)
  assert.equal(first[0]!.name, 'Player One')
  const items = pendingCloudItems(dir).map((p) => p.item)
  assert.equal(items.length, 2)
  assert.ok(items.every((i) => i.kind === 'score' && i.game.slug === 'fixture'))
  assert.deepEqual(items.map((i) => i.kind === 'score' && i.outcome).sort(), ['loss', 'win'])
  assert.throws(() => completePlaySession(session.id, [999, 30], 'win', 0, dir, file), /CONFLICT/)
  assert.equal(allScores(file)[0]!.score, 120)
})
test('invalid or forged session results never write scores', () => {
  const { dir, file } = fresh()
  const s = beginPlaySession(game, 1, [null], dir)
  for (const scores of [[-1], [1.5], [Infinity], [2147483648], [1, 2], []])
    assert.throws(
      () => completePlaySession(s.id, scores, 'gameover', null, dir, file),
      /INVALID_SCORES/,
    )
  assert.throws(() => completePlaySession('../escape', [1], 'win', 0, dir, file), /INVALID_SESSION/)
  assert.throws(() => completePlaySession(s.id, [1], 'playing', null, dir, file), /INVALID_RESULT/)
  assert.throws(() => completePlaySession(s.id, [1], 'win', 1, dir, file), /INVALID_WINNER/)
  assert.deepEqual(allScores(file), [])
  assert.equal(pendingCloudItems(dir).length, 0)
})
test('separate guest runs stay separate and a partial upload can safely retry', () => {
  const { dir, file } = fresh()
  const a = beginPlaySession(game, 1, [null], dir)
  const b = beginPlaySession(game, 1, [null], dir)
  completePlaySession(a.id, [42], 'gameover', null, dir, file)
  completePlaySession(b.id, [42], 'gameover', null, dir, file)
  assert.equal(allScores(file).length, 2)
  assert.ok(allScores(file).every((s) => s.name === 'GUEST' && s.badgeId === null))
  const pending = pendingCloudItems(dir)[0]!
  acknowledgeCloudItem(pending.path, pending.item)
  assert.equal(pendingCloudItems(dir).length, 1)
  completePlaySession(a.id, [42], 'gameover', null, dir, file)
  assert.equal(allScores(file).length, 2)
  const updated = { kind: 'game' as const, game }
  queueCloudItem(updated, dir)
  const item = pendingCloudItems(dir).find((p) => p.item.kind === 'game')!
  queueCloudItem({ ...updated, game: { ...game, title: 'New title' } }, dir)
  acknowledgeCloudItem(item.path, item.item)
  assert.equal(JSON.parse(readFileSync(item.path, 'utf8')).game.title, 'New title')
})
