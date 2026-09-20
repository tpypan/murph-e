import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export function createGame(id,players,config={}){
 const events=[],scores=Array(players).fill(0);let held=Array.from({length:players},()=>[]),previous=held.map(()=>[]),win=0,loss=0;
 const api={players,t:0,dt:1/60,score(n,p){if(p===undefined)scores.fill(n);else scores[p]=n},addScore(n,p){if(p===undefined)scores.forEach((s,i)=>scores[i]+=n);else scores[p]+=n},btn(b,p=0){return held[p]?.includes(b)||false},btnp(b,p=0){return (held[p]?.includes(b)&&!previous[p]?.includes(b))||false},win(){win++},gameOver(){loss++}};
 for(const name of ['sfx','shake','cls','rectfill','line','circfill','pset','spr','text','textCenter','rect','circ'])api[name]=()=>{};
 const factory=runInNewContext('('+readFileSync(resolve(root,'library/catalog',id,'module.js'),'utf8')+')');
 const game=factory({...config,onEvent(e){events.push({...e,time:api.t})}});game.init(api);
 return {game,api,events,scores,step(inputs=held){previous=held;held=inputs;api.t+=1/60;game.update(api,1/60);return JSON.parse(JSON.stringify(game.inspect()))},snapshot(){return JSON.parse(JSON.stringify(game.inspect()))},reset(){api.t=0;held=held.map(()=>[]);previous=held;events.length=0;win=loss=0;game.init(api)},result(){return {win,loss,scores:[...scores]}}};
}
// Portable observation-only controller: no writes to game state or hidden test flags.
export function arcadeBot(g,frame){
 const tile=p=>({x:Math.floor((p.x-8)/16),y:Math.floor((p.y-40)/16)});
 const clear=(x,y)=>{const c=tile({x,y});return c.y>=0&&c.y<11&&c.x>=0&&c.x<15&&g.map[c.y][c.x]===0};
 const open=(x,y)=>[-5,5].every(dx=>[-5,5].every(dy=>clear(x+dx,y+dy)));
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const see=(a,b)=>{const d=dist(a,b);for(let t=0;t<=d;t+=2)if(![-2,2].every(dx=>[-2,2].every(dy=>clear(a.x+(b.x-a.x)*t/d+dx,a.y+(b.y-a.y)*t/d+dy))))return false;return true};
 function toward(p,target){
  if(see(p,target)&&dist(p,target)<18)return target;
  const a=tile(p),b=tile(target),start=a.y*15+a.x,end=b.y*15+b.x,prev=Array(165).fill(-1),q=[start];prev[start]=start;
  for(let i=0;i<q.length&&prev[end]<0;i++){const k=q[i],x=k%15,y=Math.floor(k/15);for(const [dx,dy]of [[0,-1],[-1,0],[1,0],[0,1]]){const nx=x+dx,ny=y+dy,n=ny*15+nx;if(nx<0||nx>14||ny<0||ny>10||g.map[ny][nx]||prev[n]>=0)continue;prev[n]=k;q.push(n)}}
  if(start===end)return target;if(prev[end]<0)return p;let n=end;while(prev[n]!==start)n=prev[n];
  const waypoint={x:8+(n%15+.5)*16,y:40+(Math.floor(n/15)+.5)*16};
  // Center the current lane before turning at a corner.
  const cx=8+(a.x+.5)*16,cy=40+(a.y+.5)*16;
  if(n%15!==a.x&&Math.abs(p.y-cy)>2)return {x:p.x,y:cy};
  if(Math.floor(n/15)!==a.y&&Math.abs(p.x-cx)>2)return {x:cx,y:p.y};
  return waypoint;
 }
 return g.people.map(p=>{
  if(p.down)return [];
  if(g.phase==='upgrade')return frame%16<8?['a']:[];
  if(g.phase!=='play')return [];
  let target;
  const down=g.people.find(q=>q.down);
  if(down)target=dist(p,down)<17?p:down;
  else if(g.kind==='dungeon'&&!g.enemies.length&&!g.spawns.length){target=g.inventory.keys?{x:128,y:64}:g.exitOpen?{x:128,y:48}:g.loot.find(l=>l.type==='key')||p;}
  else {
   const near=[...g.enemies].sort((a,b)=>dist(p,a)-dist(p,b))[0];
   const loot=[...g.loot].filter(l=>l.type==='potion'&&p.hp<p.maxHp||l.type==='xp').sort((a,b)=>dist(p,a)-dist(p,b))[0];
   if(near&&see(p,near)&&dist(p,near)<34){
    const options=[[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]].map(([dx,dy])=>({x:p.x+dx*12,y:p.y+dy*12})).filter(q=>open(q.x,q.y));
    target=options.sort((a,b)=>Math.min(...g.enemies.map(e=>dist(b,e)))-Math.min(...g.enemies.map(e=>dist(a,e))))[0]||p;
   }else if(loot&&(!near||dist(p,loot)<dist(p,near)*.9))target=toward(p,loot);
   else if(near)target=see(p,near)&&dist(p,near)<95?p:toward(p,near);
   else target=p;
  }
  if(down||g.kind==='dungeon'&&!g.enemies.length&&!g.spawns.length)target=toward(p,target);
  const out=['a'],dx=target.x-p.x,dy=target.y-p.y;
  if(Math.abs(dx)>2)out.push(dx>0?'right':'left');if(Math.abs(dy)>2)out.push(dy>0?'down':'up');
  if((Math.abs(dx)>2||Math.abs(dy)>2)&&g.enemies.some(e=>dist(e,p)<25)&&frame%20===0)out.push('b');
  return out;
 });
}
