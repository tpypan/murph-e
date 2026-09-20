const NAMES = ["BATMAN", "SUPERMAN", "FLASH"];
const ORDER = [1, 0, 2, 1];
let mode, choice, match, wins, losses, fighters, bolts, sparks;
let clock, roundAge, pauseTime, message, bFrames, tick, skyline;

function init(api) {
  mode = "select";
  choice = 0;
  match = wins = losses = tick = bFrames = 0;
  fighters = [];
  bolts = [];
  sparks = [];
  clock = 60;
  roundAge = pauseTime = 0;
  message = "";
  skyline = [];
  for (let i = 0; i < 15; i++) {
    skyline.push({ x: i * 19, h: 20 + Math.floor(Math.random() * 49), antenna: Math.random() > .6 });
  }
  api.score(0);
}

function makeFighter(type, x, enemy) {
  return {
    type, x, y: 187, vy: 0, face: enemy ? -1 : 1,
    hp: enemy ? 100 + match * 4 : 100, max: enemy ? 100 + match * 4 : 100,
    energy: 50, enemy, crouch: false, block: false, moving: false,
    stun: 0, action: "", age: 0, hit: false, cooldown: 0,
    lastHit: -999, lastCombo: -999, combo: 0, ai: "approach", aiTime: 0,
    telegraph: 0, low: false, vx: 0
  };
}

function beginRound(api) {
  let opponent = ORDER[match];
  if (opponent === choice) opponent = (opponent + 1) % 3;
  fighters = [makeFighter(choice, 78, false), makeFighter(opponent, 174, true)];
  bolts = [];
  sparks = [];
  clock = 60;
  roundAge = 0;
  bFrames = 0;
  mode = "fight";
  api.sfx("select");
}

function startAction(api, f, special) {
  if (f.action || f.stun || f.telegraph) return;
  if (special && f.energy < 25) return;
  f.action = special ? "special" : "quick";
  f.age = 0;
  f.hit = false;
  f.low = f.crouch;
  f.block = false;
  if (special) f.energy -= 25;
  api.sfx(special ? "powerup" : "shoot");
}

function burst(x, y, color) {
  for (let i = 0; i < 9; i++) {
    let angle = Math.random() * Math.PI * 2;
    sparks.push({ x, y, vx: Math.cos(angle) * (1 + Math.random() * 2),
      vy: Math.sin(angle) * 2 - 1, life: 14, color });
  }
}

function strike(api, a, d, special, low) {
  if (roundAge < 3 || d.hp <= 0) return;
  let guarded = d.block && d.y >= 187 && (!low || d.crouch);
  let damage = guarded ? (special ? 2 : 1) : (special ? 10 : 6);
  d.hp = Math.max(0, d.hp - damage);
  d.lastHit = tick;
  a.lastHit = tick;
  d.combo = 0;
  d.stun = guarded ? 5 : special ? 16 : 10;
  d.vx = guarded ? a.face * .35 : a.face * (special ? 3.8 : 1.8);
  if (!guarded) {
    d.action = "";
    d.telegraph = 0;
    a.combo = tick - a.lastCombo <= 90 ? Math.min(3, a.combo + 1) : 1;
    a.lastCombo = tick;
    if (!a.enemy) {
      api.addScore(special ? 250 : 100);
      if (a.combo === 3) {
        api.addScore(500);
        a.combo = 0;
        message = "3 HIT COMBO!";
        pauseTime = .8;
      }
    }
  }
  burst(d.x - a.face * 8, d.y - (low ? 12 : 34), guarded ? 12 : 10);
  api.sfx(guarded ? "select" : "hit");
  if (special && !guarded) api.shake(4);
}

function opponentControl(api, f, p) {
  f.face = p.x > f.x ? 1 : -1;
  f.aiTime--;
  let distance = Math.abs(p.x - f.x);
  if (f.telegraph > 0) {
    f.telegraph--;
    if (!f.telegraph) {
      startAction(api, f, true);
      if (!f.action) startAction(api, f, false);
      f.cooldown = 65 - match * 4;
    }
    return;
  }
  if (f.action || f.stun) return;
  if (f.aiTime <= 0) {
    const phase = Math.floor(roundAge / 4) % 4;
    f.ai = phase === 3 ? "retreat" : Math.random() < .27 ? "block" : "approach";
    f.aiTime = 24 + Math.floor(Math.random() * 25);
  }
  f.block = f.ai === "block";
  f.crouch = f.block && p.crouch;
  if (f.block) return;
  if (distance > 39 && f.ai === "approach") {
    f.x += f.face * (.65 + match * .05);
    f.moving = true;
  } else if (f.ai === "retreat") {
    f.x -= f.face * .5;
    f.moving = true;
  }
  if (roundAge > 3.3 && distance < 73 && f.cooldown <= 0 && f.ai !== "retreat") {
    f.telegraph = 12;
    f.crouch = Math.random() < .3;
    f.block = false;
    f.ai = "attack";
  }
}

