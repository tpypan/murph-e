// biome-ignore lint/correctness/noUnusedVariables: bundled and returned by build.mjs.
function mazeFactory(config = {}) {
  const defaultLayout = [
    '###################',
    '#o......#.#......o#',
    '#.##.##.#.#.##.##.#',
    '#.................#',
    '#.##.#.#####.#.##.#',
    '#....#...#...#....#',
    '####.###   ###.####',
    '   #.# ##=## #.#   ',
    '####.# #HHH# #.####',
    'T   .  #HHH#  .   T',
    '####.# ##### #.####',
    '   #.#       #.#   ',
    '####.# ##### #.####',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#o.#..... .....#.o#',
    '##.#.#.#####.#.#.##',
    '#....#...#...#....#',
    '###################',
  ]
  const layout = config.layout || defaultLayout
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const integer = (v, fallback, lo, hi) =>
    Math.round(clamp(Number.isFinite(v) ? v : fallback, lo, hi))
  const avatar = config.avatar || 'chomper'
  const hunt = (config.huntMode || 'classic') === 'player-hunts'
  if (!['chomper', 'goose'].includes(avatar))
    throw Error('maze: avatar must be chomper or goose; renaming is not replacement artwork')
  if (config.huntMode && !['classic', 'player-hunts'].includes(config.huntMode))
    throw Error('maze: unsupported huntMode')
  if (layout.length !== 19 || layout.some((row) => row.length !== 19 || /[^#.oH= T]/.test(row)))
    throw Error('maze: layout must be 19×19 using # . o H = space T')
  const maxLevels = integer(config.levels, 3, 1, 8),
    startingLives = integer(config.lives, 3, 1, 9),
    ghostCount = integer(config.ghostCount, 4, hunt ? 1 : 0, 4)
  const baseQuota = integer(config.capturesToClear, 8, 1, 30),
    huntSeconds = integer(config.huntSeconds, 60, 20, 180)
  const playerFrames = integer(config.playerStepFrames, 8, 6, 14),
    ghostFrames = integer(config.ghostStepFrames, 11, 9, 22)
  const home = { x: 9, y: 9 },
    exit = { x: 9, y: 6 },
    slots = [
      { x: 8, y: 8 },
      { x: 9, y: 8 },
      { x: 10, y: 8 },
      { x: 9, y: 9 },
    ]
  const starts = config.playerStarts || [
    { x: 9, y: 15 },
    { x: 10, y: 15 },
  ]
  const dirs = [
    { x: 1, y: 0, name: 'right' },
    { x: 0, y: 1, name: 'down' },
    { x: -1, y: 0, name: 'left' },
    { x: 0, y: -1, name: 'up' },
  ]
  // Artwork may change; movement/contact rules remain the reviewed controller's.
  // Copy imported data so callers cannot mutate a validated clip during play.
  function visualAssets(input) {
    if (input === undefined) return MAZE_ASSETS
    if (!input || !input.frames || !input.animations)
      throw Error('maze: assets need frames and complete animations')
    const frames = {},
      animations = {}
    for (const [id, f] of Object.entries(input.frames)) {
      const w = f?.pixels?.[0]?.length,
        h = f?.pixels?.length
      if (
        !Array.isArray(f?.pixels) ||
        !Number.isInteger(w) ||
        w < 1 ||
        w > 24 ||
        h < 1 ||
        h > 24 ||
        f.pixels.some(
          (row) => typeof row !== 'string' || row.length !== w || /[^.0-9a-f]/.test(row),
        )
      )
        throw Error(`maze: invalid pixels for ${id}`)
      if (
        !Number.isInteger(f.anchor?.x) ||
        !Number.isInteger(f.anchor?.y) ||
        f.anchor.x < 0 ||
        f.anchor.x >= w ||
        f.anchor.y < 0 ||
        f.anchor.y >= h
      )
        throw Error(`maze: invalid anchor for ${id}`)
      if (
        f.palette !== undefined &&
        (!Array.isArray(f.palette) ||
          f.palette.length < 1 ||
          f.palette.length > 16 ||
          f.palette.some((c) => typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) ||
          f.pixels.some((row) =>
            [...row].some((c) => c !== '.' && parseInt(c, 16) >= f.palette.length),
          ))
      )
        throw Error(`maze: invalid palette for ${id}`)
      frames[id] = {
        pixels: [...f.pixels],
        anchor: { ...f.anchor },
        ...(f.palette ? { palette: [...f.palette] } : {}),
      }
    }
    const required = []
    for (let p = 0; p < 2; p++) {
      required.push(`${avatar}-${p}-death`)
      for (const d of dirs) {
        required.push(`${avatar}-${p}-${d.name}`)
        if (avatar === 'goose') required.push(`${avatar}-${p}-honk-${d.name}`)
      }
    }
    for (let g = 0; g < 4; g++) {
      required.push(`reform-${g}`)
      for (const d of dirs) required.push(`ghost-${g}-${d.name}`)
    }
    required.push('frightened-blue', 'frightened-flash', ...dirs.map((d) => `eyes-${d.name}`))
    for (const id of required) {
      const a = input.animations[id]
      if (
        !a ||
        typeof a.loop !== 'boolean' ||
        !Array.isArray(a.frames) ||
        !a.frames.length ||
        a.frames.some(
          (f) =>
            !frames[f.frame] || !Number.isInteger(f.duration) || f.duration < 1 || f.duration > 600,
        )
      )
        throw Error(`maze: incomplete animation ${id}`)
      const duration = a.frames.reduce((n, f) => n + f.duration, 0)
      if (
        (id.endsWith('-death') && (a.loop || duration > 75)) ||
        (id.startsWith('reform-') && (a.loop || duration > 45))
      )
        throw Error(`maze: ${id} must finish within its controller phase`)
      animations[id] = {
        loop: a.loop,
        frames: a.frames.map((f) => ({ frame: f.frame, duration: f.duration })),
      }
    }
    return { frames, animations }
  }
  const artwork = visualAssets(config.assets)
  const tile = (x, y) => layout[y]?.[x] ?? '#'
  const legal = (x, y, state = 'player') => {
    const t = tile(x, y)
    return (
      t !== '#' &&
      (!['H', '='].includes(t) || ['house', 'leaving', 'returning', 'reforming'].includes(state))
    )
  }
  function neighbor(x, y, dir, state = 'player') {
    if (dir < 0) return null
    const d = dirs[dir]
    let nx = x + d.x,
      ny = y + d.y
    if (d.y === 0 && tile(x, y) === 'T') {
      if (nx < 0) nx = 18
      if (nx > 18) nx = 0
    }
    return legal(nx, ny, state) ? { x: nx, y: ny } : null
  }
  function distances(target, state = 'player') {
    const map = new Map(),
      q = []
    if (!legal(target.x, target.y, state)) return map
    map.set(target.y * 19 + target.x, 0)
    q.push(target)
    for (let i = 0; i < q.length && i < 361; i++) {
      const p = q[i],
        n = map.get(p.y * 19 + p.x) + 1
      for (let d = 0; d < 4; d++) {
        const next = neighbor(p.x, p.y, d, state)
        if (!next) continue
        const key = next.y * 19 + next.x
        if (!map.has(key)) {
          map.set(key, n)
          q.push(next)
        }
      }
    }
    return map
  }
  const walkable = []
  for (let y = 0; y < 19; y++) for (let x = 0; x < 19; x++) if (legal(x, y)) walkable.push({ x, y })
  if (
    starts.length < 2 ||
    starts.some((p) => !Number.isInteger(p.x) || !Number.isInteger(p.y) || !legal(p.x, p.y))
  )
    throw Error('maze: both playerStarts must be legal corridor cells')
  if (tile(9, 7) !== '=' || slots.some((p) => tile(p.x, p.y) !== 'H') || !legal(exit.x, exit.y))
    throw Error('maze: retain the central house, door at 9,7 and exit at 9,6')
  if (tile(0, 9) !== 'T' || tile(18, 9) !== 'T' || layout.join('').split('T').length !== 3)
    throw Error('maze: paired tunnel mouths must remain at 0,9 and 18,9')
  const reachable = distances(starts[0])
  for (let y = 0; y < 19; y++)
    for (let x = 0; x < 19; x++)
      if ('.o'.includes(tile(x, y)) && !reachable.has(y * 19 + x))
        throw Error(`maze: unreachable pickup ${x},${y}`)
  if (!reachable.has(starts[1].y * 19 + starts[1].x))
    throw Error('maze: both players must share the connected maze')
  if (!distances(home, 'returning').has(exit.y * 19 + exit.x))
    throw Error('maze: blocked ghost return path')
  const connected = walkable.filter((p) => reachable.has(p.y * 19 + p.x))
  const nearest = (target) =>
    connected.reduce(
      (best, p) =>
        Math.abs(p.x - target.x) + Math.abs(p.y - target.y) <
        Math.abs(best.x - target.x) + Math.abs(best.y - target.y)
          ? p
          : best,
      connected[0],
    )
  const quotas = (level) => Math.min(30, baseQuota + (level - 1) * 2)
  let players,
    ghosts,
    pellets,
    phase,
    phaseAge,
    level,
    lives,
    power,
    powerChain,
    ticks,
    captures,
    capturesTotal,
    timeLeft,
    remaining,
    totalPellets,
    score,
    globalMode,
    modeAge,
    cycle,
    terminal,
    effects,
    events
  const actor = (x, y, dir = -1) => ({
    x,
    y,
    dir,
    queued: dir,
    to: null,
    progress: 0,
    moveFrames: playerFrames,
    animationAge: 0,
  })
  const event = (api, type, details = {}) => {
    const item = Object.freeze({ frame: ticks, type, ...details })
    events.push(item)
    if (events.length > 256) events.shift()
    if (config.onEvent) config.onEvent(item, api)
  }
  const sound = (api, name) => {
    if (config.sound !== false) api.sfx(name)
  }
  function resetActors() {
    players = starts.slice(0, players?.length || 1).map((p, i) => ({
      ...actor(p.x, p.y, -1),
      index: i,
      invulnerable: 90,
      honk: 0,
      honkAge: 99,
    }))
    ghosts = slots.slice(0, ghostCount).map((p, i) => ({
      ...actor(p.x, p.y, 3),
      id: i,
      state: 'house',
      wait: 30 + i * 70,
      reform: 0,
      stun: 0,
      captured: 0,
      releases: 0,
    }))
    power = 0
    powerChain = 0
    globalMode = 'scatter'
    modeAge = 0
    cycle = 0
  }
  function resetLevel() {
    pellets = layout.map((row) => row.split('').map((c) => (c === '.' ? 1 : c === 'o' ? 2 : 0)))
    remaining = pellets.flat().filter(Boolean).length
    totalPellets = remaining
    captures = 0
    timeLeft = huntSeconds * 60
    effects = []
    resetActors()
    phase = 'ready'
    phaseAge = 0
  }
  function init(api) {
    ticks = 0
    level = 1
    lives = startingLives
    score = 0
    capturesTotal = 0
    events = []
    terminal = false
    players = Array.from({ length: api.players === 2 ? 2 : 1 })
    resetLevel()
    api.score(0)
  }
  function position(a) {
    let x = a.x,
      y = a.y
    if (a.to) {
      let dx = a.to.x - a.x
      if (Math.abs(dx) > 1) dx = dx > 0 ? -1 : 1
      const t = a.progress / a.moveFrames
      x += dx * t
      y += (a.to.y - a.y) * t
    }
    if (x < -0.5) x += 19
    if (x > 18.5) x -= 19
    return { x: 33 + x * 10 + 5, y: 28 + y * 10 + 5 }
  }
  function advance(a, choose, stepFrames) {
    if (!a.to) {
      const d = choose(a)
      if (d === null || d < 0) return false
      const next = neighbor(a.x, a.y, d, a.state || 'player')
      if (!next) return false
      a.dir = d
      a.to = next
      a.moveFrames = stepFrames
      a.progress = 0
    }
    a.progress++
    a.animationAge++
    if (a.progress >= a.moveFrames) {
      a.x = a.to.x
      a.y = a.to.y
      a.to = null
      a.progress = 0
      return true
    }
    return false
  }
  function reverse(a) {
    if (a.to) {
      const from = { x: a.x, y: a.y }
      a.x = a.to.x
      a.y = a.to.y
      a.to = from
      a.progress = a.moveFrames - a.progress
    }
    if (a.dir >= 0) a.dir = (a.dir + 2) % 4
  }
  function pickup(api, p) {
    const value = pellets[p.y][p.x]
    if (!value) return
    pellets[p.y][p.x] = 0
    remaining--
    const points = value === 2 ? 50 : 10
    score += points
    api.addScore(points)
    event(api, 'pickup', { player: p.index, x: p.x, y: p.y, power: value === 2, remaining })
    if (value === 2) {
      power = Math.max(180, 480 - (level - 1) * 35)
      powerChain = 0
      for (const g of ghosts)
        if (['chase', 'scatter', 'frightened'].includes(g.state)) {
          if (g.state !== 'frightened') reverse(g)
          g.state = 'frightened'
        }
      sound(api, 'powerup')
    } else if (ticks % 3 === 0) sound(api, 'coin')
  }
  function readPlayer(api, p) {
    let pressed = -1
    for (let d = 0; d < 4; d++) if (api.btnp(dirs[d].name, p.index)) pressed = d
    if (pressed >= 0) p.queued = pressed
    else if (p.queued < 0 || p.queued === p.dir)
      for (let d = 0; d < 4; d++) if (api.btn(dirs[d].name, p.index)) p.queued = d
    if (p.to && p.queued === (p.dir + 2) % 4) reverse(p)
    p.invulnerable = Math.max(0, p.invulnerable - 1)
    p.honk = Math.max(0, p.honk - 1)
    p.honkAge++
    if (avatar === 'goose' && hunt && api.btnp('a', p.index) && p.honk === 0) {
      p.honk = 180
      p.honkAge = 0
      const pos = position(p)
      effects.push({ type: 'honk', ...pos, age: 0 })
      for (const g of ghosts)
        if (
          g.state === 'frightened' &&
          Math.hypot(position(g).x - pos.x, position(g).y - pos.y) < 45
        )
          g.stun = 36
      sound(api, 'select')
      event(api, 'honk', { player: p.index })
    }
    if (!p.to) pickup(api, p)
    const arrived = advance(
      p,
      (a) => (neighbor(a.x, a.y, a.queued) ? a.queued : neighbor(a.x, a.y, a.dir) ? a.dir : -1),
      Math.max(6, playerFrames - (hunt && power > 0 ? 1 : 0)),
    )
    if (arrived) pickup(api, p)
  }
  function closestPlayer(g) {
    return players.reduce(
      (best, p) =>
        Math.abs(p.x - g.x) + Math.abs(p.y - g.y) < Math.abs(best.x - g.x) + Math.abs(best.y - g.y)
          ? p
          : best,
      players[0],
    )
  }
  function chooseGhost(g) {
    let target,
      allowReverse = false
    if (g.state === 'leaving') {
      target = exit
      allowReverse = true
    } else if (g.state === 'returning') {
      target = home
      allowReverse = true
    } else if (g.state === 'scatter') {
      target = [
        { x: 17, y: 1 },
        { x: 1, y: 1 },
        { x: 17, y: 17 },
        { x: 1, y: 17 },
      ][g.id]
    } else if (g.state === 'chase') {
      const p = closestPlayer(g),
        direction = dirs[p.dir < 0 ? 0 : p.dir]
      if (g.id === 0) target = p
      else if (g.id === 1) target = nearest({ x: p.x + direction.x * 4, y: p.y + direction.y * 4 })
      else if (g.id === 2) {
        const other = players[1 - p.index] || p
        target = nearest({ x: other.x + direction.x * 2, y: other.y + direction.y * 2 })
      } else target = Math.abs(g.x - p.x) + Math.abs(g.y - p.y) < 6 ? { x: 1, y: 17 } : p
    }
    let options = []
    for (let d = 0; d < 4; d++) {
      const n = neighbor(g.x, g.y, d, g.state)
      if (n) options.push({ dir: d, ...n })
    }
    if (!allowReverse && options.length > 1)
      options = options.filter((o) => o.dir !== (g.dir + 2) % 4)
    if (!options.length) return -1
    if (g.state === 'frightened') {
      const maps = players.map((p) => distances({ x: p.x, y: p.y }, g.state))
      options.sort(
        (a, b) =>
          Math.min(...maps.map((m) => m.get(b.y * 19 + b.x) ?? 99)) -
            Math.min(...maps.map((m) => m.get(a.y * 19 + a.x) ?? 99)) ||
          ((a.dir + g.id) % 4) - ((b.dir + g.id) % 4),
      )
    } else {
      const map = distances(target, g.state)
      options.sort(
        (a, b) =>
          (map.get(a.y * 19 + a.x) ?? 999) - (map.get(b.y * 19 + b.x) ?? 999) || a.dir - b.dir,
      )
    }
    return options[0].dir
  }
  function ghostMood() {
    return hunt || power > 0 ? 'frightened' : globalMode
  }
  function updateGhost(api, g) {
    if (g.state === 'house') {
      g.animationAge++
      if (--g.wait <= 0) {
        g.state = 'leaving'
        event(api, 'ghost-leaving', { id: g.id })
      }
      return
    }
    if (g.state === 'reforming') {
      g.reform++
      if (g.reform >= 45) {
        g.state = 'house'
        g.wait = 45
        event(api, 'ghost-reformed', { id: g.id })
      }
      return
    }
    if (g.stun > 0) {
      g.stun--
      return
    }
    if (!g.to && g.state === 'returning' && g.x === home.x && g.y === home.y) {
      g.state = 'reforming'
      g.reform = 0
      g.animationAge = 0
      event(api, 'ghost-home', { id: g.id })
      return
    }
    if (!g.to && g.state === 'leaving' && g.x === exit.x && g.y === exit.y) {
      g.state = ghostMood()
      g.releases++
      event(api, 'ghost-released', { id: g.id, releases: g.releases })
    }
    if (['chase', 'scatter', 'frightened'].includes(g.state)) g.state = ghostMood()
    const speed =
      g.state === 'returning'
        ? 4
        : g.state === 'leaving'
          ? 10
          : Math.max(9, ghostFrames - Math.floor((level - 1) / 2)) +
            (g.state === 'frightened' ? 3 : 0)
    advance(g, chooseGhost, speed)
  }
  function playerClip(p) {
    return `${avatar}-${p.index}-${phase === 'death' ? 'death' : avatar === 'goose' && p.honkAge < 15 ? `honk-${dirs[Math.max(0, p.dir)].name}` : dirs[Math.max(0, p.dir)].name}`
  }
  function ghostClip(g) {
    const direction = dirs[Math.max(0, g.dir)].name
    if (g.state === 'returning') return `eyes-${direction}`
    if (g.state === 'reforming') return `reform-${g.id}`
    if (g.state === 'frightened')
      return `frightened-${!hunt && power < 120 && ticks % 20 < 10 ? 'flash' : 'blue'}`
    return `ghost-${g.id}-${direction}`
  }
  function frame(clip, age, assets = artwork) {
    const animation = assets.animations[clip],
      length = animation.frames.reduce((n, f) => n + f.duration, 0)
    let t = animation.loop ? age % length : Math.min(age, length - 1),
      chosen = animation.frames[0]
    for (const f of animation.frames) {
      chosen = f
      if (t < f.duration) break
      t -= f.duration
    }
    return { sprite: assets.frames[chosen.frame], metadata: chosen }
  }
  function touching(p, g) {
    const a = position(p),
      b = position(g),
      ph = frame(playerClip(p), p.animationAge, MAZE_ASSETS).metadata.hitboxes[0],
      gh = frame(ghostClip(g), g.animationAge, MAZE_ASSETS).metadata.hurtboxes[0]
    if (!ph || !gh) return false
    let dx = b.x - a.x
    if (p.y === 9 && g.y === 9) {
      if (dx > 95) dx -= 190
      if (dx < -95) dx += 190
    }
    return (
      ph.x < dx + gh.x + gh.w &&
      ph.x + ph.w > dx + gh.x &&
      a.y + ph.y < b.y + gh.y + gh.h &&
      a.y + ph.y + ph.h > b.y + gh.y
    )
  }
  function capture(api, p, g) {
    if (g.state !== 'frightened') return
    g.state = 'returning'
    g.captured++
    g.stun = 0
    g.animationAge = 0
    captures++
    capturesTotal++
    const points = hunt ? (power > 0 ? 400 : 200) : 200 * 2 ** Math.min(powerChain++, 3)
    score += points
    api.addScore(points)
    effects.push({ ...position(g), type: 'score', text: String(points), age: 0 })
    sound(api, 'hit')
    event(api, 'capture', { player: p.index, id: g.id, points, captures })
  }
  function loseLife(api) {
    lives--
    phase = 'death'
    phaseAge = 0
    players.forEach((p) => {
      p.animationAge = 0
    })
    sound(api, 'die')
    event(api, 'life-lost', { lives })
  }
  function update(api) {
    if (terminal) return
    ticks++
    phaseAge++
    effects.forEach((e) => {
      e.age++
    })
    effects = effects.filter((e) => e.age < 40)
    if (phase === 'ready') {
      // START belongs to the cabinet. This banner is informational: input and
      // honk respond immediately while ghosts wait safely inside the house.
      for (const p of players) readPlayer(api, p)
      if (phaseAge >= 75) {
        phase = 'play'
        phaseAge = 0
      }
      return
    }
    if (phase === 'death') {
      players.forEach((p) => {
        p.animationAge++
      })
      if (phaseAge >= 75) {
        if (lives <= 0) {
          terminal = true
          phase = 'complete'
          api.gameOver()
        } else {
          resetActors()
          phase = 'ready'
          phaseAge = 0
        }
      }
      return
    }
    if (phase === 'clear') {
      if (phaseAge >= 90) {
        if (level >= maxLevels) {
          terminal = true
          phase = 'complete'
          api.win()
        } else {
          level++
          resetLevel()
          event(api, 'level-start', { level })
        }
      }
      return
    }
    if (hunt && --timeLeft <= 0) {
      terminal = true
      phase = 'complete'
      sound(api, 'die')
      api.gameOver()
      event(api, 'time-expired')
      return
    }
    power = Math.max(0, power - 1)
    modeAge++
    const duration = globalMode === 'scatter' ? Math.max(180, 420 - cycle * 60) : 1200
    if (modeAge >= duration) {
      globalMode = globalMode === 'scatter' ? 'chase' : 'scatter'
      modeAge = 0
      if (globalMode === 'scatter') cycle++
      for (const g of ghosts) if (['scatter', 'chase'].includes(g.state)) reverse(g)
    }
    for (const p of players) readPlayer(api, p)
    for (const g of ghosts) updateGhost(api, g)
    for (const p of players)
      for (const g of ghosts)
        if (touching(p, g)) {
          if (g.state === 'frightened') capture(api, p, g)
          else if (!hunt && ['chase', 'scatter'].includes(g.state) && p.invulnerable === 0) {
            loseLife(api)
            return
          }
        }
    if (hunt ? captures >= quotas(level) : remaining === 0) {
      phase = 'clear'
      phaseAge = 0
      const points = 500 * level
      score += points
      api.addScore(points)
      sound(api, 'powerup')
      event(api, 'level-clear', { level, captures, remaining })
    }
  }
  function drawWalls(api) {
    const bright =
        phase === 'clear' && Math.floor(phaseAge / 10) % 2 === 0 ? 7 : (config.wallColor ?? 12),
      shade = 1
    for (let y = 0; y < 19; y++)
      for (let x = 0; x < 19; x++) {
        const px = 33 + x * 10,
          py = 28 + y * 10,
          t = tile(x, y)
        if (t === 'H') api.rectfill(px, py, 10, 10, 1)
        if (t === '#') {
          const top = tile(x, y - 1) === '#',
            bottom = tile(x, y + 1) === '#',
            left = tile(x - 1, y) === '#',
            right = tile(x + 1, y) === '#'
          if (!top) {
            api.line(px + (left ? 0 : 2), py + 1, px + (right ? 9 : 7), py + 1, bright)
            api.line(px + 2, py + 2, px + 7, py + 2, shade)
          }
          if (!bottom) {
            api.line(px + (left ? 0 : 2), py + 8, px + (right ? 9 : 7), py + 8, bright)
            api.line(px + 2, py + 7, px + 7, py + 7, shade)
          }
          if (!left) {
            api.line(px + 1, py + (top ? 0 : 2), px + 1, py + (bottom ? 9 : 7), bright)
            api.line(px + 2, py + 2, px + 2, py + 7, shade)
          }
          if (!right) {
            api.line(px + 8, py + (top ? 0 : 2), px + 8, py + (bottom ? 9 : 7), bright)
            api.line(px + 7, py + 2, px + 7, py + 7, shade)
          }
          if (!top && !left) api.pset(px + 2, py + 2, bright)
          if (!top && !right) api.pset(px + 7, py + 2, bright)
          if (!bottom && !left) api.pset(px + 2, py + 7, bright)
          if (!bottom && !right) api.pset(px + 7, py + 7, bright)
        } else if (t === '=') {
          api.line(px, py + 4, px + 9, py + 4, 14)
          api.line(px, py + 5, px + 9, py + 5, 7)
        }
        const dot = pellets[y][x]
        if (dot === 1) api.rectfill(px + 4, py + 4, 2, 2, 15)
        if (dot === 2) {
          api.rectfill(px + 2, py + 2, 6, 6, ticks % 40 < 28 ? 15 : 5)
          api.rectfill(px + 3, py + 1, 4, 8, ticks % 40 < 28 ? 15 : 5)
        }
      }
  }
  function drawActor(api, a, clip, age) {
    const f = frame(clip, age).sprite,
      pos = position(a),
      x = Math.round(pos.x - f.anchor.x),
      y = Math.round(pos.y - f.anchor.y)
    api.spr(f.pixels, x, y, false, false, f.palette)
    if (a.y === 9 && pos.x < 43) api.spr(f.pixels, x + 190, y, false, false, f.palette)
    else if (a.y === 9 && pos.x > 213) api.spr(f.pixels, x - 190, y, false, false, f.palette)
  }
  function draw(api) {
    api.cls(0)
    drawWalls(api)
    for (const g of ghosts) {
      drawActor(api, g, ghostClip(g), g.state === 'reforming' ? g.reform : g.animationAge)
      if (g.stun > 0) {
        const p = position(g)
        api.pset(p.x - 2, p.y - 9, 10)
        api.pset(p.x + 3, p.y - 10, 10)
      }
    }
    for (const p of players) {
      drawActor(
        api,
        p,
        playerClip(p),
        phase === 'death' ? p.animationAge : p.honkAge < 15 ? p.honkAge : p.animationAge,
      )
      if (config.playerMarkers && players.length === 2 && phase !== 'death') {
        const pos = position(p)
        api.text(String(p.index + 1), pos.x - 2, pos.y + 9, p.index ? 8 : 12)
      }
      if (p.invulnerable > 0 && phase === 'play' && ticks % 12 < 6) {
        const pos = position(p)
        api.line(pos.x - 3, pos.y + 7, pos.x + 3, pos.y + 7, p.index ? 8 : 12)
      }
    }
    for (const e of effects)
      if (e.type === 'score')
        api.text(e.text, clamp(e.x - 12, 33, 195), e.y - 8 - Math.floor(e.age / 5), 7)
      else if (e.type === 'honk' && e.age < 18) api.circ(e.x, e.y, 6 + e.age * 2, 7)
    if (hunt) {
      api.text(`${captures}/${quotas(level)}`, 34, 15, 10)
      api.text(String(Math.ceil(timeLeft / 60)).padStart(2, '0'), 201, 15, timeLeft < 600 ? 8 : 7)
      api.text(`R${level}`, 119, 15, 7)
    } else {
      api.text(`R${level}`, 34, 15, 7)
      for (let i = 0; i < lives; i++) {
        api.circfill(75 + i * 11, 18, 3, 10)
        api.line(75 + i * 11, 18, 79 + i * 11, 16, 0)
        api.line(75 + i * 11, 18, 79 + i * 11, 20, 0)
      }
      if (power > 0) api.rectfill(182, 16, Math.ceil((power / 480) * 35), 4, 12)
    }
    if (phase === 'ready') {
      api.rectfill(81, 134, 94, 15, 0)
      api.textCenter(hunt ? 'HUNT!' : 'READY!', 138, 10)
    }
    if (phase === 'clear') {
      api.rectfill(72, 134, 112, 15, 0)
      api.textCenter(hunt ? 'CAUGHT!' : 'CLEAR!', 138, 10)
    }
    if (config.drawOverlay) config.drawOverlay(api, { phase, level, remaining, captures, timeLeft })
  }
  const snapshotActor = (a) => ({
    x: a.x,
    y: a.y,
    dir: a.dir,
    to: a.to ? { ...a.to } : null,
    progress: a.progress,
    position: position(a),
    queued: a.queued,
  })
  const inspect = () => ({
    phase,
    level,
    lives,
    power,
    ticks,
    captures,
    capturesTotal,
    quota: quotas(level),
    timeLeft,
    remaining,
    totalPellets,
    score,
    huntMode: hunt ? 'player-hunts' : 'classic',
    globalMode,
    terminal,
    players: players.map((p) => ({
      ...snapshotActor(p),
      index: p.index,
      invulnerable: p.invulnerable,
      honk: p.honk,
    })),
    ghosts: ghosts.map((g) => ({
      ...snapshotActor(g),
      id: g.id,
      state: g.state,
      wait: g.wait,
      reform: g.reform,
      captured: g.captured,
      releases: g.releases,
      stun: g.stun,
    })),
    pellets: pellets.map((r) => [...r]),
    events: events.map((e) => ({ ...e })),
    layout: [...layout],
  })
  return { init, update, draw, inspect }
}
