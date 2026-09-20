import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { build } from '../src/build.ts'
import { type CatalogPart, catalogContext } from '../src/catalog.ts'
import { APP_API_ONLY_MESSAGE, openai, withAppGeneration } from '../src/env.ts'
import { JEV_DEADLINE_MS, jevRequest, readJevDecision, selectWithJev } from '../src/jev.ts'
import { pipeline } from '../src/pipeline.ts'
import { buildPrompt } from '../src/prompt.ts'
import type { GameSpec } from '../src/spec.ts'

const spec: GameSpec = {
  title: 'ALIENS',
  oneLiner: 'Shoot aliens',
  genre: 'shooter',
  mechanics: ['Shoot aliens'],
  controls: {
    left: 'Move left',
    right: 'Move right',
    up: null,
    down: null,
    a: 'Fire',
    b: 'Shield',
  },
  palette: 'arcade',
  lose: 'No lives',
  scoring: 'Shoot aliens',
  moderated: false,
  note: '',
  remix: false,
  changes: [],
  players: 1,
}
const part: CatalogPart = {
  manifest: {
    schemaVersion: 1,
    id: 'formation-shooter',
    entry: 'formationShooter',
    version: '1',
    title: 'Alien formation',
    description: 'Shoot a moving alien formation',
    tags: ['aliens'],
    supportsPlayers: [1, 2],
    module: 'module.js',
    apiVersion: 1,
    license: { spdx: 'MIT', notes: 'Offline fixture' },
    provenance: { kind: 'original', authors: ['fixture'], sources: [], createdAt: '2026-09-20' },
    files: [],
    assets: [],
  },
  dir: '/tmp/jev-offline-fixture',
  hash: 'fixture-hash',
  status: 'verified',
  checks: [],
  api: 'ARCADE.formationShooter({lives:1..8,difficulty:0..1,shields:boolean})',
  module: '(config) => ({init(api){api.cls(0)},update(){},draw(api){api.cls(0)}})',
}

function configure(t: TestContext, values: Record<string, string | undefined> = {}) {
  const entries = { TYPESAFE_API_KEY: 'offline-jev-secret', HTN_CATALOG: '1', ...values }
  const prior = Object.fromEntries(Object.keys(entries).map((key) => [key, process.env[key]]))
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  t.after(() => {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
}

function responseFor(
  request: ReturnType<typeof jevRequest>['request'],
  selected = part.manifest.id,
  confidence = 0.95,
) {
  return {
    model: 'jev-1.13.0',
    usage: { input_tokens: 400, output_tokens: 20 },
    answers: Object.fromEntries(
      Object.entries(request.questions).map(([id, question]) => {
        const choice = id === 'foundation' ? selected : 'hard'
        return [
          id,
          {
            type: 'choice',
            choice,
            confidence,
            probabilities: Object.fromEntries(
              Object.keys(question.criteria).map((option) => [option, option === choice ? 1 : 0]),
            ),
          },
        ]
      }),
    ),
  }
}

test('semantic candidates recover absent keywords but respect catalog exclusions and player count', (t) => {
  configure(t)
  const transcript = 'Protect the planet against a descending fleet'
  const prepared = jevRequest(transcript, spec, [
    part,
    { ...part, manifest: { ...part.manifest, id: 'draft' }, status: 'draft' },
  ])
  assert.deepEqual(
    prepared.candidates.map((p) => p.manifest.id),
    [part.manifest.id],
  )
  assert.equal(catalogContext(transcript, spec, [part]).parts.length, 0)
  assert.equal(catalogContext(transcript, spec, [part], { id: part.manifest.id }).parts.length, 1)
  assert.equal(
    jevRequest(transcript, { ...spec, players: 2 }, [
      { ...part, manifest: { ...part.manifest, supportsPlayers: [1] } },
    ]).candidates.length,
    0,
  )
  assert.equal(
    catalogContext(transcript, spec, [{ ...part, status: 'draft' }], { id: part.manifest.id }).parts
      .length,
    0,
  )
})

test('moderated request words are not sent to Jev; player count stays explicit', (t) => {
  configure(t)
  const prepared = jevRequest(
    'original private rejected words',
    { ...spec, moderated: true, players: 2 },
    [part],
  )
  assert.equal(prepared.request.state.request, '')
  assert.equal(prepared.request.state.spec.players, 2)
  assert.doesNotMatch(JSON.stringify(prepared.request), /original private rejected words/)
})

test('no-match and uncertain selection leave custom code to Astra; uncertain presets are ignored', (t) => {
  configure(t)
  const prepared = jevRequest('aliens', spec, [part])
  for (const [choice, confidence] of [
    ['no_match', 0.95],
    [part.manifest.id, 0.2],
  ] as const) {
    const result = readJevDecision(responseFor(prepared.request, choice, confidence), prepared)
    assert.equal(result.selectedId, null)
    assert.deepEqual(result.config, {})
  }
  const response = responseFor(prepared.request)
  response.answers[`preset:${part.manifest.id}`]!.confidence = 0.2
  assert.deepEqual(readJevDecision(response, prepared).config, {})
})

test('missing answers, unknown choices, invalid confidence and distributions fail closed', (t) => {
  configure(t)
  const prepared = jevRequest('aliens', spec, [part])
  for (const mutate of [
    (r: ReturnType<typeof responseFor>) => {
      delete r.answers.foundation
    },
    (r: ReturnType<typeof responseFor>) => {
      r.answers.foundation!.choice = 'injected'
    },
    (r: ReturnType<typeof responseFor>) => {
      r.answers.foundation!.confidence = 2
    },
    (r: ReturnType<typeof responseFor>) => {
      r.answers.foundation!.probabilities = { injected: 1 }
    },
    (r: ReturnType<typeof responseFor>) => {
      r.answers.foundation!.probabilities.no_match = 1
    },
  ]) {
    const response = responseFor(prepared.request)
    mutate(response)
    assert.throws(() => readJevDecision(response, prepared), /Jev returned/)
  }
})

test('Jev rejects developer calls before transport and rejects missing key before Luna', async (t) => {
  configure(t, { HTN_JEV: '1' })
  let calls = 0
  t.mock.method(globalThis, 'fetch', () => {
    calls++
    throw new Error('Network forbidden')
  })
  await assert.rejects(selectWithJev('aliens', spec, { parts: [part] }), {
    message: APP_API_ONLY_MESSAGE,
  })
  await assert.rejects(pipeline('aliens'), { message: APP_API_ONLY_MESSAGE })
  delete process.env.TYPESAFE_API_KEY
  await assert.rejects(
    withAppGeneration(() => pipeline('aliens')),
    /TYPESAFE_API_KEY is required/,
  )
  assert.equal(calls, 0)
})

test('one mocked Jev request supplies advisory settings to an Astra build and catalog linker', async (t) => {
  configure(t, { OPENAI_API_KEY: 'offline-astra-secret' })
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    calls++
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone')
    assert.equal(init.method, 'POST')
    const request = JSON.parse(String(init.body))
    assert.equal(Object.keys(request.questions).length, 2)
    return Response.json(responseFor(request))
  })
  await withAppGeneration(async () => {
    const hybrid = await selectWithJev('hard alien shooter', spec, { parts: [part] })
    assert.deepEqual(hybrid.audit.config, { lives: 3, difficulty: 0.8 })
    assert.doesNotMatch(JSON.stringify(hybrid.audit), /offline-jev-secret/)
    let astraCalls = 0
    t.mock.method(openai().responses, 'create', async (args: { input: string; model: string }) => {
      astraCalls++
      assert.equal(args.model, 'gpt-6-astra')
      assert.match(args.input, /JEV FOUNDATION ADVICE/)
      assert.match(args.input, /"difficulty":0.8/)
      assert.match(args.input, /original request remains authoritative/)
      return (async function* () {
        yield {
          type: 'response.output_text.delta',
          delta:
            'let game; function init(api){game=ARCADE.formationShooter({difficulty:0.8});game.init(api)} function update(api,dt){game.update(api,dt)} function draw(api){game.draw(api)}',
        }
        yield {
          type: 'response.completed',
          response: { usage: { input_tokens: 10, output_tokens: 10 } },
        }
      })()
    })
    const result = await build(buildPrompt(spec, 'hard alien shooter', [], hybrid))
    assert.equal(result.syntaxError, null)
    assert.match(result.code, /arcade-catalog-bundle/)
    assert.equal(astraCalls, 1)
  })
  assert.equal(calls, 1)
})

