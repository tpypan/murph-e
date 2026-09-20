// Saved local default-input replay only; all network requests are blocked.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const dir = import.meta.dirname,
  root = resolve(dir, '../../..'),
  out = resolve(dir, 'evidence')
const { chromium } = createRequire(resolve(root, 'packages/probe/package.json'))('playwright')
const source = readFileSync(resolve(dir, 'module.js'), 'utf8'),
  sha = (x) => createHash('sha256').update(x).digest('hex')
const browser = await chromium.launch(),
  page = await browser.newPage(),
  results = []
try {
  await page.route('**/*', (r) =>
    r.request().url().startsWith('file:') ? r.continue() : r.abort(),
  )
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  await page.waitForFunction(() => !!window.__probe)
  const load = async (players, config = {}) => {
    const code = `let game;function init(api){game=(${source})(${JSON.stringify(config)});game.init(api)}function update(api){game.update(api)}function draw(api){game.draw(api);api.__capture?.(game.inspect())}`
    await page.evaluate(
      ({ code, players }) => {
        const r = window.__probe.load(code, 19, 'BLAST PATROL', players)
        if (!r.ok) throw Error(r.error)
        window.__runtime.api.__capture = (s) => (window.bomberState = s)
        window.__probe.start()
      },
      { code, players },
    )
  }
  for (const name of ['solo', 'versus', 'coop']) {
    const replay = JSON.parse(readFileSync(resolve(out, `default-${name}-replay.json`), 'utf8'))
    assert.equal(replay.moduleHash, sha(source))
    await load(replay.players, replay.config)
    await page.evaluate((inputs) => window.__probe.inject(inputs), replay.inputs)
    const nextArena =
      replay.state.events.find((e) => e.type === 'arena-ready' && e.level === 2)?.tick ?? 1000
    const samples = [
      ['start', 1],
      ['blast', 109],
      ['second-arena', nextArena + 100],
      ['complete', replay.frames],
    ]
    let frame = 0
    const captures = []
    for (const [stage, tick] of samples) {
      const result = await page.evaluate(
        (n) => ({
          runtime: window.__probe.step(n),
          game: window.bomberState,
          errors: window.__probe.errors(),
          image: window.__probe.snapshot(),
        }),
        tick - frame + (stage === 'complete' ? 1 : 0),
      )
      frame = tick
      assert.deepEqual(result.errors, [])
      const file = `default-${name}-${stage}.png`,
        png = Buffer.from(result.image.split(',')[1], 'base64')
      writeFileSync(resolve(out, file), png)
      captures.push({
        stage,
        tick,
        file,
        sha256: sha(png),
        runtime: result.runtime,
        game: result.game,
      })
    }
    const last = captures.at(-1)
    assert.equal(last.runtime.state, 'win')
    assert.deepEqual(last.runtime.scores, replay.expectedScores)
    assert.equal(last.game.level, replay.state.level)
    assert.deepEqual(
      last.game.players.map((p) => p.lives),
      replay.state.players.map((p) => p.lives),
    )
    const reset = await page.evaluate(() => {
      window.__probe.reset()
      window.__probe.start()
      return { runtime: window.__probe.step(1), game: window.bomberState }
    })
    assert.equal(reset.game.level, 1)
    assert.deepEqual(reset.game.scores, [0, 0])
    assert.equal(reset.game.terminal, false)
    assert.ok(reset.game.players.every((p) => p.alive))
    assert.equal(reset.game.bombs.length, 0)
    results.push({
      name,
      config: replay.config,
      players: replay.players,
      frames: replay.frames,
      limitations: replay.limitations,
      captures,
      reset,
    })
  }
  const controls = []
  for (const player of [0, 1]) {
    await load(2)
    await page.evaluate(
      ({ player }) => window.__probe.input(player, player ? 'left' : 'right', true),
      { player },
    )
    const s = await page.evaluate(() => {
      window.__probe.step(8)
      return window.bomberState
    })
    assert.equal(s.players[player].x, player ? 8 : 2)
    assert.equal(s.players[1 - player].x, player ? 1 : 9)
    controls.push({ player, positions: s.players.map((p) => ({ x: p.x, y: p.y })) })
  }
  writeFileSync(
    resolve(out, 'default-runtime.json'),
    JSON.stringify({ moduleHash: sha(source), passed: true, controls, results }, null, 2) + '\n',
  )
  console.log(
    JSON.stringify(
      {
        passed: true,
        moduleHash: sha(source),
        routes: results.map((r) => ({
          name: r.name,
          frames: r.frames,
          players: r.players,
          config: r.config,
        })),
        controls,
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
