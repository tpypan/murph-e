// TITLE: PAC-MATES
// GENRE: coop
// PLAYERS: 2
// CONTROLS: up down left right a b
// D-pad buffers turns. A spends a stored pellet; B pings a safe corridor.
// Each runner starts with one pellet. Maze pellets are stored, not auto-used.
// Clear the maze in 150 seconds. Three shared lives; bodies may overlap.
const MAZE = [
  '###################',
  '#o....#.....#....o#',
  '#.##.#.#.#.#.#.##.#',
  '#....#.......#....#',
  '###.#.##.##.#.#.###',
  '#...#.........#...#',
  '#.#...##.##...#.#.#',
  '#...#.........#...#',
  '###.#.##.##.#.#.###',
  '#....#.......#....#',
  '#.##.#.#.#.#.#.##.#',
  '#o....#.....#....o#',
  '###################'
];
const YELLOW = [
  '..aaaa..', '.aaaaaa.', 'aaa0aaaa', 'aaaaaa..',
  'aaaa....', 'aaaaaa..', '.aaaaaa.', '..aaaa..'
];
const BLUE = [
  '..cccc..', '.cccccc.', 'ccc0cccc', 'cccccc..',
  'cccc....', 'cccccc..', '.cccccc.', '..cccc..'
];
const GHOST = [
  '..eeee..', '.eeeeee.', 'e77ee77e', 'e07ee07e',
  'eeeeeeee', 'eeeeeeee', 'ee.ee.ee', 'e..ee..e'
];
const SCARED = [
  '..1111..', '.111111.', '11711711', '11111111',
  '11777711', '17111171', '11.11.11', '1..11..1'
];
const DIR = [[1,0],[0,1],[-1,0],[0,-1]];
const KEYS = ['right','down','left','up'];
const CORNERS = [[1,1],[17,1],[17,11],[1,11]];
let g;

