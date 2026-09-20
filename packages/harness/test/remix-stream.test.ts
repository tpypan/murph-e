import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { test } from 'node:test'
import type { remix } from '../src/remix.ts'

const require = createRequire(resolve(import.meta.dirname, '../../runtime/package.json'))
test('remix preserves terminal output across cancellation/cleanup and rejects unterminated edits', async (t) => {
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('NETWORK FORBIDDEN')
  })
  const built = await require('esbuild').build({
    entryPoints: [resolve(import.meta.dirname, '../src/remix.ts')],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    plugins: [
      {
        name: 'offline-remix',
        setup(builder: {
          onResolve: (options: { filter: RegExp }, fn: (args: { path: string }) => unknown) => void
          onLoad: (
            options: { filter: RegExp; namespace: string },
            fn: (args: { path: string }) => unknown,
          ) => void
        }) {
          builder.onResolve({ filter: /^\.\/(env|build)\.ts$/ }, (args: { path: string }) => ({
            path: args.path,
            namespace: 'fixture',
          }))
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args: { path: string }) => ({
            contents:
              args.path === './build.ts'
                ? 'export const syntaxCheck=()=>null;'
                : 'export const MODELS={};export const now=()=>0;export const ms=()=>0;export const openai=()=>({responses:{create:fixture.create}});',
            loader: 'js',
          }))
        },
      },
    ],
  })
  const raw =
    '<<<<<<< SEARCH\nfunction init() {}\n=======\nfunction init() {return 1}\n>>>>>>> REPLACE'
  for (const status of ['completed', 'incomplete', 'missing', 'cleanup', 'cancelled']) {
    const controller = new AbortController()
    const fixture = {
      create: async () =>
        (async function* () {
          yield { type: 'response.output_text.delta', delta: raw }
          if (status === 'missing') return
          try {
            yield {
              type: status === 'incomplete' ? 'response.incomplete' : 'response.completed',
              response: {
                incomplete_details: { reason: 'max_output_tokens' },
                usage: { input_tokens: 10, output_tokens: 4 },
              },
            }
          } finally {
            if (status === 'cancelled') controller.abort()
            // biome-ignore lint/correctness/noUnsafeFinally: exercise failing iterator teardown.
            if (status === 'cleanup') throw Error('cleanup failed')
          }
        })(),
    }
    const module = { exports: {} as { remix: typeof remix } }
    Function(
      'module',
      'exports',
      'require',
      'fixture',
      built.outputFiles[0].text,
    )(module, module.exports, require, fixture)
    const result = await module.exports.remix(
      { system: '', cacheKey: 'fixture' } as Parameters<typeof remix>[0],
      {} as Parameters<typeof remix>[1],
      'function init() {}',
      ['edit'],
      { signal: controller.signal },
    )
    assert.equal(result.raw, raw)
    if (status === 'incomplete' || status === 'missing') {
      assert.match(result.applyError!, /output incomplete/)
      assert.equal(result.code, 'function init() {}')
    } else {
      assert.equal(result.applyError, null)
      assert.equal(result.code, 'function init() {return 1}')
      assert.equal(result.usage.output, 4)
    }
  }
})
