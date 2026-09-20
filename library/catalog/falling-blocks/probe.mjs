import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { probe, controlsFromSpec, closeProbe } from '../../../packages/probe/src/index.ts'
const dir=dirname(fileURLToPath(import.meta.url))
const spec=JSON.parse(readFileSync(join(dir,'spec.json'),'utf8'))
const code='const ARCADE={fallingBlocks:('+readFileSync(join(dir,'module.js'),'utf8')+')};\n'+readFileSync(join(dir,'demo.js'),'utf8')
mkdirSync(join(dir,'screenshots'),{recursive:true})
const results=[]
try { for(const players of [1,2]){
 const result=await probe(code,{title:spec.title,players,controls:controlsFromSpec(spec.controls)})
 if(result.thumb)writeFileSync(join(dir,'screenshots',`${players}p-probe.png`),result.thumb)
 const {thumb,...rest}=result;results.push({players,...rest})
}} finally { await closeProbe() }
writeFileSync(join(dir,'probe-results.json'),JSON.stringify({at:new Date().toISOString(),results},null,2)+'\n')
console.log(JSON.stringify(results,null,2))
if(results.some(r=>!r.ok))process.exitCode=1
