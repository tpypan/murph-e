import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { test } from 'node:test'

// Bundle the actual HTTP route with a provider-free harness. Even an existing
// server key cannot turn this spending-policy regression into a paid test.
const require = createRequire(resolve(import.meta.dirname, '../../runtime/package.json'))
test('cabinet generates one shared game and ignores legacy client race values', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('NETWORK FORBIDDEN')
  })
  const calls: Array<{ text: string; options: Record<string, unknown> }> = []
  const fixture = {
    fail: false,
    async pipeline(text: string, options: { onEvent: (event: unknown) => void }) {
      calls.push({ text, options })
      if (fixture.fail) throw Error('fixture router failure')
      options.onEvent({ type: 'ready', players: 1, supportedPlayers: [1, 2], code: 'same game' })
    },
  }
  const bundled = await require('esbuild').build({
    entryPoints: [resolve(import.meta.dirname, '../../../apps/cabinet/app/api/generate/route.ts')],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    plugins: [
      {
        name: 'offline-harness',
        setup(builder: {
          onResolve: (
            options: { filter: RegExp },
            callback: (args: { path: string }) => unknown,
          ) => void
          onLoad: (
            options: { filter: RegExp; namespace: string },
            callback: (args: { path: string }) => unknown,
          ) => void
        }) {
          const stubs: Record<string, string> = {
            '../cloud-sync': 'export const startCloudSync=()=>{};',
            '@htn/harness':
              'export const pipeline=(...args)=>fixture.pipeline(...args); export const withAppGeneration=fn=>fn(); export const closeProbe=async()=>{}; export const queueCloudItem=()=>{};',
            '../badges/hub': 'export const getHub=()=>({badges:()=>[]});',
            './supabase-games': 'export const createGameCloudSave=()=>async()=>{};',
            './reuse-registry': 'export const createReuseSearch=()=>async()=>[];',
          }
          builder.onResolve({ filter: /.*/ }, (args: { path: string }) =>
            stubs[args.path] ? { path: args.path, namespace: 'fixture' } : undefined,
          )
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args: { path: string }) => ({
            contents: stubs[args.path],
            loader: 'js',
          }))
        },
      },
    ],
  })
  const module = { exports: {} as { POST: (request: Request) => Promise<Response> } }
  Function(
    'module',
    'exports',
    'fixture',
    bundled.outputFiles[0].text,
  )(module, module.exports, fixture)
  const request = (body: unknown) =>
    new Request('http://localhost/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  for (const body of [
    { transcript: 'vague arcade idea' },
    { transcript: 'two players', players: 2, race: 99 },
  ]) {
    const response = await module.exports.POST(request(body))
    const events = (await response.text())
      .trim()
      .split('\n\n')
      .map((line) => JSON.parse(line.slice(6)))
    assert.equal(events.length, 1)
    assert.deepEqual(events[0].supportedPlayers, [1, 2])
    assert.equal(calls.at(-1)!.options.race, 1)
  }
  assert.equal(calls.length, 2, 'one pipeline call per request')
  assert.equal(calls[1]!.options.players, 2, 'requested initial mode is preserved')
  assert.equal((await module.exports.POST(request({ transcript: ' ' }))).status, 400)
  assert.equal(calls.length, 2)
  fixture.fail = true
  const failed = await module.exports.POST(request({ transcript: 'failed route' }))
  assert.match(await failed.text(), /"terminal":true/)
})
