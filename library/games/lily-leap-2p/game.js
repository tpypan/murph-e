// LILY LEAP — a shared-screen pond crossing for two players.
const SECTION_NAMES = [
  "STILL WATER", "DRIFTING GARDEN", "HERON REACH",
  "REED REST", "THE LAST CROSSING"
];
const PAD_COUNTS = [10, 12, 13, 11, 14];
const GRAVITY = 625;
const JUMP_SPEED = 200;
const HOP_SPEED = 68.75;

let frogs, pads, birds, particles, messages, scenery;
let section, sectionTime, camera, worldWidth, nextBird, birdSide;
let pairDelay, clearTime, finished, calmUntil, helpTime;

function init(api) {
  api.score(0, 0);
  api.score(0, 1);
  frogs = [];
  for (let i = 0; i < 2; i++) {
    frogs.push({
      x: 0, y: 0, vx: 0, vy: 0, pad: 0, lastPad: 0,
      lives: 3, inv: 0, splash: 0, air: false, jumpTime: 0,
      face: 1, pose: 0, buffer: 0, rescue: -1, finish: false,
      walk: 0, blocked: false
    });
  }
  pads = [];
  birds = [];
  particles = [];
  messages = [];
  scenery = [];
  for (let i = 0; i < 42; i++) {
    scenery.push({
      x: api.rnd(680), y: 99 + api.rnd(117),
      size: 2 + api.rnd(8), phase: api.rnd(6.283)
    });
  }
  section = 0;
  camera = 0;
  finished = false;
  calmUntil = 0;
  helpTime = 0;
  enterSection(api);
}

function enterSection(api) {
  sectionTime = 0;
  clearTime = 0;
  camera = 0;
  birds = [];
  particles = [];
  messages = [];
  pads = [];
  pairDelay = -1;
  birdSide = section % 2 === 0 ? 1 : -1;
  nextBird = section === 0 ? 8 : 5;
  if (section === 3) calmUntil = api.t + 8;

  const count = PAD_COUNTS[section];
  worldWidth = 40 * (count - 1) + 94;
  for (let j = 0; j < count; j++) {
    const safe = j % 3 === 0 || j === count - 1;
    const stagger = section >= 2 && section !== 3 ? (j % 3 - 1) * 6 : 0;
    const moving = section !== 0 && section !== 3 && !safe;
    const y = 159 + stagger;
    pads.push({
      baseX: 42 + j * 40, baseY: y,
      x: 42 + j * 40, y: y, oldX: 42 + j * 40, oldY: y,
      w: safe ? 36 : 32, safe: safe, moving: moving,
      phase: j * 0.71, visited: [false, false],
      landed: [-99, -99], sync: false, bounce: 0
    });
  }
  for (let i = 0; i < 2; i++) {
    const p = frogs[i];
    p.x = pads[0].x + (i === 0 ? -8 : 8);
    p.y = pads[0].y;
    p.vx = p.vy = 0;
    p.pad = p.lastPad = 0;
    p.air = false;
    p.splash = 0;
    p.inv = Math.max(p.inv, 0.8);
    p.pose = 0;
    p.buffer = 0;
    p.finish = false;
    p.blocked = false;
    if (p.rescue >= 0) p.rescue = 3;
    pads[0].visited[i] = true;
  }
}

function burst(api, x, y, color, amount, splash) {
  for (let j = 0; j < amount; j++) {
    if (particles.length >= 110) particles.shift();
    const angle = api.rnd(Math.PI * 2);
    const speed = 15 + api.rnd(splash ? 65 : 35);
    particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: splash ? -20 - api.rnd(70) : Math.sin(angle) * speed,
      life: 0.35 + api.rnd(0.4), max: 0.75, color: color,
      gravity: splash ? 180 : 35
    });
  }
}

function notice(text, x, y, color) {
  if (messages.length >= 12) messages.shift();
  messages.push({ text: text, x: x, y: y, life: 1.25, color: color });
}

