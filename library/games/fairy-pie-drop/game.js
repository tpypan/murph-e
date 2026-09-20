// TITLE: FAIRY PIE DROP
// GENRE: platformer
// CONTROLS: left right a
// Grounded A: flap-jump. Gaps gently return the fairy without life loss.
// Catch five consecutive pies to earn a quiet recovery wave.
const FAIRY = [
  '......aa........',
  '.....affa.......',
  '.....f1ff.......',
  '.77..fff...77...',
  '7777..ee..7777..',
  '7dd77eeee77dd7..',
  '.7ddd7ee7ddd7...',
  '..777eeee777....',
  '.77ddeeeedd77...',
  '77dd.eeee.dd77..',
  '.77..eeee..77...',
  '.....eeee.......',
  '....eeeeee......',
  '.....f..f.......',
  '.....f..f.......',
  '....77..77......',
];
const PIE = [
  '.77..........77.',
  '7dd7...8....7dd7',
  '.7dd7.aaa..7dd7.',
  '..77999999777...',
  '...9a9a9a9a9....',
  '..aaaaaaaaaa....',
  '...94444449.....',
  '....444444......',
];
const ANVIL = [
  '77............77',
  '7d7..........7d7',
  '.7d7666666667d7.',
  '..776776677677..',
  '...6666666666...',
  '....55555555....',
  '......5555......',
  '......5555......',
  '.....555555.....',
  '....66666666....',
];
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..'];
const CLOUDS = [
  { x: 12, y: 183, w: 62 },
  { x: 96, y: 165, w: 64 },
  { x: 182, y: 183, w: 62 },
];
let g;

function init(api) {
  g = {
    x: 120, y: 149, vy: 0, ground: true, face: false,
    lives: 3, hurt: 0, flap: 0, chain: 0, caught: 0,
    pies: [{ x: 120, y: 80, speed: 33 }],
    anvils: [], nextPie: 2.4, nextAnvil: 4.2,
    rest: 0, level: 0, message: '', messageTime: 0, ended: false,
  };
  api.score(0);
}

function announce(text) {
  g.message = text;
  g.messageTime = 1.5;
}

function update(api, dt) {
  if (g.ended) return;
  g.hurt = Math.max(0, g.hurt - dt);
  g.flap = Math.max(0, g.flap - dt);
  g.messageTime -= dt;
  g.rest = Math.max(0, g.rest - dt);
  const recovery = g.rest > 0 || (api.t > 16 && api.t % 22 > 17);
  if (api.btn('left')) { g.x -= 125 * dt; g.face = true; }
  if (api.btn('right')) { g.x += 125 * dt; g.face = false; }
  g.x = api.clamp(g.x, 0, 240);
  if (api.btnp('a') && g.ground) {
    g.vy = -235;
    g.ground = false;
    g.flap = 0.4;
    api.sfx('jump');
  }
  const bottom = g.y + 16;
  const wasGround = g.ground;
  g.vy = Math.min(240, g.vy + 520 * dt);
  g.y += g.vy * dt;
  g.ground = false;
  for (const p of CLOUDS) {
    if (g.vy >= 0 && bottom <= p.y && g.y + 16 >= p.y &&
        g.x + 12 > p.x && g.x + 4 < p.x + p.w) {
      g.y = p.y - 16;
      g.vy = 0;
      g.ground = true;
      if (!wasGround) api.sfx('select');
    }
  }
  if (g.y > 224) {
    g.x = 120; g.y = 149; g.vy = 0; g.ground = true;
    g.chain = 0; g.caught = 0;
    api.sfx('jump');
    announce('WINGS BRING YOU HOME');
  }
  g.nextPie -= dt;
  if (g.nextPie <= 0) {
    const p = CLOUDS[api.rndi(0, 2)];
    g.pies.push({ x: p.x + api.rndi(10, p.w - 26), y: 32, speed: 42 });
    g.nextPie = recovery ? 1.6 : 2.2;
  }
  g.nextAnvil -= dt;
  if (recovery) g.nextAnvil = Math.max(g.nextAnvil, 0.8);
  if (!recovery && g.nextAnvil <= 0 && g.anvils.length < 3) {
    const x = api.rnd() < 0.55 ? g.x : api.rndi(14, 226);
    g.anvils.push({ x, y: 32, wait: 1.1, dead: false });
    g.nextAnvil = Math.max(1.35, 2.7 - Math.min(4, Math.floor(api.t / 18)) * 0.3);
    api.sfx('select');
  }
  for (const p of g.pies) {
    p.y += p.speed * dt;
    if (api.collide(g.x + 3, g.y + 1, 10, 15, p.x + 3, p.y + 2, 10, 6)) {
      p.dead = true;
      g.chain = Math.min(5, g.chain + 1);
      g.caught++;
      api.addScore(100 * g.chain);
      api.sfx('coin');
      api.flash(10, 1);
      announce('+' + (100 * g.chain) + '  SWEET!');
      if (g.caught >= 5) {
        g.caught = 0; g.rest = 4.5; g.level = Math.min(4, g.level + 1);
        // Warnings dissolve; already falling anvils still follow their paths.
        g.anvils = g.anvils.filter(a => a.wait <= 0);
        api.sfx('powerup');
        announce('FIVE PIES! BREATHER');
      }
    } else if (p.y > 218) {
      p.dead = true;
      g.chain = 0; g.caught = 0;
      api.sfx('select');
      announce('MISSED! CHAIN RESET');
    }
  }
  g.pies = g.pies.filter(p => !p.dead);
  for (const a of g.anvils) {
    a.wait -= dt;
    if (a.wait > 0) continue;
    a.y += (85 + Math.min(55, api.t * 0.7 + g.level * 6)) * dt;
    if (g.hurt <= 0 &&
        api.collide(g.x + 3, g.y + 1, 10, 15, a.x + 3, a.y + 2, 10, 8)) {
      a.dead = true; g.lives--; g.hurt = 1.7;
      g.chain = 0; g.caught = 0;
      api.sfx('hit'); api.flash(8, 3); api.shake(10);
      announce('OUCH! CHAIN RESET');
      if (g.lives <= 0) {
        g.ended = true;
        api.sfx('die');
        api.gameOver();
        return;
      }
    }
  }
  g.anvils = g.anvils.filter(a => !a.dead && a.y < 224);
}