function simulateFighter(api, f, other) {
  f.cooldown = Math.max(0, f.cooldown - 1);
  f.energy = Math.min(100, f.energy + 1 / 60);
  if (tick - f.lastHit > 120) f.hp = Math.min(f.max, f.hp + 1 / 60);
  if (tick - f.lastCombo > 90) f.combo = 0;
  if (f.stun > 0) {
    f.stun--;
    f.x += f.vx;
    f.vx *= .83;
  }
  if (f.y < 187 || f.vy < 0) {
    f.y += f.vy;
    f.vy += .24;
    if (f.y >= 187) { f.y = 187; f.vy = 0; }
  }
  if (f.action) {
    f.age++;
    if (f.action === "quick") {
      if (f.age >= 5 && f.age <= 8 && !f.hit) {
        let reach = f.type === 2 || f.low ? 43 : 35;
        if ((other.x - f.x) * f.face > 0 && Math.abs(other.x - f.x) < reach &&
            Math.abs(other.y - f.y) < 29) {
          f.hit = true;
          strike(api, f, other, false, f.low);
        }
      }
      if (f.age >= (f.enemy ? 26 : 16)) f.action = "";
    } else {
      if (f.age === 11 && f.type !== 2) {
        if (!bolts.some(b => b.owner === f)) {
          bolts.push({ owner: f, x: f.x + f.face * 19, y: f.y - 36,
            dir: f.face, life: f.type === 0 ? 95 : 15, type: f.type });
          api.sfx("shoot");
        }
      }
      if (f.type === 2 && f.age >= 11 && f.age <= 20) {
        f.x += f.face * 3.2;
        if (!f.hit && Math.abs(other.x - f.x) < 34 && Math.abs(other.y - f.y) < 28) {
          f.hit = true;
          strike(api, f, other, true, f.low);
        }
      }
      if (f.age >= 39) f.action = "";
    }
  }
  f.x = Math.max(20, Math.min(236, f.x));
}

function finishRound(api) {
  const p = fighters[0], e = fighters[1];
  let won = p.hp > e.hp;
  if (won) {
    wins++;
    api.addScore(1000);
  } else losses++;
  message = won ? "ROUND WON" : "ROUND LOST";
  mode = "round";
  pauseTime = 2;
  api.flash(won ? 7 : 8, 2);
  api.shake(6);
  api.sfx(won ? "coin" : "die");
}