function hurt(api, index, water) {
  const p = frogs[index];
  if (p.splash > 0 || (!water && p.inv > 0) || finished || clearTime > 0) return;
  p.lives--;
  p.splash = 0.68;
  p.air = false;
  p.pad = -1;
  p.vx = p.vy = 0;
  p.buffer = 0;
  p.finish = false;
  p.inv = 1.48;
  helpTime = 5;
  p.rescue = pads.length - 1;
  for (let j = p.lastPad + 1; j < pads.length; j++) {
    if (pads[j].safe) {
      p.rescue = j;
      break;
    }
  }
  burst(api, p.x, water ? 177 : p.y - 10, water ? 12 : 10, 18, true);
  notice(water ? "SPLASH!" : "OUCH!", p.x, p.y - 31, water ? 6 : 9);
  api.sfx(water ? "die" : "hit");
  api.shake(5);
  if (p.lives <= 0 && api.t > 2) {
    finished = true;
    api.gameOver();
  }
}

function land(api, index, padIndex) {
  const p = frogs[index];
  const pad = pads[padIndex];
  p.air = false;
  p.pad = p.lastPad = padIndex;
  p.x += (pad.x - p.x) * 0.17;
  p.y = pad.y;
  p.vx = p.vy = 0;
  p.pose = 0.13;
  pad.bounce = 0.25;
  pad.landed[index] = api.t;
  burst(api, p.x, p.y - 2, 11, 5, false);

  if (!pad.visited[index]) {
    pad.visited[index] = true;
    api.addScore(100, index);
    notice("+100", p.x, p.y - 27, index === 0 ? api.P1 : api.P2);
    api.sfx("coin");
  } else {
    api.tone(190 + index * 45, 35, "triangle");
  }
  if (!pad.sync && Math.abs(pad.landed[0] - pad.landed[1]) <= 1.5) {
    pad.sync = true;
    api.addScore(250);
    notice("TOGETHER +250", pad.x, pad.y - 48, 10);
    burst(api, pad.x, pad.y - 15, 10, 12, false);
    api.sfx("powerup");
  }
}

function spawnHeron(api) {
  if (birds.length >= 2 || section === 3 || api.t < calmUntil) return;
  let target = birdSide > 0 ? 0 : 1;
  if (frogs[target].splash > 0) target = 1 - target;
  const p = frogs[target];
  const targetPad = pads[Math.max(0, p.lastPad)];
  const tx = api.clamp(p.x + (p.air ? p.vx * 0.3 : 0), camera + 28, camera + 228);
  const ty = targetPad.y;
  birds.push({
    phase: "warn", age: 0, direction: birdSide,
    sx: tx - birdSide * 116, sy: ty - 70,
    ex: tx + birdSide * 116, ey: ty + 38,
    tx: tx, ty: ty, x: tx - birdSide * 116, y: ty - 70
  });
  birdSide *= -1;
  api.tone(610, 95, "triangle");
}

