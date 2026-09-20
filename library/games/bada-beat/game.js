// TITLE: BADA BEAT
// GENRE: runner
// CONTROLS: left right a b
// LEFT/RIGHT: change track. A: pulse on the flashing beat.
// B: hold to preview the next note's track.
// Untouched notes pass safely; mistimed A presses are pulse misses.
// Three pulse misses within a 12-second phrase end the run.
const BADA = [
  '...aa....aa.....',
  '..aaaa..aaaa....',
  '..aaaaaaaaaa....',
  '.aaaaaaaaaaaa...',
  '.aa77aaaa77aa...',
  '.aa17aaaa17aa...',
  '.aaaaaaaaaaaa...',
  '.aafaaaaaafaa...',
  '..aaa111aaa.....',
  '...aaaaaaa......',
  '..9ccccccc9.....',
  '.99cc7c7cc99....',
  '...ccccccc......',
  '....cc.cc.......',
  '...99...99......',
  '..999...999.....',
];
const NOTE = [
  '....777.',
  '....7cc7',
  '....c..c',
  '....c...',
  '.cccc...',
  'cc7cc...',
  'cccc....',
  '.cc.....',
];
const BLOB = [
  '..88.8..',
  '.888888.',
  '88888888',
  '88188188',
  '88888888',
  '.889988.',
  '..8888..',
  '.88..88.',
];
const HEART = ['.8.8.', '88888', '88888', '.888.', '..8..'];
const LANES = [56, 128, 200];
let g;

function init(api) {
  g = {
    lane: 1, x: 128, hearts: 3, combo: 0, meter: 100,
    objects: [], next: 0, pulse: 0, cooldown: 0, hurt: 0,
    phrase: 0, misses: 0, lastBeat: -1, usedBeat: -1,
    hint: 0, message: 'A ON THE FLASH!', messageTime: 3,
    ended: false,
  };
  api.score(0);
}

function say(text) {
  g.message = text;
  g.messageTime = 1.2;
}

function damage(api, fatal) {
  g.hearts = fatal ? 0 : g.hearts - 1;
  g.hurt = 1.1;
  g.combo = 0;
  api.sfx('hit');
  api.flash(8, 3);
  api.shake(10);
  if (g.hearts <= 0) {
    g.ended = true;
    api.sfx('die');
    api.gameOver();
  }
}

function update(api, dt) {
  if (g.ended) return;
  const phrase = Math.floor(api.t / 12);
  const phase = api.t % 12;
  if (phrase !== g.phrase) {
    g.phrase = phrase;
    g.misses = 0;
    say('RECOVERY');
  }
  g.pulse = Math.max(0, g.pulse - dt);
  g.hurt = Math.max(0, g.hurt - dt);
  g.cooldown = Math.max(0, g.cooldown - dt);
  g.messageTime -= dt;
  g.meter = Math.min(100, g.meter + dt * 35);
  g.hint = api.btn('b') ? Math.min(1, g.hint + dt * 5) : 0;
  if (api.btnp('left')) g.lane = Math.max(0, g.lane - 1);
  if (api.btnp('right')) g.lane = Math.min(2, g.lane + 1);
  g.x += (LANES[g.lane] - g.x) * 0.35;

  // Steady 120 BPM, with a two-second visible approach.
  // Recovery has one note per second; dense phrases use every beat.
  if (api.t >= g.next) {
    const arrival = g.next + 2;
    const recovery = arrival % 12 < 3;
    const index = Math.round(g.next * 2);
    if (!recovery || index % 2 === 0) {
      const lane = arrival < 4 ? 1 : api.rndi(0, 2);
      g.objects.push({ lane, at: arrival, kind: 'note', dead: false });
      const hazards = g.objects.filter(o => o.kind === 'blob').length;
      if (arrival >= 5 && !recovery && hazards < 3 && index % 2 === 0) {
        g.objects.push({
          lane: (lane + api.rndi(1, 2)) % 3,
          at: arrival + 0.25, kind: 'blob', dead: false,
        });
      }
    }
    g.next += 0.5;
  }
  const beat = Math.round(api.t * 2);
  const error = Math.abs(api.t - beat * 0.5);
  const tick = Math.floor(api.t * 2);
  if (tick !== g.lastBeat) {
    g.lastBeat = tick;
    api.tone(tick % 2 ? 440 : 660, 35, 'triangle');
  }
  if (api.btnp('a') && g.cooldown <= 0) {
    g.cooldown = 0.16;
    g.pulse = 0.28;
    api.sfx('shoot');
    const good = error <= 0.13 && g.usedBeat !== beat && g.meter >= 18;
    g.meter = Math.max(0, g.meter - 18);
    if (good) {
      g.usedBeat = beat;
      g.combo = Math.min(8, g.combo + 1);
      say(beat % 2 ? 'DA!' : 'BA!');
      for (const o of g.objects) {
        if (o.dead || o.lane !== g.lane || Math.abs(o.at - api.t) > 0.4) continue;
        o.dead = true;
        if (o.kind === 'note') {
          api.addScore(100 * g.combo);
          g.meter = Math.min(100, g.meter + 30);
          api.sfx('coin');
          api.flash(10, 1);
        } else {
          api.sfx('explode');
          say('BLOB POP!');
        }
      }
    } else {
      g.combo = 0;
      // Opening practice remains safe, including an immediate first A.
      if (api.t > 3) g.misses++;
      api.sfx('hit');
      say(api.t <= 3 ? 'FOLLOW THE FLASH' : 'MISS ' + g.misses + '/3');
      if (g.misses >= 3) damage(api, true);
    }
  }
  for (const o of g.objects) {
    if (o.dead) continue;
    if (o.kind === 'blob' && o.lane === g.lane &&
        Math.abs(o.at - api.t) < 0.11 && g.hurt <= 0) {
      o.dead = true;
      say('OFFBEAT HIT!');
      damage(api, false);
    }
  }
  g.objects = g.objects.filter(o => !o.dead && o.at > api.t - 0.55);
}

