const PENGUIN_SLIDE = [
  "......000000......",
  "....0000000000....",
  "...000777777000...",
  "...007777777700...",
  "..00077077077000..",
  "..00077077077000..",
  "..00077799777000..",
  "...007799997700...",
  "...000777777000...",
  "..00000777700000..",
  ".0000777777770000.",
  "000077777777770000",
  "000077777777770000",
  ".0007777777777000.",
  "..00777777777700..",
  "...077777777770...",
  "...007777777700...",
  "....0000000000....",
  "....999....999....",
  "...9999....9999..."
];
const PENGUIN_BRAKE = [
  "......000000......",
  "....0000000000....",
  "...000777777000...",
  "...007777777700...",
  "...007707707700...",
  "...007707707700...",
  "...007779977700...",
  "....0779999770....",
  "000000777777000000",
  "000000077770000000",
  ".0007777777777000.",
  "..00777777777700..",
  "..00777777777700..",
  "..00777777777700..",
  "...077777777770...",
  "...007777777700...",
  "....0000000000....",
  "..99990000009999..",
  ".99999......99999.",
  "..999........999.."
];
const PENGUIN_HURT = [
  "..................",
  "..................",
  "....0000000000....",
  "..00007777770000..",
  ".0007777777777000.",
  "000777777777777000",
  "007777077770777700",
  "007777707707777700",
  "007777077770777700",
  "000777779977777000",
  ".0007779999777000.",
  "..00077777777000..",
  "000000077770000000",
  "000077777777770000",
  "..00777777777700..",
  "...007777777700...",
  "....0000000000....",
  "...9999....9999...",
  "..9999......9999..",
  ".................."
];
const FISH = [
  "..cc..",
  ".c77c.",
  "c7777c",
  ".c7c70",
  "..cc..",
  ".c..c."
];
const FISH_SPARK = [
  "..c7..",
  ".c77c.",
  "c7777c",
  ".c7c70",
  "..cc..",
  ".c..c."
];
const SEAL_CLOSED = [
  "....................",
  "........555555......",
  "....555555555555....",
  "..555555555555555...",
  ".55555555555557555..",
  "555555555555557055..",
  "5555566666666555555.",
  ".5556666666666555555",
  "..55666666666655500.",
  "...556666666655555..",
  "..555555555555555...",
  ".5555..55555..555...",
  "555....555....55....",
  "...................."
];
const SEAL_OPEN = [
  "....................",
  "........555555......",
  "....555555555555....",
  "..555555555555555...",
  ".555555555555575555.",
  "55555555555555705557",
  "55555666666665550000",
  ".5556666666666502222",
  "..556666666666502222",
  "...55666666665507777",
  "..55555555555555555.",
  ".5555..55555..555...",
  "555....555....55....",
  "...................."
];

