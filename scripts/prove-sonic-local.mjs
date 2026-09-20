// Offline native runtime proof. Inputs enter through the real runtime input API.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const publicMode = process.argv.includes('--public')
const root = resolve(import.meta.dirname, '..'),
  pack = resolve(
    root,
    publicMode ? 'library/catalog/speed-platformer' : 'data/local-catalog/sonic-speed-reference',
  ),
  out = resolve(pack, publicMode ? 'verification/default-native' : 'evidence'),
  source = resolve(root, 'data/reference-cache/spriters-resource/sonic')
const read = (n) => readFileSync(resolve(pack, n), 'utf8'),
  sha = (b) => createHash('sha256').update(b).digest('hex'),
  save = (n, v) => writeFileSync(resolve(out, n), `${JSON.stringify(v, null, 2)}\n`)
const module = read('module.js'),
  hero = publicMode ? null : JSON.parse(read('hero.json')),
  objects = publicMode ? null : JSON.parse(read('objects.json'))
const { chromium } = createRequire(resolve(root, 'packages/probe/package.json'))('playwright')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch(),
  page = await browser.newPage()
const gameCode = (config) =>
  `const game=(${module})(${JSON.stringify(config)});function init(api){game.init(api)}function update(api){game.update(api)}function draw(api){game.draw(api);api.__capture?.(game.inspect())}`
const load = async (code, players) =>
  page.evaluate(
    ({ code, players }) => {
      const r = window.__probe.load(code, 7, 'SONIC: COAST DASH', players)
      if (!r.ok) throw Error(JSON.stringify(r))
      window.__runtime.api.__capture = (s) => (window.sonicState = s)
      window.__probe.start()
      window.__probe.step(1)
    },
    { code, players },
  )
