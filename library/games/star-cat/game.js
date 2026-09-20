// <arcade-catalog-bundle>
// 
const ARCADE = Object.freeze({

});
const ART = (function(sets) {
  function get(id) {
    const set = sets[id];
    if (!set) throw new Error('Unavailable sprite set: ' + id);
    const prepared = {};
    function frame(clipName, ticks, flipX) {
      const clip = set.animations[clipName];
      if (!clip) throw new Error('Unavailable animation: ' + id + '/' + clipName);
      let duration = 0;
      for (const s of clip.steps) duration += s.durationTicks;
      let t = Math.max(0, Number.isFinite(ticks) ? ticks : 0);
      t = clip.loop ? t % duration : Math.min(t, duration - 0.000001);
      let index = 0;
      for (; index < clip.steps.length - 1; index++) {
        if (t < clip.steps[index].durationTicks) break;
        t -= clip.steps[index].durationTicks;
      }
      const flip = !!flipX !== !!clip.flipX;
      const key = clipName + '/' + index + '/' + flip;
      if (!prepared[key]) {
        const step = clip.steps[index], source = set.frames[step.frame];
        const width = source.pixels[0].length;
        const relative = /(?:feet|anchor)[ -](?:relative|origin)|relative to (?:the )?(?:feet|anchor)/i.test(set.coordinates);
        const local = !relative && /frame-local|image top-left/i.test(set.coordinates);
        const boxes = bs => bs.map(b => ({...b, x: flip ? (local ? width - b.x - (b.shape === 'circle' ? 0 : b.w) : -b.x - (b.shape === 'circle' ? 0 : b.w)) : b.x}));
        prepared[key] = {pixels:source.pixels, palette:source.palette, ...(source.layers ? {layers:source.layers} : {}), anchor:{x:flip ? width-step.anchor.x : step.anchor.x,y:step.anchor.y}, ...(step.projectileOrigin ? {projectileOrigin:{x:flip ? width-step.projectileOrigin.x : step.projectileOrigin.x,y:step.projectileOrigin.y}} : {}), hitboxes:boxes(step.hitboxes), hurtboxes:boxes(step.hurtboxes), flipX:flip};
      }
      return prepared[key];
    }
    function character() {
      const fail = reason => { throw new Error('Sprite set is not fighter-compatible: ' + id + ': ' + reason); };
      if (set.camera === 'top-down' || !/(?:feet|anchor)[ -](?:relative|origin)|relative to (?:the )?(?:feet|anchor)/i.test(set.coordinates)) fail('requires feet/anchor-relative geometry');
      const required = ['idle','walk','jump','crouch','light','airLight','airHeavy','heavy','sweep','special','dash','guard','crouchGuard','hurt','ko','victory'];
      const moves = ['light','airLight','airHeavy','heavy','sweep','special','dash'];
      for (const name of required) if (!set.animations[name]) fail('missing clip ' + name);
      const animations = {};
      for (const [name, clip] of Object.entries(set.animations)) {
        if (clip.flipX) fail('pre-mirrored clip ' + name);
        if (moves.includes(name) && clip.steps.length < 3) fail('clip needs startup, active and recovery: ' + name);
        animations[name] = {loop:clip.loop, frames:clip.steps.map(step => {
          if (!Number.isInteger(step.durationTicks) || step.durationTicks < 1) fail('integer timing required: ' + name);
          for (const box of [...step.hitboxes,...step.hurtboxes]) if (box.shape === 'circle' || !Number.isFinite(box.w) || !Number.isFinite(box.h)) fail('rectangle geometry required: ' + name);
          const {durationTicks, ...metadata} = step;
          return {...metadata, duration:durationTicks};
        })};
      }
      const frames = Object.fromEntries(Object.entries(set.frames).map(([name, source]) => [name, {...source, size:{w:source.pixels[0].length,h:source.pixels.length}}]));
      return JSON.parse(JSON.stringify({frames,animations,...(set.projectile ? {projectile:set.projectile} : {})}));
    }
    return {frames:set.frames, animations:set.animations, coordinates:set.coordinates,
      ...(set.projectile ? {projectile:set.projectile} : {}), character,
      unsupportedStates:set.unsupportedStates, frame,
      draw(api, clip, ticks, x, y, flipX) {
        const f = frame(clip,ticks,flipX);
        api.spr(f.pixels,Math.round(x-f.anchor.x),Math.round(y-f.anchor.y),f.flipX,false,f.palette);
        for (const layer of f.layers || []) api.spr(layer.pixels,Math.round(x-f.anchor.x),Math.round(y-f.anchor.y),f.flipX,false,layer.palette);
        return f;
      }};
  }
  return Object.freeze({get});
})({"climber/cat":{"frames":{"wait-0":{"pixels":["................","................","....999...999...","....9e9...9e9...","....9e9...9e9...","....999999999...","....999999999...","....970999079...","....97799977999.","....99999999999.","....9999e999999.","....99999999999.",".....9999999.99.",".....9999999.99.",".....fff99fff...","........9......."],"anchor":{"x":8,"y":15},"durationMs":300,"hitboxes":[],"hurtboxes":[],"sockets":{}},"wait-1":{"pixels":["................","................","....999...999...","....9e9...9e9...","....9e9...9e9...","....999999999...","....999999999...","....970999079...",".99.977999779...",".99.999999999...",".99.9999e9999...",".99.999999999...",".99..9999999....",".99..9999999....",".....fff99fff...","........9......."],"anchor":{"x":8,"y":15},"durationMs":300,"hitboxes":[],"hurtboxes":[],"sockets":{}},"rescued":{"pixels":["........a.......","......aaaaa.....","....999.a.999...","....9e9...9e9...","....9e9...9e9...","....999999999...","....999999999...","....970999079...","....97799977999.","....99999999999.","....9999e999999.","....99999999999.",".....9999999.99.",".....9999999.99.",".....fff99fff...","........9......."],"anchor":{"x":8,"y":15},"durationMs":300,"hitboxes":[],"hurtboxes":[],"sockets":{}}},"animations":{"wait":{"loop":true,"flipX":false,"steps":[{"frame":"wait-0","durationTicks":18,"anchor":{"x":8,"y":15},"hitboxes":[],"hurtboxes":[]},{"frame":"wait-1","durationTicks":18,"anchor":{"x":8,"y":15},"hitboxes":[],"hurtboxes":[]}]},"rescued":{"loop":false,"flipX":false,"steps":[{"frame":"rescued","durationTicks":18,"anchor":{"x":8,"y":15},"hitboxes":[],"hurtboxes":[]}]}},"camera":"unspecified","coordinates":"image top-left; anchor identifies placement origin","unsupportedStates":[]}});
// </arcade-catalog-bundle>
const CAT_HAT = [
  "..........d.....",
  ".........dd.....",
  "........d22.....",
  "........d222....",
  ".......d2222....",
  ".......d2a222...",
  "......d222222...",
  "......d2222222..",
  ".....ddddddddd..",
  "...222aaaaa2222.",
  ".ddddddddddddddd",
  "..222222222222.."
];
const STAR = [
  "...a....",
  "...a7...",
  "..aaa...",
  "aaaaaaa7",
  ".aaaaa..",
  "..aaa...",
  ".aa.aa..",
  ".a...a.."
];
const ROUTE = [128, 146, 188, 136, 82, 126, 180, 134, 82, 128];
const STAGE_NAMES = [
  "MOONLIT MEADOW",
  "SILVER STAIR",
  "VIOLET DRIFT",
  "COMET CROSSING",
  "THE MOON SANCTUARY"
];