function open(x, y) {
  return x >= 0 && x < 19 && y >= 0 && y < 13 && MAZE[y][x] !== '#';
}
function actor(x, y, d) {
  return {x:x, y:y, ox:x, oy:y, d:d, want:d, f:1, moving:false,
    bank:1, ping:0, cool:0, route:-1, dead:false};
}
function init(api) {
  g = {players:[actor(1,1,0),actor(17,11,2)], ghosts:[],
    dots:[], left:0, lives:3, power:0, chain:0, safe:3.5, over:false};
  for (let y=0; y<13; y++) for (let x=0; x<19; x++) {
    const n = open(x,y) ? (MAZE[y][x] === 'o' ? 2 : 1) : 0;
    g.dots.push(n);
    if (n) g.left++;
  }
  for (let i=0; i<4; i++) g.ghosts.push(actor(8+i%3,5+2*Math.floor(i/3),i));
  api.score(0);
}
function position(p) {
  return {x:p.ox+(p.x-p.ox)*p.f, y:p.oy+(p.y-p.oy)*p.f};
}
function travel(p, dt, speed) {
  p.f = Math.min(1,p.f+dt*speed);
}
function step(p, d) {
  if (!open(p.x+DIR[d][0],p.y+DIR[d][1])) return false;
  p.ox=p.x; p.oy=p.y;
  p.x+=DIR[d][0]; p.y+=DIR[d][1]; p.d=d; p.f=0;
  return true;
}
function collect(api,p) {
  const at=p.y*19+p.x, n=g.dots[at];
  if (!n) return;
  g.dots[at]=0; g.left--;
  api.addScore(n===2 ? 50 : 10);
  if (n===2) p.bank++;
  api.sfx(n===2 ? 'powerup' : 'coin');
  api.flash(10,1);
}
function ghostDirection(b, i, api) {
  const p=g.players[i%2];
  let tx=p.x, ty=p.y;
  if (i===1) { tx+=DIR[p.d][0]*3; ty+=DIR[p.d][1]*3; }
  if (i===2 || api.t%18<4) {
    const c=CORNERS[(Math.floor(api.t/5)+i)%4]; tx=c[0]; ty=c[1];
  }
  if (i===3) {
    const a=g.players[0], c=g.players[1];
    const q=Math.abs(b.x-a.x)+Math.abs(b.y-a.y)<Math.abs(b.x-c.x)+Math.abs(b.y-c.y)?a:c;
    tx=q.x; ty=q.y;
  }
  let best=-1, value=1e9;
  for (let d=0; d<4; d++) {
    const x=b.x+DIR[d][0], y=b.y+DIR[d][1];
    if (!open(x,y) || d===(b.d+2)%4) continue;
    let v=Math.abs(x-tx)+Math.abs(y-ty);
    if (g.power>0) v=-v;
    v+=api.rnd(.3);
    if (v<value) { value=v; best=d; }
  }
  return best<0 ? (b.d+2)%4 : best;
}
function ping(api,p) {
  let best=-1;
  for (let d=0; d<4; d++) {
    let x=p.x, y=p.y, value=0;
    for (let k=0; k<6; k++) {
      x+=DIR[d][0]; y+=DIR[d][1];
      if (!open(x,y)) break;
      value+=2+(g.dots[y*19+x]?1:0);
      for (const b of g.ghosts)
        if (!b.dead && Math.abs(x-b.x)+Math.abs(y-b.y)<3) value-=12;
    }
    if (value>best) { best=value; p.route=d; }
  }
  p.ping=1; p.cool=4; api.sfx('select');
}
function update(api,dt) {
  if (g.over) return;
  g.safe=Math.max(0,g.safe-dt);
  g.power=Math.max(0,g.power-dt);
  if (!g.power) {
    g.chain=0;
    for (const b of g.ghosts) b.dead=false;
  }
  for (let i=0; i<2; i++) {
    const p=g.players[i];
    p.ping=Math.max(0,p.ping-dt); p.cool=Math.max(0,p.cool-dt);
    for (let d=0; d<4; d++) if (api.btnp(KEYS[d],i) || api.btn(KEYS[d],i)) {
      p.want=d; p.moving=true;
    }
    if (api.btnp('a',i) && p.bank>0) {
      p.bank--; g.power=6; g.chain=0;
      api.sfx('powerup'); api.flash(10,1);
    }
    if (api.btnp('b',i) && !p.cool) ping(api,p);
    travel(p,dt,6);
    if (p.f===1) {
      collect(api,p);
      if (p.moving && !step(p,p.want)) step(p,p.d);
    }
  }
  for (let i=0; i<4; i++) {
    const b=g.ghosts[i];
    if (b.dead) continue;
    travel(b,dt,g.power>0 ? 3 : Math.min(5.1,3.5+api.t/65));
    if (b.f===1) step(b,ghostDirection(b,i,api));
    const bp=position(b);
    for (const p of g.players) {
      const pp=position(p);
      if (b.dead || Math.abs(pp.x-bp.x)+Math.abs(pp.y-bp.y)>.65) continue;
      if (g.power>0) {
        b.dead=true; api.addScore(200*Math.pow(2,Math.min(3,g.chain++)));
        api.sfx('hit'); api.shake(3);
      } else if (!g.safe) {
        g.lives--; g.safe=3; g.power=0;
        api.sfx('die'); api.flash(8,3); api.shake(10);
        g.players[0]=Object.assign(actor(1,1,0),{bank:g.players[0].bank});
        g.players[1]=Object.assign(actor(17,11,2),{bank:g.players[1].bank});
        break;
      }
    }
  }
  if (!g.lives || api.t>=150 || !g.left) {
    g.over=true;
    if (!g.left) { api.sfx('powerup'); api.win(); }
    else api.gameOver();
  }
}
function draw(api) {
  api.cls(1);
  api.text('A:POWER B:ROUTE',8,15,7);
  api.text('HP:'+g.lives,8,27,14);
  api.text(String(Math.max(0,Math.ceil(150-api.t))),216,27,7);
  for (let y=0; y<13; y++) for (let x=0; x<19; x++) {
    const px=14+x*12, py=40+y*12, n=g.dots[y*19+x];
    if (!open(x,y)) { api.rect(px+1,py+1,10,10,12); continue; }
    api.rectfill(px,py,12,12,0);
    if (n===1) api.rectfill(px+5,py+5,2,2,15);
    if (n===2) api.circfill(px+6,py+6,2+Math.floor(api.t*4)%2,10);
    for (const p of g.players) if (p.ping>0 && n && Math.abs(x-p.x)+Math.abs(y-p.y)<5)
      api.circ(px+6,py+6,4,11);
  }
  for (let i=0; i<2; i++) {
    const p=g.players[i], q=position(p), c=i===0?api.P1:api.P2;
    if (p.ping>0 && p.route>=0) {
      let x=p.x,y=p.y;
      for (let k=0;k<6;k++) {
        const nx=x+DIR[p.route][0],ny=y+DIR[p.route][1];
        if (!open(nx,ny)) break;
        api.line(20+x*12,46+y*12,20+nx*12,46+ny*12,11); x=nx;y=ny;
      }
    }
    api.spr(i===0?YELLOW:BLUE,16+q.x*12,42+q.y*12,p.d===2);
    api.line(17+q.x*12,51+q.y*12,22+q.x*12,51+q.y*12,c);
    if (g.safe>0) api.circ(20+q.x*12,46+q.y*12,6,7);
    api.text('P'+(i+1)+':'+p.bank,16+i*168,202,c);
  }
  for (const b of g.ghosts) if (!b.dead) {
    const q=position(b);
    api.spr(g.power>0?SCARED:GHOST,16+q.x*12,42+q.y*12);
  }
  if (g.power>0) api.rectfill(96,204,g.power*10,4,10);
}
