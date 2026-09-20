// <arcade-catalog-bundle>
// sky-racer@1.0.0 a20db7a7d21b20fd5e8ed7cd70b0401ad8f46c19042120a5f8d5bf1921775fad
const ARCADE = Object.freeze({
"skyRacer": (function skyRacer(config = {}) {
  const allowed = ['rivalSpeed', 'boostCooldown', 'planePalette', 'courseNames', 'racerNames']
  for (const key of Object.keys(config))
    if (!allowed.includes(key)) throw new Error('Unknown skyRacer setting: ' + key)
  const rivalSpeed = config.rivalSpeed ?? 1
  const boostCooldown = config.boostCooldown ?? 2.7
  if (!Number.isFinite(rivalSpeed) || rivalSpeed < 0.6 || rivalSpeed > 1.3)
    throw new Error('rivalSpeed must be 0.6..1.3')
  if (!Number.isFinite(boostCooldown) || boostCooldown < 0.7 || boostCooldown > 8)
    throw new Error('boostCooldown must be 0.7..8 seconds')
  if (
    config.planePalette &&
    (!Array.isArray(config.planePalette) ||
      config.planePalette.length !== 8 ||
      config.planePalette.some((c) => typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)))
  )
    throw new Error('planePalette needs eight hex colors')
  for (const [key, length] of [
    ['courseNames', 3],
    ['racerNames', 4],
  ])
    if (
      config[key] &&
      (!Array.isArray(config[key]) ||
        config[key].length !== length ||
        config[key].some((s) => typeof s !== 'string' || !s.trim()))
    )
      throw new Error(key + ' needs ' + length + ' nonempty names')
  function cleanName(s) {
    return s.toUpperCase().slice(0, 18)
  }
  const PLANE_PALETTE = config.planePalette
    ? config.planePalette.slice()
    : ['#182747', '#ce354a', '#ff6570', '#fff1d0', '#c6bca9', '#2469b3', '#71dafa', '#ffffff']
  const PLANE = [
    '...........33...........',
    '..........3773..........',
    '..........3113..........',
    '..........1551..........',
    '.........315513.........',
    '........33166133........',
    '......333311113333......',
    '..33333333111133333333..',
    '331111333311113333111133',
    '332223333311113333222233',
    '..........3113..........',
    '..........3113..........',
    '.........331133.........',
    '.......3311111133.......',
    '.......3331331333.......',
    '..........1331..........',
  ]
  const BANK = [
    '...........33...........',
    '..........3773..........',
    '..........3113..........',
    '..........1551..........',
    '.........315513.........',
    '........3316613.........',
    '......333311113.........',
    '..33333333111133........',
    '331111333311113333......',
    '33222333331111331133....',
    '..........31133322333...',
    '..........3113..........',
    '.........331133.........',
    '.......331111133........',
    '.......333133133........',
    '..........1331..........',
  ]
  const BIPLANE = [
    '.........77.........',
    '........7997........',
    '..aaaaaaaaaaaaaaaa..',
    '.aa9999999999999aaa.',
    '..a..a..9cc9..a..a..',
    '..a..a..9cc9..a..a..',
    '.aa9999999999999aaa.',
    '..aaaaaaaaaaaaaaaa..',
    '........9999........',
    '........7997........',
    '......aa9999aa......',
    '......aaaaaaaa......',
    '.........99.........',
  ]
  const JET = [
    '.........b.........',
    '........b7b........',
    '........bcb........',
    '.......bbccb.......',
    '.......bbccb.......',
    '......bbbbb3b......',
    '.....bbbbbbb3b.....',
    '....bbbbbbbbb3b....',
    '..bbbbbbbbbbbbb3b..',
    '.bb33bbbbbbbbb33bb.',
    '.......bb3bb.......',
    '......bbb3bbb......',
    '......3b...b3......',
  ]
  const SEAPLANE = [
    '.........dd.........',
    '........d77d........',
    '........dccd........',
    '........dccd........',
    '......ddd66ddd......',
    '..ddddddd66ddddddd..',
    '.dd222ddd66ddd222dd.',
    '....dd..d66d..dd....',
    '....66..d66d..66....',
    '....66..d66d..66....',
    '....66.dd66dd.66....',
    '....66.dddddd.66....',
    '....55...dd...55....',
  ]
  const COURSE_NAMES = config.courseNames
    ? config.courseNames.map(cleanName)
    : ['CORAL COAST', 'CLOUD GARDEN', 'TEMPEST PASS']
  const LEVEL_NAMES = ['LOW', 'MID', 'HIGH']
  const ITEM_NAMES = ['GUST', 'BALLOON', 'PUFF']
  const RACER_NAMES = config.racerNames
    ? config.racerNames.map((name) => cleanName(name).slice(0, 9))
    : ['RED COMET', 'GOLD WING', 'GREEN JET', 'VIOLET']
  const RACER_COLORS = [8, 10, 11, 13]
  const POINTS = [15, 10, 6, 3]
  const LAP_LENGTH = 1800
  const RACE_LENGTH = 5400
  const CHECKPOINTS = [300, 630, 960, 1290, 1700]

  let player, rivals, objects, particles, missiles
  let race, phase, elapsed, resultClock, cupPoints, finishOrder
  let message, messageTime, hitSerial, altitudeRepeat, racePlace, finished
  let backdropSeed

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v))
  }
  function centerAt(s) {
    const d = ((s % LAP_LENGTH) + LAP_LENGTH) % LAP_LENGTH
    const fade = Math.min(d / 300, (LAP_LENGTH - d) / 170, 1)
    return 128 + fade * (Math.sin(d / 290 + race * 0.55) * (12 + race * 8) + Math.sin(d / 117) * 6)
  }
  function widthAt(s) {
    return 190 - race * 5 - 8 * Math.sin(s / 410) ** 2
  }
  function screenY(s) {
    return 174 - (s - player.s) * 0.65
  }
  function objectX(o, t) {
    return o.x + (o.move ? Math.sin(t * 1.3 + o.s * 0.017) * o.move : 0)
  }
  function announce(text, duration) {
    message = text
    messageTime = duration || 1.5
  }
  function burst(x, s, color, count) {
    for (let i = 0; i < count; i++) {
      if (particles.length >= 100) particles.shift()
      particles.push({
        x: x,
        s: s,
        vx: (Math.random() - 0.5) * 80,
        vs: (Math.random() - 0.5) * 110,
        life: 0.35 + Math.random() * 0.4,
        color: color,
      })
    }
  }
  function addObject(type, s, x, alt, extra) {
    const o = {
      type: type,
      s: s,
      x: x,
      alt: alt,
      done: false,
      cool: 0,
      move: 0,
      aiMask: 0,
      pending: 0,
      serial: -1,
    }
    if (extra) {
      for (const key in extra) o[key] = extra[key]
    }
    objects.push(o)
  }
  function makeCourse() {
    objects = []
    for (let lap = 0; lap < 3; lap++) {
      const base = lap * LAP_LENGTH
      addObject('crate', base + 100, centerAt(base + 100), 1)
      addObject('ring', base + 205, centerAt(base + 205), 1)
      for (let k = 0; k < 5; k++) {
        const s = base + CHECKPOINTS[k]
        addObject('gate', s, centerAt(s), -1, {
          half: k === 0 ? 73 : 57 - race * 2,
          number: k + 1,
        })
      }
      // The opening straight is safe even without steering or items.
      addObject('cloud', base + 735, centerAt(base + 735) - 34, 1, {
        move: race > 0 || lap > 0 ? 17 : 0,
      })
      addObject('crate', base + 805, centerAt(base + 805) + 49, 2)
      addObject('ring', base + 875, centerAt(base + 875) + 49, 2)
      addObject('balloon', base + 1080, centerAt(base + 1080) + 43, 2, { move: 9 + race * 3 })
      addObject('cloud', base + 1180, centerAt(base + 1180) - 29, 0, { move: 12 + race * 4 })
      addObject('crate', base + 1355, centerAt(base + 1355) - 42, 0)
      addObject('ring', base + 1450, centerAt(base + 1450) - 48, 2)
      if (race > 0 || lap > 0) {
        addObject('wind', base + 985, centerAt(base + 985), -1, {
          length: 165,
          dir: (lap + race) % 2 ? -1 : 1,
        })
        addObject('cloud', base + 1490, centerAt(base + 1490) + 32, 1, { move: 20 })
      }
      if (race === 2) {
        addObject('balloon', base + 490, centerAt(base + 490) - 40, 2, { move: 15 })
      }
    }
    objects.sort((a, b) => a.s - b.s)
  }
  function startRace(api) {
    phase = 'race'
    elapsed = 0
    resultClock = 0
    hitSerial = 0
    altitudeRepeat = 0
    racePlace = 1
    player = {
      x: 128,
      s: 0,
      vx: 0,
      alt: 1,
      visualAlt: 1,
      item: 0,
      boost: 0,
      cooldown: 0,
      spin: 0,
      inv: 3.1,
      spins: 0,
      crash: 0,
      checkpoint: 0,
      assist: 0,
      time: 0,
      finished: false,
    }
    rivals = []
    for (let i = 0; i < 3; i++) {
      rivals.push({
        id: i + 1,
        x: 75 + i * 52,
        s: 23 + i * 17,
        alt: i,
        slow: 0,
        fog: 0,
        hurt: 0,
        baseSpeed: (134 + i * 4 + race * 2) * rivalSpeed,
        finished: false,
        time: 0,
      })
    }
    particles = []
    missiles = []
    finishOrder = [0, 1, 2, 3]
    makeCourse()
    announce('RACE ' + (race + 1) + '  ' + COURSE_NAMES[race], 2.3)
    api.tone(660, 100, 'triangle')
  }
  function init(api) {
    if (api.players !== 1) throw new Error('skyRacer supports one player')
    race = 0
    finished = false
    cupPoints = [0, 0, 0, 0]
    backdropSeed = Math.random() * 100
    message = ''
    messageTime = 0
    api.score(0)
    startRace(api)
  }
  function spinOut(api, why) {
    if (player.inv > 0 || player.crash > 0) return
    hitSerial++
    player.spins++
    player.spin = 1
    player.inv = 1.8
    player.boost = 0
    player.vx *= -0.25
    burst(player.x, player.s, 15, 14)
    api.sfx('hit')
    api.shake(5)
    announce(why + ' - SPIN ' + player.spins + '/3', 1.3)
    if (player.spins >= 3) {
      player.crash = 3
      player.spin = 0
      player.inv = 4.8
      api.sfx('explode')
      api.flash(15, 2)
      announce('CRASH! CHECKPOINT RESCUE', 3)
    }
  }
  function useItem(api) {
    if (player.item < 0) {
      announce('FIND A FLOATING CRATE', 0.9)
      api.tone(160, 50, 'triangle')
      return
    }
    const item = player.item
    player.item = -1
    if (item === 0) {
      player.boost = Math.max(player.boost, 1.2)
      burst(player.x, player.s - 12, 12, 10)
      api.sfx('powerup')
      announce('BLUE GUST!', 0.8)
    } else if (item === 1) {
      let target = -1
      let best = Infinity
      for (let i = 0; i < rivals.length; i++) {
        if (rivals[i].finished) continue
        const d = Math.abs(rivals[i].s - player.s)
        if (d < best) {
          best = d
          target = i
        }
      }
      if (target >= 0) {
        missiles.push({ x: player.x, s: player.s + 12, life: 1.1, target: target })
      }
      api.sfx('shoot')
      announce('HOMING BALLOON!', 0.9)
    } else {
      for (let i = 0; i < rivals.length; i++) {
        if (Math.abs(rivals[i].s - player.s) < 420 && !rivals[i].finished) {
          rivals[i].fog = 2.6
          rivals[i].slow = Math.max(rivals[i].slow, 1.4)
        }
      }
      burst(player.x, player.s, 7, 24)
      api.sfx('shoot')
      announce('CLOUD COVER!', 0.9)
    }
  }
  function updateRivals(api, dt) {
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i]
      if (r.finished) continue
      r.slow = Math.max(0, r.slow - dt)
      r.fog = Math.max(0, r.fog - dt)
      r.hurt = Math.max(0, r.hurt - dt)
      let target = centerAt(r.s + 75) + (i - 1) * 34
      let targetAlt = i
      for (let j = 0; j < objects.length; j++) {
        const o = objects[j]
        const ahead = o.s - r.s
        if (ahead < 0 || ahead > 145) continue
        if (o.type === 'gate') target = clamp(target, o.x - o.half + 15, o.x + o.half - 15)
        if (
          (o.type === 'cloud' || o.type === 'balloon') &&
          o.alt === r.alt &&
          Math.abs(objectX(o, api.t) - target) < 48
        ) {
          target = centerAt(r.s) + (objectX(o, api.t) > centerAt(r.s) ? -49 : 49)
          if (ahead < 90 && Math.sin(o.s + i * 11) > -0.2) targetAlt = (r.alt + 1) % 3
        }
      }
      if (r.fog <= 0) r.alt = targetAlt
      r.x += clamp(target - r.x, -72 * dt, 72 * dt)
      const old = r.s
      let speed = r.baseSpeed + Math.sin(elapsed * 0.8 + i * 3) * 3
      if (r.slow > 0) speed *= 0.56
      if (r.fog > 0) speed *= 0.86
      r.s += speed * dt
      for (let j = 0; j < objects.length; j++) {
        const o = objects[j]
        if (o.s < old || o.s > r.s || o.aiMask & (1 << i)) continue
        o.aiMask |= 1 << i
        if (
          (o.type === 'cloud' || o.type === 'balloon') &&
          r.alt === o.alt &&
          Math.abs(r.x - objectX(o, api.t)) < (o.type === 'cloud' ? 37 : 22)
        ) {
          r.slow = 1.2
          r.hurt = 0.6
          if (Math.abs(r.s - player.s) < 250) burst(r.x, r.s, 6, 5)
        }
        if (o.type === 'ring' && r.alt === o.alt && Math.abs(r.x - o.x) < 19) r.s += 34
      }
      if (r.s >= RACE_LENGTH) {
        r.s = RACE_LENGTH
        r.finished = true
        r.time = elapsed
      }
    }
  }
  function finishRace(api) {
    player.finished = true
    player.time = elapsed
    finishOrder = [0, 1, 2, 3]
    finishOrder.sort((a, b) => {
      const ra = a === 0 ? player : rivals[a - 1]
      const rb = b === 0 ? player : rivals[b - 1]
      if (ra.finished && rb.finished) return ra.time - rb.time
      if (ra.finished !== rb.finished) return ra.finished ? -1 : 1
      return rb.s - ra.s
    })
    for (let i = 0; i < 4; i++) {
      cupPoints[finishOrder[i]] += POINTS[i]
      if (finishOrder[i] === 0) racePlace = i + 1
    }
    api.addScore(POINTS[racePlace - 1])
    api.sfx(racePlace === 1 ? 'powerup' : 'coin')
    phase = 'result'
    resultClock = 0
    burst(player.x, player.s, 10, 22)
  }
  function update(api, dt) {
    if (finished) return
    messageTime = Math.max(0, messageTime - dt)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.life -= dt
      p.x += p.vx * dt
      p.s += p.vs * dt
      if (p.life <= 0) particles.splice(i, 1)
    }
    if (phase === 'result') {
      resultClock += dt
      if (resultClock > 6 || (resultClock > 1.2 && api.btnp('a'))) {
        if (race < 2) {
          race++
          startRace(api)
        } else {
          finished = true
          const high = Math.max(cupPoints[1], cupPoints[2], cupPoints[3])
          if (cupPoints[0] >= high) {
            api.sfx('powerup')
            api.win()
          } else {
            api.sfx('die')
            api.gameOver()
          }
        }
      }
      return
    }

    elapsed += dt
    player.boost = Math.max(0, player.boost - dt)
    player.cooldown = Math.max(0, player.cooldown - dt)
    player.inv = Math.max(0, player.inv - dt)
    player.spin = Math.max(0, player.spin - dt)
    player.assist = Math.max(0, player.assist - dt)
    updateRivals(api, dt)

    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i]
      const r = rivals[m.target]
      m.life -= dt
      m.x += (r.x - m.x) * Math.min(1, dt * 5)
      m.s += (r.s - m.s) * Math.min(1, dt * 5)
      if (m.life <= 0) {
        r.slow = 3
        r.hurt = 0.75
        burst(r.x, r.s, 14, 12)
        api.sfx('hit')
        announce('RIVAL TANGLED!', 1)
        missiles.splice(i, 1)
      }
    }

    for (let i = 0; i < objects.length; i++) {
      const o = objects[i]
      o.cool = Math.max(0, o.cool - dt)
      if (o.pending > 0) {
        o.pending -= dt
        if (o.pending <= 0 && o.serial === hitSerial) {
          api.addScore(50)
          api.sfx('coin')
          announce('CLEAN SHORTCUT +50', 1)
          burst(player.x, player.s, 10, 12)
        }
      }
    }

    if (player.crash > 0) {
      player.crash -= dt
      if (player.crash <= 0) {
        player.s = player.checkpoint + 18
        player.x = centerAt(player.s)
        player.vx = 0
        player.spins = 0
        player.alt = 1
        player.inv = 1.8
        api.sfx('select')
        announce('BACK IN THE RACE!', 1.2)
      }
      return
    }

    altitudeRepeat -= dt
    const vertical = (api.btn('up') ? 1 : 0) - (api.btn('down') ? 1 : 0)
    if (player.spin <= 0) {
      if (vertical !== 0 && (altitudeRepeat <= 0 || api.btnp('up') || api.btnp('down'))) {
        const oldAlt = player.alt
        player.alt = clamp(player.alt + vertical, 0, 2)
        altitudeRepeat = 0.33
        if (oldAlt !== player.alt) {
          api.tone(330 + player.alt * 160, 65, 'triangle')
          burst(player.x, player.s, 6, 4)
        }
      }
      if (!vertical) altitudeRepeat = 0
      if (api.btnp('a')) useItem(api)
      if (api.btnp('b') && player.cooldown <= 0) {
        player.boost = Math.max(player.boost, 0.7)
        player.cooldown = boostCooldown
        api.sfx('powerup')
        burst(player.x, player.s - 12, 12, 8)
      }
    }
    player.visualAlt += (player.alt - player.visualAlt) * Math.min(1, dt * 12)

    let steer = (api.btn('right') ? 1 : 0) - (api.btn('left') ? 1 : 0)
    if (player.spin > 0) steer = 0
    const maxSteer = player.boost > 0 ? 159 : 138
    player.vx += (steer * maxSteer - player.vx) * dt * (steer ? 6.5 : 4.5)
    player.x += player.vx * dt
    if (player.assist > 0 && !steer) {
      let next = null
      for (let i = 0; i < objects.length; i++) {
        if (objects[i].type === 'gate' && objects[i].s > player.s + 5) {
          next = objects[i]
          break
        }
      }
      if (next) player.x += clamp(next.x - player.x, -70 * dt, 70 * dt)
    }
    let speed = player.spin > 0 ? 48 : player.boost > 0 ? 220 : 148
    for (let i = 0; i < objects.length; i++) {
      const o = objects[i]
      if (o.type === 'wind' && player.s > o.s && player.s < o.s + o.length && player.alt > 0) {
        player.x += o.dir * (player.alt === 2 ? 39 : 22) * dt
        speed += 12
      }
    }
    const oldS = player.s
    player.s += speed * dt
    player.x = clamp(player.x, 13, 243)
    const c = centerAt(player.s)
    const half = widthAt(player.s) * 0.5
    if (Math.abs(player.x - c) > half - 8 && elapsed > 3.2) {
      spinOut(api, 'CLIFF CLIP')
      player.x = clamp(player.x, c - half + 9, c + half - 9)
      player.assist = 1.5
    }

    for (let i = 0; i < objects.length; i++) {
      const o = objects[i]
      const ox = objectX(o, api.t)
      const dx = Math.abs(player.x - ox)
      const cross = oldS < o.s && player.s >= o.s
      const close = Math.abs(o.s - player.s) < 16
      if (o.type === 'gate' && cross && !o.done) {
        o.done = true
        if (dx < o.half - 5) {
          api.addScore(10)
          api.sfx('coin')
          player.checkpoint = o.s
          burst(player.x, player.s, 11, 5)
        } else {
          spinOut(api, 'MISSED GATE')
          player.assist = 2.5
          if (player.spin <= 0) announce('FOLLOW THE NEXT GATE', 1.2)
        }
      } else if (
        o.type === 'crate' &&
        close &&
        dx < 22 &&
        player.alt === o.alt &&
        o.cool <= 0 &&
        player.item < 0 &&
        player.spin <= 0
      ) {
        player.item = o.alt === 2 ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3)
        o.cool = 3
        api.sfx('powerup')
        burst(ox, o.s, 10, 9)
        announce(ITEM_NAMES[player.item] + ' READY', 0.9)
      } else if (o.type === 'ring' && cross && !o.done) {
        o.done = true
        if (dx < 24 && player.alt === o.alt && player.spin <= 0) {
          o.pending = 0.7
          o.serial = hitSerial
          player.boost = Math.max(player.boost, 0.85)
          api.sfx('jump')
          burst(ox, o.s, 10, 12)
          announce('SHORTCUT!', 0.7)
        }
      } else if (
        (o.type === 'cloud' || o.type === 'balloon') &&
        close &&
        dx < (o.type === 'cloud' ? 36 : 21) &&
        player.alt === o.alt
      ) {
        spinOut(api, o.type === 'cloud' ? 'CLOUD WALL' : 'STORM BALLOON')
      }
    }
    if (player.boost > 0 && api.frame % 3 === 0) {
      burst(player.x - player.vx * 0.018, player.s - 20, 12, 1)
    }
    racePlace = 1
    for (let i = 0; i < rivals.length; i++) {
      if (rivals[i].s > player.s || rivals[i].finished) racePlace++
    }
    if (player.s >= RACE_LENGTH && player.crash <= 0) finishRace(api)
  }

  function altitudeBadge(api, x, y, alt) {
    api.rectfill(x - 7, y, 15, 6, 1)
    for (let i = 0; i < 3; i++) {
      api.rectfill(x - 5 + i * 4, y + 4 - i, 3, 1 + i, i === alt ? 10 : 5)
    }
  }
  function drawCloud(api, x, y, dangerous) {
    api.circfill(x - 16, y + 4, 14, dangerous ? 1 : 6)
    api.circfill(x + 16, y + 3, 15, dangerous ? 1 : 6)
    api.rectfill(x - 23, y, 45, 15, dangerous ? 1 : 6)
    api.circfill(x - 19, y - 3, 12, 6)
    api.circfill(x, y - 8, 17, 7)
    api.circfill(x + 19, y - 3, 12, 7)
    api.rectfill(x - 23, y - 3, 46, 10, 7)
    api.line(x - 20, y + 8, x + 21, y + 8, 6)
    if (dangerous) {
      api.line(x - 5, y + 1, x + 1, y - 3, 1)
      api.line(x + 1, y - 3, x - 1, y + 3, 1)
      api.line(x - 1, y + 3, x + 5, y, 1)
    }
  }
  function drawBackground(api) {
    api.rectfill(0, 12, 256, 212, 12)
    // Quiet blue currents, followed by scalloped island cliffs.
    for (let y = 41; y < 211; y += 6) {
      const s = player.s + (174 - y) / 0.65
      const c = centerAt(s)
      const half = widthAt(s) / 2
      const left = c - half
      const right = c + half
      api.rectfill(0, y, left - 4, 6, 3)
      api.rectfill(left - 6, y, 7, 6, 11)
      api.rectfill(left, y, 4, 6, 15)
      api.rectfill(left + 4, y, 3, 6, 1)
      api.rectfill(right - 3, y, 3, 6, 1)
      api.rectfill(right, y, 4, 6, 15)
      api.rectfill(right + 4, y, 6, 6, 11)
      api.rectfill(right + 10, y, 256 - right, 6, 3)
      if (Math.floor(s / 31) % 3 === 0) {
        api.line(left + 14, y + 1, left + 20, y + 1, 6)
        api.line(right - 18, y + 1, right - 12, y + 1, 6)
      }
    }
    for (let i = 0; i < 11; i++) {
      const sy = 44 + ((i * 47 + player.s * 0.31) % 164)
      const side = i % 2
      const sx = side ? 245 - (i % 3) * 3 : 5 + (i % 3) * 3
      api.circfill(sx + 2, sy + 2, 6, 1)
      api.circfill(sx, sy, 6, 3)
      api.circfill(sx - 1, sy - 2, 4, 11)
    }
    for (let i = 0; i < 13; i++) {
      const x = 43 + ((i * 43 + Math.floor(backdropSeed)) % 172)
      const y = 42 + ((i * 37 + player.s * 0.21) % 164)
      api.line(x, y, x + 4, y, 6)
    }
  }
  function drawObject(api, o) {
    const y = screenY(o.s)
    const x = objectX(o, api.t)
    if (o.type === 'wind') {
      const end = screenY(o.s + o.length)
      if (y < 41 || end > 207) return
      for (let yy = Math.max(45, end); yy < Math.min(204, y); yy += 19) {
        for (let xx = 65; xx < 212; xx += 37) {
          const scroll = (api.frame % 20) * o.dir * 0.65
          const ax = xx + scroll
          api.line(ax - 7 * o.dir, yy, ax + 7 * o.dir, yy, 6)
          api.line(ax + 7 * o.dir, yy, ax + 3 * o.dir, yy - 3, 6)
          api.line(ax + 7 * o.dir, yy, ax + 3 * o.dir, yy + 3, 6)
        }
      }
      return
    }
    if (y < 23 || y > 242) return
    if (o.type === 'gate') {
      const l = x - o.half
      const r = x + o.half
      api.line(l, y + 5, r, y + 5, 1)
      for (let xx = l + 7; xx < r - 4; xx += 10) {
        api.line(xx, y, xx + 4, y, o.done ? 11 : 7)
      }
      for (let side = 0; side < 2; side++) {
        const gx = side ? r : l
        api.circfill(gx + 3, y + 10, 7, 1)
        api.rectfill(gx - 3, y - 13, 6, 22, 7)
        api.rectfill(gx - 3, y - 9, 6, 5, 8)
        api.rectfill(gx - 3, y + 1, 6, 5, 8)
        api.line(gx, y - 20, gx, y - 10, 1)
        api.rectfill(gx, y - 20, side ? -1 : 1, 1, 7)
        api.rectfill(gx - (side ? 12 : 0), y - 20, 12, 6, o.done ? 11 : 9)
      }
      api.text('' + o.number, x - 4, y - 12, o.done ? 11 : 7)
    } else if (o.type === 'crate') {
      if (o.cool > 0) {
        api.rect(x - 5, y - 5, 10, 10, 6)
        return
      }
      const bob = Math.sin(api.t * 5 + o.s) * 2
      api.circfill(x + 5, y + 11, 7, 1)
      api.rectfill(x - 6, y - 6 + bob, 12, 12, 4)
      api.rectfill(x - 5, y - 7 + bob, 10, 10, o.alt === 2 ? 14 : 10)
      api.line(x - 4, y - 6 + bob, x + 3, y - 6 + bob, 7)
      api.text('?', x - 4, y - 6 + bob, 1)
      altitudeBadge(api, x, y + 13, o.alt)
    } else if (o.type === 'ring') {
      api.circ(x + 5, y + 9, 18, 1)
      api.circ(x, y, 19, o.done ? 6 : 9)
      api.circ(x, y, 18, o.done ? 6 : 10)
      api.circ(x, y, 16, o.done ? 6 : 10)
      api.line(x - 11, y - 14, x - 5, y - 17, 7)
      if (!o.done) {
        api.line(x - 6, y + 2, x, y - 4, 7)
        api.line(x, y - 4, x + 6, y + 2, 7)
        altitudeBadge(api, x, y + 21, o.alt)
      }
    } else if (o.type === 'cloud') {
      drawCloud(api, x, y, true)
      altitudeBadge(api, x, y + 18, o.alt)
    } else if (o.type === 'balloon') {
      api.circfill(x + 8, y + 14, 13, 1)
      api.line(x, y + 7, x - 3, y + 19, 6)
      api.circfill(x, y - 4, 12, 2)
      api.circfill(x - 1, y - 6, 10, 8)
      api.circfill(x - 5, y - 10, 3, 15)
      api.line(x + 2, y - 12, x - 3, y - 4, 10)
      api.line(x - 3, y - 4, x + 3, y - 4, 10)
      api.line(x + 3, y - 4, x - 1, y + 3, 10)
      altitudeBadge(api, x, y + 23, o.alt)
    }
  }
  function drawRival(api, r, index) {
    if (r.finished) return
    const y = screenY(r.s)
    if (y < 34 || y > 225) return
    const x = r.x
    api.circfill(x + 5 + r.alt * 2, y + 12 + r.alt * 3, 7, 1)
    api.line(x - 9 + r.alt * 2, y + 12 + r.alt * 3, x + 17, y + 12 + r.alt * 3, 1)
    if (r.hurt > 0 && api.frame % 6 < 3) {
      api.line(x - 12, y - 9, x + 12, y + 9, RACER_COLORS[index + 1])
      api.line(x + 9, y - 12, x - 9, y + 12, 7)
    } else {
      const sprite = index === 0 ? BIPLANE : index === 1 ? JET : SEAPLANE
      api.spr(sprite, x - 10, y - 7)
      if (index !== 1)
        api.line(x - (api.frame % 4 < 2 ? 7 : 3), y - 9, x + (api.frame % 4 < 2 ? 7 : 3), y - 9, 7)
      else api.rectfill(x - 2, y + 6, 4, 3 + (api.frame % 4), 9)
    }
    if (r.fog > 0) {
      api.circfill(x - 8, y + 2, 7, 6)
      api.circfill(x + 6, y - 3, 8, 7)
    }
  }
  function drawPlayer(api) {
    const x = player.x
    const y = 174
    const shadow = 8 + player.visualAlt * 5
    api.circfill(x + shadow, y + shadow, 7, 1)
    api.line(x - 11 + shadow, y + shadow, x + 11 + shadow, y + shadow, 1)
    if (player.crash > 0) {
      const a = api.t * 9
      api.line(
        x - Math.cos(a) * 15,
        y - Math.sin(a) * 15,
        x + Math.cos(a) * 15,
        y + Math.sin(a) * 15,
        8,
      )
      api.line(
        x + Math.sin(a) * 10,
        y - Math.cos(a) * 10,
        x - Math.sin(a) * 10,
        y + Math.cos(a) * 10,
        15,
      )
      api.circfill(x, y, 5 + (api.frame % 4), 9)
      api.circfill(x, y, 3, 10)
      for (let i = 0; i < 4; i++) {
        api.circfill(x + Math.sin(api.t * 4 + i) * 8, y - 8 - i * 9, 5 + i, i % 2 ? 5 : 6)
      }
      api.textCenter('RESCUE ' + Math.ceil(player.crash), 145, 7)
      return
    }
    if (player.inv > 0 && api.frame % 6 < 2) return
    if (player.boost > 0) {
      const len = 13 + (api.frame % 7)
      api.line(x - 3, y + 8, x, y + len + 8, 12)
      api.line(x + 3, y + 8, x, y + len + 8, 12)
      api.rectfill(x - 2, y + 8, 4, len, 6)
      api.line(x, y + 8, x, y + len + 5, 7)
      api.line(x - 20, y + 3, x - 20, y + 17, 7)
      api.line(x + 20, y + 3, x + 20, y + 17, 7)
    }
    if (player.spin > 0) {
      const a = api.t * 17
      api.line(
        x - Math.cos(a) * 14,
        y - Math.sin(a) * 14,
        x + Math.cos(a) * 14,
        y + Math.sin(a) * 14,
        15,
      )
      api.line(
        x - Math.cos(a) * 13,
        y - Math.sin(a) * 13 + 1,
        x + Math.cos(a) * 13,
        y + Math.sin(a) * 13 + 1,
        8,
      )
      api.line(
        x - Math.sin(a) * 9,
        y + Math.cos(a) * 9,
        x + Math.sin(a) * 9,
        y - Math.cos(a) * 9,
        8,
      )
      api.circfill(x, y, 3, 6)
      api.circ(x, y, 19, 7)
    } else {
      const banking = Math.abs(player.vx) > 32
      api.spr(banking ? BANK : PLANE, x - 12, y - 8, banking && player.vx > 0, false, PLANE_PALETTE)
      const prop = api.frame % 4 < 2 ? 8 : 3
      api.line(x - prop, y - 10, x + prop, y - 10, 7)
      api.pset(x, y - 11, 1)
    }
    for (let i = 0; i < 3; i++) {
      api.rectfill(x - 6 + i * 5, y + 21, 3, 3, i === player.alt ? 10 : 1)
    }
  }
  function drawHUD(api) {
    api.rectfill(0, 12, 256, 29, 1)
    api.text(
      'R' + (race + 1) + ' LAP ' + Math.min(3, Math.floor(player.s / LAP_LENGTH) + 1) + '/3',
      5,
      15,
      7,
    )
    api.text('' + racePlace + '/4', 120, 15, 10)
    const seconds = Math.floor(elapsed)
    const timeText =
      Math.floor(seconds / 60) + ':' + (seconds % 60 < 10 ? '0' : '') + (seconds % 60)
    api.text(timeText, 207, 15, 7)
    api.text('HULL', 5, 29, 6)
    for (let i = 0; i < 3; i++) {
      api.rectfill(43 + i * 9, 29, 6, 6, i < 3 - player.spins ? 11 : 5)
    }
    api.text('CUP ' + cupPoints[0], 91, 29, 6)
    api.text(LEVEL_NAMES[player.alt], 208, 29, 10)
    api.rectfill(0, 209, 256, 15, 1)
    api.text(
      'A:' + (player.item < 0 ? 'EMPTY' : ITEM_NAMES[player.item]),
      4,
      214,
      player.item < 0 ? 6 : 7,
    )
    api.text('B', 120, 214, player.cooldown <= 0 ? 11 : 6)
    api.rect(133, 214, 44, 7, 6)
    api.rectfill(135, 216, 40 * (1 - player.cooldown / 2.7), 3, player.cooldown <= 0 ? 11 : 12)
    api.text('ALT', 189, 214, 6)
    for (let i = 0; i < 3; i++) {
      api.rectfill(219 + i * 10, 219 - i * 2, 7, 2 + i * 2, player.alt === i ? 10 : 5)
    }
    // Tiny course ribbon; no second score display.
    api.rectfill(249, 46, 5, 155, 1)
    for (let i = 0; i < 3; i++) {
      api.rectfill(249, 199 - (i + 1) * 50, 5, 1, 6)
    }
    for (let i = 0; i < 3; i++) {
      api.rectfill(250, 198 - (rivals[i].s / RACE_LENGTH) * 150, 3, 3, RACER_COLORS[i + 1])
    }
    api.rectfill(248, 198 - (player.s / RACE_LENGTH) * 150, 7, 3, 8)
    if (messageTime > 0) {
      const w = api.textWidth(message)
      api.rectfill((256 - w) / 2 - 4, 44, w + 8, 12, 1)
      api.textCenter(message, 46, 7)
    }
  }
  function drawResult(api) {
    api.rectfill(17, 57, 222, 139, 1)
    api.rect(19, 59, 218, 135, 6)
    api.textCenter(race === 2 ? 'CUP COMPLETE' : 'RACE COMPLETE', 67, 10)
    api.textCenter('PLACE ' + racePlace + '  +' + POINTS[racePlace - 1] + ' PTS', 82, 7)
    api.text('FINISH', 29, 99, 6)
    api.text('CUP', 193, 99, 6)
    for (let i = 0; i < 4; i++) {
      const id = finishOrder[i]
      const y = 113 + i * 15
      api.text(i + 1 + ' ' + RACER_NAMES[id], 29, y, RACER_COLORS[id])
      api.text('' + cupPoints[id], 199, y, id === 0 ? 7 : 6)
    }
    if (resultClock > 1.2) api.textCenter(race === 2 ? 'A: CUP RESULTS' : 'A: NEXT RACE', 179, 7)
  }
  function draw(api) {
    api.cls(1)
    drawBackground(api)
    for (let i = 0; i < objects.length; i++) {
      if (objects[i].type === 'wind') drawObject(api, objects[i])
    }
    for (let i = 0; i < objects.length; i++) {
      if (objects[i].type !== 'wind') drawObject(api, objects[i])
    }
    const finishY = screenY(RACE_LENGTH)
    if (finishY > 39 && finishY < 209) {
      for (let x = 37; x < 222; x += 9) {
        for (let row = 0; row < 2; row++) {
          api.rectfill(x, finishY + row * 7, 9, 7, (Math.floor((x - 37) / 9) + row) % 2 ? 1 : 7)
        }
      }
      api.textCenter('FINISH', finishY - 12, 7)
    }
    for (let i = 0; i < rivals.length; i++) drawRival(api, rivals[i], i)
    for (let i = 0; i < missiles.length; i++) {
      const m = missiles[i]
      const y = screenY(m.s)
      api.line(m.x, y + 4, m.x - 3, y + 16, 7)
      api.circfill(m.x, y, 7, 14)
      api.circfill(m.x - 2, y - 3, 2, 7)
    }
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const y = screenY(p.s)
      api.rectfill(p.x, y, p.life > 0.3 ? 3 : 2, 2, p.color)
    }
    drawPlayer(api)
    drawHUD(api)
    if (phase === 'result') drawResult(api)
  }

  return {
    init,
    update,
    draw,
    inspect() {
      return {
        race,
        phase,
        finished,
        racePlace,
        elapsed,
        cupPoints: cupPoints.slice(),
        player: { ...player },
        rivals: rivals.map((r) => ({ ...r })),
        objects: objects.map((o) => ({ ...o })),
        particleCount: particles.length,
      }
    },
  }
})
});
// </arcade-catalog-bundle>
let skyKart;

function init(api) {
  skyKart = ARCADE.skyRacer({});
  skyKart.init(api);
}

function update(api, dt) {
  skyKart.update(api, dt);
}

function draw(api) {
  api.cls(12);
  skyKart.draw(api);
}