function update(api, dt) {
  tick++;
  for (let i = sparks.length - 1; i >= 0; i--) {
    let s = sparks[i];
    s.x += s.vx; s.y += s.vy; s.vy += .1;
    if (--s.life <= 0) sparks.splice(i, 1);
  }
  if (mode === "select") {
    if (api.btnp("left") || api.btnp("up")) { choice = (choice + 2) % 3; api.sfx("select"); }
    if (api.btnp("right") || api.btnp("down")) { choice = (choice + 1) % 3; api.sfx("select"); }
    if (api.btnp("a")) {
      match = wins = losses = 0;
      api.score(0);
      beginRound(api);
    }
    return;
  }
  if (mode === "victory" || mode === "defeat") {
    if (api.btnp("a")) { mode = "select"; api.sfx("select"); }
    return;
  }
  if (mode === "round") {
    pauseTime -= dt;
    if (pauseTime <= 0 || (pauseTime < 1.4 && api.btnp("a"))) {
      if (losses >= 2) { mode = "defeat"; api.sfx("die"); }
      else if (wins >= 2) {
        match++;
        if (match === 4) { mode = "victory"; api.sfx("powerup"); }
        else { wins = losses = 0; beginRound(api); }
      } else beginRound(api);
    }
    return;
  }
  roundAge += dt;
  clock = Math.max(0, 60 - roundAge);
  pauseTime = Math.max(0, pauseTime - dt);
  const p = fighters[0], e = fighters[1];
  p.moving = e.moving = false;
  p.block = false;
  if (api.btn("b")) bFrames++;
  let releasedTap = !api.btn("b") && bFrames > 0 && bFrames < 9;
  if (!api.btn("b")) bFrames = 0;
  if (!p.stun && !p.action) {
    p.crouch = api.btn("down") && p.y === 187;
    p.block = api.btn("b") && p.y === 187;
    if (!p.block) {
      let move = (api.btn("right") ? 1 : 0) - (api.btn("left") ? 1 : 0);
      if (move) {
        p.face = move;
        if (!p.crouch) { p.x += move * 1.35; p.moving = true; }
      } else p.face = e.x >= p.x ? 1 : -1;
      if (api.btnp("up") && p.y === 187) {
        p.vy = -4.8;
        p.crouch = false;
        api.sfx("jump");
      }
      if (releasedTap) startAction(api, p, true);
      else if (api.btnp("a")) startAction(api, p, false);
    }
  }
  opponentControl(api, e, p);
  simulateFighter(api, p, e);
  simulateFighter(api, e, p);
  if (Math.abs(p.x - e.x) < 24 && Math.abs(p.y - e.y) < 36) {
    let sign = p.x < e.x ? -1 : 1;
    p.x += sign * 1.5; e.x -= sign * 1.5;
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    let b = bolts[i], target = b.owner === p ? e : p;
    b.x += b.dir * (b.type === 0 ? 2 : 4);
    b.life--;
    if (Math.abs(b.x - target.x) < 15 &&
        b.y > target.y - (target.crouch ? 31 : 53) && b.y < target.y - 3) {
      strike(api, b.owner, target, true, false);
      b.life = 0;
    }
    if (b.life <= 0 || b.x < -15 || b.x > 270) bolts.splice(i, 1);
  }
  if (p.hp <= 0 || e.hp <= 0 || clock <= 0) finishRound(api);
}

function limb(api, x, y, ex, ey, color, width) {
  for (let i = -width; i <= width; i++) api.line(x + i, y, ex + i, ey, color);
}

