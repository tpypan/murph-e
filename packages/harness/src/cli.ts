import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { bench, readPrompts } from './bench.ts'
import { benchRemix, readRemixes } from './bench-remix.ts'
import {
  inspectCandidate,
  listCandidateFindings,
  listCandidates,
  type reviewCategories,
  type reviewVerdicts,
  saveCandidateReview,
} from './candidate-review.ts'
import { assembleCatalog, indexCatalog, loadCatalog } from './catalog.ts'
import { MODELS, ROOT } from './env.ts'
import { gen } from './gen.ts'
import { listLibrary } from './library.ts'
import { type PipelineEvent, pipeline, pipelineBoth } from './pipeline.ts'
import { createRun } from './run-store.ts'
import { seed } from './seed.ts'
import { findSourceReferences, indexSources } from './source-catalog.ts'
import { indexSprites, loadSpriteCatalog } from './sprite-catalog.ts'

const CWD = process.env.INIT_CWD ?? process.cwd()

const USAGE = `usage:
  harness gen "<transcript>" [--model M] [--effort E] [--variant N] [--players 2]
  harness play <run-id>
  harness run "<transcript>" [--race 2] [--players 2|both]   full pipeline: spec, race, probe, repair, fallback; both = a 1P and a 2P version, as the cabinet does
  harness seed <prompts.txt> [--n 2] [--players 2]      fill library/games with passing games
  harness bench <prompts.txt> [--model M] [--effort E] [--players 2] [--n 1] [--concurrency 4] [--label L] [--no-probe] [--fun]
  harness bench-remix <remixes.txt> [--concurrency 3] [--label L]   "<slug> | <words>" per line
  harness catalog list|index|sprites|candidates
  harness catalog candidates [--query WORDS] [--review-status unreviewed|reviewed|needs-work|acceptable|inconclusive] [--limit 50] [--offset 0]
  harness catalog candidate <hash-or-prefix> [--attempt ID] [--include-output]
  harness catalog review <hash-or-prefix> --file review.json   save evidence; never promote
  harness catalog findings [--category controls] [--verdict needs-work] [--limit 50]
    candidate commands accept --db PATH; review also accepts --storage PATH --evidence-root PATH
  harness catalog sources [query]             find verified external source links and cache status
  harness catalog preview <id> [--players 2]    bundle a draft for isolated testing; no promotion
`

function fmtS(msValue: number | null | undefined): string {
  return msValue == null ? '-' : `${(msValue / 1000).toFixed(1)}s`
}

const playersOf = (v: { players?: string }): 1 | 2 => (v.players === '2' ? 2 : 1)

async function cmdGen(
  transcript: string,
  values: { model?: string; effort?: string; variant?: string; players?: string },
) {
  const t0 = performance.now()
  let streamedChars = 0
  const result = await gen(transcript, {
    model: values.model,
    effort: values.effort,
    variant: values.variant ? Number(values.variant) : 0,
    players: playersOf(values),
    onEvent: (ev) => {
      if (ev.type === 'spec') {
        process.stderr.write(`spec ${fmtS(ev.ms)}  ${JSON.stringify(ev.spec)}\n\n`)
      } else if (ev.type === 'token') {
        streamedChars += ev.text.length
        process.stdout.write(ev.text)
      } else if (ev.type === 'built') {
        process.stdout.write('\n')
      }
    },
  })
  const { timings, tokens } = result
  process.stderr.write(
    `\nspec ${fmtS(timings.specMs)}  build ${fmtS(timings.buildMs)} (ttft ${fmtS(timings.ttftMs)}, ${tokens.build} tok, ${tokens.reasoning} reasoning, ${tokens.cached} cached in)  total ${fmtS(Math.round(performance.now() - t0))}\n`,
  )
  if (result.syntaxError) process.stderr.write(`SYNTAX ERROR: ${result.syntaxError}\n`)
  process.stderr.write(`run: runs/${result.run.id}  (${streamedChars} chars streamed)\n`)
  process.stderr.write(`play: pnpm harness play ${result.run.id}\n`)
}

async function serverUp(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(500) })
    return r.ok
  } catch {
    return false
  }
}

