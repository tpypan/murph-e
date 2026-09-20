import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withDeadline } from '../src/deadline.ts'

test('completed requests keep their result and failures keep their error', async () => {
  assert.equal(await withDeadline('build', 1000, undefined, async () => 'game'), 'game')
  await assert.rejects(
    withDeadline('build', 1000, undefined, async () => {
      throw new Error('network')
    }),
    /network/,
  )
})

test('a stalled stream rejects and its transport signal is aborted', async () => {
  let transport: AbortSignal | undefined
  await assert.rejects(
    withDeadline('build', 10, undefined, (signal) => {
      transport = signal
      return new Promise(() => {})
    }),
    /build exceeded/,
  )
  assert.equal(transport?.aborted, true)
})

test('already-cancelled requests never start', async () => {
  let called = false
  await assert.rejects(
    withDeadline('spec', 1000, AbortSignal.abort(), async () => {
      called = true
    }),
    { name: 'AbortError' },
  )
  assert.equal(called, false)
})

test('cancellation during streaming interrupts immediately', async () => {
  const controller = new AbortController()
  let transport: AbortSignal | undefined
  const request = withDeadline('remix', 1000, controller.signal, (signal) => {
    transport = signal
    return new Promise(() => {})
  })
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
  assert.equal(transport?.aborted, true)
})
