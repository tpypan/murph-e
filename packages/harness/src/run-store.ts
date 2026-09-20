import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
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
  const stamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').replace('Z', '')
  mkdirSync(root, { recursive: true })
  // Atomic uniqueness: simultaneous 1P/2P or repeated prompts must never overwrite
  // each other's specification, code, evidence or catalog provenance.
  const dir = mkdtempSync(resolve(root, `${stamp}-${slugify(transcript)}-`))
  const id = basename(dir)
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
