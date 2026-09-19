import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { bench, readPrompts } from './bench.ts'
import { MODELS, ROOT } from './env.ts'
import { gen } from './gen.ts'
import { listLibrary } from './library.ts'
import { pipeline } from './pipeline.ts'
import { seed } from './seed.ts'

const CWD = process.env.INIT_CWD ?? process.cwd()

const USAGE = `usage:
  harness gen "<transcript>" [--model M] [--effort E] [--variant N] [--players 2]
  harness play <run-id>
  harness run "<transcript>" [--race 2] [--players 2]   full pipeline: spec, race, probe, repair, fallback
  harness seed <prompts.txt> [--n 2] [--players 2]      fill library/games with passing games
  harness bench <prompts.txt> [--model M] [--effort E] [--players 2] [--n 1] [--concurrency 4] [--label L] [--no-probe]
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
    race: { type: 'string' },
    players: { type: 'string' },
  },
})
const [cmd, ...rest] = positionals
try {
  if (cmd === 'gen' && rest[0]) await cmdGen(rest.join(' '), values)
  else if (cmd === 'play' && rest[0]) await cmdPlay(rest[0])
  else if (cmd === 'run' && rest[0]) {
    const { closeProbe } = await import('@htn/probe')
    const r = await pipeline(rest.join(' '), {
      race: values.race ? Number(values.race) : 2,
      players: playersOf(values),
      model: values.model,
      effort: values.effort,
      onEvent: (ev) => {
        if (ev.type === 'token') {
          if (ev.variant === 0) process.stdout.write(ev.text)
        } else if (ev.type === 'ready') {
          process.stderr.write(
            `\nREADY ${ev.source} "${ev.title}" in ${fmtS(ev.totalMs)}  run: runs/${ev.runId}\n`,
          )
        } else process.stderr.write(`\n[${ev.type}] ${JSON.stringify(ev).slice(0, 300)}\n`)
      },
    })
    await closeProbe()
    process.stderr.write(`play: pnpm harness play ${r.run.id}\n`)
  } else if (cmd === 'seed' && rest[0]) {
    const added = await seed(readPrompts(resolve(CWD, rest[0])), {
      n: values.n ? Number(values.n) : 1,
      concurrency: values.concurrency ? Number(values.concurrency) : 2,
      players: playersOf(values),
    })
    process.stderr.write(`library: +${added} games, ${listLibrary().length} total\n`)
  } else if (cmd === 'bench' && rest[0]) {
    const { file } = await bench(readPrompts(resolve(CWD, rest[0])), {
      model: values.model,
      effort: values.effort,
      players: playersOf(values),
      n: values.n ? Number(values.n) : 1,
      concurrency: values.concurrency ? Number(values.concurrency) : 4,
      label: values.label,
      noProbe: values['no-probe'],
    })
    process.stderr.write(`results: ${file}\n`)
    process.stderr.write(`${readFileSync(file, 'utf8').split('\n').slice(0, 12).join('\n')}\n`)
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
