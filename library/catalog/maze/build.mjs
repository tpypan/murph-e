import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import './build-assets.mjs'

const root = import.meta.dirname
const assets = readFileSync(resolve(root, 'assets.json'), 'utf8')
const core = readFileSync(resolve(root, 'core.js'), 'utf8')
writeFileSync(
  resolve(root, 'module.js'),
  `(function(){\nconst MAZE_ASSETS=${assets};\n${core}\nreturn mazeFactory;\n})()`,
)
console.log('Built standalone maze factory')
