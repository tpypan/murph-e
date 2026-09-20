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
 const s=game.inspect(),targets=s.bricks.filter(b=>b.hp>0);
function fold(x){const n=((x-14)%456+456)%456;return 14+(n>228?456-n:n)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
for(let p=0;p<s.players;p++){
 const paddle=s.paddles[p];
 if(s.phase==='serve'&&p===s.owner){if(f%10===0)keys[p].add('a');continue}
 const incoming=s.balls.map(b=>({...b,landing:fold(b.x+b.vx*(188-b.y)/Math.max(b.vy,1)),time:(188-b.y)/Math.max(b.vy,1)})).filter(b=>b.vy>0&&(s.players===1||(p===0?b.landing<=129:b.landing>=127))).sort((a,b)=>a.time-b.time)[0];
 let target=paddle.x;
 if(incoming){const brick=targets[Math.floor(s.clock/4)%Math.max(1,targets.length)];
  const angle=brick?Math.atan2(brick.x+11-incoming.landing,188-brick.y):0.4;
  const half=paddle.wide>0?26:s.players===2?16:20;
  target=incoming.landing-clamp(angle/1.05,-0.88,0.88)*half;
  if(incoming.time<0.12&&f%18===0)keys[p].add('a');
 }
 if(Math.abs(target-paddle.x)>1.5)keys[p].add(target>paddle.x?'right':'left');
}

 const old=api.btn;api.btn=(b,p=0)=>keys[p].has(b);game.update(api,dt);api.btn=old;f++;
 }
 function draw(api){game.draw(api)}`
 const load=await page.evaluate(({code,players})=>window.__probe.load(code,7,'PRISM BREAK',players),{code,players})
 assert.equal(load.ok,true,load.error);await page.evaluate(()=>window.__probe.start());let previous=0
 for(const [name,frames] of [['serve', 1], ['launch', 80], ['impact', 750], ['formation-2', 4500], ['stage-end', 15000]]){
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
