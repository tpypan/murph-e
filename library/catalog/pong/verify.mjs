import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
const dir = dirname(fileURLToPath(import.meta.url))
const factory = vm.runInNewContext('(' + readFileSync(join(dir, 'module.js'), 'utf8') + ')')
const reports = []
function game(players = 1, config = {}) {
  const held = [new Set(), new Set()], scores = [0, 0], events = []
  const api = { players, btn: (b, p = 0) => held[p].has(b), score: (n, p = 0) => scores[p] = n,
    addScore: (n, p = 0) => scores[p] += n, getScore: (p = 0) => scores[p],
    sfx: s => assert.ok(['hit','coin','shoot','select','die','powerup','explode','jump'].includes(s)),
    tone: (f, ms, wave) => assert.ok(['square','triangle','saw','noise'].includes(wave)),
    win: p => events.push(['win', p]), gameOver: () => events.push(['gameOver']) }
  for (const name of ['cls','line','rect','rectfill','circ','spr','pset','text','textCenter']) api[name] = () => {}
  const instance = factory(config); instance.init(api)
  return { instance, held, scores, events, api, tick: (dt = 1/60) => { instance.update(api, dt); instance.draw(api) } }
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
 const fast=game(),precise=game();fast.held[0].add('up');precise.held[0].add('up');precise.held[0].add('b');
 fast.tick();precise.tick();assert.ok(fast.instance.inspect().paddles[0].y<precise.instance.inspect().paddles[0].y);
 reports.push({name:'explicit-launch-and-precision-modifier',passed:true});
}
function fold(y) { const range = 158, n = ((y - 38) % (range * 2) + range * 2) % (range * 2); return 38 + (n > range ? range * 2 - n : n) }
function drive(r, ticks, player = 0) {
  for (let f = 0; f < ticks && !r.events.length; f++) {
    const s = r.instance.inspect(), p = s.paddles[player], b = s.ball;
    r.held[0].clear(); r.held[1].clear()
    if (s.phase === 'serve') { if (f % 12 === 0) r.held[s.server < s.players ? s.server : player].add('a') }
    
    let target = b.y
    if (player ? b.vx > 0 : b.vx < 0) target = fold(b.y + b.vy * (((player ? 235 : 21) - b.x) / b.vx)) - (s.stats.hits[player] % 2 ? -7 : 7)
    if (Math.abs(target - p.y) > 2) r.held[player].add(target > p.y ? 'down' : 'up')
    if (s.phase === 'rally' && (player ? b.vx > 0 && b.x > 100 : b.vx < 0 && b.x < 155)) r.held[player].add('a')
    r.tick()
  }
}
{
  const r = game(2)
  r.held[0].add('up'); r.tick()
  let s = r.instance.inspect(); assert.ok(s.paddles[0].y < 116); assert.equal(s.paddles[1].y,116)
  r.held[0].clear(); r.held[1].add('down'); r.tick()
  s = r.instance.inspect(); assert.ok(s.paddles[1].y > 116)
  r.held[0].add('a'); for(let i=0;i<60;i++)r.tick()
  assert.equal(r.instance.inspect().phase,'rally'); assert.ok(r.instance.inspect().ball.vx !== 0)
  reports.push({name:'independent-input-and-queued-serve',passed:true})
}
for (const players of [1,2]) {
  const r = game(players, { difficulty:0.35 }); drive(r,14000)
  const s=r.instance.inspect()
  assert.equal(s.phase,'finished'); assert.equal(r.events.length,1)
  assert.equal(s.points[0],7); assert.ok(s.stats.hits[0] > 0); assert.ok(s.stats.powerHits[0] > 0)
  assert.ok(s.stats.wallHits > 0); assert.ok(s.ball.speed <= 255)
  reports.push({name:`complete-seven-point-match-${players}p`,passed:true,seconds:s.clock,points:s.points,stats:s.stats,terminal:r.events[0]})
  r.instance.init(r.api); assert.equal(r.instance.inspect().points[0],0); assert.equal(r.scores[0],0)
}
{
  const r = game(2); drive(r,14000,1); const s = r.instance.inspect();
  assert.equal(s.points[1],7); assert.equal(r.events[0][0],'win'); assert.equal(r.events[0][1],1);
  assert.ok(s.stats.powerHits[1]>0); assert.ok(r.scores[1]>0);
  reports.push({name:'player-two-can-win-full-match',passed:true,seconds:s.clock,points:s.points,stats:s.stats,terminal:r.events[0]})
}
{
  const r = game(1); for(let f=0;f<14000&&!r.events.length;f++){r.held[0].clear();r.held[0].add('up');if(f%12===0)r.held[0].add('a');r.tick()}
  assert.equal(r.events[0][0],'gameOver'); assert.equal(r.instance.inspect().points[1],7);
  reports.push({name:'cpu-win-produces-single-game-over',passed:true,seconds:r.instance.inspect().clock})
}
{
  const r=game(1,{timeLimit:30});drive(r,4000)
  assert.equal(r.events.length,1)
  reports.push({name:'bounded-time-terminal',passed:true,seconds:r.instance.inspect().clock})
}
const result={at:new Date().toISOString(),reports}
writeFileSync(join(dir,'behavior-results.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result,null,2))
