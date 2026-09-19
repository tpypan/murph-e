import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT } from './env.ts'

export interface Run {
  id: string
  dir: string
  write: (name: string, content: string | Buffer) => string
  event: (type: string, data?: Record<string, unknown>) => void
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32)
      .replace(/-+$/, '') || 'game'
  )
}

/** runs/<timestamp>-<slug>/ with transcript.txt and an events.jsonl log. */
export function createRun(transcript: string, root = resolve(ROOT, 'runs')): Run {
  const stamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').slice(0, 15)
  const id = `${stamp}-${slugify(transcript)}`
  const dir = resolve(root, id)
  mkdirSync(dir, { recursive: true })
  const t0 = performance.now()
  const run: Run = {
    id,
    dir,
    write: (name, content) => {
      const p = resolve(dir, name)
      writeFileSync(p, content)
      return p
    },
    event: (type, data = {}) => {
      appendFileSync(
        resolve(dir, 'events.jsonl'),
        `${JSON.stringify({ t: Math.round(performance.now() - t0), type, ...data })}\n`,
      )
    },
  }
  run.write('transcript.txt', `${transcript.trim()}\n`)
  run.event('start', { transcript })
  return run
}