let catAsset, catArt, cat, clouds, stars, particles, sky;
let stage, lives, caught, needed, chain, chainTime, camera;
let checkpoint, stageClock, spawnClock, transition, deathClock;
let ended, gateY, toast, totalClock;

function makeCatArt(clip, ticks) {
  const f = catAsset.frame(clip, ticks, false);
  const planes = [{ pixels: f.pixels, palette: f.palette }];
  if (f.layers) {
    for (let i = 0; i < f.layers.length; i++) planes.push(f.layers[i]);
  }
  let x0 = 10000, y0 = 10000, x1 = -1, y1 = -1;
  for (let p = 0; p < planes.length; p++) {
    const rows = planes[p].pixels;
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        if (rows[y][x] !== ".") {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y);
          x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
      }
    }
  }
  if (x1 < 0) return { planes: [], w: 20, h: 18 };
  const scale = Math.min(20 / (x1 - x0 + 1), 18 / (y1 - y0 + 1));
  const w = Math.max(1, Math.round((x1 - x0 + 1) * scale));
  const h = Math.max(1, Math.round((y1 - y0 + 1) * scale));
  const result = [];
  for (let p = 0; p < planes.length; p++) {
    const rows = [];
    for (let y = 0; y < h; y++) {
      let row = "";
      const sy = Math.min(y1, y0 + Math.floor(y / scale));
      for (let x = 0; x < w; x++) {
        const sx = Math.min(x1, x0 + Math.floor(x / scale));
        row += planes[p].pixels[sy] && planes[p].pixels[sy][sx] || ".";
      }
      rows.push(row);
    }
    result.push({ pixels: rows, palette: planes[p].palette });
  }
  return { planes: result, w: w, h: h };
}

