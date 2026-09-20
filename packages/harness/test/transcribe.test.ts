import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { transcribeWithOpenAI } from '../../../apps/cabinet/app/api/stt/openai-transcribe.ts'
import { POST } from '../../../apps/cabinet/app/api/stt/route.ts'
import { APP_API_ONLY_MESSAGE } from '../src/env.ts'
import {
  MAX_AUDIO_BYTES,
  speechProvider,
  TRANSCRIPTION_DEADLINE_MS,
  transcriptionError,
  transcriptionFile,
} from '../src/transcribe.ts'

function configure(t: TestContext) {
  const keys = ['OPENAI_API_KEY', 'HTN_STT', 'HTN_STT_PROVIDER', 'HTN_STT_MODEL']
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  process.env.OPENAI_API_KEY = 'offline-speech-key'
  process.env.HTN_STT_PROVIDER = 'openai'
  delete process.env.HTN_STT
  delete process.env.HTN_STT_MODEL
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
}

const clip = () => new Blob(['offline-audio-fixture'], { type: 'audio/webm;codecs=opus' })
function request(audio: Blob = clip(), signal?: AbortSignal) {
  const body = new FormData()
  body.append('audio', audio, 'clip.webm')
  return new Request('http://localhost/api/stt', { method: 'POST', body, signal })
}

test('developer transcription is blocked before transport even with a configured key', async (t) => {
  configure(t)
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Network forbidden')
  })
  await assert.rejects(transcribeWithOpenAI(Buffer.from('offline-audio-fixture'), 'clip.webm'), {
    message: APP_API_ONLY_MESSAGE,
  })
})

test('main speech implementation uploads original audio with its model, English and JSON settings', async (t) => {
  configure(t)
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    // The SDK probes native multipart support with a data URL, not a network call.
    if (String(url) === 'data:,') return new Response(null)
    calls++
    assert.equal(String(url), 'https://api.openai.com/v1/audio/transcriptions')
    const form = await new Request(String(url), init).formData()
    assert.equal(form.get('model'), 'gpt-4o-mini-transcribe')
    assert.equal(form.get('prompt'), null)
    assert.equal(form.get('language'), 'en')
    assert.equal(form.get('response_format'), 'json')
    const file = form.get('file') as File
    assert.equal(file.name, 'speech.webm')
    assert.equal(file.type, 'audio/webm')
    assert.equal(await file.text(), 'offline-audio-fixture')
    return Response.json({ text: '  Spider-Man versus Venom, but no shooting.  ' })
  })
  const result = await POST(request())
  assert.equal(result.status, 200)
  const body = await result.json()
  assert.equal(typeof body.ms, 'number')
  assert.deepEqual(body, {
    text: 'Spider-Man versus Venom, but no shooting.',
    model: 'gpt-4o-mini-transcribe',
    local: false,
    ms: body.ms,
  })
  assert.equal(calls, 1)
})

test('empty, oversized and unsupported recordings never reach the paid transport', async (t) => {
  configure(t)
  t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Network forbidden')
  })
  assert.equal((await POST(request(new Blob([])))).status, 200)
  assert.equal(
    (await POST(request(new Blob([new Uint8Array(MAX_AUDIO_BYTES + 1)], { type: 'audio/webm' }))))
      .status,
    413,
  )
  assert.equal((await POST(request(new Blob(['not audio'], { type: 'text/plain' })))).status, 415)
})

test('main model override and validated WAV metadata survive the route adapter', async (t) => {
  configure(t)
  process.env.HTN_STT_MODEL = 'gpt-4o-transcribe'
  t.mock.method(globalThis, 'fetch', async (url: unknown, init: RequestInit) => {
    if (String(url) === 'data:,') return new Response(null)
    const form = await new Request(String(url), init).formData()
    assert.equal(form.get('model'), 'gpt-4o-transcribe')
    const file = form.get('file') as File
    assert.equal(file.type, 'audio/wav')
    assert.equal(file.name, 'speech.wav')
    assert.equal(await file.text(), 'wav-fixture')
    return Response.json({ text: 'Planes instead of cars.' })
  })
  const response = await POST(request(new Blob(['wav-fixture'], { type: 'audio/wav' })))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).model, 'gpt-4o-transcribe')
})

test('MP4 recording retains its container name and bytes', async () => {
  const file = transcriptionFile(new Blob(['mp4-fixture'], { type: 'audio/mp4' }))
  assert.equal(file.name, 'speech.mp4')
  assert.equal(await file.text(), 'mp4-fixture')
})

test('provider failures are sanitized and not retried or silently replaced with tiny.en', async (t) => {
  configure(t)
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return Response.json(
      {
        error: {
          message: 'bad key sk-private-fixture at https://private.example',
          type: 'authentication_error',
          code: 'invalid_api_key',
        },
      },
      { status: 401 },
    )
  })
  const result = await POST(request())
  assert.equal(result.status, 503)
  const body = await result.json()
  assert.match(body.error, /OpenAI API key/)
  assert.doesNotMatch(body.error, /sk-private|private.example/)
  assert.equal(calls, 1)
})

test('parent cancellation stops an in-flight speech request', async (t) => {
  configure(t)
  const controller = new AbortController()
  let entered!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  let transportSignal: AbortSignal | undefined
  t.mock.method(globalThis, 'fetch', (_url: unknown, init: RequestInit) => {
    transportSignal = init.signal as AbortSignal
    entered()
    return new Promise((_resolve, reject) => {
      transportSignal!.addEventListener('abort', () => reject(transportSignal!.reason), {
        once: true,
      })
    })
  })
  const pending = POST(request(clip(), controller.signal))
  await started
  controller.abort()
  assert.equal((await pending).status, 499)
  assert.equal(transportSignal?.aborted, true)
})

test('full-response timeout aborts a stalled speech request', async (t) => {
  configure(t)
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let entered!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  t.mock.method(globalThis, 'fetch', (_url: unknown, init: RequestInit) => {
    entered()
    return new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true })
    })
  })
  const pending = POST(request())
  await started
  t.mock.timers.tick(TRANSCRIPTION_DEADLINE_MS)
  assert.equal((await pending).status, 504)
})

test('local provider is explicit, unknown providers fail and public errors disclose no raw details', (t) => {
  configure(t)
  assert.equal(speechProvider(), 'openai')
  process.env.HTN_STT_PROVIDER = 'local'
  assert.equal(speechProvider(), 'local')
  process.env.HTN_STT = 'openai'
  assert.equal(speechProvider(), 'openai', 'main setting takes precedence over legacy alias')
  process.env.HTN_STT = 'local'
  process.env.HTN_STT_PROVIDER = 'openai'
  assert.equal(speechProvider(), 'local')
  delete process.env.HTN_STT
  process.env.HTN_STT_PROVIDER = 'typo'
  assert.throws(speechProvider, /HTN_STT_PROVIDER/)
  for (const status of [400, 401, 403, 404, 429, 500]) {
    const error = Object.assign(new Error('secret-provider-body'), { status })
    assert.doesNotMatch(transcriptionError(error).error, /secret-provider/)
  }
})
