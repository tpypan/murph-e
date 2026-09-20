import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = import.meta.dirname
const tests = [
  'test.mjs',
  'collision-test.mjs',
  'asset-test.mjs',
  'projectile-test.mjs',
  'selection-test.mjs',
  'cpu-test.mjs',
]
const result = spawnSync(
  process.execPath,
  ['--test', ...tests.map((file) => resolve(root, file))],
  {
    encoding: 'utf8',
  },
)
const sha = (file) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, file)))
    .digest('hex')
mkdirSync(resolve(root, 'evidence'), { recursive: true })
writeFileSync(
  resolve(root, 'evidence/behavior.json'),
  JSON.stringify(
    {
      command: `node --test ${tests.map((name) => `library/catalog/fighter/${name}`).join(' ')}`,
      passed: result.status === 0,
      exitCode: result.status,
      sourceHash: sha('module.js'),
      testHashes: Object.fromEntries(tests.map((file) => [file, sha(file)])),
      stdout: result.stdout,
      stderr: result.stderr,
    },
    null,
    2,
  ),
)
process.stdout.write(result.stdout)
process.stderr.write(result.stderr)
process.exitCode = result.status
