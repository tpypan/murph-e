import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  flushResults,
  pendingResults,
  retainResult,
} from '../../../apps/cabinet/app/score-delivery.ts'

test('browser delivery retains failed results and removes only acknowledged rounds', async () => {
  const map = new Map<string, string>()
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
  }
  const a = { sessionId: 'a', scores: [5], state: 'gameover' as const, winner: null }
  retainResult(a, storage)
  retainResult(a, storage)
  assert.equal(pendingResults(storage).length, 1)
  await flushResults(storage, (async () => new Response('', { status: 503 })) as typeof fetch)
  assert.equal(pendingResults(storage).length, 1)
  let calls = 0
  await flushResults(storage, (async () => {
    calls++
    return new Response('{}', { status: 202 })
  }) as typeof fetch)
  assert.equal(calls, 1)
  assert.equal(pendingResults(storage).length, 0)
})
