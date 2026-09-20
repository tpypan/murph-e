import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { loadCatalog } from '../src/catalog.ts'
import { listDemos, loadDemo } from '../src/demos.ts'

const { createPreviewPlayback, previewFamily } = await import(
  new URL('../../runtime/src/preview-playback.ts', import.meta.url).href
)
const { Runtime } = await import(new URL('../../runtime/src/runtime.ts', import.meta.url).href)

const root = resolve(import.meta.dirname, '../../..')
function gameCode(id: string, entry: string, observations: string) {
  const module = readFileSync(resolve(root, `library/catalog/${id}/module.js`), 'utf8')
  const demo = readFileSync(resolve(root, `library/catalog/${id}/demo.js`), 'utf8')
  // Observation only: report detached inspect state through pixels/score. Inputs
  // reach the unmodified game update through the native runtime input system.
  return `const ARCADE={${entry}:(${module})};\n${demo}\nconst originalDraw=draw;draw=api=>{originalDraw(api);const snapshot=game.inspect();${observations}};`
}
function runtime(code: string, players = 2) {
  const errors: string[] = []
  const result = new Runtime(null as unknown as HTMLCanvasElement, {
    probe: true,
    post: (event: { type: string; message: string }) => {
      if (event.type === 'error') errors.push(event.message)
    },
  })
  assert.deepEqual(result.load(code, 7, '', 0, players), { ok: true })
  return { runtime: result, errors }
}

test('real two-player fighter picker confirms both humans then releases before intro and fights', () => {
  const code = gameCode(
    'fighter',
    'fighter',
    `api.pset(0,20, snapshot.phase==='select'?1:snapshot.phase==='versus'?2:snapshot.phase==='intro'?3:4);api.score(snapshot.fighters[0].hp,0);api.score(snapshot.fighters[1].hp,1);`,
  )
  const { runtime: game, errors } = runtime(code)
  const playback = createPreviewPlayback(game, {
    code,
    genre: 'fighting',
    demo: true,
    motion: true,
  })
  playback.start()
  assert.equal(game.screen.pget(0, 20), 4, 'both players must reach fight after bounded warmup')
  assert.deepEqual(game.scores, [100, 100], 'confirmation never leaks into an intro attack')
  for (const player of [0, 1])
    for (const key of ['a', 'b'] as const) assert.equal(game.input.btn(key, player), false)
  playback.step(480)
  assert.ok(
    game.scores.some((hp: number) => hp < 100),
    'normal post-intro attack input produces combat',
  )
  assert.deepEqual(errors, [])
})

test('real speed platformer moves both racers under demo input and restart replays deterministically', () => {
  const code = gameCode(
    'speed-platformer',
    'speedPlatformer',
    'api.score(Math.floor(snapshot.people[0].x),0);api.score(Math.floor(snapshot.people[1].x),1);',
  )
  const { runtime: game, errors } = runtime(code)
  const playback = createPreviewPlayback(game, {
    code,
    genre: 'speed platformer',
    demo: true,
    motion: true,
  })
  playback.start()
  assert.deepEqual(game.scores, [60, 60], 'warmup stays neutral apart from harmless confirmation')
  playback.step(100)
  assert.ok(
    game.scores.every((x: number) => x > 200),
    'both native controllers move their own racer',
  )
  const before = game.screen.hash(),
    positions = [...game.scores]
  playback.start()
  playback.step(100)
  assert.equal(game.screen.hash(), before)
  assert.deepEqual(game.scores, positions)
  assert.deepEqual(errors, [])
})

test('Pong attract playback actually serves and rallies in both modes', () => {
  const code = gameCode(
    'pong',
    'pong',
    "api.score(snapshot.stats.serves,0);api.pset(1,20,Math.min(15,snapshot.stats.points));api.pset(0,20,snapshot.phase==='rally'?1:0);",
  )
  for (const players of [1, 2]) {
    const { runtime: game, errors } = runtime(code, players)
    const playback = createPreviewPlayback(game, { code, genre: 'pong', demo: true, motion: true })
    playback.start()
    assert.equal(game.scores[0], 0, 'neutral warmup does not silently serve for a player')
    playback.step(10)
    assert.equal(game.scores[0], 1, 'an actual A press starts the first serve')
    assert.equal(game.screen.pget(0, 20), 1, 'the preview reaches a live rally')
    playback.step(1000)
    assert.ok(game.scores[0] > 1, 'subsequent human-owned serves also launch')
    assert.ok(game.screen.pget(1, 20) > 0, 'the ball crosses the court and points can be scored')
    assert.deepEqual(errors, [])
  }
})

test('reduced motion renders one neutral static frame and never auto-confirms selection', () => {
  const code = gameCode('fighter', 'fighter', "api.pset(0,20,snapshot.phase==='select'?1:2)")
  const { runtime: game, errors } = runtime(code)
  const playback = createPreviewPlayback(game, { code, demo: true, motion: false })
  playback.start()
  assert.equal(game.gameFrame, 0, 'static previews do not warm up 180 animated frames')
  playback.step(6)
  assert.equal(game.gameFrame, 1)
  assert.equal(game.screen.pget(0, 20), 1)
  const hash = game.screen.hash()
  playback.step(600)
  assert.equal(game.gameFrame, 1)
  assert.equal(game.screen.hash(), hash)
  assert.deepEqual(errors, [])
})

