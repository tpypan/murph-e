import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import assert from 'node:assert/strict'
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../../..'),require=createRequire(join(root,'packages/probe/package.json'))
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true}),page=await browser.newPage()
await page.goto('file://'+root+'/packages/runtime/index.html?probe=1')
const source=readFileSync(join(dir,'module.js'),'utf8'),policy=readFileSync(join(dir,'policy.js'),'utf8'),results=[]
mkdirSync(join(dir,'screenshots'),{recursive:true})
try {for(const players of [1,2]){
 const code=`const game=(${source})({});const policy=(${policy});let f=0,cache={};
 function init(api){game.init(api);f=0;cache={}}
 function update(api,dt){const keys=policy(game.inspect(),f,cache),old=api.btn;api.btn=(b,p=0)=>keys[p].includes(b);game.update(api,dt);api.btn=old;f++}
 function draw(api){game.draw(api)}`
 const load=await page.evaluate(({code,players})=>window.__probe.load(code,7,'STACK CIRCUIT',players),{code,players});assert.equal(load.ok,true,load.error)
 await page.evaluate(()=>window.__probe.start());let previous=0
 for(const [name,frames] of [["start", 1], ["stack", 180], ["clear", 320], ["race", 480], ["finished", 1800]]){
  const start=performance.now(),state=await page.evaluate(n=>window.__probe.step(n),frames-previous);previous=frames
  const data=await page.evaluate(()=>window.__probe.snapshot());writeFileSync(join(dir,'screenshots',`${players}p-${name}.png`),Buffer.from(data.split(',')[1],'base64'))
  results.push({players,name,load,state,stepMs:Math.round(performance.now()-start)});assert.equal(state.error,null)
 }
 assert.equal(results.at(-1).state.state,'win')
}}finally{await browser.close()}
writeFileSync(join(dir,'render-results.json'),JSON.stringify({at:new Date().toISOString(),results},null,2)+'\n');console.log(JSON.stringify(results,null,2))
