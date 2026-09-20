import assert from 'node:assert/strict'
import{readFileSync,writeFileSync}from'node:fs'
import{dirname,join}from'node:path'
import{fileURLToPath}from'node:url'
const dir=dirname(fileURLToPath(import.meta.url)),factory=new Function('return ('+readFileSync(join(dir,'module.js'),'utf8')+')')(),results=[];
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name)}catch(e){results.push({name,ok:false,error:e.message});console.log('FAIL '+name+' '+e.message)}}
function run(config={}){const held=[new Set(),new Set()],scores=[0,0],events=[],hooks=[];
 const api={players:config.apiPlayers??config.players??1,btn:(b,p=0)=>held[p].has(b),btnp:()=>false,score:(n,p=0)=>scores[p]=n,addScore:(n,p=0)=>scores[p]+=n,getScore:(p=0)=>scores[p],sfx:()=>{},tone:()=>{},win:p=>events.push({type:'win',p}),gameOver:()=>events.push({type:'gameOver'}),textWidth:s=>String(s).length*8};
 for(const k of['cls','pset','line','rect','rectfill','circ','circfill','spr','text','textCenter'])api[k]=()=>{};
 const g=factory({...config,onFloor:(e,api)=>{hooks.push(e);config.onFloor?.(e,api)}});g.init(api);
 return{g,api,held,scores,events,hooks,step(n=1){for(let i=0;i<n;i++)g.update(api,1/60)}};
}
function control(r){const st=r.g.inspect();for(const p of st.people){const h=r.held[p.id];h.clear();if(p.dead||p.lives<=0)continue;
 const target=p.floor===4?st.goal.x:st.ladders.find(l=>l.bottom===p.floor&&l.main).x;
 let direction=Math.abs(p.x-target)>2?Math.sign(target-p.x):0;
 if(p.ladder!==null){const l=st.ladders[p.ladder];const upper=st.floors[l.top],topY=upper.y+(l.x-128)*upper.slope;const blocked=st.barrels.some(b=>b.floor===l.top&&Math.abs(b.x-p.x)<18&&p.y<topY+21);if(!blocked)h.add('up');}
 else if(Math.abs(p.x-target)<3&&p.floor<4)h.add('up');
 else {
  // Following a faster-stage barrel safely is preferable to attempting an impossible same-direction overtake.
  const ahead=st.barrels.some(b=>b.floor===p.floor&&b.mode==='roll'&&b.dir===direction&&(b.x-p.x)*direction>0&&(b.x-p.x)*direction<23);
  if(ahead)direction=0;
  if(direction>0)h.add('right');if(direction<0)h.add('left');
 }
 const danger=st.barrels.some(b=>{if(b.floor!==p.floor||Math.abs(b.y-(p.y-6))>12)return false;const relative=direction*72-b.dir*b.speed;const time=(b.x-p.x)/relative;return Math.abs(relative)>30&&time>0&&time<0.33;});
 if((danger||!p.grounded)&&p.ladder===null)h.add('a');
}}
function auto(r,frames){for(let i=0;i<frames;i++){control(r);r.step();if(['won','lost'].includes(r.g.inspect().phase))break}}
test('complete original animation sets, frame timing, anchors and boxes',()=>{const art=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8'));let count=0;for(const set of Object.values(art.sets)){for(const frame of Object.values(set.frames)){count++;assert.equal(frame.pixels.length,set.height);for(const row of frame.pixels){assert.equal(row.length,set.width);assert.match(row,/^[0-9a-f.]+$/)}assert.ok(frame.durationMs>0);assert.ok(frame.anchor.x<=set.width&&frame.anchor.y<=set.height)}for(const clip of Object.values(set.animations))for(const key of clip.frames)assert.ok(set.frames[key])}assert.ok(count>=30)});
test('walk input immediately moves only the selected player',()=>{const r=run({players:2});const start=r.g.inspect().people;r.held[1].add('right');r.step(30);const after=r.g.inspect().people;assert.equal(after[0].x,start[0].x);assert.ok(after[1].x>start[1].x+25);assert.equal(after[1].grounded,true)});
test('climbing requires an aligned valid ladder, with floor exit and award',()=>{const r=run();r.held[0].add('up');r.step(60);assert.equal(r.g.inspect().people[0].floor,0);assert.equal(r.g.inspect().people[0].ladder,null);r.held[0].clear();r.held[0].add('right');r.step(143);r.held[0].clear();r.held[0].add('up');r.step(70);const p=r.g.inspect().people[0];assert.equal(p.floor,1);assert.equal(p.ladder,null);assert.ok(p.score>=100)});
test('jump has bounded measured apex, returns to girder, and tap is shorter',()=>{function jump(hold){const r=run();const ground=r.g.inspect().people[0].y;r.held[0].add('a');let min=ground;for(let i=0;i<65;i++){if(i===hold)r.held[0].delete('a');r.step();min=Math.min(min,r.g.inspect().people[0].y)}const p=r.g.inspect().people[0];assert.equal(p.grounded,true);assert.ok(Math.abs(p.y-ground)<0.1);return ground-min}const full=jump(60),tap=jump(3);assert.ok(full>26&&full<29);assert.ok(tap<full-5)});
test('barrels telegraph, roll both directions, fall at edges and choose ladders',()=>{const r=run({lives:6,timeLimit:240});let dirs=new Set(),fall=false;for(let i=0;i<2600;i++){r.step();for(const b of r.g.inspect().barrels){dirs.add(b.dir);if(b.mode==='fall')fall=true;assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y))}}const s=r.g.inspect();assert.ok(s.stats.spawned>8);assert.ok(s.stats.edgeDrops>0);assert.ok(s.stats.ladderDrops>0);assert.equal(dirs.size,2);assert.ok(fall)});
test('jump-over award is issued once per actual barrel, not once per overlap frame',()=>{const r=run({stages:1,lives:6});for(let i=0;i<1500;i++){control(r);r.step();if(r.g.inspect().people[0].floor===4&&r.g.inspect().people[0].grounded)break;}
 let awarded=null;for(let i=0;i<500;i++){const st=r.g.inspect(),p=st.people[0],h=r.held[0];h.clear();h.add('left');const b=st.barrels.filter(b=>b.floor===4&&b.x<p.x+8).sort((a,b)=>b.x-a.x)[0];if((b&&Math.abs(b.x-p.x)<24)||!p.grounded)h.add('a');r.step();const after=r.g.inspect();awarded=after.barrels.find(b=>b.jumped&1);if(awarded)break;}
 assert.ok(awarded,'must physically clear a rolling barrel');const old=r.g.inspect().stats.jumpAwards;r.held[0].clear();r.held[0].add('a');r.step(12);assert.equal(r.g.inspect().stats.jumpAwards,old);assert.ok(r.g.inspect().barrels.find(b=>b.id===awarded.id).jumped&1);
});
test('hazard collision consumes lives once, respawns safely, and eventually loses',()=>{const r=run({lives:1,timeLimit:30});r.step(2100);assert.equal(r.g.inspect().phase,'lost');assert.equal(r.events.length,1);assert.equal(r.events[0].type,'gameOver');assert.equal(r.g.inspect().stats.hits,1)});
test('full real-input climb rescues and transitions through all layouts to win',()=>{const r=run({stages:3,lives:3,timeLimit:120});auto(r,24000);const st=r.g.inspect();assert.equal(st.phase,'won');assert.equal(st.stats.rescues,3);assert.equal(r.events.length,1);assert.equal(r.events[0].type,'win');assert.ok(r.scores[0]>6000);assert.ok(r.hooks.some(h=>h.floor===4));assert.ok(st.stats.spawned>3)});
test('co-op input can clear the whole tower with the other player idle',()=>{const r=run({players:2,stages:1,lives:6});for(let i=0;i<10000;i++){control(r);r.held[0].clear();r.step();if(['won','lost'].includes(r.g.inspect().phase))break}assert.equal(r.g.inspect().phase,'won');assert.equal(r.events[0].p,undefined);assert.ok(r.scores[0]>=1000&&r.scores[1]>=1000);assert.equal(r.g.inspect().people[0].checkpoint,0)});
test('custom objectives gate rescue, art validates, chosen players and reset remain authoritative',()=>{
 let allowed=false;const r=run({stages:1,lives:6,canRescue:()=>allowed});auto(r,1500);assert.equal(r.g.inspect().stats.rescues,0);allowed=true;auto(r,600);assert.equal(r.g.inspect().phase,'won');r.g.init(r.api);assert.equal(r.g.inspect().stage,1);assert.equal(r.g.inspect().stats.rescues,0);assert.equal(r.scores[0],0);
 assert.equal(run({players:2,apiPlayers:1}).g.inspect().people.length,1);assert.equal(run({players:1,apiPlayers:2}).g.inspect().people.length,2);
 assert.throws(()=>run({avatars:[{sprites:{width:16,height:20,frames:{},animations:{}}}]}),/missing animation/);
 const art=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8'));const custom=run({avatars:[{sprites:art.sets.worker}],targetSprites:art.sets.cat});custom.g.draw(custom.api);
});
test('avatar fit rejects the generated 28x44 shape and preserves a separate target limit',()=>{
 const art=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8'));
 function pad(source,width,height){
  const set=JSON.parse(JSON.stringify(source));
  const left=Math.floor((width-source.width)/2),top=height-source.height;
  set.width=width;set.height=height;
  for(const frame of Object.values(set.frames)){
   frame.pixels=[...Array.from({length:top},()=>'.'.repeat(width)),...frame.pixels.map(row=>'.'.repeat(left)+row+'.'.repeat(width-left-source.width))];
   frame.anchor={x:Math.floor(width/2),y:height};
  }
  return set;
 }
 const oversized=pad(art.sets.worker,28,44);
 assert.throws(()=>run({avatars:[{sprites:oversized}]}),/avatar sprite canvas must be 1-24/);
 assert.throws(()=>run({players:2,avatars:[{sprites:art.sets.worker},{sprites:oversized}]}),/avatar sprite canvas must be 1-24/);
 const padded=pad(art.sets.worker,24,24),tallTarget=pad(art.sets.cat,40,40);
 const valid=run({players:2,avatars:[{sprites:padded},{sprites:art.sets.worker}],targetSprites:tallTarget});valid.g.draw(valid.api);
 const tallPixels=JSON.parse(JSON.stringify(padded));tallPixels.frames["idle-0"].pixels[0]='............a...........';
 assert.throws(()=>run({avatars:[{sprites:tallPixels}]}),/must fit 20px high and 20px wide/);
 const widePixels=JSON.parse(JSON.stringify(padded));widePixels.frames["idle-0"].pixels[12]='a.......................';
 assert.throws(()=>run({avatars:[{sprites:widePixels}]}),/must fit 20px high and 20px wide/);
 const movedFeet=JSON.parse(JSON.stringify(padded));movedFeet.frames["idle-0"].anchor.y=23;
 assert.throws(()=>run({avatars:[{sprites:movedFeet}]}),/same bottom-center foot anchor/);
 assert.throws(()=>run({targetSprites:pad(art.sets.cat,49,49)}),/target sprite canvas must be 1-48/);
});
test('source palettes reach renderer unchanged and custom rescue identity survives full play',()=>{
 const art=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8'));
 const exact=structuredClone(art.sets.worker),palette=Array.from({length:16},(_,i)=>'#'+(i*110011).toString(16).padStart(6,'0'));
 for(const f of Object.values(exact.frames))f.palette=palette;
 const r=run({avatars:[{sprites:exact}],art:{gorilla:art.sets.gorilla,barrel:art.sets.barrel,fire:art.sets.fire},rescueText:'PAULINE RESCUED!',cage:false,stages:1});
 const draws=[],labels=[];r.api.spr=(...args)=>draws.push(args);r.api.text=t=>labels.push(t);r.step(12);r.g.draw(r.api);
 assert.ok(draws.some(args=>args[5]===palette),'frame palette forwarded without clothing recolor');
 for(let i=0;i<3000&&r.g.inspect().phase!=='rescue';i++){control(r);r.step()}
 assert.equal(r.g.inspect().phase,'rescue');r.g.draw(r.api);assert.ok(labels.includes('PAULINE RESCUED!'));assert.ok(!labels.includes('CAT RESCUED!'));
 const bad=structuredClone(exact);bad.frames['idle-0'].palette=['#000000'];assert.throws(()=>run({avatars:[{sprites:bad}]}),/Invalid climber sprite palette/);
 assert.throws(()=>run({art:{barrel:{...art.sets.barrel,width:17}}}),/barrel sprite canvas/);
});
test('seeded hazard paths replay and inspect does not expose mutable state',()=>{const a=run(),b=run();auto(a,600);auto(b,600);assert.deepEqual(a.g.inspect(),b.g.inspect());const state=a.g.inspect();state.people[0].x=999;state.ladders[0].x=999;assert.notEqual(a.g.inspect().people[0].x,999);assert.notEqual(a.g.inspect().ladders[0].x,999)});
writeFileSync(join(dir,'behavior-results.json'),JSON.stringify({at:new Date().toISOString(),results},null,2)+'\n');if(results.some(r=>!r.ok))process.exitCode=1;
