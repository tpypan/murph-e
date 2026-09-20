import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { closeProbe, controlsFromSpec, funScore, playtest, probe } from '@htn/probe'
import { candidateAttemptId, recordCandidateValidation } from './catalog.ts'
import { MODELS, ROOT } from './env.ts'
import { gen } from './gen.ts'
import { JUDGE_AXES, judge, type Verdict } from './judge.ts'

export interface BenchOptions {
  model?: string
  effort?: string
  players?: 1 | 2
  n?: number
  concurrency?: number
  label?: string
  noProbe?: boolean
  /** Also playtest and judge each game: the fun arm. Slow, costs tokens. */
  fun?: boolean
  onLine?: (line: string) => void
}

export interface BenchRow {
  prompt: string
  title: string
  genre: string
  runId: string
  specMs: number
  buildMs: number
  ttftMs: number | null
  totalMs: number
  tokens: number
  reasoning: number
  cached: number
  lines: number
  syntaxError: string | null
  probeOk: boolean | null
  observations: string[]
  error: string | null
  /** Only with --fun. */
  fun: number | null
  metrics: Record<string, number | boolean | null> | null
  verdict: Omit<Verdict, 'ms'> | null
}

function pct(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)] ?? 0
}

const s = (msValue: number | null | undefined) =>
  msValue == null ? '-' : `${(msValue / 1000).toFixed(1)}s`