function update(api, dt) {
  if (finished) return;
  sectionTime += dt;
  helpTime = Math.max(0, helpTime - dt);

  for (let j = 0; j < pads.length; j++) {
    const pad = pads[j];
    pad.oldX = pad.x;
    pad.oldY = pad.y;
    pad.x = pad.baseX + (pad.moving ? Math.sin(sectionTime * 0.95 + pad.phase) * 3 : 0);
    pad.y = pad.baseY + (pad.moving ? Math.sin(sectionTime * 1.25 + pad.phase) * 2 : 0);
    pad.bounce = Math.max(0, pad.bounce - dt);
  }

  for (let i = 0; i < 2; i++) {
    const p = frogs[i];
    p.inv = Math.max(0, p.inv - dt);
    p.pose = Math.max(0, p.pose - dt);
    p.buffer = Math.max(0, p.buffer - dt);
    p.blocked = false;
    if (api.btnp("a", i)) p.buffer = 0.11;

    if (p.splash > 0) {
      p.splash -= dt;
      if (p.splash <= 0) {
        const pad = pads[p.lastPad];
        p.x = pad.x + (i === 0 ? -6 : 6);
        p.y = pad.y;
        p.pad = p.lastPad;
        p.inv = 0.8;
        p.pose = 0.15;
      }
      continue;
    }

    let direction = (api.btn("right", i) ? 1 : 0) - (api.btn("left", i) ? 1 : 0);
    if (direction !== 0) p.face = direction;
    if (!p.air && p.pad >= 0) {
      const pad = pads[p.pad];
      p.x += pad.x - pad.oldX;
      p.y = pad.y;
      p.x += direction * 39 * dt;
      p.x = api.clamp(p.x, pad.x - pad.w / 2 - 1, pad.x + pad.w / 2 + 1);
      p.walk += Math.abs(direction) * dt * 12;
      if (p.buffer > 0) {
        p.air = true;
        p.pad = -1;
        p.vy = -JUMP_SPEED;
        p.vx = direction * HOP_SPEED;
        p.jumpTime = 0;
        p.buffer = 0;
        api.sfx("jump");
        burst(api, p.x, p.y, 6, 4, false);
      }
    }

    if (p.air) {
      const oldY = p.y;
      p.jumpTime += dt;
      p.x += p.vx * dt;
      // Analytic displacement preserves the 0.32 s / 32 px jump.
      p.y += p.vy * dt + 0.5 * GRAVITY * dt * dt;
      p.vy += GRAVITY * dt;
      p.x = api.clamp(p.x, 12, worldWidth - 14);

      if (p.vy > 0) {
        let landing = -1;
        let bestY = 1000;
        for (let j = 0; j < pads.length; j++) {
          const pad = pads[j];
          if (Math.abs(p.x - pad.x) < pad.w / 2 + 4 &&
              oldY <= pad.oldY + 0.4 && p.y >= pad.y &&
              pad.y < bestY) {
            landing = j;
            bestY = pad.y;
          }
        }
        if (landing >= 0) land(api, i, landing);
      }
      if (p.air && p.y > 191) hurt(api, i, true);
    }

    // A gentle screen-width tether keeps the shared camera fair to the rear frog.
    const partner = frogs[1 - i];
    const limit = partner.x + 178;
    if (p.x > limit) {
      p.x = limit;
      p.blocked = true;
    }

    const last = pads.length - 1;
    if (!p.air && p.pad === last && p.x >= pads[last].x - 9) {
      if (!p.finish) {
        p.finish = true;
        api.sfx("select");
        burst(api, pads[last].x + 7, pads[last].y - 35, 10, 9, false);
      }
    }
  }

  // Reuniting on a reed-marked safe pad restores a recently lost life.
  if (frogs[0].splash <= 0 && frogs[1].splash <= 0 &&
      !frogs[0].air && !frogs[1].air &&
      frogs[0].pad >= 0 && frogs[0].pad === frogs[1].pad) {
    const id = frogs[0].pad;
    if (pads[id].safe) {
      for (let i = 0; i < 2; i++) {
        const p = frogs[i];
        if (p.rescue >= 0 && id >= p.rescue && p.lives > 0) {
          p.lives = Math.min(3, p.lives + 1);
          p.rescue = -1;
          notice("REVIVED!", pads[id].x, pads[id].y - 43, 14);
          burst(api, p.x, p.y - 12, 14, 14, false);
          api.sfx("powerup");
          helpTime = 0;
        }
      }
    }
  }

  const low = Math.min(frogs[0].x, frogs[1].x);
  const high = Math.max(frogs[0].x, frogs[1].x);
  const wanted = api.clamp((low + high) * 0.5 - 120, 0, worldWidth - 256);
  camera += (wanted - camera) * Math.min(1, dt * 6);
  camera = api.clamp(camera, Math.max(0, high - 234), Math.max(0, low - 20));
  camera = api.clamp(camera, 0, worldWidth - 256);

  if (!clearTime && section !== 3 && sectionTime >= nextBird && api.t >= calmUntil) {
    spawnHeron(api);
    if (section === 2 || section === 4) pairDelay = 1.65;
    nextBird = sectionTime + (section === 0 ? 9 : section === 1 ? 7 : 8.5);
  }
  if (pairDelay >= 0) {
    pairDelay -= dt;
    if (pairDelay < 0 && !clearTime) spawnHeron(api);
  }

  for (let b = birds.length - 1; b >= 0; b--) {
    const bird = birds[b];
    bird.age += dt;
    if (bird.phase === "warn") {
      bird.x = bird.sx;
      bird.y = bird.sy + Math.sin(bird.age * 12) * 3;
      if (bird.age >= 1.2) {
        bird.phase = "swoop";
        bird.age = 0;
        api.sfx("shoot");
      }
    } else {
      const u = bird.age / 1.6;
      bird.x = bird.sx + (bird.ex - bird.sx) * u;
      bird.y = bird.sy + (bird.ey - bird.sy) * u;
      for (let i = 0; i < 2; i++) {
        const p = frogs[i];
        if (p.splash <= 0 && p.inv <= 0 &&
            Math.abs(p.x - bird.x) < 17 &&
            Math.abs((p.y - 11) - bird.y) < 14) {
          hurt(api, i, false);
        }
      }
      if (u > 1.25) birds.splice(b, 1);
    }
  }

  for (let j = particles.length - 1; j >= 0; j--) {
    const p = particles[j];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    if (p.life <= 0 || p.y > 228) particles.splice(j, 1);
  }
  for (let j = messages.length - 1; j >= 0; j--) {
    messages[j].life -= dt;
    messages[j].y -= dt * 11;
    if (messages[j].life <= 0) messages.splice(j, 1);
  }

  if (!finished && frogs[0].finish && frogs[1].finish && clearTime === 0) {
    clearTime = 0.001;
    birds = [];
    pairDelay = -1;
    api.addScore(1000);
    api.sfx("powerup");
    burst(api, pads[pads.length - 1].x, 120, 10, 26, false);
  }
  if (clearTime > 0) {
    clearTime += dt;
    if (clearTime > 1.15) {
      section++;
      if (section >= 5) {
        finished = true;
        api.win();
      } else {
        enterSection(api);
        api.tone(440, 110, "triangle");
      }
    }
  }
}

