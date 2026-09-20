(config = {}) => {
  const ART = {"schemaVersion":1,"id":"falling-blocks-art","palette":"pico-8","coordinateSystem":"Frame-local pixels. Game collision is discrete 10 by 20 grid occupancy, not decorative bevel bounds.","provenance":{"kind":"original","authors":["Arcade project"],"sources":[],"license":"LicenseRef-Project-Original"},"frames":{"block-5":{"width":7,"height":7,"pixels":["7777777","7755551","7555551","7555551","7555551","7555551","7111111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[{"x":0,"y":0,"w":7,"h":7}],"hurtboxes":[],"provenance":"Original project pixel artwork."},"mini-5":{"width":3,"height":3,"pixels":["777","751","111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"block-8":{"width":7,"height":7,"pixels":["7777777","7788881","7888881","7888881","7888881","7888881","7111111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[{"x":0,"y":0,"w":7,"h":7}],"hurtboxes":[],"provenance":"Original project pixel artwork."},"mini-8":{"width":3,"height":3,"pixels":["777","781","111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"block-9":{"width":7,"height":7,"pixels":["7777777","7799991","7999991","7999991","7999991","7999991","7111111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[{"x":0,"y":0,"w":7,"h":7}],"hurtboxes":[],"provenance":"Original project pixel artwork."},"mini-9":{"width":3,"height":3,"pixels":["777","791","111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"block-10":{"width":7,"height":7,"pixels":["7777777","77aaaa1","7aaaaa1","7aaaaa1","7aaaaa1","7aaaaa1","7111111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[{"x":0,"y":0,"w":7,"h":7}],"hurtboxes":[],"provenance":"Original project pixel artwork."},"mini-10":{"width":3,"height":3,"pixels":["777","7a1","111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"block-11":{"width":7,"height":7,"pixels":["7777777","77bbbb1","7bbbbb1","7bbbbb1","7bbbbb1","7bbbbb1","7111111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[{"x":0,"y":0,"w":7,"h":7}],"hurtboxes":[],"provenance":"Original project pixel artwork."},"mini-11":{"width":3,"height":3,"pixels":["777","7b1","111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"block-12":{"width":7,"height":7,"pixels":["7777777","77cccc1","7ccccc1","7ccccc1","7ccccc1","7ccccc1","7111111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[{"x":0,"y":0,"w":7,"h":7}],"hurtboxes":[],"provenance":"Original project pixel artwork."},"mini-12":{"width":3,"height":3,"pixels":["777","7c1","111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"block-13":{"width":7,"height":7,"pixels":["7777777","77dddd1","7ddddd1","7ddddd1","7ddddd1","7ddddd1","7111111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[{"x":0,"y":0,"w":7,"h":7}],"hurtboxes":[],"provenance":"Original project pixel artwork."},"mini-13":{"width":3,"height":3,"pixels":["777","7d1","111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"block-14":{"width":7,"height":7,"pixels":["7777777","77eeee1","7eeeee1","7eeeee1","7eeeee1","7eeeee1","7111111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[{"x":0,"y":0,"w":7,"h":7}],"hurtboxes":[],"provenance":"Original project pixel artwork."},"mini-14":{"width":3,"height":3,"pixels":["777","7e1","111"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"ghost":{"width":7,"height":7,"pixels":["5555555","5.....5","5.....5","5.....5","5.....5","5.....5","5555555"],"durationTicks":60,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"clear-0":{"width":7,"height":7,"pixels":["7777777","7777777","7777777","7777777","7777777","7777777","7777777"],"durationTicks":4,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"clear-1":{"width":7,"height":7,"pixels":["7777777","aaaaaaa","7777777","aaaaaaa","7777777","aaaaaaa","7777777"],"durationTicks":4,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."},"clear-2":{"width":7,"height":7,"pixels":[".c.c.c.","c.c.c.c",".c.c.c.","c.c.c.c",".c.c.c.","c.c.c.c",".c.c.c."],"durationTicks":4,"anchor":{"x":0,"y":0},"hitboxes":[],"hurtboxes":[],"provenance":"Original project pixel artwork."}},"animations":{"lineClear":{"frames":["clear-0","clear-1","clear-2"],"loop":false},"ghost":{"frames":["ghost"],"loop":true}}};
  const W = 10, H = 20;
  const names = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const colors = [12, 10, 13, 11, 8, 14, 9];
  const shapes = [
    [[0, 1], [1, 1], [2, 1], [3, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[2, 0], [0, 1], [1, 1], [2, 1]],
  ];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const target = Number.isFinite(config.targetLines) ? clamp(Math.floor(config.targetLines), 0, 100) : 12;
  const limit = Number.isFinite(config.timeLimit) ? clamp(config.timeLimit, 30, 900) : 240;
  let players, boards, clock, phase, winner, outgoing;
  function random(b) { b.rng = (Math.imul(b.rng, 1664525) + 1013904223) >>> 0; return b.rng / 4294967296; }
  function cells(piece) {
    const center = piece.type === 0 ? 1.5 : 1;
    return shapes[piece.type].map(([x0, y0]) => {
      let x = x0, y = y0;
      if (piece.type !== 1) for (let r = 0; r < piece.r; r++) { const previous = x; x = center - (y - center); y = center + (previous - center); }
      return [x + piece.x, y + piece.y];
    });
  }
  function fits(b, piece) { return cells(piece).every(([x, y]) => x >= 0 && x < W && y < H && y >= -4 && (y < 0 || !b.grid[y][x])); }
  function queue(b) {
    while (b.next.length < 4) {
      if (!b.bag.length) {
        b.bag = names.map((_, i) => i);
        for (let i = 6; i > 0; i--) { const j = Math.floor(random(b) * (i + 1)); [b.bag[i], b.bag[j]] = [b.bag[j], b.bag[i]]; }
      }
      b.next.push(b.bag.shift());
    }
  }
  function spawn(b) {
    queue(b); const type = b.next.shift(); queue(b);
    b.piece = { type, x: 3, y: -1, r: 0, id: ++b.serial }; b.gravity = 0; b.lock = 0; b.resets = 0;
    if (b.stats.sequence.length < 56) b.stats.sequence.push(names[type]);
    if (!fits(b, b.piece)) b.alive = false;
  }
  function init(api) {
    players = api.players === 2 ? 2 : 1; clock = 0; phase = 'play'; winner = null; outgoing = [0, 0];
    boards = Array.from({ length: players }, (_, index) => {
      const b = { index, grid: Array.from({ length: H }, () => Array(W).fill(0)), next: [], bag: [], rng: (config.seed >>> 0) || 7,
        serial: 0, piece: null, gravity: 0, lock: 0, resets: 0, repeat: 0, direction: 0, lastA: false, lastB: false,
        alive: true, lines: 0, level: 1, score: 0, combo: -1, backToBack: false, clearing: [], clearTimer: 0,
        pending: 0, dropFlash: 0, dropCells: [], flash: 0,
        stats: { locked: 0, hardDrops: 0, softCells: 0, rotations: 0, kicks: 0, lockResets: 0, garbageSent: 0, garbageReceived: 0, sequence: [] } };
      api.score(0, index); spawn(b); return b;
    });
  }
  function score(api, b, amount) { b.score += amount; api.addScore(amount, b.index); }
  function grounded(b) { return !fits(b, { ...b.piece, y: b.piece.y + 1 }); }
  function resetLock(b, wasGrounded) { if (wasGrounded && b.resets < 8) { b.lock = 0; b.resets++; b.stats.lockResets++; } }
  function move(b, dx) {
    const wasGrounded = grounded(b), next = { ...b.piece, x: b.piece.x + dx };
    if (!fits(b, next)) return false;
    b.piece = next; resetLock(b, wasGrounded); return true;
  }
  function rotate(api, b) {
    if (b.piece.type === 1) return;
    const wasGrounded = grounded(b), rotated = { ...b.piece, r: (b.piece.r + 1) % 4 };
    // Original fixed bounded kicks, not a claim of Guideline/SRS compatibility.
    const kicks = b.piece.type === 0 ? [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [0, -2]] : [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
    for (const [dx, dy] of kicks) {
      const candidate = { ...rotated, x: rotated.x + dx, y: rotated.y + dy };
      if (fits(b, candidate)) { b.piece = candidate; b.stats.rotations++; if (dx || dy) b.stats.kicks++; resetLock(b, wasGrounded); api.sfx('select'); return; }
    }
  }
  function garbage(b) {
    const n = Math.min(2, b.pending); b.pending -= n;
    if (!n) return;
    const hole = (b.stats.garbageReceived * 7 + b.serial * 3) % W;
    for (let i = 0; i < n; i++) {
      if (b.grid.shift().some(Boolean)) b.alive = false;
      b.grid.push(Array.from({ length: W }, (_, x) => x === hole ? 0 : 5));
      b.stats.garbageReceived++;
    }
  }
  function lock(api, b) {
    const occupied = cells(b.piece);
    if (occupied.some(([, y]) => y < 0)) { b.alive = false; api.sfx('die'); return; }
    for (const [x, y] of occupied) b.grid[y][x] = colors[b.piece.type];
    b.stats.locked++; b.flash = 0.12;
    b.clearing = b.grid.map((row, y) => row.every(Boolean) ? y : -1).filter(y => y >= 0);
    if (typeof config.onLock === 'function') config.onLock({ player: b.index, piece: names[b.piece.type], lines: b.clearing.length }, api);
    if (b.clearing.length) { b.clearTimer = 0.2; api.sfx('coin'); }
    else { b.combo = -1; garbage(b); if (b.alive) spawn(b); api.sfx('hit'); }
  }
  function clear(api, b) {
    const n = b.clearing.length;
    b.grid = b.grid.filter((_, y) => !b.clearing.includes(y));
    while (b.grid.length < H) b.grid.unshift(Array(W).fill(0));
    b.combo++; const extra = n === 4 && b.backToBack ? 400 : 0;
    score(api, b, ([0, 100, 300, 500, 800][n] + extra + Math.max(0, b.combo) * 50) * b.level);
    b.backToBack = n === 4; b.lines += n; b.level = Math.min(15, 1 + Math.floor(b.lines / 6));
    b.pending = Math.max(0, b.pending - n);
    let attack = 0;
    if (players === 2 && config.garbage !== false && n >= 2) {
      attack = Math.min(4, n - 1 + (n === 4 ? 1 : 0));
      outgoing[b.index] += attack;
    }
    if (typeof config.onClear === 'function') config.onClear({ player: b.index, lines: n, total: b.lines, attack }, api);
    b.clearing = []; b.clearTimer = 0; garbage(b); if (b.alive) spawn(b);
    api.sfx(n >= 3 ? 'powerup' : 'coin');
  }
  function finish(api, side) {
    if (phase === 'finished') return;
    phase = 'finished'; winner = side;
    if (side === -1) api.gameOver(); else if (players === 2 && side !== null) api.win(side); else api.win();
  }
  function updateBoard(api, b, dt) {
    const a = api.btn('a', b.index), hard = api.btn('b', b.index);
    b.flash = Math.max(0, b.flash - dt); b.dropFlash = Math.max(0, b.dropFlash - dt);
    if (b.clearTimer > 0) {
      b.clearTimer -= dt; if (b.clearTimer <= 0) clear(api, b);
      b.lastA = a; b.lastB = hard; return;
    }
    const direction = (api.btn('right', b.index) ? 1 : 0) - (api.btn('left', b.index) ? 1 : 0);
    if (direction !== b.direction) { b.direction = direction; b.repeat = 0.16; if (direction) move(b, direction); }
    else if (direction) { b.repeat -= dt; if (b.repeat <= 0) { move(b, direction); b.repeat += 0.055; } }
    if (a && !b.lastA) rotate(api, b);
    if (hard && !b.lastB) {
      let distance = 0; b.dropCells = cells(b.piece);
      while (fits(b, { ...b.piece, y: b.piece.y + 1 })) { b.piece.y++; distance++; }
      score(api, b, distance * 2); b.stats.hardDrops++; b.dropFlash = 0.12; lock(api, b); api.sfx('shoot');
    } else {
      const soft = api.btn('down', b.index), interval = soft ? 0.035 : Math.max(0.055, 0.8 * Math.pow(0.82, b.level - 1));
      b.gravity += dt;
      while (b.gravity >= interval) {
        b.gravity -= interval;
        if (fits(b, { ...b.piece, y: b.piece.y + 1 })) { b.piece.y++; if (soft) { score(api, b, 1); b.stats.softCells++; } }
        else { b.gravity = 0; break; }
      }
      if (grounded(b)) { b.lock += dt; if (b.lock >= 0.42) lock(api, b); }
    }
    b.lastA = a; b.lastB = hard;
  }
  function update(api, dt) {
    if (phase === 'finished') return;
    dt = clamp(dt || 1 / 60, 0, 1 / 20); clock += dt;
    outgoing = [0, 0];
    for (const b of boards) if (b.alive) updateBoard(api, b, dt);
    // Deliver attacks after both boards advance, so same-frame clears are symmetric.
    if (players === 2) for (let p = 0; p < 2; p++) {
      const other = boards[1 - p], accepted = Math.min(4 - other.pending, outgoing[p]);
      other.pending += accepted; boards[p].stats.garbageSent += accepted;
    }
    const winners = boards.filter(b => target > 0 && b.lines >= target);
    if (winners.length) { finish(api, winners.length === 2 ? null : winners[0].index); return; }
    const alive = boards.filter(b => b.alive);
    if (alive.length < players) { finish(api, players === 2 && alive.length ? alive[0].index : -1); return; }
    if (clock >= limit) {
      if (players === 1) finish(api, -1);
      else { const difference = boards[0].lines - boards[1].lines || boards[0].score - boards[1].score; finish(api, difference ? (difference > 0 ? 0 : 1) : -1); }
    }
  }
  function draw(api) {
    api.cls(0);
    for (const b of boards) {
      const cell = players === 1 ? 9 : 8, x0 = players === 1 ? 74 : b.index ? 161 : 15, y0 = players === 1 ? 24 : 34, pc = b.index ? 8 : 12;
      api.rect(x0 - 2, y0 - 2, W * cell + 3, H * cell + 3, pc);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const color = b.grid[y][x];
        if (color) api.spr(ART.frames['block-' + color].pixels, x0 + x * cell, y0 + y * cell);
        else if (y % 2 === 0) api.pset(x0 + x * cell + 3, y0 + y * cell + 3, 1);
      }
      if (!b.clearing.length && b.alive) {
        const ghost = { ...b.piece }; while (fits(b, { ...ghost, y: ghost.y + 1 })) ghost.y++;
        for (const [x, y] of cells(ghost)) if (y >= 0) api.spr(ART.frames.ghost.pixels, x0 + x * cell, y0 + y * cell);
        for (const [x, y] of cells(b.piece)) if (y >= 0) api.spr(ART.frames['block-' + colors[b.piece.type]].pixels, x0 + x * cell, y0 + y * cell);
      }
      if (b.clearing.length) {
        const frame = ART.frames['clear-' + Math.min(2, Math.floor((0.2 - b.clearTimer) * 15))].pixels;
        for (const y of b.clearing) for (let x = 0; x < W; x++) api.spr(frame, x0 + x * cell, y0 + y * cell);
      }
      if (b.dropFlash > 0) for (const [x, y] of b.dropCells) api.line(x0 + x * cell + 3, y0 + Math.max(0, y) * cell, x0 + x * cell + 3, y0 + H * cell - 1, 1);
      const nextX = players === 1 ? 187 : b.index ? 132 : 106, nextY = players === 1 ? 44 : 44;
      for (let n = 0; n < 3; n++) for (const [x, y] of shapes[b.next[n]]) api.spr(ART.frames[(players === 1 ? 'block-' : 'mini-') + colors[b.next[n]]].pixels, nextX + x * (players === 1 ? 8 : 4), nextY + n * (players === 1 ? 40 : 24) + y * (players === 1 ? 8 : 4));
      if (players === 1) {
        api.text('NEXT', 184, 28, 6); api.text('LINES', 14, 48, 6); api.text(String(b.lines) + (target ? '/' + target : ''), 14, 59, 10);
        api.text('LEVEL', 14, 87, 6); api.text(String(b.level), 14, 98, 12);
        api.text('TIME', 14, 126, 6); api.text(String(Math.max(0, Math.ceil(limit - clock))), 14, 137, 7);
      } else {
        api.text('P' + (b.index + 1) + ' ' + b.lines + (target ? '/' + target : ' L'), x0, 19, pc);
        api.text('LV' + b.level, x0, 200, 6);
        if (b.pending) api.text('+' + b.pending, x0 + 57, 200, 8);
      }
    }
    if (players === 2) { api.text('NEXT', 110, 29, 6); api.text('TIME', 111, 137, 6); api.text(String(Math.max(0, Math.ceil(limit - clock))), 115, 148, 7); }
    api.textCenter('A: TURN  B: DROP', 214, 6);
  }
  function inspect() { return JSON.parse(JSON.stringify({ phase, clock, players, winner, targetLines: target, boards: boards.map(b => ({ ...b, cells: cells(b.piece), grounded: grounded(b) })) })); }
  return { init, update, draw, inspect };
}
