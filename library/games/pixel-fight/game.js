// TITLE: PIXEL FIGHT
// CONTROLS: LEFT RIGHT A B
// Three-step rival: advance, telegraphed punch, guarded retreat.
// Hearts contain four damage units. Ties at the bell are losses.
// Clean hits score 100; each three-hit chain awards 500 x multiplier.
const HERO = [
  '.....11111......',
  '....1111111.....',
  '....88888888....',
  '....ff7ffff.....',
  '....ffff1ff.....',
  '.....fffff......',
  '......fff.......',
  '...ccccccc......',
  '..cccc7cccc.ff..',
  '..fcc77cccccfff.',
  '..ffcccccc..ff..',
  '...fcccccc......',
  '....cccccc......',
  '....777777......',
  '....cccccc......',
  '....ccc.ccc.....',
  '....ccc.ccc.....',
  '...ccc...ccc....',
  '...ccc...ccc....',
  '...ccc...ccc....',
  '...fff...fff....',
  '..1111...1111...',
  '..1111...1111...',
  '................',
];
const RIVAL = [
  '.....99999......',
  '....9999999.....',
  '....9944999.....',
  '....ff7ffff.....',
  '....ffff1ff.....',
  '.....fffff......',
  '......fff.......',
  '...8888888......',
  '..888848888.66..',
  '..f884488888666.',
  '..ff888888..66..',
  '...f888888......',
  '....888888......',
  '....aaaaaa......',
  '....888888......',
  '....888.888.....',
  '....888.888.....',
  '...888...888....',
  '...888...888....',
  '...888...888....',
  '...fff...fff....',
  '..4444...4444...',
  '..4444...4444...',
  '................',
];
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..'];
let g;

function init(api) {
  g = {
    x: 94, ex: 127, hp: 12, ehp: 12,
    punch: 0, cooldown: 0, block: 0, blockCD: 0,
    hurt: 0, impact: 0, epunch: 0,
    step: 0, clock: 0, phase: 0,
    hits: 0, firstHit: -10, lastHit: -10, mult: 1,
    message: '', messageTime: 0, ended: false,
  };
  api.score(0);
}

function say(text) {
  g.message = text;
  g.messageTime = 0.85;
}

function cleanHit(api) {
  g.ehp--;
  g.impact = 0.16;
  api.sfx('hit');
  api.shake(3);
  api.addScore(100);
  if (api.t - g.firstHit > 2) {
    g.hits = 0;
    g.firstHit = api.t;
  }
  if (g.hits === 0) g.firstHit = api.t;
  g.hits++;
  g.lastHit = api.t;
  if (g.hits === 3) {
    api.addScore(500 * g.mult);
    say('3 HITS! +' + (500 * g.mult));
    g.mult = Math.min(3, g.mult + 1);
    g.hits = 0;
    api.sfx('powerup');
    api.flash(10, 1);
  } else say('CLEAN HIT!');
}

function enemyPunch(api) {
  g.epunch = 0.22;
  api.sfx('shoot');
  if (g.ex - g.x > 39 || g.hurt > 0) return;
  const guarded = g.block > 0 && api.btn('b');
  g.hp -= guarded ? 1 : 4;
  g.hurt = 0.55;
  g.x = Math.max(12, g.x - (guarded ? 3 : 10));
  say(guarded ? 'BLOCK! CHIP DAMAGE' : 'HIT! WATCH THE GLOVE');
  api.sfx('hit');
  api.flash(8, 3);
  api.shake(10);
}

