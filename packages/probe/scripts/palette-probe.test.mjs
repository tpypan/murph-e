import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import vm from 'node:vm'
import { closeProbe, probe } from '../src/probe.ts'

after(closeProbe)
const bad = readFileSync(
  new URL('../../../bench/known-bad/ragged-palette-rotation.js', import.meta.url),
  'utf8',
)
const good = bad.replace("'.12221.'", "'.122221.'")
const options = { controls: ['left', 'right', 'up', 'down', 'a'], thumb: false }

function geometry(code) {
  const context = vm.createContext({})
  vm.runInContext(code, context)
  return JSON.parse(
    vm.runInContext(
      `JSON.stringify({
    colors: COLORS.length,
    original: HULL,
    first: rotateArt(HULL),
    second: rotateArt(rotateArt(HULL))
  })`,
      context,
    ),
  )
}

test('ragged rows rotate undefined into a hard custom-palette draw failure', async () => {
  const shape = geometry(bad)
  assert.equal(shape.colors, 8)
  assert.ok(shape.original.every((row) => /^[.0-7]+$/.test(row)))
  assert.deepEqual([...new Set(shape.original.map((row) => row.length))].sort(), [7, 8])
  assert.ok(shape.first.some((row) => row.includes('undefined')))
  assert.ok(shape.second.some((row) => row.includes('f')))

  const result = await probe(bad, options)
  assert.equal(result.checks.loads, true)
  assert.equal(result.ok, false)
  assert.equal(result.checks.survives, false)
  assert.equal(result.checks.survivesInput, false)
  assert.ok(
    result.observations.some(
      (item) =>
        item.includes('crashed with no input') &&
        item.includes('Sprite pixel index f has no color in its 8-entry palette'),
    ),
  )
})

test('same eight-color art and rotations pass when the source rows are rectangular', async () => {
  const shape = geometry(good)
  assert.equal(shape.colors, 8)
  for (const rows of [shape.original, shape.first, shape.second]) {
    assert.equal(new Set(rows.map((row) => row.length)).size, 1)
    assert.ok(rows.every((row) => /^[.0-7]+$/.test(row)))
  }
  const result = await probe(good, options)
  assert.equal(result.ok, true, result.observations.join('; '))
  assert.equal(result.checks.survives, true)
  assert.equal(result.checks.survivesInput, true)
  assert.equal(result.checks.respondsToDirection, true)
  for (const direction of ['left', 'right', 'up', 'down'])
    assert.equal(result.checks[`soft:responds:${direction}`], true)
  assert.equal(result.checks['responds:a'], true)
})