test('HTTP error bodies are not exposed and there are no automatic retries', async (t) => {
  configure(t)
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return new Response('offline-jev-secret', { status: 429 })
  })
  await assert.rejects(
    withAppGeneration(() => selectWithJev('aliens', spec, { parts: [part] })),
    { message: 'Jev selection failed (HTTP 429)' },
  )
  assert.equal(calls, 1)
})

test('cancellation covers the full Jev response body', async (t) => {
  configure(t)
  const controller = new AbortController()
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    json: () => {
      controller.abort()
      return new Promise(() => {})
    },
  }))
  await assert.rejects(
    withAppGeneration(() =>
      selectWithJev('aliens', spec, { parts: [part], signal: controller.signal }),
    ),
    { name: 'AbortError' },
  )
})

test('catalog-disabled and empty catalogs skip Jev transport', async (t) => {
  configure(t, { HTN_CATALOG: '0' })
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Network forbidden')
  })
  const result = await withAppGeneration(() => selectWithJev('aliens', spec, { parts: [part] }))
  assert.equal(result.audit.reason, 'no_eligible_foundations')
  assert.equal(result.catalog.parts.length, 0)
})

test('Jev full-response deadline aborts a stalled transport', async (t) => {
  configure(t)
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let transportSignal: AbortSignal | undefined
  t.mock.method(globalThis, 'fetch', (_url: string, init: RequestInit) => {
    transportSignal = init.signal as AbortSignal
    return new Promise(() => {})
  })
  const result = withAppGeneration(() => selectWithJev('aliens', spec, { parts: [part] }))
  const rejection = assert.rejects(result, /Jev selection exceeded its 10s request deadline/)
  t.mock.timers.tick(JEV_DEADLINE_MS)
  await rejection
  assert.equal(transportSignal?.aborted, true)
})

test('already cancelled requests and explicit foundation exclusions cannot reach Jev', async (t) => {
  configure(t)
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Network forbidden')
  })
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    withAppGeneration(() =>
      selectWithJev('aliens', spec, { parts: [part], signal: controller.signal }),
    ),
    { name: 'AbortError' },
  )
  const excluded = {
    ...part,
    manifest: { ...part.manifest, id: 'crossing', entry: 'crossing', tags: ['frogger'] },
  }
  assert.equal(
    jevRequest('A frog crossing traffic while shooting bullets', spec, [excluded]).candidates
      .length,
    0,
  )
  const empty = await withAppGeneration(() => selectWithJev('a novel game', spec, { parts: [] }))
  assert.equal(empty.audit.reason, 'no_eligible_foundations')
})
