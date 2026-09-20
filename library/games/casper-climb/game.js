const FLOORS = [207, 162, 117, 72];
const ROUTES = [
  [188, 60, 180],
  [173, 77, 164],
  [199, 49, 188],
  [181, 69, 173]
];
const GAPS = [
  [113, 125, 114, 200],
  [103, 116, 128, 201],
  [128, 110, 103, 205],
  [117, 132, 119, 199]
];
const IDLE = [
  ".....88888......",
  "....8888888.....",
  "...8888888888...",
  "....444ffff.....",
  "....4ffff0f.....",
  ".....fffffff....",
  "......ffff......",
  ".....cccccc.....",
  "....cccccccc....",
  "...ffccccccff...",
  "...ffccccccff...",
  "...ffccccccff...",
  "...ffccccccff...",
  ".....cccccc.....",
  ".....111111.....",
  ".....111111.....",
  ".....111111.....",
  ".....11..11.....",
  ".....11..11.....",
  ".....11..11.....",
  ".....11..11.....",
  "....444..444....",
  "...4444..4444...",
  "................"
];
const WALK1 = [
  ".....88888......",
  "....8888888.....",
  "...8888888888...",
  "....444ffff.....",
  "....4ffff0f.....",
  ".....fffffff....",
  "......ffff......",
  ".....cccccc.....",
  "....cccccccc....",
  "...fcccccccc....",
  "..fffcccccccf...",
  "..ff.ccccccfff..",
  "......ccccc.ff..",
  ".....cccccc.....",
  ".....111111.....",
  "....11111111....",
  "....111..111....",
  "...111....11....",
  "...11.....111...",
  "..111......11...",
  "..11.......11...",
  ".444.......444..",
  ".4444......4444.",
  "................"
];
const WALK2 = [
  "................",
  ".....88888......",
  "....8888888.....",
  "...8888888888...",
  "....444ffff.....",
  "....4ffff0f.....",
  ".....fffffff....",
  "......ffff......",
  ".....cccccc.....",
  "....cccccccc....",
  "....cccccccff...",
  "...fccccccfff...",
  "...ffcccccff....",
  "....fcccccc.....",
  ".....111111.....",
  ".....111111.....",
  "......1111......",
  "......1111......",
  ".....11111......",
  ".....11.111.....",
  ".....11..44.....",
  "....444.........",
  "...4444.........",
  "................"
];
const JUMP = [
  "................",
  "................",
  ".....88888......",
  "....8888888.....",
  "...8888888888...",
  "....444ffff.....",
  "....4ffff0f.....",
  ".ff..fffffff....",
  ".fff..ffff..ff..",
  "..ff.ccccccfff..",
  "...ccccccccff...",
  "....cccccccc....",
  ".....cccccc.....",
  ".....cccccc.....",
  "....11111111....",
  "...1111111111...",
  "...11......11...",
  "...11.....444...",
  "..444.....4444..",
  "..4444..........",
  "................",
  "................",
  "................",
  "................"
];
const CLIMB1 = [
  "..ff......ff....",
  "..ff.88888ff....",
  "..cc888888cc....",
  "..cc888888cc....",
  "...c444444c.....",
  "....4ffff4......",
  ".....ffff.......",
  "....cccccccc....",
  "....cccccccc....",
  "....cccccccc....",
  ".....cccccc.....",
  ".....cccccc.....",
  ".....cccccc.....",
  ".....111111.....",
  ".....111111.....",
  ".....11..111....",
  ".....11...11....",
  ".....11..444....",
  ".....11.........",
  ".....11.........",
  "....444.........",
  "...4444.........",
  "................",
  "................"
];
const CLIMB2 = [
  "................",
  "..ff.88888ff....",
  "..ff888888ff....",
  "..cc888888cc....",
  "..cc444444cc....",
  "...c4ffff4c.....",
  ".....ffff.......",
  "....cccccccc....",
  "....cccccccc....",
  "....cccccccc....",
  ".....cccccc.....",
  ".....cccccc.....",
  ".....cccccc.....",
  ".....111111.....",
  ".....111111.....",
  "....111..11.....",
  "....11...11.....",
  "...444...11.....",
  ".........11.....",
  ".........11.....",
  ".........444....",
  ".........4444...",
  "................",
  "................"
];
const HURT = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....8888........",
  "...888888.......",
  "...ff0ffcccc11..",
  "..fffffcccc1114.",
  ".88ffcccccc1144.",
  "...fff....ff....",
  "................"
];
const ORB1 = [
  "....dddd....",
  "..dd7777dd..",
  ".d77777777d.",
  ".d77777777d.",
  "d7770770777d",
  "d7770770777d",
  "d7777777777d",
  "d7777007777d",
  ".d77777777d.",
  ".d7d7777d7d.",
  "..dd7dd7dd..",
  "....d..d...."
];
const ORB2 = [
  "....dddd....",
  "..dd7777dd..",
  ".d77777777d.",
  ".d77777777d.",
  "d7777077077d",
  "d7777077077d",
  "d7777777777d",
  "d7777707777d",
  ".d77777777d.",
  ".d77d77d77d.",
  "..d77dd77d..",
  "...dd..dd..."
];
const BELL = [
  "....aa....",
  "...a99a...",
  "..aaaaaa..",
  "..a7aaa9..",
  "..a7aaa9..",
  "..a7aaa9..",
  ".aaaaaaaa.",
  ".a7aaaaa9.",
  "aaaaaaaaaa",
  "....99....",
  "....aa...."
];
const FRIEND = [
  "....aaaa....",
  "...aaaaaa...",
  "..aaffffaa..",
  "..af0ff0fa..",
  "..affffffa..",
  "...af77fa...",
  "....ffff....",
  "..ffeeeeff..",
  ".ff.eeee.ff.",
  "....eeee....",
  "...eeeeee...",
  "...eeeeee...",
  "..eeeeeeee..",
  "....ff.ff...",
  "....ff.ff...",
  "...777.777.."
];