function hero(api, f, display) {
  let x = Math.floor(f.x), foot = Math.floor(f.y), dir = f.face;
  let dead = f.hp <= 0;
  let crouch = f.crouch && !display;
  let body = f.type === 0 ? 5 : f.type === 1 ? 12 : 8;
  let shade = f.type === 0 ? 1 : f.type === 1 ? 1 : 2;
  let accent = f.type === 0 ? 6 : f.type === 1 ? 12 : 9;
  let boot = f.type === 0 ? 0 : f.type === 1 ? 8 : 10;
  api.circfill(x, 189, 15, 0);
  if (dead) {
    api.rectfill(x - 23, foot - 10, 37, 9, body);
    api.circfill(x + dir * 20, foot - 7, 6, f.type === 1 ? 15 : body);
    api.rectfill(x - dir * 19 - 4, foot - 7, 9, 7, boot);
    return;
  }
  let stride = f.moving ? Math.sin(tick * .24) * 7 : 0;
  let bob = f.moving ? Math.abs(stride) * .25 : Math.sin(tick * .065) * .6;
  let top = foot - (crouch ? 39 : 55) + bob;
  let hip = foot - (crouch ? 13 : 23);
  let active = f.action && f.age >= (f.action === "quick" ? 4 : 8) && f.age < 22;
  let kick = active && f.action === "quick" && (f.type === 2 || f.low);
  let hurt = f.stun > 0 && !f.block;
  if (hurt) x -= dir * 3;
  if (f.type !== 2) {
    let cape = f.type === 0 ? 1 : 8;
    for (let i = 0; i < 29; i++) {
      let sway = Math.sin(tick * .12 + i * .1) * 3;
      api.line(x - dir * 6, top + 14 + i, x - dir * (15 + i * .23 + sway), top + 14 + i, cape);
    }
    api.line(x - dir * 14, top + 22, x - dir * 19, top + 40, f.type === 0 ? 5 : 2);
  }
  limb(api, x - 5, hip, x - 7 - stride, foot - 4, shade, 3);
  api.rectfill(x - 12 - stride, foot - 7, 11, 7, boot);
  if (kick) {
    limb(api, x + 3, hip, x + dir * 29, hip - 5, body, 3);
    api.rectfill(x + dir * 29 - 4, hip - 10, 10, 8, boot);
  } else {
    limb(api, x + 5, hip, x + 7 + stride, foot - 4, body, 3);
    api.rectfill(x + 3 + stride, foot - 7, 12, 7, boot);
  }
  api.rectfill(x - 9, top + 15, 19, hip - top - 13, shade);
  api.rectfill(x - 6, top + 14, 15, hip - top - 13, body);
  api.rectfill(x - 5, top + 16, 3, 12, accent);
  api.rectfill(x - 8, hip - 4, 17, 3, 10);
  if (f.type === 0) {
    api.rectfill(x - 5, top + 20, 11, 5, 10);
    api.line(x - 5, top + 20, x, top + 24, 0);
    api.line(x, top + 24, x + 5, top + 20, 0);
  } else if (f.type === 1) {
    api.line(x - 6, top + 20, x + 6, top + 20, 10);
    api.line(x - 6, top + 21, x, top + 28, 8);
    api.line(x + 6, top + 21, x, top + 28, 8);
    api.rectfill(x - 3, top + 21, 7, 3, 10);
    api.pset(x, top + 25, 10);
  } else {
    api.circfill(x, top + 23, 5, 7);
    api.line(x + 2, top + 18, x - 2, top + 23, 10);
    api.line(x - 2, top + 23, x + 2, top + 23, 10);
    api.line(x + 2, top + 23, x - 2, top + 28, 10);
  }
  let shoulderY = top + 18;
  limb(api, x - dir * 8, shoulderY, x - dir * 12, top + 31, shade, 3);
  let handX = x + dir * 14, handY = top + 29;
  if (f.block) { handX = x + dir * 14; handY = top + 9; }
  else if (hurt) { handX = x - dir * 15; handY = top + 12; }
  else if (f.telegraph) { handX = x - dir * 15; handY = top + 17; }
  else if (active && !kick) { handX = x + dir * 30; handY = top + 21; }
  else if (display && mode === "victory") { handX = x + dir * 13; handY = top - 10; }
  limb(api, x + dir * 8, shoulderY, handX, handY, body, 3);
  api.rectfill(handX - 3, handY - 3, 7, 7, f.type === 1 ? 15 : boot);
  api.rectfill(x - 6, top + 2, 13, 13, f.type === 1 ? 15 : body);
  if (f.type === 0) {
    api.rectfill(x - 7, top - 4, 4, 9, 0);
    api.rectfill(x + 4, top - 4, 4, 9, 0);
    api.rectfill(x - 6, top + 1, 13, 8, 0);
    api.rectfill(x - 2, top + 10, 8, 5, 15);
  } else if (f.type === 1) {
    api.rectfill(x - 7, top, 14, 5, 0);
    api.rectfill(x - dir * 6 - 1, top + 4, 3, 6, 0);
    api.pset(x + dir * 3, top + 5, 0);
  } else {
    api.rectfill(x - 3, top + 10, 8, 5, 15);
    api.line(x - 7, top + 5, x - 11, top + 2, 10);
    api.line(x + 7, top + 5, x + 11, top + 2, 10);
  }
  api.rectfill(x + dir * 2, top + 6, 4, 2, 7);
  if (f.telegraph) {
    api.line(x - 3, top - 10, x + 3, top - 10, 10);
    api.line(x, top - 14, x, top - 7, 10);
  }
  if (f.action === "special" && f.type === 2 && active) {
    for (let i = 0; i < 3; i++) {
      let yy = top + 18 + i * 10;
      api.line(x - dir * 12, yy, x - dir * 30, yy + 4, 10);
      api.line(x - dir * 30, yy + 4, x - dir * 23, yy - 1, 7);
    }
  }
}