function drawHeart(api, x, y, color) {
  api.circfill(x + 2, y + 2, 2, color);
  api.circfill(x + 6, y + 2, 2, color);
  api.line(x, y + 3, x + 4, y + 7, color);
  api.line(x + 8, y + 3, x + 4, y + 7, color);
  api.rectfill(x + 2, y + 2, 5, 4, color);
}

function drawBackground(api) {
  api.rectfill(0, 12, 256, 73, 1);
  api.circfill(215, 43, 13, 13);
  api.circfill(210, 39, 13, 1);
  for (let j = 0; j < 10; j++) {
    const x = j * 34 - (camera * 0.16 % 34);
    api.line(x + 13, 50, x + 10, 87, 2);
    api.line(x + 13, 64, x + 3, 52, 2);
    api.circfill(x + 8, 54 + (j % 3) * 5, 16, 3);
    api.circfill(x + 22, 60 + (j % 2) * 5, 13, 3);
    api.circfill(x + 11, 50 + (j % 3) * 5, 10, 1);
  }
  api.rectfill(0, 80, 256, 144, 1);
  api.line(0, 86, 255, 86, 3);
  for (let j = 0; j < 28; j++) {
    const x = j * 11 - (camera * 0.32 % 11);
    const sway = Math.sin(api.t * 1.5 + j) * 2;
    const y = 82 + j % 4;
    api.line(x, y + 9, x + sway - 3, y - 9 - j % 5, 3);
    api.line(x + 1, y + 8, x + sway + 5, y - 3, 3);
  }
  for (let j = 0; j < scenery.length; j++) {
    const s = scenery[j];
    const x = ((s.x - camera * 0.55) % 290 + 290) % 290 - 17;
    const shimmer = Math.sin(api.t * 1.4 + s.phase) * 2;
    api.line(x, s.y, x + s.size + shimmer, s.y, s.y < 140 ? 5 : 3);
    if (j % 6 === 0) {
      api.circfill(x + 5, s.y + 4, 4, 3);
      api.line(x + 5, s.y + 4, x + 10, s.y + 2, 1);
      api.pset(x + 4, s.y + 2, 5);
    }
  }
  // Quiet, dark foreground foliage.
  for (let j = 0; j < 13; j++) {
    const x = j * 23 - (camera * 1.12 % 23);
    const h = 7 + j % 4 * 3;
    api.line(x, 224, x + Math.sin(api.t + j) * 2 - 4, 224 - h, 3);
    api.line(x + 1, 224, x + 6, 218 - h, 3);
    if (j % 3 === 0) api.rectfill(x + 5, 211 - h, 3, 8, 4);
  }
}

