import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import './build-assets.mjs'

const root = import.meta.dirname
writeFileSync(
  resolve(root, 'module.js'),
  `(function(){const BOMBER_ASSETS=${readFileSync(resolve(root, 'assets.json'), 'utf8')};\n${readFileSync(resolve(root, 'core.js'), 'utf8')}\nreturn bomberFactory;})()`,
)
