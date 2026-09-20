import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createGame,arcadeBot} from './expedition-driver.mjs';
const root=new URL('../',import.meta.url).pathname;
const hash=x=>createHash('sha256').update(x).digest('hex');
const buttons=['left','right','up','down','a','b'];
function invariants(s){
 assert.ok(s.bullets.length<=100&&s.particles.length<=96&&s.loot.length<=80&&s.enemies.length+s.spawns.length<=24);
 for(const p of s.people){assert.ok(p.hp>=0&&p.hp<=p.maxHp);if(p.down)assert.equal(p.hp,0);assert.ok(s.bullets.filter(b=>b.owner===p.id).length<=14);}
 for(const p of [...s.people,...s.enemies,...s.spawns,...s.loot]){
  const x=Math.floor((p.x-8)/16),y=Math.floor((p.y-40)/16);assert.equal(s.map[y]?.[x],0,`${s.kind} stage ${s.stage}: ${p.type||'person'} inside wall at ${p.x},${p.y}`);
 }
}
function scoreFromEvents(h){const expected=h.scores.map(()=>0);for(const e of h.events){if(e.type==='enemy-defeated')expected[e.player]+=e.enemy==='boss'?250:25;if(e.type==='pickup')expected[e.player]+=e.item==='xp'?5:e.item==='gem'?50:0;if(e.type==='stage-clear'||e.type==='victory')expected.forEach((v,i)=>expected[i]+=e.type==='victory'?500:100)}assert.deepEqual(h.scores,expected)}
for(const id of ['arena-survivor','dungeon-gauntlet']){
 const dir=resolve(root,'library/catalog',id,'verification');mkdirSync(dir,{recursive:true});const checks=[],runs=[];
 const check=(name,fn)=>{fn();checks.push({name,passed:true})};
 check('rejects invalid configuration',()=>{for(const c of [{difficulty:2},{stages:1},{seed:0},{seed:NaN},{playerHealth:2},{theme:'wat'},{network:true}])assert.throws(()=>createGame(id,1,c))});
 check('independent and simultaneous controls, fire and dash ownership',()=>{
  const h=createGame(id,2),a=h.snapshot();for(let f=0;f<20;f++)h.step([['left','a'],[]]);let s=h.snapshot();assert.ok(s.people[0].x<a.people[0].x);assert.equal(s.people[1].x,a.people[1].x);assert.ok(s.bullets.some(b=>b.owner===0));assert.ok(!s.bullets.some(b=>b.owner===1));
  h.reset();for(let f=0;f<20;f++)h.step([[],['right','a']]);s=h.snapshot();assert.equal(s.people[0].x,a.people[0].x);assert.ok(s.people[1].x>a.people[1].x);assert.ok(s.bullets.some(b=>b.owner===1));
  h.reset();s=h.step([['left','b'],['right','b']]);assert.ok(s.people[0].x<a.people[0].x&&s.people[1].x>a.people[1].x);assert.equal(s.events.dash,2);for(let f=0;f<30;f++)h.step([['b'],['b']]);assert.equal(h.snapshot().events.dash,2);h.step([[],[]]);h.step([['b'],['b']]);assert.equal(h.snapshot().events.dash,2);
 });
 check('snapshot is detached and draw cannot consume simulation randomness',()=>{const h=createGame(id,1),before=h.snapshot();const copy=h.snapshot();copy.people[0].hp=99;copy.map[0][0]=0;for(let i=0;i<20;i++)h.game.draw(h.api);assert.deepEqual(h.snapshot(),before)});
 for(const players of [1,2])for(const seed of [17,7,29]){
  check(`default full ${players}P match seed ${seed}, scoring, terminal and reset`,()=>{
   const config=seed===17?{}:{seed};const h=createGame(id,players,config);let s=h.snapshot(),previous=Array.from({length:players},()=>[]),inputs=[],milestones=[],frames=0,lastPhase='';
   const initial=s;
   while(frames<10810&&s.phase!=='won'&&s.phase!=='lost'){
    const held=arcadeBot(s,frames);for(let p=0;p<players;p++)for(const b of buttons)if(previous[p].includes(b)!==held[p].includes(b))inputs.push({at:frames,player:p,button:b,down:held[p].includes(b)});previous=held;
    s=h.step(held);frames++;invariants(s);
    if(s.phase!==lastPhase||frames===120||frames===900||s.events['door-unlocked']>(milestones.at(-1)?.doors||0)||s.enemies.some(e=>e.type==='boss')&&!milestones.some(m=>m.label==='boss')){const label=s.enemies.some(e=>e.type==='boss')?'boss':s.phase;milestones.push({frame:frames,label,phase:s.phase,stage:s.stage,doors:s.events['door-unlocked']||0});lastPhase=s.phase}
   }
   assert.equal(s.phase,'won',`${id} ${players}P seed ${seed}: ${JSON.stringify({phase:s.phase,stage:s.stage,people:s.people,enemies:s.enemies})}`);
   assert.equal(s.events['stage-clear'],s.stages);assert.equal(h.result().win,1);assert.equal(h.result().loss,0);scoreFromEvents(h);
   if(id==='dungeon-gauntlet'){assert.equal(s.events['key-collected'],s.stages);assert.equal(s.events['door-unlocked'],s.stages);assert.equal(s.inventory.keys,0)}else assert.ok(s.events.upgrade>0);
   for(const p of s.people)assert.ok(h.events.some(e=>e.type==='enemy-defeated'&&e.player===p.id),'each human contributes kills');
   const ending=h.snapshot();for(let f=0;f<120;f++)h.step(Array(players).fill(['a','b']));assert.deepEqual(h.snapshot(),ending);assert.equal(h.result().win,1);
   const replay={id,players,config,moduleHash:hash(readFileSync(resolve(dir,'../module.js'))),frames,inputs,expected:h.result(),final:s,milestones};
   if(seed===17)writeFileSync(resolve(dir,`${players}p-replay.json`),JSON.stringify(replay));
   runs.push({players,seed,seconds:Number(s.totalTime.toFixed(2)),scores:[...h.scores],events:s.events});h.reset();assert.deepEqual(h.snapshot(),initial);assert.deepEqual(h.scores,Array(players).fill(0));
  });
 }
 for(const players of [1,2])check(`idle ${players}P loss and terminal reset`,()=>{const h=createGame(id,players);let s=h.snapshot();for(let f=0;f<10810&&!['lost','won'].includes(s.phase);f++)s=h.step(Array(players).fill([]));assert.equal(s.phase,'lost');assert.ok(s.totalTime<180.02);assert.equal(h.result().loss,1);const ending=h.snapshot();for(let f=0;f<60;f++)h.step(Array(players).fill(['a']));assert.deepEqual(h.snapshot(),ending);assert.equal(h.result().loss,1);h.reset();assert.equal(h.snapshot().phase,'play');assert.equal(h.snapshot().totalTime,0)});
 check('deterministic replay with different draw counts',()=>{const a=createGame(id,2),b=createGame(id,2);for(let f=0;f<1200;f++){const input=arcadeBot(a.snapshot(),f);a.step(input);b.step(input);if(f%3===0)b.game.draw(b.api)}assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(a.result(),b.result())});
 check('downed teammate is revived through proximity with independent human control',()=>{
  const h=createGame(id,2,{playerHealth:3,difficulty:1});let s=h.snapshot(),downAt=-1;
  for(let f=0;f<1500&&!s.events.revive&&s.phase!=='lost';f++){
   const inputs=arcadeBot(s,f);
   if(downAt<0){inputs[0]=[];inputs[1]=[];const p=s.people[1],e=s.enemies.reduce((a,b)=>!a||Math.hypot(b.x-p.x,b.y-p.y)<Math.hypot(a.x-p.x,a.y-p.y)?b:a,null);if(e){if(Math.abs(e.x-p.x)>2)inputs[1].push(e.x>p.x?'right':'left');if(Math.abs(e.y-p.y)>2)inputs[1].push(e.y>p.y?'down':'up')}}
   s=h.step(inputs);invariants(s);if(s.people[1].down&&downAt<0)downAt=f;
  }
  assert.ok(downAt>=0);assert.equal(s.events.revive,1);assert.ok(!s.people[1].down&&s.people[1].hp>0);assert.equal(h.result().loss,0);
 });
 if(id==='dungeon-gauntlet')check('locked exit cannot be skipped and objective key survives 55 seconds',()=>{
  const h=createGame(id,1);let s=h.snapshot();for(let f=0;f<2400&&!s.keyDropped;f++)s=h.step(arcadeBot(s,f));assert.ok(s.keyDropped);assert.equal(s.inventory.keys,0);
  // The controller chooses the door without a key; it cannot mutate the world.
  for(let f=0;f<300;f++){const observation=structuredClone(s);observation.inventory.keys=1;s=h.step(arcadeBot(observation,f))}
  assert.equal(s.exitOpen,false);assert.equal(s.stage,1);assert.ok(s.people[0].y<80,'reached locked door');
  for(let f=0;f<3300;f++)s=h.step([[]]);assert.ok(s.loot.some(l=>l.type==='key'));assert.equal(s.events['door-unlocked'],undefined);
  for(let f=0;f<900&&!s.events['door-unlocked'];f++)s=h.step(arcadeBot(s,f));assert.equal(s.events['key-collected'],1);assert.equal(s.events['door-unlocked'],1);assert.equal(s.inventory.keys,0);
 });
 if(id==='arena-survivor')check('two humans choose different upgrades and unconfirmed choice times out',()=>{
  const h=createGame(id,2);let s=h.snapshot();for(let f=0;f<3000&&s.phase!=='upgrade';f++)s=h.step(arcadeBot(s,f));assert.equal(s.phase,'upgrade');
  h.step([['left'],['right']]);for(let f=0;f<15;f++)h.step([[],[]]);s=h.step([['a'],['a']]);assert.equal(s.phase,'play');assert.equal(s.people[0].vitality,1);assert.equal(s.people[1].haste,1);assert.equal(s.events.upgrade,2);
  for(let f=0;f<3000&&s.phase!=='upgrade';f++)s=h.step(arcadeBot(s,f));assert.equal(s.phase,'upgrade');const before=s.level;for(let f=0;f<421;f++)s=h.step([[],[]]);assert.equal(s.phase,'play');assert.equal(s.level,before+1);assert.equal(s.events.upgrade,4);
 });
 check('largest allowed match stays bounded and terminates with normal controls',()=>{
  const h=createGame(id,2,{stages:6,playerHealth:10,difficulty:1,seed:29});let s=h.snapshot();for(let f=0;f<10810&&!['won','lost'].includes(s.phase);f++){s=h.step(arcadeBot(s,f));invariants(s)}assert.ok(['won','lost'].includes(s.phase));assert.ok(s.totalTime<180.02);scoreFromEvents(h);
 });
 const result={passed:true,moduleHash:hash(readFileSync(resolve(dir,'../module.js'))),checks,runs};writeFileSync(resolve(dir,'behavior.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({id,checks:checks.length,runs}));
}
