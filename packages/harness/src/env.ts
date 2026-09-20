import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import OpenAI from 'openai'

/** Repo root, found from this file so the CLI works from any cwd. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

dotenv.config({ path: resolve(ROOT, '.env'), quiet: true })

export const MODELS = {
  build: process.env.HTN_BUILD_MODEL ?? 'gpt-6-astra',
  buildEffort: process.env.HTN_BUILD_EFFORT ?? 'medium',
  spec: process.env.HTN_SPEC_MODEL ?? 'gpt-5.6-luna',
  specEffort: process.env.HTN_SPEC_EFFORT ?? 'none',
  repair: process.env.HTN_REPAIR_MODEL ?? 'gpt-6-astra',
  repairEffort: process.env.HTN_REPAIR_EFFORT ?? 'medium',
  // Astra needs at least low effort; remix still emits small search/replace blocks.
  remix: process.env.HTN_REMIX_MODEL ?? 'gpt-6-astra',
  remixEffort: process.env.HTN_REMIX_EFFORT ?? 'low',
} as const

/**
 * Kept for callers that wrap a request in it; it no longer gates anything.
 * The 2026-09-20 rule that reserved model calls for cabinet users was removed:
 * development, benches and live tests may call the API with the key in .env.
 */
export function withAppGeneration<T>(operation: () => T): T {
  return operation()
}

let client: OpenAI | null = null
export function openai(): OpenAI {
  if (client) return client
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey)
    throw new Error('OPENAI_API_KEY is not set. Copy .env.example to .env and fill it in.')
  client = new OpenAI({
    apiKey,
    timeout: 300_000,
    maxRetries: 1,
    fetch: (input, init) => globalThis.fetch(input, init),
  })
  return client
}

export function readRepoFile(rel: string): string {
  const p = resolve(ROOT, rel)
  if (!existsSync(p)) throw new Error(`missing ${rel}`)
  return readFileSync(p, 'utf8')
}

export const now = (): number => performance.now()
export const ms = (t0: number): number => Math.round(performance.now() - t0)