export async function bench(
  prompts: string[],
  opts: BenchOptions = {},
): Promise<{ rows: BenchRow[]; file: string }> {
  const model = opts.model ?? MODELS.build
  const effort = opts.effort ?? MODELS.buildEffort
  const n = opts.n ?? 1
  const players = opts.players === 2 ? 2 : 1
  const concurrency = opts.concurrency ?? 4
  const label =
    opts.label ?? `${model}-${effort}${players === 2 ? '-2p' : ''}`.replace(/[^a-z0-9.-]+/gi, '-')
  const log = opts.onLine ?? ((l: string) => process.stderr.write(`${l}\n`))

  const jobs: Array<{ prompt: string; variant: number }> = []
  for (const prompt of prompts) for (let v = 0; v < n; v++) jobs.push({ prompt, variant: v })
  const rows: BenchRow[] = new Array(jobs.length)
  let next = 0
  const t0 = performance.now()

  async function worker() {
    while (next < jobs.length) {
      const i = next++
      const job = jobs[i]!
      const row: BenchRow = {
        prompt: job.prompt,
        title: '',
        genre: '',
        runId: '',
        specMs: 0,
        buildMs: 0,
        ttftMs: null,
        totalMs: 0,
        tokens: 0,
        reasoning: 0,
        cached: 0,
        lines: 0,
        syntaxError: null,
        probeOk: null,
        observations: [],
        error: null,
        fun: null,
        metrics: null,
        verdict: null,
      }
      try {
        const r = await gen(job.prompt, { model, effort, variant: job.variant, players })
        row.title = r.spec.title
        row.genre = r.spec.genre
        row.runId = r.run.id
        row.specMs = r.timings.specMs
        row.buildMs = r.timings.buildMs
        row.ttftMs = r.timings.ttftMs
        row.totalMs = r.timings.totalMs
        row.tokens = r.tokens.build
        row.reasoning = r.tokens.reasoning
        row.cached = r.tokens.cached
        row.lines = r.code.split('\n').length
        row.syntaxError = r.syntaxError
        if (!opts.noProbe) {
          const p = r.syntaxError
            ? {
                ok: false,
                observations: [r.syntaxError],
                checks: { loads: false },
                ms: 0,
                thumb: null,
              }
            : await probe(r.code, {
                controls: controlsFromSpec(r.spec.controls),
                title: r.spec.title,
                players,
              }).catch((error: unknown) => {
                try {
                  recordCandidateValidation(
                    r.code,
                    {
                      runtimePassed: null,
                      observations: [error instanceof Error ? error.message : String(error)],
                      outcome: 'error',
                    },
                    undefined,
                    candidateAttemptId({
                      runId: r.run.id,
                      attemptId: `build:${job.variant}`,
                      code: r.code,
                    }),
                  )
                } catch (archiveError) {
                  r.run.event('catalog-error', {
                    message:
                      archiveError instanceof Error ? archiveError.message : String(archiveError),
                  })
                }
                throw error
              })
          row.probeOk = p.ok
          row.observations = p.observations
          try {
            recordCandidateValidation(
              r.code,
              {
                runtimePassed: p.ok,
                observations: p.observations,
                outcome: p.ok ? 'passed' : 'failed',
              },
              undefined,
              candidateAttemptId({
                runId: r.run.id,
                attemptId: `build:${job.variant}`,
                code: r.code,
              }),
            )
          } catch (error) {
            r.run.event('catalog-error', {
              message: error instanceof Error ? error.message : String(error),
            })
          }
          r.run.write(
            'probe.json',
            JSON.stringify(
              { ok: p.ok, observations: p.observations, checks: p.checks, ms: p.ms },
              null,
              2,
            ),
          )
          if (p.thumb) r.run.write('thumb.png', p.thumb)
          r.run.event('probe', { ok: p.ok, observations: p.observations, ms: p.ms })
        }
        if (opts.fun) {
          const m = await playtest(r.code, {
            controls: controlsFromSpec(r.spec.controls),
            title: r.spec.title,
            players,
          })
          row.fun = funScore(m)
          const { shots, ...rest } = m
          row.metrics = rest as Record<string, number | boolean | null>
          r.run.write('playtest.json', JSON.stringify({ fun: row.fun, ...rest }, null, 2))
          if (m.ok) {
            try {
              const v = await judge(r.spec, r.code, m)
              row.verdict = {
                scores: v.scores,
                mean: v.mean,
                again: v.again,
                best: v.best,
                worst: v.worst,
              }
              r.run.write('verdict.json', JSON.stringify(v, null, 2))
            } catch (e) {
              log(`  judge failed: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }
      } catch (e) {
        row.error = e instanceof Error ? e.message : String(e)
      }
      rows[i] = row
      const status = row.error
        ? `ERROR ${row.error.slice(0, 80)}`
        : row.probeOk === null
          ? 'built'
          : row.probeOk
            ? 'PASS'
            : `FAIL ${row.observations.join('; ').slice(0, 80)}`
      const funStatus =
        row.fun === null ? '' : `  fun ${row.fun}${row.verdict ? ` judge ${row.verdict.mean}` : ''}`
      log(
        `[${i + 1}/${jobs.length}] ${s(row.totalMs)} (${row.tokens} tok) ${row.title || '?'} <- "${job.prompt.slice(0, 40)}"  ${status}${funStatus}`,
      )
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker))
  if (!opts.noProbe) await closeProbe()

  const okRows = rows.filter((r) => !r.error)
  const totals = okRows.map((r) => r.totalMs)
  const builds = okRows.map((r) => r.buildMs)
  const ttfts = okRows.map((r) => r.ttftMs ?? 0)
  const probed = okRows.filter((r) => r.probeOk !== null)
  const passed = probed.filter((r) => r.probeOk).length
  const funRows = okRows.filter((r) => r.fun !== null)
  const judged = okRows.filter((r) => r.verdict)
  const meanOf = (xs: number[]) =>
    xs.length === 0 ? 0 : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100
  const shareOf = (f: (r: BenchRow) => boolean) =>
    funRows.length === 0 ? '-' : `${funRows.filter(f).length}/${funRows.length}`
  const metric = (k: string) => funRows.map((r) => Number(r.metrics?.[k] ?? 0))
  const funLines =
    funRows.length === 0
      ? []
      : [
          '',
          '## fun',
          '',
          `- fun score mean ${meanOf(funRows.map((r) => r.fun ?? 0))}  p50 ${pct(
            funRows.map((r) => r.fun ?? 0),
            50,
          )}`,
          `- grace ${shareOf((r) => !!r.metrics?.grace)}  losable ${shareOf((r) => !!r.metrics?.losable)}  agency>1 ${shareOf((r) => Number(r.metrics?.agency ?? 0) > 1)}  agency mean ${meanOf(metric('agency'))}`,
          `- score tiers mean ${meanOf(metric('scoreTiers'))}  spread mean ${meanOf(metric('scoreSpread'))}  first point mean ${meanOf(funRows.map((r) => Number(r.metrics?.firstScoreS ?? 0)))}s`,
          `- density ramp mean ${meanOf(metric('densityRamp'))}  colours mean ${meanOf(metric('colors'))}  sfx kinds mean ${meanOf(metric('sfxKinds'))}  flash+shake ${shareOf((r) => Number(r.metrics?.flash ?? 0) > 0 && Number(r.metrics?.shake ?? 0) > 0)}`,
          ...(judged.length === 0
            ? []
            : [
                `- judge mean ${meanOf(judged.map((r) => r.verdict!.mean))} over ${judged.length}, again ${meanOf(judged.map((r) => r.verdict!.again))}`,
                `- judge axes: ${JUDGE_AXES.map((a) => `${a} ${meanOf(judged.map((r) => r.verdict!.scores[a]))}`).join(', ')}`,
              ]),
        ]
  const date = new Date().toISOString().slice(0, 10)
  const stamp = new Date().toISOString().slice(11, 16).replace(':', '')
  const file = resolve(ROOT, 'bench/results', `${date}-${stamp}-${label}.md`)
  mkdirSync(resolve(ROOT, 'bench/results'), { recursive: true })
  const md = [
    `# Bench ${date} ${label}`,
    '',
    `- model: ${model}, effort: ${effort}, players: ${players}, n: ${n}, concurrency: ${concurrency}`,
    `- prompts: ${prompts.length}, runs: ${rows.length}, errors: ${rows.length - okRows.length}`,
    `- total  p50 ${s(pct(totals, 50))}  p95 ${s(pct(totals, 95))}  max ${s(Math.max(0, ...totals))}`,
    `- build  p50 ${s(pct(builds, 50))}  p95 ${s(pct(builds, 95))}`,
    `- ttft   p50 ${s(pct(ttfts, 50))}  p95 ${s(pct(ttfts, 95))}`,
    `- tokens mean ${Math.round(okRows.reduce((a, r) => a + r.tokens, 0) / Math.max(1, okRows.length))}  reasoning mean ${Math.round(okRows.reduce((a, r) => a + r.reasoning, 0) / Math.max(1, okRows.length))}  lines mean ${Math.round(okRows.reduce((a, r) => a + r.lines, 0) / Math.max(1, okRows.length))}`,
    `- syntax errors: ${okRows.filter((r) => r.syntaxError).length}`,
    probed.length > 0
      ? `- probe pass: ${passed}/${probed.length} (${Math.round((100 * passed) / probed.length)}%)`
      : '- probe: skipped',
    `- wall clock: ${s(Math.round(performance.now() - t0))}`,
    ...funLines,
    '',
    funRows.length > 0
      ? '| # | prompt | title | genre | total | tok | lines | probe | fun | judge | again | worst |'
      : '| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |',
    funRows.length > 0
      ? '|---|---|---|---|---|---|---|---|---|---|---|---|'
      : '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r, i) => {
      const probeCell = r.error ? 'error' : r.probeOk === null ? '-' : r.probeOk ? 'pass' : 'FAIL'
      const head = `| ${i + 1} | ${r.prompt.slice(0, 40)} | ${r.title} | ${r.genre} |`
      if (funRows.length > 0) {
        return `${head} ${s(r.totalMs)} | ${r.tokens} | ${r.lines} | ${probeCell} | ${r.fun ?? '-'} | ${r.verdict?.mean ?? '-'} | ${r.verdict?.again ?? '-'} | ${(r.verdict?.worst ?? r.error ?? r.observations.join('; ')).replace(/\|/g, '/').slice(0, 90)} |`
      }
      return `${head} ${s(r.specMs)} | ${s(r.buildMs)} | ${s(r.ttftMs)} | ${s(r.totalMs)} | ${r.tokens} | ${r.reasoning} | ${r.lines} | ${probeCell} | ${(r.error ?? [r.syntaxError, ...r.observations].filter(Boolean).join('; ')).replace(/\|/g, '/').slice(0, 120)} |`
    }),
    '',
    '## runs',
    '',
    ...rows.map((r) => `- ${r.runId || '(none)'}`),
    '',
  ].join('\n')
  writeFileSync(file, md)
  writeFileSync(
    file.replace(/\.md$/, '.json'),
    JSON.stringify({ model, effort, players, n, rows }, null, 2),
  )
  return { rows, file }
}

export function readPrompts(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.replace(/\s+\(.*\)\s*$/, '').trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
}
