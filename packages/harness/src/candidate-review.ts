import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { z } from 'zod'
import { CATALOG_DB, openCatalogDb } from './catalog.ts'
import { ROOT } from './env.ts'

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/)
export const reviewCategories = [
  'rules',
  'controls',
  'identity',
  'presentation',
  'animation',
  'balance',
  'terminal',
  'sound',
  'performance',
  'other',
] as const
export const reviewVerdicts = ['needs-work', 'acceptable', 'inconclusive'] as const
const text = (max: number) => z.string().trim().min(1).max(max)
export const CandidateReviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    reviewer: z.object({ kind: z.enum(['human', 'codex']), name: text(100) }).strict(),
    attemptId: hashSchema.optional(),
    verdict: z.enum(reviewVerdicts),
    summary: text(2000),
    evidence: z
      .array(z.object({ path: text(1000), note: text(1000) }).strict())
      .min(1)
      .max(30),
    findings: z
      .array(
        z
          .object({
            category: z.enum(reviewCategories),
            severity: z.enum(['blocker', 'major', 'minor', 'note']),
            expected: text(2000),
            observed: text(2000),
            evidence: z.array(z.number().int().nonnegative()).min(1).max(30),
            recommendation: text(2000).optional(),
          })
          .strict(),
      )
      .max(30),
  })
  .strict()
  .superRefine((review, ctx) => {
    if (review.verdict === 'needs-work' && !review.findings.some((f) => f.severity !== 'note'))
      ctx.addIssue({
        code: 'custom',
        message: 'needs-work requires an actionable finding',
        path: ['findings'],
      })
    if (review.verdict === 'acceptable' && review.findings.some((f) => f.severity !== 'note'))
      ctx.addIssue({
        code: 'custom',
        message: 'acceptable cannot include unresolved defects',
        path: ['findings'],
      })
    review.findings.forEach((finding, i) => {
      if (finding.evidence.some((index) => index >= review.evidence.length))
        ctx.addIssue({
          code: 'custom',
          message: 'Finding refers to missing evidence',
          path: ['findings', i, 'evidence'],
        })
    })
  })
export type CandidateReviewInput = z.infer<typeof CandidateReviewSchema>

export interface CandidateReviewOptions {
  dbPath?: string
  storage?: string
  evidenceRoot?: string
}

