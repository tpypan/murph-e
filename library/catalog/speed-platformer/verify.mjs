import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = import.meta.dirname,
  sha = (text) => createHash('sha256').update(text).digest('hex')
const manifestText = readFileSync(resolve(dir, 'manifest.json'), 'utf8'),
  manifest = JSON.parse(manifestText)
const module = readFileSync(resolve(dir, 'module.js'), 'utf8')
const contentHash = sha(
  [
    manifestText,
    module.trim().replace(/;\s*$/, ''),
    readFileSync(resolve(dir, 'api.md'), 'utf8'),
    ...[...new Set([...manifest.files, ...manifest.assets])]
      .sort()
      .map((file) => `${file}\n${readFileSync(resolve(dir, file), 'base64')}`),
  ].join('\n'),
)
mkdirSync(resolve(dir, 'verification'), { recursive: true })
const test = spawnSync(
  process.execPath,
  ['--test', '--test-reporter=tap', resolve(dir, 'test.mjs')],
  { encoding: 'utf8' },
)
const behavior = {
  contentHash,
  passed: test.status === 0,
  stdout: test.stdout,
  stderr: test.stderr,
}
writeFileSync(resolve(dir, 'verification/behavior.json'), JSON.stringify(behavior, null, 2) + '\n')
const frames = JSON.parse(readFileSync(resolve(dir, 'render-results.json'), 'utf8'))
const artifacts = []
for (const players of [1, 2]) {
  const results = frames.filter((frame) => frame.players === players)
  const result = {
    contentHash,
    players,
    passed:
      results.length === 6 &&
      results.every(
        (frame) => frame.moduleHash === sha(module) && frame.load.ok && !frame.state.error,
      ) &&
      results.at(-1).state.state === 'win',
    frames: results,
  }
  const file = `verification/runtime-${players}p.json`
  writeFileSync(resolve(dir, file), JSON.stringify(result, null, 2) + '\n')
  artifacts.push({ name: `runtime-${players}p`, passed: result.passed, artifact: file })
}
const routes = JSON.parse(readFileSync(resolve(dir, 'verification/default-native/routes.json'), 'utf8'))
const routeResult = {
  contentHash,
  passed: routes.moduleSha256 === sha(module) && routes.routes.length === 3 && routes.routes.every((route) => {
    const last = route.captures.at(-1)
    return last.runtimeState === 'win' && last.state.phase === 'complete' &&
      (route.players === 1 || last.state.winner === 1 - route.delayPlayer) &&
      route.reset.runtimeState === 'playing' && route.reset.errors.length === 0 &&
      route.reset.state.people.every((p) => p.act === 0 && p.lives === 3 && p.score === 0) &&
      route.captures.every((capture) => capture.sha256 === sha(readFileSync(resolve(dir, 'verification/default-native', capture.file))))
  }),
  evidenceHash: sha(readFileSync(resolve(dir, 'verification/default-native/routes.json'))),
  routes: routes.routes.map((route) => ({ players: route.players, delayPlayer: route.delayPlayer, ticks: route.captures.at(-1).state.ticks, winner: route.captures.at(-1).state.winner })),
}
writeFileSync(resolve(dir, 'verification/default-input-routes.json'), JSON.stringify(routeResult, null, 2) + '\n')
artifacts.push({ name: 'default-input-routes', passed: routeResult.passed, artifact: 'verification/default-input-routes.json' })
const visual = {
  contentHash,
  passed: false,
  status: 'pending independent visual review',
  screenshots: frames.map((frame) => {
    const file = `screenshots/${frame.players}p-${frame.name}.png`
    return { file, sha256: sha(readFileSync(resolve(dir, file))) }
  }),
}
writeFileSync(
  resolve(dir, 'verification/visual-review.json'),
  JSON.stringify(visual, null, 2) + '\n',
)
const checks = [
  { name: 'behavior', passed: behavior.passed, artifact: 'verification/behavior.json' },
  ...artifacts,
  { name: 'visual', passed: false, artifact: 'verification/visual-review.json' },
].map((check) => ({
  ...check,
  artifactHash: sha(readFileSync(resolve(dir, check.artifact), 'utf8')),
}))
writeFileSync(
  resolve(dir, 'quality.json'),
  JSON.stringify({ contentHash, status: 'draft', checks }, null, 2) + '\n',
)
console.log(
  JSON.stringify(
    { contentHash, checks: checks.map(({ name, passed }) => ({ name, passed })) },
    null,
    2,
  ),
)
if (!behavior.passed || artifacts.some((check) => !check.passed)) process.exitCode = 1
