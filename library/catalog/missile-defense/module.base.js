(config = {}) => {
  const ART = __ART__;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const waves = Number.isFinite(config.waves) ? clamp(Math.floor(config.waves), 1, 8) : 4;
  const limit = Number.isFinite(config.timeLimit) ? clamp(config.timeLimit, 30, 900) : 240;
  const stages = [0, 1, 2, 3, 4, 4, 3, 2, 1, 0], durations = [3, 4, 5, 6, 10, 10, 6, 5, 4, 3], radii = [3, 7, 12, 18, 24];
  let players, phase, clock, wave, timer, spawnTimer, remaining, spawnSerial, rng, serial, cities, batteries, cursors, missiles, rockets, explosions, particles, stats;
  function random() { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; }
  function cityCount() { return cities.filter(c => c.alive).length; }
  function burst(x, y, color) { for (let i = 0; i < 12; i++) particles.push({ x, y, vx: Math.cos(i * 2.4) * 24, vy: Math.sin(i * 2.4) * 24, life: 0.4, color }); }
  function startWave(api) {
    wave++; phase = 'wave'; remaining = 4 + wave * 4; spawnTimer = 0.8; spawnSerial = 0;
    batteries.forEach((b, i) => { b.alive = true; b.ammo = i === 1 ? 14 : 10; b.flash = 0; });
    missiles = []; rockets = []; explosions = []; api.sfx('select');
  }
  function init(api) {
    players = api.players === 2 ? 2 : 1; clock = 0; wave = 0; phase = 'ready'; timer = 0.8; rng = (config.seed >>> 0) || 19; serial = 0;
    cities = [37, 66, 96, 160, 190, 219].map((x, i) => ({ x, alive: true, style: i % 3 }));
    batteries = [15, 128, 241].map((x, i) => ({ x, alive: true, ammo: i === 1 ? 14 : 10, flash: 0 }));
    cursors = Array.from({ length: players }, (_, p) => ({ x: players === 1 ? 128 : p ? 177 : 79, y: 91, battery: players === 1 ? 1 : p ? 2 : 0, cooldown: 0, lastB: false }));
    missiles = []; rockets = []; explosions = []; particles = []; remaining = 0; spawnTimer = 0; spawnSerial = 0;
    stats = { shots: 0, ammoSpent: 0, shotsByPlayer: [0, 0], interceptions: 0, killsByPlayer: [0, 0], chainKills: 0, splits: 0, impacts: 0, citiesLost: 0, wavesCleared: 0, restored: 0 };
    for (let p = 0; p < players; p++) api.score(0, p);
  }
  function targets() { return [...cities.filter(c => c.alive).map(c => ({ x: c.x, kind: 'city' })), ...batteries.filter(b => b.alive).map(b => ({ x: b.x, kind: 'battery' }))]; }
  function incoming(x, y, target, split = false) {
    const speed = 19 + Math.min(8, wave) * 3.4, dx = target.x - x, dy = 191 - y, distance = Math.hypot(dx, dy);
    missiles.push({ id: ++serial, x, y, sx: x, sy: y, tx: target.x, vx: dx / distance * speed, vy: dy / distance * speed, split, alive: true });
  }
  function spawn() {
    const choices = targets(); if (!choices.length) return;
    const x = 14 + random() * 228, target = choices[Math.floor(random() * choices.length)];
    incoming(x, 26, target, wave >= 3 && spawnSerial % 6 === 4); remaining--; spawnSerial++;
    // Clearly visible paired arrivals create chain opportunities without an unbounded burst.
    if (wave >= 2 && spawnSerial % 5 === 0 && remaining > 0) {
      incoming(clamp(x + 11, 10, 246), 26, target); remaining--; spawnSerial++;
    }
  }
  function explosion(x, y, owner, chain = false) { explosions.push({ id: ++serial, x, y, owner, chain, age: 0, frame: 0, radius: 3 }); }
  function updateExplosion(e, dt) {
    e.age += dt; let ticks = e.age * 60, slot = 0;
    while (slot < durations.length && ticks >= durations[slot]) { ticks -= durations[slot]; slot++; }
    if (slot >= durations.length) return false;
    e.frame = stages[slot]; e.radius = radii[e.frame] * (e.chain ? 0.625 : 1); return true;
  }
  function fire(api, p) {
    const c = cursors[p], b = batteries[c.battery];
    if (!b.alive || b.ammo <= 0 || c.cooldown > 0) return;
    b.ammo--; b.flash = 0.12; c.cooldown = 0.26; stats.shots++; stats.ammoSpent++; stats.shotsByPlayer[p]++;
    rockets.push({ x: b.x, y: 184, tx: c.x, ty: c.y, owner: p, age: 0, trail: [] }); api.sfx('shoot');
  }
  function impact(api, m) {
    stats.impacts++; api.sfx('explode'); burst(m.tx, 192, 9);
    for (const c of cities) if (c.alive && Math.abs(c.x - m.tx) < 12) { c.alive = false; stats.citiesLost++; }
    for (const b of batteries) if (b.alive && Math.abs(b.x - m.tx) < 10) { b.alive = false; b.ammo = 0; }
  }
  function finish(api, won) {
    if (phase === 'finished') return;
    phase = 'finished'; if (won) api.win(); else api.gameOver();
  }
  function clearWave(api) {
    phase = 'resupply'; timer = 2; stats.wavesCleared++;
    const bonus = cityCount() * 50 + batteries.reduce((sum, b) => sum + b.ammo, 0) * 2;
    for (let p = 0; p < players; p++) api.addScore(bonus, p);
    if (typeof config.onWave === 'function') config.onWave({ wave, cities: cityCount(), bonus }, api);
    api.sfx('powerup');
  }
  function update(api, dt) {
    if (phase === 'finished') return;
    dt = clamp(dt || 1 / 60, 0, 1 / 20); clock += dt;
    particles = particles.filter(p => (p.life -= dt) > 0);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; }
    for (const b of batteries) b.flash = Math.max(0, b.flash - dt);
    for (let p = 0; p < players; p++) {
      const c = cursors[p], dx = (api.btn('right', p) ? 1 : 0) - (api.btn('left', p) ? 1 : 0), dy = (api.btn('down', p) ? 1 : 0) - (api.btn('up', p) ? 1 : 0);
      const speed = dx && dy ? 78 : 110;
      c.x = clamp(c.x + dx * speed * dt, 8, 248); c.y = clamp(c.y + dy * speed * dt, 32, 175); c.cooldown = Math.max(0, c.cooldown - dt);
      if (api.btn('b', p) && !c.lastB) { c.battery = (c.battery + 1) % 3; api.sfx('select'); }
      c.lastB = api.btn('b', p);
      if (phase === 'wave' && api.btn('a', p)) fire(api, p);
    }
    if (phase === 'ready' || phase === 'resupply') {
      timer -= dt;
      if (timer <= 0) {
        if (wave >= waves) { finish(api, true); return; }
        if (phase === 'resupply') { const lost = cities.find(c => !c.alive); if (lost) { lost.alive = true; stats.restored++; } }
        startWave(api);
      }
    } else if (phase === 'wave') {
      spawnTimer -= dt;
      if (remaining > 0 && spawnTimer <= 0 && missiles.length < 18) { spawn(); spawnTimer = Math.max(0.48, 1.05 - wave * 0.09); }
      for (const r of rockets) {
        r.age += dt; const dx = r.tx - r.x, dy = r.ty - r.y, distance = Math.hypot(dx, dy), step = 205 * dt;
        if (distance <= step) { r.x = r.tx; r.y = r.ty; r.done = true; explosion(r.tx, r.ty, r.owner); api.sfx('hit'); }
        else { r.x += dx / distance * step; r.y += dy / distance * step; }
        r.trail.unshift({ x: r.x, y: r.y }); if (r.trail.length > 5) r.trail.pop();
      }
      rockets = rockets.filter(r => !r.done);
      explosions = explosions.filter(e => updateExplosion(e, dt));
      for (const m of missiles.slice()) {
        if (!m.alive) continue;
        m.x += m.vx * dt; m.y += m.vy * dt;
        const hit = explosions.find(e => Math.hypot(e.x - m.x, e.y - m.y) <= e.radius + 1.5);
        if (hit) {
          m.alive = false; stats.interceptions++; stats.killsByPlayer[hit.owner]++; if (hit.chain) stats.chainKills++;
          api.addScore(hit.chain ? 50 : 25, hit.owner); explosion(m.x, m.y, hit.owner, true); burst(m.x, m.y, 10); api.sfx('coin');
          if (typeof config.onIntercept === 'function') config.onIntercept({ player: hit.owner, chain: hit.chain, wave }, api);
          continue;
        }
        if (m.split && m.y >= 82 && missiles.length < 17) {
          m.alive = false; stats.splits++;
          const alive = cities.filter(c => c.alive); const nearest = alive.slice().sort((a, b) => Math.abs(a.x - m.tx) - Math.abs(b.x - m.tx));
          for (let i = 0; i < Math.min(2, nearest.length); i++) incoming(m.x + i * 3, m.y, nearest[i]);
          if (!nearest.length) incoming(m.x, m.y, { x: m.tx });
        } else if (m.y >= 191) { m.alive = false; impact(api, m); }
      }
      missiles = missiles.filter(m => m.alive);
      if (!cityCount()) { finish(api, false); return; }
      if (!remaining && !missiles.length && !rockets.length && !explosions.length) clearWave(api);
    }
    if (clock >= limit) finish(api, false);
  }
  function draw(api) {
    api.cls(0); api.text('WAVE ' + Math.max(1, wave) + '/' + waves, 9, 17, 10); api.text('CITIES ' + cityCount(), 180, 17, 6);
    for (let i = 0; i < 31; i++) api.pset(7 + (i * 73) % 242, 30 + (i * 41) % 130, i % 4 ? 1 : 5);
    for (const m of missiles) { api.line(m.sx, m.sy, m.x, m.y, 8); api.line(m.x - m.vx * 0.3, m.y - m.vy * 0.3, m.x, m.y, m.split ? 9 : 8); api.spr(ART.frames[m.split ? 'enemy-split' : 'enemy-' + (Math.floor(clock * 10) % 2)].pixels, m.x - 2, m.y - 2); }
    for (const e of explosions) {
      const frame = ART.frames[(e.chain ? 'chain' : 'blast') + '-' + e.owner + '-' + e.frame];
      api.spr(frame.pixels, e.x - frame.anchor.x, e.y - frame.anchor.y);
    }
    for (const r of rockets) { for (const t of r.trail) api.pset(t.x, t.y, r.owner ? 14 : 12); api.spr(ART.frames['rocket-' + r.owner + '-' + (Math.floor(r.age * 12) % 2)].pixels, r.x - 1, r.y - 2); }
    for (const p of particles) api.pset(p.x, p.y, p.color);
    api.line(0, 193, 255, 193, 3); api.rectfill(0, 194, 256, 17, 1);
    for (const c of cities) api.spr(ART.frames[c.alive ? 'city-' + c.style + '-' + (Math.floor(clock * 2) % 2) : 'city-ruin'].pixels, c.x - 7, 178);
    for (let i = 0; i < batteries.length; i++) {
      const b = batteries[i], key = !b.alive ? 'battery-ruin' : b.flash > 0 ? 'battery-fire' : !b.ammo ? 'battery-empty' : 'battery-idle';
      api.spr(ART.frames[key].pixels, b.x - 6, 182); api.text(String(b.ammo).padStart(2, '0'), b.x - 5, 199, b.ammo ? 7 : 5);
    }
    for (let p = 0; p < players; p++) {
      const c = cursors[p], b = batteries[c.battery], color = p ? 8 : 12;
      api.spr(ART.frames['cursor-' + p + '-' + (Math.floor(clock * 3) % 2)].pixels, c.x - 4, c.y - 4);
      api.text(String(p + 1), c.x > 236 ? c.x - 10 : c.x + 6, c.y - 3, color); api.line(b.x - 7, 211 + p, b.x + 7, 211 + p, color);
    }
    if (phase === 'ready' || phase === 'resupply') { api.rectfill(56, 95, 144, 23, 0); api.textCenter(phase === 'ready' ? 'DEFEND THE CITIES' : 'WAVE CLEAR', 100, 10); }
    api.textCenter('A: FIRE  B: BATTERY', 216, 6);
  }
  function inspect() { return JSON.parse(JSON.stringify({ phase, clock, wave, waves, players, remaining, cities, batteries, cursors, missiles, rockets, explosions, stats })); }
  return { init, update, draw, inspect };
}
