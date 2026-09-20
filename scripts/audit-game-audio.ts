/** Offline only: exercise saved games and admitted demos; never generate games. */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { recordAudioAudit } from '../packages/harness/src/audio-catalog.ts'
import { digest, loadCatalog, openCatalogDb } from '../packages/harness/src/catalog.ts'
import { listDemos, loadDemo } from '../packages/harness/src/demos.ts'
import { loadTemplates } from '../packages/harness/src/prompt.ts'
import { SFX_NAMES } from '../packages/runtime/src/audio.ts'
import { Runtime } from '../packages/runtime/src/runtime.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const buttons = ['up', 'down', 'left', 'right', 'a', 'b'] as const
const frames = 1200
const seeds = [7, 41]
const parts = loadCatalog()
const targets = listDemos(parts).flatMap((game) =>
  game.players.map((players) => {
    const demo = loadDemo(game.id, players, parts)!
    return { source: 'catalog', id: game.id, players, code: demo.code }
  }),
)
for (const template of loadTemplates()) {
  targets.push({
    source: 'template',
    id: template.file.replace(/\.js$/, ''),
    players: template.players,
    code: template.code,
  })
}
for (const id of readdirSync(resolve(root, 'library/games'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()) {
  const dir = resolve(root, 'library/games', id)
  const spec = JSON.parse(readFileSync(resolve(dir, 'spec.json'), 'utf8'))
  targets.push({
    source: 'saved',
    id,
    players: spec.players === 2 ? 2 : 1,
    code: readFileSync(resolve(dir, 'game.js'), 'utf8'),
  })
}

const games = targets.map(({ source, id, players, code }) => {
  const cues: Record<string, number> = {}
  const invalid = new Set<string>()
  const errors: string[] = []
  const firstEvents: { frame: number; cue: string; seed: number; held: string[] }[] = []
  let tones = 0
  let updates = 0
  for (const seed of seeds) {
    const runtime = new Runtime(null as unknown as HTMLCanvasElement, {
      probe: true,
      post: () => {},
    })
    const loaded = runtime.load(code, seed, id, 0, players)
    if (!loaded.ok) {
      errors.push(loaded.error ?? 'load failed')
      continue
    }
    runtime.start()
    // Capture game updates only: the shell itself plays select on START.
    const internal = runtime as unknown as {
      synth: {
        sfx: (name: unknown) => void
        tone: (freq: unknown, ms: unknown, wave?: unknown) => void
      }
    }
    let held: string[] = []
    internal.synth.sfx = (name) => {
      const key = String(name)
      if (!(SFX_NAMES as readonly string[]).includes(key)) invalid.add(key)
      cues[key] = (cues[key] ?? 0) + 1
      if (firstEvents.length < 12)
        firstEvents.push({ frame: runtime.gameFrame, cue: key, seed, held: [...held] })
    }
    internal.synth.tone = (freq, ms, wave = 'square') => {
      if (
        !Number.isFinite(Number(freq)) ||
        Number(freq) <= 0 ||
        !Number.isFinite(Number(ms)) ||
        Number(ms) <= 0 ||
        !['square', 'triangle', 'saw', 'noise'].includes(String(wave))
      )
        invalid.add(`tone:${freq}/${ms}/${wave}`)
      tones++
    }
    for (let frame = 0; frame < frames && runtime.state === 'playing'; frame++) {
      held = []
      for (let player = 0; player < players; player++) {
        const cycle = Math.floor(frame / 90 + seed + player) % 4
        for (const button of buttons) {
          const down =
            button === 'a'
              ? frame % 24 < 12
              : button === 'b'
                ? frame % 77 < 8
                : button === ['right', 'up', 'left', 'down'][cycle]
          runtime.setInput(player, button, down)
          if (down) held.push(`${player}:${button}`)
        }
      }
      runtime.step()
      updates++
    }
    if (runtime.state === 'error')
      errors.push(`runtime error at ${runtime.gameFrame}, seed ${seed}`)
  }
  return {
    source,
    id,
    players,
    codeHash: digest(code),
    updates,
    cues,
    tones,
    invalid: [...invalid],
    errors,
    firstEvents,
    passed: Object.keys(cues).length + tones > 0 && invalid.size === 0 && errors.length === 0,
  }
})
const report = {
  runtimeHash: digest(
    ['runtime.ts', 'audio.ts', 'sound-bank.ts']
      .map((file) => readFileSync(resolve(root, 'packages/runtime/src', file), 'utf8'))
      .join('\n'),
  ),
  method:
    'Actual Runtime.load/start/update/draw with muted synth interception after START; deterministic directional cycles and A/B taps. Coverage proves reachable audio, not every branch or audible device output.',
  seeds,
  framesPerSeed: frames,
  excludedCatalog: parts
    .filter((part) => part.status !== 'verified')
    .map((part) => ({ id: part.manifest.id, contentHash: part.hash, status: part.status })),
  summary: {
    games: games.length,
    passed: games.filter((game) => game.passed).length,
    failed: games.filter((game) => !game.passed).length,
  },
  games,
}
const output = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
if (output) writeFileSync(resolve(output), `${JSON.stringify(report, null, 2)}\n`)
if (process.argv.includes('--index')) {
  const db = openCatalogDb()
  try {
    recordAudioAudit(db, report)
  } finally {
    db.close()
  }
}
console.log(JSON.stringify({ ...report, games: output ? undefined : games }, null, 2))
if (report.summary.failed) process.exitCode = 1
