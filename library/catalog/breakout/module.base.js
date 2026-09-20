(config = {}) => {
  const ART = __ART__;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const defaults = [
    ['00111100', '01122110', '11233211', '11000011', '01100110'],
    ['12200221', '23011032', '20122102', '11200211', '01011010'],
    ['12333321', '23000032', '30122103', '23100132', '01233210'],
  ];
  const custom = Array.isArray(config.stages) && config.stages.length ? config.stages.slice(0, 6) : defaults;
  const stages = custom.map(rows => Array.isArray(rows) ? rows.slice(0, 7).map(row => String(row).replace(/[^0-3]/g, '0').padEnd(8, '0').slice(0, 8)) : defaults[0]);
  const limit = clamp(config.timeLimit || 360, 30, 900);
  let players, paddles, balls, bricks, pickups, particles, phase, timer, clock, stage, lives, combo, owner, lastA, slow, stats;
  const colors = [12, 8];
  function burst(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) particles.push({ x, y, vx: Math.cos(i * 2.4) * (20 + i * 3), vy: -22 + Math.sin(i * 2.4) * 30, life: 0.4, color });
  }
  function newBall(x, y, vx, vy) { return { x, y, vx, vy, lastPlayer: owner, trail: [], power: 0 }; }
  function prepareServe() {
    phase = 'serve'; timer = 0.4; combo = 0; pickups = [];
    balls = [newBall(paddles[owner].x, 183, 0, 0)];
  }
  function makeStage() {
    bricks = [];
    const rows = stages[stage];
    rows.forEach((row, r) => [...row].forEach((c, col) => {
      if (+c) bricks.push({ id: r * 8 + col, x: 24 + col * 26, y: 44 + r * 12, w: 23, h: 9, hp: +c, maxHp: +c, flash: 0, color: [12, 10, 9, 14, 11, 8, 13][r] });
    }));
    // An empty custom stage is invalid; keep the game playable with a real target.
    if (!bricks.length) bricks.push({ id: 0, x: 116, y: 68, w: 23, h: 9, hp: 1, maxHp: 1, flash: 0, color: 10 });
    prepareServe();
  }
  function init(api) {
    players = api.players === 2 ? 2 : 1; owner = 0; stage = 0; clock = 0;
    lives = clamp(Math.floor(config.lives || 3), 1, 9); combo = 0; slow = 0; lastA = [false, false]; particles = []; pickups = [];
    paddles = Array.from({ length: players }, (_, i) => ({ x: players === 1 ? 128 : i ? 188 : 68, vx: 0, wide: 0, flash: 0, pulse: 0, cooldown: 0, queued: false }));
    stats = { paddleHits: [0, 0], brickHits: 0, destroyed: 0, pickups: 0, stagesCleared: 0, misses: 0, launches: 0, maxCombo: 0, powerHits: 0 };
    for (let i = 0; i < players; i++) api.score(0, i);
    makeStage();
  }
  function half(p) { return p.wide > 0 ? 26 : players === 2 ? 16 : 20; }
  function launch(api, player) {
    owner = player; phase = 'play'; stats.launches++;
    balls = [newBall(paddles[player].x, 183, (player ? -1 : 1) * 47, -(125 + stage * 8))];
    api.sfx('shoot');
  }
  function finish(api, won) {
    if (phase === 'finished') return;
    phase = 'finished'; if (won) api.win(); else api.gameOver();
  }
  // Segment vs expanded AABB: exact time of entry and surface normal. Used for
  // every brick regardless of speed, so increasing speed cannot skip thin rows.
  function sweep(x, y, dx, dy, box) {
    let near = -Infinity, far = Infinity, nx = 0, ny = 0;
    for (let axis = 0; axis < 2; axis++) {
      const p = axis ? y : x, d = axis ? dy : dx, lo = axis ? box.y - 2 : box.x - 2, hi = lo + (axis ? box.h : box.w) + 4;
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; continue; }
      let a = (lo - p) / d, b = (hi - p) / d, normal = -1;
      if (a > b) { const c = a; a = b; b = c; normal = 1; }
      if (a > near) { near = a; nx = axis ? 0 : normal; ny = axis ? normal : 0; }
      far = Math.min(far, b);
    }
    return near >= -1e-7 && near <= 1 && near <= far ? { t: Math.max(0, near), nx, ny } : null;
  }
  function hitBrick(api, brick, ball) {
    if (brick.hp <= 0) return;
    brick.hp--; brick.flash = 0.09; stats.brickHits++;
    if (brick.hp === 0) {
      stats.destroyed++; combo++; stats.maxCombo = Math.max(stats.maxCombo, combo);
      const points = 20 * brick.maxHp + Math.min(80, combo * 5);
      api.addScore(points, ball.lastPlayer); burst(brick.x + 11, brick.y + 4, brick.color);
      if (stats.destroyed % 6 === 0) pickups.push({ x: brick.x + 11, y: brick.y + 4, type: ['wide', 'slow', 'multi'][(Math.floor(stats.destroyed / 6) - 1) % 3], age: 0 });
      if (typeof config.onBrick === 'function') config.onBrick({ player: ball.lastPlayer, stage: stage + 1, id: brick.id, combo, points }, api);
      api.tone(400 + Math.min(combo, 12) * 45, 45, 'triangle');
    } else api.sfx('hit');
    if (bricks.every(b => b.hp <= 0)) {
      phase = 'clear'; timer = 1.1; stats.stagesCleared++;
      for (let i = 0; i < players; i++) api.addScore(250, i);
      if (typeof config.onStage === 'function') config.onStage({ stage: stage + 1, lives }, api);
      api.sfx('powerup');
    }
  }
  function rebound(api, ball, p, index) {
    const offset = clamp((ball.x - p.x) / half(p), -1, 1);
    // Moving the paddle influences the rebound, but never overwhelms placement.
    const angle = clamp(offset * 1.05 + p.vx * 0.0007, -1.13, 1.13);
    const power = p.pulse > 0;
    const speed = clamp(Math.hypot(ball.vx, ball.vy) + (power ? 18 : 2), 128, 218);
    ball.vx = Math.sin(angle) * speed;
    if (Math.abs(ball.vx) < 18) ball.vx = (offset < 0 ? -1 : 1) * 18;
    ball.vy = -Math.sqrt(Math.max(1, speed * speed - ball.vx * ball.vx));
    ball.lastPlayer = index; ball.power = power ? 0.65 : 0; p.flash = 0.16;
    stats.paddleHits[index]++; if (power) stats.powerHits++;
    combo = 0; owner = index;
    api.sfx(power ? 'powerup' : 'hit'); burst(ball.x, 190, colors[index], 6);
  }
  function moveBall(api, ball, dt) {
    let remaining = dt * (slow > 0 ? 0.73 : 1);
    for (let iter = 0; iter < 8 && remaining > 1e-7 && phase === 'play'; iter++) {
      const dx = ball.vx * remaining, dy = ball.vy * remaining;
      let best = null;
      function consider(hit) { if (hit && hit.t >= 0 && hit.t <= 1 && (!best || hit.t < best.t)) best = hit; }
      if (dx < 0) consider({ t: (14 - ball.x) / dx, nx: 1, ny: 0 });
      if (dx > 0) consider({ t: (242 - ball.x) / dx, nx: -1, ny: 0 });
      if (dy < 0) consider({ t: (36 - ball.y) / dy, nx: 0, ny: 1 });
      for (const brick of bricks) if (brick.hp > 0) {
        const hit = sweep(ball.x, ball.y, dx, dy, brick);
        if (hit) consider({ ...hit, brick });
      }
      if (dy > 0 && ball.y <= 188.0001) {
        const t = (188 - ball.y) / dy, x = ball.x + dx * t;
        for (let i = 0; i < paddles.length; i++) if (x >= paddles[i].x - half(paddles[i]) - 2 && x <= paddles[i].x + half(paddles[i]) + 2)
          consider({ t, nx: 0, ny: -1, paddle: i });
      }
      if (!best) { ball.x += dx; ball.y += dy; break; }
      ball.x += dx * best.t; ball.y += dy * best.t;
      remaining *= 1 - best.t;
      if (best.paddle !== undefined) rebound(api, ball, paddles[best.paddle], best.paddle);
      else {
        if (best.nx) ball.vx = -ball.vx;
        if (best.ny) ball.vy = -ball.vy;
        if (best.brick) hitBrick(api, best.brick, ball); else api.tone(330, 15, 'triangle');
      }
      ball.x += best.nx * 0.02; ball.y += best.ny * 0.02;
    }
    ball.power = Math.max(0, ball.power - dt);
    ball.trail.unshift({ x: ball.x, y: ball.y }); if (ball.trail.length > 5) ball.trail.pop();
  }
  function catchPickup(api, item, player) {
    stats.pickups++; api.sfx('powerup'); api.addScore(50, player);
    if (item.type === 'wide') paddles[player].wide = 10;
    else if (item.type === 'slow') slow = 8;
    else if (balls.length < 3 && balls.length) {
      const ball = balls[0], speed = Math.hypot(ball.vx, ball.vy), angle = Math.atan2(ball.vy, ball.vx);
      for (const delta of [-0.28, 0.28]) if (balls.length < 3) balls.push(newBall(ball.x, ball.y, Math.cos(angle + delta) * speed, Math.sin(angle + delta) * speed));
    }
  }
  function update(api, dt) {
    if (phase === 'finished') return;
    dt = clamp(dt || 1 / 60, 0, 1 / 20); clock += dt; timer = Math.max(0, timer - dt); slow = Math.max(0, slow - dt);
    particles = particles.filter(p => (p.life -= dt) > 0);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 70 * dt; }
    for (const b of bricks) b.flash = Math.max(0, b.flash - dt);
    for (let i = 0; i < players; i++) {
      const p = paddles[i]; p.wide = Math.max(0, p.wide - dt); p.flash = Math.max(0, p.flash - dt); p.pulse = Math.max(0, p.pulse - dt); p.cooldown = Math.max(0, p.cooldown - dt);
      p.vx = ((api.btn('right', i) ? 1 : 0) - (api.btn('left', i) ? 1 : 0)) * (api.btn('b', i) ? 100 : 250);
      const min = players === 2 && i === 1 ? 128 : 12, max = players === 2 && i === 0 ? 128 : 244;
      p.x = clamp(p.x + p.vx * dt, min + half(p), max - half(p));
      if (api.btn('a', i) && !lastA[i]) {
        if (phase === 'serve') { p.queued = true; owner = i; }
        else if (phase === 'play' && p.cooldown <= 0) { p.pulse = 0.3; p.cooldown = 0.9; api.sfx('select'); }
      }
    }
    if (phase === 'serve') {
      balls[0].x = paddles[owner].x;
      if (timer === 0 && paddles[owner].queued) { for (const p of paddles) p.queued = false; launch(api, owner); }
    } else if (phase === 'clear') {
      if (timer === 0) { stage++; if (stage >= stages.length) finish(api, true); else makeStage(); }
    } else if (phase === 'play') {
      for (const ball of balls.slice()) if (phase === 'play') moveBall(api, ball, dt);
      balls = balls.filter(ball => ball.y < 212);
      if (!balls.length && phase === 'play') {
        lives--; stats.misses++; api.sfx('die');
        if (lives <= 0) finish(api, false); else { owner = (owner + 1) % players; prepareServe(); }
      }
      for (const item of pickups) {
        item.age += dt; item.y += 39 * dt;
        if (item.y >= 186 && item.y <= 202) for (let i = 0; i < players; i++) if (Math.abs(item.x - paddles[i].x) <= half(paddles[i]) + 4) {
          catchPickup(api, item, i); item.y = 999; break;
        }
      }
      pickups = pickups.filter(item => item.y < 210);
    }
    lastA = [api.btn('a', 0), players === 2 && api.btn('a', 1)];
    if (clock >= limit) finish(api, false);
  }
  function draw(api) {
    api.cls(0); api.rectfill(10, 32, 236, 175, 1); api.rectfill(12, 34, 232, 171, 0);
    api.line(12, 33, 244, 33, 12); api.line(11, 35, 11, 204, 12); api.line(245, 35, 245, 204, 8);
    api.text(`STAGE ${Math.min(stage + 1, stages.length)}/${stages.length}`, 13, 19, 10);
    if (lives > 4) api.text('L' + lives, 224, 19, 7);
    else for (let i = 0; i < lives; i++) api.spr(ART.frames['ball-0'].pixels, 216 + i * 7, 20);
    for (let y = 116; y < 185; y += 16) for (let x = 28; x < 238; x += 26) api.pset(x, y, 1);
    for (const b of bricks) if (b.hp > 0) {
      const damage = b.maxHp - b.hp;
      const key = `brick-${b.color}-${3 - damage}`;
      api.spr(ART.frames[key].pixels, b.x, b.y);
      if (b.flash > 0) api.rect(b.x, b.y, b.w, b.h, 7);
    }
    for (let i = 0; i < players; i++) {
      const p = paddles[i], width = half(p) * 2;
      api.spr(ART.frames[`paddle-${i}-${width}-${p.flash > 0 || p.pulse > 0 ? 'hit' : 'idle'}`].pixels, p.x - width / 2, 190);
      api.rectfill(p.x - 8, 200, 16 * (1 - p.cooldown / 0.9), 1, p.pulse > 0 ? 10 : colors[i]);
    }
    for (const ball of balls) {
      for (const t of ball.trail) api.pset(t.x, t.y, ball.power > 0 ? 9 : 1);
      api.spr(ART.frames[`ball-${Math.floor(clock * 12) % 2}`].pixels, ball.x - 2, ball.y - 2);
    }
    for (const item of pickups) api.spr(ART.frames[`pickup-${item.type}-${Math.floor(item.age * 6) % 2}`].pixels, item.x - 4, item.y - 4);
    for (const p of particles) {
      if (p.life > 0.15) api.spr(ART.frames[p.life > 0.28 ? 'spark-0' : 'spark-1'].pixels, p.x - 1, p.y - 1);
      else api.pset(p.x, p.y, p.color);
    }
    if (phase === 'serve' || phase === 'clear') {
      api.rectfill(47, 131, 162, 25, 0);
      api.textCenter(phase === 'clear' ? 'STAGE CLEAR' : 'A: LAUNCH', 140, phase === 'clear' ? 10 : 7);
    }
    api.textCenter(players === 2 ? 'P1 LEFT HALF  P2 RIGHT HALF' : 'A: PULSE  B: PRECISION', 212, 6);
  }
  function inspect() { return JSON.parse(JSON.stringify({ phase, clock, players, stage, lives, owner, combo, slow, paddles, balls, bricks, pickups, stats })); }
  return { init, update, draw, inspect };
}
