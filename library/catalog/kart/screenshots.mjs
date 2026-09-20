import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../../..')
const require=createRequire(join(root,'packages/probe/package.json'))
const {chromium}=require('playwright')
const module=readFileSync(join(dir,'module.js'),'utf8')
const browser=await chromium.launch({headless:true})
const page=await browser.newPage()
await page.route('**/*', r=>r.request().url().startsWith('file:')?r.continue():r.abort())
await page.goto('file://'+root+'/packages/runtime/index.html?probe=1')
mkdirSync(join(dir,'screenshots'),{recursive:true})
const results=[]
for(const players of [1,2]){
 const code=`const game=(${module})({laps:3});
 function init(api){game.init(api)}
 function update(api,dt){
  const state=game.inspect(),old=api.btn;
  api.btn=(button,p=0)=>{const c=state.racers[p];const turn=-c.x*2+c.curve*0.6;
    if(button==='a')return true;if(button==='left')return turn<-0.035;if(button==='right')return turn>0.035;
    if(button==='b')return Math.abs(c.curve)>0.3&&(api.frame%110)<75;return false};
  game.update(api,dt);api.btn=old;
 }
 function draw(api){game.draw(api)}`
 const load=await page.evaluate(({code,players})=>window.__probe.load(code,7,'COAST CIRCUIT',players),{code,players})
 await page.evaluate(()=>window.__probe.start())
 let prev=0
 for(const [name,frames] of [['grid',1],['straight',440],['corner',540],['s-bend',660],['late',1800]]){
  const started=performance.now()
  const state=await page.evaluate(n=>window.__probe.step(n),frames-prev);prev=frames
  const data=await page.evaluate(()=>window.__probe.snapshot())
  writeFileSync(join(dir,'screenshots',`${players}p-${name}.png`),Buffer.from(data.split(',')[1],'base64'))
  results.push({players,name,load,state,stepMs:Math.round(performance.now()-started)})
 }
}
writeFileSync(join(dir,'render-results.json'),JSON.stringify(results,null,2)+'\n')
await browser.close()
console.log(JSON.stringify(results,null,2))
if(results.some(r=>!r.load.ok||r.state.error))process.exitCode=1
