// TITLE: PACK THAT!
// GENRE: dodge
// CONTROLS: left right a b
// A grabs nearby cargo; A again loads it at its matching truck.
// Three bumps cost a life. A full jam at the 30-second bell does too.
// Fast routes sustain the chain. Survive three loading shifts to win.

const PACKER = [
  '....aaaa....',
  '...aaaaaa...',
  '..aaaaaaaa..',
  '...ffffff...',
  '...f1ff1f...',
  '...ffffff...',
  '....ffff....',
  '..ffccccff..',
  '.fffcaacfff.',
  '.f.fcccc.f..',
  '...ccccc....',
  '...ccccc....',
  '...11.11....',
  '..111.111...',
];
const CRATES = [
  ['888888888888','877888888878','878788888878','888788888888',
   '888788888888','888788888888','888788888888','888788888888',
   '888788888888','878888888878','877777777778','888888888888'],
  ['cccccccccccc','c77ccccccc7c','ccc7cc7ccccc','ccc7cc7ccccc',
   'ccc7cc7ccccc','ccc7cc7ccccc','ccc7cc7ccccc','ccc7cc7ccccc',
   'ccc7cc7ccccc','c7cccccccc7c','c7777777777c','cccccccccccc'],
  ['bbbbbbbbbbbb','b77bbbbbbb7b','bb7bb7bb7bbb','bb7bb7bb7bbb',
   'bb7bb7bb7bbb','bb7bb7bb7bbb','bb7bb7bb7bbb','bb7bb7bb7bbb',
   'bb7bb7bb7bbb','b7bbbbbbbb7b','b7777777777b','bbbbbbbbbbbb'],
];
const HEART = ['.8.8.','88888','88888','.888.','..8..'];
const CENTERS = [44,128,212];
const COLORS = [8,12,11];
let g;

function init(api) {
  g = {
    x:128, carry:-1, grabbed:0, chain:0, last:-99,
    crates:[{x:128,y:147,type:1}], lane:0, spawn:3.8,
    lives:3, bumps:0, jam:0, hurt:0, stop:0, cool:0,
    belt:0, shift:1, clock:30, reach:0, message:"A: GRAB THEN MATCH TRUCK",
    notice:4, ended:false,
  };
  api.score(0);
}

function say(text) {
  g.message = text;
  g.notice = 2;
}

function loseLife(api) {
  g.lives--;
  g.bumps = 0;
  g.chain = 0;
  g.carry = -1;
  g.hurt = 2;
  g.crates = [];
  api.sfx('die');
  api.flash(8,3);
  api.shake(10);
  if (g.lives <= 0) {
    g.ended = true;
    api.gameOver();
  }
}

function action(api) {
  g.reach = 0.22;
  if (g.carry >= 0) {
    if (Math.abs(g.x - CENTERS[g.carry]) < 24) {
      const quick = api.t - g.grabbed <= 3;
      g.chain = quick && api.t - g.last < 7 ? Math.min(5,g.chain+1) : 1;
      g.last = api.t;
      api.addScore(100*g.chain);
      g.jam = Math.max(0,g.jam-1);
      g.carry = -1;
      api.sfx('coin');
      api.flash(10,1);
      say("PACKED! " + g.chain + "X");
    } else {
      g.chain = 0;
      api.sfx('hit');
      say("MATCH COLOR + STRIPES");
    }
    return;
  }
  let best = -1;
  let distance = 39;
  for (let i=0;i<g.crates.length;i++) {
    const c = g.crates[i];
    const d = api.dist(g.x,176,c.x,c.y+6);
    if (d < distance) { distance=d; best=i; }
  }
  if (best >= 0) {
    g.carry = g.crates[best].type;
    g.crates.splice(best,1);
    g.grabbed = api.t;
    api.sfx('select');
    say("A AT MATCHING TRUCK");
  } else {
    g.chain = 0;
    api.sfx('select');
    say("GET CLOSER TO CARGO");
  }
}

