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
function run(r,ticks=18000){const cache={};for(let f=0;f<ticks&&!r.events.length;f++){const keys=policy(r.instance.inspect(),f,cache);r.held.forEach((s,p)=>{s.clear();for(const k of keys[p]||[])s.add(k)});r.tick();for(const b of r.instance.inspect().batteries)assert.ok(b.ammo>=0)} }
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
 const r=game(players);run(r);const s=r.instance.inspect();console.log(JSON.stringify({players,phase:s.phase,clock:s.clock,cities:s.cities,stats:s.stats,events:r.events}))
 assert.equal(r.events.length,1);assert.equal(r.events[0][0],'win');assert.equal(s.stats.wavesCleared,4);assert.ok(s.stats.interceptions>0);assert.ok(s.stats.chainKills>0);assert.ok(s.stats.shotsByPlayer[0]>0)
 if(players===2){assert.ok(s.stats.shotsByPlayer[1]>0);assert.ok(s.stats.killsByPlayer[1]>0)}
 assert.ok(s.cities.some(c=>c.alive));assert.equal(s.stats.ammoSpent,s.stats.shots)
 reports.push({name:`complete-four-wave-defense-${players}p`,passed:true,seconds:s.clock,cities:s.cities.filter(c=>c.alive).length,stats:s.stats,scores:r.scores.slice(),terminal:r.events[0]})
 r.instance.init(r.api);assert.equal(r.instance.inspect().wave,0);assert.equal(r.scores[0],0);assert.equal(r.instance.inspect().stats.shots,0)
}
{
 const r=game(2);r.held[1].add('right');r.held[1].add('b');r.tick();const s=r.instance.inspect();assert.equal(s.cursors[0].x,79);assert.ok(s.cursors[1].x>177);assert.equal(s.cursors[1].battery,0)
 reports.push({name:'independent-cursor-and-battery-selection',passed:true})
}
{
 const r=game();r.held[0].add('a');for(let f=0;f<360;f++)r.tick();let s=r.instance.inspect();assert.equal(s.batteries[1].ammo,0);assert.equal(s.stats.shots,14)
 const before=s.stats.shots;for(let f=0;f<30;f++)r.tick();assert.equal(r.instance.inspect().stats.shots,before)
 r.held[0].add('b');r.tick();s=r.instance.inspect();assert.equal(s.cursors[0].battery,2);assert.equal(s.stats.shots,before+1)
 reports.push({name:'finite-ammo-and-selected-launch-station',passed:true})
}
{
 const r=game(1,{waves:8});for(let f=0;f<30000&&!r.events.length;f++)r.tick();const s=r.instance.inspect();assert.equal(r.events[0][0],'gameOver');assert.equal(s.cities.filter(c=>c.alive).length,0);assert.ok(s.stats.impacts>0);assert.ok(s.stats.splits>0);assert.ok(s.stats.restored>0)
 reports.push({name:'undefended-cities-are-lost-and-end-run',passed:true,seconds:s.clock,stats:s.stats})
}
{
 const r=game(),radii=[];let id=null,shot=false;
 for(let f=0;f<240;f++){
  r.held[0].clear();if(!shot&&r.instance.inspect().phase==='wave'){r.held[0].add('a');shot=true}r.tick();
  const e=r.instance.inspect().explosions.find(e=>!e.chain&&(id===null||e.id===id));if(e){id=e.id;if(radii.at(-1)!==e.radius)radii.push(e.radius)}
 }
 assert.equal(JSON.stringify(radii),JSON.stringify([3,7,12,18,24,18,12,7,3]));
 reports.push({name:'actual-blast-expands-holds-and-contracts',passed:true,radii});
}
writeFileSync(join(dir,'behavior-results.json'),JSON.stringify({at:new Date().toISOString(),reports},null,2)+'\n');console.log(JSON.stringify(reports,null,2))
