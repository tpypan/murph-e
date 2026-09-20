import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir=dirname(fileURLToPath(import.meta.url))
const art=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8'))
// Provenance lives in assets.json/manifest.json; ship only drawing data in the game.
const embedded={width:art.width,height:art.height,animations:art.animations,frames:art.frames}
const src=readFileSync(join(dir,'module.base.js'),'utf8').replace('__KART_ART__',JSON.stringify(embedded))
writeFileSync(join(dir,'module.js'),src)