let player, orbs, particles, labels, stars;
let stage, lives, mode, modeTimer, ladders, gaps, bell;
let freeze, throwWind, recovery, throwTimer, throwPose, walkClock;
let knockDir, savedFriend;

function init(api) {
  stage = 1;
  lives = 3;
  orbs = [];
  particles = [];
  labels = [];
  stars = [];
  for (let i = 0; i < 28; i++) {
    stars.push({ x: api.rndi(3, 252), y: api.rndi(26, 192), phase: api.rnd(6.28) });
  }
  api.score(0);
  savedFriend = false;
  buildTower(api);
}

function buildTower(api) {
  ladders = ROUTES[stage - 1];
  gaps = GAPS[stage - 1];
  particles = [];
  labels = [];
  bell = { x: 66 + (stage - 1) * 3, y: FLOORS[0] - 14, taken: false };
  resetClimber();
  mode = "play";
  modeTimer = 0;
}

function resetClimber() {
  player = {
    x: 30, y: FLOORS[0], level: 0, vy: 0,
    grounded: true, climbing: false, ladder: 0,
    face: 1, moving: false, swing: 0, swingHit: false,
    invincible: 70, ladderLock: 0
  };
  orbs = [];
  freeze = 0;
  throwWind = 0;
  recovery = 0;
  throwPose = 0;
  throwTimer = 3.3;
  walkClock = 0;
  knockDir = 1;
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= 90) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 65;
    particles.push({
      x: x, y: y, vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 15,
      life: 0.3 + Math.random() * 0.35, color: color
    });
  }
}

function label(text, x, y, color) {
  if (labels.length < 8) labels.push({ text: text, x: x, y: y, color: color, life: 0.85 });
}

function solidAt(x, level) {
  return x < gaps[level] + 2 || x > gaps[level] + 14;
}

function loseLife(api, direction) {
  if (mode !== "play" || player.invincible > 0) return;
  lives--;
  mode = "hurt";
  modeTimer = 0.85;
  knockDir = direction;
  player.swing = 0;
  player.climbing = false;
  api.sfx("die");
  api.shake(9);
  api.flash(8, 2);
  burst(player.x, player.y - 10, 15, 14);
}

function completeStage(api) {
  mode = "clear";
  modeTimer = 1.55;
  player.swing = 0;
  lives = Math.min(3, lives + 1);
  api.addScore(2000);
  api.sfx("powerup");
  api.flash(10, 2);
  burst(224, 55, 10, 24);
  label("+2000", 181, 43, 10);
  savedFriend = true;
}

