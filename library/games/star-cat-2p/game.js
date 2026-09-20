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
const STAR_PIXELS = [
  "...7....",
  "...7....",
  "..777...",
  "7777777.",
  "..777...",
  "...7....",
  "...7....",
  "........"
];
const GOLD_PIXELS = [
  "...7....",
  "...a....",
  "..aaa...",
  "7aaaaa7.",
  "..aaa...",
  "...a....",
  "...7....",
  "........"
];
const STAR_X = [64, 192, 110, 174, 42, 218, 90, 154];
const SKY_DOTS = [
  [12, 48], [43, 83], [84, 41], [131, 60], [165, 46],
  [230, 66], [21, 126], [147, 106], [205, 141], [74, 175],
  [242, 191], [125, 210], [10, 202], [192, 93], [101, 131]
];

let catArt, cats, clouds, stars, bolts, motes, puffs;
let elapsed, nextStar, nextPuff, starId, rowId, caught;
let rescues, section, scrollLeft, scrollWarning;
let result, resultAge, finished, windX, windDirection, pressure;
let message, messageAge;

function init(api) {
  catArt = ART.get("climber/cat");
  cats = [];
  clouds = [];
  stars = [];
  bolts = [];
  motes = [];
  puffs = [];
  elapsed = 0;
  nextStar = 0.2;
  nextPuff = 22;
  starId = 0;
  rowId = 0;
  caught = 0;
  rescues = 6;
  section = 0;
  scrollLeft = 0;
  scrollWarning = false;
  result = "";
  resultAge = 0;
  finished = false;
  windX = 128;
  windDirection = 1;
  pressure = false;
  message = "CATCH THE FALLING STARS";
  messageAge = 3;

  for (let r = 0; r < 5; r++) {
    addCloudRow(204 - r * 44, r === 0);
  }
  for (let i = 0; i < 2; i++) {
    cats.push({
      x: i === 0 ? 64 : 192, y: 204,
      vx: 0, vy: -306, face: i === 0 ? 1 : -1,
      hearts: 3, inv: 0, cool: 0, dash: 0, usedDash: false,
      catchAge: 0, poseTick: 0, bounce: 12, cast: 0,
      color: i === 0 ? api.P1 : api.P2
    });
    api.score(0, i);
  }
}

function addCloudRow(y, broad) {
  const odd = rowId % 2;
  for (let j = 0; j < 2; j++) {
    const x = broad ? (j === 0 ? 64 : 192)
      : odd ? (j === 0 ? 105 : 216)
      : (j === 0 ? 50 : 170);
    clouds.push({
      x: x, base: x, y: y, width: broad ? 84 : 40,
      moving: false, phase: rowId * 1.7 + j * 2.1,
      pulse: 0
    });
  }
  rowId++;
}

function spark(x, y, color, count) {
  for (let i = 0; i < count && motes.length < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 43;
    motes.push({
      x: x, y: y, vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 14,
      life: 0.35 + Math.random() * 0.3, color: color
    });
  }
}

function wrapDistance(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 256 - d);
}

function collectStar(api, star, cat) {
  if (star.dead) return;
  star.dead = true;
  caught++;
  api.addScore(star.gold ? 300 : 100);
  api.sfx(star.gold ? "powerup" : "coin");
  cat.catchAge = 30;
  cat.poseTick = 0;
  spark(star.x, star.y, star.gold ? 10 : 7, star.gold ? 16 : 8);
}

function rescueCat(api, cat) {
  if (cat.inv > 0 || cat.hearts <= 0) return;
  cat.hearts--;
  rescues = Math.max(0, rescues - 1);
  spark(cat.x, Math.min(cat.y - 10, 212), cat.color, 12);
  api.sfx(cat.hearts > 0 ? "hit" : "die");
  api.shake(5);
  cat.dash = 0;
  cat.cast = 0;
  if (cat.hearts === 0) return;

  let lowest = null;
  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    if (c.y <= 213 && (!lowest || c.y > lowest.y ||
        (c.y === lowest.y && Math.abs(c.x - cat.x) < Math.abs(lowest.x - cat.x)))) {
      lowest = c;
    }
  }
  cat.x = lowest ? lowest.x : 128;
  cat.y = lowest ? lowest.y : 200;
  cat.vx = 0;
  cat.vy = -306;
  cat.inv = 60;
  cat.usedDash = false;
  cat.bounce = 12;
  cat.catchAge = 0;
  cat.poseTick = 0;
}

