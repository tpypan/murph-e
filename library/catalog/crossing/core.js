// biome-ignore lint/correctness/noUnusedVariables: bundled factory entry.
function crossingFactory(config = {}) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    number = (v, f, lo, hi) => clamp(Number.isFinite(v) ? v : f, lo, hi)
  const levels = Math.round(number(config.levels, 3, 1, 8)),
    initialLives = Math.round(number(config.lives, 3, 1, 9)),
    timeLimit = Math.round(number(config.timeLimit, 90, 10, 180)),
    speedFactor = number(config.laneSpeed, 1, 0.25, 2)
  const homeNotice =
      typeof config.homeNotice === 'string'
        ? config.homeNotice
            .replace(/[^\x20-\x7e]/g, '')
            .toUpperCase()
            .slice(0, 7)
        : '',
    homeNoticeFrames = Math.round(number(config.homeNoticeSeconds, 1, 0.2, 3) * 60)
  const homes = [40, 88, 136, 184, 216],
    hopFrames = 8,
    dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
  const laneDefinitions = [
    { row: 1, kind: 'turtle', speed: 0.45, bases: [0, 100, 200], width: 48 },
    { row: 2, kind: 'log', speed: -0.6, bases: [0, 96, 192, 288], width: 64 },
    { row: 3, kind: 'turtle', speed: 0.5, bases: [0, 100, 200], width: 48 },
    { row: 4, kind: 'log', speed: -0.45, bases: [0, 96, 192, 288], width: 64 },
    { row: 6, kind: 'car', speed: -0.9, bases: [8, 105, 202], width: 28 },
    { row: 7, kind: 'car', speed: 0.7, bases: [-10, 125, 260], width: 28 },
    { row: 8, kind: 'car', speed: -1.05, bases: [28, 132, 236], width: 28 },
    { row: 9, kind: 'car', speed: 0.85, bases: [0, 110, 220], width: 28 },
  ]
  let players,
    filled,
    reservations,
    level,
    phase,
    phaseAge,
    ticks,
    laneTick,
    timeLeft,
    terminal,
    tieTurn,
    events,
    noticeTicks
  const emit = (api, type, detail = {}) => {
    events.push({ tick: ticks, type, ...detail })
    if (events.length > 300) events.shift()
    if (config.onEvent) config.onEvent(Object.freeze({ ...events[events.length - 1] }), api)
  }
  const sound = (api, name) => {
    if (config.sound !== false) api.sfx(name)
  }
  const spawn = (index, lives = initialLives) => ({
    index,
    x: 24 + 16 * Math.round(number(config.startColumns?.[index], index ? 8 : 6, 0, 13)),
    row: 10,
    y: 196,
    lives,
    hop: null,
    queued: null,
    direction: 'up',
    age: 0,
    wait: 0,
    dying: false,
    bestRow: 10,
    score: 0,
    reserved: -1,
  })
  function resetLevel() {
    filled = homes.map(() => null)
    reservations = homes.map(() => null)
    laneTick = 0
    timeLeft = timeLimit * 60
    phase = 'play'
    phaseAge = 0
    players = players.map((p) => ({ ...spawn(p.index, p.lives), score: p.score }))
    noticeTicks = players.map(() => 0)
    tieTurn = level % 2
  }
  function init(api) {
    ticks = 0
    level = 1
    events = []
    terminal = false
    players = Array.from({ length: api.players === 2 ? 2 : 1 }, (_, i) => spawn(i))
    resetLevel()
    api.score(0)
  }
  function hazards(at = laneTick) {
    const multiplier = Math.min(1.7, 1 + (level - 1) * 0.13) * speedFactor
    return laneDefinitions.flatMap((lane, li) =>
      lane.bases.map((base, id) => {
        const speed = lane.speed * multiplier,
          cycle = (at + id * 83 + lane.row * 17) % 360,
          kind = config.turtles === false && lane.kind === 'turtle' ? 'log' : lane.kind
        return {
          row: lane.row,
          kind,
          id,
          x: 16 + ((((base + at * speed) % 320) + 320) % 320) - 48,
          y: 36 + lane.row * 16,
          width: kind === 'log' ? 64 : lane.width,
          speed,
          base,
          span: 320,
          cycle,
          active: kind !== 'turtle' || cycle < 310,
          warning: kind === 'turtle' && cycle >= 270 && cycle < 310,
          color: li % 3,
        }
      }),
    )
  }
  function frame(id, age) {
    const clip = CROSSING_ASSETS.animations[id],
      total = clip.frames.reduce((s, f) => s + f.duration, 0)
    let t = age % total,
      selected = clip.frames[0]
    for (const f of clip.frames) {
      selected = f
      if (t < f.duration) break
      t -= f.duration
    }
    return CROSSING_ASSETS.frames[selected.frame]
  }
  function addScore(api, p, n) {
    p.score += n
    api.addScore(n, p.index)
  }
  function die(api, p, reason) {
    if (p.wait || p.lives <= 0) return
    p.lives--
    p.wait = 45
    p.dying = true
    p.hop = null
    if (p.reserved >= 0) reservations[p.reserved] = null
    p.reserved = -1
    sound(api, 'die')
    emit(api, 'death', { player: p.index, reason, lives: p.lives })
  }
  function startHop(api, p, direction) {
    const d = dirs[direction],
      row = p.row + d[1],
      x = p.x + d[0] * 16
    if (row < 0 || row > 10 || x < 22 || x > 234) return false
    let home = -1
    if (row === 0) {
      home = homes.findIndex((h) => Math.abs(h - x) < 8)
      if (home < 0) {
        die(api, p, 'missed-home')
        return false
      }
      if (filled[home] !== null || reservations[home] !== null) return false
      reservations[home] = p.index
      p.reserved = home
    }
    p.hop = { fromX: p.x, fromY: p.y, toX: x, toY: 36 + row * 16, toRow: row, age: 0 }
    p.direction = direction
    p.queued = null
    sound(api, 'jump')
    return true
  }
  function updatePlayer(api, p, list) {
    if (p.lives <= 0) return
    p.age++
    if (p.wait > 0) {
      p.wait--
      if (p.wait === 0) {
        const score = p.score,
          lives = p.lives
        Object.assign(p, spawn(p.index, lives), { score })
      }
      return
    }
    let pressed = null
    for (const dir of ['left', 'right', 'down', 'up']) if (api.btnp(dir, p.index)) pressed = dir
    if (pressed) p.queued = pressed
    if (!p.hop) {
      let direction = p.queued
      if (!direction)
        for (const dir of ['left', 'right', 'down', 'up'])
          if (api.btn(dir, p.index)) direction = dir
      if (direction) startHop(api, p, direction)
    }
    if (p.wait) return
    if (p.hop) {
      const h = p.hop
      h.age++
      const t = h.age / hopFrames
      p.x = h.fromX + (h.toX - h.fromX) * t
      p.y = h.fromY + (h.toY - h.fromY) * t
      if (h.age >= hopFrames) {
        p.row = h.toRow
        p.hop = null
        if (p.row < p.bestRow) {
          addScore(api, p, (p.bestRow - p.row) * 10)
          p.bestRow = p.row
        }
        if (p.row === 0) {
          const home = p.reserved
          filled[home] = p.index
          reservations[home] = null
          p.reserved = -1
          addScore(api, p, 200 + Math.ceil(timeLeft / 60))
          if (homeNotice) noticeTicks[p.index] = homeNoticeFrames
          emit(api, 'home', {
            player: p.index,
            home,
            filled: filled.filter((x) => x !== null).length,
          })
          sound(api, 'powerup')
          p.wait = 30
          return
        }
      }
    }
    for (const h of list)
      if (h.kind === 'car' && Math.abs(h.y - p.y) < 9 && Math.abs(h.x - p.x) < h.width / 2 + 4) {
        die(api, p, 'traffic')
        return
      }
    if (!p.hop && p.row >= 1 && p.row <= 4) {
      const support = list.find(
        (h) =>
          h.row === p.row && h.kind !== 'car' && h.active && Math.abs(h.x - p.x) < h.width / 2 - 3,
      )
      if (!support) {
        die(api, p, 'water')
        return
      }
      p.x += support.speed
      if (p.x < 22 || p.x > 234) {
        die(api, p, 'carried-off')
        return
      }
    }
  }
  function update(api) {
    if (terminal) return
    ticks++
    noticeTicks = noticeTicks.map((n) => Math.max(0, n - 1))
    phaseAge++
    if (phase === 'clear') {
      if (phaseAge >= 75) {
        if (level >= levels) {
          phase = 'complete'
          terminal = true
          api.win()
        } else {
          level++
          resetLevel()
          emit(api, 'level', { level })
        }
      }
      return
    }
    laneTick++
    timeLeft--
    const list = hazards()
    const ordered = players.length === 2 && tieTurn ? [players[1], players[0]] : players
    for (const p of ordered) updatePlayer(api, p, list)
    if (reservations.some((x) => x !== null)) tieTurn = 1 - tieTurn
    if (timeLeft <= 0) {
      for (const p of players) die(api, p, 'timer')
      timeLeft = timeLimit * 60
    }
    if (players.every((p) => p.lives <= 0)) {
      terminal = true
      phase = 'complete'
      api.gameOver()
      return
    }
    if (filled.every((x) => x !== null)) {
      phase = 'clear'
      phaseAge = 0
      sound(api, 'powerup')
      emit(api, 'level-clear', { level })
    }
  }
  function sprite(api, id, x, y, age = 0, flip = false) {
    const s = frame(id, age)
    api.spr(s.pixels, Math.round(x - s.anchor.x), Math.round(y - s.anchor.y), flip)
  }
  // The center timer stays reserved. Notice slots never cover frogs or lane hazards.
  function layout() {
    return {
      scoreHud: { x: 0, y: 0, w: 256, h: 12 },
      status: { x: 16, y: 12, w: 224, h: 16 },
      field: { x: 16, y: 28, w: 224, h: 176 },
      timer: { x: 80, y: 211, w: 64, h: 8 },
      notices: players.map((p) => ({
        player: p.index,
        x: p.index ? 168 : 16,
        y: 211,
        w: 56,
        h: 8,
      })),
    }
  }
  function draw(api) {
    api.cls(0)
    api.rectfill(16, 28, 224, 80, 1)
    for (let row = 1; row <= 4; row++)
      for (let x = 20; x < 240; x += 26) api.line(x, 31 + row * 16, x + 9, 31 + row * 16, 12)
    api.rectfill(16, 108, 224, 16, 3)
    api.rectfill(16, 188, 224, 16, 3)
    for (let x = 18; x < 238; x += 11) {
      api.pset(x, 113, 11)
      api.pset(x + 4, 119, 11)
      api.pset(x + 2, 193, 11)
      api.pset(x + 5, 200, 11)
    }
    api.rectfill(16, 124, 224, 64, 5)
    for (let row = 6; row < 10; row++)
      for (let x = 20; x < 240; x += 24) api.rectfill(x, 43 + row * 16, 12, 1, 6)
    for (const h of hazards()) {
      if (h.kind === 'car') sprite(api, `car-${h.color}`, h.x, h.y, ticks, h.speed < 0)
      else if (h.kind === 'log') sprite(api, 'log', h.x, h.y)
      else
        for (let i = -1; i <= 1; i++)
          sprite(
            api,
            !h.active ? 'turtle-sunk' : h.warning ? 'turtle-warning' : 'turtle-swim',
            h.x + i * 16,
            h.y,
            ticks,
          )
    }
    api.rectfill(0, 12, 16, 212, 0)
    api.rectfill(240, 12, 16, 212, 0)
    for (let i = 0; i < homes.length; i++) {
      const x = homes[i]
      api.rectfill(x - 9, 28, 18, 16, 3)
      api.rectfill(x - 7, 30, 14, 13, 0)
      api.line(x - 7, 30, x + 6, 30, 11)
      if (filled[i] !== null) sprite(api, `frog-${filled[i]}-up-idle`, x, 36, ticks)
      else if (reservations[i] !== null) api.rect(x - 8, 29, 16, 14, reservations[i] ? 8 : 12)
    }
    for (const p of players) {
      if (p.lives <= 0) continue
      if (p.dying && p.wait > 21) {
        sprite(api, 'splash', p.x, p.y, 45 - p.wait)
        continue
      }
      if (p.wait) continue
      sprite(
        api,
        `frog-${p.index}-${p.direction}-${p.hop ? 'hop' : 'idle'}`,
        p.x,
        p.y,
        p.hop ? p.hop.age : p.age,
      )
    }
    api.text(`P1 ${players[0].lives}`, 16, 15, 12)
    api.text(`R${level}`, 112, 15, 7)
    if (players.length === 2) api.text(`P2 ${players[1].lives}`, 200, 15, 8)
    else api.text(`${filled.filter((x) => x !== null).length}/5`, 200, 15, 10)
    api.text('TIME', 80, 211, 6)
    api.text(
      String(Math.max(0, Math.ceil(timeLeft / 60))).padStart(3, '0'),
      120,
      211,
      timeLeft < 600 ? 8 : 10,
    )
    for (const area of layout().notices)
      if (noticeTicks[area.player] > 0) api.text(homeNotice, area.x, area.y, area.player ? 8 : 12)
    if (phase === 'clear') {
      api.rectfill(65, 108, 126, 16, 0)
      api.textCenter('HOMES SAFE!', 112, 10)
    }
    if (config.drawOverlay)
      config.drawOverlay(api, { level, filled: [...filled], timeLeft, phase, layout: layout() })
  }
  const inspect = () => ({
    level,
    phase,
    ticks,
    laneTick,
    timeLeft,
    terminal,
    filled: [...filled],
    reservations: [...reservations],
    homes: [...homes],
    players: players.map((p) => ({ ...p, hop: p.hop ? { ...p.hop } : null })),
    hazards: hazards(),
    events: events.map((e) => ({ ...e })),
    laneSpeed: speedFactor,
    hopFrames,
    notices: noticeTicks.map((remaining, player) => ({ player, remaining, text: homeNotice })),
  })
  return { init, update, draw, inspect, layout }
}
