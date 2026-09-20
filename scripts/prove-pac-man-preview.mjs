// pnpm --filter @htn/probe exec node --import tsx ../../scripts/prove-pac-man-preview.mjs
// Read-only pack verification: isolated browsers, no model calls or admission changes.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { catalogContext, catalogPreview, loadCatalog } from '../packages/harness/src/catalog.ts'
import { draftScene } from '../apps/cabinet/app/build-preview.ts'

const root = resolve(import.meta.dirname, '..')
const packId = 'pac-man-maze-reference'
const output = resolve(root, 'data/local-catalog', packId, 'verification')
const sha = (value) => createHash('sha256').update(value).digest('hex')
const parts = loadCatalog()
const source = parts.find((p) => p.manifest.id === packId)
const original = parts.find((p) => p.manifest.id === 'maze')
assert.equal(source?.status, 'verified')
assert.equal(original?.status, 'verified')
const html = readFileSync(resolve(root, 'apps/cabinet/public/runtime/build-preview.html'), 'utf8')
assert.ok(
  html === readFileSync(resolve(root, 'packages/runtime/build-preview.html'), 'utf8'),
  'Cabinet worker is stale',
)
const runtime = readFileSync(resolve(root, 'packages/runtime/runtime.js'))
assert.deepEqual(
  runtime,
  readFileSync(resolve(root, 'apps/cabinet/public/runtime/runtime.js')),
  'Cabinet runtime is stale',
)
const workerCode = JSON.parse(html.match(/new Blob\(\[("(?:[^"\\]|\\.)*")\],/)?.[1] || 'null')
assert.equal(typeof workerCode, 'string')
const report = {
  modelCalls: 0,
  contentHash: source.hash,
  originalContentHash: original.hash,
  runtimeSha256: sha(runtime),
  cabinetPreviewSha256: sha(html),
  workerSha256: sha(workerCode),
  retrieval: [],
  workers: [],
  iframe: [],
  goose: [],
  limitations: [
    'The initial catalog fallback is the selected pack’s fixed demo, not an interpretation of every requested change. The exact goose-chasing phrase selects the original goose demo; other Pac-Man/goose wording can select the source pack and needs customization before its preview becomes a goose.',
    'The streamed-customization proof uses a deterministic reviewed wrapper, not newly generated model output.',
    'This verifies actual preview/native rendering and goose override; source pixel extraction and full gameplay have separate pack evidence.',
  ],
}
for (const players of [1, 2])
  for (const [request, id] of [
    ['pac-man', packId],
    ['pacman', packId],
    ['a generic maze where ghosts chase you', 'maze'],
    ['a goose hunting ghosts', 'maze'],
    ['Pac-Man but a goose chasing ghosts', 'maze'],
    ['Pac-Man with a goose avatar hunting ghosts', packId],
  ]) {
    const context = catalogContext(request, { players, genre: 'maze chase' })
    assert.equal(context.parts[0]?.manifest.id, id, `${players}P ${request}`)
    report.retrieval.push({ players, request, selected: id, contentHash: context.parts[0].hash })
  }

const gooseConfig = { avatar: 'goose', huntMode: 'player-hunts', levels: 3, capturesToClear: 8 }
const wrappers = (config) =>
  `let game;function init(api){game=ARCADE.maze(${JSON.stringify(config)});game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api)}`
function gooseTelemetry(module, players) {
  const factory = runInNewContext(`(${module})`, {}, { timeout: 3000 })
  const game = factory(gooseConfig),
    api = { players, btn: () => false, btnp: (b) => b === 'a' }
  for (const key of ['score', 'addScore', 'sfx', 'win', 'gameOver']) api[key] = () => {}
  game.init(api)
  game.update(api, 1 / 60)
  return JSON.parse(JSON.stringify(game.inspect()))
}
for (const players of [1, 2]) {
  const selected = gooseTelemetry(source.module, players),
    baseline = gooseTelemetry(original.module, players)
  assert.deepEqual(
    selected,
    baseline,
    'Source wrapper must preserve the original goose hunter behavior',
  )
  assert.equal(selected.huntMode, 'player-hunts')
  assert.equal(selected.players.length, players)
  assert.ok(
    selected.players.every((p) => p.honk > 0),
    'Every goose accepts its own honk input immediately',
  )
  report.goose.push({
    players,
    huntMode: selected.huntMode,
    honk: selected.players.map((p) => p.honk),
    originalTelemetryMatches: true,
  })
}

const require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const browser = await chromium.launch({ headless: true })
mkdirSync(output, { recursive: true })
try {
  const page = await browser.newPage()
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  async function compare(code, players, motion, label) {
    const result = await page.evaluate(
      async ({ code, players, motion, workerCode }) => {
        const count = motion ? 30 : 1,
          step = motion ? 6 : 1,
          probe = window.__probe
        const load = probe.load(code, 7, '', players)
        probe.start()
        const frames = [],
          states = []
        for (let i = 0; i < count; i++) {
          states.push(probe.step(step))
          const packed = new Uint32Array(256 * 224)
          window.__runtime.screen.blit(packed)
          frames.push(new Uint8Array(packed.buffer))
        }
        const rgbaSha = async (bytes) =>
          Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) =>
            b.toString(16).padStart(2, '0'),
          ).join('')
        const workers = await new Promise((resolve, reject) => {
          const url = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' })),
            worker = new Worker(url),
            results = []
          const finish = () => {
            clearTimeout(timer)
            clearInterval(heartbeat)
            worker.terminate()
            URL.revokeObjectURL(url)
          }
          const timer = setTimeout(() => {
            finish()
            reject(Error('Actual preview worker timed out'))
          }, 6000)
          const heartbeat = setInterval(() => worker.postMessage({ type: 'heartbeat' }), 500)
          worker.onerror = (e) => {
            finish()
            reject(Error(e.message))
          }
          worker.onmessage = (e) => {
            if (e.data.type !== 'pixels') {
              finish()
              reject(Error('Actual preview worker returned ' + e.data.type))
              return
            }
            results.push(e.data.pixels)
            if (results.length === count) {
              finish()
              resolve(results)
            }
          }
          worker.postMessage({ code, players, motion })
        })
        const comparisons = []
        for (let i = 0; i < count; i++) {
          let mismatchedBytes = 0
          for (let j = 0; j < frames[i].length; j++)
            if (frames[i][j] !== workers[i][j]) mismatchedBytes++
          comparisons.push({
            frame: (i + 1) * step,
            bytes: frames[i].length,
            mismatchedBytes,
            nativeRgbaSha256: await rgbaSha(frames[i]),
            workerRgbaSha256: await rgbaSha(workers[i]),
          })
        }
        return { load, states, comparisons, snapshot: probe.snapshot(), errors: probe.errors() }
      },
      { code, players, motion, workerCode },
    )
    assert.equal(result.load.ok, true)
    assert.equal(result.errors.length, 0)
    assert.ok(result.states.every((s) => !s.error))
    assert.ok(
      result.comparisons.every(
        (c) => c.mismatchedBytes === 0 && c.nativeRgbaSha256 === c.workerRgbaSha256,
      ),
    )
    const distinctFrames = new Set(result.comparisons.map((c) => c.nativeRgbaSha256)).size
    if (motion) {
      assert.ok(result.comparisons.some((c) => c.frame === 120))
      assert.ok(result.comparisons.some((c) => c.frame === 180))
      assert.ok(distinctFrames >= 2, 'Motion parity must include real changes after ghost release')
    }
    const file = `${players}p-catalog-preview-${label}-${motion ? 'motion' : 'still'}.png`
    writeFileSync(resolve(output, file), Buffer.from(result.snapshot.split(',')[1], 'base64'))
    report.workers.push({
      players,
      label,
      motion,
      distinctFrames,
      codeSha256: sha(code),
      comparisons: result.comparisons,
      errors: result.errors,
      screenshot: file,
    })
    return result.comparisons.at(-1).nativeRgbaSha256
  }
  for (const players of [1, 2]) {
    const context = catalogContext('Pac-Man', { players, genre: 'maze chase' })
    const preview = catalogPreview(context)
    assert.ok(preview)
    const code = preview.prefix + preview.demo
    const sourceStill = await compare(code, players, false, 'source')
    await compare(code, players, true, 'source')
    const custom = draftScene(wrappers(gooseConfig))
    assert.ok(custom, 'The actual streaming parser accepts the completed customization')
    const gooseStill = await compare(preview.prefix + custom, players, false, 'goose')
    await compare(preview.prefix + custom, players, true, 'goose')
    assert.notEqual(
      gooseStill,
      sourceStill,
      'Goose customization must visibly replace source Pac-Man',
    )
    // The source wrapper enables optional 1/2 actor markers. Match that documented
    // presentation setting when comparing its goose fallback to the original factory.
    const originalCode =
      `const ARCADE={maze:(${original.module})};` +
      wrappers({ ...gooseConfig, playerMarkers: true })
    assert.equal(
      await compare(originalCode, players, false, 'original-goose'),
      gooseStill,
      'Source wrapper must render precisely the original goose set',
    )

    // Also exercise the shipped HTML's message protocol and sandboxed iframe canvas,
    // using the same reduced-motion request sent by DraftPreview in the cabinet.
    const iframePage = await browser.newPage()
    await iframePage.goto(`file://${root}/packages/runtime/index.html?probe=1`)
    await iframePage.evaluate(
      ({ html, code, players }) => {
        window.__previewStatus = { frames: 0, events: [], codeCharacters: code.length }
        const iframe = document.createElement('iframe')
        iframe.sandbox = 'allow-scripts'
        iframe.id = 'actual-preview'
        window.addEventListener('message', (e) => {
          if (e.source !== iframe.contentWindow) return
          window.__previewStatus.events.push(e.data.type)
          if (e.data.type === 'preview-ready')
            iframe.contentWindow.postMessage(
              { type: 'preview-code', code, players, motion: false },
              '*',
            )
          if (e.data.type === 'preview-frame') window.__previewStatus.frames++
        })
        iframe.srcdoc = html
        document.body.appendChild(iframe)
      },
      { html, code, players },
    )
    try {
      await iframePage.waitForFunction(() => window.__previewStatus.frames === 1, null, {
        timeout: 4000,
      })
    } catch (error) {
      report.iframe.push({
        players,
        passed: false,
        error: String(error.message),
        status: await iframePage.evaluate(() => window.__previewStatus),
        declaredHostCharacterCap: Number(html.match(/code\.length>(\d+)/)?.[1]) || null,
      })
      await iframePage.close()
      continue
    }
    const frame = iframePage.frames().find((f) => f !== iframePage.mainFrame())
    assert.ok(frame)
    async function canvasProof(expected, label) {
      const rendered = await frame.evaluate(() => {
        const canvas = document.querySelector('canvas'),
          pixels = canvas.getContext('2d').getImageData(0, 0, 256, 224).data
        return {
          pixels: Array.from(pixels),
          width: canvas.width,
          height: canvas.height,
          png: canvas.toDataURL('image/png'),
        }
      })
      const hash = sha(Buffer.from(rendered.pixels))
      assert.equal(rendered.width, 256)
      assert.equal(rendered.height, 224)
      assert.equal(hash, expected)
      const screenshot = `${players}p-catalog-preview-iframe-${label}.png`
      writeFileSync(resolve(output, screenshot), Buffer.from(rendered.png.split(',')[1], 'base64'))
      return { label, nativeRgbaSha256: expected, iframeRgbaSha256: hash, screenshot }
    }
    const canvasChecks = [await canvasProof(sourceStill, 'source')]
    const sendCode = (value) =>
      iframePage.evaluate(
        ({ code, players }) =>
          document
            .getElementById('actual-preview')
            .contentWindow.postMessage({ type: 'preview-code', code, players, motion: false }, '*'),
        { code: value, players },
      )
    // This is the same prefix + draftScene transition sent when model customization becomes valid.
    await sendCode(preview.prefix + custom)
    await iframePage.waitForFunction(() => window.__previewStatus.frames === 2, null, {
      timeout: 4000,
    })
    canvasChecks.push(await canvasProof(gooseStill, 'goose'))
    const unavailable = () =>
      iframePage.evaluate(
        () => window.__previewStatus.events.filter((t) => t === 'preview-unavailable').length,
      )
    const beforeReject = await unavailable(),
      oversized = '/*' + 'x'.repeat(1_000_001) + '*/'
    await sendCode(oversized)
    await iframePage.waitForFunction(
      (n) =>
        window.__previewStatus.events.filter((t) => t === 'preview-unavailable').length === n + 1,
      beforeReject,
      { timeout: 2000 },
    )
    assert.equal(
      await iframePage.evaluate(() => window.__previewStatus.frames),
      2,
      'Oversized payload must not paint',
    )
    const loop =
      'function init(api){while(true){}}function update(){}function draw(){}/*' +
      'x'.repeat(150_001) +
      '*/'
    const beforeLoop = await unavailable(),
      started = performance.now()
    await sendCode(loop)
    await iframePage.waitForFunction(
      (n) =>
        window.__previewStatus.events.filter((t) => t === 'preview-unavailable').length === n + 1,
      beforeLoop,
      { timeout: 4000 },
    )
    const loopElapsedMs = Math.round(performance.now() - started)
    assert.ok(
      loopElapsedMs >= 800 && loopElapsedMs < 4000,
      'Large infinite init must enter worker and be terminated by watchdog',
    )
    await sendCode(code)
    await iframePage.waitForFunction(() => window.__previewStatus.frames === 3, null, {
      timeout: 4000,
    })
    canvasChecks.push(await canvasProof(sourceStill, 'recovered'))
    report.iframe.push({
      players,
      passed: true,
      sandbox: 'allow-scripts',
      protocol:
        'preview-ready -> source frame -> streamed goose frame -> oversized unavailable -> hung worker unavailable -> recovered source frame',
      sourceCodeCharacters: code.length,
      canvasChecks,
      oversize: { characters: oversized.length, explicitlyRejected: true },
      infiniteInit: { characters: loop.length, watchdogTerminated: true, elapsedMs: loopElapsedMs },
      status: await iframePage.evaluate(() => window.__previewStatus),
    })
    await iframePage.close()
  }
} finally {
  await browser.close()
}
report.passed = report.iframe.length === 2 && report.iframe.every((c) => c.passed)
report.createdAt = new Date().toISOString()
writeFileSync(resolve(output, 'catalog-preview.json'), JSON.stringify(report, null, 2) + '\n')
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      retrievalChecks: report.retrieval.length,
      workerCases: report.workers.length,
      exactFrames: report.workers.reduce((n, r) => n + r.comparisons.length, 0),
      iframeCases: report.iframe,
      gooseChecks: report.goose.length,
      contentHash: report.contentHash,
      output,
    },
    null,
    2,
  ),
)
if (!report.passed) process.exitCode = 1