function draw(api) {
  api.cls(1);
  for (let i = 0; i < 28; i++) {
    const x = (i * 83 + api.t * 3) % 256;
    const y = 36 + (i * 43) % 162;
    api.pset(x, y, i % 3 === 0 ? 13 : 2);
  }
  api.circfill(226, 48, 17, 13);
  api.circfill(219, 43, 16, 1);
  api.rectfill(0, 213, 256, 11, 2);
  for (const p of CLOUDS) {
    api.rectfill(p.x, p.y, p.w, 8, 13);
    for (let i = 0; i < 6; i++)
      api.circfill(p.x + 6 + i * 10, p.y + 4, 6, 13);
    api.line(p.x + 3, p.y, p.x + p.w - 3, p.y, 7);
  }
  for (const a of g.anvils) {
    let y = 210;
    for (const p of CLOUDS)
      if (a.x + 8 >= p.x && a.x + 8 <= p.x + p.w) y = p.y - 2;
    const c = api.frame % 20 < 10 ? 8 : 14;
    api.line(a.x, y - 4, a.x + 8, y, c);
    api.line(a.x + 8, y, a.x + 16, y - 4, c);
    api.rectfill(a.x + 4, y - 2, 8, 3, c);
    if (a.wait > 0) api.text('!', a.x + 4, y - 16, 10);
    else api.spr(ANVIL, a.x, a.y);
  }
  for (const p of g.pies) api.spr(PIE, p.x, p.y);
  if (g.hurt <= 0 || api.frame % 8 < 4) {
    api.spr(FAIRY, g.x, g.y, g.face);
    if (g.flap > 0) {
      api.line(g.x - 3, g.y + 8, g.x - 7, g.y + 14, 7);
      api.line(g.x + 18, g.y + 8, g.x + 22, g.y + 14, 7);
    }
  }
  for (let i = 0; i < g.lives; i++) api.spr(HEART, 7 + i * 8, 17);
  api.text('CHAIN ' + g.chain + 'X', 168, 17, 10);
  if (g.messageTime > 0) api.textCenter(g.message, 31, 15);
  api.textCenter('LEFT/RIGHT  A:FLAP-JUMP', 215, 7);
}
