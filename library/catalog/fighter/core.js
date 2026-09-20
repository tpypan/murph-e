// Build wraps this factory and the original pixel assets into module.js.
// biome-ignore lint/correctness/noUnusedVariables: build.mjs returns this factory from the standalone bundle.
function fighterFactory(config = {}) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const roundsToWin = clamp(config.roundsToWin || 2, 1, 5)
  const roundSeconds = clamp(config.roundSeconds || 60, 15, 120)
  const difficulty = clamp(config.difficulty ?? 0.6, 0, 1)
  const floor = 184
  const moves = {
    light: {
      startup: 5,
      active: 3,
      recovery: 10,
      damage: 7,
      stun: 16,
      push: 2.2,
      x: 14,
      y: -48,
      w: 20,
      h: 9,
      level: 'mid',
    },
    airLight: {
      startup: 4,
      active: 6,
      recovery: 10,
      damage: 8,
      stun: 17,
      push: 2.2,
      x: 14,
      y: -48,
      w: 20,
      h: 14,
      level: 'overhead',
    },
    airHeavy: {
      startup: 8,
      active: 6,
      recovery: 14,
      damage: 12,
      stun: 21,
      push: 3,
      x: 14,
      y: -33,
      w: 25,
      h: 17,
      level: 'overhead',
    },
    heavy: {
      startup: 11,
      active: 5,
      recovery: 21,
      damage: 14,
      stun: 24,
      push: 3.8,
      x: 16,
      y: -38,
      w: 24,
      h: 13,
      level: 'overhead',
    },
    sweep: {
      startup: 9,
      active: 5,
      recovery: 20,
      damage: 10,
      stun: 22,
      push: 3,
      x: 12,
      y: -14,
      w: 29,
      h: 12,
      level: 'low',
    },
    special: {
      startup: 13,
      active: 5,
      recovery: 22,
      damage: 17,
      stun: 25,
      push: 3.5,
      projectile: true,
      level: 'mid',
    },
    dash: {
      startup: 9,
      active: 12,
      recovery: 24,
      damage: 17,
      stun: 25,
      push: 3.5,
      x: 10,
      y: -47,
      w: 23,
      h: 38,
      level: 'mid',
    },
  }
  // Explicit, bounded overrides let a composition modify combat feel without
  // rewriting collision/state transitions. Core shapes stay runtime-compatible.
  for (const [name, override] of Object.entries(config.moves || {})) {
    if (!moves[name] || !override || typeof override !== 'object') continue
    for (const field of ['startup', 'active', 'recovery', 'damage', 'stun', 'push']) {
      if (Number.isFinite(override[field]))
        moves[name][field] = clamp(
          override[field],
          field === 'push' ? 0 : 1,
          field === 'damage' ? 40 : 90,
        )
    }
  }
  const assets = { ...FIGHTER_ASSETS.characters, ...(config.assets || {}) }
  const initialRoster = config.roster || ['batman', 'flash']
  if (
    !Array.isArray(initialRoster) ||
    initialRoster.length !== 2 ||
    initialRoster.some((name) => typeof name !== 'string' || !assets[name])
  )
    throw Error('fighter: supply two valid roster IDs and complete assets for custom identities')
  let roster = [...initialRoster]
  if (config.characterSelect !== undefined && typeof config.characterSelect !== 'boolean')
    throw Error('fighter: characterSelect must be boolean')
  const characterSelect = config.characterSelect === true
  const selectableRoster = config.selectableRoster || [...new Set(initialRoster)]
  if (
    characterSelect &&
    (!Array.isArray(selectableRoster) ||
      selectableRoster.length < 1 ||
      selectableRoster.length > 8 ||
      new Set(selectableRoster).size !== selectableRoster.length ||
      selectableRoster.some((id) => typeof id !== 'string' || !assets[id]) ||
      (config.cpuCharacter !== undefined && !selectableRoster.includes(config.cpuCharacter)))
  )
    throw Error('fighter: selection needs 1-8 unique complete character IDs and a listed CPU ID')
  for (const id of new Set(characterSelect ? [...roster, ...selectableRoster] : roster)) {
    const character = assets[id]
    const fail = (detail) => {
      throw Error(`fighter: ${id} ${detail}`)
    }
    const point = (value) => value && Number.isFinite(value.x) && Number.isFinite(value.y)
    for (const [name, frame] of Object.entries(character.frames || {})) {
      if (
        !frame.size ||
        !Number.isInteger(frame.size.w) ||
        !Number.isInteger(frame.size.h) ||
        frame.size.w < 1 ||
        frame.size.h < 1 ||
        !point(frame.anchor)
      )
        fail(`frame ${name} has invalid size or anchor`)
      const plane = (layer, label, requiresPalette = false) => {
        const palette = layer?.palette
        if (
          (requiresPalette || palette !== undefined) &&
          (!Array.isArray(palette) ||
            palette.length < 1 ||
            palette.length > 16 ||
            palette.some((color) => typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)))
        )
          fail(`frame ${name} ${label} has invalid palette`)
        if (
          !Array.isArray(layer?.pixels) ||
          layer.pixels.length !== frame.size.h ||
          layer.pixels.some(
            (row) =>
              typeof row !== 'string' ||
              row.length !== frame.size.w ||
              !/^[.0-9a-f]+$/i.test(row) ||
              [...row].some(
                (pixel) => pixel !== '.' && parseInt(pixel, 16) >= (palette?.length ?? 16),
              ),
          )
        )
          fail(`frame ${name} ${label} has invalid pixels or dimensions`)
      }
      plane(frame, 'base')
      if (frame.layers !== undefined) {
        if (!Array.isArray(frame.layers) || frame.layers.length > 8)
          fail(`frame ${name} has invalid layers`)
        for (const layer of frame.layers) {
          if (!layer || Object.keys(layer).some((key) => key !== 'pixels' && key !== 'palette'))
            fail(
              `frame ${name} layer supports only pixels and palette; registration comes from the shared anchor`,
            )
          plane(layer, 'layer', true)
        }
      }
    }
    for (const name of [
      'idle',
      'walk',
      'jump',
      'crouch',
      'light',
      'airLight',
      'airHeavy',
      'heavy',
      'sweep',
      'special',
      'dash',
      'guard',
      'crouchGuard',
      'hurt',
      'ko',
      'victory',
    ]) {
      if (!assets[id].animations?.[name]?.frames?.length)
        throw Error(`fighter: ${id} is missing animation ${name}`)
    }
    for (const [name, clip] of Object.entries(character.animations)) {
      if (!Array.isArray(clip.frames) || !clip.frames.length || typeof clip.loop !== 'boolean')
        fail(`clip ${name} is invalid`)
      if (moves[name] && clip.frames.length < 3)
        fail(`clip ${name} needs startup, active and recovery frames`)
      for (const step of clip.frames) {
        if (
          !character.frames?.[step.frame] ||
          !Number.isInteger(step.duration) ||
          step.duration < 1 ||
          (step.anchor !== undefined && !point(step.anchor)) ||
          (step.projectileOrigin !== undefined &&
            (!point(step.projectileOrigin) ||
              step.projectileOrigin.x < 0 ||
              step.projectileOrigin.y < 0 ||
              step.projectileOrigin.x >= character.frames[step.frame].size.w ||
              step.projectileOrigin.y >= character.frames[step.frame].size.h))
        )
          fail(`clip ${name} has an invalid frame, duration or anchor`)
        for (const type of ['hitboxes', 'hurtboxes']) {
          if (
            !Array.isArray(step[type]) ||
            step[type].some(
              (b) =>
                !point(b) || !Number.isFinite(b.w) || !Number.isFinite(b.h) || b.w <= 0 || b.h <= 0,
            )
          )
            fail(`clip ${name} has invalid ${type}`)
        }
      }
    }
    const projectile = character.projectile
    if (projectile !== undefined) {
      if (!projectile || typeof projectile !== 'object') fail('has an invalid projectile')
      for (const [field, loop] of [
        ['travel', true],
        ['impact', false],
        ['bind', undefined],
      ]) {
        const name = projectile[field]
        if (field !== 'travel' && name === undefined) continue
        if (
          typeof name !== 'string' ||
          !character.animations[name] ||
          (loop !== undefined && character.animations[name].loop !== loop)
        )
          fail(
            `projectile ${field} needs a valid ${loop === undefined ? '' : loop ? 'looping ' : 'non-looping '}clip`,
          )
      }
      if (
        !Number.isFinite(projectile.speed) ||
        projectile.speed <= 0 ||
        projectile.speed > 8 ||
        !Number.isInteger(projectile.life) ||
        projectile.life < 1 ||
        projectile.life > 180 ||
        !point(projectile.box) ||
        !Number.isFinite(projectile.box.w) ||
        !Number.isFinite(projectile.box.h) ||
        projectile.box.w <= 0 ||
        projectile.box.h <= 0 ||
        projectile.box.w > 64 ||
        projectile.box.h > 64 ||
        Math.abs(projectile.box.x) > 64 ||
        Math.abs(projectile.box.y) > 64
      )
        fail('has invalid projectile speed, life or box')
      if (
        (projectile.bind !== undefined &&
          (!Number.isInteger(projectile.bindTicks) ||
            projectile.bindTicks < 1 ||
            projectile.bindTicks > 90)) ||
        (projectile.bind === undefined && projectile.bindTicks !== undefined)
      )
        fail('projectile bind needs a clip and 1-90 bindTicks')
      if (!character.animations.special.frames[1].projectileOrigin)
        fail('projectile needs an active special frame projectileOrigin')
    }
  }
  let fighters,
    phase,
    phaseAge,
    round,
    ticks,
    timeLeft,
    freeze,
    effects,
    projectiles,
    lastWinner,
    scores,
    terminal,
    roundResult,
    selection,
    blockedActions
  const nameFor = (id, index) =>
    String(config.names?.[index] || config.selectionNames?.[id] || id)
      .toUpperCase()
      .slice(0, 10)
  const selectionName = (id) =>
    String(config.selectionNames?.[id] || id)
      .toUpperCase()
      .slice(0, 10)
  const fresh = (id, index) => ({
    id,
    index,
    name: nameFor(id, index),
    x: index ? 187 : 69,
    y: floor,
    vx: 0,
    vy: 0,
    face: index ? -1 : 1,
    hp: 100,
    meter: 100,
    wins: 0,
    grounded: true,
    crouch: false,
    guard: false,
    stun: 0,
    blockStun: 0,
    bind: null,
    bindImmunity: 0,
    action: null,
    age: 0,
    attackHit: false,
    spawned: false,
    animation: 'idle',
    animationAge: 0,
    inputBuffer: null,
    bufferLife: 0,
    combo: 0,
    comboAge: 0,
    comboWindow: 0,
    aiWait: 35 + index * 15,
    aiPlan: 'approach',
    aiAge: 0,
    aiPressed: false,
    aiHistory: [],
    aiObservation: null,
    afterimages: [],
  })
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  const box = (f, m) => ({
    x: f.face === 1 ? f.x + m.x : f.x - m.x - m.w,
    y: f.y + m.y,
    w: m.w,
    h: m.h,
  })
  const hurtboxes = (f) => animationFrame(f).metadata.hurtboxes.map((b) => box(f, b))
  const attackBoxes = (f) => animationFrame(f).metadata.hitboxes.map((b) => box(f, b))
  const contact = (attacks, hurts) => attacks.some((a) => hurts.some((b) => overlap(a, b)))
  const setAnimation = (f, name) => {
    if (f.animation !== name) {
      f.animation = name
      f.animationAge = 0
    }
  }
  const addEffect = (x, y, type, face = 1) => effects.push({ x, y, type, face, age: 0 })
  const sound = (api, name) => {
    if (config.sound !== false) api.sfx(name)
  }
  function resetRound() {
    const wins = fighters?.map((f) => f.wins) || [0, 0]
    fighters = roster.map(fresh)
    fighters.forEach((f, i) => {
      f.wins = wins[i]
    })
    phase = 'intro'
    phaseAge = 0
    timeLeft = roundSeconds * 60
    freeze = 0
    effects = []
    projectiles = []
    roundResult = ''
  }
  function init(api) {
    roster = [...initialRoster]
    fighters = null
    round = 1
    ticks = 0
    scores = [0, 0]
    lastWinner = null
    terminal = false
    blockedActions = [new Set(), new Set()]
    selection = null
    resetRound()
    if (characterSelect) {
      selection = {
        cursors: roster.map(
          (id) => Math.max(0, selectableRoster.indexOf(id)) % selectableRoster.length,
        ),
        locked: [false, api.players !== 2],
        humans: api.players === 2 ? 2 : 1,
        previous: [0, 1].map(
          (i) => new Set(['left', 'right', 'a', 'b'].filter((key) => api.btn(key, i))),
        ),
      }
      syncSelection()
      phase = 'select'
    }
    api.score(0, 0)
    if (api.players === 2) api.score(0, 1)
  }
  function syncSelection() {
    const ids = selection.cursors.map((cursor) => selectableRoster[cursor])
    if (selection.humans === 1)
      ids[1] = config.cpuCharacter ?? selectableRoster.find((id) => id !== ids[0]) ?? ids[0]
    roster = ids
    fighters = roster.map(fresh)
  }
  function updateSelection(api) {
    const edges = selection.previous.map((previous, i) => {
      const now = new Set(['left', 'right', 'a', 'b'].filter((key) => api.btn(key, i)))
      selection.previous[i] = now
      return (key) => now.has(key) && !previous.has(key)
    })
    let cancelled = false
    for (let i = 0; i < selection.humans; i++) {
      if (edges[i]('b')) {
        selection.locked[i] = false
        phase = 'select'
        phaseAge = 0
        cancelled = true
        sound(api, 'select')
        continue
      }
      if (phase === 'versus' || selection.locked[i]) continue
      const direction = Number(edges[i]('right')) - Number(edges[i]('left'))
      if (direction) {
        selection.cursors[i] =
          (selection.cursors[i] + direction + selectableRoster.length) % selectableRoster.length
        sound(api, 'select')
      }
      if (edges[i]('a')) {
        selection.locked[i] = true
        sound(api, 'powerup')
      }
    }
    syncSelection()
    if (phase === 'select' && !cancelled && selection.locked.every(Boolean)) {
      phase = 'versus'
      phaseAge = 0
    } else if (phase === 'versus' && phaseAge >= 60) {
      // Selection confirmation must never become an attack, even if A/B remain
      // held through the versus card and round intro. Each player releases theirs.
      blockedActions = [0, 1].map((i) => new Set(['a', 'b'].filter((key) => api.btn(key, i))))
      resetRound()
    }
  }
  function beginAction(f, name) {
    if (f.bind || f.stun || f.blockStun || f.hp <= 0 || (!f.grounded && !name.startsWith('air')))
      return false
    if (
      f.action &&
      !(
        f.action === 'light' &&
        f.comboWindow > 0 &&
        (name === 'heavy' || name === 'special' || name === 'dash')
      )
    )
      return false
    if ((name === 'special' || name === 'dash') && f.meter < 60) return false
    if (name === 'special' || name === 'dash') f.meter -= 60
    f.action = name
    f.age = 0
    f.attackHit = false
    f.spawned = false
    f.guard = false
    f.comboWindow = 0
    f.crouch = name === 'sweep'
    setAnimation(f, name)
    f.animationAge = 0
    return true
  }
  function actionAnimationAge(f) {
    const m = moves[f.action],
      frames = assets[f.id].animations[f.action].frames
    const wind = frames[0].duration,
      active = frames[1].duration,
      recovery = frames.slice(2).reduce((sum, x) => sum + x.duration, 0)
    // Timing overrides change the attack animation and collision window together.
    if (f.age < m.startup) return Math.floor((f.age * wind) / m.startup)
    if (f.age < m.startup + m.active)
      return wind + Math.floor(((f.age - m.startup) * active) / m.active)
    return wind + active + Math.floor(((f.age - m.startup - m.active) * recovery) / m.recovery)
  }
  function control(api, f, opponent) {
    if (f.index === 0 || api.players === 2) {
      const i = f.index
      return {
        left: api.btn('left', i),
        right: api.btn('right', i),
        down: api.btn('down', i),
        jump: api.btnp('up', i),
        light: !blockedActions[i].has('a') && api.btnp('a', i),
        heavy: !blockedActions[i].has('b') && api.btnp('b', i),
      }
    }
    const distance = Math.abs(f.x - opponent.x),
      toward = opponent.x > f.x ? 1 : -1
    // The CPU sees delayed public poses, never the human's button state. This
    // buffer advances only on simulation steps, so hitstop cannot buy a reaction.
    const reactionTicks = Math.round(16 - difficulty * 6)
    f.aiHistory.push({
      tick: ticks,
      x: opponent.x,
      crouch: opponent.crouch,
      guard: opponent.guard,
      action: opponent.action,
      grounded: opponent.grounded,
    })
    if (f.aiHistory.length > reactionTicks + 1) f.aiHistory.shift()
    f.aiAge++
    if (
      --f.aiWait <= 0 &&
      !f.action &&
      !f.stun &&
      !f.blockStun &&
      !f.bind &&
      !(!f.grounded && f.aiPlan === 'jump' && f.aiAge <= 20)
    ) {
      const seen = f.aiHistory[0]
      f.aiObservation = { ...seen, decidedAt: ticks, reactionTicks }
      const r = api.rnd()
      if (distance > 70) f.aiPlan = 'approach'
      else if (seen.guard && !seen.crouch)
        // A standing guard must eventually face a low; do not reward one held
        // direction forever. The sweep still uses its normal visible startup.
        f.aiPlan = r < 0.65 ? 'sweep' : r < 0.8 ? 'jump' : r < 0.9 ? 'heavy' : 'guardLow'
      else if (seen.crouch || seen.action === 'sweep')
        f.aiPlan =
          r < 0.34
            ? 'guardLow'
            : r < 0.56
              ? 'jump'
              : r < 0.8
                ? 'heavy'
                : r < 0.88
                  ? 'retreat'
                  : 'sweep'
      else if (seen.action === 'light')
        // Repeated high jabs can be ducked; a delayed low reply has the same
        // vulnerable startup/recovery as the human's sweep, never armor.
        f.aiPlan = r < 0.4 ? 'guardLow' : r < 0.85 ? 'sweep' : 'jump'
      else
        f.aiPlan =
          r < 0.12
            ? 'jump'
            : r < 0.27
              ? 'guardHigh'
              : r < 0.35
                ? 'retreat'
                : r < 0.57
                  ? 'light'
                  : r < 0.77
                    ? 'heavy'
                    : r < 0.9
                      ? 'sweep'
                      : f.meter >= 60
                        ? 'special'
                        : 'light'
      f.aiWait = Math.round(20 + (1 - difficulty) * 25 + api.rnd(17))
      f.aiAge = 0
      f.aiPressed = false
    }
    const retreat = f.aiPlan === 'retreat' || f.aiPlan === 'guardHigh' || f.aiPlan === 'guardLow'
    let direction = distance > 42 && !retreat ? toward : retreat && distance < 75 ? -toward : 0
    if (f.action || f.stun) direction = 0
    // Keep an attack intention while approaching its reach. Previously a
    // crouching sweep/special selected just out of reach locked the CPU in place
    // and its sole button edge was lost on the decision tick.
    const light = !f.aiPressed && (f.aiPlan === 'light' || f.aiPlan === 'sweep') && distance < 47
    const heavy =
      !f.aiPressed &&
      (f.aiPlan === 'heavy' || f.aiPlan === 'special') &&
      distance < (f.aiPlan === 'special' ? 145 : 53)
    if (light || heavy) f.aiPressed = true
    return {
      left: direction < 0,
      right: direction > 0,
      down:
        f.aiPlan === 'guardLow' ||
        (f.aiPlan === 'sweep' && (light || !!f.action)) ||
        (f.aiPlan === 'special' && (heavy || !!f.action)),
      jump: f.aiPlan === 'jump' && f.aiAge === 0,
      light,
      heavy: heavy || (f.aiPlan === 'jump' && f.aiAge === 20 && !f.grounded && distance < 65),
    }
  }
  function updateFighter(api, f, o) {
    const c = control(api, f, o)
    if (f.hp <= 0) {
      setAnimation(f, 'ko')
      f.animationAge++
      return
    }
    f.animationAge++
    f.bindImmunity = Math.max(0, f.bindImmunity - 1)
    f.comboAge = Math.max(0, f.comboAge - 1)
    f.comboWindow = Math.max(0, f.comboWindow - 1)
    if (f.comboAge === 0) f.combo = 0
    if (!f.action) f.face = o.x >= f.x ? 1 : -1
    if (c.light || c.heavy) {
      f.inputBuffer = !f.grounded
        ? c.light
          ? 'airLight'
          : 'airHeavy'
        : c.light
          ? c.down
            ? 'sweep'
            : 'light'
          : c.down
            ? f.id === 'flash' || config.specials?.[f.index] === 'dash'
              ? 'dash'
              : 'special'
            : 'heavy'
      f.bufferLife = 7
    }
    if (f.bufferLife > 0) {
      if (beginAction(f, f.inputBuffer)) f.bufferLife = 0
      else f.bufferLife--
    }
    if (f.bind) {
      f.bind.age++
      f.bind.remaining--
      f.stun = Math.max(0, f.stun - 1)
      f.blockStun = 0
      f.vx = 0
      f.inputBuffer = null
      f.bufferLife = 0
      setAnimation(f, 'hurt')
      if (f.bind.remaining <= 0) f.bind = null
    } else if (f.stun > 0 || f.blockStun > 0) {
      f.stun = Math.max(0, f.stun - 1)
      f.blockStun = Math.max(0, f.blockStun - 1)
      f.x += f.vx
      f.vx *= 0.8
      setAnimation(f, f.stun > 0 ? 'hurt' : f.crouch ? 'crouchGuard' : 'guard')
    } else if (f.action) {
      const m = moves[f.action]
      f.age++
      f.animationAge = actionAnimationAge(f)
      if (f.action === 'dash' && f.age >= m.startup && f.age < m.startup + m.active) {
        f.x += f.face * 3.5
        if (f.age % 3 === 0)
          f.afterimages.push({ x: f.x - f.face * 7, y: f.y, face: f.face, age: 0 })
      }
      if (m.projectile && f.age >= m.startup && !f.spawned) {
        f.spawned = true
        const definition = assets[f.id].projectile
        const frame = animationFrame(f)
        const anchor = frame.metadata.anchor ?? frame.anchor
        const socket = frame.metadata.projectileOrigin
        projectiles.push({
          x: f.x + f.face * (socket ? socket.x - anchor.x : 22),
          y: f.y + (socket ? socket.y - anchor.y : -43),
          vx: f.face * (definition?.speed ?? 3.6),
          owner: f.index,
          age: 0,
        })
        sound(api, 'shoot')
      }
      if (f.age >= m.startup + m.active + m.recovery) {
        f.action = null
        f.age = 0
        f.crouch = false
        setAnimation(f, 'idle')
      }
    } else {
      const move = (c.right ? 1 : 0) - (c.left ? 1 : 0)
      f.crouch = f.grounded && c.down
      f.guard = f.grounded && move === -f.face
      if (c.jump && f.grounded) {
        f.vy = -4.85
        f.vx = move * 1.45
        f.grounded = false
        f.crouch = false
        f.guard = false
        sound(api, 'jump')
        addEffect(f.x, floor, 'dust')
      }
      if (f.grounded) {
        f.x += move * (f.guard ? 0.82 : f.id === 'flash' ? 1.6 : 1.35) * (f.crouch ? 0 : 1)
        setAnimation(
          f,
          f.crouch
            ? f.guard
              ? 'crouchGuard'
              : 'crouch'
            : move
              ? f.guard
                ? 'guard'
                : 'walk'
              : 'idle',
        )
        if (move && !f.crouch && ticks % 18 === 0) addEffect(f.x, floor, 'dust')
      } else setAnimation(f, 'jump')
    }
    if (!f.grounded) {
      f.x += f.vx
      f.vy += 0.25
      f.y += f.vy
      if (f.y >= floor) {
        f.y = floor
        f.vy = 0
        f.vx = 0
        f.grounded = true
        addEffect(f.x, floor, 'dust')
      }
    }
    f.x = clamp(f.x, 22, 234)
    f.meter = clamp(f.meter + 0.027, 0, 100)
    for (const image of f.afterimages) image.age++
    f.afterimages = f.afterimages.filter((image) => image.age < 12)
  }
  function hit(api, attacker, defender, m, projectile = false, direction = attacker.face) {
    const facesAttacker = defender.face === -direction
    const blocked =
      defender.guard &&
      defender.grounded &&
      !defender.stun &&
      !defender.action &&
      facesAttacker &&
      (m.level === 'low' ? defender.crouch : m.level === 'overhead' ? !defender.crouch : true)
    if (blocked) {
      defender.hp = Math.max(1, defender.hp - (projectile ? 1 : 0))
      defender.blockStun = projectile ? 14 : 10
      defender.vx = direction * 1.5
      if (!projectile) attacker.vx = -direction * 0.6
      defender.meter = clamp(defender.meter + 5, 0, 100)
      freeze = 3
      addEffect(defender.x - direction * 7, defender.y - 40, 'block', direction)
      sound(api, 'select')
    } else {
      // A follow-up breaks the trap; immunity prevents repeated web shots from
      // extending a control lock indefinitely, even after an early break.
      defender.bind = null
      defender.hp = Math.max(0, defender.hp - m.damage)
      defender.stun = m.stun
      defender.blockStun = 0
      defender.action = null
      defender.comboWindow = 0
      defender.vx = direction * m.push
      setAnimation(defender, 'hurt')
      defender.animationAge = 0
      attacker.combo++
      attacker.comboAge = 60
      attacker.comboWindow = 10
      attacker.meter = clamp(attacker.meter + 12, 0, 100)
      defender.meter = clamp(defender.meter + 6, 0, 100)
      scores[attacker.index] += m.damage * 10 + (attacker.combo > 1 ? 50 : 0)
      if (api.players === 2 || attacker.index === 0)
        api.addScore(m.damage * 10 + (attacker.combo > 1 ? 50 : 0), attacker.index)
      freeze = m.damage >= 14 ? 7 : 4
      addEffect(
        defender.x - direction * 7,
        defender.y + (m.level === 'low' ? -12 : -40),
        'hit',
        direction,
      )
      sound(api, 'hit')
      if (m.damage >= 14) api.shake(3)
    }
    return blocked
  }
  function finishRound(api, winner) {
    phase = 'roundEnd'
    phaseAge = 0
    lastWinner = winner
    projectiles = []
    if (winner !== null) {
      fighters[winner].wins++
      roundResult = `${fighters[winner].name} WINS`
      scores[winner] += 500
      if (api.players === 2 || winner === 0) api.addScore(500, winner)
      sound(api, 'powerup')
    } else {
      roundResult = 'DRAW'
      sound(api, 'select')
    }
    fighters.forEach((f, i) => {
      f.action = null
      f.guard = false
      f.bind = null
      setAnimation(f, i === winner ? 'victory' : f.hp === 0 ? 'ko' : 'idle')
      f.animationAge = 0
    })
  }
  function separateFighters() {
    const [a, b] = fighters
    if (a.grounded && b.grounded && Math.abs(a.x - b.x) < 22) {
      const left = a.x <= b.x ? a : b,
        right = left === a ? b : a,
        mid = (left.x + right.x) / 2
      left.x = clamp(mid - 11, 22, 212)
      right.x = left.x + 22
    }
  }
  function update(api) {
    if (terminal) return
    ticks++
    phaseAge++
    if (phase === 'select' || phase === 'versus') {
      updateSelection(api)
      return
    }
    blockedActions.forEach((blocked, i) => {
      for (const key of blocked) if (!api.btn(key, i)) blocked.delete(key)
    })
    effects.forEach((e) => {
      e.age++
    })
    effects = effects.filter((e) => e.age < (e.life ?? 22))
    if (phase === 'intro') {
      // The round card is a harmless warm-up, not another input lock after START.
      fighters.forEach((f, i) => {
        if (i === 0 || api.players === 2) {
          const meter = f.meter
          updateFighter(api, f, fighters[1 - i])
          f.meter = meter
        } else f.animationAge++
      })
      separateFighters()
      for (const p of projectiles) {
        p.x += p.vx
        p.age++
      }
      projectiles = projectiles.filter(
        (p) =>
          p.x > -20 && p.x < 276 && p.age < (assets[fighters[p.owner].id].projectile?.life ?? 90),
      )
      if (phaseAge === 48) sound(api, 'select')
      if (phaseAge >= 78) {
        phase = 'fight'
        phaseAge = 0
        projectiles = []
      }
      return
    }
    if (phase === 'roundEnd') {
      fighters.forEach((f) => {
        f.animationAge++
        // A mid-air knockout or timeout must land before the result screen.
        // Input and damage stay locked while the existing trajectory settles.
        if (!f.grounded) {
          f.x = clamp(f.x + f.vx, 22, 234)
          f.vy += 0.25
          f.y += f.vy
          if (f.y >= floor) {
            f.y = floor
            f.vx = 0
            f.vy = 0
            f.grounded = true
          }
        }
      })
      if (phaseAge >= 120) {
        const winner = fighters.findIndex((f) => f.wins >= roundsToWin)
        if (winner >= 0) {
          terminal = true
          phase = 'complete'
          if (api.players === 2) api.win(winner)
          else if (winner === 0) api.win()
          else api.gameOver()
        } else {
          round++
          resetRound()
        }
      }
      return
    }
    if (freeze > 0) {
      // Preserve a human's follow-up pressed during hitstop; the simulation
      // consumes this buffer when motion resumes rather than dropping the edge.
      for (const f of fighters)
        if (f.index === 0 || api.players === 2) {
          const a = !blockedActions[f.index].has('a') && api.btnp('a', f.index),
            b = !blockedActions[f.index].has('b') && api.btnp('b', f.index),
            down = api.btn('down', f.index)
          if (a || b) {
            f.inputBuffer = !f.grounded
              ? a
                ? 'airLight'
                : 'airHeavy'
              : a
                ? down
                  ? 'sweep'
                  : 'light'
                : down
                  ? f.id === 'flash' || config.specials?.[f.index] === 'dash'
                    ? 'dash'
                    : 'special'
                  : 'heavy'
            f.bufferLife = 7
          }
        }
      freeze--
      return
    }
    timeLeft--
    fighters.forEach((f, i) => {
      updateFighter(api, f, fighters[1 - i])
    })
    // Push boxes only separate grounded bodies. Jumps can cross up and switch sides.
    separateFighters()
    const [a, b] = fighters
    const hits = []
    for (const f of fighters)
      if (f.action && !f.attackHit) {
        const m = moves[f.action],
          other = fighters[1 - f.index]
        if (
          !m.projectile &&
          f.age >= m.startup &&
          f.age < m.startup + m.active &&
          contact(attackBoxes(f), hurtboxes(other))
        ) {
          f.attackHit = true
          hits.push([f, other, m, false])
        }
      }
    for (const p of projectiles) {
      p.x += p.vx
      p.age++
      const attacker = fighters[p.owner]
      const definition = assets[attacker.id].projectile
      const shape = definition?.box ?? { x: -6, y: -3, w: 12, h: 6 }
      const direction = Math.sign(p.vx)
      if (contact([box({ ...p, face: direction }, shape)], hurtboxes(fighters[1 - p.owner]))) {
        hits.push([attacker, fighters[1 - p.owner], moves.special, true, direction, p])
        p.dead = true
      }
    }
    projectiles = projectiles.filter(
      (p) =>
        !p.dead &&
        p.x > -12 &&
        p.x < 268 &&
        p.age < (assets[fighters[p.owner].id].projectile?.life ?? 100),
    )
    // Resolve both previously established hits, permitting honest simultaneous trades.
    for (const [attacker, defender, move, isProjectile, direction, p] of hits) {
      const blocked = hit(api, attacker, defender, move, isProjectile, direction)
      const definition = isProjectile && assets[attacker.id].projectile
      if (definition?.impact)
        effects.push({
          type: 'sprite',
          assetId: attacker.id,
          animation: definition.impact,
          x: p.x,
          y: p.y,
          face: direction,
          age: 0,
          life: assets[attacker.id].animations[definition.impact].frames.reduce(
            (n, f) => n + f.duration,
            0,
          ),
        })
      if (
        definition?.bind &&
        !blocked &&
        defender.hp > 0 &&
        defender.grounded &&
        !defender.bindImmunity
      ) {
        defender.bind = {
          owner: attacker.index,
          assetId: attacker.id,
          animation: definition.bind,
          age: 0,
          remaining: definition.bindTicks,
        }
        defender.bindImmunity = 120
        defender.stun = Math.max(defender.stun, definition.bindTicks)
        defender.vx = 0
        defender.guard = false
        defender.inputBuffer = null
        defender.bufferLife = 0
      }
    }
    if (a.hp === 0 || b.hp === 0) finishRound(api, a.hp === b.hp ? null : a.hp > b.hp ? 0 : 1)
    else if (timeLeft <= 0) finishRound(api, a.hp === b.hp ? null : a.hp > b.hp ? 0 : 1)
  }
  function animationFrame(f, animation = f.animation, age = f.animationAge) {
    const set = assets[f.id],
      clip = set.animations[animation]
    const total = clip.frames.reduce((sum, fr) => sum + fr.duration, 0)
    let t = clip.loop ? age % total : Math.min(age, total - 1),
      selected = clip.frames[0]
    for (const frame of clip.frames) {
      selected = frame
      if (t < frame.duration) break
      t -= frame.duration
    }
    return { ...set.frames[selected.frame], metadata: selected }
  }
  function drawSprite(api, f, animation, age, x = f.x, y = f.y, face = f.face, tailLimit = null) {
    const frame = animationFrame(f, animation, age),
      anchor = frame.metadata.anchor ?? frame.anchor,
      origin = Math.round(x - (face === 1 ? anchor.x : frame.size.w - 1 - anchor.x)),
      // Wide downed poses remain visible at the stage edge after combat ends.
      left =
        (animation ?? f.animation) === 'ko'
          ? clamp(origin, 0, Math.max(0, 256 - frame.size.w))
          : origin,
      top = Math.round(y - anchor.y)
    // A long trail grows out of its emitter, rather than appearing through the
    // shooter's body on the first tick. Mask only the not-yet-traveled tail.
    const cut = tailLimit === null ? 0 : clamp(Math.floor(anchor.x - tailLimit), 0, frame.size.w)
    for (const plane of [frame, ...(frame.layers || [])]) {
      const pixels = cut
        ? plane.pixels.map((row) => '.'.repeat(cut) + row.slice(cut))
        : plane.pixels
      api.spr(pixels, left, top, face === -1, false, plane.palette)
    }
  }
  function drawStage(api) {
    const c = config.stageColors || {}
    api.cls(c.sky ?? 1)
    api.circfill(204, 73, 15, 6)
    api.circfill(210, 69, 13, c.sky ?? 1)
    const stars = [
      [15, 61],
      [44, 75],
      [101, 62],
      [160, 81],
      [236, 59],
      [121, 86],
      [176, 61],
      [30, 97],
    ]
    for (const [x, y] of stars) api.pset(x, y, 13)
    // Original stepped skyline, lit window clusters, water towers and antennae.
    for (let i = 0; i < 15; i++) {
      const x = i * 19 - 6,
        h = 23 + ((i * 17) % 47)
      api.rectfill(x, 149 - h, 17, h, 0)
      if (i % 3 === 0) {
        api.rectfill(x + 6, 142 - h, 5, 7, 0)
        api.line(x + 8, 136 - h, x + 8, 149 - h, 5)
      }
      for (let y = 154 - h; y < 145; y += 8)
        for (let xx = x + 3; xx < x + 15; xx += 6)
          if ((y + xx + i) % 5 !== 0) api.rectfill(xx, y, 2, 3, (xx + y) % 3 ? 5 : 9)
    }
    api.rectfill(0, 144, 256, 26, 2)
    api.line(0, 144, 255, 144, 13)
    api.line(0, 147, 255, 147, 5)
    for (let x = 0; x < 256; x += 24) {
      api.line(x, 148, x, 169, 1)
      api.line(x + 1, 148, x + 1, 168, 4)
    }
    api.line(0, 168, 255, 168, 0)
    // Perspective floor: a continuous clear footing, separate from scenery.
    api.rectfill(0, 170, 256, 54, 5)
    api.line(0, 171, 255, 171, 6)
    api.rectfill(0, 174, 256, 10, 1)
    api.line(0, 182, 255, 182, 13)
    api.rectfill(0, 185, 256, 39, 1)
    for (let y = 188; y < 224; y += 8) {
      api.line(0, y, 255, y, 5)
      api.line(0, y + 1, 255, y + 1, 0)
    }
    for (let x = -160; x < 420; x += 46) api.line(128 + (x - 128) * 0.35, 185, x, 224, 0)
    api.rectfill(18, 198, 53, 13, 0)
    for (let i = 0; i < 8; i++) api.line(22 + i * 6, 200, 21 + i * 6, 208, 13)
    api.rectfill(211, 134, 24, 9, 1)
    api.rect(211, 134, 24, 9, 13)
    api.line(223, 143, 223, 170, 0)
    api.rectfill(4, 133, 12, 36, 1)
    api.line(4, 132, 16, 132, 6)
    api.line(8, 130, 8, 116, 5)
    api.line(8, 116, 21, 116, 5)
  }
  function drawHUD(api) {
    api.rectfill(0, 12, 256, 39, 0)
    fighters.forEach((f, i) => {
      const x = i ? 145 : 12,
        color = i ? 8 : 12
      api.text(f.name.slice(0, 10), x, 14, 7)
      api.rect(x - 1, 25, 100, 9, 6)
      api.rectfill(x, 26, 98, 7, 2)
      const hp = Math.ceil(f.hp * 0.98)
      api.rectfill(i ? x + 98 - hp : x, 26, hp, 7, f.hp < 26 ? 8 : 10)
      api.line(i ? x + 98 - hp : x, 26, i ? x + 97 : x + hp - 1, 26, 7)
      api.rectfill(x, 36, 98, 3, 5)
      api.rectfill(x, 36, Math.round(f.meter * 0.98), 3, f.meter >= 60 ? color : 13)
      for (let j = 0; j < roundsToWin; j++) {
        const xx = x + j * 8
        api.rectfill(xx, 43, 5, 4, j < f.wins ? 10 : 5)
      }
      if (f.combo > 1 && f.comboAge > 0) api.text(`${f.combo} HITS`, i ? 184 : 12, 56, color)
    })
    api.text(String(Math.max(0, Math.ceil(timeLeft / 60))).padStart(2, '0'), 120, 26, 7)
    api.line(126, 41, 131, 41, 13)
  }
  const menuPixels = new WeakMap()
  function drawMenuPose(api, id, cx, bottom, face, maxW, maxH, portrait = false) {
    const frame = animationFrame({ id, animation: 'idle', animationAge: ticks })
    const sourceW = frame.size.w,
      sourceH = frame.size.h,
      cropW = portrait ? Math.min(28, sourceW) : sourceW,
      cropH = portrait ? Math.min(30, sourceH) : sourceH,
      cropX = portrait ? clamp(Math.round(frame.anchor.x - cropW / 2), 0, sourceW - cropW) : 0,
      scale = Math.min(1, maxW / cropW, maxH / cropH),
      width = Math.max(1, Math.floor(cropW * scale)),
      height = Math.max(1, Math.floor(cropH * scale))
    for (const plane of [frame, ...(frame.layers || [])]) {
      let cached = menuPixels.get(plane.pixels)
      if (!cached) {
        cached = new Map()
        menuPixels.set(plane.pixels, cached)
      }
      const key = `${cropX}/${cropW}/${cropH}/${width}/${height}`
      let pixels = cached.get(key)
      if (!pixels) {
        pixels = Array.from({ length: height }, (_, y) =>
          Array.from(
            { length: width },
            (_, x) =>
              plane.pixels[Math.floor((y * cropH) / height)][
                cropX + Math.floor((x * cropW) / width)
              ],
          ).join(''),
        )
        cached.set(key, pixels)
      }
      api.spr(
        pixels,
        Math.round(cx - width / 2),
        bottom - height,
        face === -1,
        false,
        plane.palette,
      )
    }
  }
  function drawSelection(api) {
    api.cls(0)
    api.textCenter(phase === 'versus' ? 'VERSUS' : 'SELECT YOUR FIGHTER', 20, 10)
    api.line(24, 34, 231, 34, 12)
    for (let i = 0; i < 2; i++) {
      const cx = i ? 188 : 68,
        color = i ? 10 : 12,
        cpu = i === 1 && selection.humans === 1,
        label = cpu ? 'CPU' : `P${i + 1}`,
        name = selectionName(roster[i])
      api.text(label, cx - label.length * 4, 44, color)
      drawMenuPose(api, roster[i], cx, 120, i ? -1 : 1, 82, 64)
      api.line(cx - 35, 121, cx + 35, 121, color)
      api.text(name, cx - name.length * 4, 128, 7)
      const status = selection.locked[i] ? 'READY' : 'CHOOSE'
      api.text(status, cx - status.length * 4, 139, color)
    }
    if (phase === 'versus') {
      api.text('VS', 120, 84, 10)
      api.textCenter('GET READY', 174, 7)
      api.textCenter('B: CHANGE PICK', 202, 6)
      return
    }
    const slot = Math.min(68, Math.floor(208 / selectableRoster.length)),
      width = slot - 4,
      start = Math.round((256 - slot * selectableRoster.length) / 2)
    for (let index = 0; index < selectableRoster.length; index++) {
      const id = selectableRoster[index],
        x = start + index * slot + 2,
        name = selectionName(id).slice(0, Math.floor((width - 4) / 8)),
        p1 = selection.cursors[0] === index,
        p2 = selection.humans === 2 && selection.cursors[1] === index
      api.rect(x, 154, width, 37, 5)
      drawMenuPose(api, id, x + width / 2, 179, 1, width - 6, 23, true)
      api.text(name, Math.round(x + width / 2 - name.length * 4), 181, 7)
      if (p1) {
        api.rect(x, 154, width, 37, 12)
        api.text('1', x + 2, 156, 12)
      }
      if (p2) {
        api.rect(x + 1, 155, width - 2, 35, 10)
        api.text('2', x + width - 10, 156, 10)
      }
    }
    api.textCenter('LEFT/RIGHT A:LOCK B:UNLOCK', 202, 7)
  }
  function draw(api) {
    if (phase === 'select' || phase === 'versus') {
      drawSelection(api)
      return
    }
    drawStage(api)
    for (const f of fighters) {
      api.rectfill(f.x - 13, floor, 27, 3, 0)
      api.rectfill(f.x - 9, floor + 3, 19, 1, 0)
    }
    for (const f of fighters)
      for (const ghost of f.afterimages) {
        for (let i = 0; i < 4; i++)
          api.line(
            ghost.x - f.face * (10 + i * 3),
            ghost.y - 16 - i * 10,
            ghost.x + f.face * 4,
            ghost.y - 16 - i * 10,
            ghost.age < 5 ? 9 : 2,
          )
      }
    const sorted = [...fighters].sort((a, b) => a.y - b.y)
    for (const f of sorted) drawSprite(api, f)
    for (const f of sorted)
      if (f.bind)
        drawSprite(
          api,
          { id: f.bind.assetId, x: f.x, y: f.y, face: f.face },
          f.bind.animation,
          f.bind.age,
        )
    // Player marks remain blue/red without recolouring recognizable costumes.
    for (const f of fighters) {
      api.line(f.x - 6, floor + 5, f.x + 6, floor + 5, f.index === 0 ? 12 : 8)
      api.pset(f.x, floor + 6, f.index === 0 ? 12 : 8)
      if (roster[0] === roster[1])
        api.text(`P${f.index + 1}`, clamp(f.x - 8, 20, 220), floor + 11, f.index === 0 ? 12 : 10)
    }
    for (const p of projectiles) {
      const id = fighters[p.owner].id
      const definition = assets[id].projectile
      if (definition) {
        drawSprite(
          api,
          { id, x: p.x, y: p.y, face: Math.sign(p.vx) },
          definition.travel,
          p.age,
          p.x,
          p.y,
          Math.sign(p.vx),
          Math.abs(p.vx) * p.age + Math.max(0, -definition.box.x),
        )
        continue
      }
      const alt = p.age % 6 < 3 ? 1 : -1
      api.line(p.x - 7, p.y - alt * 3, p.x, p.y + alt * 2, 13)
      api.line(p.x, p.y + alt * 2, p.x + 7, p.y - alt * 3, 6)
      api.pset(p.x, p.y, 7)
      api.line(p.x - Math.sign(p.vx) * 15, p.y, p.x - Math.sign(p.vx) * 9, p.y, 5)
    }
    for (const e of effects) {
      if (e.type === 'sprite') {
        drawSprite(api, { id: e.assetId, x: e.x, y: e.y, face: e.face }, e.animation, e.age)
      } else if (e.type === 'dust') {
        const n = e.age * 0.3
        api.line(e.x - 5 - n, e.y - 1, e.x - 1 - n, e.y - 1 - e.age * 0.1, 6)
        api.line(e.x + 2 + n, e.y - 1, e.x + 6 + n, e.y - 1, 13)
      } else {
        const r = 3 + e.age * 0.7,
          color = e.type === 'block' ? 12 : e.age < 4 ? 7 : 10
        if (e.age < 12) {
          api.line(e.x - r, e.y, e.x + r, e.y, color)
          api.line(e.x, e.y - r, e.x, e.y + r, color)
          api.line(
            e.x - r * 0.7,
            e.y - r * 0.7,
            e.x + r * 0.7,
            e.y + r * 0.7,
            e.type === 'block' ? 7 : 9,
          )
          api.line(e.x - r * 0.7, e.y + r * 0.7, e.x + r * 0.7, e.y - r * 0.7, color)
        }
      }
    }
    drawHUD(api)
    if (phase === 'intro') {
      const text = phaseAge < 48 ? `ROUND ${round}` : 'FIGHT'
      api.rectfill(68, 77, 120, 18, 0)
      api.textCenter(text, 82, phaseAge < 48 ? 7 : 10)
    } else if (phase === 'roundEnd') {
      api.rectfill(34, 76, 188, 25, 0)
      api.textCenter(fighters.some((f) => f.hp === 0) ? 'K.O.' : 'TIME', 78, 10)
      api.textCenter(roundResult, 91, 7)
    }
    if (config.drawStageOverlay) config.drawStageOverlay(api, { phase, round, ticks })
    if (config.debugHitboxes) {
      for (const f of fighters) {
        for (const h of hurtboxes(f)) api.rect(h.x, h.y, h.w, h.h, 11)
        if (f.action) {
          const m = moves[f.action]
          if (!m.projectile && f.age >= m.startup && f.age < m.startup + m.active)
            for (const b of attackBoxes(f)) api.rect(b.x, b.y, b.w, b.h, 8)
        }
      }
    }
  }
  const inspect = () => ({
    phase,
    round,
    timeLeft,
    freeze,
    terminal,
    lastWinner,
    scores: [...scores],
    roundsToWin,
    ...(selection
      ? {
          selection: {
            available: [...selectableRoster],
            cursors: [...selection.cursors],
            locked: [...selection.locked],
            selected: [...roster],
            humans: selection.humans,
            versusTicks: phase === 'versus' ? phaseAge : null,
          },
        }
      : {}),
    fighters: fighters.map((f) => ({
      id: f.id,
      x: f.x,
      y: f.y,
      hp: f.hp,
      meter: f.meter,
      wins: f.wins,
      face: f.face,
      action: f.action,
      age: f.age,
      animation: f.animation,
      animationAge: f.animationAge,
      stun: f.stun,
      blockStun: f.blockStun,
      bind: f.bind ? { ...f.bind } : null,
      bindImmunity: f.bindImmunity,
      guard: f.guard,
      crouch: f.crouch,
      grounded: f.grounded,
      combo: f.combo,
      ai: f.aiObservation
        ? { plan: f.aiPlan, wait: f.aiWait, observed: { ...f.aiObservation } }
        : null,
    })),
    projectiles: projectiles.map((p) => ({ ...p })),
    effects: effects.map((e) => ({ ...e })),
  })
  return { init, update, draw, inspect }
}