function update(api,dt) {
  if (g.ended) return;
  g.hurt = Math.max(0,g.hurt-dt);
  g.stop = Math.max(0,g.stop-dt);
  g.cool = Math.max(0,g.cool-dt);
  g.reach = Math.max(0,g.reach-dt);
  g.notice = Math.max(0,g.notice-dt);
  if (api.btn('left')) g.x -= 118*dt;
  if (api.btn('right')) g.x += 118*dt;
  g.x = api.clamp(g.x,12,244);
  if (api.btnp('b') && g.cool===0) {
    g.stop=1; g.cool=8;
    api.sfx('powerup');
    say("BELTS FROZEN!");
  }
  if (api.btnp('a')) action(api);
  const speed = 24*Math.min(1.5,1+Math.max(0,api.t-10)/40);
  const recovery = api.t>10 && (api.t-10)%14>10;
  if (g.stop===0) g.belt += speed*dt;
  g.spawn -= dt;
  if (g.spawn<=0 && !recovery && g.crates.length<(api.t<10?1:3)) {
    const lane = api.t<10 ? 1 : g.lane++%3;
    g.crates.push({x:CENTERS[lane],y:62,type:api.rndi(0,2)});
    g.spawn = api.t<10 ? 3.6 : 1.9;
  }
  for (const c of g.crates) {
    if (g.stop===0) c.y += speed*dt;
    if (api.t>3 && g.hurt===0 &&
        api.collide(g.x-5,174,10,12,c.x-6,c.y,12,12)) {
      c.y=230;
      g.bumps++;
      g.chain=0;
      g.hurt=1.2;
      api.sfx('hit');
      api.flash(8,3);
      api.shake(10);
      say("BUMP " + g.bumps + "/3");
      if (g.bumps===3) { loseLife(api); break; }
    } else if (c.y>190 && c.y<220) {
      c.y=230;
      g.jam=Math.min(6,g.jam+1);
      g.chain=0;
      api.sfx('hit');
      say("MISSED! JAM +1");
    }
  }
  g.crates=g.crates.filter(c=>c.y<220);
  if (g.ended) return;
  g.clock-=dt;
  if (g.clock<=0) {
    if (g.jam>=6) { say("JAMMED!"); loseLife(api); }
    else { api.sfx('powerup'); say("SHIFT CLEAR!"); }
    g.jam=0; g.clock=30; g.shift++;
    if (!g.ended && g.shift>3) { g.ended=true; api.win(); }
  }
}

function draw(api) {
  api.cls(1);
  api.rectfill(0,36,256,160,5);
  for (let i=0;i<3;i++) {
    const x=CENTERS[i];
    api.rectfill(x-22,59,44,133,0);
    api.rect(x-24,58,48,135,6);
    for (let j=0;j<10;j++) {
      const y=60+(j*14+g.belt%14)%130;
      api.line(x-20,y,x+20,y,5);
    }
    api.text("V",x-4,44,g.stop>0?12:10);
    api.rectfill(x-30,196,51,19,COLORS[i]);
    api.rectfill(x+21,201,12,14,COLORS[i]);
    api.rectfill(x+23,202,8,6,7);
    api.circfill(x-20,216,4,0);
    api.circfill(x+23,216,4,0);
    api.spr(CRATES[i],x-6,199);
    if (g.carry===i) api.rect(x-32,194,68,25,10);
  }
  api.line(0,190,255,190,10);
  for (const c of g.crates) api.spr(CRATES[c.type],c.x-6,c.y);
  if (g.reach>0) api.circ(g.x,176,38,7);
  if (g.hurt===0 || api.frame%8<4) {
    api.spr(PACKER,g.x-6,172);
    if (g.carry>=0) api.spr(CRATES[g.carry],g.x-6,158);
  }
  for (let i=0;i<g.lives;i++) api.spr(HEART,5+i*8,16);
  api.text("JAM",36,16,7);
  for (let i=0;i<6;i++) api.rectfill(62+i*7,16,5,7,i<g.jam?8:5);
  api.text("T"+Math.ceil(g.clock),111,16,10);
  api.text("B:"+ (g.cool>0?Math.ceil(g.cool):"OK"),157,16,12);
  api.text("X"+g.chain,214,16,7);
  api.textCenter(g.notice>0?g.message:"L/R MOVE  A PACK  B FREEZE",27,7);
  for (let i=0;i<3;i++) api.circfill(9+i*9,182,2,i<g.bumps?8:6);
}