function drawPad(api, pad, index) {
  const x = pad.x - camera;
  if (x < -30 || x > 286) return;
  const bounce = Math.sin(pad.bounce * 27) * pad.bounce * 4;
  const y = pad.y + bounce;
  const r = pad.w / 2;
  api.line(x - r - 3, y + 8, x + r + 3, y + 8, 5);
  api.line(x - r + 2, y + 10, x + r - 2, y + 10, 1);
  api.circfill(x - r + 7, y + 1, 7, 3);
  api.circfill(x + r - 7, y + 1, 7, 3);
  api.rectfill(x - r + 7, y - 6, pad.w - 14, 14, 3);
  api.line(x - r + 5, y - 5, x + r - 5, y - 5, 11);
  api.line(x - r + 2, y - 2, x - r + 5, y - 5, 11);
  api.line(x - r + 6, y - 3, x + r - 7, y - 3, 11);
  api.line(x - 1, y + 1, x - r + 6, y - 1, 5);
  api.line(x - 1, y + 1, x + 7, y - 3, 5);
  api.line(x, y + 1, x + r, y + 6, 1);
  api.line(x, y + 2, x + r - 1, y + 7, 1);
  if (pad.sync) {
    api.pset(x - 3, y + 4, 10);
    api.pset(x + 1, y + 5, 10);
  }
  for (let i = 0; i < 2; i++) {
    if (pad.visited[i]) api.rectfill(x - 7 + i * 10, y + 5, 4, 2, i === 0 ? api.P1 : api.P2);
  }
  if (pad.safe && index !== pads.length - 1) {
    api.line(x - r + 6, y, x - r + 4, y - 13, 11);
    api.rectfill(x - r + 3, y - 17, 3, 6, 9);
    api.pset(x - r + 3, y - 17, 10);
  }
  if (index === pads.length - 1) {
    const sway = Math.sin(api.t * 2) * 2;
    api.line(x + 8, y, x + 8 + sway, y - 49, 11);
    api.line(x + 8, y - 15, x + 17, y - 25, 11);
    api.line(x + 8, y - 22, x - 1, y - 33, 3);
    api.rectfill(x + 6 + sway, y - 51, 5, 13, 9);
    api.rectfill(x + 6 + sway, y - 51, 2, 9, 10);
    api.text("FINISH", x - 22, y - 65, 10);
    api.circfill(x - 3, y - 42, 3, frogs[0].finish ? api.P1 : 5);
    api.circfill(x + 20, y - 42, 3, frogs[1].finish ? api.P2 : 5);
  }
}

