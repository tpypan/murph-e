import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from '../src/build.ts'
import { APP_API_ONLY_MESSAGE, openai, withAppGeneration } from '../src/env.ts'
import { buildPrompt } from '../src/prompt.ts'
import { remix } from '../src/remix.ts'
import { repair } from '../src/repair.ts'
import { type GameSpec, specify } from '../src/spec.ts'

const spec: GameSpec = {
  title: 'OFFLINE',
  oneLiner: 'Offline fixture',
  genre: 'test',
  mechanics: ['Test'],
  controls: { left: null, right: null, up: null, down: null, a: null, b: null },
  palette: 'arcade',
  lose: 'Test',
  scoring: 'Test',
  moderated: false,
  note: '',
  remix: false,
  changes: [],
  players: 1,
}

test('developer model paths reject before network, regardless of configured keys', async (t) => {
  let networkCalls = 0
  t.mock.method(globalThis, 'fetch', () => {
    networkCalls++
    throw new Error('Network forbidden in policy test')
  })
  const previous = process.env.OPENAI_API_KEY
  process.env.OPENAI_API_KEY = 'offline-dummy-key'
  try {
    assert.throws(() => openai(), { message: APP_API_ONLY_MESSAGE })
    const prompt = buildPrompt(spec, 'offline policy test', [])
    for (const run of [
      () => specify('offline policy test'),
      () => build(prompt),
      () => repair(prompt, spec, 'function init(){}', ['Offline test']),
      () => remix(prompt, spec, 'function init(){}', ['Offline test']),
    ])
      await assert.rejects(run, { message: APP_API_ONLY_MESSAGE })
    assert.equal(networkCalls, 0)
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previous
  }
})

test('app scope allows the transport, survives awaits and cannot leak a cached client', async (t) => {
  let mockedRequests = 0
  t.mock.method(globalThis, 'fetch', async () => {
    mockedRequests++
    return new Response(
      JSON.stringify({
        id: 'offline-fixture',
        object: 'response',
        status: 'completed',
        output: [],
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  })
  const previous = process.env.OPENAI_API_KEY
  process.env.OPENAI_API_KEY = 'offline-dummy-key'
  try {
    const retained = await withAppGeneration(async () => {
      await Promise.resolve()
      const client = openai()
      const result = await client.responses.create(
        { model: 'offline-fixture', input: 'fixture' },
        { maxRetries: 0 },
      )
      assert.equal(result.id, 'offline-fixture')
      return client
    })
    assert.equal(mockedRequests, 1)
    assert.throws(() => openai(), { message: APP_API_ONLY_MESSAGE })
    await assert.rejects(
      retained.responses.create({ model: 'offline-fixture', input: 'fixture' }, { maxRetries: 0 }),
      (error: unknown) =>
        error instanceof Error &&
        error.cause instanceof Error &&
        error.cause.message === APP_API_ONLY_MESSAGE,
    )
    assert.equal(mockedRequests, 1, 'retained client must not reach even the mocked network')
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previous
  }
})

test('an in-flight app request does not authorize concurrent developer work', async () => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const previous = process.env.OPENAI_API_KEY
  process.env.OPENAI_API_KEY = 'offline-dummy-key'
  try {
    const app = withAppGeneration(async () => {
      await gate
      assert.doesNotThrow(() => openai())
    })
    assert.throws(() => openai(), { message: APP_API_ONLY_MESSAGE })
    release()
    await app
    assert.throws(() => openai(), { message: APP_API_ONLY_MESSAGE })
  } finally {
    release()
    if (previous === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previous
  }
})
