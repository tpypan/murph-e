import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { funScore, playtest } from './playtest.ts'
import { closeProbe, controlsFromSpec } from './probe.ts'

// usage: pnpm playtest <game.js> [more.js ...]
const cwd = process.env.INIT_CWD ?? process.cwd()
const files = process.argv.slice(2).map((f) => resolve(cwd, f))
if (files.length === 0) {
  process.stderr.write('usage: pnpm playtest <game.js> [more.js ...]\n')
  process.exit(2)
}
for (const f of files) {
  const code = readFileSync(f, 'utf8')
  const specPath = resolve(dirname(f), 'spec.json')
  const spec = existsSync(specPath) ? JSON.parse(readFileSync(specPath, 'utf8')) : null
  const header = code
    .match(/^\/\/\s*CONTROLS:\s*(.+)$/m)?.[1]
    ?.trim()
    .split(/\s+/)
  const title = spec?.title ?? code.match(/^\/\/\s*TITLE:\s*(.+)$/m)?.[1]?.trim()
  const players = spec?.players ?? Number(code.match(/^\/\/\s*PLAYERS:\s*(\d)/m)?.[1] ?? 1)
  const m = await playtest(code, {
    controls: header ?? controlsFromSpec(spec?.controls),
    title,
    players,
    shots: false,
  })
  process.stdout.write(`\n${title ?? f}  fun ${funScore(m)}/100\n`)
  if (!m.ok) process.stdout.write(`  error: ${m.error}\n`)
  process.stdout.write(
    [
      `  grace ${m.grace}  losable ${m.losable}  idleDeath ${m.idleDeathS}s  botDeath ${m.botDeathS}s`,
      `  score  bot ${m.botScore} vs idle ${m.idleScore} (agency ${m.agency})  first ${m.firstScoreS}s  events ${m.scoreEvents}  tiers ${m.scoreTiers}  spread ${m.scoreSpread}`,
      `  pace   busy ${m.busyEarly} -> ${m.busyLate} (ramp ${m.densityRamp})  rate ${m.rateEarly} -> ${m.rateLate}`,
      `  look   colours ${m.colors}  motion ${m.motion}/${m.motionSamples}`,
      `  juice  sfx ${m.sfxCalls} in ${m.sfxKinds} kinds  flash ${m.flash}  shake ${m.shake}`,
    ].join('\n') + '\n',
  )
}
await closeProbe()
