import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import vm from 'node:vm'
const dir=dirname(fileURLToPath(import.meta.url)),factory=vm.runInNewContext('('+readFileSync(join(dir,'module.js'),'utf8')+')'),policy=vm.runInNewContext('('+readFileSync(join(dir,'policy.js'),'utf8')+')'),reports=[]
function game(players=1,config={}){
 const held=[new Set(),new Set()],scores=[0,0],events=[]
 const api={players,btn:(b,p=0)=>held[p].has(b),score:(n,p=0)=>scores[p]=n,addScore:(n,p=0)=>scores[p]+=n,getScore:(p=0)=>scores[p],win:p=>events.push(['win',p]),gameOver:()=>events.push(['gameOver']),sfx:s=>assert.ok(['hit','coin','shoot','select','die','powerup','explode','jump'].includes(s))}
 for(const name of ['cls','line','rect','rectfill','spr','pset','text','textCenter'])api[name]=()=>{}
 const instance=factory(config);instance.init(api)
 return{held,scores,events,api,instance,tick:()=>{instance.update(api,1/60);instance.draw(api)}}
}
function run(r,ticks=30000){const cache={};for(let f=0;f<ticks&&!r.events.length;f++){const keys=policy(r.instance.inspect(),f,cache);r.held.forEach((s,p)=>{s.clear();for(const k of keys[p]||[])s.add(k)});r.tick()}}
{
 const assets=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8'));
 for(const frame of Object.values(assets.frames)){
  assert.ok(frame.width>0&&frame.height>0&&frame.durationTicks>0);assert.equal(frame.pixels.length,frame.height);
  for(const row of frame.pixels){assert.equal(row.length,frame.width);assert.match(row,/^[.0-9a-f]+$/)}
  assert.ok(frame.anchor.x>=0&&frame.anchor.x<frame.width&&frame.anchor.y>=0&&frame.anchor.y<frame.height);
 }
 for(const animation of Object.values(assets.animations))for(const id of animation.frames)assert.ok(assets.frames[id]);
 reports.push({name:'palette-frames-and-animation-geometry',passed:true,frames:Object.keys(assets.frames).length});
}
for(const players of [1,2]){
 const r=game(players);run(r);const s=r.instance.inspect();console.log(JSON.stringify({players,phase:s.phase,clock:s.clock,boards:s.boards.map(b=>({lines:b.lines,alive:b.alive,score:b.score,stats:b.stats})),events:r.events}))
 assert.equal(r.events.length,1);assert.equal(r.events[0][0],'win');assert.ok(s.boards.some(b=>b.lines>=12));assert.ok(s.boards.every(b=>b.stats.hardDrops>0));if(players===2){assert.equal(s.boards[0].lines,s.boards[1].lines);assert.equal(JSON.stringify(s.boards[0].grid),JSON.stringify(s.boards[1].grid));assert.ok(s.boards[0].stats.garbageSent>0);assert.ok(s.boards[0].stats.garbageReceived>0)}
 for(const b of s.boards){assert.ok(b.stats.rotations>0);for(let i=0;i+7<=b.stats.sequence.length;i+=7)assert.equal(new Set(b.stats.sequence.slice(i,i+7)).size,7)}
 reports.push({name:`complete-target-line-game-${players}p`,passed:true,seconds:s.clock,boards:s.boards.map(b=>({lines:b.lines,score:b.score,stats:b.stats})),terminal:r.events[0]})
 r.instance.init(r.api);assert.equal(r.instance.inspect().boards[0].lines,0);assert.equal(r.scores[0],0)
}
{
 const r=game(2);r.held[1].add('left');r.tick();const s=r.instance.inspect();assert.equal(s.boards[0].piece.x,3);assert.equal(s.boards[1].piece.x,2)
 reports.push({name:'independent-player-two-board-input',passed:true})
}
{
 const r=game(1,{targetLines:0});for(let f=0;f<2000&&!r.events.length;f++){r.held[0].clear();if(f%2===0)r.held[0].add('b');r.tick()}
 assert.equal(r.events[0][0],'gameOver');assert.equal(r.instance.inspect().boards[0].alive,false)
 reports.push({name:'real-stacking-topout',passed:true})
}
{
 let r;for(let seed=1;seed<100;seed++){const candidate=game(1,{seed});if(candidate.instance.inspect().boards[0].piece.type===0){r=candidate;break}}
 assert.ok(r);r.held[0].add('a');r.tick();r.held[0].clear();r.held[0].add('left');for(let i=0;i<45;i++)r.tick();r.held[0].clear();r.held[0].add('a');r.tick()
 let b=r.instance.inspect().boards[0];assert.ok(b.stats.kicks>0);assert.ok(b.cells.every(([x])=>x>=0&&x<10))
 r.held[0].clear();r.held[0].add('down');for(let i=0;i<100&&!r.instance.inspect().boards[0].grounded;i++)r.tick();b=r.instance.inspect().boards[0];const id=b.piece.id
 for(let f=0;f<240&&r.instance.inspect().boards[0].piece.id===id;f++){r.held[0].clear();r.held[0].add(f%2?'left':'right');if(f%2===0)r.held[0].add('a');r.tick()}
 b=r.instance.inspect().boards[0];assert.notEqual(b.piece.id,id);assert.ok(b.stats.lockResets<=8);assert.ok(b.stats.softCells>0)
 reports.push({name:'wall-kicks-bounded-lock-resets-soft-drop',passed:true,stats:b.stats})
}
{
 const r=game(2),cache={};for(let f=0;f<3000&&!r.events.length;f++){
  const keys=policy(r.instance.inspect(),f,cache);r.held[0].clear();r.held[1].clear();if(f%2===0)r.held[0].add('b');for(const key of keys[1])r.held[1].add(key);r.tick();
 }
 assert.equal(r.events[0][0],'win');assert.equal(r.events[0][1],1);
 reports.push({name:'player-two-wins-when-opponent-tops-out',passed:true,seconds:r.instance.inspect().clock});
}
writeFileSync(join(dir,'behavior-results.json'),JSON.stringify({at:new Date().toISOString(),reports},null,2)+'\n');console.log(JSON.stringify(reports,null,2))
