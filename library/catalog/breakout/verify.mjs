import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
const dir=dirname(fileURLToPath(import.meta.url))
const factory=vm.runInNewContext('('+readFileSync(join(dir,'module.js'),'utf8')+')')
const reports=[]
function game(players=1,config={}){
 const held=[new Set(),new Set()],scores=[0,0],events=[]
 const api={players,btn:(b,p=0)=>held[p].has(b),score:(n,p=0)=>scores[p]=n,addScore:(n,p=0)=>scores[p]+=n,getScore:(p=0)=>scores[p],win:p=>events.push(['win',p]),gameOver:()=>events.push(['gameOver']),
 sfx:s=>assert.ok(['hit','coin','shoot','select','die','powerup','explode','jump'].includes(s)),tone:(f,ms,w)=>assert.ok(['square','triangle','saw','noise'].includes(w))}
 for(const name of ['cls','line','rect','rectfill','spr','pset','text','textCenter'])api[name]=()=>{}
 const instance=factory(config);instance.init(api)
 return{instance,held,scores,events,api,tick:(dt=1/60)=>{instance.update(api,dt);instance.draw(api)}}
}
{
 const assets=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8'));
 for(const frame of Object.values(assets.frames)){
  assert.ok(frame.width>0&&frame.height>0&&frame.durationTicks>0);
  assert.equal(frame.pixels.length,frame.height);
  for(const row of frame.pixels){assert.equal(row.length,frame.width);assert.match(row,/^[.0-9a-f]+$/)}
  assert.ok(frame.anchor.x>=0&&frame.anchor.x<=frame.width&&frame.anchor.y>=0&&frame.anchor.y<=frame.height);
 }
 for(const animation of Object.values(assets.animations))for(const id of animation.frames)assert.ok(assets.frames[id]);
 reports.push({name:'complete-palette-frames-and-animation-metadata',passed:true,frames:Object.keys(assets.frames).length});
}
{
 const idle=game();for(let i=0;i<120;i++)idle.tick();assert.equal(idle.instance.inspect().phase,'serve');
 const fast=game(),precise=game();fast.held[0].add('left');precise.held[0].add('left');precise.held[0].add('b');
 fast.tick();precise.tick();assert.ok(fast.instance.inspect().paddles[0].x<precise.instance.inspect().paddles[0].x);
 reports.push({name:'explicit-launch-and-precision-modifier',passed:true});
}
function fold(x){const range=228,n=((x-14)%(range*2)+range*2)%(range*2);return 14+(n>range?range*2-n:n)}
function drive(r,ticks,dt=1/60){
 for(let f=0;f<ticks&&!r.events.length;f++){
  const s=r.instance.inspect(), targets=s.bricks.filter(b=>b.hp>0)
  for(let p=0;p<s.players;p++){
   r.held[p].clear();const paddle=s.paddles[p]
   if(s.phase==='serve'&&p===s.owner){if(f%10===0)r.held[p].add('a');continue}
   const incoming=s.balls.map(b=>({...b,landing:fold(b.x+b.vx*(188-b.y)/Math.max(b.vy,1)),time:(188-b.y)/Math.max(b.vy,1)})).filter(b=>b.vy>0&& (s.players===1 || (p===0?b.landing<=129:b.landing>=127))).sort((a,b)=>a.time-b.time)[0]
   let target=paddle.x
   if(incoming){
    const brick=targets[Math.floor(s.clock/4)%Math.max(1,targets.length)]
    const angle=brick?Math.atan2(brick.x+11-incoming.landing,188-brick.y):0.4
    const half=paddle.wide>0?26:s.players===2?16:20
    target=incoming.landing-clamp(angle/1.05,-0.88,0.88)*half
    if(incoming.time<0.12&&f%18===0)r.held[p].add('a')
   }
   if(Math.abs(target-paddle.x)>1.5)r.held[p].add(target>paddle.x?'right':'left')
  }
  r.tick(dt)
  const after=r.instance.inspect()
  for(const ball of after.balls) assert.ok(Number.isFinite(ball.x)&&Number.isFinite(ball.y),'finite swept motion')
 }
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
{
 const config={stages:[['12300000']],timeLimit:900},r=game(1,config)
 const assets=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8'))
 const transitions=new Map(r.instance.inspect().bricks.map(b=>[b.maxHp,[b.hp]]))
 const inputs=[],milestones=[{name:'fresh',frame:1}],previous=[new Set(),new Set()]
 let frameNumber=0,drawn=[]
 r.api.spr=(pixels,x,y)=>{if(pixels.length===9&&pixels[0].length===23)drawn.push({pixels,x,y})}
 const verifyDraw=()=>{
  for(const brick of r.instance.inspect().bricks){
   const sprite=drawn.find(s=>s.x===brick.x&&s.y===brick.y)
   if(brick.hp>0){
    assert.ok(sprite,`living ${brick.maxHp}-hit brick is drawn`)
    const damage=brick.maxHp-brick.hp
    assert.deepEqual(Array.from(sprite.pixels),assets.frames[`brick-${brick.color}-${3-damage}`].pixels,
     `${brick.maxHp}-hit brick with ${damage} accepted hits must show its actual damage`)
   }else assert.equal(sprite,undefined,'destroyed bricks are no longer drawn')
   const sequence=transitions.get(brick.maxHp)
   if(sequence.at(-1)!==brick.hp){sequence.push(brick.hp);milestones.push({name:`${brick.maxHp}hp-hit-${brick.maxHp-brick.hp}`,frame:frameNumber})}
  }
 }
 r.instance.draw(r.api);verifyDraw()
 const tick=r.tick
 r.tick=(dt)=>{
  for(let player=0;player<2;player++){
   for(const button of previous[player])if(!r.held[player].has(button))inputs.push({at:frameNumber,player,button,down:false})
   for(const button of r.held[player])if(!previous[player].has(button))inputs.push({at:frameNumber,player,button,down:true})
   previous[player]=new Set(r.held[player])
  }
  drawn=[];tick(dt);frameNumber++;verifyDraw()
 }
 drive(r,18000)
 assert.equal(r.events[0][0],'win')
 for(const durability of [1,2,3])assert.deepEqual(transitions.get(durability),Array.from({length:durability+1},(_,i)=>durability-i))
 assert.equal(r.instance.inspect().stats.brickHits,6)
 milestones.push({name:'complete',frame:frameNumber})
 writeFileSync(join(dir,'damage-replay.json'),JSON.stringify({config,inputs,milestones},null,2)+'\n')
 reports.push({name:'fresh-and-damaged-1-2-3-hit-brick-render-progression',passed:true,transitions:Object.fromEntries(transitions),frames:frameNumber})
}
{
 const r=game(2);r.held[0].add('left');r.tick();let s=r.instance.inspect();assert.ok(s.paddles[0].x<68);assert.equal(s.paddles[1].x,188)
 r.held[0].clear();r.held[1].add('right');r.held[1].add('a');for(let i=0;i<30;i++)r.tick();s=r.instance.inspect();assert.equal(s.phase,'play');assert.equal(s.owner,1)
 reports.push({name:'two-independent-halves-and-player-two-launch',passed:true})
}
for(const players of [1,2]){
 const r=game(players,{timeLimit:900,lives:3});drive(r,55000)
 const s=r.instance.inspect()
 assert.equal(r.events.length,1);assert.equal(r.events[0][0],'win');assert.equal(s.stats.stagesCleared,3)
 assert.ok(r.scores[0]>0); if(players===2) assert.ok(r.scores[1]>0);
 assert.ok(s.stats.brickHits>s.stats.destroyed);assert.ok(s.stats.pickups>0);assert.ok(s.stats.paddleHits[0]>0)
 if(players===2)assert.ok(s.stats.paddleHits[1]>0)
 reports.push({name:`three-authored-stages-${players}p`,passed:true,seconds:s.clock,stats:s.stats,scores:r.scores.slice(),terminal:r.events[0]})
 r.instance.init(r.api);assert.equal(r.instance.inspect().stage,0);assert.equal(r.scores[0],0)
}
{
 const r=game(1,{lives:1});for(let i=0;i<8000&&!r.events.length;i++){r.held[0].clear();if(i%20===0)r.held[0].add('a');r.held[0].add('left');r.tick()}
 assert.equal(r.events[0][0],'gameOver');assert.equal(r.instance.inspect().lives,0)
 reports.push({name:'miss-exhausts-life-and-ends',passed:true})
}
{
 const r=game(1,{stages:[['33333333']],timeLimit:900,lives:3});drive(r,18000,1/20)
 assert.equal(r.events[0][0],'win');assert.equal(r.instance.inspect().stats.brickHits,24)
 reports.push({name:'swept-thin-bricks-at-large-timestep',passed:true,stats:r.instance.inspect().stats})
}
const result={at:new Date().toISOString(),reports}
writeFileSync(join(dir,'behavior-results.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result,null,2))