function init(api) {
  catAsset = ART.get("climber/cat");
  catArt = [
    makeCatArt("wait", 0),
    makeCatArt("rescued", 0),
    makeCatArt("rescued", 8),
    makeCatArt("rescued", 16)
  ];
  sky = [];
  for (let i = 0; i < 65; i++) {
    sky.push({
      x: Math.random() * 256,
      y: Math.random() * 224,
      phase: Math.random() * 6.28,
      size: i % 9 === 0
    });
  }
  particles = [];
  stars = [];
  clouds = [];
  stage = 1;
  lives = 3;
  chain = 0;
  chainTime = 0;
  totalClock = 0;
  transition = 0;
  deathClock = 0;
  ended = false;
  api.score(0);
  startStage(api);
}

function startStage(api) {
  clouds = [];
  stars = [];
  particles = [];
  camera = 0;
  stageClock = 0;
  spawnClock = 1.8;
  caught = 0;
  needed = stage + 4;
  chain = 0;
  chainTime = 0;
  toast = 2;
  transition = 0;
  deathClock = 0;
  for (let i = 0; i < ROUTE.length; i++) {
    const safe = i === 0 || i % 3 === 0;
    const motion = stage >= 2 && !safe && i > 1;
    let x = ROUTE[i];
    if (stage % 2 === 0 && i > 0 && i < 9) x = 256 - x;
    clouds.push({
      x: x, base: x, y: 200 - i * 48,
      w: i === 0 ? 88 : safe ? 64 : Math.max(38, 50 - stage * 2),
      safe: safe,
      amp: motion ? Math.min(12, 5 + stage * 2) : 0,
      phase: i * 1.9,
      squash: 0
    });
  }
  checkpoint = clouds[0];
  cat = {
    x: 128, y: 200, vx: 0, vy: -246,
    nudge: true, facing: 1, squash: 0.13,
    inv: 1, magic: 0, happy: 0
  };
  gateY = clouds[9].y;
  stars.push({ x: 143, y: 118, speed: 22, warning: 0, age: 0 });
  api.sfx("jump");
}

function burst(x, y, color, count, power) {
  for (let i = 0; i < count && particles.length < 130; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = power * (0.3 + Math.random() * 0.7);
    particles.push({
      x: x, y: y, vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 12,
      life: 0.3 + Math.random() * 0.4,
      max: 0.7, c: color, label: ""
    });
  }
}

function label(x, y, text, color) {
  if (particles.length < 130) {
    particles.push({
      x: x, y: y, vx: 0, vy: -22,
      life: 0.8, max: 0.8, c: color, label: text
    });
  }
}

function spawnShower(api) {
  if (caught >= needed) return;
  const pressure = stage > 1 && stageClock % 12 >= 3 && stageClock % 12 < 9;
  const cap = stage === 1 ? 1 : pressure ? 4 : 2;
  if (stars.length >= cap) return;
  let target = null;
  let best = 10000;
  for (let i = 0; i < clouds.length; i++) {
    const p = clouds[i];
    const d = Math.abs(p.y - (cat.y - 32));
    if (d < best) { best = d; target = p; }
  }
  const lane = api.clamp(target.x + (Math.random() - 0.5) * 24, 24, 232);
  stars.push({
    x: lane, y: camera + 41, speed: Math.min(44, 27 + stage * 3),
    warning: 0.65, age: 0
  });
  if (pressure && stars.length < cap && needed - caught > 1) {
    const side = lane > 128 ? -1 : 1;
    stars.push({
      x: api.clamp(lane + side * 36, 22, 234),
      y: camera + 38, speed: 39,
      warning: 1.05, age: 0
    });
  }
}

