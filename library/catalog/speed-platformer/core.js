// Original reversible momentum platformer. Every distance is in native pixels,
// every duration in 60Hz ticks; source sprite pixels remain unchanged.
// biome-ignore lint/correctness/noUnusedVariables: bundled factory is returned by build.mjs.
function speedPlatformerFactory(config = {}) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const acts = [
    {
      name: 'PALM COAST',
      length: 3120,
      sky: 12,
      water: 1,
      terrain: [
        [0, 180],
        [240, 180],
        [400, 214],
        [570, 145],
        [760, 180],
        [1100, 180],
        [1110, 180],
        [1260, 180],
        [1330, 220],
        [1440, 180],
        [1490, 160],
        [1620, 126],
        [1800, 190],
        [1980, 180],
        [2070, 180, 1],
        [2180, 154],
        [2300, 154],
        [2420, 130],
        [2520, 130],
        [2630, 130, 1],
        [2780, 206],
        [2970, 166],
        [3120, 166],
      ],
      loops: [{ x: 945, y: 142, r: 38 }],
      platforms: [
        { x: 450, y: 115, w: 110 },
        { x: 580, y: 113, w: 100 },
        { x: 710, y: 121, w: 100 },
        { x: 860, y: 116, w: 125 },
        { x: 1530, y: 93, w: 115 },
        { x: 1230, y: 126, w: 120 },
        { x: 2500, y: 78, w: 145 },
      ],
      springs: [1080, 1580],
      enemies: [330, 800, 1180, 1460, 1930, 2450, 2820],
      checkpoints: [1000, 1740, 2360],
      goal: 3020,
      hints: [
        { x: 105, text: 'A JUMP  B ROLL' },
        { x: 520, text: 'DOWN + B: CHARGE' },
        { x: 1120, text: 'HIGH ROAD: RINGS' },
      ],
    },
    {
      name: 'SUNSET RIDGE',
      length: 3420,
      sky: 2,
      water: 1,
      terrain: [
        [0, 180],
        [220, 180],
        [390, 132],
        [550, 202],
        [750, 214],
        [930, 132],
        [1110, 132],
        [1280, 196],
        [1400, 196],
        [1480, 196, 1],
        [1620, 205],
        [1760, 205],
        [1830, 148],
        [2050, 148],
        [2220, 158],
        [2340, 158, 1],
        [2510, 124],
        [2600, 158],
        [2760, 112],
        [2860, 112],
        [2970, 112, 1],
        [3150, 185],
        [3420, 160],
      ],
      loops: [{ x: 1910, y: 110, r: 38 }],
      platforms: [
        { x: 430, y: 96, w: 100 },
        { x: 985, y: 86, w: 105 },
        { x: 1530, y: 101, w: 120 },
        { x: 2030, y: 120, w: 95 },
        { x: 1370, y: 142, w: 115 },
        { x: 2830, y: 62, w: 160 },
      ],
      springs: [700, 2110],
      enemies: [280, 610, 990, 1240, 1700, 2010, 2350, 2740, 3130],
      checkpoints: [1100, 1880, 2680],
      goal: 3320,
      hints: [
        { x: 100, text: 'RIDGE RUN' },
        { x: 660, text: 'SPRING TO HIGH ROAD' },
      ],
    },
  ]
  const clips = ['idle', 'run', 'jump', 'roll', 'skid', 'hurt', 'victory']
  const hero = config.hero || SPEED_ART.hero
  const objectArt = config.objects || {}
  const validate = (set, required, label) => {
    const fail = () => {
      throw Error(`speedPlatformer: invalid ${label} sprite set`)
    }
    if (!set?.frames || !set.animations) fail()
    for (const frame of Object.values(set.frames)) {
      const w = frame.pixels?.[0]?.length,
        h = frame.pixels?.length
      if (
        !w ||
        !h ||
        w > 96 ||
        h > 96 ||
        !Number.isFinite(frame.anchor?.x) ||
        !Number.isFinite(frame.anchor?.y)
      )
        fail()
      if (frame.layers !== undefined && (!Array.isArray(frame.layers) || frame.layers.length > 8))
        fail()
      for (const [i, p] of [frame, ...(frame.layers || [])].entries()) {
        if (
          !Array.isArray(p.pixels) ||
          p.pixels.length !== h ||
          p.pixels.some((r) => typeof r !== 'string' || r.length !== w || !/^[.0-9a-f]+$/i.test(r))
        )
          fail()
        if (
          (i || p.palette !== undefined) &&
          (!Array.isArray(p.palette) ||
            !p.palette.length ||
            p.palette.length > 16 ||
            p.palette.some((c) => !/^#[0-9a-f]{6}$/i.test(c)))
        )
          fail()
        if (
          p.pixels.some((r) =>
            [...r].some((c) => c !== '.' && parseInt(c, 16) >= (p.palette?.length ?? 16)),
          )
        )
          fail()
        if (i && Object.keys(p).some((k) => k !== 'pixels' && k !== 'palette')) fail()
      }
    }
    for (const name of required) if (!set.animations[name]?.frames?.length) fail()
    for (const clip of Object.values(set.animations)) {
      if (typeof clip.loop !== 'boolean' || !Array.isArray(clip.frames) || !clip.frames.length)
        fail()
      for (const s of clip.frames)
        if (
          !set.frames[s.frame] ||
          !Number.isInteger(s.duration) ||
          s.duration < 1 ||
          (s.anchor && (!Number.isFinite(s.anchor.x) || !Number.isFinite(s.anchor.y)))
        )
          fail()
    }
  }
  validate(hero, clips, 'hero')
  for (const [key, set] of Object.entries(objectArt)) validate(set, ['idle'], key)
  let people, ticks, phase, winner
  const terrain = (act, x) => {
    const points = acts[act].terrain
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1]
      if (x >= a[0] && x <= b[0])
        return b[2]
          ? null
          : {
              y: a[1] + ((x - a[0]) * (b[1] - a[1])) / (b[0] - a[0]),
              slope: (b[1] - a[1]) / (b[0] - a[0]),
            }
    }
    return null
  }
  const springY = (actIndex, x) =>
    Math.min(
      terrain(actIndex, x)?.y ?? Infinity,
      ...acts[actIndex].platforms.filter((p) => x >= p.x && x <= p.x + p.w).map((p) => p.y),
    )
  const addScore = (api, p, n) => {
    p.score += n
    api.addScore(n, p.id)
  }
  function populate(p) {
    const act = acts[p.act]
    p.ringsOnMap = []
    for (let x = 145; x < act.goal - 60; x += 95) {
      const g = terrain(p.act, x)
      if (g)
        for (let i = 0; i < 3; i++)
          p.ringsOnMap.push({
            x: x + i * 14,
            y: g.y - 29 - Math.sin((i * Math.PI) / 2) * 9,
            taken: false,
          })
    }
    for (const platform of act.platforms)
      for (let x = platform.x + 16; x < platform.x + platform.w; x += 20)
        p.ringsOnMap.push({ x, y: platform.y - 16, taken: false })
    for (let i = 1; i < act.terrain.length; i++) {
      const end = act.terrain[i],
        start = act.terrain[i - 1]
      if (!end[2]) continue
      p.ringsOnMap = p.ringsOnMap.filter((r) => r.x < start[0] - 80 || r.x > end[0] + 40)
      for (let j = 0; j < 8; j++) {
        const t = j / 7
        p.ringsOnMap.push({
          x: start[0] - 60 + t * (end[0] - start[0] + 100),
          y: start[1] - 20 - Math.sin(t * Math.PI) * 48,
          taken: false,
        })
      }
    }
    for (const loop of act.loops)
      for (let i = 0; i < 8; i++) {
        const a = ((i + 1) * Math.PI * 2) / 9
        p.ringsOnMap.push({
          x: loop.x + Math.sin(a) * (loop.r - 16),
          y: loop.y + Math.cos(a) * (loop.r - 16),
          taken: false,
        })
      }
    p.enemies = act.enemies.map((x, i) => ({
      home: x,
      x,
      y: terrain(p.act, x)?.y ?? 180,
      dir: i % 2 ? 1 : -1,
      dead: false,
    }))
    p.scatter = []
    p.checkpoint = 60
    p.checkpointId = -1
    p.x = 60
    p.y = terrain(p.act, 60).y
    p.vx = 0
    p.vy = 0
    p.grounded = true
    p.roll = false
    p.charge = 0
    p.invulnerable = 60
    p.dead = 0
    p.finished = false
    p.actTime = 0
    p.camera = 0
    p.cameraY = clamp(p.y - p.viewHeight * 0.7, -25, 180)
    p.animation = 'idle'
    p.animationAge = 0
    p.springCooldown = 0
    p.loop = null
    p.loopCooldown = 0
    p.platform = null
    p.coyote = 6
    p.jumpBuffer = 0
  }
  function init(api) {
    ticks = 0
    phase = 'play'
    winner = null
    people = Array.from({ length: api.players === 2 ? 2 : 1 }, (_, id) => {
      const p = {
        id,
        viewHeight: api.players === 2 ? 98 : 198,
        act: 0,
        rings: 0,
        score: 0,
        lives: 3,
        face: 1,
        previous: {},
        totalTime: 0,
        transition: 0,
        stats: { hits: 0, recovered: 0, springs: 0, enemies: 0, acts: 0, maxSpeed: 0 },
      }
      populate(p)
      api.score(0, id)
      return p
    })
  }
  function hurt(api, p) {
    if (p.invulnerable || p.dead || p.finished) return
    p.stats.hits++
    p.charge = 0
    p.roll = false
    p.loop = null
    p.platform = null
    if (p.rings) {
      const n = Math.min(20, p.rings)
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (i / (n - 1 || 1)) * Math.PI
        p.scatter.push({
          x: p.x,
          y: p.y - 15,
          vx: Math.cos(a) * (2 + (i % 2)),
          vy: Math.sin(a) * 3 - 2,
          age: 0,
        })
      }
      p.rings = 0
      p.invulnerable = 120
      p.vx = -p.face * 2.5
      p.vy = -3.5
      p.grounded = false
      api.sfx('hit')
    } else die(api, p)
  }
  function die(api, p) {
    if (p.dead) return
    p.loop = null
    p.platform = null
    p.lives--
    p.dead = 75
    p.vy = -4
    p.vx = 0
    p.grounded = false
    api.sfx('hit')
  }
  function updatePerson(api, p) {
    if (p.finished) return
    p.totalTime++
    p.actTime++
    p.animationAge++
    if (p.transition) {
      if (--p.transition === 0) {
        p.act++
        populate(p)
      }
      return
    }
    if (p.dead) {
      p.y += p.vy
      p.vy += 0.22
      if (--p.dead === 0) {
        if (p.lives <= 0) {
          p.finished = true
          return
        }
        p.x = p.checkpoint
        p.y = terrain(p.act, p.x).y
        p.vx = 0
        p.vy = 0
        p.grounded = true
        p.invulnerable = 120
        p.scatter = []
      }
      return
    }
    p.invulnerable = Math.max(0, p.invulnerable - 1)
    p.springCooldown = Math.max(0, p.springCooldown - 1)
    p.loopCooldown = Math.max(0, p.loopCooldown - 1)
    const key = (k) => api.btn(k, p.id),
      edge = (k) => key(k) && !p.previous[k]
    const direction = (key('right') ? 1 : 0) - (key('left') ? 1 : 0),
      jump = key('a') || key('up'),
      pressed = edge('a') || edge('up')
    if (pressed) p.jumpBuffer = 7
    else p.jumpBuffer = Math.max(0, p.jumpBuffer - 1)
    p.coyote = p.grounded ? 6 : Math.max(0, p.coyote - 1)
    let skid = false
    if (p.grounded && key('down') && key('b') && Math.abs(p.vx) < 1.4) {
      p.charge = Math.min(45, p.charge + 1)
      p.vx = 0
      p.roll = true
    } else if (p.charge) {
      p.vx = p.face * (5 + Math.min(4.2, p.charge * 0.11))
      p.charge = 0
      p.roll = true
      api.sfx('shoot')
    } else {
      if (direction) {
        if (Math.abs(p.vx) < 0.5 || Math.sign(p.vx) === direction) p.face = direction
        skid = p.grounded && Math.abs(p.vx) > 2.5 && Math.sign(p.vx) !== direction
        p.vx += direction * (p.grounded ? (skid ? 0.31 : p.roll ? 0.045 : 0.15) : 0.065)
      } else if (p.grounded) p.vx *= p.roll ? 0.995 : 0.93
      if (p.grounded) {
        const g = terrain(p.act, p.x)
        if (g) p.vx += g.slope * (p.roll ? 0.24 : 0.13)
      }
      if (p.grounded && (edge('b') || key('down')) && Math.abs(p.vx) > 1.3) p.roll = true
      if (p.grounded && Math.abs(p.vx) < 0.8 && !key('down')) p.roll = false
      p.vx = clamp(p.vx, -(p.roll ? 9.2 : 6.2), p.roll ? 9.2 : 6.2)
    }
    if (p.jumpBuffer && p.coyote && !p.charge && !p.loop) {
      p.vy = -5.7
      p.grounded = false
      p.coyote = 0
      p.jumpBuffer = 0
      p.roll = true
      api.sfx('jump')
    }
    if (!jump && p.vy < -2.5 && !p.springCooldown) p.vy = -2.5
    const oldX = p.x,
      oldY = p.y,
      wasGrounded = p.grounded
    if (p.loop) {
      const l = actLoop(p),
        a = p.loop.progress
      if (pressed) {
        p.vx = p.loop.speed * Math.cos(a) - Math.sin(a) * 4.8
        p.vy = -p.loop.speed * Math.sin(a) - Math.cos(a) * 4.8
        p.loop = null
        p.loopCooldown = 50
        p.jumpBuffer = 0
      } else {
        p.loop.speed += -0.23 * Math.sin(a)
        p.loop.progress += p.loop.speed / l.r
        const t = p.loop.progress
        p.x = l.x + l.r * Math.sin(t)
        p.y = l.y + l.r * Math.cos(t)
        p.roll = true
        p.grounded = false
        p.vx = p.loop.speed * Math.cos(t)
        p.vy = -p.loop.speed * Math.sin(t)
        if (t >= Math.PI * 2) {
          p.x = l.x + 1
          p.y = l.y + l.r
          p.vx = p.loop.speed
          p.vy = 0
          p.grounded = true
          p.loop = null
          p.loopCooldown = 45
          p.stats.loops = (p.stats.loops || 0) + 1
        } else if (p.loop.speed < 1.4) {
          p.loop = null
          p.loopCooldown = 45
        }
      }
    }
    if (!p.loop) {
      p.x = clamp(p.x + p.vx, 10, acts[p.act].length - 10)
      const ground = terrain(p.act, p.x)
      const support = p.platform !== null ? acts[p.act].platforms[p.platform] : null
      if (support && (p.x < support.x - 4 || p.x > support.x + support.w + 4)) {
        p.platform = null
        p.grounded = false
      }
      if (wasGrounded && p.grounded && (ground || support)) {
        p.y = support ? support.y : ground.y
        p.vy = 0
      } else {
        p.grounded = false
        p.vy = Math.min(8, p.vy + 0.23)
        p.y += p.vy
        if (p.vy >= 0) {
          let surface = ground?.y ?? Infinity
          let landingPlatform = null
          for (const [index, platform] of acts[p.act].platforms.entries())
            if (
              p.x >= platform.x - 4 &&
              p.x <= platform.x + platform.w + 4 &&
              oldY <= platform.y + 1 &&
              platform.y < surface
            ) {
              surface = platform.y
              landingPlatform = index
            }
          if (
            oldY <= surface + Math.abs(p.x - oldX) * Math.abs(ground?.slope ?? 0) + 3 &&
            p.y >= surface
          ) {
            p.y = surface
            p.vy = 0
            p.grounded = true
            p.platform = landingPlatform
            p.roll = Math.abs(p.vx) > 1.4 && key('down')
          }
        }
      }
      if (!p.loopCooldown && wasGrounded && p.grounded && p.vx >= 5.8)
        for (const [index, l] of acts[p.act].loops.entries())
          if (oldX < l.x && p.x >= l.x) {
            p.loop = { index, progress: 0, speed: p.vx }
            p.platform = null
            p.grounded = false
            p.roll = true
            p.x = l.x
            p.y = l.y + l.r
          }
    }
    if (p.y > 390) {
      die(api, p)
      return
    }
    for (const x of acts[p.act].springs) {
      const y = springY(p.act, x)
      if (!p.springCooldown && p.vy >= 0 && Math.abs(p.x - x) < 11 && Math.abs(p.y - y) < 9) {
        p.vy = -8.2
        p.grounded = false
        p.roll = true
        p.springCooldown = 35
        p.stats.springs++
        api.sfx('powerup')
      }
    }
    for (const ring of p.ringsOnMap)
      if (!ring.taken && Math.abs(p.x - ring.x) < 13 && Math.abs(p.y - 15 - ring.y) < 23) {
        ring.taken = true
        p.rings++
        addScore(api, p, 10)
        api.sfx('coin')
      }
    for (const ring of p.scatter) {
      ring.age++
      ring.x += ring.vx
      ring.y += ring.vy
      ring.vy += 0.16
      const g = terrain(p.act, ring.x)
      if (g && ring.y > g.y - 4 && ring.vy > 0) {
        ring.y = g.y - 4
        ring.vy *= -0.65
        ring.vx *= 0.88
      }
      if (ring.age > 24 && Math.abs(ring.x - p.x) < 13 && Math.abs(ring.y - (p.y - 12)) < 22) {
        ring.age = 999
        p.rings++
        p.stats.recovered++
        api.sfx('coin')
      }
    }
    p.scatter = p.scatter.filter((r) => r.age < 240)
    for (const enemy of p.enemies) {
      if (enemy.dead) continue
      enemy.x += enemy.dir * 0.36
      if (Math.abs(enemy.x - enemy.home) > 24) enemy.dir *= -1
      enemy.y = terrain(p.act, enemy.x)?.y ?? enemy.y
      if (Math.abs(p.x - enemy.x) < 15 && Math.abs(p.y - 12 - (enemy.y - 9)) < 19) {
        if (p.roll || (!p.grounded && p.vy > 0 && oldY < enemy.y - 9)) {
          enemy.dead = true
          p.stats.enemies++
          addScore(api, p, 100)
          if (!p.grounded) p.vy = -4
          api.sfx('hit')
        } else hurt(api, p)
      }
    }
    for (const [i, x] of acts[p.act].checkpoints.entries())
      if (p.x > x && i > p.checkpointId) {
        p.checkpoint = x
        p.checkpointId = i
        addScore(api, p, 100)
        api.sfx('select')
      }
    if (p.x >= acts[p.act].goal) {
      p.stats.acts++
      addScore(api, p, 1000 + p.rings * 10 + Math.max(0, 1200 - Math.floor(p.actTime / 3)))
      p.vx = 0
      p.vy = 0
      p.grounded = true
      p.animation = 'victory'
      p.animationAge = 0
      if (p.act === acts.length - 1) {
        p.finished = true
        if (phase === 'play') {
          phase = 'complete'
          winner = p.id
          api.win(people.length === 2 ? p.id : undefined)
        }
      } else p.transition = 100
    }
    p.stats.maxSpeed = Math.max(p.stats.maxSpeed, Math.abs(p.vx))
    const animation = p.transition
      ? 'victory'
      : p.invulnerable > 90
        ? 'hurt'
        : p.charge
          ? hero.animations.spindash
            ? 'spindash'
            : 'roll'
          : p.springCooldown && !p.grounded
            ? hero.animations.spring
              ? 'spring'
              : 'roll'
            : p.roll
              ? 'roll'
              : !p.grounded
                ? 'jump'
                : key('down') && Math.abs(p.vx) < 0.8 && hero.animations.crouch
                  ? 'crouch'
                  : skid
                    ? 'skid'
                    : Math.abs(p.vx) > 0.4
                      ? hero.animations.walk && Math.abs(p.vx) < 2.5
                        ? 'walk'
                        : 'run'
                      : 'idle'
    if (animation !== p.animation) {
      p.animation = animation
      p.animationAge = 0
    }
    for (const k of ['left', 'right', 'up', 'down', 'a', 'b']) p.previous[k] = key(k)
  }
  const actLoop = (p) => acts[p.act].loops[p.loop.index]
  function update(api) {
    if (phase !== 'play') return
    ticks++
    for (const p of people) {
      updatePerson(api, p)
      const height = people.length === 2 ? 98 : 198
      const targetX = p.loop ? actLoop(p).x - 128 : p.x - (p.face > 0 ? 72 : 184) + p.vx * 4
      p.camera += (clamp(targetX, 0, acts[p.act].length - 256) - p.camera) * 0.18
      p.cameraY += (clamp(p.y - height * 0.68 + p.vy * 3, -180, 250) - p.cameraY) * 0.18
      // Keep a native ~40px source actor below the HUD during high spring launches.
      p.cameraY = clamp(p.cameraY, p.y - height + 8, p.y - 56)
    }
    if (phase === 'play' && people.every((p) => p.finished)) {
      phase = 'lost'
      api.gameOver()
    }
  }
  function selected(set, clip, age) {
    const animation = set.animations[clip] || set.animations.idle,
      total = animation.frames.reduce((n, s) => n + s.duration, 0)
    let t = animation.loop ? age % total : Math.min(age, total - 1)
    let step = animation.frames[0]
    for (const s of animation.frames) {
      step = s
      if (t < s.duration) break
      t -= s.duration
    }
    return { frame: set.frames[step.frame], anchor: step.anchor || set.frames[step.frame].anchor }
  }
  function drawView(api, p, top, height) {
    const act = acts[p.act],
      cam = p.camera,
      cy = p.cameraY
    const rect = (x, y, w, h, c) => {
      const yy = Math.max(top, y),
        end = Math.min(top + height, y + h)
      if (end > yy && w > 0) api.rectfill(x, yy, w, end - yy, c)
    }
    const world = (x, y, w, h, c) => rect(Math.round(x - cam), Math.round(y - cy + top), w, h, c)
    const sprite = (set, clip, age, x, y, face = 1) => {
      const { frame, anchor } = selected(set, clip, age),
        width = frame.pixels[0].length
      const left = Math.round(x - cam - (face === 1 ? anchor.x : width - 1 - anchor.x)),
        y0 = Math.round(y - cy + top - anchor.y)
      const a = Math.max(0, top - y0),
        b = Math.min(frame.pixels.length, top + height - y0)
      if (a >= b || left > 255 || left + width < 0) return
      for (const plane of [frame, ...(frame.layers || [])]) {
        let rows = plane.pixels.slice(a, b)
        if (face === -1) rows = rows.map((r) => [...r].reverse().join(''))
        api.spr(rows, left, y0 + a, false, false, plane.palette)
      }
    }
    const scenery = SPEED_ART.scenery[p.act]
    const picture = (art, x, y) => {
      x = Math.round(x)
      y = Math.round(y)
      if (x > 255 || x + art.pixels[0].length < 0) return
      const a = Math.max(0, top - y),
        b = Math.min(art.pixels.length, top + height - y)
      if (a < b) api.spr(art.pixels.slice(a, b), x, y + a, false, false, art.palette)
    }
    const sceneryWorld = (art, x, y) => picture(art, x - cam, y - cy + top)
    const horizon = top + Math.round(height * 0.47)
    // Fixed native pixel scenery at three independent parallax depths.
    rect(0, top, 256, height, act.sky)
    picture(scenery.sky, 0, horizon - 128)
    picture(scenery.sea, 0, horizon)
    for (let i = -1; i < 4; i++)
      picture(scenery.cloud, i * 133 - ((cam * 0.09) % 133), horizon - 54 + (i % 2) * 9)
    for (let i = -1; i < 4; i++)
      picture(scenery.island, i * 190 - ((cam * 0.21) % 190), horizon - 25 + (i % 2) * 9)
    // Curved trees stand behind the playable ground, with clear solid turf edges.
    for (let i = 145; i < act.length; i += 307) {
      const g = terrain(p.act, i)
      if (g) sceneryWorld(scenery.palm, i - 57, g.y - 100)
    }
    for (let sx = -4; sx < 256; sx += 4) {
      const x = Math.floor((cam + sx) / 4) * 4,
        g = terrain(p.act, x)
      if (!g) continue
      const index = ((Math.floor(x / 4) % 8) + 8) % 8,
        screenX = Math.round(x - cam),
        y = Math.round(g.y - cy + top)
      for (let yy = y + 5; yy < top + height; yy += 32) picture(scenery.tiles[index], screenX, yy)
      picture(scenery.turf[index], screenX, y)
    }
    // One continuous ring: inner grass edge is the actual radius of the track.
    for (const loop of act.loops) sceneryWorld(scenery.loop, loop.x - 50, loop.y - 50)
    for (const platform of act.platforms) {
      for (let x = 0; x < platform.w; x += 4) {
        const i = Math.floor(x / 4) % 8
        const depth = Math.min(24, 8 + Math.min(x, platform.w - x) / 3)
        const tile = scenery.tiles[i]
        sceneryWorld(
          { pixels: tile.pixels.slice(0, depth), palette: tile.palette },
          platform.x + x,
          platform.y + 4,
        )
        sceneryWorld(scenery.turf[i], platform.x + x, platform.y)
      }
    }
    for (let x = 90; x < act.length; x += 117) {
      const g = terrain(p.act, x)
      if (g) sceneryWorld(scenery.fern, x - 16, g.y - 19)
    }
    const object = (name, x, y, drawFallback) =>
      objectArt[name] ? sprite(objectArt[name], 'idle', ticks, x, y) : drawFallback()
    for (let i = 1; i < act.terrain.length; i++) {
      if (!act.terrain[i][2]) continue
      const start = act.terrain[i - 1],
        x = start[0] - 96,
        y = start[1]
      world(x, y - 30, 2, 30, 6)
      world(x - 7, y - 34, 17, 13, 0)
      world(x - 6, y - 33, 15, 11, 10)
      const sx = Math.round(x - cam),
        sy = Math.round(y - cy + top)
      if (sy - 31 >= top && sy - 24 < top + height) api.text('A', sx - 2, sy - 31, 0)
    }
    const drawRing = (x, y) =>
      object('ring', x, y, () => {
        const narrow = ticks % 20 > 12
        world(x - (narrow ? 2 : 4), y - 4, narrow ? 4 : 8, 8, 10)
        world(x - (narrow ? 1 : 2), y - 2, narrow ? 2 : 4, 4, act.sky)
        world(x - 3, y - 4, 3, 1, 7)
      })
    for (const ring of p.ringsOnMap)
      if (!ring.taken && Math.abs(ring.x - cam - 128) < 145) drawRing(ring.x, ring.y)
    for (const ring of p.scatter) if (ring.age < 180 || ticks % 8 < 4) drawRing(ring.x, ring.y)
    for (const x of act.springs) {
      const y = springY(p.act, x)
      object('spring', x, y, () => {
        world(x - 8, y - 7, 16, 4, 8)
        world(x - 5, y - 3, 10, 3, 7)
        world(x - 9, y, 18, 3, 5)
      })
    }
    for (const [i, x] of act.checkpoints.entries()) {
      const y = terrain(p.act, x).y
      object('checkpoint', x, y, () => {
        world(x - 1, y - 31, 3, 31, 7)
        world(x + 2, y - 30, 12, 8, i <= p.checkpointId ? 10 : 8)
        world(x + 2, y - 22, 7, 4, i <= p.checkpointId ? 10 : 8)
      })
    }
    for (const e of p.enemies)
      if (!e.dead)
        object('enemy', e.x, e.y, () => {
          world(e.x - 9, e.y - 11, 18, 7, 8)
          world(e.x - 5, e.y - 15, 10, 6, 2)
          world(e.x - 7, e.y - 12, 4, 3, 7)
          world(e.x + 3, e.y - 12, 4, 3, 7)
          world(e.x - 12, e.y - 5, 6, 4, 5)
          world(e.x + 6, e.y - 5, 6, 4, 5)
        })
    const gy = terrain(p.act, act.goal).y
    object('goal', act.goal, gy, () => {
      world(act.goal - 2, gy - 54, 4, 54, 7)
      world(act.goal + 2, gy - 54, 24, 18, 7)
      for (let yy = 0; yy < 3; yy++)
        for (let xx = 0; xx < 4; xx++)
          if ((xx + yy) % 2 === 0) world(act.goal + 2 + xx * 6, gy - 54 + yy * 6, 6, 6, 0)
    })
    if (!p.invulnerable || ticks % 6 < 3 || p.dead)
      sprite(
        hero,
        p.finished && p.lives > 0
          ? 'victory'
          : p.dead || p.lives <= 0
            ? hero.animations.ko
              ? 'ko'
              : 'hurt'
            : p.animation,
        p.animationAge * (p.animation === 'run' ? Math.max(1, Math.abs(p.vx) / 2) : 1),
        p.x,
        p.y,
        p.face,
      )
    rect(0, top, 256, 11, 0)
    api.text(
      `${people.length === 2 ? 'P' + (p.id + 1) + ' ' : ''}RINGS ${String(p.rings).padStart(2, '0')}  ${Math.floor(p.actTime / 60)}s`,
      4,
      top + 2,
      p.rings ? 10 : 7,
    )
    api.text(`L${p.lives}`, 233, top + 2, 7)
    if (p.charge) {
      rect(92, top + height - 9, 72, 5, 0)
      rect(93, top + height - 8, (p.charge / 45) * 70, 3, 10)
    }
    if (p.actTime < 75) {
      rect(34, top + 24, 188, 21, 0)
      api.text(config.actNames?.[p.act] || act.name, 42, top + 27, 7)
      api.text(`ACT ${p.act + 1}`, 107, top + 36, 10)
    }
    if (p.actTime >= 75 && !p.transition) {
      const hint = act.hints.find((h) => Math.abs(p.x - h.x) < 72)
      if (hint) {
        rect(35, top + 13, 186, 11, 0)
        api.text(hint.text, 40, top + 15, 7)
      }
    }
    if (p.transition) {
      rect(40, top + height * 0.35, 176, 24, 0)
      api.text('ACT CLEAR', 83, top + height * 0.35 + 4, 10)
      api.text('NEXT: SUNSET RIDGE', 57, top + height * 0.35 + 14, 7)
    }
    if (p.dead || p.lives <= 0) {
      rect(57, top + height * 0.4, 142, 13, 0)
      api.text(p.lives ? 'CHECKPOINT RESTART' : 'OUT OF LIVES', 65, top + height * 0.4 + 3, 7)
    }
  }
  function draw(api) {
    api.cls(0)
    api.text(String(config.title || 'AZURE DASH').slice(0, 20), 6, 14, 7)
    api.text(people.length === 2 ? 'RACE' : '2 ACTS', 205, 14, 10)
    if (people.length === 1) drawView(api, people[0], 26, 198)
    else {
      drawView(api, people[0], 26, 98)
      drawView(api, people[1], 127, 97)
      api.rectfill(0, 124, 256, 3, 7)
    }
  }
  const inspect = () => JSON.parse(JSON.stringify({ phase, winner, ticks, people, acts }))
  return { init, update, draw, inspect }
}