function beginResult(api, clear) {
  if (result) return;
  result = clear ? "TEAM CLEAR!" : "STARS LOST";
  resultAge = 0;
  api.sfx(clear ? "powerup" : "die");
  if (clear) {
    spark(88, 97, 10, 18);
    spark(168, 97, 7, 18);
  }
}

function update(api, dt) {
  if (finished) return;

  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vy += 55 * dt;
    m.life -= dt;
    if (m.life <= 0) motes.splice(i, 1);
  }

  if (result) {
    resultAge += dt;
    if (resultAge >= 2.4) {
      finished = true;
      if (result === "TEAM CLEAR!") api.win();
      else api.gameOver();
    }
    return;
  }

  elapsed += dt;
  messageAge = Math.max(0, messageAge - dt);
  pressure = elapsed >= 10 && ((elapsed - 10) % 18 < 12);

  const newSection = Math.floor(elapsed / 10);
  if (elapsed % 10 >= 9 && !scrollWarning) {
    scrollWarning = true;
    api.tone(660, 65, "triangle");
  }
  if (newSection > section) {
    section = newSection;
    scrollWarning = false;
    scrollLeft = 44;
    addCloudRow(-16, false);
    let movers = 0;
    for (let i = 0; i < clouds.length; i++) {
      clouds[i].moving = false;
    }
    for (let i = clouds.length - 1; i >= 0 && movers < 3; i--) {
      if (i % 2 === section % 2) {
        clouds[i].moving = true;
        clouds[i].base = clouds[i].x;
        movers++;
      }
    }
    message = section === 1 ? "DRIFTING CLOUDS"
      : section === 2 ? "GOLD STARS / STORM PUFFS"
      : section === 3 ? "MOON WIND" : "HIGHER INTO THE SKY";
    messageAge = 2.3;
    api.tone(880, 90, "triangle");
  }

  const scroll = Math.min(scrollLeft, 29.333 * dt);
  scrollLeft -= scroll;
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i];
    c.y += scroll;
    if (c.moving) c.x = c.base + Math.sin(elapsed * 0.65 + c.phase) * 17;
    c.pulse = Math.max(0, c.pulse - dt);
    if (c.y > 229) clouds.splice(i, 1);
  }
  for (let i = 0; i < stars.length; i++) stars[i].y += scroll;
  for (let i = 0; i < puffs.length; i++) puffs[i].y += scroll;
  for (let i = 0; i < bolts.length; i++) bolts[i].y += scroll;

  windX = section % 2 === 0 ? 78 : 181;
  windDirection = section % 2 === 0 ? 1 : -1;
  const windOn = elapsed >= 30 && pressure;

  if (elapsed >= nextStar) {
    if (stars.length < 4) {
      const gold = elapsed >= 20 && starId % 4 === 3;
      stars.push({
        id: starId, x: STAR_X[starId % STAR_X.length],
        y: 38, age: 0, gold: gold, dead: false,
        speed: gold ? 25 : starId === 0 ? 60 : 46 + (starId % 3) * 5
      });
      starId++;
    }
    nextStar = elapsed + (elapsed < 10 ? 1.55 : pressure ? 0.95 : 1.65);
  }

  if (elapsed >= nextPuff) {
    if (pressure && puffs.length < 2) {
      let x = (Math.floor(elapsed / 6) % 2) ? 25 : 231;
      let y = 98 + (Math.floor(elapsed) % 3) * 24;
      for (let i = 0; i < cats.length; i++) {
        if (cats[i].hearts > 0 && wrapDistance(cats[i].x, x) < 42 &&
            Math.abs(cats[i].y - 12 - y) < 44) {
          y = y < 130 ? 177 : 80;
        }
      }
      puffs.push({
        x: x, y: y, vx: x < 128 ? 17 : -17,
        age: 0, life: 7, phase: elapsed
      });
      api.tone(180, 80, "triangle");
    }
    nextPuff = elapsed + 5;
  }

  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.age += dt;
    if (p.age > 1.05) p.x += p.vx * dt;
    p.life -= dt;
    if (p.life <= 0 || p.y > 225 || p.x < -24 || p.x > 280) puffs.splice(i, 1);
  }

  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    if (cat.hearts <= 0) continue;
    cat.y += scroll;
    cat.inv = Math.max(0, cat.inv - 1);
    cat.cool = Math.max(0, cat.cool - 1);
    cat.catchAge = Math.max(0, cat.catchAge - 1);
    cat.bounce = Math.max(0, cat.bounce - 1);
    cat.cast = Math.max(0, cat.cast - 1);
    cat.poseTick++;

    const direction = (api.btn("right", i) ? 1 : 0) - (api.btn("left", i) ? 1 : 0);
    if (direction) cat.face = direction;

    if (api.btnp("b", i) && !cat.usedDash) {
      cat.usedDash = true;
      cat.dash = 11;
      api.sfx("jump");
      spark(cat.x - cat.face * 8, cat.y - 8, cat.color, 5);
    }

    if (api.btn("a", i) && cat.cool === 0) {
      cat.cool = 20;
      cat.cast = 10;
      bolts.push({
        x: cat.x + cat.face * 11, y: cat.y - 13,
        vx: cat.face * 180, age: 0, owner: i, oldX: cat.x + cat.face * 11
      });
      api.sfx("shoot");
    }

    if (cat.dash > 0) {
      cat.dash--;
      cat.vx = cat.face * 216;
    } else {
      const desired = direction * 91;
      cat.vx += Math.max(-14, Math.min(14, desired - cat.vx));
      if (windOn && Math.abs(cat.x - windX) < 26) cat.vx += windDirection * 23;
    }
    cat.x += cat.vx * dt;
    if (cat.x < 0) cat.x += 256;
    if (cat.x >= 256) cat.x -= 256;

    const oldY = cat.y;
    cat.vy += 600 * dt;
    cat.y += cat.vy * dt;
    // The upper boundary keeps the cats readable beneath the HUD.
    if (cat.y < 57) {
      cat.y = 57;
      cat.vy = Math.max(0, cat.vy);
    }
    if (cat.vy > 0) {
      let landing = null;
      for (let j = 0; j < clouds.length; j++) {
        const c = clouds[j];
        if (oldY <= c.y + 1 && cat.y >= c.y &&
            wrapDistance(cat.x, c.x) <= c.width / 2 + 5) {
          if (!landing || c.y < landing.y) landing = c;
        }
      }
      if (landing) {
        cat.y = landing.y;
        cat.vy = -306;
        cat.usedDash = false;
        cat.dash = 0;
        cat.bounce = 10;
        landing.pulse = 0.23;
        api.tone(i === 0 ? 350 : 420, 35, "triangle");
      }
    }

    for (let j = 0; j < puffs.length; j++) {
      const p = puffs[j];
      if (p.age > 1.05 && cat.inv === 0 &&
          Math.abs(cat.x - p.x) < 20 && Math.abs(cat.y - 11 - p.y) < 17) {
        rescueCat(api, cat);
        break;
      }
    }

    if (cat.y > 239) {
      // A protected rescue cannot accidentally consume a second heart.
      if (cat.inv > 0) {
        let c = clouds[0];
        for (let j = 0; j < clouds.length; j++) {
          if (clouds[j].y <= 213 && clouds[j].y > c.y) c = clouds[j];
        }
        cat.x = c.x;
        cat.y = c.y;
        cat.vy = -306;
        cat.usedDash = false;
      } else {
        rescueCat(api, cat);
      }
    }
  }

  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.oldX = b.x;
    b.x += b.vx * dt;
    b.age += dt;
    if (b.age > 0.22 || b.x < -12 || b.x > 268) bolts.splice(i, 1);
  }

  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    s.age += dt;
    s.y += s.speed * dt;
    for (let j = 0; j < cats.length && !s.dead; j++) {
      const cat = cats[j];
      if (cat.hearts > 0 && wrapDistance(cat.x, s.x) < 13 &&
          s.y > cat.y - 26 && s.y < cat.y + 3) {
        collectStar(api, s, cat);
      }
    }
    for (let j = 0; j < bolts.length && !s.dead; j++) {
      const b = bolts[j];
      if (s.x >= Math.min(b.oldX, b.x) - 7 &&
          s.x <= Math.max(b.oldX, b.x) + 7 && Math.abs(s.y - b.y) < 10) {
        collectStar(api, s, cats[b.owner]);
      }
    }
    if (s.dead || s.age >= 3.5 || s.y > 229) {
      if (!s.dead) spark(s.x, s.y, 5, 3);
      stars.splice(i, 1);
    }
  }

  if (caught >= 30) beginResult(api, true);
  else if (cats[0].hearts <= 0 && cats[1].hearts <= 0) beginResult(api, false);
  else if (elapsed >= 75) beginResult(api, caught >= 24);
}