function miss(api) {
  lives--;
  chain = 0;
  chainTime = 0;
  deathClock = 0.75;
  cat.inv = 1;
  burst(cat.x, camera + 210, 14, 22, 90);
  api.sfx("die");
  api.flash(2, 3);
  api.shake(9);
}

function respawn(api) {
  camera = Math.min(0, checkpoint.y - 186);
  cat.x = checkpoint.x;
  cat.y = checkpoint.y;
  cat.vx = 0;
  cat.vy = -246;
  cat.nudge = true;
  cat.inv = 1;
  cat.squash = 0.13;
  cat.magic = 0;
  stars = [];
  spawnClock = 0.3;
  checkpoint.squash = 0.25;
  api.sfx("jump");
}

function update(api, dt) {
  if (ended) return;
  totalClock += dt;
  toast = Math.max(0, toast - dt);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (!p.label) p.vy += 65 * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  if (deathClock > 0) {
    deathClock -= dt;
    if (deathClock <= 0) {
      if (lives <= 0 && api.t > 2) {
        ended = true;
        api.gameOver();
      } else {
        respawn(api);
      }
    }
    return;
  }
  stageClock += dt;
  chainTime = Math.max(0, chainTime - dt);
  if (chainTime === 0) chain = 0;
  cat.inv = Math.max(0, cat.inv - dt);
  cat.squash = Math.max(0, cat.squash - dt);
  cat.magic = Math.max(0, cat.magic - dt);
  cat.happy = Math.max(0, cat.happy - dt);

  for (let i = 0; i < clouds.length; i++) {
    const p = clouds[i];
    p.x = p.base + Math.sin(stageClock * (0.85 + stage * 0.06) + p.phase) * p.amp;
    p.squash = Math.max(0, p.squash - dt);
  }

  const steer = (api.btn("right") ? 1 : 0) - (api.btn("left") ? 1 : 0);
  if (steer) {
    cat.vx = api.clamp(cat.vx + steer * 490 * dt, -112, 112);
    cat.facing = steer;
  } else {
    cat.vx *= 0.92;
  }
  if (api.btnp("a") && cat.vy < 0 && cat.nudge) {
    cat.vy = Math.max(-285, cat.vy - 74);
    cat.vx *= 0.7;
    cat.nudge = false;
    cat.magic = 0.35;
    burst(cat.x + cat.facing * 13, cat.y - 14, 13, 12, 55);
    api.sfx("powerup");
  }

  const oldX = cat.x;
  const oldY = cat.y;
  cat.x = api.clamp(cat.x + cat.vx * dt, 12, 244);
  if (cat.x === 12 || cat.x === 244) cat.vx = 0;
  cat.vy += 460 * dt;
  cat.y += cat.vy * dt;

  if (cat.vy > 0) {
    let landing = null;
    for (let i = 0; i < clouds.length; i++) {
      const p = clouds[i];
      // Swept downward crossing; the tiny swept edge grace also catches
      // a paw that leaves the edge just before contact this frame.
      const left = Math.min(oldX, cat.x) - 6;
      const right = Math.max(oldX, cat.x) + 6;
      if (oldY <= p.y + 0.1 && cat.y >= p.y &&
          right >= p.x - p.w / 2 - 2 &&
          left <= p.x + p.w / 2 + 2) {
        if (!landing || p.y < landing.y) landing = p;
      }
    }
    if (landing) {
      cat.y = landing.y;
      cat.vy = -246;
      cat.nudge = true;
      cat.squash = 0.12;
      landing.squash = 0.24;
      if (landing.safe) checkpoint = landing;
      burst(cat.x, cat.y + 2, 7, 7, 32);
      api.sfx("jump");
    }
  }

  const desiredCamera = Math.min(0, cat.y - 148);
  if (desiredCamera < camera) {
    camera += (desiredCamera - camera) * Math.min(1, dt * 12);
  }

  if (transition > 0) {
    transition -= dt;
    if (transition <= 0) {
      if (stage === 5) {
        api.addScore(lives * 500);
        ended = true;
        api.win();
      } else {
        stage++;
        startStage(api);
      }
    }
    return;
  }

  spawnClock -= dt;
  if (spawnClock <= 0) {
    spawnShower(api);
    spawnClock = stage === 1 ? 1.3 : stageClock % 12 < 3 ? 1.8 : 1.25;
  }

  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    s.age += dt;
    if (s.warning > 0) {
      s.y = camera + 41;
      s.warning -= dt;
      if (s.warning <= 0) api.tone(960, 35, "triangle");
      continue;
    }
    s.y += s.speed * dt;
    if (Math.abs(s.x - cat.x) < 13 &&
        s.y + 4 >= cat.y - 25 && s.y - 4 <= cat.y) {
      stars.splice(i, 1);
      if (caught < needed) {
        caught++;
        chain = chainTime > 0 ? Math.min(3, chain + 1) : 1;
        chainTime = 1.5;
        api.addScore(chain * 100);
        burst(s.x, s.y, 10, 15, 72);
        label(s.x - 12, s.y - 10, "" + chain * 100, 10);
        cat.happy = 0.3;
        api.sfx("coin");
        if (caught === needed) {
          api.sfx("select");
          toast = 2;
          burst(128, gateY - 25, 10, 20, 70);
        }
      }
    } else if (s.y > camera + 235) {
      stars.splice(i, 1);
    }
  }

  if (caught >= needed &&
      Math.abs(cat.x - 128) < 25 &&
      cat.y < gateY + 4 && cat.y > gateY - 65) {
    transition = 1.05;
    api.addScore(1000);
    chain = 0;
    chainTime = 0;
    stars = [];
    burst(128, gateY - 28, 10, 36, 105);
    label(108, gateY - 57, "+1000", 10);
    api.sfx("powerup");
    api.flash(13, 2);
    return;
  }

  if (cat.y - camera > 249 && cat.inv <= 0) miss(api);
}

