import { AsyncLocalStorage } from 'node:async_hooks'
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
  buildEffort: process.env.HTN_BUILD_EFFORT ?? 'low',
  spec: process.env.HTN_SPEC_MODEL ?? 'gpt-5.6-luna',
  specEffort: process.env.HTN_SPEC_EFFORT ?? 'none',
  repair: process.env.HTN_REPAIR_MODEL ?? 'gpt-6-astra',
  repairEffort: process.env.HTN_REPAIR_EFFORT ?? 'low',
  // Astra needs at least low effort; remix still emits small search/replace blocks.
  remix: process.env.HTN_REMIX_MODEL ?? 'gpt-6-astra',
  remixEffort: process.env.HTN_REMIX_EFFORT ?? 'low',
} as const

const appGeneration = new AsyncLocalStorage<true>()
export const APP_API_ONLY_MESSAGE =
  'APP_API_ONLY: Paid model requests are reserved for people using the app. Development, base games and tests must use the Codex Astra subscription or offline fixtures.'

/** Cabinet generation and speech routes scope real player requests; developer CLIs never enter it. */
export function withAppGeneration<T>(operation: () => T): T {
  return appGeneration.run(true, operation)
}

export function assertAppGeneration(): void {
  if (!appGeneration.getStore()) throw new Error(APP_API_ONLY_MESSAGE)
}

let client: OpenAI | null = null
export function openai(): OpenAI {
  // Check on every access, including after a client was cached by an app request.
  assertAppGeneration()
  if (client) return client
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey)
    throw new Error('OPENAI_API_KEY is not set. Copy .env.example to .env and fill it in.')
  client = new OpenAI({
    apiKey,
    timeout: 300_000,
    maxRetries: 1,
    fetch: (input, init) => {
      // A client retained beyond the request scope must not bypass the policy.
      assertAppGeneration()
      return globalThis.fetch(input, init)
    },
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