function update(api, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 100 * dt;
    if (p.life <= 0 || p.y > 224) particles.splice(i, 1);
  }
  for (let i = labels.length - 1; i >= 0; i--) {
    labels[i].life -= dt;
    labels[i].y -= dt * 16;
    if (labels[i].life <= 0) labels.splice(i, 1);
  }

  if (mode === "hurt") {
    modeTimer -= dt;
    player.x = api.clamp(player.x + knockDir * 26 * dt, 16, 239);
    if (modeTimer <= 0) {
      if (lives <= 0) {
        mode = "over";
        api.gameOver();
      } else {
        resetClimber();
        bell.taken = false;
        labels = [];
        mode = "play";
      }
    }
    return;
  }
  if (mode === "clear") {
    modeTimer -= dt;
    if (modeTimer <= 0) {
      if (stage === 4) {
        mode = "ending";
        modeTimer = 2.4;
        api.sfx("powerup");
      } else {
        stage++;
        savedFriend = false;
        buildTower(api);
      }
    }
    return;
  }
  if (mode === "ending") {
    modeTimer -= dt;
    if (api.frame % 14 === 0) burst(api.rndi(35, 220), api.rndi(85, 155), api.frame % 28 ? 14 : 10, 8);
    if (modeTimer <= 0) {
      mode = "over";
      api.win();
    }
    return;
  }
  if (mode !== "play") return;

  const p = player;
  if (p.invincible > 0) p.invincible--;
  if (p.ladderLock > 0) p.ladderLock--;
  if (throwPose > 0) throwPose--;
  const horizontal = (api.btn("right") ? 1 : 0) - (api.btn("left") ? 1 : 0);
  const up = api.btn("up");
  const down = api.btn("down");
  p.moving = false;

  if (!p.climbing && p.grounded && !p.swing && p.ladderLock === 0) {
    const wantsUp = up || api.btnp("right");
    const wantsDown = down || api.btnp("left");
    if (p.level < 3 && Math.abs(p.x - ladders[p.level]) < 9 && wantsUp) {
      p.climbing = true;
      p.ladder = p.level;
      p.x = ladders[p.ladder];
      p.grounded = false;
      api.sfx("select");
    } else if (p.level > 0 && Math.abs(p.x - ladders[p.level - 1]) < 9 && wantsDown) {
      p.climbing = true;
      p.ladder = p.level - 1;
      p.x = ladders[p.ladder];
      p.grounded = false;
      api.sfx("select");
    }
  }

  if (p.climbing) {
    let vertical = 0;
    if (up || api.btn("right")) vertical--;
    if (down || api.btn("left")) vertical++;
    p.y += vertical * 57 * dt;
    p.moving = vertical !== 0;
    if (p.moving) walkClock += dt;
    const top = FLOORS[p.ladder + 1];
    const bottom = FLOORS[p.ladder];
    if ((p.y <= top && vertical < 0) || (p.y >= bottom && vertical > 0)) {
      p.level = vertical < 0 ? p.ladder + 1 : p.ladder;
      p.y = FLOORS[p.level];
      p.climbing = false;
      p.grounded = true;
      p.ladderLock = 16;
    }
  } else {
    p.x = api.clamp(p.x + horizontal * 76 * dt, 16, 240);
    p.moving = horizontal !== 0;
    if (horizontal) {
      p.face = horizontal;
      walkClock += dt;
    }
    if (api.btnp("a") && p.grounded) {
      p.grounded = false;
      p.vy = -175;
      p.swing = 0;
      api.sfx("jump");
      burst(p.x, p.y - 1, 6, 4);
    } else if (api.btnp("b") && p.grounded && p.swing === 0) {
      p.swing = 10;
      p.swingHit = false;
      api.sfx("shoot");
    }

    if (p.grounded && !solidAt(p.x, p.level)) {
      p.grounded = false;
      p.vy = 0;
      p.swing = 0;
    }
    if (!p.grounded) {
      const oldY = p.y;
      p.vy += 625 * dt;
      p.y += p.vy * dt;
      const floor = FLOORS[p.level];
      if (p.vy > 0 && oldY <= floor && p.y >= floor && solidAt(p.x, p.level)) {
        p.y = floor;
        p.vy = 0;
        p.grounded = true;
        burst(p.x, p.y - 1, 6, 3);
      } else if (p.y > floor + 12) {
        p.invincible = 0;
        loseLife(api, -p.face);
        return;
      }
    }
  }

  if (!bell.taken && Math.abs(p.x - bell.x) < 12 && Math.abs((p.y - 10) - bell.y) < 18) {
    bell.taken = true;
    freeze = 45;
    api.addScore(500);
    api.sfx("coin");
    burst(bell.x, bell.y, 10, 18);
    label("+500", bell.x - 16, bell.y - 15, 10);
  }

  if (freeze > 0) {
    freeze--;
  } else {
    const cap = api.t < 15 ? 1 : api.t < 30 ? 2 : 3;
    const speed = api.t < 15 ? 55 : Math.min(78, 55 + (stage - 1) * 5 + Math.floor((api.t - 15) / 10) * 3);
    const cadence = Math.max(1.75, 2.2 - (stage - 1) * 0.15);
    throwTimer -= dt;
    if (recovery > 0) recovery--;
    if (throwWind > 0) {
      throwWind--;
      if (throwWind === 0) {
        orbs.push({ x: 53, y: FLOORS[3] - 6, level: 3, dir: 1, falling: false, vy: 0, speed: speed });
        throwPose = 13;
        recovery = 24;
        throwTimer = cadence - 18 / 60;
        api.sfx("jump");
        burst(54, 64, 13, 5);
      }
    } else if (throwTimer <= 0 && recovery === 0 && orbs.length < cap) {
      throwWind = 18;
    }

    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      if (o.falling) {
        o.vy += 330 * dt;
        o.y += o.vy * dt;
        if (o.level >= 0 && o.y >= FLOORS[o.level] - 6) {
          o.y = FLOORS[o.level] - 6;
          o.falling = false;
          o.vy = 0;
          o.dir *= -1;
          burst(o.x, o.y + 5, 13, 3);
        }
      } else {
        o.x += o.dir * o.speed * dt;
        if (o.x >= 242 || o.x <= 14) {
          o.x = api.clamp(o.x, 14, 242);
          o.level--;
          o.falling = true;
          o.vy = 20;
        }
      }
      if (o.y > 237) orbs.splice(i, 1);
    }
  }

  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    const distance = (o.x - p.x) * p.face;
    if (p.swing <= 7 && p.swing >= 5 && !p.swingHit &&
        distance > -3 && distance < 28 && Math.abs(o.y - (p.y - 8)) < 14) {
      p.swingHit = true;
      orbs.splice(i, 1);
      api.addScore(100);
      api.sfx("hit");
      api.shake(3);
      burst(o.x, o.y, 7, 14);
      burst(o.x, o.y, 13, 8);
      label("+100", api.clamp(o.x - 16, 5, 218), o.y - 15, 7);
      continue;
    }
    if (p.invincible === 0 &&
        api.collide(p.x - 5, p.y - 21, 10, 20, o.x - 5, o.y - 5, 10, 10)) {
      loseLife(api, p.x < o.x ? -1 : 1);
      return;
    }
  }

  if (p.swing > 0) p.swing--;
  if (p.level === 3 && p.grounded && p.x >= 224) completeStage(api);
}