function drawCloud(api, p) {
  const y = p.y - camera;
  if (y < 29 || y > 232) return;
  const x = p.x - p.w / 2;
  const dip = p.squash > 0 ? Math.sin(p.squash / 0.24 * Math.PI) * 3 : 0;
  const yy = y + dip;
  api.rectfill(x + 6, yy + 3, p.w - 12, 8, 1);
  api.circfill(x + 8, yy + 4, 7, 12);
  api.circfill(x + p.w - 9, yy + 4, 7, 12);
  api.rectfill(x + 8, yy - 1, p.w - 16, 10, 12);
  api.circfill(x + 10, yy, 6, 7);
  api.circfill(x + p.w * 0.38, yy - 3, 8, 7);
  api.circfill(x + p.w * 0.65, yy - 2, 7, 7);
  api.circfill(x + p.w - 10, yy, 6, 7);
  api.rectfill(x + 8, yy - 2, p.w - 16, 7, 7);
  api.line(x + 11, yy + 6, x + p.w - 12, yy + 6, 6);
  if (p.safe) {
    api.pset(p.x - 3, yy + 4, 13);
    api.pset(p.x, yy + 5, 13);
    api.pset(p.x + 3, yy + 4, 13);
  }
  if (p.amp) {
    api.line(p.x - 5, yy + 12, p.x + 5, yy + 12, 13);
    api.pset(p.x - 7, yy + 12, 13);
    api.pset(p.x + 7, yy + 12, 13);
  }
  if (p.squash > 0) {
    api.line(x + 3, yy - 8, x, yy - 11, 7);
    api.line(x + p.w - 3, yy - 8, x + p.w, yy - 11, 7);
  }
}

