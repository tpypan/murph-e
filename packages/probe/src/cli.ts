import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { closeProbe, controlsFromSpec, probe } from './probe.ts'

// usage: pnpm probe <game.js> [more.js ...]   (reads spec.json beside each game if present)
// pnpm runs package scripts from the package dir; INIT_CWD is where the user typed the command.
const cwd = process.env.INIT_CWD ?? process.cwd()
const files = process.argv.slice(2).map((f) => resolve(cwd, f))
if (files.length === 0) {
  process.stderr.write('usage: pnpm probe <game.js> [more.js ...]\n')
  process.exit(2)
}
let failures = 0
for (const f of files) {
  const code = readFileSync(f, 'utf8')
  const specPath = resolve(dirname(f), 'spec.json')
  const spec = existsSync(specPath) ? JSON.parse(readFileSync(specPath, 'utf8')) : null
  // Templates carry `// CONTROLS: up down a` instead of a spec.
  const header = code
    .match(/^\/\/\s*CONTROLS:\s*(.+)$/m)?.[1]
    ?.trim()
    .split(/\s+/)
  const title = spec?.title ?? code.match(/^\/\/\s*TITLE:\s*(.+)$/m)?.[1]?.trim()
  const players = spec?.players ?? Number(code.match(/^\/\/\s*PLAYERS:\s*(\d)/m)?.[1] ?? 1)
  const r = await probe(code, {
    controls: header ?? controlsFromSpec(spec?.controls),
    title,
    players,
  })
  // A run directory gets thumb.png; any other file gets a sidecar next to it.
  const isRun = basename(f) === 'game.js'
  if (r.thumb)
    writeFileSync(
      isRun ? resolve(dirname(f), 'thumb.png') : f.replace(/\.js$/, '.thumb.png'),
      r.thumb,
    )
  if (!r.ok) failures++
  process.stdout.write(`${r.ok ? 'PASS' : 'FAIL'} ${r.ms}ms  ${f}\n`)
  for (const o of r.observations) process.stdout.write(`      - ${o}\n`)
}
await closeProbe()
process.exit(failures > 0 ? 1 : 0)