function heart(api, x, y, color) {
  api.rectfill(x, y, 3, 3, color);
  api.rectfill(x + 4, y, 3, 3, color);
  api.rectfill(x, y + 2, 7, 2, color);
  api.rectfill(x + 1, y + 4, 5, 1, color);
  api.rectfill(x + 2, y + 5, 3, 1, color);
  api.pset(x + 3, y + 6, color);
}

function paintCloud(api, c) {
  const left = c.x - c.width / 2;
  const dip = c.pulse > 0 ? 2 : 0;
  const y = c.y + dip;
  api.rectfill(left + 3, y + 3, c.width - 6, 7, 13);
  api.circfill(left + 6, y + 4, 6, 6);
  api.circfill(left + c.width - 7, y + 4, 6, 6);
  api.rectfill(left + 5, y, c.width - 10, 7, 7);
  api.circfill(left + 11, y + 1, 5, 7);
  api.circfill(c.x + 2, y, 7, 7);
  api.circfill(left + c.width - 10, y + 2, 5, 7);
  api.line(left + 5, y + 8, left + c.width - 6, y + 8, 12);
  api.line(left + 8, y + 1, left + 17, y + 1, 6);
  if (c.moving) {
    api.pset(c.x - 3, y + 10, 12);
    api.pset(c.x + 3, y + 10, 12);
  }
}

