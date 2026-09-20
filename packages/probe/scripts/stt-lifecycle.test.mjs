import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { Stt } from '../../../apps/cabinet/app/stt.ts'

const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
let restore
let streams
let requests
let acquire
let response
const handlers = { onState() {} }
function stream() {
  const track = {
    readyState: 'live',
    stop() {
      this.readyState = 'ended'
    },
  }
  const value = { getTracks: () => [track], track }
  streams.push(value)
  return value
}
beforeEach(() => {
  streams = []
  requests = []
  acquire = async () => stream()
  response = async () => Response.json({ text: 'a penguin game' })
  const replacements = {
    navigator: { mediaDevices: { getUserMedia: () => acquire() } },
    fetch: async (url, options) => {
      requests.push({ url, options })
      assert.equal(url, '/api/stt', 'audio must only go to our local endpoint')
      assert.ok(streams.every((s) => s.track.readyState === 'ended'))
      return response()
    },
    MediaRecorder: class {
      static isTypeSupported() {
        return true
      }
      state = 'inactive'
      mimeType = 'audio/webm'
      start() {
        this.state = 'recording'
      }
      stop() {
        this.state = 'inactive'
        queueMicrotask(() => {
          this.ondataavailable?.({ data: new Blob(['test audio']) })
          this.onstop?.()
        })
      }
    },
  }
  const descriptors = Object.keys(replacements).map((name) => [
    name,
    Object.getOwnPropertyDescriptor(globalThis, name),
  ])
  for (const [name, value] of Object.entries(replacements))
    Object.defineProperty(globalThis, name, { configurable: true, value })
  restore = () => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
})
afterEach(() => restore())

test('idle does not capture or contact speech services', () => {
  const stt = new Stt()
  assert.equal(streams.length, 0)
  assert.deepEqual(requests, [])
  stt.cancel()
})
test('release ends tracks immediately and uploads only afterward', async () => {
  const stt = new Stt()
  const events = []
  await stt.start({ ...handlers, onStream: (s) => events.push(s) })
  assert.deepEqual(requests, [])
  const stopped = stt.stop()
  assert.equal(streams[0].track.readyState, 'ended')
  assert.equal(events.at(-1), null)
  assert.equal(await stopped, 'a penguin game')
  assert.equal(requests.length, 1)
})
for (const action of ['stop', 'cancel']) {
  test(`${action} while permission is pending closes the late stream`, async () => {
    const pending = deferred()
    acquire = () => pending.promise
    const stt = new Stt()
    const started = stt.start(handlers)
    await stt[action]()
    const late = stream()
    pending.resolve(late)
    await started
    assert.equal(late.track.readyState, 'ended')
    assert.deepEqual(requests, [])
  })
}
test('cancel discards audio without uploading', async () => {
  const stt = new Stt()
  await stt.start(handlers)
  stt.cancel()
  await new Promise(setImmediate)
  assert.equal(streams[0].track.readyState, 'ended')
  assert.deepEqual(requests, [])
})
test('new recording aborts an old transcription and ignores its result', async () => {
  const pending = deferred()
  response = () => pending.promise
  const stt = new Stt()
  await stt.start(handlers)
  const previous = stt.stop()
  await new Promise(setImmediate)
  await stt.start(handlers)
  assert.equal(requests[0].options.signal.aborted, true)
  pending.resolve(Response.json({ text: 'stale words' }))
  assert.equal(await previous, '')
  assert.equal(streams[1].track.readyState, 'live')
  stt.cancel()
})
test('local transcription failures are surfaced instead of looking like silence', async () => {
  response = async () => Response.json({ error: 'Run pnpm stt:setup' }, { status: 503 })
  const stt = new Stt()
  await stt.start(handlers)
  await assert.rejects(stt.stop(), /stt:setup/)
  assert.equal(streams[0].track.readyState, 'ended')
})
test('recording setup failure releases the microphone', async () => {
  const errors = []
  MediaRecorder.isTypeSupported = () => {
    throw new Error('unsupported')
  }
  const stt = new Stt()
  await stt.start({ onState: (state) => errors.push(state) })
  assert.equal(streams[0].track.readyState, 'ended')
  assert.deepEqual(errors, ['error'])
})
