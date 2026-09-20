// Read-only audit of frozen v4.2 generations. No model calls or source mutations.
// Plan ordinary inputs in a VM, then replay original saved code in Chromium.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const crossingRouteSource=readFileSync(resolve(import.meta.dirname,'../../../library/catalog/crossing/route.mjs'),'utf8').replace('export function routeToHome','function routeToHome').replace('iter < 14000','iter < 1400');
const routeToHome=Function(crossingRouteSource+';return routeToHome')();
import {soloBot} from '../../../library/catalog/bomber/route.mjs';
const root=resolve(import.meta.dirname,'../../..'),out=import.meta.dirname;
const require=createRequire(join(root,'packages/probe/package.json')),{chromium}=require('playwright');
const hash=s=>createHash('sha256').update(s).digest('hex');
const families=['bomber','crossing','falling-blocks','formation-shooter','asteroids','missile-defense'];
const sources=['2026-09-19-2145-catalog-expanded-medium-1p-unique-a.json','2026-09-19-2147-catalog-expanded-medium-2p-unique-a.json'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function plan(row,players,type){
 const dir=join(root,'runs',row.runId),code=readFileSync(join(dir,'game.js'),'utf8'),custom=readFileSync(join(dir,'customization.js'),'utf8');
 const variable=custom.match(/(\w+)\s*=\s*ARCADE\./)[1];
 const sandbox=vm.createContext({Math});vm.runInContext(code,sandbox);
 const get=vm.runInContext(`()=>${variable}`,sandbox);
 let frame=0,held=[new Set(),new Set()],prev=[new Set(),new Set()],error=null;
 const scores=[0,0],terminal=[],inputs=[],shots=[],seen=new Set(),scoreEvents=[],textEvents=[];
 function scoring(n,p,add){for(const i of players===1?[0]:p===undefined?[0,1]:[clamp(p|0,0,1)]){scores[i]=Math.max(0,Math.floor((add?scores[i]:0)+n));scoreEvents.push({frame:frame+1,kind:add?'add':'set',player:i,value:n,total:scores[i]})}}
 const api={W:256,H:224,P1:12,P2:8,players,frame:0,t:0,btn:(b,p=0)=>held[p]?.has(b)||false,btnp:(b,p=0)=>(held[p]?.has(b)&&!prev[p]?.has(b))||false,score:(n,p)=>scoring(n,p,false),addScore:(n,p)=>scoring(n,p,true),getScore:(p=0)=>scores[players===1?0:clamp(p,0,1)],win:(p)=>terminal.push({state:'win',winner:p??null,frame:frame+1}),gameOver:()=>terminal.push({state:'gameover',frame:frame+1}),clamp,dist:(x,y,a,b)=>Math.hypot(x-a,y-b),rnd:(n=1)=>.5*n,rndi:(a,b)=>Math.floor((a+b)/2),textWidth:(s,n=1)=>String(s).length*8*n};
 for(const key of ['cls','pset','pget','line','rect','rectfill','circ','circfill','spr','flash','shake','sfx','tone'])api[key]=()=>{};
 function text(s,...args){if(['HOME!','DIVER!','CHAIN!'].includes(s)&&!seen.has(s)){seen.add(s);shots.push({name:'notice',frame:frame+1});textEvents.push({text:s,args,frame:frame+1})}}
 api.text=api.textCenter=text;
 sandbox.init(api);
 const initial=get().inspect();
 function keys(p,...buttons){const next=new Set(buttons);for(const b of ['up','down','left','right','a','b'])if(next.has(b)!==held[p].has(b))inputs.push({at:frame,player:p,button:b,down:next.has(b)});held[p]=next}
 function shot(name){if(seen.has(name))return;seen.add(name);shots.push({name,frame:frame+1})}
 function step(n=1){for(let i=0;i<n&&!terminal.length&&!error;i++){
  api.frame=frame+1;api.t=(frame+1)/60;
  try{sandbox.update(api,1/60);sandbox.draw(api)}catch(e){error={frame:frame+1,message:e.stack};break}
  const s=get().inspect();if(frame===0)shot('start');if(frame===299)shot('action');
  if(type==='bomber'&&s.flames.length)shot('blast');
  if(type==='crossing'&&s.players.some(p=>p.row>=1&&p.row<=4))shot('river');
  if(type==='formation-shooter'&&s.aliens.some(a=>a.mode==='dive'))shot('dive');
  if(type==='asteroids'&&s.stats.splits>0)shot('split');
  if(type==='falling-blocks'&&s.boards.some(b=>b.lines>0))shot('clear');
  prev=held.map(h=>new Set(h));frame++;
 }return get().inspect()}
 const h={game:{inspect:()=>get().inspect()},keys,step,scores,terminal,count:()=>frame};
 let limitation=null;
 if(type==='bomber'){
  if(players===2){keys(1,'left');step(16);keys(1,'a');step();keys(1,'up');step(16);keys(1);}
  soloBot(h,12000);limitation=players===2?'P2 moves and plants independently at opening; subsequent complete-route pilot controls P1 only.':'Read-only solo escape planner may lose; no guarantee of optimal play.';
 }else if(type==='crossing'){
  limitation='Bounded opening routes only; full three-level completion is not claimed by this generated-output audit.';
  for(let attempts=0;attempts<4&&!terminal.length&&!error;attempts++){
   const s=get().inspect();if(s.phase!=='play'){step(80);continue}
   const home=s.filled.findIndex(x=>x===null);if(home<0){step(80);continue}
   const p=players===2?home%2:0;
   while(get().inspect().players[p].wait>0&&!terminal.length)step();
   const route=routeToHome(get().inspect(),p,home);
   if(!route){step(8);continue}
   for(const action of route){keys(p,...(action==='wait'?[]:[action]));step(8)}keys(p);step(30);
  }
 }else{
  let policy;
  if(type==='falling-blocks'||type==='missile-defense')policy=Function('return '+readFileSync(join(root,'library/catalog',type,'policy.js'),'utf8'))();
  else{const source=readFileSync(join(root,'library/catalog',type,'verify.mjs'),'utf8');const part=source.slice(source.indexOf(type==='asteroids'?'function delta(':'function control('),source.indexOf('function auto('));policy=Function(part+';return control')();}
  const cache={};for(let n=0;n<18000&&!terminal.length&&!error;n++){
   let next;if(type==='falling-blocks'||type==='missile-defense')next=policy(get().inspect(),frame,cache);else{const hs=[new Set(),new Set()];policy({game:get(),held:hs});next=hs.map(a=>[...a]);}
   for(let p=0;p<players;p++)keys(p,...next[p]);step();
  }
 }
 for(let p=0;p<players;p++)keys(p);
 shots.push({name:terminal.length?'terminal':'end',frame:Math.max(1,frame)});
 const final=get().inspect(),finalScores=scores.slice(0,players);
 sandbox.init(api);const reset=get().inspect();
 return {name:`${type}-${players}p`,runId:row.runId,players,type,sourceHash:hash(code),customizationHash:hash(custom),specHash:hash(readFileSync(join(dir,'spec.json'))),catalog:JSON.parse(readFileSync(join(dir,'catalog-context.json'))).parts,initial,final,reset,scores:finalScores,terminal,error,frames:frame,inputs,shots:shots.sort((a,b)=>a.frame-b.frame),scoreEvents,textEvents,limitation};
}
const results=[];
for(const source of sources){const b=JSON.parse(readFileSync(join(root,'bench/results',source)));for(const [i,row]of b.rows.entries()){const r=plan(row,b.players,families[i]);results.push(r);console.log('planned',r.name,r.frames,JSON.stringify(r.terminal),JSON.stringify(r.error));}}
writeFileSync(join(out,'plans.json'),JSON.stringify(results,null,2)+'\n');
const browser=await chromium.launch();
try{for(const r of results){
 const page=await browser.newPage();await page.goto('file://'+root+'/packages/runtime/index.html?probe=1');
 const code=readFileSync(join(root,'runs',r.runId,'game.js'),'utf8');
 r.load=await page.evaluate(({code,players})=>window.__probe.load(code,7,'ARCADE',players),{code,players:r.players});
 await page.evaluate(()=>window.__probe.start());await page.evaluate(a=>window.__probe.inject(a),r.inputs);
 let now=0;
 for(const shot of r.shots){shot.runtime=await page.evaluate(n=>window.__probe.step(n),shot.frame-now);now=shot.frame;
  const png=await page.evaluate(()=>window.__probe.snapshot());shot.file=`${r.name}-${shot.name}.png`;writeFileSync(join(out,shot.file),Buffer.from(png.split(',')[1],'base64'));
 }
 r.errors=await page.evaluate(()=>window.__probe.errors());r.nativeFinal=r.shots.at(-1).runtime;
 r.scoreReplayMatches=JSON.stringify(r.nativeFinal.scores.slice(0,r.players))===JSON.stringify(r.scores);
 await page.close();console.log('native',r.name,JSON.stringify(r.nativeFinal),r.scoreReplayMatches);
 }}finally{await browser.close()}
writeFileSync(join(out,'audit.json'),JSON.stringify(results,null,2)+'\n');
