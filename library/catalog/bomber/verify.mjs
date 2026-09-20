import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = import.meta.dirname,
  result = spawnSync(
    process.execPath,
    ['--test', resolve(root, 'test.mjs'), resolve(root, 'default-test.mjs')],
    { encoding: 'utf8' },
  )
mkdirSync(resolve(root, 'evidence'), { recursive: true })
writeFileSync(
  resolve(root, 'evidence/behavior.json'),
  JSON.stringify(
    {
      passed: result.status === 0,
      exitCode: result.status,
      command:
        'node --test library/catalog/bomber/test.mjs library/catalog/bomber/default-test.mjs',
      sourceHash: createHash('sha256')
        .update(readFileSync(resolve(root, 'module.js')))
        .digest('hex'),
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
