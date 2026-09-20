(config = {}) => {
  const ART = {"sets":{"ship":{"width":18,"height":20,"frames":{"idle-0":{"pixels":["..................","........77........","........77........","........77........","........77........",".......cccc.......",".......c11c.......",".......c11c.......",".......c11c.......","......cc11cc......","......cc11cc......","...7777cccc7777...","...7777cccc7777...","...7777cccc7777...",".ccccc7cccc7ccccc.",".ccccc7cccc7ccccc.",".ccccc111111ccccc.","....aa11111199....","....aa......99....",".................."],"durationMs":140,"anchor":{"x":9,"y":10},"hurtboxes":[{"x":4,"y":5,"w":10,"h":12}],"hitboxes":[]},"idle-1":{"pixels":["..................","........77........","........77........","........77........","........77........",".......cccc.......",".......c11c.......",".......c11c.......",".......c11c.......","......cc11cc......","......cc11cc......","...7777cccc7777...","...7777cccc7777...","...7777cccc7777...",".ccccc7cccc7ccccc.",".ccccc7cccc7ccccc.",".ccccc111111ccccc.","....99111111aa....","....99......aa....",".................."],"durationMs":140,"anchor":{"x":9,"y":10},"hurtboxes":[{"x":4,"y":5,"w":10,"h":12}],"hitboxes":[]},"fire-0":{"pixels":["........aa........","......aaaaaa......","........aa........","........aa........","........77........",".......cccc.......",".......c11c.......",".......c11c.......",".......c11c.......","......cc11cc......","......cc11cc......","...7777cccc7777...","...7777cccc7777...","...7777cccc7777...",".ccccc7cccc7ccccc.",".ccccc7cccc7ccccc.",".ccccc111111ccccc.","....aa11111199....","....aa......99....",".................."],"durationMs":70,"anchor":{"x":9,"y":10},"hurtboxes":[{"x":4,"y":5,"w":10,"h":12}],"hitboxes":[]},"fire-1":{"pixels":["........77........","......aaaaaa......","........77........","........77........","........77........",".......cccc.......",".......c11c.......",".......c11c.......",".......c11c.......","......cc11cc......","......cc11cc......","...7777cccc7777...","...7777cccc7777...","...7777cccc7777...",".ccccc7cccc7ccccc.",".ccccc7cccc7ccccc.",".ccccc111111ccccc.","....99111111aa....","....99......aa....",".................."],"durationMs":70,"anchor":{"x":9,"y":10},"hurtboxes":[{"x":4,"y":5,"w":10,"h":12}],"hitboxes":[]},"shield-0":{"pixels":["..c............c..","..c.....77.....c..",".c......77......c.",".c......77......c.",".c......77......c.",".c.....cccc.....c.","c......c11c......c","c......c11c......c","c......c11c......c","c.....cc11cc.....c","c.....cc11cc.....c","c..7777cccc7777..c","c..7777cccc7777..c","c..7777cccc7777..c",".ccccc7cccc7ccccc.",".ccccc7cccc7ccccc.",".ccccc111111ccccc.",".c..aa11111199..c.","..c.aa......99.c..","..c............c.."],"durationMs":80,"anchor":{"x":9,"y":10},"hurtboxes":[{"x":4,"y":5,"w":10,"h":12}],"hitboxes":[]},"shield-1":{"pixels":["..7............7..","..7.....77.....7..",".7......77......7.",".7......77......7.",".7......77......7.",".7.....cccc.....7.","7......c11c......7","7......c11c......7","7......c11c......7","7.....cc11cc.....7","7.....cc11cc.....7","7..7777cccc7777..7","7..7777cccc7777..7","7..7777cccc7777..7",".7cccc7cccc7cccc7.",".7cccc7cccc7cccc7.",".7cccc111111cccc7.",".7..99111111aa..7.","..7.99......aa.7..","..7............7.."],"durationMs":80,"anchor":{"x":9,"y":10},"hurtboxes":[{"x":4,"y":5,"w":10,"h":12}],"hitboxes":[]}},"animations":{"idle":{"frames":["idle-0","idle-1"],"frameMs":140,"loop":true},"fire":{"frames":["fire-0","fire-1"],"frameMs":70,"loop":false},"shield":{"frames":["shield-0","shield-1"],"frameMs":80,"loop":true}}},"alien0":{"width":16,"height":12,"frames":{"march-0":{"pixels":["................","...bb......bb...","...bbbbbbbbbb...","....bbbbbbbb....","..bbb00bb00bbb..","..bbb00bb00bbb..","..bbbbbbbbbbbb..","..bbbb1111bbbb..",".bbbbbbbbbbbbbb.",".bbbbb....bbbbb.",".bbbbb....bbbbb.","................"],"durationMs":250,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"march-1":{"pixels":["................","...bb......bb...","...bbbbbbbbbb...","....bbbbbbbb....","..bbb00bb00bbb..","..bbb00bb00bbb..",".bbbbbbbbbbbbbb.",".bbbbb1111bbbbb.",".bbbbbbbbbbbbbb.","....bb....bb....","....bb....bb....","................"],"durationMs":250,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"dive-0":{"pixels":["................","...bb......bb...","bbbbbbbbbbbbbbbb","bbb.bbbbbbbb.bbb","bbbbb00bb00bbbbb","bbbbb00bb00bbbbb","bbbbbbbbbbbbbbbb","bbbbbb1111bbbbbb","bbbbbbbbbbbbbbbb",".bbbbb....bbbbb.",".bbbbb.aa.bbbbb.",".......aa......."],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"dive-1":{"pixels":["................","...bb......bb...","...bbbbbbbbbb...","bbb.bbbbbbbb.bbb","bbbbb00bb00bbbbb","bbbbb00bb00bbbbb","bbbbbbbbbbbbbbbb","bbbbbb1111bbbbbb","bbbbbbbbbbbbbbbb","bbb.bb....bb.bbb","....bb.aa.bb....",".......aa......."],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"warn-0":{"pixels":["................","...bb......bb...","...bbbbbbbbbb...","....bbbbbbbb....","..bbbaabbaabbb..","..bbbaabbaabbb..","..bbbbbbbbbbbb..","..bbbb1111bbbb..",".bbbbbbbbbbbbbb.",".bbbbb....bbbbb.",".bbbbb....bbbbb.","................"],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"warn-1":{"pixels":["................","...bb......bb...","...bbbbbbbbbb...","....bbbbbbbb....","..bbbaabbaabbb..","..bbbaabbaabbb..",".bbbbbbbbbbbbbb.",".bbbbb1111bbbbb.",".bbbbbbbbbbbbbb.","....bb....bb....","....bb....bb....","................"],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]}},"animations":{"march":{"frames":["march-0","march-1"],"frameMs":250,"loop":true},"dive":{"frames":["dive-0","dive-1"],"frameMs":100,"loop":true},"warn":{"frames":["warn-0","warn-1"],"frameMs":100,"loop":true}}},"alien1":{"width":16,"height":12,"frames":{"march-0":{"pixels":["......7777......","...ee.7777.ee...","...eee7777eee...","....eeeeeeee....","..eee00ee00eee..","..eee00ee00eee..","..eeeeeeeeeeee..","..eeee1111eeee..",".eeeeeeeeeeeeee.",".eeeee....eeeee.",".eeeee....eeeee.","................"],"durationMs":250,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"march-1":{"pixels":["......7777......","...ee.7777.ee...","...eee7777eee...","....eeeeeeee....","..eee00ee00eee..","..eee00ee00eee..",".eeeeeeeeeeeeee.",".eeeee1111eeeee.",".eeeeeeeeeeeeee.","....ee....ee....","....ee....ee....","................"],"durationMs":250,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"dive-0":{"pixels":["......7777......","...ee.7777.ee...","eeeeee7777eeeeee","eee.eeeeeeee.eee","eeeee00ee00eeeee","eeeee00ee00eeeee","eeeeeeeeeeeeeeee","eeeeee1111eeeeee","eeeeeeeeeeeeeeee",".eeeee....eeeee.",".eeeee.aa.eeeee.",".......aa......."],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"dive-1":{"pixels":["......7777......","...ee.7777.ee...","...eee7777eee...","eee.eeeeeeee.eee","eeeee00ee00eeeee","eeeee00ee00eeeee","eeeeeeeeeeeeeeee","eeeeee1111eeeeee","eeeeeeeeeeeeeeee","eee.ee....ee.eee","....ee.aa.ee....",".......aa......."],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"warn-0":{"pixels":["......7777......","...ee.7777.ee...","...eee7777eee...","....eeeeeeee....","..eeeaaeeaaeee..","..eeeaaeeaaeee..","..eeeeeeeeeeee..","..eeee1111eeee..",".eeeeeeeeeeeeee.",".eeeee....eeeee.",".eeeee....eeeee.","................"],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"warn-1":{"pixels":["......7777......","...ee.7777.ee...","...eee7777eee...","....eeeeeeee....","..eeeaaeeaaeee..","..eeeaaeeaaeee..",".eeeeeeeeeeeeee.",".eeeee1111eeeee.",".eeeeeeeeeeeeee.","....ee....ee....","....ee....ee....","................"],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]}},"animations":{"march":{"frames":["march-0","march-1"],"frameMs":250,"loop":true},"dive":{"frames":["dive-0","dive-1"],"frameMs":100,"loop":true},"warn":{"frames":["warn-0","warn-1"],"frameMs":100,"loop":true}}},"alien2":{"width":16,"height":12,"frames":{"march-0":{"pixels":["................","...99......99...","...9999999999...","....99999999....","9999900990099999","9999900990099999","9999999999999999","9999991111999999","9999999999999999",".99999....99999.",".99999....99999.","................"],"durationMs":250,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"march-1":{"pixels":["................","...99......99...","...9999999999...","....99999999....","9999900990099999","9999900990099999","9999999999999999","9999991111999999","9999999999999999","....99....99....","....99....99....","................"],"durationMs":250,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"dive-0":{"pixels":["................","...99......99...","9999999999999999","999.99999999.999","9999900990099999","9999900990099999","9999999999999999","9999991111999999","9999999999999999",".99999....99999.",".99999.aa.99999.",".......aa......."],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"dive-1":{"pixels":["................","...99......99...","...9999999999...","999.99999999.999","9999900990099999","9999900990099999","9999999999999999","9999991111999999","9999999999999999","999.99....99.999","....99.aa.99....",".......aa......."],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"warn-0":{"pixels":["................","...99......99...","...9999999999...","....99999999....","99999aa99aa99999","99999aa99aa99999","9999999999999999","9999991111999999","9999999999999999",".99999....99999.",".99999....99999.","................"],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]},"warn-1":{"pixels":["................","...99......99...","...9999999999...","....99999999....","99999aa99aa99999","99999aa99aa99999","9999999999999999","9999991111999999","9999999999999999","....99....99....","....99....99....","................"],"durationMs":100,"anchor":{"x":8,"y":6},"hurtboxes":[{"x":2,"y":2,"w":12,"h":8}],"hitboxes":[{"x":3,"y":3,"w":10,"h":7}]}},"animations":{"march":{"frames":["march-0","march-1"],"frameMs":250,"loop":true},"dive":{"frames":["dive-0","dive-1"],"frameMs":100,"loop":true},"warn":{"frames":["warn-0","warn-1"],"frameMs":100,"loop":true}}},"ufo":{"width":24,"height":12,"frames":{"fly-0":{"pixels":["........................","........88888888........","........88eeee88........","........88eeee88........","....8888888888888888....","....8888888888888888....","....8888888888888888....",".77cc777cc777cc777cc777.",".7777777777777777777777.",".7777777777777777777777.","....5555555555555555....","........................"],"durationMs":120,"anchor":{"x":12,"y":6},"hurtboxes":[{"x":2,"y":3,"w":20,"h":7}],"hitboxes":[]},"fly-1":{"pixels":["........................","........88888888........","........88eeee88........","........88eeee88........","....8888888888888888....","....8888888888888888....","....8888888888888888....",".77aa777aa777aa777aa777.",".7777777777777777777777.",".7777777777777777777777.","....5555555555555555....","........................"],"durationMs":120,"anchor":{"x":12,"y":6},"hurtboxes":[{"x":2,"y":3,"w":20,"h":7}],"hitboxes":[]}},"animations":{"fly":{"frames":["fly-0","fly-1"],"frameMs":120,"loop":true}}},"burst":{"width":20,"height":20,"frames":{"burst-0":{"pixels":["....................","....................","....................","....................","....................","....................","....................",".......777777.......",".......777777a......",".......777777aa.....",".......777777aa.....",".......777777aa.....",".......777777aa.....","........aaaaaaa.....",".........aaaaa......","....................","....................","....................","....................","...................."],"durationMs":80,"anchor":{"x":10,"y":10},"hurtboxes":[],"hitboxes":[]},"burst-1":{"pixels":["....................","....................","....................","....................","....................","....................","..........999.......","........9999999.....",".......999999999....",".......9999.9999....","......9999...9999...","......999.....999...","......9999...9999...",".......9999.9999....",".......999999999....","........9999999.....","..........999.......","....................","....................","...................."],"durationMs":80,"anchor":{"x":10,"y":10},"hurtboxes":[],"hitboxes":[]},"burst-2":{"pixels":["....................","....................","....................","....................","..........aa........",".......aa.aa.aa.....",".......aa....aa.....",".....aa........aa...",".....aa........aa...","....................","....aa..........aa..","....aa..........aa..","....................",".....aa........aa...",".....aa........aa...",".......aa....aa.....",".......aa.aa.aa.....","..........aa........","....................","...................."],"durationMs":80,"anchor":{"x":10,"y":10},"hurtboxes":[],"hitboxes":[]},"burst-3":{"pixels":["....................","....................","..........99........","......99..99..99....","......99......99....","....................","...99............99.","...99............99.","....................","....................","..99..............99","..99..............99","....................","....................","...99............99.","...99............99.","....................","......99......99....","......99..99..99....","..........99........"],"durationMs":80,"anchor":{"x":10,"y":10},"hurtboxes":[],"hitboxes":[]}},"animations":{"explode":{"frames":["burst-0","burst-1","burst-2","burst-3"],"frameMs":80,"loop":false}}}}},
    SETS = { ...ART.sets },
    clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  let players = 1,
    waves = 3,
    wave = 1,
    people = [],
    aliens = [],
    shots = [],
    enemyShots = [],
    shields = [],
    bursts = [],
    labels = [],
    stars = []
  let time = 0,
    tick = 0,
    phase = 'playing',
    phaseT = 0,
    marchT = 0,
    formation = { x: 0, y: 0, dir: 1 },
    fireT = 1.7,
    diveT = 4,
    ufoT = 11,
    ufo = null,
    nextId = 1,
    seed = 7,
    difficulty = 0
  const stats = { shots: 0, hits: 0, kills: 0, shieldCells: 0, dives: 0, ufos: 0, waves: 0 }
  function rnd() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  function effect(x, y) {
    bursts.push({ x, y, age: 0 })
  }
  function score(api, p, n) {
    p.score += n
    api.score(p.score, p.id)
  }
  function note(text, x, y) {
    labels.push({ text, x, y, t: 0.7 })
  }
  function makeWave() {
    formation = { x: 0, y: 0, dir: 1 }
    aliens = []
    shots = []
    enemyShots = []
    shields = []
    fireT = 1.7
    diveT = 4
    ufoT = 11
    ufo = null
    marchT = 0
    const cols = clamp((Number(config.columns) || 8) | 0, 4, 8),
      rows = clamp((Number(config.rows) || 4) | 0, 2, 4)
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++)
        aliens.push({
          id: nextId++,
          row,
          col,
          type: row % 3,
          slotX: 128 + (col - (cols - 1) / 2) * 25,
          slotY: 48 + row * 19,
          x: 128 + (col - (cols - 1) / 2) * 25,
          y: 48 + row * 19,
          mode: 'march',
          age: 0,
          hp: 1,
          warn: 0,
        })
    if (config.shields !== false)
      for (const cx of [34, 96, 158, 220]) {
        const cells = []
        for (let y = 0; y < 11; y++)
          for (let x = 0; x < 23; x++) {
            if ((y < 2 && (x < 3 || x > 19)) || (y > 6 && x > 7 && x < 15)) continue
            cells.push({ x: cx - 11 + x, y: 173 + y, alive: true })
          }
        shields.push({ cx, cells })
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
    difficulty = clamp(Number(config.difficulty) || 0, 0, 1)
    bursts = []
    labels = []
    for (const k in stats) stats[k] = 0
    people = Array.from({ length: players }, (_, id) => ({
      id,
      x: players === 2 ? (id ? 173 : 83) : 128,
      y: 204,
      lives: clamp((Number(config.lives) || 3) | 0, 1, 8),
      score: 0,
      shotT: 0,
      shotFlash: 0,
      shield: 0,
      shieldT: 0,
      invulnerable: 1.7,
      dead: 0,
    }))
    for (const p of people) api.score(0, p.id)
    stars = Array.from({ length: 45 }, () => ({
      x: rnd() * 256,
      y: 25 + rnd() * 195,
      speed: 3 + rnd() * 10,
      color: rnd() > 0.7 ? 6 : 1,
    }))
    makeWave()
  }
  function damage(p, api) {
    if (p.lives <= 0 || p.invulnerable > 0 || p.dead > 0 || p.shield > 0) return
    p.lives--
    p.dead = 0.75
    p.invulnerable = 2.5
    stats.hits++
    effect(p.x, p.y)
    api.sfx('die')
    if (typeof config.onHit === 'function') {
      config.onHit({ player: p.id, lives: p.lives, wave }, api)
      p.score = api.getScore(p.id)
    }
  }
  function respawn(p) {
    let best = 128,
      bestGap = -1
    for (let x = 20; x <= 236; x += 24) {
      let gap = 300
      for (const s of enemyShots) gap = Math.min(gap, Math.hypot(s.x - x, s.y - 204))
      for (const a of aliens)
        if (a.mode === 'dive') gap = Math.min(gap, Math.hypot(a.x - x, a.y - 204))
      if (gap > bestGap) {
        best = x
        bestGap = gap
      }
    }
    p.x = best
    p.y = 204
    enemyShots = enemyShots.filter((s) => Math.hypot(s.x - p.x, s.y - p.y) > 30)
    p.invulnerable = 2
  }
  function erode(s) {
    for (const b of shields)
      for (const cell of b.cells) {
        if (cell.alive && Math.abs(cell.x - s.x) < 2 && Math.abs(cell.y - s.y) < 3) {
          for (const c of b.cells)
            if (c.alive && Math.hypot(c.x - s.x, c.y - s.y) < 3) {
              c.alive = false
              stats.shieldCells++
            }
          return true
        }
      }
    return false
  }
  function kill(a, p, api) {
    a.dead = true
    stats.kills++
    effect(a.x, a.y)
    const value = a.mode === 'dive' ? 200 : 50 + (3 - a.type) * 10
    score(api, p, value)
    api.sfx('explode')
    if (typeof config.onKill === 'function') {
      config.onKill({ player: p.id, enemy: a.id, diving: a.mode === 'dive', wave, value }, api)
      p.score = api.getScore(p.id)
    }
  }
  function update(api, dt) {
    dt = clamp(dt || 1 / 60, 1 / 240, 0.05)
    if (phase === 'won' || phase === 'lost') return
    time += dt
    tick++
    for (const s of stars) {
      s.y += s.speed * dt
      if (s.y > 223) s.y = 25
    }
    for (const b of bursts) b.age += dt
    bursts = bursts.filter((b) => b.age < 0.32)
    for (const l of labels) {
      l.t -= dt
      l.y -= dt * 10
    }
    labels = labels.filter((l) => l.t > 0)
    for (const p of people) {
      p.shotT = Math.max(0, p.shotT - dt)
      p.shotFlash = Math.max(0, p.shotFlash - dt)
      p.shield = Math.max(0, p.shield - dt)
      p.shieldT = Math.max(0, p.shieldT - dt)
      p.invulnerable = Math.max(0, p.invulnerable - dt)
      if (p.dead > 0) {
        p.dead = Math.max(0, p.dead - dt)
        if (p.dead === 0 && p.lives > 0) respawn(p)
        continue
      }
      if (p.lives <= 0) continue
      p.x = clamp(
        p.x + ((api.btn('right', p.id) ? 1 : 0) - (api.btn('left', p.id) ? 1 : 0)) * 108 * dt,
        12,
        244,
      )
      if (api.btn('b', p.id) && p.shieldT === 0) {
        p.shield = 0.85
        p.shieldT = 6
        api.sfx('powerup')
      }
      if (
        api.btn('a', p.id) &&
        p.shotT === 0 &&
        shots.filter((s) => s.player === p.id).length < 8
      ) {
        shots.push({ id: nextId++, player: p.id, x: p.x, y: p.y - 9, vy: -245, life: 0.9 })
        p.shotT = 0.17
        p.shotFlash = 0.14
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
        for (const p of people) {
          p.lives = Math.max(1, p.lives)
          p.dead = 0
          p.invulnerable = 2
        }
      }
      return
    }
    marchT -= dt
    if (marchT <= 0) {
      marchT = Math.max(0.07, 0.44 - 0.045 * wave - 0.2 * (1 - aliens.length / 32))
      formation.x += formation.dir * (2 + wave * 0.35)
      const left =
          Math.min(...aliens.filter((a) => a.mode === 'march').map((a) => a.slotX), 35) +
          formation.x,
        right =
          Math.max(...aliens.filter((a) => a.mode === 'march').map((a) => a.slotX), 220) +
          formation.x
      if (left < 13 || right > 243) {
        formation.dir *= -1
        formation.x += formation.dir * 4
        formation.y += 4
      }
    }
    diveT -= dt
    if (diveT <= 0) {
      const candidates = aliens.filter((a) => a.mode === 'march')
      if (
        aliens.filter((a) => a.mode === 'dive' || a.mode === 'warn').length < 2 &&
        candidates.length
      ) {
        const a = candidates[Math.floor(rnd() * candidates.length)]
        a.mode = 'warn'
        a.warn = 0.75
        stats.dives++
      }
      diveT = Math.max(2.1, 5.5 - wave * 0.55 - difficulty)
    }
    for (const a of aliens) {
      a.age += dt
      if (a.mode === 'march' || a.mode === 'warn') {
        a.x = a.slotX + formation.x
        a.y = a.slotY + formation.y
        if (a.mode === 'warn') {
          a.warn -= dt
          if (a.warn <= 0) {
            a.mode = 'dive'
            a.diveAge = 0
            a.startX = a.x
            a.startY = a.y
            const targets = people.filter((p) => p.lives > 0)
            a.targetX = targets[Math.floor(rnd() * targets.length)]?.x ?? 128
          }
        }
      } else if (a.mode === 'dive') {
        a.diveAge += dt
        a.x = clamp(
          a.startX +
            (a.targetX - a.startX) * Math.min(1, a.diveAge / 1.9) +
            Math.sin(a.diveAge * 4) * 25,
          8,
          248,
        )
        a.y = a.startY + a.diveAge * (62 + wave * 4)
        if (a.y > 232) {
          a.mode = 'return'
          a.y = 24
          a.age = 0
        }
      } else if (a.mode === 'return') {
        a.x += (a.slotX + formation.x - a.x) * Math.min(1, dt * 3)
        a.y += 52 * dt
        if (a.y >= a.slotY + formation.y) {
          a.mode = 'march'
        }
      }
      for (const p of people)
        if (p.lives > 0 && p.dead === 0 && Math.abs(p.x - a.x) < 10 && Math.abs(p.y - a.y) < 10)
          damage(p, api)
      if (a.mode === 'march' && a.y > 191) {
        for (const p of people) {
          p.invulnerable = 0
          p.shield = 0
          damage(p, api)
        }
        a.dead = true
      }
    }
    fireT -= dt
    if (fireT <= 0) {
      const bottom = new Map()
      for (const a of aliens)
        if (!a.dead && a.mode === 'march') {
          const current = bottom.get(a.col)
          if (!current || a.y > current.y) bottom.set(a.col, a)
        }
      const choices = [...bottom.values()]
      if (choices.length && enemyShots.length < 12) {
        const a = choices[Math.floor(rnd() * choices.length)]
        enemyShots.push({ x: a.x, y: a.y + 7, vx: 0, vy: 65 + wave * 9 + difficulty * 12, life: 3 })
      }
      fireT = Math.max(0.32, 1.1 - wave * 0.13 - difficulty * 0.2)
    }
    ufoT -= dt
    if (!ufo && ufoT <= 0) ufo = { x: -18, y: 32, dir: 1, hp: 2, warn: 0.8 }
    if (ufo) {
      if (ufo.warn > 0) ufo.warn -= dt
      else ufo.x += 42 * dt
      if (ufo.x > 276) {
        ufo = null
        ufoT = 12
      }
    }
    for (const s of shots) {
      s.y += s.vy * dt
      s.life -= dt
      if (erode(s)) {
        s.life = 0
        continue
      }
      for (const a of aliens) {
        if (!a.dead && Math.abs(a.x - s.x) < 8 && Math.abs(a.y - s.y) < 6) {
          kill(a, people[s.player], api)
          s.life = 0
          break
        }
      }
      if (
        s.life > 0 &&
        ufo &&
        ufo.warn <= 0 &&
        Math.abs(ufo.x - s.x) < 12 &&
        Math.abs(ufo.y - s.y) < 7
      ) {
        ufo.hp--
        s.life = 0
        if (ufo.hp <= 0) {
          score(api, people[s.player], 500)
          stats.ufos++
          note('+500', ufo.x - 12, ufo.y)
          effect(ufo.x, ufo.y)
          ufo = null
          ufoT = 12
          api.sfx('powerup')
        }
      }
    }
    shots = shots.filter((s) => s.life > 0 && s.y > 23)
    aliens = aliens.filter((a) => !a.dead)
    for (const s of enemyShots) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt
      if (erode(s)) {
        s.life = 0
        continue
      }
      for (const p of people)
        if (p.lives > 0 && p.dead === 0 && Math.abs(s.x - p.x) < 6 && Math.abs(s.y - p.y) < 8) {
          damage(p, api)
          s.life = 0
        }
    }
    enemyShots = enemyShots.filter((s) => s.life > 0 && s.y < 224)
    if (!aliens.length) {
      stats.waves++
      phase = 'clear'
      phaseT = 1.35
      enemyShots = []
      shots = []
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
  function sprite(api, name, clip, x, y, t, colors = {}) {
    const set = SETS[name],
      anim = set.animations[clip],
      f =
        set.frames[
          anim.frames[
            anim.loop
              ? Math.floor((t * 1000) / anim.frameMs) % anim.frames.length
              : Math.min(anim.frames.length - 1, Math.floor((t * 1000) / anim.frameMs))
          ]
        ]
    for (let y1 = 0; y1 < set.height; y1++)
      for (let x1 = 0; x1 < set.width; x1++) {
        const c = f.pixels[y1][x1]
        if (c !== '.')
          api.pset(
            x - f.anchor.x + x1,
            y - f.anchor.y + y1,
            Object.hasOwn(colors, c) ? colors[c] : Number.parseInt(c, 16),
          )
      }
  }
  function draw(api) {
    api.cls(0)
    for (const s of stars) api.pset(s.x, s.y, s.color)
    api.rectfill(0, 12, 256, 11, 1)
    api.text('WAVE ' + Math.min(wave, waves) + '/' + waves, 4, 14, 7)
    api.text('ENEMIES ' + aliens.length, 143, 14, 10)
    for (const b of shields)
      for (const c of b.cells) if (c.alive) api.pset(c.x, c.y, c.y < 176 ? 11 : 3)
    for (const a of aliens) {
      sprite(
        api,
        'alien' + a.type,
        a.mode === 'warn' ? 'warn' : a.mode === 'dive' ? 'dive' : 'march',
        a.x,
        a.y,
        a.age,
      )
      if (a.mode === 'warn' && tick % 10 < 5) {
        api.rect(a.x - 10, a.y - 8, 21, 17, 10)
        api.line(a.x, a.y + 12, a.x, a.y + 18, 10)
      }
    }
    if (ufo) {
      if (ufo.warn > 0) api.text('>', 2, 29, 8)
      else sprite(api, 'ufo', 'fly', ufo.x, ufo.y, time)
    }
    for (const s of shots) {
      api.rectfill(s.x - 1, s.y - 4, 2, 6, s.player === 0 ? 12 : 8)
      api.pset(s.x, s.y - 5, 7)
    }
    for (const s of enemyShots) {
      api.line(s.x - 1, s.y - 3, s.x + 1, s.y, 8)
      api.line(s.x + 1, s.y, s.x - 1, s.y + 3, 10)
    }
    for (const p of people) {
      if (p.lives > 0 && p.dead === 0 && !(p.invulnerable > 0 && tick % 8 < 3))
        sprite(
          api,
          'ship',
          p.shield > 0 ? 'shield' : p.shotFlash > 0 ? 'fire' : 'idle',
          p.x,
          p.y,
          p.shotFlash > 0 ? 0.14 - p.shotFlash : time,
          {
            c: Number.isFinite(config.shipColors?.[p.id])
              ? clamp(config.shipColors[p.id] | 0, 0, 15)
              : p.id
                ? 8
                : 12,
          },
        )
      const x = p.id ? 143 : 4
      api.text('P' + (p.id + 1), x, 215, p.id ? 8 : 12)
      for (let i = 0; i < p.lives; i++) api.rectfill(x + 22 + i * 7, 216, 5, 4, p.id ? 8 : 12)
      api.rectfill(x + 77, 217, 26, 3, 1)
      api.rectfill(x + 77, 217, 26 * (1 - p.shieldT / 6), 3, 12)
    }
    for (const b of bursts) sprite(api, 'burst', 'explode', b.x, b.y, b.age)
    for (const l of labels) api.text(l.text, clamp(l.x, 0, 220), l.y, 10)
    if (phase === 'clear') {
      api.rectfill(59, 117, 138, 19, 0)
      api.rect(59, 117, 138, 19, 10)
      api.text('WAVE CLEARED', 80, 123, 10)
    }
  }
  function inspect() {
    return {
      phase,
      wave,
      waves,
      time,
      stats: { ...stats },
      formation: { ...formation },
      people: people.map((p) => ({ ...p })),
      aliens: aliens.map((a) => ({ ...a })),
      shots: shots.map((s) => ({ ...s })),
      enemyShots: enemyShots.map((s) => ({ ...s })),
      shields: shields.map((s) => ({ cx: s.cx, cells: s.cells.filter((c) => c.alive).length })),
      ufo: ufo ? { ...ufo } : null,
    }
  }
  return { init, update, draw, inspect }
}
