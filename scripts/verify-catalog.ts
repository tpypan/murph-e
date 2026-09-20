import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assembleCatalog, loadCatalog } from '../packages/harness/src/catalog.ts'
import { REQUIRED_PLAYER_MODES } from '../packages/harness/src/multiplayer.ts'
import { closeProbe, controlsFromSpec, probe } from '../packages/probe/src/index.ts'

const requested = new Set(process.argv.slice(2))
try {
  for (const part of loadCatalog().filter((p) => !requested.size || requested.has(p.manifest.id))) {
    if (!REQUIRED_PLAYER_MODES.every((n) => part.manifest.supportsPlayers.includes(n))) {
      console.error(
        `${part.manifest.id}: new foundation verification requires both 1P and 2P; legacy files remain playable in their original mode.`,
      )
      process.exitCode = 1
      continue
    }
    const spec = JSON.parse(readFileSync(resolve(part.dir, 'spec.json'), 'utf8'))
    const code = assembleCatalog(readFileSync(resolve(part.dir, 'demo.js'), 'utf8'), {
      parts: [part],
      hash: part.hash,
      text: part.api,
    })
    const results = []
    mkdirSync(resolve(part.dir, 'verification'), { recursive: true })
    for (const players of part.manifest.supportsPlayers) {
      const { thumb, ...result } = await probe(code, {
        players,
        requireIndependentPlayers: players === 2,
        title: spec.title,
        controls: controlsFromSpec(spec.controls),
      })
      if (thumb) writeFileSync(resolve(part.dir, 'verification', `${players}p-probe.png`), thumb)
      results.push({ players, ...result })
    }
    writeFileSync(
      resolve(part.dir, 'verification/runtime.json'),
      JSON.stringify({ contentHash: part.hash, results }, null, 2),
    )
    console.log(
      JSON.stringify({
        id: part.manifest.id,
        results: results.map((r) => ({
          players: r.players,
          ok: r.ok,
          observations: r.observations,
        })),
      }),
    )
    if (results.some((r) => !r.ok)) process.exitCode = 1
  }
} finally {
  await closeProbe()
}
