import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { createRun } from '../src/run-store.ts'

test('identical simultaneous prompts retain independent source and provenance', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'arcade-runs-'))
  try {
    const runs = Array.from({ length: 20 }, () =>
      createRun('Street Fighter with Batman and Flash', root),
    )
    assert.equal(new Set(runs.map((r) => r.id)).size, 20)
    runs.forEach((r, i) => {
      r.write('game.js', String(i))
    })
    runs.forEach((r, i) => {
      assert.equal(readFileSync(resolve(r.dir, 'game.js'), 'utf8'), String(i))
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
