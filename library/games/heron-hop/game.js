const FROG_IDLE = [
  "................",
  "..77....77......",
  ".7b70..7b70.....",
  ".7b70bb7b70.....",
  "..bbbbbbbbbb....",
  "..b11bbbbbb3....",
  ".bb11bbbbbbb3...",
  ".bbbbbbbbbbb3...",
  "..bb99999bb3....",
  "..bbfffffbb3....",
  ".bbbfffffbbb3...",
  ".b3bfffffb3b3...",
  ".b3bbfffbb3b3...",
  "..3bbbbbbb33....",
  ".bb33bbb33bb....",
  "bbb.......bbb...",
  "333.......333...",
  "................"
];
const FROG_AIR = [
  "..77....77......",
  ".7b70..7b70.....",
  ".7b70bb7b70.....",
  "..bbbbbbbbbb....",
  "..b11bbbbbb3....",
  "..b11bbbbbb3....",
  ".bbbbbbbbbbb3...",
  "bb.b99999b.bb...",
  "b..bfffffb..b...",
  "...bfffffb......",
  "...bbfffbb......",
  "...3bbbbb3......",
  "..bb33b33bb.....",
  ".bb.......bb....",
  "bb.........bb...",
  "3b.........b3...",
  ".3.........3....",
  "................"
];
const FROG_LAND = [
  "................",
  "................",
  "................",
  "................",
  "..77....77......",
  ".7b70..7b70.....",
  ".7b70bb7b70.....",
  "..bbbbbbbbbb....",
  ".bb11bbbbbbb3...",
  ".bb11bbbbbbb3...",
  ".bbb99999bbb3...",
  ".bbbfffffbbb3...",
  "bbb3fffff3bbb...",
  "bb33bfffb33bb...",
  ".bbbbbbbbbbb....",
  "bbb.......bbb...",
  "333.......333...",
  "................"
];
const FROG_HURT = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "...77...77......",
  "..7887.7887.....",
  "..b88bbb88b.....",
  ".bbbbbbbbbbb....",
  ".b11bbbbbbbb3...",
  "bbb999999bbbb...",
  "bbbffffffbbbb...",
  ".b3ffffff3b3....",
  "bb3bbbbbb3bbb...",
  "bbb333333bbbb...",
  "333.......333...",
  "................",
  "................"
];
const SECTION_NAMES = [
  "THE QUIET REACH",
  "STEPPING STONES",
  "DRIFTING GARDENS",
  "NARROW WATERS",
  "WINGS OVER WATER",
  "THE LAST CROSSING"
];

