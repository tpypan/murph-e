import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../../..'),require=createRequire(join(root,'packages/probe/package.json'))
const {chromium}=require('playwright'),module=readFileSync(join(dir,'module.js'),'utf8')
const browser=await chromium.launch(),page=await browser.newPage()
await page.goto('file://'+root+'/packages/runtime/index.html?probe=1')
mkdirSync(join(dir,'screenshots'),{recursive:true})
const results=[]
for(const players of[1,2]){
 const code=`const game=(${module})({stages:3,lives:3});
 function init(api){game.init(api)}
 function update(api,dt){const st=game.inspect(),buttons=[];for(const p of st.people){const h=new Set();buttons.push(h);if(p.dead||p.lives<=0)continue;const target=p.floor===4?st.goal.x:st.ladders.find(l=>l.bottom===p.floor&&l.main).x;let direction=Math.abs(p.x-target)>2?Math.sign(target-p.x):0;
 if(p.ladder!==null){const l=st.ladders[p.ladder],upper=st.floors[l.top],topY=upper.y+(l.x-128)*upper.slope;const blocked=st.barrels.some(b=>b.floor===l.top&&Math.abs(b.x-p.x)<18&&p.y<topY+21);if(!blocked)h.add('up');}
 else if(Math.abs(p.x-target)<3&&p.floor<4)h.add('up');else{const ahead=st.barrels.some(b=>b.floor===p.floor&&b.mode==='roll'&&b.dir===direction&&(b.x-p.x)*direction>0&&(b.x-p.x)*direction<23);if(ahead)direction=0;if(direction>0)h.add('right');if(direction<0)h.add('left');}
 const danger=st.barrels.some(b=>{if(b.floor!==p.floor||Math.abs(b.y-(p.y-6))>12)return false;const relative=direction*72-b.dir*b.speed,time=(b.x-p.x)/relative;return Math.abs(relative)>30&&time>0&&time<0.33});if((danger||!p.grounded)&&p.ladder===null)h.add('a');}
 const old=api.btn;api.btn=(b,p=0)=>buttons[p]?.has(b)||false;game.update(api,dt);api.btn=old;}
 function draw(api){game.draw(api)}`
 const load=await page.evaluate(({code,players})=>window.__probe.load(code,7,'CRANE RESCUE',players),{code,players})
 await page.evaluate(()=>window.__probe.start());let last=0
 for(const[name,n]of[['start',12],['climb',330],['top',600],['later-stage',1260]]){const start=performance.now(),state=await page.evaluate(n=>window.__probe.step(n),n-last);last=n;const png=await page.evaluate(()=>window.__probe.snapshot());writeFileSync(join(dir,'screenshots',`${players}p-${name}.png`),Buffer.from(png.split(',')[1],'base64'));results.push({players,name,load,state,ms:Math.round(performance.now()-start)})}
}
await browser.close();writeFileSync(join(dir,'render-results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.load.ok||r.state.error))process.exitCode=1
