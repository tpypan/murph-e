// Actual input replays for crossing HOME slots and falling-block well-border flashes.
// node library/catalog/crossing/presentation-proof.mjs [--baseline-dir /absolute/old-modules]
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'

const root = resolve(import.meta.dirname, '../../..')
const require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const baselineIndex = process.argv.indexOf('--baseline-dir')
const baselineDir = baselineIndex >= 0 ? resolve(process.argv[baselineIndex + 1]) : null
const digest = (value) => createHash('sha256').update(value).digest('hex')
const keys = ['left', 'right', 'up', 'down', 'a', 'b']
const reports = []
const policy = vm.runInNewContext(
  `(${readFileSync(resolve(root, 'library/catalog/falling-blocks/policy.js'), 'utf8')})`,
)
const clean = (state) => {
  const copy = JSON.parse(JSON.stringify(state))
  delete copy.notices
  for (const board of copy.boards ?? []) delete board.clearPulse
  return copy
}
function harness(source, players, config) {
  const game = vm.runInNewContext(`(${source})`)(config)
  const held = [new Set(), new Set()],
    previous = [new Set(), new Set()],
    scores = Array(players).fill(0),
    calls = []
  let terminal = null
  const api = {
    players,
    W: 256,
    H: 224,
    frame: 0,
    t: 0,
    btn: (b, p = 0) => held[p].has(b),
    btnp: (b, p = 0) => held[p].has(b) && !previous[p].has(b),
    score(n, p) {
      if (p === undefined) scores.fill(n)
      else scores[p] = n
    },
    addScore: (n, p = 0) => (scores[p] += n),
    getScore: (p = 0) => scores[p],
    sfx() {},
    tone() {},
    win(p) {
      terminal = { state: 'win', winner: p ?? null }
    },
    gameOver() {
      terminal = { state: 'gameover', winner: null }
    },
    textWidth: (s) => String(s).length * 8,
  }
  for (const method of ['cls', 'rect', 'rectfill', 'spr', 'text', 'textCenter', 'line', 'pset'])
    api[method] = (...args) => calls.push([method, ...args])
  game.init(api)
  return {
    game,
    held,
    scores,
    calls,
    get terminal() {
      return terminal
    },
    step(frame, input) {
      for (let p = 0; p < players; p++) held[p] = new Set(input[p] ?? [])
      api.frame = frame + 1
      api.t = (frame + 1) / 60
      game.update(api, 1 / 60)
      for (let p = 0; p < players; p++) previous[p] = new Set(held[p])
      return game.inspect()
    },
    draw() {
      calls.length = 0
      game.draw(api)
      return calls
    },
    reset() {
      game.init(api)
      return game.inspect()
    },
  }
}
function plan(id, players, source, oldSource) {
  const crossing = id === 'crossing'
  const replay = crossing
    ? JSON.parse(
        readFileSync(
          resolve(import.meta.dirname, `evidence/${players === 1 ? 'solo' : 'coop'}-replay.json`),
          'utf8',
        ),
      )
    : null
  const baseConfig = replay?.config ?? { targetLines: 16, garbage: false, seed: 7 }
  const presentation = crossing
    ? { homeNotice: 'HOME', homeNoticeSeconds: 1 }
    : { clearFlash: { color: 10, seconds: 0.35 } }
  const h = harness(source, players, { ...baseConfig, ...presentation }),
    plain = harness(source, players, baseConfig),
    old = harness(oldSource, players, baseConfig)
  const initial = clean(h.game.inspect()),
    geometry = JSON.parse(JSON.stringify(h.game.layout()))
  const mutated = h.game.layout()
  if (crossing) mutated.notices[0].x = -500
  else mutated.wells[0].border.x = -500
  assert.deepEqual(
    JSON.parse(JSON.stringify(h.game.layout())),
    geometry,
    'Layout leaked mutable geometry',
  )
  const inputs = [],
    marks = [],
    seen = new Set(),
    cache = {},
    held = [new Set(), new Set()],
    previous = [new Set(), new Set()]
  let cursor = 0,
    last = h.game.inspect(),
    firstEffect = null
  const max = replay?.frames ?? 2000
  const mark = (name, frame, state) => {
    if (seen.has(name)) return
    seen.add(name)
    const active = crossing
      ? state.notices.some((n) => n.remaining > 0)
      : state.boards.some((b) => b.clearPulse > 0)
    marks.push({ name, frame, active, scores: [...h.scores], state })
  }
  for (let frame = 0; frame < max && !h.terminal; frame++) {
    if (crossing) {
      while (cursor < replay.inputs.length && replay.inputs[cursor].at === frame) {
        const e = replay.inputs[cursor++]
        if (e.down) held[e.player].add(e.button)
        else held[e.player].delete(e.button)
      }
    } else {
      const next = policy(last, frame, cache)
      for (let p = 0; p < players; p++) held[p] = new Set(next[p])
    }
    for (let p = 0; p < players; p++)
      for (const button of keys)
        if (held[p].has(button) !== previous[p].has(button))
          inputs.push({ at: frame, player: p, button, down: held[p].has(button) })
    const state = h.step(frame, held),
      ordinary = plain.step(frame, held),
      before = old.step(frame, held)
    assert.deepEqual(clean(state), clean(ordinary), 'Presentation changed current mechanics')
    assert.deepEqual(
      clean(ordinary),
      clean(before),
      'Default mechanics changed from prior foundation',
    )
    assert.deepEqual(h.scores, old.scores)
    assert.deepEqual(h.terminal, old.terminal)
    if (!frame) mark('start', frame + 1, state)
    if (crossing) {
      for (let p = 0; p < players; p++)
        if (!last.notices[p].remaining && state.notices[p].remaining) {
          mark(`p${p + 1}-home`, frame + 1, state)
          firstEffect ??= frame + 1
        }
      if (state.phase === 'clear') mark('level-clear', frame + 1, state)
    } else {
      if (state.boards.some((b, i) => b.clearPulse > 0 && last.boards[i].clearPulse === 0)) {
        mark('clear', frame + 1, state)
        firstEffect ??= frame + 1
      }
    }
    if (firstEffect !== null && frame + 1 === firstEffect + (crossing ? 61 : 22))
      mark('after-effect', frame + 1, state)
    if (h.terminal) mark('terminal', frame + 1, state)
    last = state
    for (let p = 0; p < players; p++) previous[p] = new Set(held[p])
  }
  assert.ok(firstEffect !== null)
  if (crossing && players === 2)
    assert.ok(seen.has('p2-home'), 'Must show player two earning its own notice')
  if (!crossing) assert.equal(h.terminal?.state, 'win')
  const reset = h.reset()
  assert.deepEqual(clean(reset), initial)
  assert.ok(h.scores.every((s) => s === 0))
  assert.ok(
    crossing
      ? reset.notices.every((n) => n.remaining === 0)
      : reset.boards.every((b) => b.clearPulse === 0),
  )
  // Bounds and clipping tests use the same real input sequence, not state setters.
  const bounded = harness(source, players, {
    ...baseConfig,
    ...(crossing
      ? { homeNotice: 'safe!!!long\n🐸', homeNoticeSeconds: 99 }
      : { clearFlash: { color: 99, seconds: 99 } }),
  })
  const heldBounded = [new Set(), new Set()]
  let i = 0
  for (let frame = 0; frame < firstEffect; frame++) {
    while (i < inputs.length && inputs[i].at === frame) {
      const e = inputs[i++]
      if (e.down) heldBounded[e.player].add(e.button)
      else heldBounded[e.player].delete(e.button)
    }
    bounded.step(frame, heldBounded)
  }
  if (crossing) {
    assert.equal(bounded.game.inspect().notices[0].text, 'SAFE!!!')
    assert.equal(bounded.game.inspect().notices[0].remaining, 180)
  } else {
    assert.equal(bounded.game.inspect().boards[0].clearPulse, 1)
    assert.ok(bounded.draw().some((call) => call[0] === 'rect' && call[5] === 15))
  }
  return {
    id,
    players,
    baseConfig,
    presentation,
    inputs,
    marks,
    geometry,
    firstEffect,
    frames: max,
    terminal: plain.terminal,
    finalScores: [...plain.scores],
    mechanicsMatch: true,
    reset: clean(reset),
    boundedOptions: true,
  }
}
const inside = (x, y, r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h
const border = (x, y, r) =>
  inside(x, y, r) && (x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1)
const browser = await chromium.launch({ headless: true }),
  page = await browser.newPage()
try {
  await page.goto(`${pathToFileURL(resolve(root, 'packages/runtime/index.html'))}?probe=1`)
  for (const id of ['crossing', 'falling-blocks']) {
    const dir = resolve(root, 'library/catalog', id),
      out = resolve(dir, 'verification/presentation')
    mkdirSync(out, { recursive: true })
    const source = readFileSync(resolve(dir, 'module.js'), 'utf8')
    const oldPath = baselineDir
      ? resolve(baselineDir, `${id}.js`)
      : resolve(out, 'baseline-module.js')
    assert.ok(existsSync(oldPath), `Need prior module bytes at ${oldPath}`)
    const oldSource = readFileSync(oldPath, 'utf8')
    writeFileSync(resolve(out, 'baseline-module.js'), oldSource)
    const results = []
    for (const players of [1, 2]) {
      const planned = plan(id, players, source, oldSource)
      writeFileSync(resolve(out, `${players}p-input.json`), JSON.stringify(planned, null, 2))
      const frames = { old: [], ordinary: [], customized: [] }
      for (const mode of ['old', 'ordinary', 'customized']) {
        const config = {
          ...planned.baseConfig,
          ...(mode === 'customized' ? planned.presentation : {}),
        }
        const code = `const F=(${mode === 'old' ? oldSource : source});let game;function init(api){game=F(${JSON.stringify(config)});game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api)}`
        const loaded = await page.evaluate(
          ({ code, players, inputs }) => {
            const p = window.__probe
            const r = p.load(code, 7, '', players)
            p.start()
            p.inject(inputs)
            return r
          },
          { code, players, inputs: planned.inputs },
        )
        assert.ok(loaded.ok, loaded.error)
        let previous = 0
        for (const mark of planned.marks) {
          const captured = await page.evaluate((n) => {
            const p = window.__probe,
              state = p.step(n),
              pixels = new Uint32Array(256 * 224)
            window.__runtime.screen.blit(pixels)
            return {
              state,
              pixels: [...pixels],
              png: p.snapshot(),
              hash: p.frameHash(),
              errors: p.errors(),
            }
          }, mark.frame - previous)
          previous = mark.frame
          assert.deepEqual(captured.errors, [])
          assert.deepEqual(captured.state.scores, mark.scores)
          const file = `${players}p-${mode}-${mark.name}.png`
          writeFileSync(resolve(out, file), Buffer.from(captured.png.split(',')[1], 'base64'))
          frames[mode].push({ ...captured, file })
        }
      }
      const captures = planned.marks.map((mark, index) => {
        const old = frames.old[index],
          ordinary = frames.ordinary[index],
          custom = frames.customized[index]
        assert.deepEqual(
          ordinary.pixels,
          old.pixels,
          `Default pixels changed: ${id} ${players}P ${mark.name}`,
        )
        const differences = []
        for (let i = 0; i < custom.pixels.length; i++)
          if (custom.pixels[i] !== ordinary.pixels[i])
            differences.push({ x: i % 256, y: Math.floor(i / 256) })
        const allowed = ({ x, y }) =>
          id === 'crossing'
            ? planned.geometry.notices.some((r) => inside(x, y, r))
            : planned.geometry.wells.some((w) => border(x, y, w.border))
        assert.ok(
          differences.every(allowed),
          `Presentation overwrote protected HUD/game pixels: ${id} ${players}P ${mark.name}`,
        )
        if (mark.active)
          assert.ok(differences.length > 0, 'Actual event notice/flash was not visible')
        else assert.equal(differences.length, 0, 'Effect remained visible without an active timer')
        return {
          ...mark,
          state: undefined,
          file: custom.file,
          baselineFile: ordinary.file,
          hash: custom.hash,
          defaultHash: ordinary.hash,
          oldDefaultHash: old.hash,
          changedPixels: differences.length,
          protectedPixelsUnchanged: true,
          native: custom.state,
        }
      })
      results.push({
        players,
        sourceHash: digest(source),
        previousSourceHash: digest(oldSource),
        mechanicsMatch: planned.mechanicsMatch,
        defaultPixelsUnchanged: true,
        boundedOptions: true,
        resetCleared: true,
        geometry: planned.geometry,
        captures,
      })
      console.log(
        JSON.stringify({
          id,
          players,
          defaultsUnchanged: true,
          protectedHud: true,
          captures: captures.map((c) => [c.file, c.changedPixels]),
        }),
      )
    }
    const report = {
      passed: true,
      at: new Date().toISOString(),
      sourceHash: digest(source),
      previousSourceHash: digest(oldSource),
      scriptHash: digest(readFileSync(import.meta.filename)),
      runtimeHash: digest(readFileSync(resolve(root, 'packages/runtime/runtime.js'))),
      method:
        'Detached VM telemetry plans ordinary input events, replayed with native __probe.inject. No game state setters, API button overrides or edited frozen generations. Default and optional presentation runs use identical inputs; every changed pixel must be inside declared notice slots or exactly on a well outline.',
      results,
    }
    writeFileSync(resolve(out, 'proof.json'), JSON.stringify(report, null, 2))
    reports.push({ id, passed: true, sourceHash: report.sourceHash, results: results.length })
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify(reports, null, 2))
