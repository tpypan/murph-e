import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BUILD_MAX_OUTPUT_TOKENS, build } from '../src/build.ts'
import { openai, withAppGeneration } from '../src/env.ts'
import { buildPrompt } from '../src/prompt.ts'
import type { GameSpec } from '../src/spec.ts'

const spec: GameSpec = {
  title: 'TEST',
  oneLiner: 'Test',
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
for (const status of [
  'completed',
  'incomplete',
  'missing-terminal',
  'completed-cleanup-error',
  'completed-cancelled',
] as const) {
  test(`build records ${status} stream usage and never accepts truncated output`, async (t) => {
    t.mock.method(globalThis, 'fetch', () => {
      throw new Error('Unexpected network call in offline stream test')
    })
    await withAppGeneration(async () => {
      const previous = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = 'test-not-a-real-key'
      const controller = new AbortController()
      let request: { reasoning: { effort: string }; max_output_tokens: number } | undefined
      t.mock.method(
        openai().responses,
        'create',
        async (args: { reasoning: { effort: string }; max_output_tokens: number }) => {
          request = args
          return (async function* () {
            // Deliberately syntactically valid partial game: status must still reject it.
            yield {
              type: 'response.output_text.delta',
              delta: 'function init() {}\nfunction update() {}\nfunction draw() {}',
            }
            // A clean transport EOF is not proof that the model finished. This
            // valid prefix must not become playable just because it parses.
            if (status === 'missing-terminal') return
            try {
              yield {
                type: status === 'incomplete' ? 'response.incomplete' : 'response.completed',
                response: {
                  incomplete_details:
                    status === 'incomplete' ? { reason: 'max_output_tokens' } : null,
                  usage: {
                    input_tokens: 100,
                    output_tokens: 20,
                    input_tokens_details: { cached_tokens: 30 },
                    output_tokens_details: { reasoning_tokens: 8 },
                  },
                },
              }
            } finally {
              if (status === 'completed-cancelled') controller.abort()
              // biome-ignore lint/correctness/noUnsafeFinally: deliberately simulate a failing stream iterator return().
              if (status === 'completed-cleanup-error') throw Error('transport cleanup failed')
            }
          })()
        },
      )
      try {
        const result = await build(buildPrompt(spec, 'test', []), {
          effort: 'medium',
          signal: controller.signal,
        })
        assert.equal(request?.reasoning.effort, 'medium')
        assert.equal(request?.max_output_tokens, BUILD_MAX_OUTPUT_TOKENS)
        assert.equal(result.usage.output, status === 'missing-terminal' ? 0 : 20)
        assert.equal(result.usage.reasoning, status === 'missing-terminal' ? 0 : 8)
        if (status === 'incomplete') {
          assert.match(result.syntaxError!, /output incomplete: max_output_tokens/)
          assert.equal(result.incompleteReason, 'max_output_tokens')
        } else if (status === 'missing-terminal') {
          assert.match(result.syntaxError!, /output incomplete: stream_ended_before_completion/)
          assert.equal(result.incompleteReason, 'stream_ended_before_completion')
          assert.match(result.sourceCode, /function draw/)
          assert.equal(result.sourceCode, `${result.raw}\n`)
        } else {
          assert.equal(result.syntaxError, null)
          assert.equal(result.incompleteReason, null)
          assert.match(result.sourceCode, /function draw/)
          if (status === 'completed-cancelled') assert.equal(controller.signal.aborted, true)
        }
      } finally {
        if (previous === undefined) delete process.env.OPENAI_API_KEY
        else process.env.OPENAI_API_KEY = previous
      }
    })
  })
}
