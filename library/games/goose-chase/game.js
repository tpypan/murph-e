const GW = 19, GH = 15, TILE = 12, OX = 14, OY = 40;
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
const COLORS = [8, 14, 12, 9];
const CORNERS = [20, 36, 264, 248];
const GOOSE_SIDE = [
  '......777...',
  '.....77777..',
  '.....77.7999',
  '.....7777...',
  '..777777....',
  '.7777777....',
  '777ff777....',
  '.7fff777....',
  '..77777.....',
  '...77.......',
  '..99.99.....',
  '............'
];
const GOOSE_STEP = [
  '............',
  '......777...',
  '.....77777..',
  '.....77.7999',
  '..7777777...',
  '.7777777....',
  '777ff777....',
  '.7fff777....',
  '..77777.....',
  '...77.......',
  '.999..9.....',
  '............'
];
const GOOSE_UP = [
  '....999.....',
  '....777.....',
  '...77777....',
  '...70707....',
  '...77777....',
  '..7777777...',
  '.77f777f77..',
  '.7ff777ff7..',
  '..7777777...',
  '...77777....',
  '..99...99...',
  '............'
];
const GOOSE_DOWN = [
  '............',
  '...77777....',
  '..7777777...',
  '.77f777f77..',
  '.7ff777ff7..',
  '..7777777...',
  '...77777....',
  '...70707....',
  '...77977....',
  '....999.....',
  '..99...99...',
  '............'
];
const GOOSE_FLAP = [
  '7..........7',
  '77...777..77',
  '777.77777777',
  '.77777079999',
  '..77777777..',
  '...777777...',
  '..777ff777..',
  '..77ffff77..',
  '...777777...',
  '....7777....',
  '..999..999..',
  '............'
];
let floor, seeds, bread, goose, ghosts, remaining, lives, level;
let frightened, combo, grace, freeze, charges, recharge, honk;
let effects, ended, phase, phaseNotice, roundNotice, roundStart;

