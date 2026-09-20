import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { validateCandidate } from '../src/candidate-history.ts'
import {
  archiveCandidate,
  type CandidateInput,
  candidateAttemptId,
  openCatalogDb,
  recordCandidateValidation,
} from '../src/catalog.ts'

const base: Omit<CandidateInput, 'validation'> = {
  runId: 'one',
  attemptId: 'build:0',
  stage: 'build',
  variant: 0,
  code: 'function init() {}',
  sourceCode: 'function init() {}',
  rawOutput: '```js\nfunction init() {}\n```',
  transcript: 'my first idea',
  spec: { title: 'FIRST', genre: 'paddle', players: 1 },
  model: 'fixture-model',
  effort: 'medium',
  parts: [{ id: 'pong', version: '1', hash: 'source-v1' }],
  sprites: [],
}
const pending = { runtimePassed: null, observations: [], outcome: 'pending' as const }

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'candidate-history-'))
  const options = { dbPath: resolve(root, 'index.sqlite'), storage: resolve(root, 'candidates') }
  return {
    root,
    options,
    read: (table: string) => {
      const db = openCatalogDb(options.dbPath)
      try {
        return db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()
      } finally {
        db.close()
      }
    },
    close: () => rmSync(root, { recursive: true, force: true }),
  }
}

test('identical game bytes retain different prompts/specs/models and immutable attempt files', () => {
  const f = fixture()
  try {
    const second = {
      ...base,
      runId: 'two',
      transcript: 'second idea',
      spec: { title: 'SECOND', genre: 'paddle duel', players: 2 },
      model: 'another-fixture',
      parts: [{ id: 'pong', version: '2', hash: 'source-v2' }],
    }
    const hash = archiveCandidate(
      { ...base, validation: pending },
      f.options.dbPath,
      f.options.storage,
    )
    archiveCandidate({ ...second, validation: pending }, f.options.dbPath, f.options.storage)
    const rows = f.read('candidate_attempts')
    assert.equal(rows.length, 2)
    assert.equal(f.read('generated_candidates').length, 1)
    assert.equal(f.read('generated_candidates')[0]!.occurrences, 2)
    for (const [i, input] of [base, second].entries()) {
      const meta = JSON.parse(String(rows[i]!.metadata_json))
      assert.equal(meta.transcript, input.transcript)
      assert.deepEqual(meta.spec, input.spec)
      assert.deepEqual(meta.parts, input.parts)
      assert.equal(meta.model, input.model)
      assert.equal(meta.rawOutput, input.rawOutput)
      const file = resolve(f.options.storage, hash, 'attempts', `${candidateAttemptId(input)}.json`)
      assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), meta)
    }
    recordCandidateValidation(
      base.code,
      { runtimePassed: true, observations: [], outcome: 'passed' },
      f.options.dbPath,
      candidateAttemptId(base),
      f.options.storage,
    )
    const final = f.read('candidate_attempts')
    assert.equal(JSON.parse(String(final[0]!.validation_json)).runtimePassed, true)
    assert.equal(JSON.parse(String(final[1]!.validation_json)).runtimePassed, null)
    assert.equal(final[0]!.metadata_json, rows[0]!.metadata_json)
    assert.equal(f.read('generated_candidates')[0]!.status, 'quarantined')
    assert.equal(readFileSync(resolve(f.options.storage, hash, 'game.js'), 'utf8'), base.code)
  } finally {
    f.close()
  }
})

test('same-run variants and repair/remix attempts deduplicate code, not generation history', () => {
  const f = fixture()
  try {
    for (const [stage, variant] of [
      ['build', 0],
      ['build', 1],
      ['repair', 0],
      ['remix', 0],
      ['remix-repair', 0],
    ] as const) {
      const input = {
        ...base,
        stage,
        variant,
        attemptId: `${stage}:${variant}`,
        validation: pending,
      }
      archiveCandidate(input, f.options.dbPath, f.options.storage)
      archiveCandidate(input, f.options.dbPath, f.options.storage)
    }
    assert.equal(f.read('candidate_attempts').length, 5)
    assert.equal(f.read('candidate_runs').length, 1)
    assert.equal(f.read('generated_candidates')[0]!.occurrences, 1)
    assert.throws(
      () =>
        archiveCandidate(
          { ...base, transcript: 'overwrite', validation: pending },
          f.options.dbPath,
          f.options.storage,
        ),
      /cannot be reused/,
    )
    assert.equal(
      JSON.parse(String(f.read('candidate_attempts')[0]!.metadata_json)).transcript,
      base.transcript,
    )
    assert.throws(
      () =>
        recordCandidateValidation(
          'other code',
          pending,
          f.options.dbPath,
          candidateAttemptId(base),
          f.options.storage,
        ),
      /unarchived/,
    )
  } finally {
    f.close()
  }
})

