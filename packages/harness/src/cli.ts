import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { MODELS, ROOT } from './env.ts'
import { gen } from './gen.ts'

const USAGE = `usage:
  harness gen "<transcript>" [--model M] [--effort E] [--variant N]
  harness play <run-id>
`

function fmtS(msValue: number | null | undefined): string {
  return msValue == null ? '-' : `${(msValue / 1000).toFixed(1)}s`
}

async function cmdGen(transcript: string, values: Record<string, string | undefined>) {
  const t0 = performance.now()
  let streamedChars = 0
  const result = await gen(transcript, {
    model: values.model,
    effort: values.effort,
    variant: values.variant ? Number(values.variant) : 0,
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
  },
})
const [cmd, ...rest] = positionals
try {
  if (cmd === 'gen' && rest[0]) await cmdGen(rest.join(' '), values)
  else if (cmd === 'play' && rest[0]) await cmdPlay(rest[0])
  else {
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
