import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = dirname(fileURLToPath(import.meta.url)),
  art = JSON.parse(readFileSync(join(dir, 'assets.json'), 'utf8'))
writeFileSync(
  join(dir, 'module.js'),
  readFileSync(join(dir, 'module.base.js'), 'utf8')
    .replace(/^\s*;/, '')
    .replace('__ASSETS__', JSON.stringify({ sets: art.sets })),
)