function paintCat(api, cat, index, offset) {
  if (cat.hearts <= 0) return;
  if (cat.inv > 0 && Math.floor(cat.inv / 4) % 2 === 0) return;
  const x = cat.x + offset;
  const y = cat.y;
  const clip = cat.catchAge > 0 ? "rescued" : "wait";
  const ticks = cat.catchAge > 0 ? 30 - cat.catchAge : cat.poseTick;
  const frame = catArt.frame(clip, ticks, cat.face < 0);
  const artW = frame.pixels[0].length;
  const artH = frame.pixels.length;
  const squash = cat.bounce > 6 ? 2 : 0;
  const top = y - artH + squash;

  if (cat.dash > 0) {
    api.line(x - cat.face * 15, y - 7, x - cat.face * 28, y - 7, 13);
    api.line(x - cat.face * 15, y - 15, x - cat.face * 35, y - 15, cat.color);
  }

  // Native asset pixels and palette are retained; costume pieces are aligned
  // to its visible bounds rather than assuming its authored anchor.
  catArt.draw(api, clip, ticks,
    x - artW / 2 + frame.anchor.x,
    top + frame.anchor.y, cat.face < 0);

  // Flared wizard robe, belt, feet, and a visible curved cat tail.
  const robeY = y - 9 + squash;
  for (let r = 0; r < 8 - squash; r++) {
    const half = 4 + Math.floor(r / 2);
    api.line(x - half, robeY + r, x + half, robeY + r, cat.color);
  }
  api.line(x - 3, robeY + 1, x - 4, y - 3, 7);
  api.line(x - 5, robeY + 4, x + 5, robeY + 4, 2);
  api.pset(x, robeY + 4, 10);
  api.line(x - cat.face * 7, y - 4, x - cat.face * 12, y - 6, 15);
  api.line(x - cat.face * 12, y - 6, x - cat.face * 13, y - 11, 15);
  if (cat.vy > 0) {
    api.rectfill(x - 6, y - 2, 3, 2, 15);
    api.rectfill(x + 3, y - 2, 3, 2, 15);
  }

  // Hat sits between the asset's ears, keeping the cat face exposed.
  const hatBase = top + 3;
  for (let r = 0; r < 9; r++) {
    const half = Math.floor(r * 0.65);
    const lean = Math.floor((8 - r) / 3) * cat.face;
    api.line(x + lean - half, hatBase - 9 + r,
      x + lean + half, hatBase - 9 + r, 2);
    if (r > 2) api.pset(x + lean - half + 1, hatBase - 9 + r, cat.color);
  }
  api.rectfill(x - 6, hatBase - 2, 13, 2, cat.color);
  api.rectfill(x - 9, hatBase, 19, 2, 2);
  api.pset(x + 2, hatBase - 4, 10);

  const wandX = x + cat.face * (cat.cast ? 15 : 11);
  const wandY = y - (cat.cast ? 13 : 17);
  api.line(x + cat.face * 5, y - 8, wandX, wandY, 4);
  api.pset(wandX, wandY, 10);
  api.pset(wandX, wandY - 1, 7);
  if (cat.cast) {
    api.line(wandX - 3, wandY, wandX + 3, wandY, 10);
    api.line(wandX, wandY - 3, wandX, wandY + 3, 7);
  }
  if (cat.catchAge > 0) {
    const radius = 6 + (30 - cat.catchAge) * 0.6;
    api.pset(x - radius, y - 16, 10);
    api.pset(x + radius, y - 16, 10);
    api.pset(x, y - 16 - radius, 7);
  }
  // Player-colored marker also indicates whether the air-dash is available.
  api.rectfill(x - 3, y + 3, 7, 2, cat.usedDash ? 5 : cat.color);
  if (!cat.usedDash) api.pset(x, y + 3, 7);
}

