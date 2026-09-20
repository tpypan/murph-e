// biome-ignore lint/correctness/noUnusedVariables: bundled factory entry.
function bomberFactory(config = {}) {
  const num = (v, f, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : f)),
    integer = (v, f, lo, hi) => Math.round(num(v, f, lo, hi))
  const size = 18,
    ox = 29,
    oy = 39,
    dirs = [
      { x: 0, y: -1, name: 'up' },
      { x: 1, y: 0, name: 'right' },
      { x: 0, y: 1, name: 'down' },
      { x: -1, y: 0, name: 'left' },
    ],
    key = (x, y) => y * 11 + x,
    point = (k) => ({ x: k % 11, y: Math.floor(k / 11) }),
    solid = (x, y) => x <= 0 || x >= 10 || y <= 0 || y >= 8 || (x % 2 === 0 && y % 2 === 0)
  const fuse = integer(config.fuseFrames, 100, 60, 180),
    roundSeconds = integer(config.roundSeconds, 100, 20, 180),
    maxLevels = integer(config.levels, 2, 1, 6),
    toWin = integer(config.roundsToWin, 2, 1, 5),
    density = num(config.crateDensity, 0.42, 0, 0.7),
    initialLives = integer(config.lives, 3, 1, 9)
  let mode,
    players,
    enemies,
    crates,
    bombs,
    flames,
    pickups,
    pendingDrops,
    effects,
    phase,
    phaseAge,
    ticks,
    level,
    timeLeft,
    terminal,
    events,
    scores,
    wins,
    roundWinner,
    bombSerial
  const startPoints = [
      { x: 1, y: 1 },
      { x: 9, y: 7 },
    ],
    enemyPoints = [
      { x: 9, y: 1 },
      { x: 1, y: 7 },
      { x: 5, y: 5 },
      { x: 5, y: 1 },
      { x: 5, y: 7 },
    ],
    exit = { x: 5, y: 7 }
  const makeActor = (p, id) => ({
    ...p,
    id,
    to: null,
    progress: 0,
    dir: 2,
    queued: null,
    alive: true,
    wait: 0,
    invulnerable: 70,
    age: 0,
    range: integer(config.blastRange, 2, 1, 5),
    capacity: integer(config.bombCapacity, 1, 1, 4),
    stepFrames: integer(config.moveFrames, 8, 6, 12),
    lives: initialLives,
    enemy: false,
  })
  const emit = (api, type, data = {}) => {
    const e = { tick: ticks, type, ...data }
    events.push(e)
    if (events.length > 400) events.shift()
    if (config.onEvent) config.onEvent(Object.freeze({ ...e }), api)
  }
  const sound = (api, name) => {
    if (config.sound !== false) api.sfx(name)
  }
  function resetArena(api) {
    bombs = []
    flames = []
    pickups = []
    pendingDrops = []
    effects = []
    crates = new Set()
    bombSerial = 0
    timeLeft = roundSeconds * 60
    phase = 'play'
    phaseAge = 0
    const count = mode === 'versus' ? 0 : integer(config.enemyCount, 3 + level - 1, 0, 5)
    const protectedCells = [...startPoints, ...enemyPoints.slice(0, count), exit]
    for (let y = 1; y < 8; y++)
      for (let x = 1; x < 10; x++)
        if (
          !solid(x, y) &&
          !protectedCells.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) <= 1) &&
          (x * 31 + y * 17 + level * 29) % 100 < density * 100
        )
          crates.add(key(x, y))
    players = players.map((old, i) => ({
      ...makeActor(startPoints[i], i),
      lives: mode === 'versus' ? 1 : old.lives,
      alive: mode === 'versus' || old.lives > 0,
      range: old.range,
      capacity: old.capacity,
      stepFrames: old.stepFrames,
    }))
    enemies = enemyPoints.slice(0, count).map((p, i) => ({
      ...makeActor(p, 2 + i),
      enemy: true,
      type: i % 3,
      stepFrames: Math.max(8, 12 - Math.floor((level - 1) / 2)),
      invulnerable: 0,
      dir: (i + 1) % 4,
    }))
    emit(api, 'arena-ready', { level, mode, enemies: count })
  }
  function init(api) {
    mode = api.players === 2 ? config.mode || 'versus' : 'solo'
    if (!['solo', 'versus', 'coop'].includes(mode) || (api.players === 2 && mode === 'solo'))
      throw Error('bomber: mode must be versus or coop for 2P')
    ticks = 0
    level = 1
    events = []
    scores = [0, 0]
    wins = [0, 0]
    terminal = false
    players = Array.from({ length: api.players === 2 ? 2 : 1 }, (_, i) =>
      makeActor(startPoints[i], i),
    )
    resetArena(api)
    api.score(0)
  }
  const actors = () => [...players, ...enemies].filter((a) => a.alive)
  const bombAt = (x, y) => bombs.find((b) => b.x === x && b.y === y)
  const canEnter = (a, x, y) => {
    if (solid(x, y) || crates.has(key(x, y))) return false
    const b = bombAt(x, y)
    return !b || b.pass.includes(a.id)
  }
  function position(a) {
    const t = a.to ? a.progress / a.stepFrames : 0
    return {
      x: ox + (a.x + (a.to ? (a.to.x - a.x) * t : 0)) * size + 9,
      y: oy + (a.y + (a.to ? (a.to.y - a.y) * t : 0)) * size + 9,
    }
  }
  function rayCells(b) {
    const cells = [{ x: b.x, y: b.y, kind: 'center' }]
    for (let d = 0; d < 4; d++)
      for (let r = 1; r <= b.range; r++) {
        const x = b.x + dirs[d].x * r,
          y = b.y + dirs[d].y * r
        if (solid(x, y)) break
        cells.push({ x, y, kind: d % 2 ? 'horizontal' : 'vertical' })
        if (crates.has(key(x, y)) || bombAt(x, y)) break
      }
    return cells
  }
  function danger() {
    const map = new Map()
    for (const b of bombs)
      for (const c of rayCells(b))
        map.set(key(c.x, c.y), Math.min(map.get(key(c.x, c.y)) ?? 999, b.fuse))
    for (const f of flames) map.set(key(f.x, f.y), 0)
    return map
  }
  function placeBomb(api, a) {
    if (
      !a.alive ||
      a.wait ||
      bombAt(a.x, a.y) ||
      bombs.filter((b) => b.owner === a.id).length >= a.capacity
    )
      return false
    const pass = actors()
      .filter((x) => x.x === a.x && x.y === a.y)
      .map((x) => x.id)
    bombs.push({
      id: ++bombSerial,
      x: a.x,
      y: a.y,
      owner: a.id,
      range: a.range,
      fuse,
      age: 0,
      pass,
    })
    sound(api, 'select')
    emit(api, 'bomb', { owner: a.id, x: a.x, y: a.y, id: bombSerial })
    return true
  }
  function move(a, direction) {
    if (!a.to) {
      if (direction < 0) return
      const d = dirs[direction],
        x = a.x + d.x,
        y = a.y + d.y
      if (!canEnter(a, x, y)) return
      a.to = { x, y }
      a.progress = 0
      a.dir = direction
      a.queued = null
    }
    a.progress++
    a.age++
    if (a.progress >= a.stepFrames) {
      a.x = a.to.x
      a.y = a.to.y
      a.to = null
      a.progress = 0
      for (const b of bombs)
        if (b.x !== a.x || b.y !== a.y) b.pass = b.pass.filter((id) => id !== a.id)
    }
  }
  function enemyDirection(e) {
    const options = []
    for (let d = 0; d < 4; d++) {
      const x = e.x + dirs[d].x,
        y = e.y + dirs[d].y
      if (canEnter(e, x, y)) options.push({ d, x, y })
    }
    if (!options.length) return -1
    const threats = danger(),
      p = players
        .filter((p) => p.alive)
        .sort(
          (a, b) =>
            Math.abs(a.x - e.x) + Math.abs(a.y - e.y) - Math.abs(b.x - e.x) - Math.abs(b.y - e.y),
        )[0]
    if (!p) return options[0].d
    if (e.type === 0) {
      const forward = options.find((o) => o.d === e.dir && !threats.has(key(o.x, o.y)))
      if (forward) return forward.d
      return options[(Math.floor(ticks / 60) + e.id) % options.length].d
    }
    if (e.type === 2 && threats.has(key(e.x, e.y))) {
      options.sort(
        (a, b) => (threats.has(key(a.x, a.y)) ? 1 : 0) - (threats.has(key(b.x, b.y)) ? 1 : 0),
      )
      return options[0].d
    }
    const safe = options.filter((o) => threats.get(key(o.x, o.y)) !== 0),
      choices = safe.length ? safe : options
    choices.sort(
      (a, b) =>
        Math.abs(a.x - p.x) + Math.abs(a.y - p.y) - Math.abs(b.x - p.x) - Math.abs(b.y - p.y) ||
        ((a.d + e.id) % 4) - ((b.d + e.id) % 4),
    )
    return choices[0].d
  }
  function kill(api, a, owner) {
    if (!a.alive || a.invulnerable > 0) return
    a.alive = false
    a.to = null
    effects.push({ ...position(a), age: 0 })
    sound(api, 'die')
    if (a.enemy) {
      if (owner >= 0 && owner < players.length) {
        scores[owner] += 200
        api.addScore(200, owner)
      }
      emit(api, 'enemy-defeated', { id: a.id, owner })
      return
    }
    a.lives--
    a.wait = mode === 'versus' || a.lives === 0 ? 0 : 65
    emit(api, 'player-defeated', { player: a.id, owner, lives: a.lives })
  }
  function detonate(api, b) {
    const i = bombs.indexOf(b)
    if (i < 0) return
    bombs.splice(i, 1)
    const cells = rayCells(b)
    sound(api, 'explode')
    emit(api, 'explode', {
      id: b.id,
      owner: b.owner,
      x: b.x,
      y: b.y,
      cells: cells.map((c) => ({ x: c.x, y: c.y })),
    })
    for (const c of cells) {
      const k = key(c.x, c.y)
      flames.push({ ...c, owner: b.owner, life: 26, age: 0 })
      pickups = pickups.filter((p) => key(p.x, p.y) !== k)
      const other = bombAt(c.x, c.y)
      if (other) detonate(api, other)
      if (crates.delete(k)) {
        scores[b.owner] += 20
        api.addScore(20, b.owner)
        const roll = (c.x * 7 + c.y * 11 + level) % 5
        if (roll < 3)
          pendingDrops.push({ ...c, type: ['range', 'capacity', 'speed'][roll], wait: 27 })
        emit(api, 'crate', { x: c.x, y: c.y, owner: b.owner })
      }
    }
  }
  function update(api) {
    if (terminal) return
    ticks++
    phaseAge++
    effects.forEach((e) => {
      e.age++
    })
    effects = effects.filter((e) => e.age < 24)
    if (phase === 'roundEnd' || phase === 'clear') {
      if (phaseAge >= 75) {
        if (mode === 'versus') {
          if (roundWinner === null) {
            terminal = true
            phase = 'complete'
            api.gameOver()
          } else if (wins[roundWinner] >= toWin) {
            terminal = true
            phase = 'complete'
            api.win(roundWinner)
          } else {
            level++
            resetArena(api)
          }
        } else if (level >= maxLevels) {
          terminal = true
          phase = 'complete'
          api.win()
        } else {
          level++
          resetArena(api)
        }
      }
      return
    }
    timeLeft--
    for (const p of players) {
      if (!p.alive) {
        if (p.wait > 0 && --p.wait === 0) {
          const old = {
            lives: p.lives,
            range: p.range,
            capacity: p.capacity,
            stepFrames: p.stepFrames,
          }
          Object.assign(p, makeActor(startPoints[p.id], p.id), old)
        }
        continue
      }
      p.invulnerable = Math.max(0, p.invulnerable - 1)
      if (api.btnp('a', p.id)) placeBomb(api, p)
      let d = -1
      for (let i = 0; i < 4; i++) if (api.btnp(dirs[i].name, p.id)) p.queued = i
      if (p.queued !== null) d = p.queued
      else for (let i = 0; i < 4; i++) if (api.btn(dirs[i].name, p.id)) d = i
      move(p, d)
    }
    for (const e of enemies) if (e.alive) move(e, e.to ? e.dir : enemyDirection(e))
    for (const b of [...bombs]) {
      b.fuse--
      b.age++
      if (b.fuse <= 0) detonate(api, b)
    }
    for (const f of flames) {
      for (const a of actors()) {
        if (!a.enemy && mode === 'coop' && config.friendlyFire !== true && f.owner !== a.id)
          continue
        const pos = position(a)
        if (
          Math.abs(pos.x - (ox + f.x * size + 9)) < 13 &&
          Math.abs(pos.y - (oy + f.y * size + 9)) < 13
        )
          kill(api, a, f.owner)
      }
      f.life--
      f.age++
    }
    flames = flames.filter((f) => f.life > 0)
    for (const p of players)
      if (p.alive) {
        for (const e of enemies)
          if (
            e.alive &&
            Math.hypot(position(p).x - position(e).x, position(p).y - position(e).y) < 11
          )
            kill(api, p, -1)
        if (!p.to) {
          for (const item of pickups.filter((q) => q.x === p.x && q.y === p.y)) {
            if (item.type === 'range') p.range = Math.min(5, p.range + 1)
            if (item.type === 'capacity') p.capacity = Math.min(4, p.capacity + 1)
            if (item.type === 'speed') p.stepFrames = Math.max(6, p.stepFrames - 1)
            sound(api, 'powerup')
            emit(api, 'pickup', { player: p.id, item: item.type })
          }
          pickups = pickups.filter((q) => q.x !== p.x || q.y !== p.y)
        }
      }
    for (const drop of pendingDrops) {
      drop.wait--
      if (drop.wait === 0) pickups.push({ ...drop })
    }
    pendingDrops = pendingDrops.filter((d) => d.wait > 0)
    if (mode === 'versus') {
      const living = players.filter((p) => p.alive)
      if (living.length < 2 || timeLeft <= 0) {
        roundWinner =
          living.length === 1
            ? living[0].id
            : timeLeft <= 0 && scores[0] !== scores[1]
              ? scores[0] > scores[1]
                ? 0
                : 1
              : null
        if (roundWinner !== null) {
          wins[roundWinner]++
          scores[roundWinner] += 500
          api.addScore(500, roundWinner)
        }
        phase = 'roundEnd'
        phaseAge = 0
        emit(api, 'round-end', { winner: roundWinner, wins: [...wins] })
      }
    } else {
      if (players.every((p) => !p.alive && p.wait === 0) || timeLeft <= 0) {
        terminal = true
        phase = 'complete'
        api.gameOver()
        return
      }
      if (
        enemies.every((e) => !e.alive) &&
        players.some((p) => p.alive && !p.to && p.x === exit.x && p.y === exit.y)
      ) {
        phase = 'clear'
        phaseAge = 0
        for (const p of players) {
          scores[p.id] += 500
          api.addScore(500, p.id)
        }
        sound(api, 'powerup')
        emit(api, 'level-clear', { level })
      }
    }
  }
  function sprite(api, id, x, y, age = 0) {
    const clip = BOMBER_ASSETS.animations[id],
      duration = clip.frames.reduce((s, f) => s + f.duration, 0)
    let t = clip.loop ? age % duration : Math.min(age, duration - 1),
      fr = clip.frames[0]
    for (const f of clip.frames) {
      fr = f
      if (t < f.duration) break
      t -= f.duration
    }
    const s = BOMBER_ASSETS.frames[fr.frame]
    api.spr(s.pixels, Math.round(x - s.anchor.x), Math.round(y - s.anchor.y))
  }
  function draw(api) {
    api.cls(0)
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 11; x++) {
        const px = ox + x * size,
          py = oy + y * size
        if (solid(x, y)) {
          api.rectfill(px, py, 18, 18, 1)
          api.rectfill(px + 1, py + 1, 16, 3, 13)
          api.rectfill(px + 1, py + 4, 3, 12, 5)
          api.line(px + 3, py + 16, px + 16, py + 16, 0)
          api.line(px + 16, py + 3, px + 16, py + 16, 0)
        } else {
          api.rectfill(px, py, 18, 18, 3)
          api.pset(px + 3, py + 4, 11)
          api.pset(px + 13, py + 13, 1)
        }
        if (crates.has(key(x, y))) sprite(api, 'crate', px + 9, py + 9)
      }
    if (mode !== 'versus') {
      const x = ox + exit.x * size,
        y = oy + exit.y * size
      api.rectfill(x + 2, y + 2, 14, 14, enemies.some((e) => e.alive) ? 5 : 12)
      api.rect(x + 3, y + 3, 12, 12, 7)
      for (let i = 0; i < 3; i++) api.line(x + 5 + i * 2, y + 6 + i * 2, x + 12, y + 6 + i * 2, 1)
    }
    for (const p of pickups)
      sprite(api, `pickup-${p.type}`, ox + p.x * size + 9, oy + p.y * size + 9, ticks)
    for (const b of bombs)
      sprite(api, 'bomb', ox + b.x * size + 9, oy + b.y * size + 9, b.age * (b.fuse < 30 ? 2 : 1))
    for (const a of actors()) {
      const p = position(a)
      sprite(
        api,
        a.enemy
          ? `enemy-${a.type}`
          : `player-${a.id}-${a.to ? 'walk' : 'idle'}-${dirs[a.dir].name}`,
        p.x,
        p.y,
        a.age,
      )
      if (!a.enemy && a.invulnerable > 0 && ticks % 12 < 6)
        api.line(p.x - 4, p.y + 8, p.x + 4, p.y + 8, a.id ? 8 : 12)
    }
    for (const f of flames)
      sprite(api, `flame-${f.kind}`, ox + f.x * size + 9, oy + f.y * size + 9, f.age)
    for (const e of effects) sprite(api, 'burst', e.x, e.y, e.age)
    api.text(`P1 ${mode === 'versus' ? wins[0] : players[0].lives}`, 29, 17, 12)
    api.text(String(Math.max(0, Math.ceil(timeLeft / 60))).padStart(3, '0'), 115, 17, 10)
    if (players.length === 2)
      api.text(`P2 ${mode === 'versus' ? wins[1] : players[1].lives}`, 188, 17, 8)
    else api.text(`E${enemies.filter((e) => e.alive).length}`, 203, 17, 14)
    api.text(mode === 'versus' ? `ROUND ${level}` : `LEVEL ${level}`, 88, 213, 6)
    if (phase === 'roundEnd' || phase === 'clear') {
      api.rectfill(55, 110, 146, 18, 0)
      api.textCenter(
        phase === 'clear'
          ? 'EXIT CLEAR'
          : roundWinner === null
            ? 'DRAW'
            : `P${roundWinner + 1} WINS`,
        115,
        10,
      )
    }
    if (config.drawOverlay) config.drawOverlay(api, { mode, level, phase, timeLeft })
  }
  const clone = (a) => ({ ...a, to: a.to ? { ...a.to } : null, position: position(a) }),
    inspect = () => ({
      mode,
      level,
      phase,
      timeLeft,
      ticks,
      terminal,
      players: players.map(clone),
      enemies: enemies.map(clone),
      crates: [...crates].map(point),
      bombs: bombs.map((b) => ({ ...b, pass: [...b.pass] })),
      flames: flames.map((f) => ({ ...f })),
      pickups: pickups.map((p) => ({ ...p })),
      scores: [...scores],
      wins: [...wins],
      events: events.map((e) => ({ ...e })),
      exit: { ...exit },
    })
  return { init, update, draw, inspect }
}