function drawFrog(api, p, index) {
  let x = p.x - camera;
  let y = p.y;
  const accent = index === 0 ? api.P1 : api.P2;
  if (p.splash > 0) {
    const r = (0.68 - p.splash) * 25;
    api.line(x - r, 181, x + r, 181, 12);
    api.line(x - r + 3, 185, x + r - 3, 185, 6);
    if (p.splash > 0.4) {
      api.circfill(x - 4, 175, 3, 11);
      api.circfill(x + 4, 175, 3, 11);
      api.pset(x - 4, 174, 7);
      api.pset(x + 4, 174, 7);
    }
    return;
  }
  if (Math.abs(frogs[0].x - frogs[1].x) < 8 &&
      Math.abs(frogs[0].y - frogs[1].y) < 9) x += index === 0 ? -4 : 4;

  api.line(x - 6, pads[p.lastPad].y + 3, x + 6, pads[p.lastPad].y + 3, 0);
  if (p.inv > 0 && Math.floor(api.frame / 5) % 2 === 0) {
    api.circ(x, y - 11, 13, accent);
  }

  const air = p.air && p.jumpTime > 0.06;
  const crouch = p.pose > 0 || (p.air && p.jumpTime <= 0.06);
  const bob = !p.air && !crouch ? Math.sin(api.t * 4 + index) * 0.65 : 0;
  y += bob;
  const body = index === 0 ? 11 : 12;
  const shadow = index === 0 ? 3 : 1;
  const throat = index === 0 ? 10 : 15;
  const scarf = index === 0 ? 8 : 12;
  const headY = y - (crouch ? 12 : air ? 18 : 17);
  const bodyY = y - (crouch ? 5 : 8);
  const step = Math.sin(p.walk) * 2;
  const legY = air ? y - 1 : y - 2;
  const spread = air ? 10 : index === 0 ? 7 : 9;

  // Bent thighs, little webbed toes, belly and hands.
  api.circfill(x - 6, bodyY + 2, 4, shadow);
  api.circfill(x + 6, bodyY + 2, 4, shadow);
  api.line(x - 6, bodyY + 2, x - spread, legY + (air ? 2 : step), body);
  api.line(x + 6, bodyY + 2, x + spread, legY - (air ? 0 : step), body);
  api.line(x - spread - 2, legY + (air ? 2 : step), x - spread + 3, legY + 1, body);
  api.line(x + spread - 3, legY + 1, x + spread + 2, legY - (air ? 0 : step), body);
  api.circfill(x, bodyY, crouch ? 7 : 6, shadow);
  api.circfill(x, bodyY - 1, 5, body);
  api.circfill(x, bodyY, 4, throat);
  api.line(x - 5, bodyY - 4, x - 8, bodyY + (air ? -4 : 3), body);
  api.line(x + 5, bodyY - 4, x + 8, bodyY + (air ? -5 : 3), body);

  // Broad frog head, raised eyes and a curved smiling mouth.
  api.circfill(x, headY + 2, index === 0 ? 7 : 8, shadow);
  api.rectfill(x - 6, headY - 1, 13, 7, body);
  api.circfill(x - 5, headY - 3, index === 0 ? 4 : 3, body);
  api.circfill(x + 5, headY - 3, index === 0 ? 4 : 3, body);
  api.circfill(x - 5, headY - 3, 2, 7);
  api.circfill(x + 5, headY - 3, 2, 7);
  api.rectfill(x - 5 + p.face, headY - 4, 1, 3, 0);
  api.rectfill(x + 5 + p.face, headY - 4, 1, 3, 0);
  api.line(x - 4, headY + 4, x + 4, headY + 4, shadow);
  api.pset(x - 5, headY + 3, shadow);
  api.pset(x + 5, headY + 3, shadow);
  api.pset(x - 7, headY + 1, index === 0 ? 10 : 11);
  api.pset(x + 7, headY + 1, index === 0 ? 10 : 11);

  // Different scarf tails and cabinet-colour shoulder bands.
  api.rectfill(x - 5, headY + 6, 11, 2, scarf);
  api.line(x - p.face * 4, headY + 7, x - p.face * (air ? 12 : 9), headY + (air ? 3 : 10), scarf);
  api.line(x - p.face * 5, headY + 7, x - p.face * 9, headY + (air ? 4 : 11), scarf);
  api.rectfill(x + 5, bodyY - 3, 3, 3, accent);
  api.text(index === 0 ? "1" : "2", x - 3, headY - 18, accent);
  if (p.blocked) api.text("WAIT", api.clamp(x - 16, 0, 224), headY - 29, 10);
}