function stage(api) {
  api.cls(1);
  api.circfill(208, 61, 18, 6);
  api.circfill(215, 55, 17, 1);
  for (let i = 0; i < skyline.length; i++) {
    let b = skyline[i];
    api.rectfill(b.x, 158 - b.h, 17, b.h + 24, 0);
    if (b.antenna) api.line(b.x + 8, 158 - b.h, b.x + 8, 145 - b.h, 5);
    for (let j = 0; j < 3; j++) {
      api.rectfill(b.x + 4 + j * 4, 166 - b.h, 2, 3, (i + j) % 3 ? 1 : 4);
    }
  }
  api.rectfill(0, 170, 256, 17, 2);
  api.line(0, 170, 255, 170, 5);
  for (let i = 0; i < 9; i++) api.line(i * 33, 172, i * 33, 186, 1);
  api.rectfill(0, 187, 256, 37, 0);
  api.rectfill(0, 188, 256, 3, 5);
  api.line(0, 193, 255, 193, 1);
  api.line(24, 223, 66, 195, 1);
  api.line(235, 223, 193, 195, 1);
  api.rectfill(11, 200, 31, 3, 5);
  api.rectfill(14, 200, 25, 1, 6);
}

function draw(api) {
  stage(api);
  if (mode === "select") {
    api.textCenter("DC DUEL", 21, 10);
    api.textCenter("CHOOSE YOUR HERO", 41, 7);
    for (let i = 0; i < 3; i++) {
      let f = {
        type: i, x: 43 + i * 85, y: 154, face: 1, hp: 100,
        moving: i === choice, crouch: false, action: "", stun: 0
      };
      if (i === choice) {
        api.rect(7 + i * 85, 78, 73, 84, 10);
        api.rectfill(8 + i * 85, 160, 71, 2, 10);
      }
      hero(api, f, true);
      api.textCenter(NAMES[choice], 174, 10);
    }
    api.textCenter("A: SELECT", 203, 7);
    return;
  }
  const p = fighters[0], e = fighters[1];
  api.text(NAMES[p.type], 8, 15, 7);
  api.text(NAMES[e.type], 248 - NAMES[e.type].length * 8, 15, 7);
  api.rectfill(7, 27, 102, 8, 0);
  api.rectfill(147, 27, 102, 8, 0);
  api.rectfill(8, 28, Math.ceil(100 * p.hp / p.max), 6, p.hp < 25 ? 8 : 11);
  let ew = Math.ceil(100 * e.hp / e.max);
  api.rectfill(248 - ew, 28, ew, 6, e.hp < 25 ? 8 : 9);
  api.rectfill(8, 38, 100, 3, 5);
  api.rectfill(8, 38, p.energy, 3, 12);
  api.rectfill(148, 38, 100, 3, 5);
  api.rectfill(248 - e.energy, 38, e.energy, 3, 14);
  api.textCenter(String(Math.ceil(clock)).padStart(2, "0"), 27, 7);
  for (let i = 0; i < 2; i++) {
    api.circfill(13 + i * 12, 48, 3, i < wins ? 10 : 5);
    api.circfill(243 - i * 12, 48, 3, i < losses ? 10 : 5);
  }
  hero(api, p, mode === "victory");
  hero(api, e, false);
  for (let b of bolts) {
    if (b.type === 0) {
      api.line(b.x - 7, b.y - 3, b.x, b.y + 2, 6);
      api.line(b.x, b.y + 2, b.x + 7, b.y - 3, 6);
      api.line(b.x - 4, b.y, b.x + 4, b.y, 10);
    } else {
      api.line(b.x - b.dir * 23, b.y - 2, b.x, b.y, 8);
      api.line(b.x - b.dir * 23, b.y + 1, b.x, b.y + 1, 10);
      api.circfill(b.x, b.y, 3, 15);
    }
  }
  for (let s of sparks) {
    api.line(s.x - 2, s.y, s.x + 2, s.y, s.color);
    api.line(s.x, s.y - 2, s.x, s.y + 2, s.color);
  }
  if (mode === "fight") {
    if (roundAge < 3) api.textCenter("READY - SPAR!", 67, 10);
    else if (pauseTime > 0) api.textCenter(message, 67, 10);
    api.text("MATCH " + (match + 1) + "/4", 8, 207, 6);
    if (p.block) api.text("GUARD", 192, 207, 12);
    else if (p.energy >= 25) api.text("SPECIAL", 192, 207, 10);
  } else {
    api.rectfill(26, 65, 204, 39, 0);
    api.rect(26, 65, 204, 39, 5);
    api.textCenter(mode === "victory" ? "GOTHAM CHAMPION!" :
      mode === "defeat" ? "DEFEATED" : message, 73, mode === "defeat" ? 8 : 10);
    api.textCenter(mode === "round" ? "NEXT ROUND..." : "A: HERO SELECT", 89, 7);
  }
}
