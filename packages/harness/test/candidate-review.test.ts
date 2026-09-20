import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import {
  type CandidateReviewInput,
  inspectCandidate,
  listCandidateFindings,
  listCandidates,
  saveCandidateReview,
} from '../src/candidate-review.ts'
import { archiveCandidate, candidateAttemptId, openCatalogDb } from '../src/catalog.ts'

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'candidate-review-'))
  const options = {
    dbPath: resolve(root, 'index.sqlite'),
    storage: resolve(root, 'candidates'),
    evidenceRoot: root,
  }
  const input = {
    runId: 'first-run',
    attemptId: 'build:0',
    stage: 'build' as const,
    variant: 0,
    code: 'function init() { return 1 }',
    sourceCode: 'fixture source',
    rawOutput: 'fixture raw output',
    transcript: 'keep the usual scoring',
    spec: { title: 'TEST GAME', genre: 'space rocks', players: 1 },
    model: 'offline-fixture',
    effort: 'medium',
    validation: { runtimePassed: true, observations: [] },
  }
  const hash = archiveCandidate(input, options.dbPath, options.storage)
  const second = {
    ...input,
    runId: 'second-run',
    transcript: 'add a dolphin instead',
    spec: { ...input.spec, players: 2 },
  }
  archiveCandidate(second, options.dbPath, options.storage)
  writeFileSync(
    resolve(root, 'proof.json'),
    JSON.stringify({ observedBonus: 450, expectedBonus: 0 }),
  )
  const review: CandidateReviewInput = {
    schemaVersion: 1,
    reviewer: { kind: 'codex', name: 'Offline fixture reviewer' },
    verdict: 'needs-work',
    summary: 'Unrequested scoring changes the objective.',
    evidence: [{ path: 'proof.json', note: 'Fixture scoring comparison.' }],
    findings: [
      {
        category: 'rules',
        severity: 'major',
        expected: 'No additional bonus.',
        observed: '450 extra points.',
        evidence: [0],
        recommendation: 'Remove the unsolicited score hook.',
      },
    ],
  }
  return {
    root,
    options,
    input,
    second,
    hash,
    review,
    close: () => rmSync(root, { recursive: true, force: true }),
  }
}

test('read-only queue and inspection expose each request/outcome, default-hide output, and flag legacy gaps', () => {
  const f = fixture()
  try {
    assert.equal(listCandidates({ reviewStatus: 'unreviewed' }, f.options.dbPath).total, 1)
    assert.equal(listCandidates({ query: 'dolphin' }, f.options.dbPath).total, 1)
    assert.equal(listCandidates({ offset: 1 }, f.options.dbPath).candidates.length, 0)
    const detail = inspectCandidate(f.hash.slice(0, 8), { dbPath: f.options.dbPath })
    assert.equal(detail.attempts.length, 2)
    assert.equal(detail.attempts[0]!.rawOutput, undefined)
    assert.equal(detail.attempts[0]!.outputsAvailable.rawOutput, true)
    assert.equal(detail.attempts[1]!.transcript, 'add a dolphin instead')
    assert.equal(detail.attempts[1]!.events.length, 1)
    const selected = inspectCandidate(f.hash, {
      dbPath: f.options.dbPath,
      attemptId: candidateAttemptId(f.second),
      includeOutput: true,
    })
    assert.equal(selected.attempts.length, 1)
    assert.equal(selected.attempts[0]!.rawOutput, 'fixture raw output')
    assert.throws(
      () => inspectCandidate(f.hash, { dbPath: f.options.dbPath, attemptId: 'not-this-attempt' }),
      /Unknown attempt/,
    )
    const db = openCatalogDb(f.options.dbPath)
    assert.equal(
      db.prepare("SELECT name FROM sqlite_master WHERE name='candidate_reviews'").get(),
      undefined,
    )
    db.exec('DELETE FROM candidate_validation_events; DELETE FROM candidate_attempts;')
    db.close()
    const legacy = inspectCandidate(f.hash, { dbPath: f.options.dbPath })
    assert.deepEqual(legacy.historyCoverage.runsWithoutAttemptMetadata, ['first-run', 'second-run'])
    assert.equal(legacy.firstObserved.provenance.transcript, 'keep the usual scoring')
    assert.match(legacy.historyCoverage.note, /not every run/)
  } finally {
    f.close()
  }
})