async function cmdPlay(runId: string) {
  const base = 'http://localhost:5173'
  if (!(await serverUp(`${base}/packages/runtime/index.html`))) {
    const child = spawn('node', [resolve(ROOT, 'scripts/serve.mjs')], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    for (let i = 0; i < 20 && !(await serverUp(`${base}/packages/runtime/index.html`)); i++) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  const url = `${base}/packages/runtime/dev.html?run=${encodeURIComponent(runId)}`
  spawn('open', [url], { stdio: 'ignore' }).unref()
  process.stderr.write(`${url}\n`)
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    model: { type: 'string' },
    effort: { type: 'string' },
    variant: { type: 'string' },
    n: { type: 'string' },
    concurrency: { type: 'string' },
    label: { type: 'string' },
    'no-probe': { type: 'boolean' },
    fun: { type: 'boolean' },
    race: { type: 'string' },
    players: { type: 'string' },
    query: { type: 'string' },
    'review-status': { type: 'string' },
    limit: { type: 'string' },
    offset: { type: 'string' },
    attempt: { type: 'string' },
    'include-output': { type: 'boolean' },
    file: { type: 'string' },
    category: { type: 'string' },
    verdict: { type: 'string' },
    db: { type: 'string' },
    storage: { type: 'string' },
    'evidence-root': { type: 'string' },
  },
})
const [cmd, ...rest] = positionals
try {
  if (cmd === 'catalog' && rest[0] === 'sources') {
    process.stdout.write(
      `${JSON.stringify(findSourceReferences(rest.slice(1).join(' ')), null, 2)}\n`,
    )
  } else if (
    cmd === 'catalog' &&
    ['candidates', 'candidate', 'review', 'findings'].includes(rest[0] ?? '')
  ) {
    const dbPath = values.db ? resolve(CWD, values.db) : undefined
    const limit = values.limit === undefined ? undefined : Number(values.limit)
    const offset = values.offset === undefined ? undefined : Number(values.offset)
    let result: unknown
    if (rest[0] === 'candidates' && rest.length === 1)
      result = listCandidates(
        {
          query: values.query,
          reviewStatus: values['review-status'] as
            | 'unreviewed'
            | 'reviewed'
            | (typeof reviewVerdicts)[number]
            | undefined,
          limit,
          offset,
        },
        dbPath,
      )
    else if (rest[0] === 'candidate' && rest.length === 2)
      result = inspectCandidate(rest[1]!, {
        dbPath,
        attemptId: values.attempt,
        includeOutput: values['include-output'],
      })
    else if (rest[0] === 'review' && rest.length === 2 && values.file)
      result = saveCandidateReview(
        rest[1]!,
        JSON.parse(readFileSync(resolve(CWD, values.file), 'utf8')),
        {
          dbPath,
          storage: values.storage ? resolve(CWD, values.storage) : undefined,
          evidenceRoot: values['evidence-root'] ? resolve(CWD, values['evidence-root']) : undefined,
        },
      )
    else if (rest[0] === 'findings' && rest.length === 1)
      result = listCandidateFindings(
        {
          category: values.category as (typeof reviewCategories)[number] | undefined,
          verdict: values.verdict as (typeof reviewVerdicts)[number] | undefined,
          limit,
          offset,
        },
        dbPath,
      )
    else
      throw new Error(
        'Use catalog candidates, candidate <hash>, review <hash> --file review.json, or findings',
      )
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else if (cmd === 'catalog') {
    const issues: { id: string; message: string }[] = []
    const parts = loadCatalog(undefined, issues)
    const sprites = loadSpriteCatalog(parts, undefined, issues)
    if (issues.length)
      process.stderr.write(`Unavailable catalog entries: ${JSON.stringify(issues)}\n`)
    if (rest[0] === 'index')
      process.stdout.write(
        `${JSON.stringify({ parts: indexCatalog(parts), sprites: indexSprites(sprites), sources: indexSources() }, null, 2)}\n`,
      )
    else if (rest[0] === 'sprites')
      process.stdout.write(
        `${JSON.stringify(
          sprites.map((s) => ({
            id: s.id,
            frames: Object.keys(s.frames).length,
            animations: Object.keys(s.animations),
            status: s.status,
          })),
          null,
          2,
        )}\n`,
      )
    else if (rest[0] === 'preview' && rest[1]) {
      const part = parts.find((p) => p.manifest.id === rest[1])
      if (!part) throw new Error(`Unknown catalog part: ${rest[1]}`)
      const players = playersOf(values)
      if (!part.manifest.supportsPlayers.includes(players))
        throw new Error(`Unsupported player count: ${players}`)
      const source = readFileSync(resolve(part.dir, 'demo.js'), 'utf8')
      const code = assembleCatalog(source, { parts: [part], text: part.api, hash: part.hash })
      const spec = { ...JSON.parse(readFileSync(resolve(part.dir, 'spec.json'), 'utf8')), players }
      const run = createRun(`catalog ${part.manifest.id} ${players}p`)
      run.write('game.js', code)
      run.write('customization.js', source)
      run.write('spec.json', JSON.stringify(spec, null, 2))
      process.stdout.write(`runs/${run.id}\n`)
    } else
      process.stdout.write(
        `${JSON.stringify(
          parts.map((p) => ({
            id: p.manifest.id,
            version: p.manifest.version,
            status: p.status,
            players: p.manifest.supportsPlayers,
            bytes: Buffer.byteLength(p.module),
            hash: p.hash,
          })),
          null,
          2,
        )}\n`,
      )
  } else if (cmd === 'gen' && rest[0]) await cmdGen(rest.join(' '), values)
  else if (cmd === 'play' && rest[0]) await cmdPlay(rest[0])
  else if (cmd === 'run' && rest[0]) {
    const { closeProbe } = await import('@htn/probe')
    const both = values.players === 'both'
    const onEvent = (ev: PipelineEvent) => {
      const tag = ev.players ? `${ev.players}P ` : ''
      if (ev.type === 'token') {
        // With both versions streaming, only the one-player stream goes to stdout.
        if (ev.variant === 0 && (ev.players ?? 1) === 1) process.stdout.write(ev.text)
      } else if (ev.type === 'ready') {
        process.stderr.write(
          `\nREADY ${tag}${ev.source} "${ev.title}" in ${fmtS(ev.totalMs)}  run: runs/${ev.runId}\n`,
        )
      } else process.stderr.write(`\n[${tag}${ev.type}] ${JSON.stringify(ev).slice(0, 300)}\n`)
    }
    const common = {
      race: values.race ? Number(values.race) : 2,
      model: values.model,
      effort: values.effort,
      onEvent,
    }
    if (both) {
      const r = await pipelineBoth(rest.join(' '), common)
      await closeProbe()
      for (const players of [1, 2] as const) {
        const v = r.results[players]
        process.stderr.write(
          v instanceof Error
            ? `${players}P failed: ${v.message}\n`
            : `play ${players}P: pnpm harness play ${v.run.id}\n`,
        )
      }
    } else {
      const r = await pipeline(rest.join(' '), { ...common, players: playersOf(values) })
      await closeProbe()
      process.stderr.write(`play: pnpm harness play ${r.run.id}\n`)
    }
  } else if (cmd === 'seed' && rest[0]) {
    const added = await seed(readPrompts(resolve(CWD, rest[0])), {
      n: values.n ? Number(values.n) : 1,
      concurrency: values.concurrency ? Number(values.concurrency) : 2,
      players: playersOf(values),
    })
    process.stderr.write(`library: +${added} games, ${listLibrary().length} total\n`)
  } else if (cmd === 'bench-remix' && rest[0]) {
    const { file } = await benchRemix(readRemixes(resolve(CWD, rest[0])), {
      concurrency: values.concurrency ? Number(values.concurrency) : 3,
      label: values.label,
    })
    process.stderr.write(`results: ${file}\n`)
    process.stderr.write(`${readFileSync(file, 'utf8').split('\n').slice(0, 9).join('\n')}\n`)
  } else if (cmd === 'bench' && rest[0]) {
    const { file } = await bench(readPrompts(resolve(CWD, rest[0])), {
      model: values.model,
      effort: values.effort,
      players: playersOf(values),
      n: values.n ? Number(values.n) : 1,
      concurrency: values.concurrency ? Number(values.concurrency) : 4,
      label: values.label,
      noProbe: values['no-probe'],
      fun: values.fun,
    })
    process.stderr.write(`results: ${file}\n`)
    process.stderr.write(`${readFileSync(file, 'utf8').split('\n').slice(0, 24).join('\n')}\n`)
  } else {
    process.stderr.write(USAGE)
    process.stderr.write(
      `models: build ${MODELS.build}/${MODELS.buildEffort}, spec ${MODELS.spec}/${MODELS.specEffort}\n`,
    )
    process.exit(2)
  }
} catch (e) {
  process.stderr.write(`error: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
}
