;(config = {}) => {
  const ART = __ASSETS__,
    SETS = { ...ART.sets },
    TAU = Math.PI * 2,
    W = 256,
    H = 200,
    TOP = 24,
    clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    wrap = (n, d) => ((n % d) + d) % d
  const radii = { 3: 13.6, 2: 8.8, 1: 4.8 }
  let people = [],
    rocks = [],
    shots = [],
    hostile = [],
    bursts = [],
    stars = [],
    saucer = null,
    phase = 'playing',
    phaseT = 0,
    players = 1,
    wave = 1,
    waves = 3,
    time = 0,
    tick = 0,
    nextId = 1,
    seed = 7,
    saucerT = 12,
    drag = 0.24,
    difficulty = 0
  const stats = { shots: 0, kills: 0, splits: 0, hits: 0, warps: 0, waves: 0, saucers: 0 }
  function rnd() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  function delta(a, b, size) {
    return wrap(a - b + size / 2, size) - size / 2
  }
  function distance(a, b) {
    return Math.hypot(delta(a.x, b.x, W), delta(a.y - TOP, b.y - TOP, H))
  }
  function move(p, dt) {
    p.x = wrap(p.x + p.vx * dt, W)
    p.y = TOP + wrap(p.y - TOP + p.vy * dt, H)
  }
  function score(api, p, n) {
    p.score += n
    api.score(p.score, p.id)
  }
  function burst(x, y) {
    bursts.push({ x, y, age: 0 })
  }
  function safePlace(p) {
    let best = { x: 128, y: 124 },
      bestDistance = -1
    for (let gy = 0; gy < 5; gy++)
      for (let gx = 0; gx < 6; gx++) {
        const q = { x: 22 + gx * 42, y: 44 + gy * 37 }
        let d = 200
        for (const r of rocks) d = Math.min(d, distance(q, r) - r.radius)
        for (const s of hostile) d = Math.min(d, distance(q, s))
        for (const other of people)
          if (other.id !== p.id && other.lives > 0) d = Math.min(d, distance(q, other) - 12)
        if (d > bestDistance) {
          bestDistance = d
          best = q
        }
      }
    p.x = best.x
    p.y = best.y
    p.vx = p.vy = 0
    p.invulnerable = 2
  }
  function rock(size, x, y, vx, vy, grace = 0.6) {
    return {
      id: nextId++,
      size,
      x,
      y,
      vx,
      vy,
      radius: radii[size],
      age: 0,
      spin: (rnd() > 0.5 ? 1 : -1) * (0.4 + rnd()),
      grace,
    }
  }
  function makeWave() {
    rocks = []
    shots = []
    hostile = []
    saucer = null
    saucerT = 12
    const count = clamp(Math.floor(Number(config.initialRocks) || 3) + wave - 1, 2, 7)
    for (let i = 0; i < count; i++) {
      let point = { x: 0, y: 50 },
        gap = -1
      for (let tryN = 0; tryN < 12; tryN++) {
        const q = { x: rnd() > 0.5 ? 8 : 248, y: TOP + rnd() * H }
        let d = 200
        for (const p of people) d = Math.min(d, distance(p, q))
        if (d > gap) {
          gap = d
          point = q
        }
      }
      const a = rnd() * TAU,
        speed = 20 + wave * 3 + difficulty * 10
      rocks.push(rock(3, point.x, point.y, Math.cos(a) * speed, Math.sin(a) * speed))
    }
    for (const p of people) {
      p.invulnerable = 2
      p.dead = 0
      p.lives = Math.max(1, p.lives)
    }
  }
  function validateAssets() {
    for (const [name, set] of Object.entries(config.assets || {})) {
      const original = ART.sets[name]
      if (!original) throw new Error('Unknown asset set ' + name)
      if (
        !Number.isInteger(set.width) ||
        !Number.isInteger(set.height) ||
        set.width < 1 ||
        set.height < 1 ||
        set.width > 48 ||
        set.height > 48
      )
        throw new Error('Invalid sprite dimensions')
      for (const clipName of Object.keys(original.animations)) {
        const clip = set.animations?.[clipName]
        if (
          !clip ||
          !Array.isArray(clip.frames) ||
          !clip.frames.length ||
          !Number.isFinite(clip.frameMs) ||
          clip.frameMs < 16
        )
          throw new Error('Missing animation ' + name + ':' + clipName)
        for (const key of clip.frames) {
          const f = set.frames?.[key]
          if (
            !f ||
            !Array.isArray(f.pixels) ||
            f.pixels.length !== set.height ||
            f.pixels.some(
              (r) => typeof r !== 'string' || r.length !== set.width || !/^[0-9a-f.]+$/i.test(r),
            ) ||
            !f.anchor ||
            !Number.isFinite(f.anchor.x) ||
            !Number.isFinite(f.anchor.y) ||
            f.anchor.x < 0 ||
            f.anchor.x > set.width ||
            f.anchor.y < 0 ||
            f.anchor.y > set.height
          )
            throw new Error('Invalid sprite ' + key)
        }
      }
      SETS[name] = set
    }
  }
  function init(api) {
    validateAssets()
    players = (api.players ?? config.players) === 2 ? 2 : 1
    waves = clamp((Number(config.waves) || 3) | 0, 1, 8)
    wave = 1
    time = 0
    tick = 0
    phase = 'playing'
    phaseT = 0
    nextId = 1
    seed = (Number(config.seed) || 7) >>> 0
    drag = clamp(Number.isFinite(config.drag) ? config.drag : 0.24, 0, 2)
    difficulty = clamp(Number(config.difficulty) || 0, 0, 1)
    bursts = []
    for (const k in stats) stats[k] = 0
    people = Array.from({ length: players }, (_, id) => ({
      id,
      x: players === 2 ? (id ? 177 : 79) : 128,
      y: 130,
      vx: 0,
      vy: 0,
      angle: 0,
      thrust: false,
      shotT: 0,
      warpT: 0,
      warpFlash: 0,
      invulnerable: 2,
      dead: 0,
      lives: clamp((Number(config.lives) || 3) | 0, 1, 8),
      score: 0,
    }))
    for (const p of people) api.score(0, p.id)
    stars = Array.from({ length: 48 }, () => ({
      x: rnd() * W,
      y: TOP + rnd() * H,
      c: rnd() > 0.7 ? 6 : 1,
    }))
    makeWave()
  }
  function damage(p, api) {
    if (p.invulnerable > 0 || p.dead > 0 || p.lives <= 0) return
    p.lives--
    p.dead = 0.85
    p.invulnerable = 2
    stats.hits++
    burst(p.x, p.y)
    api.sfx('die')
    if (typeof config.onHit === 'function') {
      config.onHit({ player: p.id, lives: p.lives, wave }, api)
      p.score = api.getScore(p.id)
    }
  }
  function split(r, p, api) {
    r.dead = true
    stats.kills++
    const value = r.size === 3 ? 20 : r.size === 2 ? 50 : 100
    score(api, p, value)
    burst(r.x, r.y)
    api.sfx('explode')
    const children = []
    if (r.size > 1) {
      stats.splits++
      const base = Math.atan2(r.vy, r.vx)
      for (const sign of [-1, 1]) {
        const angle = base + sign * 0.85,
          speed = 35 + (3 - r.size) * 20 + wave * 3,
          child = rock(
            r.size - 1,
            wrap(r.x + sign * 3, W),
            TOP + wrap(r.y - TOP + sign * 3, H),
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            0.18,
          )
        children.push(child)
      }
    }
    if (typeof config.onRockSplit === 'function') {
      config.onRockSplit(
        { player: p.id, size: r.size, children: children.length, value, wave },
        api,
      )
      p.score = api.getScore(p.id)
    }
    return children
  }
  function update(api, dt) {
    dt = clamp(dt || 1 / 60, 1 / 240, 0.05)
    if (phase === 'won' || phase === 'lost') return
    time += dt
    tick++
    for (const b of bursts) b.age += dt
    bursts = bursts.filter((b) => b.age < 0.4)
    for (const p of people) {
      p.shotT = Math.max(0, p.shotT - dt)
      p.warpT = Math.max(0, p.warpT - dt)
      p.warpFlash = Math.max(0, p.warpFlash - dt)
      p.invulnerable = Math.max(0, p.invulnerable - dt)
      if (p.dead > 0) {
        p.dead = Math.max(0, p.dead - dt)
        if (p.dead === 0 && p.lives > 0) safePlace(p)
        continue
      }
      if (p.lives <= 0) continue
      p.angle = wrap(
        p.angle + ((api.btn('right', p.id) ? 1 : 0) - (api.btn('left', p.id) ? 1 : 0)) * 3.5 * dt,
        TAU,
      )
      p.thrust = api.btn('up', p.id)
      if (p.thrust) {
        p.vx += Math.sin(p.angle) * 122 * dt
        p.vy -= Math.cos(p.angle) * 122 * dt
      }
      const damping = Math.exp(-(api.btn('down', p.id) ? 4 : drag) * dt)
      p.vx *= damping
      p.vy *= damping
      const speed = Math.hypot(p.vx, p.vy)
      if (speed > 145) {
        p.vx *= 145 / speed
        p.vy *= 145 / speed
      }
      move(p, dt)
      if (api.btn('b', p.id) && p.warpT === 0) {
        burst(p.x, p.y)
        safePlace(p)
        p.warpT = 6
        p.warpFlash = 0.4
        stats.warps++
        api.sfx('powerup')
      }
      if (
        api.btn('a', p.id) &&
        p.shotT === 0 &&
        shots.filter((s) => s.player === p.id).length < 8
      ) {
        const dx = Math.sin(p.angle),
          dy = -Math.cos(p.angle)
        shots.push({
          id: nextId++,
          x: wrap(p.x + dx * 10, W),
          y: TOP + wrap(p.y - TOP + dy * 10, H),
          vx: dx * 235 + p.vx * 0.4,
          vy: dy * 235 + p.vy * 0.4,
          life: 0.9,
          player: p.id,
        })
        p.shotT = 0.18
        stats.shots++
        api.sfx('shoot')
      }
    }
    if (phase === 'clear') {
      phaseT -= dt
      if (phaseT <= 0) {
        wave++
        if (wave > waves) {
          phase = 'won'
          api.win()
          return
        }
        phase = 'playing'
        makeWave()
      }
      return
    }
    for (const r of rocks) {
      move(r, dt)
      r.age += dt
      r.grace = Math.max(0, r.grace - dt)
    }
    saucerT -= dt
    if (!saucer && saucerT <= 0)
      saucer = { x: -18, y: 55 + rnd() * 90, vx: 34, vy: 0, age: 0, warn: 0.95, shotT: 1, hp: 2 }
    if (saucer) {
      saucer.age += dt
      if (saucer.warn > 0) saucer.warn -= dt
      else {
        saucer.x += saucer.vx * dt
        saucer.y += Math.sin(saucer.age * 2) * dt * 13
        saucer.shotT -= dt
        if (saucer.shotT <= 0 && hostile.length < 8) {
          const targets = people.filter((p) => p.lives > 0),
            p = targets[Math.floor(rnd() * targets.length)]
          if (p) {
            const dx = delta(p.x, saucer.x, W),
              dy = delta(p.y - TOP, saucer.y - TOP, H),
              len = Math.hypot(dx, dy) || 1
            hostile.push({
              x: wrap(saucer.x, W),
              y: saucer.y,
              vx: (dx / len) * (72 + difficulty * 20),
              vy: (dy / len) * (72 + difficulty * 20),
              life: 1.65,
            })
          }
          saucer.shotT = 1.1
        }
        if (saucer.x > 280) {
          saucer = null
          saucerT = 12
        }
      }
    }
    const children = []
    for (const s of shots) {
      move(s, dt)
      s.life -= dt
      if (s.life <= 0) continue
      for (const r of rocks) {
        if (!r.dead && r.grace <= 0 && distance(s, r) < r.radius + 1.5) {
          children.push(...split(r, people[s.player], api))
          s.life = 0
          break
        }
      }
      if (s.life > 0 && saucer && saucer.warn <= 0 && distance(s, saucer) < 11.5) {
        s.life = 0
        saucer.hp--
        if (saucer.hp <= 0) {
          score(api, people[s.player], 250)
          stats.saucers++
          burst(saucer.x, saucer.y)
          saucer = null
          saucerT = 12
          api.sfx('powerup')
        }
      }
    }
    shots = shots.filter((s) => s.life > 0)
    rocks = rocks
      .filter((r) => !r.dead)
      .concat(children)
      .slice(0, 56)
    for (const s of hostile) {
      move(s, dt)
      s.life -= dt
      for (const p of people)
        if (p.lives > 0 && p.dead === 0 && distance(p, s) < 7.5) {
          damage(p, api)
          s.life = 0
        }
    }
    hostile = hostile.filter((s) => s.life > 0)
    for (const p of people)
      if (p.lives > 0 && p.dead === 0) {
        for (const r of rocks) if (r.grace <= 0 && distance(p, r) < 6 + r.radius) damage(p, api)
        if (saucer && saucer.warn <= 0 && distance(p, saucer) < 16) damage(p, api)
      }
    if (!rocks.length) {
      stats.waves++
      phase = 'clear'
      phaseT = 1.3
      shots = []
      hostile = []
      saucer = null
      for (const p of people) score(api, p, 500)
      api.sfx('powerup')
      if (typeof config.onWaveClear === 'function') {
        config.onWaveClear({ wave }, api)
        for (const p of people) p.score = api.getScore(p.id)
      }
    } else if (people.every((p) => p.lives <= 0 && p.dead === 0)) {
      phase = 'lost'
      api.gameOver()
    }
  }
  function sprite(api, name, clip, x, y, t, recolor = {}) {
    const set = SETS[name],
      anim = set.animations[clip],
      key =
        anim.frames[
          anim.loop
            ? Math.floor((Math.abs(t) * 1000) / anim.frameMs) % anim.frames.length
            : Math.min(anim.frames.length - 1, Math.floor((t * 1000) / anim.frameMs))
        ],
      f = set.frames[key]
    // Ghost copies at edges keep drawing and toroidal collision aligned.
    for (const ox of [-256, 0, 256])
      for (const oy of [-200, 0, 200]) {
        const px = Math.round(x - f.anchor.x + ox),
          py = Math.round(y - f.anchor.y + oy)
        if (px + set.width < 0 || px >= 256 || py + set.height < TOP || py >= 224) continue
        for (let yy = 0; yy < set.height; yy++)
          for (let xx = 0; xx < set.width; xx++) {
            const c = f.pixels[yy][xx]
            if (c !== '.' && py + yy >= TOP && py + yy < 224)
              api.pset(
                px + xx,
                py + yy,
                Object.hasOwn(recolor, c) ? recolor[c] : Number.parseInt(c, 16),
              )
          }
      }
  }
  function draw(api) {
    api.cls(0)
    for (const s of stars) api.pset(s.x, s.y, s.c)
    api.rectfill(0, 12, 256, 11, 1)
    api.text('SECTOR ' + Math.min(wave, waves) + '/' + waves, 3, 14, 7)
    api.text('ROCKS ' + rocks.length, 174, 14, 10)
    for (const r of rocks) sprite(api, 'rock' + r.size, 'rotate', r.x, r.y, r.age * r.spin)
    if (saucer) {
      if (saucer.warn > 0) api.text('>', 2, saucer.y, 14)
      else sprite(api, 'saucer', 'fly', saucer.x, saucer.y, time)
    }
    for (const s of shots) api.circfill(s.x, s.y, 1, s.player ? 8 : 12)
    for (const s of hostile) api.circfill(s.x, s.y, 1, 14)
    for (const p of people) {
      if (p.lives > 0 && p.dead === 0 && !(p.invulnerable > 0 && tick % 8 < 3)) {
        const heading = Math.round((p.angle / TAU) * 16) % 16,
          color = Number.isFinite(config.shipColors?.[p.id])
            ? clamp(config.shipColors[p.id] | 0, 0, 15)
            : p.id
              ? 8
              : 12
        sprite(api, 'ship', (p.thrust ? 'thrust' : 'heading') + heading, p.x, p.y, time, {
          c: color,
          7: p.id ? 14 : 7,
        })
        if (p.warpFlash > 0) api.circ(p.x, p.y, 12 + (0.4 - p.warpFlash) * 25, 12)
      }
      const x = p.id ? 151 : 3
      api.text('P' + (p.id + 1), x, 215, p.id ? 8 : 12)
      for (let i = 0; i < p.lives; i++) api.rectfill(x + 22 + i * 7, 216, 5, 4, p.id ? 8 : 12)
      api.rectfill(x + 74, 217, 22, 2, 1)
      api.rectfill(x + 74, 217, 22 * (1 - p.warpT / 6), 2, 12)
    }
    for (const b of bursts) sprite(api, 'burst', 'explode', b.x, b.y, b.age)
    if (phase === 'clear') {
      api.rectfill(52, 112, 152, 20, 0)
      api.rect(52, 112, 152, 20, 10)
      api.text('SECTOR CLEARED', 76, 119, 10)
    }
  }
  function inspect() {
    return {
      phase,
      wave,
      waves,
      time,
      stats: { ...stats },
      people: people.map((p) => ({ ...p })),
      rocks: rocks.map((r) => ({ ...r })),
      shots: shots.map((s) => ({ ...s })),
      hostile: hostile.map((s) => ({ ...s })),
      saucer: saucer ? { ...saucer } : null,
    }
  }
  return { init, update, draw, inspect, distanceBetween: distance }
}
