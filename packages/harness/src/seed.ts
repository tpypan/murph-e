import { closeProbe } from '@htn/probe'
import { listLibrary } from './library.ts'
import { pipeline } from './pipeline.ts'

/** Run the full pipeline over prompts, keeping every passing game in the library. */
export async function seed(
  prompts: string[],
  opts: { n?: number; concurrency?: number; players?: 1 | 2 } = {},
): Promise<number> {
  const n = opts.n ?? 1
  const jobs: string[] = []
  for (const p of prompts) for (let i = 0; i < n; i++) jobs.push(p)
  let next = 0
  const before = listLibrary().length
  async function worker() {
    while (next < jobs.length) {
      const i = next++
      const prompt = jobs[i]!
      try {
        const r = await pipeline(prompt, { keep: true, players: opts.players })
        process.stderr.write(
          `[${i + 1}/${jobs.length}] ${(r.totalMs / 1000).toFixed(1)}s ${r.source.padEnd(8)} ${r.title} <- "${prompt.slice(0, 40)}"\n`,
        )
      } catch (e) {
        process.stderr.write(
          `[${i + 1}/${jobs.length}] ERROR ${e instanceof Error ? e.message : String(e)}\n`,
        )
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 2, jobs.length) }, worker))
  await closeProbe()
  return listLibrary().length - before
}
