(config = {}) => {
  const ART = {"schemaVersion":1,"id":"pong-art","palette":"pico-8","provenance":{"kind":"original","authors":["Arcade project"],"sources":[],"license":"LicenseRef-Project-Original"},"coordinateSystem":"Frame-local pixels; subtract anchor for world placement. Collision planes also include the ball radius.","frames":{"paddle-0-idle":{"width":6,"height":34,"pixels":[".7777.","777777","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","7cccc1","155551",".7777."],"durationTicks":60,"anchor":{"x":3,"y":17},"hitboxes":[{"x":0,"y":0,"w":6,"h":34}],"hurtboxes":[],"provenance":"Original pixel artwork authored for this project."},"paddle-0-hit":{"width":6,"height":34,"pixels":[".7777.","777777","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","155551",".7777."],"durationTicks":11,"anchor":{"x":3,"y":17},"hitboxes":[{"x":0,"y":0,"w":6,"h":34}],"hurtboxes":[],"provenance":"Original pixel artwork authored for this project."},"paddle-1-idle":{"width":6,"height":34,"pixels":[".7777.","777777","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","788881","155551",".7777."],"durationTicks":60,"anchor":{"x":3,"y":17},"hitboxes":[{"x":0,"y":0,"w":6,"h":34}],"hurtboxes":[],"provenance":"Original pixel artwork authored for this project."},"paddle-1-hit":{"width":6,"height":34,"pixels":[".7777.","777777","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","7aaaa1","155551",".7777."],"durationTicks":11,"anchor":{"x":3,"y":17},"hitboxes":[{"x":0,"y":0,"w":6,"h":34}],"hurtboxes":[],"provenance":"Original pixel artwork authored for this project."},"ball-0":{"width":5,"height":5,"pixels":[".777.","777a7","77aa7","7aaa7",".777."],"durationTicks":5,"anchor":{"x":2,"y":2},"hitboxes":[{"shape":"circle","x":2,"y":2,"radius":2}],"hurtboxes":[],"provenance":"Original pixel artwork authored for this project."},"ball-1":{"width":5,"height":5,"pixels":[".777.","7aa77","7a777","77777",".777."],"durationTicks":5,"anchor":{"x":2,"y":2},"hitboxes":[{"shape":"circle","x":2,"y":2,"radius":2}],"hurtboxes":[],"provenance":"Original pixel artwork authored for this project."},"spark-0":{"width":3,"height":3,"pixels":[".7.","777",".7."],"durationTicks":3,"anchor":{"x":1,"y":1},"hitboxes":[],"hurtboxes":[],"provenance":"Original pixel artwork authored for this project."},"spark-1":{"width":3,"height":3,"pixels":["7.7","...","7.7"],"durationTicks":4,"anchor":{"x":1,"y":1},"hitboxes":[],"hurtboxes":[],"provenance":"Original pixel artwork authored for this project."},"spark-2":{"width":3,"height":3,"pixels":["...",".7.","..."],"durationTicks":8,"anchor":{"x":1,"y":1},"hitboxes":[],"hurtboxes":[],"provenance":"Original pixel artwork authored for this project."}},"animations":{"ball":{"frames":["ball-0","ball-1"],"loop":true},"impact":{"frames":["spark-0","spark-1","spark-2"],"loop":false},"paddleIdle":{"frames":["paddle-0-idle"],"loop":true},"paddleHit":{"frames":["paddle-0-hit"],"loop":false}}};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const count = clamp(Math.floor(config.winScore || 7), 1, 15);
  const difficulty = clamp(Number.isFinite(config.difficulty) ? config.difficulty : 0.45, 0, 1);
  const limit = clamp(config.timeLimit || 180, 30, 600);
  const colors = [12, 8];
  let players, paddles, ball, points, phase, server, clock, pause, lastA, particles, trail, sudden, winner, serveQueued;
  let stats;
  function sound(api, kind) { api.sfx(kind); }
  function burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n;
      particles.push({ x, y, vx: Math.cos(a) * 35, vy: Math.sin(a) * 35, life: 0.35, color });
    }
  }
  function serve(side) {
    server = side; phase = 'serve'; pause = 0.8; trail = []; serveQueued = false;
    ball = { x: side ? 232 : 24, y: paddles[side].y, vx: 0, vy: 0, speed: 116, spin: 0, powered: 0 };
    for (const p of paddles) p.charge = 0;
  }
  function init(api) {
    players = api.players === 2 ? 2 : 1;
    paddles = [0, 1].map(i => ({ y: 116, vy: 0, charge: 0, flash: 0, target: 116, think: i * 0.03 }));
    points = [0, 0]; clock = 0; lastA = [false, false]; particles = []; trail = []; sudden = false; winner = null;
    stats = { hits: [0, 0], powerHits: [0, 0], serves: 0, longestRally: 0, rally: 0, wallHits: 0, points: 0 };
    for (let i = 0; i < players; i++) api.score(0, i);
    serve(0);
  }
  function finish(api, side) {
    if (phase === 'finished') return;
    phase = 'finished'; winner = side;
    if (typeof config.onMatch === 'function') config.onMatch({ winner, points: points.slice() }, api);
    if (players === 2) api.win(side); else if (side === 0) api.win(); else api.gameOver();
  }
  function point(api, side) {
    points[side]++; stats.points++; stats.longestRally = Math.max(stats.longestRally, stats.rally); stats.rally = 0;
    if (side < players) api.addScore(100, side);
    burst(side ? 12 : 244, ball.y, colors[side], 20); sound(api, 'coin');
    if (typeof config.onPoint === 'function') config.onPoint({ player: side, points: points.slice() }, api);
    if (points[side] >= count || sudden) { finish(api, side); return; }
    serve(1 - side); pause = 0.65;
  }
  function launch(api) {
    phase = 'rally'; stats.serves++;
    ball.vx = (server ? -1 : 1) * ball.speed;
    ball.vy = clamp(paddles[server].vy * 0.28 + Math.sin(clock * 2.3) * 34, -64, 64);
    sound(api, 'shoot');
  }
  function rebound(api, side, impactY) {
    const p = paddles[side];
    const hit = clamp((impactY - p.y) / 17, -1, 1);
    const power = p.charge >= 0.45;
    const angle = clamp(hit * 0.91 + p.vy * 0.0013, -1.04, 1.04);
    ball.speed = clamp(ball.speed + (power ? 25 : 7), 116, 255);
    ball.vx = (side ? -1 : 1) * Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
    ball.spin = p.vy * 0.045; ball.powered = power ? 0.5 : 0;
    p.charge = 0; p.flash = 0.18;
    ball.x = side ? 234.9 : 21.1;
    stats.hits[side]++; stats.rally++; stats.longestRally = Math.max(stats.longestRally, stats.rally);
    if (power) { stats.powerHits[side]++; sound(api, 'powerup'); } else sound(api, 'hit');
    burst(ball.x, impactY, power ? 10 : colors[side]);
  }
  function physics(api, dt) {
    const oldX = ball.x, oldY = ball.y;
    ball.vy += ball.spin * dt; ball.spin *= Math.max(0, 1 - dt * 2);
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y < 38) { ball.y = 76 - ball.y; ball.vy = Math.abs(ball.vy); stats.wallHits++; api.tone(440, 25, 'triangle'); }
    if (ball.y > 196) { ball.y = 392 - ball.y; ball.vy = -Math.abs(ball.vy); stats.wallHits++; api.tone(440, 25, 'triangle'); }
    const side = ball.vx < 0 ? 0 : 1, plane = side ? 235 : 21;
    if ((side ? oldX < plane && ball.x >= plane : oldX > plane && ball.x <= plane)) {
      const t = (plane - oldX) / (ball.x - oldX);
      const impactY = oldY + (ball.y - oldY) * t;
      if (Math.abs(impactY - paddles[side].y) <= 19) rebound(api, side, impactY);
    }
    if (ball.x < 3) point(api, 1);
    else if (ball.x > 253) point(api, 0);
  }
  function update(api, dt) {
    if (phase === 'finished') return;
    dt = clamp(dt || 1 / 60, 0, 1 / 20); clock += dt; pause = Math.max(0, pause - dt);
    particles = particles.filter(p => (p.life -= dt) > 0);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let i = 0; i < 2; i++) {
      const p = paddles[i]; p.flash = Math.max(0, p.flash - dt);
      let direction = 0, charging = false, precise = false;
      if (i < players) {
        direction = (api.btn('down', i) || api.btn('right', i) ? 1 : 0) - (api.btn('up', i) || api.btn('left', i) ? 1 : 0);
        charging = api.btn('a', i); precise = api.btn('b', i);
      } else {
        p.think -= dt;
        if (p.think <= 0) {
          p.think = 0.22 - difficulty * 0.11;
          // Finite observation interval and deliberate aim error; no perfect future lookup.
          p.target = ball.vx > 0 ? ball.y + Math.sin(clock * 2.4) * (30 - difficulty * 18) : 116;
        }
        direction = Math.abs(p.target - p.y) > 5 ? Math.sign(p.target - p.y) : 0;
        charging = difficulty > 0.5 && ball.x > 145 && ball.vx > 0;
      }
      const speed = i < players ? (precise ? 96 : charging ? 165 : 242) : 112 + difficulty * 105;
      p.vy = direction * speed; p.y = clamp(p.y + p.vy * dt, 55, 179);
      p.charge = charging && phase === 'rally' ? Math.min(1, p.charge + dt * 1.25) : Math.max(0, p.charge - dt * 2);
    }
    if (phase === 'serve') {
      ball.y = paddles[server].y;
      if (server < players && api.btn('a', server) && !lastA[server]) serveQueued = true;
      if (pause === 0 && (server >= players || serveQueued)) launch(api);
    } else {
      ball.powered = Math.max(0, ball.powered - dt);
      const steps = Math.ceil(dt * 120);
      for (let s = 0; s < steps && phase === 'rally'; s++) physics(api, dt / steps);
      trail.unshift({ x: ball.x, y: ball.y }); if (trail.length > 8) trail.pop();
    }
    lastA = [api.btn('a', 0), players === 2 && api.btn('a', 1)];
    if (clock >= limit && phase !== 'finished') {
      if (points[0] !== points[1]) finish(api, points[0] > points[1] ? 0 : 1); else sudden = true;
    }
  }
  function draw(api) {
    api.cls(0);
    api.rectfill(8, 33, 240, 168, 1); api.rectfill(10, 35, 236, 164, 0);
    api.line(10, 35, 246, 35, 12); api.line(10, 199, 246, 199, 8);
    for (let y = 42; y < 194; y += 12) api.rectfill(127, y, 2, 5, 1);
    api.circ(128, 117, 25, 1);
    for (let i = 0; i < Math.min(count, 10); i++) {
      api.rectfill(110 - i * 6, 22, 4, 5, i < points[0] ? 12 : 1);
      api.rectfill(142 + i * 6, 22, 4, 5, i < points[1] ? 8 : 1);
    }
    if (count > 10) {
      api.rectfill(54, 19, 146, 9, 0);
      api.text(String(points[0]) + '/' + count, 76, 19, 12);
      api.text(String(points[1]) + '/' + count, 150, 19, 8);
    }
    api.text('P1', 12, 19, 12); api.text(players === 2 ? 'P2' : 'CPU', 216, 19, 8);
    for (let i = 0; i < 2; i++) {
      const p = paddles[i], x = i ? 237 : 13;
      const sprite = ART.frames[`paddle-${i}-${p.flash > 0 ? 'hit' : 'idle'}`];
      api.spr(sprite.pixels, x, p.y - 17);
      if (p.charge > 0) api.rectfill(i ? 245 : 8, p.y + 17 - p.charge * 34, 2, p.charge * 34, p.charge >= 0.45 ? 10 : colors[i]);
    }
    for (let i = trail.length - 1; i >= 0; i--) api.rectfill(trail[i].x - 1, trail[i].y - 1, 3, 3, ball.powered ? (i < 3 ? 9 : 2) : 1);
    api.spr(ART.frames[`ball-${Math.floor(clock * 12) % 2}`].pixels, ball.x - 2, ball.y - 2);
    for (const p of particles) {
      if (p.life > 0.12) api.spr(ART.frames[p.life > 0.28 ? 'spark-0' : 'spark-1'].pixels, p.x - 1, p.y - 1);
      else api.pset(p.x, p.y, p.color);
    }
    if (phase === 'serve') {
      api.rectfill(61, 105, 134, 23, 0);
      api.textCenter(server >= players ? 'CPU SERVE' : `P${server + 1} A: SERVE`, 112, 7);
    }
    api.textCenter(sudden ? 'NEXT POINT WINS' : 'HOLD A: POWER  B: PRECISION', 210, sudden ? 10 : 6);
  }
  function inspect() {
    return JSON.parse(JSON.stringify({ phase, clock, players, server, points, winner, sudden, paddles, ball, stats }));
  }
  return { init, update, draw, inspect };
}