function drawGirder(api, x, y, width) {
  api.rectfill(x, y, width, 8, 4);
  api.rectfill(x, y, width, 2, 9);
  api.line(x, y + 7, x + width - 1, y + 7, 9);
  for (let offset = 3; offset < width - 4; offset += 18) {
    api.line(x + offset, y + 2, x + Math.min(offset + 10, width - 2), y + 6, 5);
    api.pset(x + offset, y + 3, 10);
  }
}

function drawCasper(api) {
  const x = 20;
  const y = 34 + Math.sin(api.t * 3.8) * 2;
  const raised = throwWind > 0;
  const tossed = throwPose > 0;
  // A blue-grey edge surrounds the rounded white sheet.
  api.circfill(x + 16, y + 12, 13, 13);
  api.rectfill(x + 3, y + 12, 26, 15, 13);
  api.circfill(x + 7, y + 26, 4, 13);
  api.circfill(x + 16, y + 27, 4, 13);
  api.circfill(x + 25, y + 26, 4, 13);
  api.circfill(x + 16, y + 11, 11, 7);
  api.rectfill(x + 5, y + 12, 22, 14, 7);
  api.circfill(x + 8, y + 25, 3, 7);
  api.circfill(x + 16, y + 26, 3, 7);
  api.circfill(x + 24, y + 25, 3, 7);
  api.line(x + 6, y + 13, x + 6, y + 21, 6);
  api.circfill(x + 3, y + 19, 4, 13);
  api.circfill(x + 3, y + 18, 3, 7);
  if (raised) {
    api.line(x + 27, y + 17, x + 33, y + 7, 13);
    api.line(x + 28, y + 17, x + 34, y + 7, 7);
    api.circfill(x + 33, y + 6, 4, 7);
    api.spr(ORB1, x + 27, y - 6);
    api.line(x + 30, y - 10, x + 30, y - 13, 10);
    api.line(x + 38, y - 6, x + 41, y - 8, 10);
  } else if (tossed) {
    api.rectfill(x + 26, y + 16, 10, 5, 7);
    api.circfill(x + 36, y + 17, 3, 7);
  } else {
    api.circfill(x + 29, y + 19, 4, 13);
    api.circfill(x + 29, y + 18, 3, 7);
  }
  api.rectfill(x + 11, y + 10, 3, 6, 0);
  api.rectfill(x + 20, y + 10, 3, 6, 0);
  api.pset(x + 12, y + 10, 7);
  api.pset(x + 21, y + 10, 7);
  api.line(x + 13, y + 20, x + 21, y + 20, 0);
  api.line(x + 15, y + 22, x + 19, y + 22, 0);
  api.pset(x + 12, y + 19, 0);
  api.pset(x + 22, y + 18, 0);
  api.line(x + 15, y + 20, x + 19, y + 20, 7);
}