function existsTable(db: DatabaseSync, name: string) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name)
}
function readDb(path = CATALOG_DB) {
  if (!existsSync(path)) throw new Error(`Candidate database does not exist: ${path}`)
  return new DatabaseSync(path, { readOnly: true })
}
function resolveHash(db: DatabaseSync, selector: string) {
  if (!/^[a-f0-9]{8,64}$/.test(selector))
    throw new Error('Use a full SHA-256 or an unambiguous prefix of at least 8 hex characters')
  const rows = db
    .prepare('SELECT code_hash FROM generated_candidates WHERE code_hash LIKE ? LIMIT 2')
    .all(`${selector}%`)
  if (!rows.length) throw new Error(`Unknown candidate: ${selector}`)
  if (rows.length > 1) throw new Error(`Ambiguous candidate prefix: ${selector}`)
  return String(rows[0]!.code_hash)
}
function json(value: unknown) {
  return JSON.parse(String(value))
}
function ensureReviews(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS candidate_reviews (
    id TEXT PRIMARY KEY, code_hash TEXT NOT NULL, attempt_id TEXT,
    verdict TEXT NOT NULL, review_json TEXT NOT NULL, review_hash TEXT NOT NULL,
    source_path TEXT NOT NULL, created_at TEXT NOT NULL,
    FOREIGN KEY(code_hash) REFERENCES generated_candidates(code_hash),
    FOREIGN KEY(attempt_id) REFERENCES candidate_attempts(id)
  ); CREATE INDEX IF NOT EXISTS reviews_candidate ON candidate_reviews(code_hash, created_at);`)
}
function reviewRows(db: DatabaseSync, hash?: string) {
  if (!existsTable(db, 'candidate_reviews')) return []
  return (
    hash
      ? db.prepare('SELECT * FROM candidate_reviews WHERE code_hash=? ORDER BY rowid').all(hash)
      : db.prepare('SELECT * FROM candidate_reviews ORDER BY rowid').all()
  ).map((row) => ({
    ...json(row.review_json),
    reviewHash: String(row.review_hash),
    sourcePath: String(row.source_path),
  }))
}
function effectiveReviews(reviews: ReturnType<typeof reviewRows>) {
  const scopes = new Map<string, (typeof reviews)[number]>()
  for (const review of reviews)
    scopes.set(`${review.codeHash}:${review.attemptId ?? 'code'}`, review)
  return [...scopes.values()]
}

/** Read-only review queue. Latest review is evidence, never library admission. */
export function listCandidates(
  filters: {
    query?: string
    reviewStatus?: 'unreviewed' | 'reviewed' | (typeof reviewVerdicts)[number]
    limit?: number
    offset?: number
  } = {},
  dbPath = CATALOG_DB,
) {
  const limit = z
    .number()
    .int()
    .min(1)
    .max(200)
    .parse(filters.limit ?? 50)
  const offset = z
    .number()
    .int()
    .nonnegative()
    .parse(filters.offset ?? 0)
  if (filters.reviewStatus)
    z.enum(['unreviewed', 'reviewed', ...reviewVerdicts]).parse(filters.reviewStatus)
  const db = readDb(dbPath)
  try {
    const reviews = reviewRows(db)
    const attempts = existsTable(db, 'candidate_attempts')
      ? db.prepare('SELECT code_hash, count(*) n FROM candidate_attempts GROUP BY code_hash').all()
      : []
    const attemptSearch = existsTable(db, 'candidate_attempts')
      ? db
          .prepare(`SELECT code_hash, run_id,
          json_extract(metadata_json,'$.transcript') transcript,
          json_extract(metadata_json,'$.spec.title') title,
          json_extract(metadata_json,'$.spec.genre') genre,
          json_extract(metadata_json,'$.model') model
        FROM candidate_attempts`)
          .all()
      : []
    const query = filters.query?.toLocaleLowerCase() ?? ''
    const rows = db
      .prepare('SELECT * FROM generated_candidates ORDER BY updated_at DESC, code_hash')
      .all()
      .filter(
        (row) =>
          !query ||
          [
            row.code_hash,
            row.title,
            row.genre,
            row.first_run_id,
            row.latest_run_id,
            row.provenance_json,
          ].some((value) => String(value).toLocaleLowerCase().includes(query)) ||
          attemptSearch.some(
            (attempt) =>
              attempt.code_hash === row.code_hash &&
              [
                attempt.run_id,
                attempt.transcript,
                attempt.title,
                attempt.genre,
                attempt.model,
              ].some((value) => String(value).toLocaleLowerCase().includes(query)),
          ),
      )
      .map((row) => {
        const scoped = reviews.filter((review) => review.codeHash === row.code_hash)
        const current = effectiveReviews(scoped)
        return {
          codeHash: String(row.code_hash),
          title: String(row.title),
          genre: String(row.genre),
          players: Number(row.players),
          status: String(row.status),
          runs: Number(row.occurrences),
          attempts: Number(attempts.find((a) => a.code_hash === row.code_hash)?.n ?? 0),
          validation: json(row.validation_json),
          reviewCount: scoped.length,
          currentReviews: current.map((review) => ({
            id: review.id,
            attemptId: review.attemptId ?? null,
            verdict: review.verdict,
            summary: review.summary,
            reviewer: review.reviewer,
            createdAt: review.createdAt,
          })),
        }
      })
      .filter(
        (row) =>
          !filters.reviewStatus ||
          (filters.reviewStatus === 'unreviewed'
            ? row.reviewCount === 0
            : filters.reviewStatus === 'reviewed'
              ? row.reviewCount > 0
              : row.currentReviews.some((review) => review.verdict === filters.reviewStatus)),
      )
    return { total: rows.length, offset, limit, candidates: rows.slice(offset, offset + limit) }
  } finally {
    db.close()
  }
}

export function inspectCandidate(
  selector: string,
  options: { dbPath?: string; attemptId?: string; includeOutput?: boolean } = {},
) {
  const db = readDb(options.dbPath)
  try {
    const hash = resolveHash(db, selector)
    const row = db.prepare('SELECT * FROM generated_candidates WHERE code_hash=?').get(hash)!
    const attempts = existsTable(db, 'candidate_attempts')
      ? db.prepare('SELECT * FROM candidate_attempts WHERE code_hash=? ORDER BY rowid').all(hash)
      : []
    if (options.attemptId && !attempts.some((attempt) => attempt.id === options.attemptId))
      throw new Error('Unknown attempt for this candidate')
    const events = existsTable(db, 'candidate_validation_events')
      ? db
          .prepare('SELECT * FROM candidate_validation_events WHERE code_hash=? ORDER BY id')
          .all(hash)
      : []
    const runs = db
      .prepare(
        'SELECT run_id, created_at FROM candidate_runs WHERE code_hash=? ORDER BY created_at,run_id',
      )
      .all(hash)
    const missingRuns = runs
      .filter((run) => !attempts.some((attempt) => attempt.run_id === run.run_id))
      .map((run) => String(run.run_id))
    return {
      codeHash: hash,
      status: row.status,
      sourcePath: row.source_path,
      firstObserved: {
        spec: json(row.spec_json),
        provenance: json(row.provenance_json),
        runId: row.first_run_id,
      },
      latestValidation: json(row.validation_json),
      runs,
      historyCoverage: {
        recordedAttempts: attempts.length,
        runsWithoutAttemptMetadata: missingRuns,
        note: missingRuns.length
          ? "Legacy run associations lack per-attempt metadata. First-observed provenance is not every run's request."
          : 'Every recorded run has at least one attempt; this does not prove all historical attempts were captured.',
      },
      attempts: attempts
        .filter((attempt) => !options.attemptId || attempt.id === options.attemptId)
        .map((attempt) => {
          const metadata = json(attempt.metadata_json)
          const outputsAvailable = {
            rawOutput: typeof metadata.rawOutput === 'string',
            sourceCode: typeof metadata.sourceCode === 'string',
          }
          if (!options.includeOutput) {
            delete metadata.rawOutput
            delete metadata.sourceCode
          }
          return {
            ...metadata,
            outputsAvailable,
            validation: json(attempt.validation_json),
            events: events
              .filter((event) => event.attempt_id === attempt.id)
              .map((event) => ({ at: event.created_at, validation: json(event.validation_json) })),
          }
        }),
      codeValidationEvents: events
        .filter((event) => !event.attempt_id)
        .map((event) => ({ at: event.created_at, validation: json(event.validation_json) })),
      reviews: reviewRows(db, hash),
      admission: 'Quarantine and reusable-pack admission are unchanged by reviews.',
    }
  } finally {
    db.close()
  }
}

/** Hash-bound local review, append-only. Does not change validation or admission. */
export function saveCandidateReview(
  selector: string,
  raw: unknown,
  options: CandidateReviewOptions = {},
) {
  const input = CandidateReviewSchema.parse(raw)
  const read = readDb(options.dbPath)
  let hash: string
  try {
    hash = resolveHash(read, selector)
    if (
      input.attemptId &&
      (!existsTable(read, 'candidate_attempts') ||
        !read
          .prepare('SELECT id FROM candidate_attempts WHERE id=? AND code_hash=?')
          .get(input.attemptId, hash))
    )
      throw new Error('Review attempt does not belong to this candidate')
  } finally {
    read.close()
  }
  const storage = resolve(options.storage ?? resolve(ROOT, 'data/catalog/candidates'))
  const dir = resolve(storage, hash)
  if (!existsSync(dir) || lstatSync(dir).isSymbolicLink())
    throw new Error('Archived candidate directory is missing or is a symlink')
  const bytes = readFileSync(resolve(dir, 'game.js'))
  if (createHash('sha256').update(bytes).digest('hex') !== hash)
    throw new Error('Archived game bytes no longer match the reviewed hash')
  const evidenceRoot = realpathSync(options.evidenceRoot ?? ROOT)
  const evidence = input.evidence.map((item) => {
    const path = realpathSync(resolve(evidenceRoot, item.path))
    if (!path.startsWith(`${evidenceRoot}${sep}`))
      throw new Error('Review evidence must stay inside its evidence root')
    const stat = statSync(path)
    if (!stat.isFile() || stat.size > 30_000_000)
      throw new Error('Evidence must be a file no larger than 30 MB')
    return {
      path: relative(evidenceRoot, path),
      note: item.note,
      sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
      bytes: stat.size,
    }
  })
  const folder = resolve(dir, 'reviews')
  if (existsSync(folder) && lstatSync(folder).isSymbolicLink())
    throw new Error('Review directory cannot be a symlink')
  mkdirSync(folder, { recursive: true })
  const id = randomUUID(),
    path = resolve(folder, `${id}.json`),
    db = openCatalogDb(options.dbPath)
  let wrote = false
  try {
    ensureReviews(db)
    db.exec('BEGIN IMMEDIATE')
    const previous = reviewRows(db, hash)
      .filter((review) => (review.attemptId ?? null) === (input.attemptId ?? null))
      .at(-1)
    const review = {
      ...input,
      id,
      codeHash: hash,
      attemptId: input.attemptId ?? null,
      supersedes: previous?.id ?? null,
      createdAt: new Date().toISOString(),
      evidence,
      scope: 'Review evidence only; not reusable-library admission or a training update.',
    }
    const body = `${JSON.stringify(review, null, 2)}\n`
    const reviewHash = createHash('sha256').update(body).digest('hex')
    writeFileSync(path, body, { flag: 'wx' })
    wrote = true
    db.prepare('INSERT INTO candidate_reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      id,
      hash,
      input.attemptId ?? null,
      input.verdict,
      JSON.stringify(review),
      reviewHash,
      relative(ROOT, path),
      review.createdAt,
    )
    db.exec('COMMIT')
    return { ...review, reviewHash, sourcePath: relative(ROOT, path) }
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK')
    if (wrote) rmSync(path)
    throw error
  } finally {
    db.close()
  }
}

/** Actionable findings from the latest review in each candidate/attempt scope. */
export function listCandidateFindings(
  filters: {
    category?: (typeof reviewCategories)[number]
    verdict?: (typeof reviewVerdicts)[number]
    limit?: number
    offset?: number
  } = {},
  dbPath = CATALOG_DB,
) {
  if (filters.category) z.enum(reviewCategories).parse(filters.category)
  if (filters.verdict) z.enum(reviewVerdicts).parse(filters.verdict)
  const limit = z
    .number()
    .int()
    .min(1)
    .max(200)
    .parse(filters.limit ?? 50)
  const offset = z
    .number()
    .int()
    .nonnegative()
    .parse(filters.offset ?? 0)
  const db = readDb(dbPath)
  try {
    const findings = effectiveReviews(reviewRows(db))
      .reverse()
      .filter((review) => !filters.verdict || review.verdict === filters.verdict)
      .flatMap((review) =>
        review.findings.map((finding: CandidateReviewInput['findings'][number], index: number) => ({
          ...finding,
          codeHash: review.codeHash,
          attemptId: review.attemptId,
          reviewId: review.id,
          reviewHash: review.reviewHash,
          verdict: review.verdict,
          reviewer: review.reviewer,
          findingIndex: index,
          evidence: finding.evidence.map((index) => review.evidence[index]),
        })),
      )
      .filter((finding) => !filters.category || finding.category === filters.category)
    return {
      total: findings.length,
      offset,
      limit,
      findings: findings.slice(offset, offset + limit),
    }
  } finally {
    db.close()
  }
}
