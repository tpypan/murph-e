import {readFileSync,writeFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
const dir=dirname(fileURLToPath(import.meta.url))
const art=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8'))
const embedded={sets:art.sets}
const src=readFileSync(join(dir,'module.base.js'),'utf8').replace('__CLIMBER_ART__',JSON.stringify(embedded))
writeFileSync(join(dir,'module.js'),src)