function draw(api) {
  api.cls(1);

  // Moon and distant, softly layered cloud banks.
  api.circfill(217, 61, 18, 13);
  api.circfill(223, 56, 17, 1);
  api.circfill(208, 70, 2, 6);
  for (let i = 0; i < SKY_DOTS.length; i++) {
    const d = SKY_DOTS[i];
    const y = 39 + ((d[1] - 39 + elapsed * 1.8) % 183);
    api.pset(d[0], y, Math.floor(elapsed * 2 + i) % 5 === 0 ? 7 : 5);
    if (i % 5 === 0) api.pset(d[0] + 1, y, 13);
  }
  for (let i = 0; i < 5; i++) {
    const x = ((i * 69 + elapsed * 2) % 330) - 40;
    const y = 188 + (i % 3) * 12;
    api.circfill(x, y + 16, 21, 2);
    api.circfill(x + 21, y + 20, 25, 2);
  }
  api.rectfill(0, 216, 256, 8, 2);

  if (elapsed >= 30 && pressure) {
    api.line(windX - 25, 45, windX - 25, 214, 2);
    api.line(windX + 25, 45, windX + 25, 214, 2);
    for (let i = 0; i < 9; i++) {
      const y = 48 + i * 19;
      const x = windX - 18 + ((elapsed * 26 + i * 7) % 36);
      api.line(x - windDirection * 8, y, x, y, 5);
      api.line(x - windDirection * 3, y - 2, x, y, 5);
    }
  }

  for (let i = 0; i < clouds.length; i++) paintCloud(api, clouds[i]);

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (s.age > 2.9 && Math.floor(s.age * 15) % 2 === 0) continue;
    api.pset(s.x, s.y - 8, s.gold ? 9 : 13);
    api.pset(s.x, s.y - 12, 5);
    if (s.gold) api.circ(s.x, s.y, 7 + Math.floor(Math.sin(elapsed * 8) + 1), 4);
    api.spr(s.gold ? GOLD_PIXELS : STAR_PIXELS, s.x - 3, s.y - 3);
    if (Math.floor(elapsed * 8 + s.id) % 4 === 0) {
      api.pset(s.x - 7, s.y, s.gold ? 10 : 13);
      api.pset(s.x + 7, s.y, 7);
    }
  }

  for (let i = 0; i < puffs.length; i++) {
    const p = puffs[i];
    const y = p.y + Math.sin(elapsed * 3 + p.phase) * 2;
    if (p.age < 1.05) {
      api.circ(p.x, y, 16, Math.floor(p.age * 8) % 2 ? 9 : 13);
      api.text("!", p.x - 4, y - 4, 10);
    } else {
      api.circfill(p.x - 8, y + 1, 7, 2);
      api.circfill(p.x + 8, y + 1, 7, 2);
      api.circfill(p.x, y - 3, 10, 5);
      api.rectfill(p.x - 10, y, 20, 8, 5);
      api.line(p.x - 6, y - 5, p.x - 2, y - 3, 13);
      api.line(p.x + 2, y - 3, p.x + 6, y - 5, 13);
      api.pset(p.x - 4, y, 14);
      api.pset(p.x + 4, y, 14);
      api.line(p.x + 1, y + 8, p.x - 3, y + 12, 10);
      api.line(p.x - 3, y + 12, p.x + 2, y + 12, 10);
      api.line(p.x + 2, y + 12, p.x - 2, y + 17, 9);
    }
  }

  for (let i = 0; i < cats.length; i++) {
    paintCat(api, cats[i], i, 0);
    if (cats[i].x < 17) paintCat(api, cats[i], i, 256);
    if (cats[i].x > 239) paintCat(api, cats[i], i, -256);
  }

  for (let i = 0; i < bolts.length; i++) {
    const b = bolts[i];
    const dir = b.vx > 0 ? 1 : -1;
    api.line(b.x - dir * 10, b.y, b.x, b.y, cats[b.owner].color);
    api.line(b.x - dir * 4, b.y, b.x + dir * 3, b.y, 7);
    api.line(b.x, b.y - 3, b.x, b.y + 3, 10);
  }
  for (let i = 0; i < motes.length; i++) {
    const m = motes[i];
    api.pset(m.x, m.y, m.color);
    if (m.life > 0.35) api.pset(m.x + 1, m.y, m.color);
  }

  // Secondary HUD: the cabinet owns the score display above this strip.
  api.rectfill(0, 12, 256, 24, 1);
  api.line(0, 35, 255, 35, 2);
  for (let i = 0; i < 3; i++) {
    heart(api, 5 + i * 10, 16, cats[0].hearts > i ? api.P1 : 5);
    heart(api, 224 + i * 10, 16, cats[1].hearts > i ? api.P2 : 5);
  }
  api.textCenter(Math.max(0, Math.ceil(75 - elapsed)) + "S", 14, elapsed > 65 ? 10 : 7);
  api.textCenter("STARS " + caught + "/30", 26, 10);
  if (cats[0].hearts === 0) api.text("OUT", 4, 26, 13);
  if (cats[1].hearts === 0) api.text("OUT", 228, 26, 13);

  if (scrollWarning && !result) {
    api.rectfill(74, 39, 108, 12, 1);
    api.textCenter("^ CLIMB! ^", 41, 10);
  } else if (messageAge > 0 && !result) {
    api.rectfill(0, 39, 256, 12, 1);
    api.textCenter(message, 41, 13);
  } else if (elapsed > 60 && !result && caught < 24) {
    api.textCenter("24 STARS TO CLEAR", 41, 13);
  }

  if (result) {
    api.rectfill(27, 79, 202, 83, 2);
    api.rect(29, 81, 198, 79, result === "TEAM CLEAR!" ? 10 : 13);
    api.textCenter(result, 90, result === "TEAM CLEAR!" ? 10 : 7);
    api.textCenter(caught + " STARS CAUGHT", 108, 7);
    api.textCenter("HEARTS REMAINING", 127, 13);
    for (let i = 0; i < 3; i++) {
      heart(api, 80 + i * 11, 142, cats[0].hearts > i ? api.P1 : 5);
      heart(api, 145 + i * 11, 142, cats[1].hearts > i ? api.P2 : 5);
    }
  }
}