function drawHeron(api, bird) {
  const x = bird.x - camera;
  const y = bird.y;
  const d = bird.direction;
  const wingUp = Math.sin(api.t * (bird.phase === "warn" ? 15 : 10)) > 0;
  api.line(x - 13, bird.ty + 8, x + 13, bird.ty + 8, 0);
  api.line(x - 8, bird.ty + 10, x + 8, bird.ty + 10, 5);

  if (bird.phase === "warn") {
    for (let k = 0; k < 14; k++) {
      const u = k / 13;
      const lx = bird.sx + (bird.ex - bird.sx) * u - camera;
      const ly = bird.sy + (bird.ey - bird.sy) * u;
      api.line(lx, ly, lx + d * 4, ly + 2, Math.floor(api.t * 7) % 2 ? 9 : 5);
    }
    api.circ(bird.tx - camera, bird.ty - 11, 15, 9);
    api.line(bird.tx - camera - 8, bird.ty + 7, bird.tx - camera + 8, bird.ty + 7, 9);
    api.text("!", api.clamp(x - 4, 4, 244), y - 27, 10);
  }

  api.line(x - d * 7, y + 3, x - d * 18, y + 10, 0);
  api.line(x - d * 6, y + 5, x - d * 14, y + 12, 0);
  api.circfill(x - d * 3, y, 7, 6);
  api.line(x - d * 8, y + 2, x - d * 15, y - 1, 7);
  for (let f = 0; f < 5; f++) {
    const tipX = x - d * (2 + f * 2);
    const tipY = wingUp ? y - 18 + f : y + 13 - f;
    api.line(x - d * 2 + f, y - 2, tipX, tipY, f < 3 ? 7 : 6);
    api.line(x - d * 1 + f, y - 2, tipX + 1, tipY, 7);
  }
  api.line(x + d * 3, y - 1, x + d * 8, y - 9, 7);
  api.line(x + d * 4, y, x + d * 9, y - 8, 7);
  api.circfill(x + d * 10, y - 9, 4, 7);
  api.line(x + d * 9, y - 13, x + d * 12, y - 13, 8);
  api.pset(x + d * 12, y - 10, 0);
  api.line(x + d * 13, y - 8, x + d * 23, y - 5, 0);
  api.line(x + d * 13, y - 7, x + d * 22, y - 5, 0);
}

function draw(api) {
  api.cls(1);
  drawBackground(api);

  for (let j = 0; j < pads.length; j++) drawPad(api, pads[j], j);
  for (let i = 0; i < 2; i++) drawFrog(api, frogs[i], i);
  for (let j = 0; j < birds.length; j++) drawHeron(api, birds[j]);

  for (let j = 0; j < particles.length; j++) {
    const p = particles[j];
    api.rectfill(p.x - camera, p.y, p.life > 0.3 ? 2 : 1, 2, p.color);
  }
  for (let j = 0; j < messages.length; j++) {
    const m = messages[j];
    const width = api.textWidth(m.text);
    api.text(m.text, api.clamp(m.x - camera - width / 2, 2, 254 - width), m.y, m.color);
  }

  // Compact game-specific status, below the cabinet's score strip.
  api.rectfill(0, 12, 256, 17, 1);
  api.text("1", 4, 16, api.P1);
  api.text("2", 199, 16, api.P2);
  for (let i = 0; i < 2; i++) {
    for (let h = 0; h < 3; h++) {
      drawHeart(api, (i === 0 ? 16 : 212) + h * 12, 16,
        h < frogs[i].lives ? (i === 0 ? api.P1 : api.P2) : 5);
    }
  }
  api.textCenter("POND " + Math.min(5, section + 1) + "/5", 16, 7);
  if (sectionTime < 3.2 && clearTime === 0) {
    api.textCenter(SECTION_NAMES[Math.min(section, 4)], 35, section === 3 ? 11 : 6);
  }

  for (let j = 0; j < 5; j++) {
    api.rectfill(101 + j * 11, 199, 8, 3, j < section ? 11 : j === section ? 10 : 5);
  }
  if (clearTime > 0) {
    api.rectfill(38, 55, 180, 28, 1);
    api.rect(38, 55, 180, 28, 11);
    api.textCenter("POND CLEAR!", 59, 10);
    api.textCenter("TEAM +1000", 71, 7);
  } else if (helpTime > 0) {
    api.textCenter("MEET AT REEDS TO REVIVE", 210, 14);
  } else if (frogs[0].finish || frogs[1].finish) {
    api.textCenter("BRING YOUR PARTNER!", 210, 10);
  } else if (section === 3 && sectionTime < 8) {
    api.textCenter("QUIET WATER", 210, 11);
  } else {
    api.textCenter("LILY LEAP", 210, 6);
  }
}