function update(api, dt) {
  if (g.ended) return;
  g.phase = Math.min(2, Math.floor(api.t / 10));
  g.punch = Math.max(0, g.punch - dt);
  g.epunch = Math.max(0, g.epunch - dt);
  g.cooldown = Math.max(0, g.cooldown - dt);
  g.block = Math.max(0, g.block - dt);
  g.blockCD = Math.max(0, g.blockCD - dt);
  g.hurt = Math.max(0, g.hurt - dt);
  g.impact = Math.max(0, g.impact - dt);
  g.messageTime -= dt;
  if (api.t - g.lastHit > 2) {
    g.mult = 1;
    g.hits = 0;
  }
  if (!api.btn('b')) g.block = 0;
  if (api.btnp('b') && g.blockCD === 0) {
    g.block = 0.48;
    g.blockCD = 0.65;
    g.punch = 0;
    api.sfx('select');
  }
  const movement = (api.btn('right') ? 1 : 0) - (api.btn('left') ? 1 : 0);
  g.x = api.clamp(g.x + movement * (g.block > 0 ? 38 : 85) * dt, 12, g.ex - 19);

  // Opening sparring window: rival moves, but cannot hurt before 3 seconds.
  g.clock += dt;
  if (api.t < 3.4) {
    g.ex += Math.sin(api.t * 3) * dt * 3;
    g.clock = 0;
  } else if (g.step === 0) {
    g.ex = Math.max(g.x + 28, g.ex - 48 * dt);
    if (g.clock > 0.8) { g.step = 1; g.clock = 0; }
  } else if (g.step === 1) {
    const windup = 0.65 - g.phase * 0.12;
    if (g.clock >= windup) {
      enemyPunch(api);
      g.step = 2;
      g.clock = 0;
    }
  } else {
    // Guard first, then an explicit unguarded recovery opportunity.
    if (g.clock < 0.4) g.ex = Math.min(228, g.ex + 32 * dt);
    if (g.clock > 1.5) { g.step = 0; g.clock = 0; }
  }

  if (api.btnp('a') && !api.btn('b') && g.cooldown === 0) {
    g.punch = 0.2;
    g.cooldown = 0.32;
    api.sfx('shoot');
    if (g.ex - g.x <= 40) {
      if (g.step === 2 && g.clock < 0.4) {
        say('GUARDED! WAIT...');
        api.sfx('select');
      } else cleanHit(api);
    } else say('GET CLOSER');
  }
  if (g.hp <= 0 || g.ehp <= 0 || api.t >= 30) {
    g.ended = true;
    if (g.ehp <= 0 || (g.hp > 0 && g.hp > g.ehp)) {
      api.sfx('powerup');
      api.win();
    } else {
      api.sfx('die');
      api.gameOver();
    }
  }
}

function fighter(api, x, rival) {
  const punch = rival ? g.epunch : g.punch;
  const guard = rival ? g.step === 2 && g.clock < 0.4 : g.block > 0;
  const y = 156 + (punch > 0 ? 0 : Math.sin(api.t * 7) * 1.2);
  api.circfill(x + 8, 182, 10, 1);
  api.spr(rival ? RIVAL : HERO, x, y, rival);
  if (punch > 0) {
    api.rectfill(rival ? x - 14 : x + 12, y + 9, 17, 4, 15);
    api.rectfill(rival ? x - 18 : x + 26, y + 7, 7, 7, rival ? 6 : 8);
  }
  if (guard) {
    api.rectfill(rival ? x - 2 : x + 12, y + 3, 6, 12, rival ? 6 : 12);
    api.line(rival ? x - 5 : x + 21, y + 1, rival ? x - 5 : x + 21, y + 17, 7);
  }
}

function draw(api) {
  api.cls(1);
  for (let i = 0; i < 8; i++) {
    api.rectfill(i * 34, 66, 27, 65, 2);
    api.rectfill(i * 34 + 4, 72, 4, 8, 13);
  }
  api.line(0, 132, 255, 132, 13);
  api.line(0, 146, 255, 146, 5);
  api.rectfill(0, 182, 256, 42, 5);
  for (let i = 0; i < 9; i++) api.line(i * 32, 183, i * 40 - 32, 223, 6);
  api.line(0, 183, 255, 183, 7);
  for (let i = 0; i < 3; i++) {
    api.spr(HEART, 12 + i * 18, 19);
    api.spr(HEART, 196 + i * 18, 19);
    api.rectfill(12 + i * 18, 27, 12, 3, 2);
    api.rectfill(196 + i * 18, 27, 12, 3, 2);
    api.rectfill(12 + i * 18, 27, api.clamp(g.hp - i * 4, 0, 4) * 3, 3, 11);
    api.rectfill(196 + i * 18, 27, api.clamp(g.ehp - i * 4, 0, 4) * 3, 3, 9);
  }
  api.textCenter('' + Math.max(0, Math.ceil(30 - api.t)), 18, 7);
  api.textCenter(g.messageTime > 0 ? g.message : 'CHAIN X' + g.mult + '  ' + g.hits + '/3', 43, 10);
  const cue = api.t < 3.4 ? 'GET IN CLOSE' : g.step === 0 ? '1 APPROACH' :
    g.step === 1 ? '2 PUNCH!' : g.clock < 0.4 ? '3 GUARD' : 'RECOVER - ATTACK!';
  api.textCenter(cue, 101, g.step === 1 ? 9 : 7);
  if (g.hurt === 0 || api.frame % 6 < 3) fighter(api, g.x, false);
  fighter(api, g.ex, true);
  if (g.step === 1 && api.t >= 3.4) api.text('!', g.ex + 5, 138, 10);
  if (g.impact > 0) api.circ(g.ex + 2, 165, 8, 10);
  api.textCenter('LEFT/RIGHT MOVE', 195, 7);
  api.textCenter('A PUNCH  TAP B BLOCK', 208, 7);
}
