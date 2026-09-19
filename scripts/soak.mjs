#!/usr/bin/env node
// Two-hour soak: hit /api/generate every N seconds and log latency, source
// and server memory. Run alongside the kiosk:  node scripts/soak.mjs [minutes] [intervalSeconds]
import { appendFileSync, readFileSync } from 'node:fs'

const minutes = Number(process.argv[2] ?? 120)
const interval = Number(process.argv[3] ?? 180)
const base = process.env.BASE ?? 'http://localhost:3000'
const prompts = readFileSync(new URL('../bench/prompts.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((l) => l.replace(/\s+\(.*\)\s*$/, '').trim())
  .filter(Boolean)
const log = (line) => {
  const s = `${new Date().toISOString()} ${line}`
  console.log(s)
  appendFileSync('soak.log', `${s}\n`)
}

const end = Date.now() + minutes * 60_000
let i = 0
while (Date.now() < end) {
  const prompt = prompts[i++ % prompts.length]
  const t0 = Date.now()
  try {
    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: prompt }),
    })
    const text = await res.text()
    const ready = [...text.matchAll(/data: (\{.*"type":"ready".*\})/g)]
      .map((m) => JSON.parse(m[1]))
      .pop()
    log(
      `${((Date.now() - t0) / 1000).toFixed(1)}s ${ready ? `${ready.source} "${ready.title}"` : `NO READY (${res.status})`} <- "${prompt}"`,
    )
  } catch (e) {
    log(`ERROR ${e instanceof Error ? e.message : e} <- "${prompt}"`)
  }
  const mem = await fetch(`${base}/api/library`)
    .then((r) => r.headers.get('x-mem') ?? '')
    .catch(() => '')
  if (mem) log(`mem ${mem}`)
  await new Promise((r) => setTimeout(r, interval * 1000))
}
log('soak done')