let penguins, fish, seals, cracks, particles;
let stage, hearts, remaining, clock, stageTime, camera;
let chain, chainTime, clearTime, mode, teamGuard, lastSecond;
let bumpCooldown, hintTime;
const WORLD_H = 600;
const VIEW_H = 170;
const WORLD_TOP = 42;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function worldY(y) {
  return y - camera + WORLD_TOP;
}
function burst(x, y, color, count) {
  for (let i = 0; i < count && particles.length < 100; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 12 + Math.random() * 38;
    particles.push({
      x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.3 + Math.random() * 0.35, color: color
    });
  }
}
function makeStage(api) {
  hearts = 3;
  clock = 105 + stage * 5;
  stageTime = 0;
  chain = 0;
  chainTime = 0;
  teamGuard = 0;
  clearTime = 0;
  bumpCooldown = 0;
  hintTime = 5;
  lastSecond = -1;
  camera = WORLD_H - VIEW_H;
  particles = [];
  penguins = [];
  for (let i = 0; i < 2; i++) {
    penguins.push({
      x: i === 0 ? 84 : 172, y: 562,
      oldY: 562, vx: 0, vy: -30,
      angle: -Math.PI / 2, inv: 0, hurt: 0, brake: false,
      shove: 0, cooldown: 0, trail: 0
    });
  }
  fish = [];
  const rows = stage === 3 ? 10 : 6 + stage;
  for (let r = 0; r < rows; r++) {
    let left = 84, right = 172;
    if (r > 0) {
      const pattern = (r + stage) % 3;
      left = pattern === 0 ? 62 : pattern === 1 ? 98 : 76;
      right = pattern === 0 ? 194 : pattern === 1 ? 158 : 180;
    }
    const y = 530 - r * (470 / (rows - 1));
    fish.push({ x: left, y: y, got: false });
    fish.push({ x: right, y: y - (stage > 0 && r > 0 ? 12 : 0), got: false });
  }
  remaining = fish.length;
  seals = [];
  const count = 3 + stage;
  for (let i = 0; i < count; i++) {
    seals.push({
      x: i % 2 === 0 ? 66 : 190,
      y: 446 - i * (335 / (count - 1)),
      dir: i % 2 === 0 ? 1 : -1,
      phase: "rest",
      time: 1.2 + i * 0.33,
      harmless: stage === 0 && i === 0,
      active: false,
      travel: 0
    });
  }
  cracks = [];
  if (stage > 0) {
    for (let i = 0; i < (stage === 3 ? 3 : stage); i++) {
      cracks.push({
        baseX: i % 2 === 0 ? 27 : 177,
        x: i % 2 === 0 ? 27 : 177,
        y: 354 - i * 106,
        width: 44 + stage * 2,
        phase: "closed", time: 2 + i * 1.3,
        age: 0
      });
    }
  }
  mode = "play";
}
function init(api) {
  stage = 0;
  mode = "play";
  api.score(0);
  makeStage(api);
}
function hurtPlayer(api, p, why) {
  if (p.inv > 0 || teamGuard > 0 || mode !== "play") return;
  hearts--;
  teamGuard = 0.65;
  chain = 0;
  chainTime = 0;
  p.inv = 2.6;
  p.hurt = 0.65;
  burst(p.x, p.y, why === "water" ? 12 : 9, 16);
  p.x = p.x < 128 ? 108 : 148;
  p.y = clamp(p.y, 28, WORLD_H - 28);
  p.vx = 0;
  p.vy = 0;
  p.angle = -Math.PI / 2;
  api.sfx("hit");
  api.shake(5);
  if (hearts <= 0) {
    mode = "over";
    api.sfx("die");
    api.gameOver();
  }
}
function updateSeals(api, dt) {
  let activeCount = 0;
  for (let i = 0; i < seals.length; i++) {
    const s = seals[i];
    s.active = s.y > camera - 25 && s.y < camera + VIEW_H + 25 && activeCount < 4;
    if (!s.active) continue;
    activeCount++;
    if (s.harmless) {
      s.x = 66 + Math.sin(stageTime * 1.2) * 13;
      continue;
    }
    s.time -= dt;
    if (s.phase === "rest") {
      s.x += s.dir * (stage > 0 ? 15 : 8) * dt;
      if (s.x < 36 || s.x > 220) {
        s.x = clamp(s.x, 36, 220);
        s.dir *= -1;
      }
      if (s.time <= 0 && stageTime > 3.5) {
        const a = penguins[0], b = penguins[1];
        const p = Math.abs(a.y - s.y) < Math.abs(b.y - s.y) ? a : b;
        s.dir = p.x >= s.x ? 1 : -1;
        if (s.x > 182) s.dir = -1;
        if (s.x < 74) s.dir = 1;
        s.phase = "warn";
        s.time = 0.9;
        api.tone(190, 65, "triangle");
      }
    } else if (s.phase === "warn") {
      if (s.time <= 0) {
        s.phase = "bite";
        s.time = 0.25;
        api.sfx("shoot");
        burst(s.x + s.dir * 10, s.y, 7, 5);
      }
    } else if (s.phase === "bite") {
      s.x = clamp(s.x + s.dir * 176 * dt, 32, 224);
      if (s.time <= 0) {
        s.phase = "recover";
        s.time = 0.45;
      }
    } else if (s.time <= 0) {
      s.phase = "rest";
      s.time = 1.4 + (i % 2) * 0.3;
    }
  }
}
function updateCracks(api, dt) {
  for (let i = 0; i < cracks.length; i++) {
    const c = cracks[i];
    c.age += dt;
    c.time -= dt;
    c.x = c.baseX + Math.sin(c.age * 0.85 + i) * 7;
    if (c.time > 0) continue;
    if (c.phase === "closed") {
      c.phase = "warn";
      c.time = 1.3;
      if (c.y > camera && c.y < camera + VIEW_H) api.tone(120, 90, "noise");
    } else if (c.phase === "warn") {
      c.phase = "open";
      c.time = 2.5;
      burst(c.x + c.width / 2, c.y, 7, 9);
    } else {
      c.phase = "closed";
      c.time = 3.1;
    }
  }
}
function update(api, dt) {
  if (mode === "over") return;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.97;
    p.vy *= 0.97;
    if (p.life <= 0) particles.splice(i, 1);
  }
  if (mode === "clear") {
    clearTime -= dt;
    if (clearTime <= 0) {
      if (stage === 3) {
        mode = "over";
        api.win();
      } else {
        stage++;
        makeStage(api);
        api.tone(660, 100, "triangle");
      }
    }
    return;
  }
  stageTime += dt;
  clock -= dt;
  hintTime -= dt;
  teamGuard = Math.max(0, teamGuard - dt);
  bumpCooldown = Math.max(0, bumpCooldown - dt);
  chainTime = Math.max(0, chainTime - dt);
  if (chainTime === 0) chain = 0;
  if (clock <= 10 && Math.ceil(clock) !== lastSecond && clock > 0) {
    lastSecond = Math.ceil(clock);
    api.tone(330, 60, "square");
  }
  if (clock <= 0) {
    mode = "over";
    api.sfx("die");
    api.gameOver();
    return;
  }
  updateSeals(api, dt);
  updateCracks(api, dt);
  for (let i = 0; i < 2; i++) penguins[i].oldY = penguins[i].y;
  for (let i = 0; i < 2; i++) {
    const p = penguins[i];
    const other = penguins[1 - i];
    p.inv = Math.max(0, p.inv - dt);
    p.hurt = Math.max(0, p.hurt - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.shove = Math.max(0, p.shove - dt);
    if (p.hurt > 0) continue;
    p.brake = api.btn("down", i);
    const steering = (api.btn("right", i) ? 1 : 0) - (api.btn("left", i) ? 1 : 0);
    p.angle += steering * (p.brake ? 2.2 : 3.0) * dt;
    if (api.btnp("up", i) && p.cooldown === 0) {
      p.shove = 0.55;
      p.cooldown = 0.8;
      p.vx += Math.cos(p.angle) * 22;
      p.vy += Math.sin(p.angle) * 22;
      burst(p.x - Math.cos(p.angle) * 8, p.y - Math.sin(p.angle) * 8, 7, 7);
      api.sfx("jump");
    }
    const speed = p.brake ? 8 : p.shove > 0 ? 66 : 34;
    const grip = p.brake ? 11 : 3.5;
    p.vx += (Math.cos(p.angle) * speed - p.vx) * grip * dt;
    p.vy += (Math.sin(p.angle) * speed - p.vy) * grip * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // A shared-camera leash stops the leading bird; it never drags its partner.
    p.y = clamp(p.y, other.oldY - 122, other.oldY + 122);
    p.trail -= dt;
    if (p.trail <= 0) {
      p.trail = p.brake ? 0.07 : 0.13;
      burst(p.x - Math.cos(p.angle) * 8, p.y - Math.sin(p.angle) * 8, 7, p.brake ? 2 : 1);
    }
    if (p.x < 23 || p.x > 233 || p.y < 17 || p.y > WORLD_H - 17) {
      if (p.inv > 0 || teamGuard > 0) {
        p.x = clamp(p.x, 24, 232);
        p.y = clamp(p.y, 18, WORLD_H - 18);
      } else hurtPlayer(api, p, "water");
    }
    if (mode !== "play") return;
    for (let j = 0; j < cracks.length; j++) {
      const c = cracks[j];
      if (c.phase === "open" && p.x > c.x - 4 && p.x < c.x + c.width + 4 &&
          Math.abs(p.y - c.y) < 8) hurtPlayer(api, p, "water");
    }
    for (let j = 0; j < seals.length; j++) {
      const s = seals[j];
      if (!s.harmless && s.active && s.phase === "bite" &&
          Math.abs(p.x - s.x) < 16 && Math.abs(p.y - s.y) < 12) {
        hurtPlayer(api, p, "seal");
      }
    }
    if (mode !== "play") return;
    if (p.hurt > 0) continue;
    for (let j = 0; j < fish.length; j++) {
      const f = fish[j];
      if (f.got) continue;
      const dx = f.x - p.x, dy = f.y - p.y;
      if (dx * dx + dy * dy < 15 * 15) {
        f.got = true;
        remaining--;
        chain = chainTime > 0 ? Math.min(4, chain + 1) : 1;
        chainTime = 5;
        api.addScore(100 * chain);
        api.sfx("coin");
        burst(f.x, f.y, chain === 4 ? 10 : 12, 9);
      }
    }
  }
  const a = penguins[0], b = penguins[1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 16 && a.hurt <= 0 && b.hurt <= 0) {
    const nx = dist > 0.01 ? dx / dist : 1;
    const ny = dist > 0.01 ? dy / dist : 0;
    const push = (16 - dist) * 0.18;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;
    if (bumpCooldown === 0) {
      bumpCooldown = 0.5;
      burst((a.x + b.x) / 2, (a.y + b.y) / 2, 7, 4);
      api.tone(240, 35, "triangle");
    }
  }
  const targetCam = clamp((a.y + b.y) / 2 - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  camera += (targetCam - camera) * Math.min(1, dt * 9);
  if (remaining === 0) {
    mode = "clear";
    clearTime = 2.2;
    api.sfx("powerup");
    burst(a.x, a.y, 10, 18);
    burst(b.x, b.y, 10, 18);
  }
}
function drawIce(api) {
  api.rectfill(0, WORLD_TOP, 256, VIEW_H, 1);
  for (let i = 0; i < 26; i++) {
    const y = worldY(i * 27 + 4);
    if (y < 40 || y > 213) continue;
    const drift = Math.sin(api.t * 1.2 + i) * 2;
    api.line(1 + drift, y, 10 + drift, y, 12);
    api.line(244 - drift, y + 8, 252 - drift, y + 8, 12);
  }
  api.rectfill(17, worldY(8), 222, WORLD_H - 16, 6);
  api.rectfill(22, worldY(13), 212, WORLD_H - 26, 7);
  api.rectfill(25, worldY(16), 206, WORLD_H - 32, 6);
  for (let i = 0; i < 32; i++) {
    const y = worldY(i * 20);
    if (y < 40 || y > 213) continue;
    const x = 31 + ((i * 67) % 187);
    api.line(x, y, x + 2, y - 7, 7);
    if (i % 3 === 0) {
      api.line(18, y, 21, y - 3, 12);
      api.line(236, y + 5, 239, y + 2, 12);
    }
  }
  // A quiet central braking corridor remains free of cracks.
  for (let i = 0; i < 22; i++) {
    const y = worldY(22 + i * 28);
    if (y < 44 || y > 209) continue;
    api.line(119, y, 119, y + 3, 7);
    api.line(137, y, 137, y + 3, 7);
  }
  for (let i = 0; i < seals.length; i++) {
    const s = seals[i];
    const y = worldY(s.y);
    if (y < 43 || y > 211) continue;
    for (let x = 30; x < 232; x += 14) api.line(x, y + 9, x + 4, y + 9, 13);
    api.rectfill(20, y + 5, 3, 7, s.harmless ? 12 : 5);
    api.rectfill(233, y + 5, 3, 7, s.harmless ? 12 : 5);
  }
  for (let i = 0; i < cracks.length; i++) {
    const c = cracks[i], y = worldY(c.y);
    if (y < 35 || y > 216) continue;
    if (c.phase === "open") {
      api.rectfill(c.x, y - 4, c.width, 9, 1);
      api.line(c.x, y + 5, c.x + c.width - 1, y + 5, 12);
      for (let x = 0; x < c.width; x += 9) {
        api.line(c.x + x, y - 5, c.x + x + 4, y - 7, 7);
        api.line(c.x + x + 4, y - 7, c.x + x + 8, y - 5, 7);
      }
    } else {
      const color = c.phase === "warn" && Math.floor(api.t * 9) % 2 === 0 ? 8 : 7;
      for (let x = 0; x < c.width; x += 8) {
        api.line(c.x + x, y, c.x + x + 4, y - 3, color);
        api.line(c.x + x + 4, y - 3, c.x + x + 8, y, color);
      }
      if (c.phase === "warn") api.text("!", c.x + c.width / 2 - 4, y - 15, 8);
    }
  }
}
function drawSeal(api, s) {
  const y = worldY(s.y);
  if (y < 30 || y > 225) return;
  const open = !s.harmless && (s.phase === "warn" || s.phase === "bite");
  if (s.phase === "warn" && !s.harmless) {
    const color = Math.floor(api.t * 10) % 2 === 0 ? 8 : 9;
    for (let d = 14; d <= 57; d += 8) {
      const x = s.x + s.dir * d;
      api.line(x, y - 7, x + s.dir * 3, y - 7, color);
      api.line(x, y + 7, x + s.dir * 3, y + 7, color);
    }
    api.text("!", s.x - 4, y - 19, color);
  }
  api.line(s.x - 8, y + 7, s.x + 8, y + 7, 13);
  api.spr(open ? SEAL_OPEN : SEAL_CLOSED, s.x - 10, y - 7, s.dir < 0, false);
  if (s.harmless) {
    api.text("Z", s.x + 9, y - 16 - Math.sin(api.t * 2) * 2, 5);
  } else if (s.phase === "recover") {
    api.pset(s.x - 4, y - 10, 7);
    api.pset(s.x + 4, y - 12, 7);
  }
}
function drawPenguin(api, p, index) {
  const y = worldY(p.y);
  const color = index === 0 ? api.P1 : api.P2;
  api.line(p.x - 7, y + 9, p.x + 7, y + 9, 13);
  if (p.inv > 0 && Math.floor(api.t * 13) % 2 === 0) {
    api.circ(p.x, y, 11, color);
    return;
  }
  const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (p.hurt <= 0 && !p.brake && speed > 20) {
    const nx = Math.cos(p.angle), ny = Math.sin(p.angle);
    api.line(p.x - nx * 11 - ny * 4, y - ny * 11 + nx * 4,
      p.x - nx * 19 - ny * 4, y - ny * 19 + nx * 4, 7);
    api.line(p.x - nx * 11 + ny * 4, y - ny * 11 - nx * 4,
      p.x - nx * 16 + ny * 4, y - ny * 16 - nx * 4, 7);
  }
  const pose = p.hurt > 0 ? PENGUIN_HURT : p.brake ? PENGUIN_BRAKE : PENGUIN_SLIDE;
  api.spr(pose, p.x - 9, y - 10);
  api.rectfill(p.x - 5, y - 2, 10, 3, color);
  const flutter = Math.floor(api.t * (p.brake ? 4 : 10) + index) % 2;
  api.rectfill(p.x + (Math.cos(p.angle) > 0 ? -8 : 5), y, 3, 5 + flutter, color);
  api.pset(p.x - 3, y - 2, 7);
  if (p.hurt > 0) {
    const a = api.t * 11;
    api.pset(p.x + Math.cos(a) * 12, y + Math.sin(a) * 9, 10);
    api.pset(p.x - Math.cos(a) * 12, y - Math.sin(a) * 9, 10);
  } else {
    // A small colored chevron makes steering direction unambiguous.
    const nx = Math.cos(p.angle), ny = Math.sin(p.angle);
    const tx = p.x + nx * 14, ty = y + ny * 14;
    api.line(tx, ty, tx - nx * 4 - ny * 3, ty - ny * 4 + nx * 3, color);
    api.line(tx, ty, tx - nx * 4 + ny * 3, ty - ny * 4 - nx * 3, color);
    if (!p.brake && flutter) {
      api.line(p.x - 6, y + 8, p.x - 4, y + 10, 9);
      api.line(p.x + 4, y + 8, p.x + 6, y + 10, 9);
    }
  }
}
function drawHeart(api, x, y, full) {
  const c = full ? 8 : 5;
  api.rectfill(x + 1, y, 3, 3, c);
  api.rectfill(x + 5, y, 3, 3, c);
  api.line(x, y + 2, x + 4, y + 6, c);
  api.line(x + 8, y + 2, x + 4, y + 6, c);
  api.rectfill(x + 2, y + 2, 5, 3, c);
  if (full) api.pset(x + 2, y + 1, 15);
}
function draw(api) {
  api.cls(1);
  drawIce(api);
  for (let i = 0; i < fish.length; i++) {
    const f = fish[i];
    if (f.got) continue;
    const y = worldY(f.y);
    if (y < 37 || y > 216) continue;
    api.line(f.x - 2, y + 4, f.x + 2, y + 4, 13);
    const spark = (Math.floor(api.t * 4) + i) % 7 === 0;
    api.spr(spark ? FISH_SPARK : FISH, f.x - 3, y - 3);
    if (spark) {
      api.line(f.x + 5, y - 6, f.x + 5, y - 2, 7);
      api.line(f.x + 3, y - 4, f.x + 7, y - 4, 7);
    }
  }
  for (let i = 0; i < seals.length; i++) drawSeal(api, seals[i]);
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i], y = worldY(p.y);
    if (y > 41 && y < 212) api.pset(p.x, y, p.color);
  }
  drawPenguin(api, penguins[0], 0);
  drawPenguin(api, penguins[1], 1);

  // Compact route map: uncollected schools never disappear from the plan.
  api.rectfill(245, 52, 9, 148, 0);
  api.rect(245, 52, 9, 148, 5);
  api.rect(246, 53 + camera / WORLD_H * 144, 7, VIEW_H / WORLD_H * 144, 6);
  for (let i = 0; i < fish.length; i++) {
    const f = fish[i];
    if (!f.got) api.pset(f.x < 128 ? 247 : 251, 54 + f.y / WORLD_H * 142, 10);
  }
  for (let i = 0; i < 2; i++) {
    api.rectfill(i === 0 ? 247 : 250, 54 + penguins[i].y / WORLD_H * 142, 2, 3,
      i === 0 ? api.P1 : api.P2);
  }

  api.rectfill(0, 12, 256, 30, 1);
  api.text("ICE " + (stage + 1) + "/4", 8, 14, 7);
  api.text("TIME " + Math.max(0, Math.ceil(clock)), 176, 14, clock < 15 ? 9 : 6);
  for (let i = 0; i < 3; i++) drawHeart(api, 8 + i * 13, 28, i < hearts);
  api.spr(FISH, 61, 28);
  api.text("" + remaining + " LEFT", 73, 27, 7);
  api.text("X" + Math.max(1, chain), 184, 27, chain === 4 ? 10 : 12);
  api.rectfill(208, 30, 39, 3, 5);
  api.rectfill(208, 30, 39 * chainTime / 5, 3, chain === 4 ? 10 : 12);
  api.line(0, 41, 255, 41, 12);
  api.rectfill(0, 212, 256, 12, 1);
  if (mode === "clear") {
    api.rectfill(27, 89, 202, 46, 1);
    api.rect(29, 91, 198, 42, 12);
    api.textCenter(stage === 3 ? "ALL FISH SAVED!" : "ICE CLEAR!", 98, 10);
    api.textCenter(stage === 3 ? "HOME FOR SUPPER" : "FRESH ICE AHEAD", 116, 7);
  } else if (hintTime > 0) {
    api.textCenter(stage === 0 ? "L/R STEER  DOWN BRAKE" : "SPLIT FISH. SHARE HEARTS.", 215, 6);
  } else if (Math.abs(penguins[0].y - penguins[1].y) > 113) {
    api.textCenter("REGROUP TO SCROLL", 215, 10);
  } else if (stageTime < 10 && stage === 0) {
    api.textCenter("UP: SHOVE   TURN TO RETURN", 215, 6);
  } else {
    api.textCenter(chain === 4 ? "FISH CHAIN X4!" : "COLLECT EVERY FISH", 215, chain === 4 ? 10 : 6);
  }
}