try {
  await page.route('**/*', (r) =>
    r.request().url().startsWith('file:') ? r.continue() : r.abort(),
  )
  await page.goto(`${pathToFileURL(resolve(root, 'packages/runtime/index.html')).href}?probe=1`)
  await page.waitForFunction(() => Boolean(window.__probe))
  const routes = []
  for (const [players, delayPlayer] of [
    [1, 1],
    [2, 1],
    [2, 0],
  ]) {
    await load(gameCode({}), players)
    const initial = await page.evaluate(() => window.sonicState)
    let last = 1
    const captures = []
    for (const tick of [12, 130, 192, 280, 700, 1200]) {
      const result = await page.evaluate(
        ({ count, delayPlayer }) => {
          const trace = []
          for (let i = 0; i < count; i++) {
            const s = window.sonicState
            if (s.phase !== 'play') break
            for (const p of s.people) {
              const act = s.acts[p.act],
                gap = act.terrain.some(
                  (q, j) => j && q[2] && p.x > act.terrain[j - 1][0] - 65 && p.x < q[0] + 10,
                ),
                enemy = !p.roll && p.enemies.some((e) => !e.dead && e.x - p.x > 0 && e.x - p.x < 38)
              const blocked =
                p.dead || p.transition || p.finished || (p.id === delayPlayer && s.ticks < 45)
              const keys = new Set(
                blocked
                  ? []
                  : [
                      'right',
                      ...(gap || enemy ? ['a'] : []),
                      ...(!gap && p.grounded && Math.abs(p.vx) > 2 ? ['down'] : []),
                    ],
              )
              for (const k of ['left', 'right', 'up', 'down', 'a', 'b'])
                window.__probe.input(p.id, k, keys.has(k))
            }
            window.__probe.step(1)
            trace.push({
              tick: window.sonicState.ticks,
              people: window.sonicState.people.map((p) => ({
                id: p.id,
                act: p.act,
                x: p.x,
                y: p.y,
                loop: p.loop,
                finished: p.finished,
                checkpoint: p.checkpointId,
              })),
            })
          }
          if (window.sonicState.phase === 'complete') window.__probe.step(1)
          return {
            runtimeState: window.__probe.state(),
            state: window.sonicState,
            errors: window.__probe.errors(),
            trace,
            image: window.__probe.snapshot(),
          }
        },
        { count: tick - last, players, delayPlayer },
      )
      last = tick
      const filename = `${players}p-${tick}${delayPlayer === 0 ? '-p2win' : ''}.png`
      writeFileSync(resolve(out, filename), Buffer.from(result.image.split(',')[1], 'base64'))
      assert.deepEqual(result.errors, [])
      captures.push({
        tick,
        file: filename,
        sha256: sha(readFileSync(resolve(out, filename))),
        state: result.state,
        runtimeState: result.runtimeState,
        trace: result.trace,
      })
    }
    assert.equal(captures.at(-1).state.phase, 'complete', `${players}P complete both acts`)
    assert.equal(captures.at(-1).state.people[captures.at(-1).state.winner].act, 1)
    if (players === 2) assert.equal(captures.at(-1).state.winner, 1 - delayPlayer)
    assert.equal(captures.at(-1).runtimeState, 'win')
    const reset = await page.evaluate(() => {
      for (let p = 0; p < 2; p++)
        for (const k of ['left', 'right', 'up', 'down', 'a', 'b']) window.__probe.input(p, k, false)
      window.__probe.reset()
      window.__probe.start()
      window.__probe.step(1)
      return {
        state: window.sonicState,
        errors: window.__probe.errors(),
        runtimeState: window.__probe.state(),
      }
    })
    assert.deepEqual(reset.errors, [])
    assert.deepEqual(
      reset.state,
      initial,
      'native reset restores all players, stages, scores and timers',
    )
    assert.equal(reset.runtimeState, 'playing')
    routes.push({
      players,
      reset,

      delayPlayer,
      input: 'Native __probe.input; no state mutation; Specified delayPlayer delayed45 ticks',
      captures,
    })
    save('routes.json', { moduleSha256: sha(module), routes })
    console.log(`${players}P native route complete; screenshots ${out}`)
  }
  if (!publicMode) {
    const comparisons = []
    for (const [name, frame] of Object.entries({
      ...hero.frames,
      ...Object.assign({}, ...Object.values(objects).map((s) => s.frames)),
    }))
      for (const face of [1, -1]) {
        const fixture = structuredClone(hero)
        fixture.frames = { fixture: frame }
        for (const key of Object.keys(fixture.animations))
          fixture.animations[key] = {
            loop: true,
            frames: [
              { frame: 'fixture', duration: 60, anchor: frame.anchor, hitboxes: [], hurtboxes: [] },
            ],
          }
        await load(gameCode({ hero: fixture, objects: {} }), 1)
        const expected =
          'data:image/png;base64,' +
          readFileSync(resolve(source, 'frames', `${name}.png`)).toString('base64')
        const proof = await page.evaluate(
          async ({ frame, face, expected }) => {
            const img = new Image()
            img.src = expected
            await img.decode()
            const c = document.createElement('canvas')
            c.width = img.width
            c.height = img.height
            const ctx = c.getContext('2d')
            ctx.drawImage(img, 0, 0)
            const src = ctx.getImageData(0, 0, img.width, img.height).data
            const rt = window.__runtime,
              orig = rt.api.spr,
              results = [],
              pixels = () => {
                const a = new Uint32Array(256 * 224)
                rt.screen.blit(a)
                return new Uint8Array(a.buffer)
              }
            rt.api.spr = (rows, x, y, fx, fy, palette) => {
              const before = pixels()
              orig(rows, x, y, fx, fy, palette)
              if (
                JSON.stringify(palette) !== JSON.stringify(frame.palette) ||
                rows.length !== frame.size.h ||
                rows[0].length !== frame.size.w
              )
                return
              const actual = pixels()
              let mismatches = 0,
                opaque = 0,
                transparent = 0,
                clipped = 0
              for (let sy = 0; sy < img.height; sy++)
                for (let sx = 0; sx < img.width; sx++) {
                  const dx = x + (face === 1 ? sx : img.width - 1 - sx),
                    dy = y + sy,
                    si = (sy * img.width + sx) * 4,
                    di = (dy * 256 + dx) * 4
                  if (dx < 0 || dx >= 256 || dy < 0 || dy >= 224) {
                    clipped++
                    continue
                  }
                  if (src[si + 3]) {
                    opaque++
                    for (let k = 0; k < 4; k++)
                      if (actual[di + k] !== src[si + k]) {
                        mismatches++
                        break
                      }
                  } else {
                    transparent++
                    for (let k = 0; k < 4; k++)
                      if (actual[di + k] !== before[di + k]) {
                        mismatches++
                        break
                      }
                  }
                }
              results.push({ x, y, mismatches, opaque, transparent, clipped })
            }
            window.__probe.input(0, face === 1 ? 'right' : 'left', true)
            window.__probe.step(1)
            rt.api.spr = orig
            return {
              results,
              face: window.sonicState.people[0].face,
              errors: window.__probe.errors(),
            }
          },
          { frame, face, expected },
        )
        assert.equal(proof.face, face)
        assert.deepEqual(proof.errors, [])
        assert.equal(proof.results.length, 1, `${name}/${face}`)
        assert.equal(proof.results[0].mismatches, 0, `${name}/${face}`)
        assert.equal(proof.results[0].clipped, 0)
        comparisons.push({ name, face, source: frame.source, ...proof.results[0] })
      }
    save('pixels.json', {
      moduleSha256: sha(module),
      heroSha256: sha(read('hero.json')),
      objectsSha256: sha(read('objects.json')),
      method:
        'Each source PNG through public hero override, native controller draw and exact native screen comparison, both facings; transparent pixels preserve prior framebuffer. Original source crop equality separately recorded by importer.',
      comparisons,
      mismatches: 0,
    })
    console.log(`${comparisons.length} exact native source/mirror comparisons passed`)
  }
} finally {
  await browser.close()
}
