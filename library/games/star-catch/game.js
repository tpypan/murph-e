// TITLE: STAR CATCH
// GENRE: dodge
// CONTROLS: left right a
// Catch three consecutive gems to start six seconds of capped 2X scoring.
// Missing a gem or taking damage resets the chain and bonus.
// A arms a held shield permanently until its one safe hit is consumed.
const STAR = [
  '.......a.......',
  '......aaa......',
  '......a7a......',
  '.....aa7aa.....',
  'aaaaaaaaaaaaaaa',
  '.aaaaaaaaaaaaa.',
  '..aaa1aaa1aaa..',
  '...aaaaaaaaa...',
  '...aaaa1aaaa...',
  '...aaaaaaaaa...',
  '..aaaa...aaaa..',
  '..aaa.....aaa..',
  '.aaa.......aaa.',
  '.aa.........aa.',
  '...............',
];
const GEM = [
  '...77...',
  '..7cc7..',
  '.7c77c7.',
  '7cc77cc7',
  '.cc77cc.',
  '..cccc..',
  '...cc...',
  '........',
];
const CLOUD = [
  '.....5555.........',
  '...5566655........',
  '..566666665.555...',
  '.566666666556665..',
  '56666666666666665.',
  '566616666166666665',
  '.5555555555555555.',
  '....aa...aa.......',
  '...aa...aa........',
  '....a....a........',
];
const SHIELD = [
  '.cccccccc.',
  'cc777777cc',
  'c7cccccc7c',
  'c7cc77cc7c',
  '.c7c77c7c.',
  '.c7cccc7c.',
  '..c7777c..',
  '...cccc...',
  '....cc....',
];
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..'];
let g;

function init(api) {
  g = {
    x: 120, y: 188, lives: 3, hurt: 0,
    held: true, shield: false, chain: 0, bonus: 0,
    gemTimer: 1.2, cloudTimer: 4, shieldTimer: 10,
    items: [{kind: 'gem', x: 123, y: 90, speed: 44}],
    stars: [], lull: false, ended: false, pop: '', popTime: 0,
  };
  for (let i = 0; i < 36; i++) {
    g.stars.push({x: api.rndi(0, 255), y: api.rndi(30, 207), phase: api.rnd(6)});
  }
  api.score(0);
}

function item(kind, x, speed) {
  g.items.push({kind, x, base: x, y: 30, speed});
}

function message(text) {
  g.pop = text;
  g.popTime = 1.2;
}

function update(api, dt) {
  if (g.ended) return;
  g.hurt = Math.max(0, g.hurt - dt);
  g.bonus = Math.max(0, g.bonus - dt);
  g.popTime = Math.max(0, g.popTime - dt);
  g.y = 188 + Math.sin(api.t * 3) * 2;
  const move = (api.btn('right') ? 1 : 0) - (api.btn('left') ? 1 : 0);
  g.x = api.clamp(g.x + move * 150 * dt, 3, 238);
  if (api.btnp('a') && g.held && !g.shield) {
    g.held = false;
    g.shield = true;
    api.sfx('powerup');
    message('SHIELD ARMED');
  }

  // Each 20-second boundary clears the storm for four full seconds.
  const lull = api.t >= 20 && api.t % 20 < 4;
  if (lull && !g.lull) {
    g.items = g.items.filter(o => o.kind !== 'cloud');
    g.cloudTimer = 0.7;
    api.sfx('select');
    message('CLEAR SKIES');
  }
  g.lull = lull;
  g.gemTimer -= dt;
  g.shieldTimer -= dt;
  if (g.gemTimer <= 0) {
    item('gem', api.rndi(12, 236), 49);
    g.gemTimer = 1.35;
  }
  if (g.shieldTimer <= 0) {
    item('shield', api.rndi(16, 230), 38);
    g.shieldTimer = 12;
  }
  if (!lull) {
    g.cloudTimer -= dt;
    if (g.cloudTimer <= 0) {
      const count = g.items.filter(o => o.kind === 'cloud').length;
      const cap = api.t < 12 ? 2 : 3;
      if (count < cap) {
        const lane = api.rndi(0, 3);
        item('cloud', 23 + lane * 58, Math.min(57, 34 + api.t * 0.3));
      }
      g.cloudTimer = 1.6;
    }
  }

  for (const o of g.items) {
    o.y += o.speed * dt;
    if (o.kind === 'cloud') o.x = o.base + Math.sin(o.y * 0.025) * 10;
    const w = o.kind === 'cloud' ? 18 : o.kind === 'shield' ? 10 : 8;
    if (api.collide(g.x + 3, g.y + 3, 9, 9, o.x, o.y, w, 8)) {
      if (o.kind === 'gem') {
        o.dead = true;
        g.chain++;
        if (g.chain >= 3) {
          g.chain = 0;
          g.bonus = 6;
        }
        api.addScore(g.bonus > 0 ? 200 : 100);
        api.sfx('coin');
        api.flash(10, 1);
        message(g.bonus > 0 ? '+200' : '+100');
      } else if (o.kind === 'shield') {
        o.dead = true;
        g.held = true;
        api.sfx('coin');
        api.flash(10, 1);
        message('SHIELD STORED');
      } else if (g.hurt <= 0) {
        o.dead = true;
        g.hurt = 1.3;
        if (g.shield) {
          g.shield = false;
          api.sfx('hit');
          message('SAFE HIT');
        } else {
          g.lives--;
          g.chain = 0;
          g.bonus = 0;
          api.sfx('hit');
          api.flash(8, 3);
          api.shake(10);
          message('STORM HIT');
          if (g.lives <= 0) {
            g.ended = true;
            api.sfx('die');
            api.gameOver();
          }
        }
      }
    }
    if (!o.dead && o.kind === 'gem' && o.y > 207) {
      g.chain = 0;
      g.bonus = 0;
      o.dead = true;
    }
  }
  g.items = g.items.filter(o => !o.dead && o.y < 224);
}

function draw(api) {
  api.cls(1);
  for (const s of g.stars) {
    const y = 31 + (s.y + api.t * 4) % 175;
    api.pset(s.x, y, Math.sin(api.t * 2 + s.phase) > 0.8 ? 7 : 5);
  }
  api.circfill(223, 52, 13, 13);
  api.circfill(218, 48, 13, 1);
  api.rectfill(0, 207, 256, 17, 2);
  api.line(0, 206, 255, 206, 13);
  for (let x = 0; x < 256; x += 16) api.pset(x, 209, 14);
  for (const o of g.items) {
    api.spr(o.kind === 'gem' ? GEM : o.kind === 'cloud' ? CLOUD : SHIELD, o.x, o.y);
  }
  if (g.shield) {
    api.circ(g.x + 7, g.y + 7, 12, 12);
    api.circ(g.x + 7, g.y + 7, 13, 7);
  }
  if (g.hurt <= 0 || api.frame % 8 < 4) api.spr(STAR, g.x, g.y);
  for (let i = 0; i < g.lives; i++) api.spr(HEART, 5 + i * 8, 17);
  if (g.held) api.spr(SHIELD, 34, 15);
  api.text(g.shield ? 'ARMED' : g.held ? 'A:SHIELD' : 'NO SHIELD', 49, 17, 12);
  api.text(g.bonus > 0 ? '2X' : `${g.chain}/3`, 222, 17, 10);
  if (g.popTime > 0) api.textCenter(g.pop, 164, 10);
  else if (g.lull) api.textCenter('CLEAR SKIES', 42, 11);
  api.textCenter('LEFT/RIGHT MOVE  A SHIELD', 215, 7);
}