function draw(api) {
  api.cls(1);
  for (let i = 0; i < 16; i++) {
    const h = 4 + Math.sin(api.t * 6 + i) * 3;
    api.rectfill(i * 16 + 3, 40 - h, 8, h, i % 2 ? 2 : 5);
  }
  for (let i = 0; i < 3; i++) {
    api.rectfill(LANES[i] - 29, 43, 58, 152, 2);
    api.line(LANES[i] - 30, 43, LANES[i] - 30, 195, 13);
    for (let j = 0; j < 6; j++) {
      const y = 44 + (j * 28 + api.t * 66) % 150;
      api.rectfill(LANES[i] - 22, y, 44, 1, 5);
    }
  }
  const onBeat = Math.abs(api.t * 2 - Math.round(api.t * 2)) < 0.26;
  api.rectfill(24, 173, 208, 3, onBeat ? 10 : 13);
  api.text('X' + Math.max(1, g.combo), 112, 16, 10);
  for (let i = 0; i < g.hearts; i++) api.spr(HEART, 8 + i * 9, 17);
  api.rect(176, 17, 72, 7, 6);
  api.rectfill(178, 19, g.meter * 0.68, 3, 12);
  let nearest = null;
  for (const o of g.objects) {
    if (o.kind === 'note' && o.at >= api.t &&
        (!nearest || o.at < nearest.at)) nearest = o;
    const y = 174 - (o.at - api.t) * 66;
    if (y < 44 || y > 194) continue;
    if (o.kind === 'note') api.circ(LANES[o.lane], y, 7, onBeat ? 7 : 12);
    api.spr(o.kind === 'note' ? NOTE : BLOB, LANES[o.lane] - 4, y - 4);
  }
  if (g.hint >= 0.6 && nearest) {
    api.rect(LANES[nearest.lane] - 25, 47, 50, 145, 11);
    api.text('V', LANES[nearest.lane] - 4, 48, 11);
  }
  if (g.pulse > 0) api.circ(g.x, 174, 8 + (0.28 - g.pulse) * 100, 10);
  if (g.hurt <= 0 || api.frame % 8 < 4) {
    api.spr(BADA, g.x - 8, 161 + Math.sin(api.t * 15) * 2);
  }
  api.textCenter(g.messageTime > 0 ? g.message :
    (api.t % 12 < 3 ? 'RECOVERY' : 'BADA BADA'), 198, 7);
  api.textCenter('L/R SHIFT  A PULSE  B HINT', 212, 13);
}