test('reviews bind exact game/evidence bytes, retain revisions and separate code versus attempt scopes without admission', () => {
  const f = fixture()
  try {
    const before = inspectCandidate(f.hash, { dbPath: f.options.dbPath })
    const first = saveCandidateReview(f.hash, f.review, f.options)
    assert.equal(first.codeHash, f.hash)
    assert.equal(
      first.evidence[0]!.sha256,
      createHash('sha256')
        .update(readFileSync(resolve(f.root, 'proof.json')))
        .digest('hex'),
    )
    const file = resolve(f.options.storage, f.hash, 'reviews', `${first.id}.json`)
    assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), first.reviewHash)
    assert.equal(listCandidateFindings({ category: 'rules' }, f.options.dbPath).total, 1)
    const second = saveCandidateReview(
      f.hash,
      {
        ...f.review,
        verdict: 'inconclusive',
        findings: [],
        summary: 'The fixture does not establish human balance.',
      },
      f.options,
    )
    assert.equal(second.supersedes, first.id)
    assert.equal(listCandidateFindings({}, f.options.dbPath).total, 0)
    saveCandidateReview(
      f.hash,
      {
        ...f.review,
        attemptId: candidateAttemptId(f.second),
        findings: [
          {
            ...f.review.findings[0]!,
            category: 'identity',
            expected: 'Requested dolphin actor.',
            observed: 'Fixture has unchanged actor identity.',
          },
        ],
      },
      f.options,
    )
    assert.equal(
      listCandidateFindings({ category: 'identity', verdict: 'needs-work' }, f.options.dbPath)
        .total,
      1,
    )
    const after = inspectCandidate(f.hash, { dbPath: f.options.dbPath })
    assert.equal(after.reviews.length, 3)
    assert.equal(after.status, 'quarantined')
    assert.deepEqual(after.latestValidation, before.latestValidation)
    assert.equal(listCandidates({ reviewStatus: 'unreviewed' }, f.options.dbPath).total, 0)
    assert.equal(listCandidates({ reviewStatus: 'inconclusive' }, f.options.dbPath).total, 1)
    assert.equal(listCandidates({ reviewStatus: 'needs-work' }, f.options.dbPath).total, 1)
    assert.equal(listCandidates({}, f.options.dbPath).candidates[0]!.currentReviews.length, 2)
  } finally {
    f.close()
  }
})

test('malformed, unverifiable and misleading review records are rejected before insertion', () => {
  const f = fixture(),
    outside = mkdtempSync(resolve(tmpdir(), 'candidate-review-outside-'))
  try {
    assert.throws(
      () => saveCandidateReview(f.hash, { ...f.review, verdict: 'acceptable' }, f.options),
      /unresolved defects/,
    )
    assert.throws(
      () => saveCandidateReview(f.hash, { ...f.review, findings: [] }, f.options),
      /actionable finding/,
    )
    assert.throws(() => saveCandidateReview(f.hash, { ...f.review, evidence: [] }, f.options))
    assert.throws(
      () =>
        saveCandidateReview(
          f.hash,
          { ...f.review, findings: [{ ...f.review.findings[0]!, evidence: [9] }] },
          f.options,
        ),
      /missing evidence/,
    )
    assert.throws(
      () => saveCandidateReview(f.hash, { ...f.review, attemptId: 'f'.repeat(64) }, f.options),
      /does not belong/,
    )
    writeFileSync(resolve(outside, 'proof.json'), '{}')
    symlinkSync(resolve(outside, 'proof.json'), resolve(f.root, 'outside.json'))
    assert.throws(
      () =>
        saveCandidateReview(
          f.hash,
          { ...f.review, evidence: [{ path: 'outside.json', note: 'escaped' }] },
          f.options,
        ),
      /inside its evidence root/,
    )
    writeFileSync(resolve(f.options.storage, f.hash, 'game.js'), 'changed code')
    assert.throws(() => saveCandidateReview(f.hash, f.review, f.options), /no longer match/)
    assert.equal(inspectCandidate(f.hash, { dbPath: f.options.dbPath }).reviews.length, 0)
  } finally {
    f.close()
    rmSync(outside, { recursive: true, force: true })
  }
})

test('actual CLI inspects, saves and filters reviews offline with explicit isolated paths', () => {
  const f = fixture()
  try {
    const tripwire = resolve(f.root, 'offline.mjs')
    writeFileSync(tripwire, 'globalThis.fetch=()=>{throw new Error("NETWORK FORBIDDEN")};')
    const reviewFile = resolve(f.root, 'review.json')
    writeFileSync(reviewFile, JSON.stringify(f.review))
    const command = (args: string[]) =>
      spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          '--import',
          tripwire,
          resolve(import.meta.dirname, '../src/cli.ts'),
          'catalog',
          ...args,
          '--db',
          f.options.dbPath,
        ],
        { encoding: 'utf8', env: { ...process.env, INIT_CWD: f.root } },
      )
    const call = (args: string[]) => {
      const result = command(args)
      assert.equal(result.status, 0, result.stderr)
      return JSON.parse(result.stdout)
    }
    assert.equal(call(['candidates', '--query', 'dolphin']).candidates[0].codeHash, f.hash)
    assert.equal(call(['candidate', f.hash.slice(0, 8)]).attempts.length, 2)
    assert.equal(
      call(['candidate', f.hash, '--attempt', candidateAttemptId(f.second), '--include-output'])
        .attempts[0].rawOutput,
      'fixture raw output',
    )
    const saved = call([
      'review',
      f.hash,
      '--file',
      reviewFile,
      '--storage',
      f.options.storage,
      '--evidence-root',
      f.root,
    ])
    assert.equal(saved.verdict, 'needs-work')
    assert.equal(call(['findings', '--category', 'rules']).findings[0].reviewId, saved.id)
    assert.equal(call(['candidates', '--review-status', 'needs-work', '--limit', '1']).total, 1)
    assert.equal(command(['review', f.hash]).status, 1)
    assert.equal(command(['candidates', '--limit', '0']).status, 1)
    assert.equal(command(['candidate', '1234']).status, 1)
  } finally {
    f.close()
  }
})
