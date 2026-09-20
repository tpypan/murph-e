import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../../..')
const require=createRequire(join(root,'packages/probe/package.json'))
const {chromium}=require('playwright')
const source=readFileSync(join(dir,'module.js'),'utf8')
const browser=await chromium.launch({headless:true}),page=await browser.newPage()
await page.goto('file://'+root+'/packages/runtime/index.html?probe=1')
mkdirSync(join(dir,'screenshots'),{recursive:true})
const results=[]
try { for(const players of [1,2]){
 const code=`const game=(${source})({});let f=0;
 function init(api){game.init(api);f=0}
 function update(api,dt){const keys=[new Set(),new Set()];
 const s=game.inspect(),p=s.paddles[0],b=s.ball;
let target=b.y;
function fold(y){const n=((y-38)%316+316)%316;return 38+(n>158?316-n:n)}
if(b.vx<0)target=fold(b.y+b.vy*((21-b.x)/b.vx))-(s.stats.hits[0]%2?-7:7);
if(Math.abs(target-p.y)>2)keys[0].add(target>p.y?'down':'up');
if(s.phase==='serve'&&f%12===0&&s.server<s.players)keys[s.server].add('a');
if(s.phase==='rally'&&b.vx<0&&b.x<155)keys[0].add('a');

 const old=api.btn;api.btn=(b,p=0)=>keys[p].has(b);game.update(api,dt);api.btn=old;f++;
 }
 function draw(api){game.draw(api)}`
 const load=await page.evaluate(({code,players})=>window.__probe.load(code,7,'VOLT RALLY',players),{code,players})
 assert.equal(load.ok,true,load.error);await page.evaluate(()=>window.__probe.start());let previous=0
 for(const [name,frames] of [['serve', 1], ['launch', 90], ['rally', 500], ['return', 700], ['match-end', 11000]]){
  const started=performance.now();const state=await page.evaluate(n=>window.__probe.step(n),frames-previous);previous=frames
  const data=await page.evaluate(()=>window.__probe.snapshot())
  writeFileSync(join(dir,'screenshots',`${players}p-${name}.png`),Buffer.from(data.split(',')[1],'base64'))
  results.push({players,name,load,state,stepMs:Math.round(performance.now()-started)})
  assert.equal(state.error,null)
 }
 assert.equal(results.at(-1).state.state,'win','observable policy reaches actual runtime win')
}} finally { await browser.close() }
writeFileSync(join(dir,'render-results.json'),JSON.stringify({at:new Date().toISOString(),results},null,2)+'\n')
console.log(JSON.stringify(results,null,2))