function drawCat(api) {
  if (deathClock > 0) return;
  if (cat.inv > 0 && Math.floor(totalClock * 16) % 3 === 0) return;
  const squash = cat.squash > 0;
  const pose = squash ? 0 : cat.happy > 0 ? 3 : cat.vy < 0 ? 1 : 2;
  const art = catArt[pose];
  const x = Math.round(cat.x);
  const y = Math.round(cat.y - camera);
  const bodyY = y - art.h + (squash ? 2 : 0);

  // A moving tail and robe give each arc a distinct silhouette.
  const tailX = x - cat.facing * 10;
  const tailLift = squash ? 0 : cat.vy < 0 ? 6 : 3;
  api.line(tailX, y - 5, tailX - cat.facing * 6, y - 8 - tailLift, 6);
  api.line(tailX - cat.facing * 6, y - 8 - tailLift,
    tailX - cat.facing * 5, y - 12 - tailLift, 7);
  api.rectfill(x - 7, y - 9, 14, 7, 2);
  api.line(x - 7, y - 9, x + 6, y - 9, 13);
  for (let i = 0; i < art.planes.length; i++) {
    const plane = art.planes[i];
    api.spr(plane.pixels, x - Math.floor(art.w / 2), bodyY,
      cat.facing < 0, false, plane.palette);
  }
  if (!squash) {
    api.rectfill(x - 7, y - 2, 4, 3, 7);
    api.rectfill(x + 3, y - 2 + (cat.vy > 0 ? 1 : 0), 4, 3, 7);
  }
  const hatY = y - 29 + (squash ? 4 : 0);
  api.spr(CAT_HAT, x - 8, hatY, cat.facing < 0);
  api.pset(x - 4, hatY + 15, 10);
  api.pset(x + 3, hatY + 15, 10);

  const wandX = x + cat.facing * (squash ? 10 : 13);
  const wandY = y - (cat.magic > 0 ? 23 : 15);
  api.line(x + cat.facing * 7, y - 7, wandX, wandY, 4);
  api.line(x + cat.facing * 8, y - 7, wandX + 1, wandY, 15);
  api.pset(wandX, wandY - 2, 7);
  api.line(wandX - 2, wandY, wandX + 2, wandY, cat.nudge ? 10 : 13);
  api.line(wandX, wandY - 2, wandX, wandY + 2, cat.nudge ? 10 : 13);
  if (cat.magic > 0) {
    api.circ(wandX, wandY, 5 + (0.35 - cat.magic) * 22, 13);
  }
}

