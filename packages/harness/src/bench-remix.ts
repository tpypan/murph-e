import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { closeProbe } from '@htn/probe'
import { MODELS, ROOT } from './env.ts'
import { listLibrary } from './library.ts'
import { pipeline } from './pipeline.ts'
import { keptShare } from './remix.ts'

// pnpm harness bench-remix bench/remixes.txt
// Each line: <library slug> | <what the player said>. Runs the remix path on
// the library game and reports latency, probe pass and how much of the
// original survived (docs/plans/tier-2.md M4).

export interface RemixRow {
  slug: string
  words: string
  title: string
  source: string
  totalMs: number
  kept: number
  remix: boolean
  observations: string[]
  error: string | null
}

function pct(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)] ?? 0
}
const s = (v: number | null | undefined) => (v == null ? '-' : `${(v / 1000).toFixed(1)}s`)

export function readRemixes(file: string): Array<{ slug: string; words: string }> {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    .map((l) => {
      const [slug, ...rest] = l.split('|')
      return { slug: (slug ?? '').trim(), words: rest.join('|').trim() }
    })
}

export async function benchRemix(
  jobs: Array<{ slug: string; words: string }>,
  opts: { concurrency?: number; label?: string; onLine?: (l: string) => void } = {},
): Promise<{ rows: RemixRow[]; file: string }> {
  const lib = new Map(listLibrary().map((g) => [g.slug, g]))
  const log = opts.onLine ?? ((l: string) => process.stderr.write(`${l}\n`))
  const rows: RemixRow[] = new Array(jobs.length)
  let next = 0
  const t0 = performance.now()
  async function worker() {
    while (next < jobs.length) {
      const i = next++
      const job = jobs[i]!
      const row: RemixRow = {
        slug: job.slug,
        words: job.words,
        title: '',
        source: '',
        totalMs: 0,
        kept: 0,
        remix: false,
        observations: [],
        error: null,
      }
      const g = lib.get(job.slug)
      if (!g?.spec) row.error = `no library game with a spec: ${job.slug}`
      else {
        try {
          const r = await pipeline(job.words, {
            players: g.players === 2 ? 2 : 1,
            current: { code: g.code, spec: g.spec, slug: g.slug, title: g.title },
            keep: false,
            race: 1,
          })
          row.title = r.title
          row.source = r.source
          row.totalMs = r.totalMs
          row.kept = keptShare(g.code, r.code)
          row.remix = r.source === 'remix' || r.source === 'kept'
          row.observations = r.observations
        } catch (e) {
          row.error = e instanceof Error ? e.message : String(e)
        }
      }
      rows[i] = row
      log(
        `[${i + 1}/${jobs.length}] ${s(row.totalMs)} ${row.source.padEnd(6)} kept ${Math.round(row.kept * 100)}% ${row.title} <- ${job.slug} | "${job.words.slice(0, 40)}" ${row.error ?? ''}`,
      )
    }
  }
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 3, jobs.length) }, worker))
  await closeProbe()

  const ok = rows.filter((r) => !r.error)
  const remixed = ok.filter((r) => r.source === 'remix')
  const totals = ok.map((r) => r.totalMs)
  const date = new Date().toISOString().slice(0, 10)
  const stamp = new Date().toISOString().slice(11, 16).replace(':', '')
  const label = opts.label ?? 'remix'
  const file = resolve(ROOT, 'bench/results', `${date}-${stamp}-${label}.md`)
  mkdirSync(resolve(ROOT, 'bench/results'), { recursive: true })
  const md = [
    `# Remix bench ${date} ${label}`,
    '',
    `- model: ${MODELS.remix}, effort: ${MODELS.remixEffort}, spec: ${MODELS.spec}`,
    `- jobs: ${jobs.length}, errors: ${rows.length - ok.length}`,
    `- total  p50 ${s(pct(totals, 50))}  p95 ${s(pct(totals, 95))}  max ${s(Math.max(0, ...totals))}`,
    `- remixed (passed the probe as a remix): ${remixed.length}/${ok.length}; classified as a new game: ${ok.filter((r) => !r.remix).length}; kept the original: ${ok.filter((r) => r.source === 'kept').length}`,
    `- kept lines, median over remixes: ${Math.round(
      pct(
        remixed.map((r) => r.kept),
        50,
      ) * 100,
    )}%`,
    `- wall clock: ${s(Math.round(performance.now() - t0))}`,
    '',
    '| # | game | words | result | total | kept | notes |',
    '|---|---|---|---|---|---|---|',
    ...rows.map(
      (r, i) =>
        `| ${i + 1} | ${r.slug} | ${r.words.slice(0, 40)} | ${r.error ? 'error' : r.source} | ${s(r.totalMs)} | ${Math.round(r.kept * 100)}% | ${(r.error ?? r.observations.join('; ')).replace(/\|/g, '/').slice(0, 120)} |`,
    ),
    '',
  ].join('\n')
  writeFileSync(file, md)
  writeFileSync(file.replace(/\.md$/, '.json'), JSON.stringify({ rows }, null, 2))
  return { rows, file }
}
