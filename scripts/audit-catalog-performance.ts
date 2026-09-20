/** Offline footprint/CPU sample of saved demos. No generation or network. */

import { readFileSync, writeFileSync } from 'node:fs'
import { arch, cpus, platform } from 'node:os'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { digest, loadCatalog } from '../packages/harness/src/catalog.ts'
import { listDemos, loadDemo } from '../packages/harness/src/demos.ts'
import { ROOT } from '../packages/harness/src/env.ts'
import { createPreviewPlayback } from '../packages/runtime/src/preview-playback.ts'
import { Runtime } from '../packages/runtime/src/runtime.ts'

const issues: { id: string; message: string }[] = []
const parts = loadCatalog(undefined, issues)
const rows = []
const round = (n: number) => Math.round(n * 1000) / 1000
const percentile = (values: number[], p: number) =>
  values.length ? round([...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1]!) : null

for (const summary of listDemos(parts)) {
  for (const players of summary.players) {
    const demo = loadDemo(summary.id, players, parts)!
    const errors: string[] = []
    const runtime = new Runtime(null as unknown as HTMLCanvasElement, {
      probe: true,
      post: (event) => {
        if (event.type === 'error') errors.push(`${event.phase}: ${event.message}`)
      },
    })
    const started = performance.now()
    const loaded = runtime.load(demo.code, 7, demo.title, 0, players)
    const loadAndInitMs = round(performance.now() - started)
    const driver = createPreviewPlayback(runtime, {
      code: demo.code,
      genre: demo.genre,
      demo: true,
      motion: true,
    })
    const timings: number[] = []
    if (loaded.ok) {
      driver.start()
      for (let i = 0; i < 600 && runtime.state === 'playing'; i++) {
        const frame = performance.now()
        driver.step(1)
        timings.push(performance.now() - frame)
      }
    }
    rows.push({
      id: summary.id,
      players,
      codeHash: digest(demo.code),
      bytes: Buffer.byteLength(demo.code),
      gzipBytes: gzipSync(demo.code).length,
      loadAndInitMs,
      sampledFrames: timings.length,
      state: runtime.state,
      medianMs: percentile(timings, 0.5),
      p95Ms: percentile(timings, 0.95),
      maxMs: timings.length ? round(Math.max(...timings)) : null,
      errors,
      loaded: loaded.ok,
    })
  }
}
const report = {
  recordedAt: new Date().toISOString(),
  host: { cpu: cpus()[0]?.model, platform: platform(), arch: arch(), node: process.version },
  method:
    'Unchanged saved demos, actual Runtime in probe mode with native pixel drawing and real demo input edges. One seed, 180 warmup frames, then at most 600 active frames; stop at terminal state. CPU timings include probe frame hashing and input driving. No canvas presentation, GPU, display scheduling, speaker, browser or model latency measurement. Timings are observations, not admission gates or a 60 FPS guarantee.',
  runtimeHash: digest(
    ['runtime.ts', 'gfx.ts', 'preview-playback.ts']
      .map((file) => readFileSync(resolve(ROOT, 'packages/runtime/src', file), 'utf8'))
      .join('\n'),
  ),
  issues,
  excluded: parts.filter((part) => part.status !== 'verified').map((part) => part.manifest.id),
  rows,
}
const output = process.argv[2]
if (output) writeFileSync(resolve(output), `${JSON.stringify(report, null, 2)}\n`)
console.log(
  JSON.stringify(
    {
      ...report,
      rows: output ? undefined : rows,
      summary: {
        samples: rows.length,
        errors: rows.filter((row) => !row.loaded || row.errors.length || !row.sampledFrames).length,
        maxBytes: Math.max(...rows.map((row) => row.bytes)),
        maxGzipBytes: Math.max(...rows.map((row) => row.gzipBytes)),
        slowestP95: [...rows]
          .sort((a, b) => (b.p95Ms ?? 0) - (a.p95Ms ?? 0))
          .slice(0, 3)
          .map(({ id, players, p95Ms }) => ({ id, players, p95Ms })),
      },
    },
    null,
    2,
  ),
)
if (issues.length || rows.some((row) => !row.loaded || row.errors.length || !row.sampledFrames))
  process.exitCode = 1
