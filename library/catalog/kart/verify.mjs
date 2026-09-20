import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir=dirname(fileURLToPath(import.meta.url))
const factory=new Function('return ('+readFileSync(join(dir,'module.js'),'utf8')+')')()
const results=[]
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name)}catch(e){results.push({name,ok:false,detail:e.message});console.log('FAIL '+name+': '+e.message)}}
function run(options={}){
 const held=[new Set(),new Set()],scores=[0,0],events=[],gates=[]
 const api={players:options.apiPlayers??options.players??1,btn:(b,p=0)=>held[p].has(b),btnp:()=>false,score:(n,p=0)=>scores[p]=n,addScore:(n,p=0)=>scores[p]+=n,getScore:(p=0)=>scores[p],sfx:()=>{},tone:()=>{},win:p=>events.push({type:'win',player:p}),gameOver:()=>events.push({type:'gameOver'}),textWidth:s=>s.length*8}
 for(const k of ['cls','pset','line','rect','rectfill','circ','circfill','spr','text','textCenter'])api[k]=()=>{}
 const game=factory({...options,onCheckpoint:(e,api)=>{gates.push(e);if(options.onCheckpoint)options.onCheckpoint(e,api)}});game.init(api)
 const step=(n=1)=>{for(let i=0;i<n;i++)game.update(api,1/60)}
 return{game,api,held,scores,events,gates,step}
}
function auto(r,n,{drift=false}={}){
 for(let i=0;i<n;i++){
  const st=r.game.inspect()
  for(const c of st.racers.filter(c=>c.human)){
   const set=r.held[c.id];set.clear();set.add('a')
   const wanted=-c.x*2+c.curve*0.6
   if(wanted>0.035)set.add('right');else if(wanted<-0.035)set.add('left')
   if(drift&&Math.abs(c.curve)>0.3&&(i%110)<75)set.add('b')
  }
  r.step()
  if(st.phase==='finished')break
 }
}
test('18 complete original sprite poses have valid pixels, anchors and clips',()=>{
 const art=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8'))
 assert.equal(Object.keys(art.frames).length,18)
 for(const f of Object.values(art.frames)){assert.equal(f.pixels.length,32);for(const row of f.pixels)assert.match(row,/^[0-9a-f.]{32}$/);assert.ok(f.anchor.x>=0&&f.anchor.x<32&&f.anchor.y<32);assert.ok(f.durationMs>0);assert.ok(f.hurtboxes.length)}
 for(const clip of Object.values(art.animations)){assert.ok(clip.frameMs>0);for(const key of clip.frames)assert.ok(art.frames[key])}
})
test('countdown freezes all racers, then throttle accelerates smoothly',()=>{
 const r=run();r.held[0].add('a');r.step(120);assert.equal(r.game.inspect().racers[0].distance,0);r.step(62);const a=r.game.inspect().racers[0].speed;r.step(60);const b=r.game.inspect().racers[0].speed;assert.ok(b>a+400&&b<700);assert.equal(r.game.inspect().racers[0].lap,0)
})
test('braking and off-road slowdown reduce speed without teleporting',()=>{
 const r=run();r.step(181);r.held[0].add('a');r.step(120);const fast=r.game.inspect().racers[0];r.held[0].clear();r.held[0].add('down');r.step(35);const slow=r.game.inspect().racers[0];assert.ok(slow.speed<fast.speed-500);assert.ok(slow.distance>fast.distance);r.held[0].clear();r.held[0].add('a');r.held[0].add('right');r.step(210);const off=r.game.inspect().racers[0];assert.ok(off.x>1&&off.speed<=520)
})
test('2P input acts independently; neither camera borrows the other car',()=>{
 const r=run({players:2});r.step(181);r.held[1].add('a');r.held[1].add('right');r.step(100);const [a,b]=r.game.inspect().racers;assert.equal(a.distance,0);assert.ok(b.distance>200&&b.x>a.x+0.2);assert.equal(a.speed,0);r.game.draw(r.api)
})
test('cabinet player count is authoritative and custom gate bonuses persist',()=>{
 const apiOne=run({players:2,apiPlayers:1});assert.equal(apiOne.game.inspect().racers.filter(c=>c.human).length,1);
 const apiTwo=run({players:1,apiPlayers:2});assert.equal(apiTwo.game.inspect().racers.filter(c=>c.human).length,2);
 const r=run({laps:1,onCheckpoint:(e,api)=>{if(e.player===0)api.addScore(17,0)}});r.step(181);auto(r,5000);assert.equal(r.gates.filter(g=>g.player===0).length,4);assert.ok(r.scores[0]>=1468);
});
test('charged drift release grants finite turbo; holding alone never fires it',()=>{
 const r=run();r.step(181);r.held[0].add('a');r.step(95);r.held[0].add('b');r.held[0].add('right');r.step(36);r.held[0].delete('right');r.held[0].add('left');r.step(36);const pre=r.game.inspect();assert.ok(pre.racers[0].drift>=0.55);assert.equal(pre.stats.driftBoosts,0);r.held[0].delete('b');r.step();const boost=r.game.inspect();assert.ok(boost.racers[0].boost>0);assert.ok(boost.stats.driftBoosts>0);assert.ok(r.scores[0]>=40)
})
test('whole race visits four gates in order each lap and reaches a terminal state',()=>{
 const r=run({laps:2,timeLimit:180});r.step(181);auto(r,9000,{drift:true});const st=r.game.inspect();assert.equal(st.phase,'finished');const own=r.gates.filter(g=>g.player===0);assert.deepEqual(own.map(g=>[g.lap,g.gate]),[[1,1],[1,2],[1,3],[1,4],[2,1],[2,2],[2,3],[2,4]]);assert.equal(st.racers[0].lap,2);assert.ok(st.racers[0].finishTime>20);assert.equal(r.events.length,1);assert.ok(r.scores[0]>=1800);assert.ok(st.stats.collisions>0)
})
test('2P first human finish resolves winner and both can drive all course sections',()=>{
 const r=run({players:2,laps:1});r.step(181);auto(r,6000,{drift:true});const st=r.game.inspect();assert.equal(st.phase,'finished');assert.equal(r.events[0].type,'win');assert.ok(r.events[0].player===0||r.events[0].player===1);assert.ok(st.racers[0].distance>st.trackLength*0.8);assert.ok(st.racers[1].distance>st.trackLength*0.8)
})
test('no-input timer loss never awards a lap or checkpoint',()=>{
 const r=run({timeLimit:30});r.step(2100);assert.equal(r.events[0].type,'gameOver');assert.equal(r.game.inspect().racers[0].lap,0);assert.equal(r.gates.filter(g=>g.player===0).length,0)
})
test('AI gate and finish events never invoke human reward hooks',()=>{
 const finishes=[];
 const r=run({laps:1,timeLimit:120,onCheckpoint:(e,api)=>api.addScore(50,e.player),onFinish:e=>finishes.push(e)});
 r.step(7200);
 assert.ok(r.game.inspect().racers.some(c=>!c.human&&c.finishTime!==null));
 assert.equal(r.gates.length,0);assert.equal(finishes.length,0);assert.equal(r.scores[0],0);
 const active=run({laps:1,onCheckpoint:(e,api)=>{assert.ok(e.player<api.players);api.addScore(17,e.player)}});
 active.step(181);auto(active,5000);assert.equal(active.gates.length,4);assert.ok(active.scores[0]>=1468);
})
test('replay deterministic and inspect returns copies',()=>{
 const a=run(),b=run();a.step(181);b.step(181);auto(a,1400,{drift:true});auto(b,1400,{drift:true});assert.deepEqual(a.game.inspect(),b.game.inspect());const snap=a.game.inspect();snap.racers[0].x=99;snap.stats.collisions=99;assert.notEqual(a.game.inspect().racers[0].x,99)
})
test('default three-lap race keeps all ordered checkpoints and readable lap HUD',()=>{
 for(const players of [1,2]){
  const r=run({players});r.step(181);auto(r,10000,{drift:true});const state=r.game.inspect();
  assert.equal(state.laps,3);assert.equal(state.phase,'finished');
  for(const c of state.racers.filter(c=>c.human&&c.finishTime!==null))assert.deepEqual(r.gates.filter(g=>g.player===c.id).map(g=>[g.lap,g.gate]),Array.from({length:12},(_,i)=>[Math.floor(i/4)+1,i%4+1]));
  const labels=[];r.api.text=(text)=>labels.push(text);r.game.draw(r.api);assert.ok(labels.includes('L3/3'));
 }
});
test('upcoming bend cue is absent on grid and previews actual driving without changing state',()=>{
 const r=run({players:2}),labels=[];r.api.text=(text,x,y)=>labels.push({text,x,y});r.game.draw(r.api);assert.ok(!labels.some(l=>/BEND|TURN/.test(l.text)));
 let found=false;
 for(let i=0;i<700&&!found;i++){auto(r,1);labels.length=0;const before=r.game.inspect();r.game.draw(r.api);assert.deepEqual(r.game.inspect(),before);const cues=labels.filter(l=>/BEND|TURN/.test(l.text));if(cues.length){found=true;assert.ok(cues.every(l=>l.y===28||l.y===135));}}
 assert.ok(found,'both compact cameras need advance turn information');
});
writeFileSync(join(dir,'behavior-results.json'),JSON.stringify({at:new Date().toISOString(),results},null,2)+'\n')
if(results.some(r=>!r.ok))process.exitCode=1