function drawCage(api) {
  api.line(225, 26, 225, 43, 5);
  api.circ(225, 43, 3, 10);
  api.spr(FRIEND, 219, 53 + (savedFriend ? Math.sin(api.t * 9) * 2 : 0));
  if (!savedFriend) {
    api.rect(214, 47, 23, 24, 10);
    api.line(214, 47, 225, 43, 9);
    api.line(225, 43, 236, 47, 9);
    for (let x = 219; x <= 234; x += 5) api.line(x, 48, x, 69, 9);
    api.rectfill(224, 60, 4, 5, 10);
    api.pset(226, 62, 4);
  } else {
    api.line(214, 47, 214, 71, 10);
    api.line(214, 47, 207, 51, 10);
    api.line(207, 51, 207, 73, 10);
    api.line(207, 73, 214, 71, 10);
  }
}

function drawClimber(api) {
  const p = player;
  if (p.invincible > 0 && mode === "play" && api.frame % 8 < 3) return;
  if (mode === "hurt" && api.frame % 6 < 2) return;
  let sprite = IDLE;
  if (mode === "hurt") sprite = HURT;
  else if (p.climbing) sprite = Math.floor(walkClock * 9) % 2 ? CLIMB1 : CLIMB2;
  else if (!p.grounded) sprite = JUMP;
  else if (p.moving) sprite = Math.floor(walkClock * 10) % 2 ? WALK1 : WALK2;
  api.spr(sprite, p.x - 8, p.y - 24, p.face < 0);

  if (mode === "hurt") {
    api.pset(p.x - 9, p.y - 12, 10);
    api.pset(p.x + 8, p.y - 15, 10);
    return;
  }
  if (p.swing > 0) {
    let hx, hy;
    const active = p.swing <= 7 && p.swing >= 5;
    if (p.swing > 7) {
      hx = p.x - p.face * 3;
      hy = p.y - 30;
    } else if (active) {
      hx = p.x + p.face * 21;
      hy = p.y - 10;
      api.line(p.x + p.face * 10, p.y - 28, p.x + p.face * 26, p.y - 18, 10);
      api.line(p.x + p.face * 26, p.y - 18, p.x + p.face * 28, p.y - 10, 7);
    } else {
      hx = p.x + p.face * 14;
      hy = p.y - 5;
    }
    api.line(p.x + p.face * 5, p.y - 13, hx, hy, 4);
    api.line(p.x + p.face * 5, p.y - 14, hx, hy - 1, 9);
    api.circfill(p.x + p.face * 6, p.y - 13, 2, 15);
    api.rectfill(hx - 5, hy - 4, 10, 8, 5);
    api.rectfill(hx - 5, hy - 4, 10, 3, 7);
    api.rectfill(hx - 4, hy - 1, 8, 4, 6);
  } else if (p.grounded && !p.climbing) {
    api.line(p.x + p.face * 6, p.y - 10, p.x + p.face * 9, p.y - 5, 9);
    api.rectfill(p.x + p.face * 9 - 3, p.y - 7, 6, 4, 6);
  }
}