let frog, pads, birds, effects, encounters, reeds;
let camera, lives, checkpoint, section, banner, ended, furthest;
let goalX, time, respawnTimer;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function approach(v, target, amount) {
  return v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
}
function init(api) {
  api.score(0);
  time = 0;
  camera = 0;
  lives = 3;
  checkpoint = 0;
  section = 0;
  banner = 2.8;
  ended = false;
  furthest = 30;
  respawnTimer = 0;
  pads = [];
  birds = [];
  effects = [];
  encounters = [];
  reeds = [];

  pads.push({ x: 25, base: 25, y: 178, w: 82, dx: 0, amp: 0, phase: 0,
    bank: true, visited: true, checkpoint: true, section: 0 });
  for (let i = 0; i < 42; i++) {
    const s = Math.floor(i / 7);
    const k = i % 7;
    let y = 178;
    if (s > 0) y = k % 2 === 0 ? 174 : 165;
    if (k >= 5) y = 176;
    const x = 88 + i * 43;
    pads.push({
      x: x, base: x, y: y, w: s === 0 || k === 0 || k >= 5 ? 38 : s < 3 ? 32 : 28,
      dx: 0, amp: s >= 2 && k > 0 && k < 5 ? 4 : 0,
      phase: i * 1.6, bank: false, visited: false,
      checkpoint: k === 0, section: s
    });
  }
  goalX = 1880;
  pads.push({ x: goalX + 110, base: goalX + 110, y: 176, w: 220,
    dx: 0, amp: 0, phase: 0, bank: true, visited: true, section: 5 });

  for (let s = 0; s < 6; s++) {
    encounters.push({ x: 88 + s * 301 + 56, section: s, count: s >= 4 ? 2 : 1, fired: false });
    if (s >= 2) encounters.push({
      x: 88 + s * 301 + 125, section: s, count: s === 5 ? 2 : 1, fired: false
    });
  }
  for (let i = 0; i < 38; i++) {
    reeds.push({ x: Math.random() * 360, h: 12 + Math.random() * 30,
      lean: Math.random() * 8 - 4, layer: i % 2 });
  }
  frog = {
    x: 30, y: 178, vx: 0, vy: 0, ground: 0, coyote: 0.1,
    buffer: 0, cut: false, land: 0, inv: 0, wounded: false, edge: 0
  };
}
function burst(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    if (effects.length >= 100) break;
    effects.push({
      x: x, y: y, vx: (Math.random() - 0.5) * speed,
      vy: -12 - Math.random() * speed, life: 0.35 + Math.random() * 0.35,
      max: 0.7, color: color, text: null
    });
  }
}
function popup(x, y, text, color) {
  effects.push({ x: x, y: y, vx: 0, vy: -16, life: 1,
    max: 1, color: color, text: text });
}
function hop(api) {
  frog.vy = -200;
  frog.ground = -1;
  frog.coyote = 0;
  frog.buffer = 0;
  frog.cut = true;
  frog.edge = 0;
  frog.land = 0;
  burst(frog.x, frog.y, 12, 4, 24);
  api.sfx("jump");
}
function loseLife(api) {
  if (respawnTimer > 0 || ended) return;
  lives--;
  burst(frog.x, Math.min(198, frog.y), 12, 18, 65);
  burst(frog.x, Math.min(196, frog.y), 7, 6, 38);
  api.sfx("die");
  api.shake(9);
  frog.ground = -1;
  if (lives <= 0 && api.t > 2) {
    ended = true;
    api.gameOver();
  } else {
    respawnTimer = 0.75;
  }
}
function hurt(api, bird) {
  if (frog.inv > 0 || bird.used || respawnTimer > 0) return;
  bird.used = true;
  bird.near = false;
  burst(frog.x, frog.y - 10, 7, 10, 65);
  burst(frog.x, frog.y - 9, 9, 5, 45);
  api.sfx("hit");
  api.shake(5);
  if (frog.wounded) {
    loseLife(api);
    return;
  }
  frog.wounded = true;
  frog.inv = 0.9;
  frog.vx = -60;
  frog.vy = -95;
  frog.ground = -1;
  frog.coyote = 0;
  frog.cut = false;
}
function spawnBird(api, s, n) {
  if (birds.length >= 3) return;
  const fromLeft = (s + n) % 2 === 1;
  const x = fromLeft ? camera - 20 : camera + 277;
  birds.push({
    x: x, y: 74 + n * 18, face: fromLeft ? 1 : -1,
    stageX: frog.x + (fromLeft ? -68 : 88),
    phase: "enter", timer: 0, warning: 1.05,
    vx: 0, vy: 0, speed: s === 0 ? 35 : Math.min(48, 38 + s * 2),
    used: false, near: false, rewarded: false, section: s,
    tx: 0, ty: 0, age: 0, seed: n * 2.7 + s
  });
  api.tone(260 + n * 70, 100, "triangle");
}
function retireBird(api, h) {
  if (h.phase === "leave") return;
  if (h.near && !h.used && !h.rewarded) {
    h.rewarded = true;
    api.addScore(300);
    api.sfx("coin");
    popup(frog.x, frog.y - 30, "+300", 10);
  }
  h.phase = "leave";
  h.timer = 0;
}
function update(api, dt) {
  if (ended) return;
  time = api.t;
  banner = Math.max(0, banner - dt);

  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life -= dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (!e.text) e.vy += 115 * dt;
    if (e.life <= 0) effects.splice(i, 1);
  }
  for (let i = 0; i < pads.length; i++) {
    const p = pads[i];
    const old = p.x;
    p.x = p.base + Math.sin(time * 1.3 + p.phase) * p.amp;
    p.dx = p.x - old;
  }

  if (respawnTimer > 0) {
    respawnTimer -= dt;
    if (respawnTimer <= 0) {
      const p = pads[checkpoint];
      frog.x = p.x;
      frog.y = p.y;
      frog.vx = 0;
      frog.vy = 0;
      frog.ground = checkpoint;
      frog.coyote = 0.1;
      frog.buffer = 0;
      frog.edge = 0;
      frog.inv = 0.9;
      frog.wounded = false;
      frog.cut = false;
      camera = Math.max(0, frog.x - 106);
      birds = [];
      api.sfx("powerup");
    }
    return;
  }

  frog.inv = Math.max(0, frog.inv - dt);
  frog.land = Math.max(0, frog.land - dt);
  frog.buffer = Math.max(0, frog.buffer - dt);
  if (api.btnp("a")) frog.buffer = 0.1;
  let steer = (api.btn("right") ? 1 : 0) - (api.btn("left") ? 1 : 0);
  if (api.btn("b")) frog.vx = approach(frog.vx, 0, 700 * dt);
  else frog.vx = approach(frog.vx, steer * 72, (steer ? 390 : 240) * dt);

  if (frog.ground >= 0) {
    const p = pads[frog.ground];
    frog.x += p.dx;
    frog.y = p.y;
    frog.coyote = 0.1;
    if (!p.bank && Math.abs(frog.x - p.x) > p.w / 2 - 5) {
      frog.edge += dt;
      const side = frog.x < p.x ? -1 : 1;
      if (!api.btn("b")) frog.x += side * 21 * dt;
      if (frog.edge > 0.25 && steer * side >= 0 && !api.btn("b")) {
        frog.ground = -1;
        frog.vy = 8;
      }
    } else frog.edge = 0;
  } else {
    frog.coyote = Math.max(0, frog.coyote - dt);
  }

  if (frog.buffer > 0 && (frog.ground >= 0 || frog.coyote > 0)) hop(api);
  if (frog.cut && !api.btn("a") && frog.vy < -85) {
    frog.vy *= 0.48;
    frog.cut = false;
  }
  frog.x = Math.max(5, frog.x + frog.vx * dt);
  const oldY = frog.y;

  if (frog.ground >= 0) {
    const p = pads[frog.ground];
    if (frog.x < p.x - p.w / 2 - 1 || frog.x > p.x + p.w / 2 + 1) {
      frog.ground = -1;
      frog.vy = 0;
      frog.edge = 0;
    }
  }
  if (frog.ground < 0) {
    frog.vy += 625 * dt;
    frog.y += frog.vy * dt;
    if (frog.vy >= 0) {
      for (let i = 0; i < pads.length; i++) {
        const p = pads[i];
        if (oldY <= p.y + 0.5 && frog.y >= p.y &&
            frog.x > p.x - p.w / 2 - 1 && frog.x < p.x + p.w / 2 + 1) {
          frog.y = p.y;
          frog.vy = 0;
          frog.ground = i;
          frog.coyote = 0.1;
          frog.edge = 0;
          frog.land = 0.13;
          burst(frog.x, frog.y + 1, 12, 5, 27);
          if (!p.visited) {
            p.visited = true;
            api.addScore(100);
            api.sfx("coin");
            if (p.checkpoint && i > checkpoint) {
              checkpoint = i;
              popup(p.x, p.y - 30, "SAFE", 11);
              api.tone(640, 90, "triangle");
            }
          } else api.tone(150, 35, "triangle");
          break;
        }
      }
    }
  }
  if (frog.y > 204) {
    loseLife(api);
    return;
  }

  furthest = Math.max(furthest, frog.x);
  const nextSection = clamp(Math.floor((furthest - 88) / 301), 0, 5);
  if (nextSection !== section) {
    section = nextSection;
    banner = 2.1;
    api.tone(420 + section * 50, 130, "triangle");
  }
  camera = Math.max(camera, frog.x - 112);
  camera = Math.min(camera, goalX - 116);

  if (frog.ground === pads.length - 1) {
    api.addScore(1000);
    burst(frog.x, frog.y - 14, 10, 24, 85);
    api.sfx("powerup");
    api.flash(7, 2);
    ended = true;
    api.win();
    return;
  }

  for (let i = 0; i < encounters.length; i++) {
    const e = encounters[i];
    if (!e.fired && frog.x >= e.x && api.t > 3.3) {
      e.fired = true;
      for (let n = 0; n < e.count; n++) spawnBird(api, e.section, n);
    }
  }

  for (let i = birds.length - 1; i >= 0; i--) {
    const h = birds[i];
    h.age += dt;
    h.timer += dt;
    const recoveryX = 88 + h.section * 301 + 216;
    if (frog.x > recoveryX || frog.x < 88 + h.section * 301 - 60) retireBird(api, h);

    if (h.phase === "enter") {
      h.x = approach(h.x, h.stageX, 48 * dt);
      if (Math.abs(h.x - h.stageX) < 1) {
        h.phase = "warn";
        h.timer = 0;
        h.tx = frog.x + frog.vx * 0.55;
        h.ty = 167;
        api.tone(720, 90, "square");
      }
    } else if (h.phase === "warn") {
      if (h.timer < 0.45) h.tx = frog.x + frog.vx * 0.55;
      if (h.timer >= h.warning) {
        let dx = h.tx - h.x;
        let dy = h.ty - h.y;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        h.vx = dx / length * h.speed;
        h.vy = dy / length * h.speed;
        h.face = dx >= 0 ? 1 : -1;
        h.phase = "dive";
        h.timer = 0;
        api.sfx("shoot");
      }
    } else if (h.phase === "dive") {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (!h.used) {
        const body = api.collide(frog.x - 5, frog.y - 14, 10, 13,
          h.x - 9, h.y - 9, 18, 16);
        const beakX = h.face > 0 ? h.x + 8 : h.x - 16;
        const beak = api.collide(frog.x - 5, frog.y - 14, 10, 13,
          beakX, h.y - 8, 8, 4);
        if (body || beak) hurt(api, h);
        else if (Math.abs(frog.x - h.x) < 24 &&
          frog.y - 9 - h.y > 18 && frog.y - 9 - h.y < 55) h.near = true;
      }
      if (h.y >= 190 || h.timer > 5) retireBird(api, h);
    } else {
      h.x += h.face * 27 * dt;
      h.y -= 39 * dt;
    }
    if (h.age > 11 || h.y < 27 || h.x < camera - 100 || h.x > camera + 380) {
      retireBird(api, h);
      birds.splice(i, 1);
    }
  }
}
function drawBank(api, p, goal) {
  const left = p.x - p.w / 2 - camera;
  api.rectfill(left, p.y + 3, p.w, 224 - p.y, 4);
  api.rectfill(left, p.y + 6, p.w, 7, 2);
  api.rectfill(left, p.y - 1, p.w, 5, 3);
  api.line(left, p.y - 1, left + p.w - 1, p.y - 1, 11);
  for (let i = 0; i < 15; i++) {
    const x = left + 4 + i * 13;
    if (x < -10 || x > 266) continue;
    api.line(x, p.y, x + 2, p.y - 6, 3);
    api.line(x + 2, p.y - 1, x + 5, p.y - 4, 11);
    api.line(x, p.y + 18, x + 4, p.y + 17, 5);
  }
  if (goal) {
    const x = goalX + 40 - camera;
    api.rectfill(x - 8, p.y - 6, 22, 6, 5);
    api.rectfill(x - 5, p.y - 10, 16, 4, 6);
    api.line(x + 3, p.y - 10, x + 3, p.y - 57, 7);
    const flutter = Math.sin(time * 6) * 2;
    api.rectfill(x + 4, p.y - 56, 22, 12, 11);
    api.line(x + 6, p.y - 54, x + 23, p.y - 54 + flutter, 10);
    api.text("HOME", x - 12, p.y - 75, 7);
    for (let i = 0; i < 4; i++) {
      const fx = x + 35 + i * 17;
      api.line(fx, p.y - 2, fx, p.y - 11, 11);
      api.circfill(fx, p.y - 12, 3, 14);
      api.pset(fx, p.y - 12, 10);
    }
  } else {
    const x = 12 - camera;
    api.line(x, p.y, x, p.y - 31, 4);
    api.rectfill(x - 5, p.y - 32, 30, 12, 4);
    api.line(x + 1, p.y - 26, x + 17, p.y - 26, 15);
    api.line(x + 13, p.y - 29, x + 17, p.y - 26, 15);
    api.line(x + 13, p.y - 23, x + 17, p.y - 26, 15);
  }
}
function drawPad(api, p, index) {
  const x = p.x - camera;
  if (x < -45 || x > 301) return;
  const w = p.w;
  const y = p.y;
  api.line(x - w / 2 + 2, y + 12, x + w / 2 - 2, y + 12, 3);
  api.line(x - w / 2 + 7, y + 14, x + w / 2 - 4, y + 14, 12);
  api.rectfill(x - w / 2 + 3, y + 2, w - 6, 7, 0);
  api.rectfill(x - w / 2, y + 1, w, 5, 3);
  api.rectfill(x - w / 2 + 2, y - 1, w - 4, 5, 11);
  api.line(x - w / 2 + 5, y - 2, x + w / 2 - 5, y - 2, 11);
  api.line(x - w / 2 + 4, y + 4, x + w / 2 - 3, y + 4, 3);
  api.line(x - 1, y + 1, x + w / 2 - 5, y - 1, 3);
  api.line(x - 1, y + 1, x - 9, y - 1, 10);
  api.line(x - 1, y + 1, x + 6, y + 3, 3);
  api.line(x + 3, y + 5, x + 8, y + 3, 1);
  if (p.checkpoint) {
    api.line(x - 10, y - 1, x - 12, y - 7, 3);
    api.circfill(x - 12, y - 9, 3, index === checkpoint ? 10 : 14);
    api.pset(x - 12, y - 10, 7);
  } else if (!p.visited) {
    api.pset(x - w / 2 + 5, y, 7);
  }
}
function birdLine(api, h, ax, ay, bx, by, color) {
  api.line(h.x - camera + ax * h.face, h.y + ay,
    h.x - camera + bx * h.face, h.y + by, color);
}
function drawBird(api, h) {
  const x = h.x - camera;
  const y = h.y;
  const f = h.face;
  const flap = Math.sin(time * (h.phase === "dive" ? 8 : 11) + h.seed);
  if (h.phase === "warn") {
    const tx = h.tx - camera;
    if (Math.floor(time * 9) % 2 === 0) {
      api.line(x, y + 13, x, y + 19, 10);
      api.pset(x, y + 22, 10);
    }
    for (let j = 1; j <= 5; j++) {
      const u = j / 6;
      api.pset(x + (tx - x) * u, y + (h.ty - y) * u, 5);
    }
    api.line(tx - 7, h.ty + 10, tx - 2, h.ty + 13, 9);
    api.line(tx + 7, h.ty + 10, tx + 2, h.ty + 13, 9);
  }
  birdLine(api, h, -6, 5, -13, 10, 15);
  birdLine(api, h, -4, 6, -10, 12, 4);
  api.circfill(x - 3 * f, y + 1, 6, 6);
  api.circfill(x - 2 * f, y, 4, 7);
  if (h.phase === "warn") {
    birdLine(api, h, -7, -2, 1, 5, 13);
    birdLine(api, h, -9, -1, -4, 5, 7);
    birdLine(api, h, -8, 2, -4, 6, 6);
  } else {
    const wingY = h.phase === "dive" ? -12 + flap * 2 : -8 + flap * 8;
    for (let k = 0; k < 4; k++) {
      birdLine(api, h, -3 + k, 0, -12 + k * 2, wingY + k, k === 0 ? 6 : 7);
      birdLine(api, h, -11 + k * 2, wingY + k, -14 + k * 2, wingY + 5 + k, 6);
    }
    birdLine(api, h, 0, -1, 7, wingY + 4, 13);
    birdLine(api, h, 1, -1, 8, wingY + 5, 7);
  }
  birdLine(api, h, 1, 3, 4, -2, 6);
  birdLine(api, h, 2, 3, 5, -2, 7);
  birdLine(api, h, 4, -2, 2, -6, 6);
  birdLine(api, h, 5, -2, 3, -6, 7);
  birdLine(api, h, 3, -6, 6, -9, 7);
  api.circfill(x + 6 * f, y - 8, 3, 7);
  birdLine(api, h, 8, -8, 15, -6, 10);
  birdLine(api, h, 8, -6, 15, -6, 9);
  api.pset(x + 7 * f, y - 9, 8);
  birdLine(api, h, 3, -10, -1, -11, 1);
}
function drawHeart(api, x, y, full) {
  const c = full ? 8 : 5;
  api.circfill(x + 2, y + 2, 2, c);
  api.circfill(x + 6, y + 2, 2, c);
  api.line(x, y + 3, x + 4, y + 7, c);
  api.line(x + 8, y + 3, x + 4, y + 7, c);
  api.rectfill(x + 2, y + 3, 5, 3, c);
  if (full) api.pset(x + 1, y + 1, 15);
}
function draw(api) {
  api.cls(1);

  api.circfill(211 - camera * 0.015, 54, 17, 3);
  api.circfill(211 - camera * 0.015, 53, 13, 1);
  api.line(0, 106, 255, 106, 3);
  api.rectfill(0, 107, 256, 20, 3);
  for (let i = 0; i < reeds.length; i++) {
    const r = reeds[i];
    const parallax = r.layer ? 0.26 : 0.11;
    const x = ((r.x - camera * parallax) % 360 + 360) % 360 - 35;
    const base = r.layer ? 127 : 111;
    const color = r.layer ? 3 : 5;
    const sway = Math.sin(time * 1.2 + i) * 1.5;
    api.line(x, base, x + r.lean + sway, base - r.h, color);
    api.line(x, base - 6, x - 5, base - r.h * 0.6, color);
    api.line(x, base - 9, x + 6, base - r.h * 0.72, color);
    if (i % 3 === 0) api.rectfill(x + r.lean + sway - 1, base - r.h - 5, 3, 7, color);
  }
  api.rectfill(0, 128, 256, 96, 1);
  for (let i = 0; i < 37; i++) {
    const x = ((i * 71 - camera * 0.55 + Math.sin(time * 0.7 + i) * 5) % 290 + 290) % 290 - 20;
    const y = 134 + (i * 23) % 87;
    api.line(x, y, x + 8 + i % 14, y, 3);
    if (i % 7 === 0) api.line(x + 2, y + 2, x + 7, y + 2, 5);
  }

  for (let i = 0; i < pads.length; i++) {
    if (pads[i].bank) drawBank(api, pads[i], i === pads.length - 1);
    else drawPad(api, pads[i], i);
  }

  for (let i = 0; i < birds.length; i++) {
    const h = birds[i];
    if (h.phase === "dive" || h.phase === "warn") {
      const sx = (h.phase === "warn" ? h.tx : h.x) - camera;
      api.line(sx - 9, 197, sx + 9, 197, 0);
      api.line(sx - 4, 199, sx + 4, 199, 3);
    }
  }

  if (respawnTimer <= 0 && !(frog.inv > 0 && Math.floor(time * 17) % 2 === 0)) {
    let sprite = FROG_IDLE;
    if (frog.inv > 0 && frog.wounded) sprite = FROG_HURT;
    else if (frog.ground < 0) sprite = FROG_AIR;
    else if (frog.land > 0 || (Math.abs(frog.vx) > 9 && Math.floor(time * 12) % 2 === 0)) sprite = FROG_LAND;
    api.spr(sprite, frog.x - camera - 8, frog.y - 17);
    if (frog.edge > 0.08) {
      api.pset(frog.x - camera - 11, frog.y - 11, 10);
      api.pset(frog.x - camera + 11, frog.y - 11, 10);
    }
  }

  for (let i = 0; i < birds.length; i++) drawBird(api, birds[i]);

  for (let i = 0; i < effects.length; i++) {
    const e = effects[i];
    const x = e.x - camera;
    if (e.text) api.text(e.text, x - e.text.length * 4, e.y, e.color);
    else {
      api.pset(x, e.y, e.color);
      if (e.life > 0.25) api.pset(x + 1, e.y, e.color);
    }
  }

  api.rectfill(0, 12, 256, 19, 1);
  for (let i = 0; i < 3; i++) drawHeart(api, 7 + i * 14, 17, i < lives);
  api.text(frog.wounded ? "HURT" : "HERON HOP", 55, 17, frog.wounded ? 9 : 11);
  api.text((section + 1) + "/6", 224, 17, 7);
  api.line(7, 31, 248, 31, 3);
  api.line(7, 31, 7 + clamp(furthest / goalX, 0, 1) * 241, 31, 11);
  if (banner > 0) {
    api.textCenter(SECTION_NAMES[section], 40, banner < 0.4 ? 5 : 6);
  }
  if (respawnTimer > 0) api.textCenter("BACK TO THE LILY", 79, 7);
}