test('streamed drafts never receive bot inputs or demo warmup', () => {
  const code = `let count=0;function init(api){count=0;api.score(0)}function update(api){for(let p=0;p<2;p++)for(const key of ['left','right','a','b','up','down'])if(api.btn(key,p)||api.btnp(key,p))count++;api.score(count)}function draw(api){api.cls(1)}`
  const { runtime: game } = runtime(code)
  const playback = createPreviewPlayback(game, {
    code,
    genre: 'fighting',
    demo: false,
    motion: true,
  })
  playback.start()
  assert.equal(game.gameFrame, 0)
  playback.step(300)
  assert.equal(game.gameFrame, 300)
  assert.equal(game.score, 0)
})

test('demo driver preserves the native API identity, advancing time and genuine press edges', () => {
  const code = `let original,drawMethod,previous={},edges=0,lastTime=-1;
function init(api){original=api;drawMethod=api.rectfill;previous={};edges=0;lastTime=-1;for(let p=0;p<2;p++)for(const key of ['a','b','up','down','left','right'])if(api.btn(key,p))throw Error('init must be neutral')}
function update(api,dt){if(api!==original||api.rectfill!==drawMethod||dt!==1/60||api.t<=lastTime)throw Error('native API changed');lastTime=api.t;for(let p=0;p<2;p++)for(const key of ['a','b','up','down','left','right']){const id=p+':'+key,held=api.btn(key,p),pressed=api.btnp(key,p);if(pressed!==(held&&!previous[id]))throw Error('bad edge '+id);if(pressed)edges++;previous[id]=held}api.score(edges)}
function draw(api){if(api!==original)throw Error('draw API changed');api.cls(1)}`
  const { runtime: game, errors } = runtime(code)
  const playback = createPreviewPlayback(game, {
    code,
    genre: 'fighting',
    demo: true,
    motion: true,
  })
  playback.start()
  assert.equal(game.score, 2, 'one genuine confirmation edge per human')
  playback.step(240)
  assert.ok(game.score > 10)
  assert.deepEqual(errors, [])
})

test('existing catalog demo families retain dedicated input patterns', () => {
  for (const [genre, family] of [
    ['kart racing', 'kart'],
    ['maze chase', 'maze'],
    ['barrel ladder platformer', 'climber'],
    ['frog crossing', 'crossing'],
    ['pong', 'pong'],
    ['falling blocks', 'blocks'],
    ['fighting', 'fighter'],
    ['speed platformer', 'speed'],
  ])
    assert.equal(previewFamily('', genre), family)
  assert.equal(previewFamily('const ARCADE={speedPlatformer:()=>{}}'), 'speed')
})

function view(runtime: InstanceType<typeof Runtime>) {
  const rgba = new Uint32Array(256 * 224)
  runtime.screen.blit(rgba)
  // Exclude native HUD counters so a ticking timer cannot masquerade as gameplay motion.
  return createHash('sha256')
    .update(Buffer.from(rgba.buffer, 12 * 256 * 4))
    .digest('hex')
}

test('all admitted demo player modes draw changing native views without altering playable source', () => {
  const parts = loadCatalog()
  const demos = listDemos(parts)
  assert.ok(demos.length >= 13)
  assert.equal(demos.length, parts.filter((part) => part.status === 'verified').length)
  let modes = 0
  for (const summary of demos)
    for (const players of summary.players) {
      const label = `${summary.id}/${players}p`
      const demo = loadDemo(summary.id, players, parts)
      assert.ok(demo, label)
      const originalCode = demo.code
      const errors: unknown[] = []
      const make = () =>
        new Runtime(null, {
          probe: true,
          post: (message: { type: string }) => {
            if (message.type === 'error') errors.push(message)
          },
        })
      const preview = make()
      const untouched = make()
      assert.deepEqual(preview.load(originalCode, 7, demo.title, 0, players), { ok: true }, label)
      assert.deepEqual(untouched.load(originalCode, 7, demo.title, 0, players), { ok: true }, label)
      const playback = createPreviewPlayback(preview, {
        code: originalCode,
        genre: demo.genre,
        demo: true,
        motion: true,
      })
      playback.start()
      untouched.start()
      untouched.step(180)
      const frames = new Set<string>()
      let differsFromNoInput = false
      for (let frame = 0; frame < 240; frame++) {
        playback.step(1)
        untouched.step()
        assert.notEqual(preview.state, 'error', `${label} preview frame ${frame}`)
        assert.notEqual(untouched.state, 'error', `${label} baseline frame ${frame}`)
        if (frame % 15 === 0) {
          const image = view(preview)
          frames.add(image)
          differsFromNoInput ||= image !== view(untouched)
        }
      }
      assert.deepEqual(errors, [], label)
      assert.ok(frames.size >= 4, `${label}: gameplay area must animate, got ${frames.size} views`)
      assert.ok(differsFromNoInput, `${label}: preview inputs must visibly affect gameplay`)
      assert.equal(demo.code, originalCode)
      assert.equal(
        loadDemo(summary.id, players, parts)!.code,
        originalCode,
        `${label}: playable demo remains untouched`,
      )
      modes++
    }
  assert.equal(
    modes,
    demos.reduce((sum, game) => sum + game.players.length, 0),
  )
})