function draw(api) {
  api.cls(1);

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (Math.sin(api.t * 0.8 + s.phase) > -0.4) api.pset(s.x, s.y, 5);
  }
  api.circfill(173, 37, 12, 5);
  api.circfill(179, 33, 11, 1);

  // Quiet distant masonry and the tower's structural bracing.
  for (let b = 0; b < 6; b++) {
    const x = b * 46 - 8;
    const roof = 92 + (b % 3) * 17;
    api.rectfill(x, roof, 37, 120, 2);
    api.rectfill(x + 3, roof - 5, 29, 5, 2);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        api.rectfill(x + 6 + col * 10, roof + 12 + row * 21, 3, 6, 1);
      }
    }
  }
  api.rectfill(8, 64, 3, 152, 5);
  api.rectfill(246, 64, 3, 152, 5);
  for (let y = 80; y < 205; y += 44) {
    api.line(10, y, 37, y + 31, 2);
    api.line(246, y, 218, y + 31, 2);
  }

  for (let i = 0; i < 3; i++) {
    const x = ladders[i];
    const top = FLOORS[i + 1];
    const bottom = FLOORS[i];
    api.rectfill(x - 6, top - 1, 2, bottom - top + 1, 10);
    api.rectfill(x + 5, top - 1, 2, bottom - top + 1, 10);
    for (let y = top + 5; y < bottom; y += 7) {
      api.line(x - 4, y, x + 4, y, 10);
      api.line(x - 4, y + 1, x + 4, y + 1, 9);
    }
  }
  for (let i = 0; i < 4; i++) {
    const y = FLOORS[i];
    drawGirder(api, 8, y, gaps[i] - 8);
    drawGirder(api, gaps[i] + 16, y, 248 - gaps[i] - 16);
    api.line(gaps[i] - 3, y + 2, gaps[i] - 1, y + 5, 10);
    api.line(gaps[i] + 16, y + 4, gaps[i] + 19, y + 2, 10);
  }
  api.rectfill(0, 216, 256, 8, 0);
  api.line(0, 215, 255, 215, 5);
  for (let x = 4; x < 256; x += 27) api.line(x, 219, x + 12, 219, 4);

  if (!bell.taken) {
    const bob = Math.sin(api.t * 5) * 1.5;
    api.spr(BELL, bell.x - 5, bell.y - 5 + bob);
    if (api.frame % 40 < 20) {
      api.pset(bell.x - 9, bell.y - 4, 7);
      api.line(bell.x + 9, bell.y - 10, bell.x + 9, bell.y - 6, 10);
      api.line(bell.x + 7, bell.y - 8, bell.x + 11, bell.y - 8, 10);
    }
  }

  drawCage(api);
  drawCasper(api);

  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    if (freeze > 0) api.circ(o.x, o.y, 8, 12);
    api.spr(Math.floor(api.t * 10 + i) % 2 ? ORB1 : ORB2, o.x - 6, o.y - 6, o.dir < 0);
    if (!o.falling) {
      api.pset(o.x - o.dir * 9, o.y + 2, 13);
      api.pset(o.x - o.dir * 12, o.y + 4, 5);
    }
  }
  drawClimber(api);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    api.rectfill(p.x, p.y, p.life > 0.25 ? 2 : 1, 2, p.color);
  }
  for (let i = 0; i < labels.length; i++) {
    const l = labels[i];
    api.text(l.text, l.x + 1, l.y + 1, 0);
    api.text(l.text, l.x, l.y, l.color);
  }

  api.rectfill(0, 12, 256, 13, 1);
  for (let i = 0; i < 3; i++) {
    const c = i < lives ? 8 : 5;
    const x = 9 + i * 13;
    api.circfill(x, 17, 2, c);
    api.circfill(x + 4, 17, 2, c);
    api.line(x - 1, 19, x + 2, 22, c);
    api.line(x + 5, 19, x + 2, 22, c);
    api.rectfill(x, 18, 5, 2, c);
  }
  api.text("TOWER " + stage + "/4", 86, 15, 10);
  if (freeze > 0) {
    api.rectfill(198, 16, 45, 4, 5);
    api.rectfill(198, 16, freeze, 4, 12);
    api.pset(246, 17, 7);
  }

  if (mode === "clear") {
    api.rectfill(24, 87, 208, 43, 1);
    api.rect(24, 87, 208, 43, 10);
    api.textCenter(stage === 4 ? "FRIEND RESCUED!" : "TOWER CLEAR!", 95, 10);
    api.textCenter("+2000  LIFE RESTORED", 113, 7);
  }
  if (mode === "ending" || (mode === "over" && lives > 0)) {
    api.rectfill(24, 87, 208, 84, 1);
    api.rect(24, 87, 208, 84, 10);
    api.textCenter("A GHOSTLY GOOD RESCUE", 96, 7);
    api.spr(IDLE, 105, 124);
    api.spr(FRIEND, 137, 132);
    api.textCenter("THANK YOU!", 156, 14);
  }
}
