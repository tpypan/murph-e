import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { assembleCatalog, catalogContext, loadCatalog } from '../src/catalog.ts'
import { requestClauses } from '../src/request-text.ts'

test('airplane substitution preserves positive intent and chooses the verified flying foundation', () => {
  const q = 'i want to create a game like maria cart but instead of cars use planes'
  const parsed = requestClauses(q)
  assert.match(parsed.positive, /planes/)
  assert.doesNotMatch(parsed.negative, /planes/)
  assert.match(parsed.negative, /cars/)
  const part = loadCatalog().find((p) => p.manifest.id === 'sky-racer')!
  assert.equal(part.status, 'verified')
  for (const prompt of [q, 'Mario Kart but with planes', 'airplane racing']) {
    const context = catalogContext(prompt, { players: 1 })
    assert.equal(context.parts[0]?.manifest.id, 'sky-racer')
    const demo = readFileSync(resolve(part.dir, 'demo.js'), 'utf8')
    const assembled = assembleCatalog(demo, context)
    assert.ok(demo.length < 250)
    assert.ok(assembled.length > 25000)
    assert.match(context.text, /do not print them again/i)
  }
})

test('flight foundation is not offered for incompatible requests or player counts', () => {
  for (const [prompt, players] of [
    ['Mario Kart but with planes', 2],
    ['plane racing with guns', 1],
    ['3D flight simulator', 1],
    ['plane racing without planes', 1],
  ] as const) {
    assert.ok(!catalogContext(prompt, { players }).parts.some((p) => p.manifest.id === 'sky-racer'))
  }
  assert.equal(catalogContext('Mario Kart', { players: 1 }).parts[0]?.manifest.id, 'kart')
  assert.match(requestClauses('planes instead of cars').positive, /planes/)
  assert.match(requestClauses('instead of planes use cars').negative, /planes/)
})
