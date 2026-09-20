// ICEFISH DASH
// Steering is relative to the penguin's forward heading:
// LEFT banks toward the far edge; RIGHT banks toward the near edge.
const FISH_PALETTE = [
  "#102137", "#35CAE5", "#A3F4EF", "#FFC34F", "#FFFFFF"
];
const FISH = [
  "......22..",
  "1...12223.",
  "1121222233",
  "1122220233",
  "1..122233.",
  "....133...",
  ".....3...."
];
const SEAL = [
  "........................",
  "...............66666....",
  "..............6677776...",
  ".............667777776..",
  ".....666666666777707760.",
  "...66677777777777776600.",
  "..6677777777777777766...",
  ".66777777777777777666...",
  "667777777777777766666...",
  "66777777777777666666....",
  ".666777777776666666.....",
  "..6666666666666666......",
  "...66666..666666........",
  "..6666.....666666.......",
  ".666........6666........",
  "........................"
];
const SEAL_WARN = [
  "...............66666....",
  "..............6677776...",
  "..............67777776..",
  "..............677707760.",
  ".............6677776600.",
  ".............6777766....",
  ".....66666666677766.....",
  "...6667777777777666.....",
  "..667777777777776666....",
  ".66777777777777666666...",
  "667777777777776666666...",
  ".6667777777766666666....",
  "..66666666666666666.....",
  "...66666..666666........",
  "..6666.....666666.......",
  ".666........6666........"
];
const ICE_PALETTE = [
  "#13253F", "#6DA9C3", "#A8D6E5", "#D2E9EC", "#F5FBF0"
];
const FLOE = [
  ".....22222222.......",
  "...223333333322.....",
  ".2233333333333322...",
  "233333333333333332..",
  ".222222222222222221.",
  "...11111111111111..."
];

