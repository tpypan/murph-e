import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classifyGenerationError } from '../../../apps/cabinet/app/generation-error.ts'

test('developer API restrictions are nonretryable and do not ask app users for Codex', () => {
  const result = classifyGenerationError('APP_API_ONLY: private developer diagnostic')
  assert.equal(result.kind, 'app-only')
  assert.equal(result.retryable, false)
  assert.equal(result.message, 'GENERATION IS ONLY AVAILABLE THROUGH THE APP.')
})

test('the actual enforced spend-limit failure survives 429 classification without account details', () => {
  const result = classifyGenerationError(
    '429 Your project has reached its configured enforced spend limit. Update your limit at https://platform.openai.com/settings/proj_private/limits.',
    429,
  )
  assert.equal(result.kind, 'spend-limit')
  assert.equal(result.retryable, false)
  assert.match(result.message, /SPEND LIMIT REACHED/)
  assert.doesNotMatch(result.message, /proj_private|https:|settings/)
})

test('insufficient quota is an account problem, while ordinary 429 failures are temporary', () => {
  for (const message of [
    '429 insufficient_quota',
    'You exceeded your current quota, please check your plan and billing details.',
  ]) {
    assert.equal(classifyGenerationError(message, 429).kind, 'quota')
    assert.equal(classifyGenerationError(message, 429).retryable, false)
  }
  for (const message of [
    '429 Too Many Requests',
    'build 0: 429 Rate limit reached for requests per minute',
    'rate_limit_exceeded',
  ]) {
    assert.equal(classifyGenerationError(message).kind, 'rate-limit')
    assert.equal(classifyGenerationError(message).retryable, true)
  }
  assert.equal(classifyGenerationError('', 429).kind, 'rate-limit')
})

test('authentication failures never reveal a rejected API key', () => {
  for (const message of [
    '401 Incorrect API key provided: sk-private-example',
    'OPENAI_API_KEY is not set. Copy .env.example to .env and fill it in.',
    'Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.',
    'invalid_api_key',
  ]) {
    const result = classifyGenerationError(message)
    assert.equal(result.kind, 'auth')
    assert.equal(result.retryable, false)
    assert.doesNotMatch(result.message, /sk-private|\.env|environment variable/)
  }
  assert.equal(classifyGenerationError('', 401).kind, 'auth')
})

test('local full-response deadlines and provider request timeouts offer retry', () => {
  for (const message of [
    'spec exceeded its 30s request deadline',
    'build 0: build exceeded its 300s request deadline',
    'Request timed out.',
    'APIConnectionTimeoutError',
  ]) {
    const result = classifyGenerationError(message)
    assert.equal(result.kind, 'timeout')
    assert.equal(result.retryable, true)
  }
  assert.equal(classifyGenerationError('', 504).kind, 'timeout')
})

test('unrelated game errors do not become billing errors and raw details stay private', () => {
  for (const message of [
    'QuotaExceededError: local storage is full',
    'Unknown mechanic: collect a quota of 5 stars before the deadline',
    'ReferenceError: timeout is not defined at game.js:429',
    'Failed at https://private.example/proj_private?key=sk-private-example',
    '',
  ]) {
    const result = classifyGenerationError(message)
    assert.equal(result.kind, 'unknown')
    assert.equal(result.message, 'COULD NOT MAKE THAT GAME. TRY AGAIN.')
  }
})