test('output is saved before probe entry; failures and cancellation preserve their own final outcome', async () => {
  const f = fixture()
  try {
    for (const scenario of ['success', 'failed', 'exception', 'cancelled'] as const) {
      const input = { ...base, runId: scenario }
      const error = new Error(scenario === 'exception' ? 'browser stopped' : 'operation aborted')
      if (scenario === 'cancelled') error.name = 'AbortError'
      const run = validateCandidate(
        input,
        () => {
          const row = f.read('candidate_attempts').find((r) => r.run_id === scenario)!
          assert.equal(JSON.parse(String(row.validation_json)).outcome, 'pending')
          assert.equal(
            readFileSync(resolve(f.options.storage, String(row.code_hash), 'game.js'), 'utf8'),
            base.code,
          )
          if (scenario === 'exception' || scenario === 'cancelled') throw error
          return {
            ok: scenario === 'success',
            observations: scenario === 'failed' ? ['bad controls'] : [],
          }
        },
        {
          ...f.options,
          onError: (error) => {
            throw error
          },
        },
      )
      if (scenario === 'exception' || scenario === 'cancelled')
        await assert.rejects(run, (e) => e === error)
      else assert.equal((await run).ok, scenario === 'success')
      const final = f.read('candidate_attempts').find((r) => r.run_id === scenario)!
      const validation = JSON.parse(String(final.validation_json))
      assert.equal(
        validation.outcome,
        { success: 'passed', failed: 'failed', exception: 'error', cancelled: 'cancelled' }[
          scenario
        ],
      )
      assert.equal(
        validation.runtimePassed,
        scenario === 'success' ? true : scenario === 'failed' ? false : null,
      )
      const events = f.read('candidate_validation_events').filter((r) => r.attempt_id === final.id)
      assert.equal(events.length, 2)
    }
  } finally {
    f.close()
  }
})

test('storage failure is reported but does not silently replace a valid game result', async () => {
  const f = fixture(),
    errors: unknown[] = []
  try {
    const invalid = resolve(f.root, 'not-a-directory')
    writeFileSync(invalid, 'fixture')
    const result = await validateCandidate(base, () => ({ ok: true, observations: [] }), {
      ...f.options,
      storage: invalid,
      onError: (error) => errors.push(error),
    })
    assert.equal(result.ok, true)
    assert.equal(errors.length, 1)
    assert.match(String(errors[0]), /directory|ENOTDIR/)
  } finally {
    f.close()
  }
})

test('opening a legacy candidate database preserves its rows without inventing old attempt provenance', () => {
  const f = fixture()
  try {
    archiveCandidate({ ...base, validation: pending }, f.options.dbPath, f.options.storage)
    const legacy = openCatalogDb(f.options.dbPath)
    legacy.exec('DROP TABLE candidate_validation_events; DROP TABLE candidate_attempts;')
    legacy.close()
    const migrated = openCatalogDb(f.options.dbPath)
    assert.equal(migrated.prepare('SELECT count(*) AS n FROM generated_candidates').get()?.n, 1)
    assert.equal(migrated.prepare('SELECT count(*) AS n FROM candidate_runs').get()?.n, 1)
    assert.equal(migrated.prepare('SELECT count(*) AS n FROM candidate_attempts').get()?.n, 0)
    migrated.close()
    archiveCandidate(
      { ...base, runId: 'new-run', validation: pending },
      f.options.dbPath,
      f.options.storage,
    )
    assert.equal(f.read('generated_candidates').length, 1)
    assert.equal(f.read('candidate_attempts').length, 1)
    assert.equal(f.read('generated_candidates')[0]!.occurrences, 2)
  } finally {
    f.close()
  }
})