let player, fish, seals, cracks, particles, labels;
let field, distance, fieldLength, lives, chain, multiplier;
let camera, brakeCD, brakeTime, roughTime, invulnerable;
let deadTime, cause, finished, bannerTime, elapsed, deathVX;
let gatePulse;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function iceBounds(x) {
  const t = clamp(x / fieldLength, 0, 1);
  let narrow = 0;
  if (t > 0.35 && t < 0.82) {
    narrow = Math.sin((t - 0.35) / 0.47 * Math.PI) * (field === 1 ? 4 : 10 + field * 2);
  }
  const bend = field > 1 ? Math.sin(t * Math.PI * 4) * 4 : 0;
  return { top: 89 + narrow + bend, bottom: 207 - narrow + bend };
}
function makeField() {
  const count = 20 + (field - 1) * 2 + (field === 4 ? 2 : 0);
  fieldLength = 200 + count * 84 + 150;
  distance = 0;
  camera = -64;
  player = { x: 0, y: 148, vy: 0, turn: 0 };
  fish = [];
  seals = [];
  cracks = [];
  particles = [];
  labels = [];
  brakeCD = 0;
  brakeTime = 0;
  roughTime = 0;
  invulnerable = 1.3;
  deadTime = 0;
  bannerTime = 2;
  for (let i = 0; i < count; i++) {
    let y = 148;
    if (i > 2) {
      const amplitude = field === 1 ? 22 : 27;
      y += Math.sin((i - 2) * 0.63) * amplitude;
    }
    if (i >= count - 4) y = 148 + Math.sin(i) * 10;
    fish.push({ x: 135 + i * 84, y: y, state: 0 });
  }
  const locations = field === 1
    ? [690]
    : field === 2
      ? [570, 970, 1160, 1510]
      : field === 3
        ? [530, 900, 1080, 1310, 1490, 1660]
        : [490, 780, 960, 1150, 1320, 1510, 1690];
  for (let i = 0; i < locations.length; i++) {
    seals.push({
      x: locations[i],
      y: i % 2 ? 184 : 113,
      dir: i % 2 ? -1 : 1,
      phase: "sleep",
      timer: 0,
      near: false,
      hit: false,
      flip: i % 2 === 1
    });
  }
  if (field > 1) {
    for (let i = 0; i < field; i++) {
      cracks.push({
        x: 750 + i * 340,
        y: i % 2 ? 167 : 128,
        crossed: false,
        age: 0
      });
    }
  }
}
function init(api) {
  field = 1;
  lives = 3;
  chain = 0;
  multiplier = 1;
  elapsed = 0;
  cause = "";
  finished = false;
  deathVX = 0;
  gatePulse = 0;
  api.score(0);
  makeField();
}
function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 14 + Math.random() * 48;
    particles.push({
      x: x, y: y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.3 + Math.random() * 0.35,
      c: color
    });
  }
}
function label(text, x, y, c) {
  labels.push({ text: text, x: x, y: y, life: 0.85, c: c });
}
function loseLife(api, reason, direction) {
  if (deadTime > 0 || invulnerable > 0 || finished) return;
  lives--;
  chain = 0;
  multiplier = 1;
  cause = reason;
  deadTime = 0.8;
  deathVX = -30;
  player.vy = direction * 45;
  api.sfx("hit");
  api.shake(7);
  burst(player.x, player.y, reason === "OFF THE ICE!" ? 12 : 7, 16);
}
function animateEffects(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 35 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = labels.length - 1; i >= 0; i--) {
    labels[i].life -= dt;
    labels[i].y -= 15 * dt;
    if (labels[i].life <= 0) labels.splice(i, 1);
  }
}
function updateSeal(api, s, dt) {
  if (s.x < player.x - 70 || s.x > player.x + 236) return;
  if (s.phase === "sleep") {
    s.phase = "patrol";
    s.timer = 0.8 + (s.x % 7) * 0.1;
  }
  s.timer -= dt;
  if (s.phase === "patrol" || s.phase === "rest") {
    s.y += Math.sin(elapsed * 3 + s.x) * dt * 5;
    if (s.timer <= 0) {
      s.phase = "warn";
      s.timer = 0.35;
      s.dir = s.y < 148 ? 1 : -1;
      s.near = false;
      s.hit = false;
      api.tone(160, 90, "square");
    }
  } else if (s.phase === "warn") {
    if (s.timer <= 0) {
      s.phase = "lunge";
      s.timer = 1;
      api.sfx("shoot");
    }
  } else if (s.phase === "lunge") {
    s.y += s.dir * (field === 1 ? 105 : 132 + field * 8) * dt;
    if (s.y >= 186 || s.y <= 110) {
      s.y = clamp(s.y, 110, 186);
      if (s.near && !s.hit && deadTime <= 0) {
        api.addScore(50);
        api.sfx("coin");
        label("CLOSE! +50", player.x - 20, player.y - 27, 10);
        burst(player.x, player.y, 10, 5);
      }
      s.phase = "rest";
      s.timer = field === 1 ? 1.9 : 1.1;
    }
  }
  const dx = Math.abs(player.x - s.x);
  const dy = Math.abs(player.y - s.y);
  if (dx < 19 && dy < 13) {
    if (invulnerable <= 0) {
      s.hit = true;
      loseLife(api, "SEAL SNAP!", player.y < s.y ? -1 : 1);
    }
  } else if (s.phase === "lunge") {
    const gx = Math.max(0, dx - 19);
    const gy = Math.max(0, dy - 13);
    if (gx * gx + gy * gy <= 144) s.near = true;
  }
}
function update(api, dt) {
  if (finished) return;
  elapsed += dt;
  gatePulse += dt;
  animateEffects(dt);
  bannerTime = Math.max(0, bannerTime - dt);

  if (deadTime > 0) {
    deadTime -= dt;
    player.x += deathVX * dt;
    player.y += player.vy * dt;
    if (deadTime <= 0) {
      if (lives <= 0 && api.t > 2) {
        finished = true;
        api.sfx("die");
        api.gameOver();
      } else {
        makeField();
        api.tone(440, 100, "triangle");
      }
    }
    return;
  }

  invulnerable = Math.max(0, invulnerable - dt);
  brakeCD = Math.max(0, brakeCD - dt);
  brakeTime = Math.max(0, brakeTime - dt);
  roughTime = Math.max(0, roughTime - dt);

  if (api.btnp("a") && brakeCD <= 0) {
    brakeCD = 0.6;
    brakeTime = 0.28;
    player.vy *= 0.45;
    api.sfx("jump");
    burst(player.x - 8, player.y + 5, 7, 7);
  }
  const steer = (api.btn("right") ? 1 : 0) - (api.btn("left") ? 1 : 0);
  player.turn += (steer - player.turn) * Math.min(1, dt * 12);
  const braking = brakeTime > 0;
  if (steer) {
    player.vy += steer * (braking ? 450 : 150) * dt;
  }
  // With no steering, lateral momentum is retained.
  player.vy = clamp(player.vy, braking ? -86 : -56, braking ? 86 : 56);
  let speed = 77 + field * 3;
  if (braking) speed *= 0.4;
  if (roughTime > 0) speed *= 0.58;
  player.x += speed * dt;
  player.y += player.vy * dt;
  distance = player.x;
  camera = player.x - 64;

  const edge = iceBounds(player.x);
  if (player.y < edge.top + 4 || player.y > edge.bottom - 4) {
    loseLife(api, "OFF THE ICE!", player.y < 148 ? -1 : 1);
    if (deadTime > 0) return;
    player.y = clamp(player.y, edge.top + 5, edge.bottom - 5);
    player.vy = 0;
  }

  if (api.frame % (braking ? 3 : 7) === 0) {
    particles.push({
      x: player.x - 12, y: player.y + 9,
      vx: -13, vy: 3 + Math.random() * 5,
      life: 0.32, c: braking ? 7 : 6
    });
  }

  for (let i = 0; i < fish.length; i++) {
    const f = fish[i];
    if (f.state !== 0) continue;
    if (Math.abs(f.x - player.x) < 17 && Math.abs(f.y - player.y) < 17) {
      f.state = 1;
      chain++;
      multiplier = Math.min(4, 1 + Math.floor((chain - 1) / 4));
      const points = 100 * multiplier;
      api.addScore(points);
      api.sfx("coin");
      burst(f.x, f.y, 10, 6);
      label("+" + points, f.x - 12, f.y - 18, 10);
    } else if (f.x < player.x - 22) {
      f.state = 2;
      if (chain > 0) {
        label("CHAIN LOST", player.x - 12, 80, 6);
        api.tone(180, 70, "triangle");
      }
      chain = 0;
      multiplier = 1;
    }
  }

  for (let i = 0; i < cracks.length; i++) {
    const c = cracks[i];
    if (c.crossed) {
      c.age += dt;
    } else if (Math.abs(player.x - c.x) < 15 && Math.abs(player.y - c.y) < 22) {
      c.crossed = true;
      roughTime = 0.65;
      player.vy *= 0.55;
      api.sfx("hit");
      burst(c.x, c.y, 6, 10);
      label("CRACK!", c.x - 16, c.y - 23, 1);
    }
  }

  for (let i = 0; i < seals.length; i++) {
    updateSeal(api, seals[i], dt);
    if (deadTime > 0) return;
  }

  if (player.x >= fieldLength) {
    api.sfx("powerup");
    burst(player.x, player.y, 10, 18);
    if (field === 4) {
      finished = true;
      api.win();
    } else {
      field++;
      makeField();
      api.flash(7, 2);
    }
  }
}
function mountain(api, x, y, width, height, color) {
  for (let j = 0; j < height; j++) {
    const half = width * j / height / 2;
    api.line(x - half, y + j, x + half, y + j, color);
  }
  for (let j = 0; j < height * 0.27; j++) {
    const half = width * j / height / 2;
    api.line(x - half, y + j, x + half, y + j, 6);
  }
}
function drawBackground(api) {
  api.rectfill(0, 12, 256, 70, 1);
  api.circfill(206, 39, 12, 6);
  api.circfill(202, 36, 12, 1);
  for (let i = 0; i < 5; i++) {
    let x = i * 83 - ((camera * 0.11) % 83);
    mountain(api, x, 45 + (i % 2) * 9, 100, 39, 5);
  }
  api.rectfill(0, 79, 256, 145, 1);
  for (let i = 0; i < 7; i++) {
    const x = ((i * 59 - camera * 0.28) % 340 + 340) % 340 - 40;
    api.spr(FLOE, x, 81 + (i % 3) * 3, false, false, ICE_PALETTE);
  }
  for (let i = 0; i < 16; i++) {
    const x = ((i * 39 - camera * 0.6) % 280 + 280) % 280 - 15;
    const y = 213 + (i % 3) * 4;
    api.line(x, y, x + 9, y, (i % 4 === 0) ? 12 : 5);
  }
}
function drawIce(api) {
  for (let x = 0; x < 256; x += 2) {
    const b = iceBounds(camera + x);
    const tooth = Math.sin((camera + x) * 0.08) * 1.5;
    api.rectfill(x, b.top + 4, 2, b.bottom - b.top + 7, 5);
    api.rectfill(x, b.top + tooth, 2, b.bottom - b.top, 12);
    api.rectfill(x, b.top + 4 + tooth, 2, b.bottom - b.top - 9, 6);
    api.rectfill(x, b.top + tooth, 2, 3, 7);
    api.rectfill(x, b.bottom - 4, 2, 2, 7);
  }
  // Quiet surface texture and seams where connected floes meet.
  const first = Math.floor(camera / 142);
  for (let i = first; i < first + 4; i++) {
    const x = i * 142 - camera;
    const b = iceBounds(i * 142);
    api.line(x, b.top + 4, x + 7, b.top + 16, 12);
    api.line(x + 7, b.top + 16, x + 3, b.top + 26, 12);
    api.line(x + 3, b.top + 26, x + 11, b.top + 33, 12);
    api.line(x + 60, b.bottom - 16, x + 80, b.bottom - 18, 7);
    api.line(x + 24, 148, x + 35, 148, 7);
    api.line(x + 30, 149, x + 48, 149, 7);
  }
}
function drawPenguin(api, x, y) {
  const hurt = deadTime > 0;
  const upright = brakeTime > 0 || roughTime > 0;
  const turn = player.turn;
  const wave = Math.sin(elapsed * 17);
  const lean = hurt ? -4 : upright ? -2 : 3;
  const headX = x + 5 + lean;
  const headY = y - (upright ? 12 : 7);
  const bodyY = y + (upright ? 0 : 2);

  api.line(x - 11, y + 13, x + 12, y + 13, 5);
  api.line(x - 7, y + 14, x + 9, y + 14, 5);

  // Orange feet kick independently while sliding.
  const kick = upright ? 0 : Math.floor(wave * 2);
  api.rectfill(x - 10, y + 8 + kick, 7, 3, 9);
  api.rectfill(x - 3, y + 10 - kick, 7, 3, 9);
  api.pset(x - 11, y + 10 + kick, 10);

  // Rounded black back and large white belly.
  api.circfill(x - 2, bodyY, upright ? 10 : 9, 0);
  if (!upright) api.circfill(x + 3, bodyY, 8, 0);
  api.circfill(x + 1, bodyY + 2, 7, 6);
  api.circfill(x + 2, bodyY + 1, 6, 7);
  api.rectfill(x - 2, bodyY - 3, 7, 8, 7);

  // Articulated flippers widen the silhouette when banking or hurt.
  const far = hurt ? -10 : turn < -0.15 ? -9 : -3;
  api.line(x - 6, bodyY - 3, x - 13, bodyY + far, 0);
  api.line(x - 5, bodyY - 2, x - 12, bodyY + far + 1, 0);
  const near = hurt ? 9 : turn > 0.15 ? 11 : 5 + wave;
  api.line(x - 5, bodyY + 1, x - 11, bodyY + near, 0);
  api.line(x - 4, bodyY + 2, x - 10, bodyY + near + 1, 0);
  api.pset(x - 11, bodyY + near, 5);

  // Head, cheek, bright orange beak, and blue scarf.
  api.circfill(headX, headY, 7, 0);
  api.circfill(headX + 2, headY + 1, 5, 7);
  api.rectfill(headX - 4, headY - 5, 5, 4, 0);
  api.line(headX + 6, headY + 1, headX + 11, headY + 2, 9);
  api.line(headX + 6, headY + 2, headX + 9, headY + 3, 10);
  if (hurt) {
    api.line(headX + 2, headY - 2, headX + 5, headY + 1, 0);
    api.line(headX + 5, headY - 2, headX + 2, headY + 1, 0);
  } else {
    api.rectfill(headX + 3, headY - 2, 2, 3, 0);
    api.pset(headX + 3, headY - 2, 7);
  }
  api.rectfill(headX - 5, headY + 5, 10, 3, 12);
  api.line(headX - 5, headY + 6, headX - 13, headY + 3 + wave, 12);
  api.line(headX - 5, headY + 7, headX - 13, headY + 4 + wave, 12);
  api.pset(headX - 1, headY + 5, 7);
  if (hurt) {
    const a = elapsed * 9;
    api.pset(x + Math.cos(a) * 15, y - 19 + Math.sin(a) * 4, 10);
    api.pset(x - Math.cos(a) * 15, y - 19 - Math.sin(a) * 4, 7);
  }
}
function drawGate(api) {
  const x = fieldLength - camera;
  if (x > 295 || x < -50) return;
  // A luminous igloo arch spans the sliding route.
  api.circfill(x + 8, 148, 42, 12);
  api.circfill(x + 6, 146, 40, 7);
  api.rectfill(x - 34, 146, 81, 45, 7);
  api.circfill(x + 6, 151, 24, 1);
  api.rectfill(x - 18, 151, 49, 41, 1);
  api.rectfill(x - 14, 151, 41, 42, 10);
  api.rectfill(x - 11, 151, 35, 43, 6);
  api.line(x - 26, 125, x + 33, 125, 12);
  api.line(x - 31, 138, x - 15, 138, 12);
  api.line(x + 28, 138, x + 45, 138, 12);
  api.line(x - 33, 161, x - 19, 161, 12);
  api.line(x + 31, 161, x + 45, 161, 12);
  api.line(x - 33, 176, x - 19, 176, 12);
  api.line(x + 31, 176, x + 45, 176, 12);
  api.line(x + 6, 109, x + 6, 124, 12);
  api.line(x - 21, 127, x - 21, 137, 12);
  api.rectfill(x - 12, 101, 40, 10, 1);
  api.text(field === 4 ? "HOME" : "GATE", x - 8, 102, 10);
  if (Math.sin(gatePulse * 6) > 0) {
    api.line(x - 39, 143, x - 35, 143, 10);
    api.line(x - 37, 141, x - 37, 145, 10);
  }
}
function draw(api) {
  api.cls(1);
  drawBackground(api);
  drawIce(api);

  for (let i = 0; i < cracks.length; i++) {
    const c = cracks[i];
    const x = c.x - camera;
    if (x < -30 || x > 286) continue;
    if (c.crossed) {
      const spread = Math.min(1, c.age * 5);
      api.circfill(x - 2, c.y, 13 * spread, 1);
      api.circfill(x + 5, c.y - 6, 9 * spread, 1);
      api.line(x - 13, c.y + 4, x - 7, c.y + 13, 12);
      api.line(x + 8, c.y - 15, x + 14, c.y - 8, 7);
    } else {
      api.line(x - 9, c.y - 20, x + 2, c.y - 8, 1);
      api.line(x + 2, c.y - 8, x - 5, c.y + 1, 1);
      api.line(x - 5, c.y + 1, x + 8, c.y + 13, 1);
      api.line(x + 8, c.y + 13, x + 4, c.y + 20, 1);
      api.line(x - 4, c.y + 1, x - 15, c.y + 6, 12);
      api.line(x + 2, c.y - 8, x + 13, c.y - 12, 12);
      api.line(x - 8, c.y - 20, x + 3, c.y - 8, 7);
    }
  }

  for (let i = 0; i < seals.length; i++) {
    const s = seals[i];
    const x = s.x - camera;
    if (x < -35 || x > 280) continue;
    const warning = s.phase === "warn";
    const lunging = s.phase === "lunge";
    // Dashed patrol lane is visible before its resident attacks.
    for (let y = 102; y < 200; y += 10) {
      api.line(x - 15, y, x - 15, y + 4, warning ? 9 : 12);
      api.line(x + 15, y, x + 15, y + 4, warning ? 9 : 12);
    }
    api.line(x - 12, s.y + 9, x + 10, s.y + 9, 5);
    if (lunging) {
      api.line(x - 6, s.y - s.dir * 13, x - 6, s.y - s.dir * 22, 7);
      api.line(x + 5, s.y - s.dir * 12, x + 5, s.y - s.dir * 18, 7);
    }
    api.spr(warning ? SEAL_WARN : SEAL, x - 12, s.y - 8, s.flip, false);
    if (warning) {
      api.circfill(x + 1, s.y - 20, 7, 9);
      api.text("!", x - 2, s.y - 24, 0);
      api.line(x - 6, s.y + s.dir * 18, x, s.y + s.dir * 23, 8);
      api.line(x, s.y + s.dir * 23, x + 6, s.y + s.dir * 18, 8);
    }
  }

  for (let i = 0; i < fish.length; i++) {
    const f = fish[i];
    if (f.state !== 0) continue;
    const x = f.x - camera;
    if (x < -15 || x > 270) continue;
    const bob = Math.sin(elapsed * 5 + i) * 1.5;
    api.line(x - 3, f.y + 7, x + 4, f.y + 7, 12);
    api.spr(FISH, x - 5, f.y - 4 + bob, false, false, FISH_PALETTE);
    if ((Math.floor(elapsed * 5) + i) % 5 === 0) {
      api.line(x + 7, f.y - 8, x + 11, f.y - 8, 7);
      api.line(x + 9, f.y - 10, x + 9, f.y - 6, 7);
    }
  }

  drawGate(api);
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    api.rectfill(p.x - camera, p.y, 2, 2, p.c);
  }
  if (deadTime > 0 || invulnerable <= 0 || Math.floor(elapsed * 15) % 2 === 0) {
    drawPenguin(api, player.x - camera, player.y);
  }
  for (let i = 0; i < labels.length; i++) {
    const l = labels[i];
    const x = clamp(l.x - camera, 3, 253 - l.text.length * 8);
    api.text(l.text, x + 1, l.y + 1, 1);
    api.text(l.text, x, l.y, l.c);
  }

  // Compact run information, separate from the cabinet score.
  api.rectfill(0, 12, 256, 22, 1);
  api.text("ICE " + field + "/4", 5, 15, 7);
  api.text("X" + multiplier, 111, 15, 10);
  for (let i = 0; i < 3; i++) {
    const x = 194 + i * 17;
    api.circfill(x, 20, 5, i < lives ? 7 : 5);
    api.circfill(x + 1, 19, 3, i < lives ? 0 : 1);
    api.pset(x + 4, 20, i < lives ? 9 : 5);
  }
  api.rectfill(5, 29, 246, 2, 5);
  api.rectfill(5, 29, 246 * clamp(distance / fieldLength, 0, 1), 2, 12);

  api.rectfill(7, 212, 56, 8, 1);
  api.text("BRAKE", 8, 213, brakeCD > 0 ? 6 : 7);
  api.rectfill(51, 215, 24, 3, 5);
  api.rectfill(51, 215, 24 * (1 - brakeCD / 0.6), 3, brakeCD > 0 ? 12 : 11);

  if (bannerTime > 0 && deadTime <= 0) {
    const title = field === 1 ? "FROST BAY" :
      field === 2 ? "SEAL STRAIT" :
      field === 3 ? "SPLINTER REACH" : "HOMEWARD ICE";
    api.textCenter(title, 39, 7);
  } else if (distance > fieldLength * 0.83 && deadTime <= 0) {
    api.textCenter("QUIET WATER", 39, 6);
  }
  if (field === 1 && distance < 310 && deadTime <= 0) {
    api.text("L", 39, 113, 1);
    api.line(43, 124, 40, 128, 1);
    api.line(43, 124, 46, 128, 1);
    api.text("R", 39, 174, 1);
    api.line(43, 169, 40, 165, 1);
    api.line(43, 169, 46, 165, 1);
  }
  if (roughTime > 0 && deadTime <= 0) {
    api.rectfill(87, 199, 82, 10, 1);
    api.text("ROUGH ICE", 92, 200, 7);
  }
  if (deadTime > 0) {
    api.rectfill(35, 54, 186, 26, 1);
    api.textCenter(cause, 57, 10);
    api.textCenter(lives > 0 ? "CHECKPOINT RESET" : "NO LIVES LEFT", 69, 7);
  }
}