function draw(api) {
  api.cls(1);
  api.rectfill(0, 118, 256, 106, 2);
  api.rectfill(0, 103, 256, 15, 1);

  for (let i = 0; i < sky.length; i++) {
    const s = sky[i];
    const y = 31 + ((s.y - camera * 0.18) % 193 + 193) % 193;
    const bright = Math.sin(totalClock * 1.7 + s.phase) > 0.55;
    api.pset(s.x, y, bright ? 7 : 13);
    if (s.size && bright) {
      api.pset(s.x - 1, y, 13);
      api.pset(s.x + 1, y, 13);
      api.pset(s.x, y - 1, 13);
      api.pset(s.x, y + 1, 13);
    }
  }

  api.circfill(224, 57, 17, 13);
  api.circfill(230, 52, 16, 1);
  api.pset(216, 62, 7);
  api.pset(219, 69, 7);

  // Moonlit, slow-moving cloud banks and distant spires.
  for (let i = 0; i < 5; i++) {
    const x = ((i * 71 + totalClock * (i % 2 ? 2 : -2)) % 340 + 340) % 340 - 42;
    const y = 84 + ((i * 39 - camera * 0.10) % 125 + 125) % 125;
    api.circfill(x + 14, y, 10, 5);
    api.circfill(x + 28, y - 3, 13, 5);
    api.rectfill(x, y + 2, 57, 5, 5);
    api.line(x + 6, y + 6, x + 49, y + 6, 1);
  }
  for (let i = 0; i < 3; i++) {
    const x = i === 0 ? 0 : i === 1 ? 238 : 247;
    const y = 184 + i * 9 + Math.sin(camera * 0.004) * 8;
    api.rectfill(x, y, 12, 224 - y, 1);
    api.line(x, y, x + 6, y - 15, 1);
    api.line(x + 6, y - 15, x + 12, y, 1);
    api.rectfill(x + 4, y + 9, 2, 5, 13);
  }

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (s.warning <= 0) continue;
    const sy = s.y - camera;
    for (let y = 45; y < 217; y += 13) api.pset(s.x, y, 5);
    api.line(s.x - 3, sy - 5, s.x, sy - 2, 10);
    api.line(s.x + 3, sy - 5, s.x, sy - 2, 10);
    if (Math.floor(s.age * 10) % 2 === 0) api.circ(s.x, sy + 5, 4, 10);
  }

  const gy = gateY - camera;
  if (gy > 20 && gy < 290) {
    const open = caught >= needed;
    const color = open ? 10 : 13;
    api.rectfill(101, gy - 38, 5, 38, 5);
    api.rectfill(150, gy - 38, 5, 38, 5);
    api.line(102, gy - 37, 102, gy - 3, color);
    api.line(153, gy - 37, 153, gy - 3, color);
    api.circ(128, gy - 33, 25, color);
    api.circ(128, gy - 33, 22, open ? 7 : 5);
    api.circfill(128, gy - 36, 10, color);
    api.circfill(132, gy - 39, 9, 1);
    if (open) {
      for (let i = 0; i < 6; i++) {
        const a = totalClock * 2 + i * Math.PI / 3;
        api.pset(128 + Math.cos(a) * 19, gy - 32 + Math.sin(a) * 19, 7);
      }
    }
    if (gy - 72 > 32 && gy - 72 < 212) {
      api.textCenter(open ? "ENTER" : "NEED " + (needed - caught), gy - 72, color);
    }
  }

  for (let i = 0; i < clouds.length; i++) drawCloud(api, clouds[i]);

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (s.warning > 0) continue;
    const y = s.y - camera;
    if (y < 30 || y > 232) continue;
    api.line(s.x, y - 12, s.x, y - 7, 9);
    api.pset(s.x, y - 15, 4);
    api.spr(STAR, s.x - 4, y - 4);
    if (Math.floor(s.age * 7) % 3 === 0) {
      api.pset(s.x + 7, y - 5, 7);
      api.pset(s.x - 6, y + 3, 10);
    }
  }

  drawCat(api);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const y = p.y - camera;
    if (y < 32) continue;
    if (p.label) {
      api.text(p.label, api.clamp(p.x, 0, 216), y, p.c);
    } else {
      api.pset(p.x, y, p.c);
      if (p.life > 0.35) {
        api.pset(p.x + 1, y, p.c);
        api.pset(p.x, y + 1, p.c);
      }
    }
  }

  if (toast > 0 && transition <= 0 && deathClock <= 0) {
    api.rectfill(0, 211, 256, 13, 1);
    api.textCenter(caught >= needed ? "THE MOON GATE IS OPEN!" : STAGE_NAMES[stage - 1], 214, caught >= needed ? 10 : 13);
  }
  if (deathClock > 0) {
    api.rectfill(40, 103, 176, 23, 2);
    api.textCenter(lives > 0 ? "A CLOUD TOO FAR..." : "LAST STAR FADES", 111, 14);
  }
  if (transition > 0) {
    api.rectfill(40, 89, 176, 25, 1);
    api.textCenter(stage === 5 ? "MOON MAGIC RESTORED" : "MOON GATE CLEARED", 98, 10);
  }

  // All game-specific status sits below the cabinet's score strip.
  api.rectfill(0, 12, 256, 20, 1);
  for (let i = 0; i < 3; i++) {
    const x = 7 + i * 11;
    const c = i < lives ? 14 : 5;
    api.circfill(x, 20, 2, c);
    api.circfill(x + 4, 20, 2, c);
    api.line(x - 1, 22, x + 2, 25, c);
    api.line(x + 5, 22, x + 2, 25, c);
    api.line(x, 22, x + 4, 22, c);
  }
  api.text(stage + "/5", 45, 17, 13);
  api.spr(STAR, 87, 17);
  api.text(caught + "/" + needed, 99, 17, caught >= needed ? 11 : 10);
  if (chain > 0) {
    api.text("X" + chain, 157, 17, 10);
    api.rectfill(178, 19, 30, 4, 5);
    api.rectfill(178, 19, 30 * chainTime / 1.5, 4, 10);
  }
  api.line(229, 25, 238, 17, 15);
  api.circfill(239, 16, 2, cat.nudge ? 10 : 5);
  api.line(0, 31, 255, 31, 5);
}