function cell(x, y) { return y * GW + x; }
function legal(x, y) {
  return x >= 0 && y >= 0 && x < GW && y < GH && floor[cell(x, y)];
}
function actor(x, y, d) {
  return { x:x, y:y, tx:x, ty:y, p:0, moving:false, d:d, want:d };
}
function position(a) {
  return {
    x: OX + (a.x + (a.tx - a.x) * a.p) * TILE + 6,
    y: OY + (a.y + (a.ty - a.y) * a.p) * TILE + 6
  };
}
function spawn(api, fresh) {
  goose = actor(1, 13, 0);
  grace = 120;
  frightened = 0;
  combo = 0;
  ghosts = [];
  for (let i = 0; i < 4; i++) {
    let g = actor(9, 7, i);
    g.id = i;
    g.wait = fresh ? 210 + i * 30 : 120 + i * 25;
    g.stun = 0;
    g.immune = false;
    ghosts.push(g);
  }
}
function build(api) {
  floor = new Array(GW * GH).fill(false);
  seeds = new Array(GW * GH).fill(false);
  bread = new Array(GW * GH).fill(false);
  let a = level % 2 ? 3 : 5;
  let b = level % 3 ? 15 : 13;
  for (let y = 1; y <= 13; y++) {
    for (let x = 1; x <= 17; x++) {
      floor[cell(x,y)] = y === 1 || y === 5 || y === 9 || y === 13 ||
        x === 1 || x === a || x === 9 || x === b || x === 17;
    }
  }
  for (let i = 0; i < 4; i++) bread[CORNERS[i]] = true;
  let candidates = [];
  for (let i = 0; i < floor.length; i++) {
    if (floor[i] && !bread[i] && i !== cell(2,13) && i !== cell(9,7))
      candidates.push(i);
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let v = candidates[i]; candidates[i] = candidates[j]; candidates[j] = v;
  }
  seeds[cell(2,13)] = true;
  for (let i = 0; i < 71; i++) seeds[candidates[i]] = true;
  remaining = 72;
  charges = 3;
  recharge = 0;
  honk = 0;
  freeze = 0;
  roundNotice = 100;
  roundStart = api.t;
  spawn(api, true);
}
function init(api) {
  lives = 3;
  level = 0;
  effects = [];
  ended = false;
  phase = 'CHASE';
  phaseNotice = 0;
  api.score(0);
  build(api);
}
function sparkle(x, y, color, text) {
  effects.push({x:x, y:y, c:color, text:text || '', t:36});
  if (effects.length > 24) effects.shift();
}
function target(g, api) {
  if (frightened > 0 && !g.immune) {
    let best = -1, result = CORNERS[0];
    for (let i = 0; i < 4; i++) {
      let n = CORNERS[i];
      let d = Math.abs(n % GW - goose.x) + Math.abs(Math.floor(n / GW) - goose.y);
      if (d > best) { best = d; result = n; }
    }
    return result;
  }
  if (phase === 'SCATTER') return CORNERS[g.id];
  if (g.id === 0) return cell(goose.x, goose.y);
  if (g.id === 1) {
    let x = goose.x, y = goose.y;
    for (let i = 0; i < 17; i++) {
      let nx = x + DX[goose.d], ny = y + DY[goose.d];
      if (!legal(nx, ny)) break;
      x = nx; y = ny;
      if (legal(x + DX[(goose.d+1)%4], y + DY[(goose.d+1)%4]) ||
          legal(x + DX[(goose.d+3)%4], y + DY[(goose.d+3)%4])) break;
    }
    return cell(x,y);
  }
  if (g.id === 2) {
    let x = goose.x < 9 ? 17 : 1;
    return cell(x, Math.floor(api.t / 5) % 2 ? 9 : 1);
  }
  if (goose.y >= 9) return cell(goose.x, goose.y);
  return cell(Math.floor(api.t / 4) % 2 ? 1 : 17, 13);
}
function ghostDirection(g, api) {
  let goal = target(g, api);
  let distance = new Array(GW * GH).fill(999);
  let queue = [goal];
  distance[goal] = 0;
  for (let q = 0; q < queue.length && q < GW * GH; q++) {
    let n = queue[q], x = n % GW, y = Math.floor(n / GW);
    for (let d = 0; d < 4; d++) {
      let nx = x + DX[d], ny = y + DY[d], k = cell(nx,ny);
      if (legal(nx,ny) && distance[k] === 999) {
        distance[k] = distance[n] + 1; queue.push(k);
      }
    }
  }
  let best = 10000, dir = g.d;
  for (let j = 0; j < 4; j++) {
    let d = (j + g.id + Math.floor(api.t / 3)) % 4;
    let x = g.x + DX[d], y = g.y + DY[d];
    if (!legal(x,y)) continue;
    let value = distance[cell(x,y)] + (d === (g.d+2)%4 ? 2 : 0);
    if (value < best) { best = value; dir = d; }
  }
  return dir;
}
function beginStep(a, d) {
  if (!legal(a.x + DX[d], a.y + DY[d])) return false;
  a.d = d; a.tx = a.x + DX[d]; a.ty = a.y + DY[d];
  a.p = 0; a.moving = true;
  return true;
}
function advance(a, speed) {
  if (!a.moving) return false;
  a.p += speed;
  if (a.p >= 1 - 0.000001) {
    a.x = a.tx; a.y = a.ty; a.p = 0; a.moving = false;
    return true;
  }
  return false;
}
function eat(api) {
  let n = cell(goose.x, goose.y), p = position(goose);
  if (seeds[n]) {
    seeds[n] = false;
    remaining--;
    api.addScore(10);
    api.sfx('coin');
    recharge++;
    if (recharge >= 12) {
      recharge = 0;
      if (charges < 3) { charges++; api.sfx('select'); sparkle(p.x,p.y,10,'+HONK'); }
    }
  }
  if (bread[n]) {
    bread[n] = false; frightened = 360; combo = 0;
    for (let g of ghosts) g.immune = false;
    api.sfx('powerup'); sparkle(p.x,p.y,7,'POWER');
  }
}
function update(api, dt) {
  if (ended) return;
  for (let e of effects) e.t--;
  effects = effects.filter(e => e.t > 0);
  if (honk > 0) honk--;
  if (roundNotice > 0) roundNotice--;
  if (phaseNotice > 0) phaseNotice--;
  let next = api.t < 12 ? 'CHASE' : ((api.t - 12) % 12 < 8 ? 'CHASE' : 'SCATTER');
  if (next !== phase) {
    phase = next; phaseNotice = 90;
    api.tone(phase === 'CHASE' ? 220 : 440, 100, 'triangle');
  }
  if (freeze > 0) {
    freeze--;
    if (freeze === 0) {
      if (lives <= 0) { ended = true; api.gameOver(); }
      else spawn(api, false);
    }
    return;
  }
  if (grace > 0) grace--;
  if (frightened > 0) frightened--;
  const names = ['right','down','left','up'];
  for (let d = 0; d < 4; d++) {
    if (api.btnp(names[d]) || api.btn(names[d])) goose.want = d;
  }
  if (goose.moving && goose.want === (goose.d+2)%4) {
    let x = goose.x, y = goose.y;
    goose.x = goose.tx; goose.y = goose.ty;
    goose.tx = x; goose.ty = y;
    goose.p = 1 - goose.p; goose.d = goose.want;
  }
  if (api.btnp('a') && charges > 0) {
    charges--; honk = 42;
    api.sfx('shoot');
    let p = position(goose);
    sparkle(p.x,p.y,7,'HONK!');
    for (let g of ghosts) {
      let q = position(g);
      if (g.wait <= 0 && !(frightened > 0 && !g.immune) &&
          Math.hypot(p.x-q.x,p.y-q.y) <= 54) g.stun = 42;
    }
  }
  if (!goose.moving) {
    if (!beginStep(goose, goose.want)) beginStep(goose, goose.d);
  }
  if (advance(goose, 1/7)) eat(api);
  for (let g of ghosts) {
    if (g.wait > 0) { g.wait--; continue; }
    if (g.stun > 0) { g.stun--; continue; }
    if (!g.moving) beginStep(g, ghostDirection(g,api));
    let speed = (1 + Math.min(0.20,level*0.08)) / 10;
    if (frightened > 0 && !g.immune) speed *= 0.72;
    advance(g,speed);
  }
  let p = position(goose);
  for (let g of ghosts) {
    if (g.wait > 0) continue;
    let q = position(g);
    if (Math.hypot(p.x-q.x,p.y-q.y) >= 8) continue;
    if (frightened > 0 && !g.immune) {
      let points = 200 * Math.pow(2,Math.min(combo,2));
      combo++; api.addScore(points); api.sfx('explode'); api.shake(3);
      sparkle(q.x,q.y,10,''+points);
      g.x = g.tx = 9; g.y = g.ty = 7; g.p = 0; g.moving = false;
      g.wait = 120; g.immune = true; g.stun = 0;
    } else if (grace <= 0) {
      lives--; freeze = 45; frightened = 0;
      api.sfx('die'); api.shake(9);
      sparkle(p.x,p.y,8,'');
      break;
    }
  }
  if (remaining === 0 && freeze === 0) {
    api.addScore(1000); api.sfx('powerup'); api.flash(7,2);
    level++; build(api);
    sparkle(128,112,10,'MAZE +1000');
  }
}
function drawGhost(api, g) {
  let p = position(g), x = p.x-6, y = p.y-6;
  let scared = frightened > 0 && !g.immune && g.wait <= 0;
  let c = scared ? (frightened < 120 && api.frame%20 < 7 ? 7 : 12) : COLORS[g.id];
  if (g.wait > 0) {
    api.pset(x+3,y+5,7); api.pset(x+8,y+5,7);
    return;
  }
  api.pset(x+5-DX[g.d]*9,y+7-DY[g.d]*9,COLORS[g.id]);
  api.rectfill(x+3,y,6,1,c);
  api.rectfill(x+1,y+1,10,3,c);
  api.rectfill(x,y+4,12,6,c);
  for (let j = 0; j < 3; j++)
    api.rectfill(x+j*4+(Math.floor(api.frame/9)%2),y+10,3,2,c);
  api.line(x+2,y+2,x+4,y+1,scared ? 13 : 15);
  let eye = phase === 'CHASE' ? 7 : 10;
  if (scared) {
    api.pset(x+3,y+4,7); api.pset(x+8,y+4,7);
    api.line(x+3,y+8,x+5,y+7,7);
    api.line(x+5,y+7,x+8,y+8,7);
  } else {
    api.rectfill(x+2,y+3,3,4,eye); api.rectfill(x+7,y+3,3,4,eye);
    api.pset(x+3+DX[g.d],y+5+DY[g.d],1);
    api.pset(x+8+DX[g.d],y+5+DY[g.d],1);
  }
  if (g.stun > 0) {
    api.line(x+2,y-3,x+9,y-3,10);
    api.pset(x+5,y-5,7);
  }
}
function draw(api) {
  api.cls(2);
  api.text('L',8,17,7);
  for (let i = 0; i < lives; i++) {
    api.circfill(24+i*10,21,3,7);
    api.pset(27+i*10,21,9);
  }
  api.text('H',62,17,10);
  for (let i = 0; i < 3; i++) {
    api.rect(75+i*7,18,5,6,i < charges ? 10 : 5);
    if (i < charges) api.rectfill(76+i*7,19,3,4,10);
  }
  api.text(''+remaining,104,17,10);
  api.text('R'+(level+1),137,17,6);
  api.text(frightened > 0 ? 'POWER' : phase,177,17,frightened > 0 ? 12 : phase === 'CHASE' ? 8 : 10);
  if (frightened > 0) api.rectfill(177,28,Math.ceil(64*frightened/360),2,12);
  else {
    let c = phase === 'CHASE' ? 8 : 10;
    api.line(189,30,222,30,c);
    let x = phase === 'CHASE' ? 222 : 189;
    let d = phase === 'CHASE' ? -1 : 1;
    api.line(x,30,x+d*4,27,c); api.line(x,30,x+d*4,33,c);
  }
  api.rect(OX-2,OY-2,GW*TILE+4,GH*TILE+4,5);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      let n = cell(x,y), px = OX+x*TILE, py = OY+y*TILE;
      if (!floor[n]) {
        api.rectfill(px,py,TILE,TILE,1);
        if (legal(x,y-1)) api.line(px+1,py,px+10,py,12);
        if (legal(x-1,y)) api.line(px,py+1,px,py+10,12);
        if (legal(x,y+1)) api.line(px+1,py+11,px+10,py+11,5);
        if ((x*7+y*3)%7 === 0) {
          api.pset(px+5,py+5,3); api.pset(px+6,py+4,3);
        }
      } else {
        if ((x+y*3)%8 === 0) api.pset(px+2,py+9,4);
        if (seeds[n]) {
          api.rectfill(px+5,py+5,2,3,10);
          api.pset(px+6,py+5,15);
        }
        if (bread[n]) {
          let bob = Math.floor(api.frame/18)%2;
          api.rectfill(px+3,py+3-bob,7,5,15);
          api.rectfill(px+4,py+2-bob,5,7,7);
          api.pset(px+5,py+4-bob,10);
          api.pset(px+8,py+6-bob,15);
        }
      }
    }
  }
  api.line(OX+9*TILE+2,OY+7*TILE+11,OX+9*TILE+9,OY+7*TILE+11,13);
  for (let g of ghosts) drawGhost(api,g);
  let p = position(goose), x = p.x-6, y = p.y-6;
  api.line(x+2,y+12,x+9,y+12,1);
  if (honk > 0) {
    let r = 8+(42-honk)*1.15;
    api.circ(p.x,p.y,r, honk > 20 ? 7 : 6);
  }
  if (freeze > 0) {
    api.spr(GOOSE_FLAP,x,y-2-(Math.floor(freeze/5)%2));
    for (let j = 0; j < 8; j++) {
      let a = j*Math.PI/4, r = 10+(45-freeze)%12;
      api.line(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,
        p.x+Math.cos(a)*(r+4),p.y+Math.sin(a)*(r+4),j%2 ? 10 : 8);
    }
  } else if (grace <= 0 || api.frame%10 < 7) {
    let walking = goose.moving && Math.floor(api.frame/4)%2;
    if (frightened > 0 && walking) {
      api.line(x-DX[goose.d]*4,y+8-DY[goose.d]*6,
        x-DX[goose.d]*9,y+8-DY[goose.d]*10,10);
      api.spr(GOOSE_FLAP,x,y,goose.d === 2);
    } else if (goose.d === 0 || goose.d === 2) {
      api.spr(walking ? GOOSE_STEP : GOOSE_SIDE,x,y,goose.d === 2);
    } else {
      api.spr(goose.d === 3 ? GOOSE_UP : GOOSE_DOWN,x,y-(walking ? 1 : 0));
      if (walking) api.pset(x+2,y+10,9);
    }
  }
  for (let e of effects) {
    if (e.text) {
      let w = e.text.length*8;
      api.text(e.text,Math.max(1,Math.min(255-w,e.x-w/2)),
        Math.max(35,e.y-14-(36-e.t)/3),e.c);
    } else api.circ(e.x,e.y,4+(36-e.t)/2,e.c);
  }
}
