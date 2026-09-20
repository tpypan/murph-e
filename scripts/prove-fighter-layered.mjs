// Offline proof: cached source pixels through the actual fighter and native renderer.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const folder = resolve(root, 'data/reference-cache/spriters-resource/spider-man')
const reviewed = process.argv.includes('--reviewed')
const web = process.argv.includes('--web')
const output = resolve(
  folder,
  web ? 'fighter-web-pixels-proof' : reviewed ? 'fighter-reviewed-proof' : 'fighter-layered-proof',
)
const require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const hash = (text) => createHash('sha256').update(text).digest('hex')
const assetFile = resolve(
  folder,
  web
    ? 'custom-assets-web.json'
    : reviewed
      ? 'custom-assets-reviewed.json'
      : 'custom-assets-layered.json',
)
const moduleFile = resolve(root, 'library/catalog/fighter/module.js')
const frozenFiles = [
  'custom-assets.json',
  'custom-assets-exact.json',
  'custom-assets-layered.json',
  'layered-palette-import.json',
  'runtime-proof.json',
  'prototype-game.js',
  ...(web
    ? [
        'custom-assets-reviewed.json',
        'custom-assets-web.json',
        'reviewed-reactions/proof.json',
        'web-import/proof.json',
      ]
    : []),
]
const before = Object.fromEntries(
  frozenFiles.map((file) => [file, hash(readFileSync(resolve(folder, file)))]),
)
const character = JSON.parse(readFileSync(assetFile))['spider-man-reference']
const factory = readFileSync(moduleFile, 'utf8')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch()
const results = []
try {
  const page = await browser.newPage()
  await page.route('**/*', (route) =>
    route.request().url().startsWith('http') ? route.abort() : route.continue(),
  )
  await page.goto(`${pathToFileURL(resolve(root, 'packages/runtime/index.html')).href}?probe=1`)
  await page.waitForFunction(() => Boolean(window.__probe))
  for (const [name, frame] of Object.entries(character.frames)) {
    // An explicit stationary render fixture selects each source frame via the public
    // assets contract. The fighter still computes origins, facing and layer draws.
    const fixture = structuredClone(character)
    fixture.animations.idle = {
      loop: true,
      frames: [{ frame: name, duration: 10, anchor: frame.anchor, hitboxes: [], hurtboxes: [] }],
    }
    const code = `const factory=${factory};let g;function init(api){g=factory({roster:['subject','subject'],assets:{subject:${JSON.stringify(fixture)}},sound:false});g.init(api)}function update(){}function draw(api){g.draw(api)}`
    const sourceId = String(frame.source.sourceFrameId).padStart(3, '0')
    const originalScaled = resolve(folder, 'frames/scaled-source-exact', `${sourceId}.png`)
    const expectedPath = name.startsWith('web')
      ? resolve(folder, 'web-import', `${name}.png`)
      : existsSync(originalScaled)
        ? originalScaled
        : resolve(folder, 'reviewed-reactions', `${sourceId}-decoded.png`)
    const expected = `data:image/png;base64,${readFileSync(expectedPath).toString('base64')}`
    const stats = await page.evaluate(
      async ({ code, expected, frame }) => {
        const loaded = window.__probe.load(code, 19, 'SOURCE RGB / FIGHTER', 2)
        if (!loaded.ok) throw Error(loaded.error)
        window.__probe.start()
        const runtime = window.__runtime
        const original = runtime.api.spr
        const planeCount = 1 + (frame.layers?.length ?? 0)
        let call = 0,
          background,
          origin
        const renders = []
        const pixels = () => {
          const result = new Uint32Array(256 * 224)
          runtime.screen.blit(result)
          return new Uint8Array(result.buffer)
        }
        const image = new Image()
        image.src = expected
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0)
        const source = ctx.getImageData(0, 0, image.width, image.height).data
        runtime.api.spr = (...args) => {
          if (call % planeCount === 0) {
            background = pixels()
            origin = { x: args[1], y: args[2], flip: args[3] }
          }
          original(...args)
          call++
          if (call % planeCount) return
          const actual = pixels()
          let opaque = 0,
            transparent = 0,
            black = 0,
            mismatches = 0,
            clipped = 0
          for (let y = 0; y < frame.size.h; y++)
            for (let x = 0; x < frame.size.w; x++) {
              const dx = origin.x + (origin.flip ? frame.size.w - 1 - x : x),
                dy = origin.y + y
              if (dx < 0 || dx >= 256 || dy < 0 || dy >= 224) {
                clipped++
                continue
              }
              const si = (y * frame.size.w + x) * 4,
                ai = (dy * 256 + dx) * 4
              if (source[si + 3]) {
                opaque++
                if (!source[si] && !source[si + 1] && !source[si + 2]) black++
                if (actual.slice(ai, ai + 4).some((v, i) => v !== source[si + i])) mismatches++
              } else {
                transparent++
                if (actual.slice(ai, ai + 4).some((v, i) => v !== background[ai + i])) mismatches++
              }
            }
          renders.push({ ...origin, opaque, transparent, black, mismatches, clipped })
        }
        window.__probe.step(1)
        runtime.api.spr = original
        return {
          renders,
          calls: call,
          errors: window.__probe.errors(),
          screenshot: window.__probe.snapshot(),
        }
      },
      { code, expected, frame },
    )
    assert.equal(stats.calls, 2 * (1 + (frame.layers?.length ?? 0)), name)
    assert.deepEqual(stats.errors, [])
    for (const [i, render] of stats.renders.entries()) {
      assert.equal(render.mismatches, 0, `${name}/${i} exact native RGB and transparency`)
      assert.equal(render.clipped, 0, `${name}/${i} unclipped fixture`)
      assert.equal(
        render.x,
        Math.round((i ? 187 : 69) - (i ? frame.size.w - 1 - frame.anchor.x : frame.anchor.x)),
      )
      assert.equal(render.y, 184 - frame.anchor.y)
    }
    if (['src000', 'src234', 'src345', 'src346'].includes(name))
      writeFileSync(
        resolve(output, `${name}.png`),
        Buffer.from(stats.screenshot.split(',')[1], 'base64'),
      )
    results.push({ frame: name, planes: 1 + (frame.layers?.length ?? 0), renders: stats.renders })
  }
  const gameplay = []
  if (!web) {
    // Actual unmodified clip set, controlled by runtime inputs rather than render fixtures.
    const code = `const factory=${factory};const assets=${JSON.stringify({ 'spider-man-reference': character })};let game;
function init(api){game=factory({roster:['spider-man-reference','flash'],names:['SPIDER-MAN','FLASH'],assets,roundsToWin:1,roundSeconds:20,sound:false});game.init(api)}
function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api);api.__capture?.(game.inspect())}`
    writeFileSync(resolve(output, 'game.js'), code)
    for (const players of [1, 2]) {
      await page.evaluate(
        ({ code, players }) => {
          const r = window.__probe.load(code, 19, 'SOURCE RGB FIGHTER', players)
          if (!r.ok) throw Error(r.error)
          window.__runtime.api.__capture = (state) => {
            window.fighterState = state
          }
          window.__probe.start()
          window.__probe.step(79)
        },
        { code, players },
      )
      await page.evaluate(() => {
        window.__probe.input(0, 'down', true)
        window.__probe.input(0, 'b', true)
        window.__probe.step(14)
      })
      const capture = await page.evaluate(() => ({
        png: window.__probe.snapshot(),
        state: window.__probe.step(0),
        errors: window.__probe.errors(),
      }))
      assert.deepEqual(capture.errors, [])
      writeFileSync(
        resolve(output, `${players}p-special.png`),
        Buffer.from(capture.png.split(',')[1], 'base64'),
      )
      await page.evaluate(() => {
        window.__probe.input(0, 'down', false)
        window.__probe.input(0, 'b', false)
        window.__probe.step(3)
      })
      const recovery = await page.evaluate(() => window.__probe.snapshot())
      writeFileSync(
        resolve(output, `${players}p-recovery.png`),
        Buffer.from(recovery.split(',')[1], 'base64'),
      )
      const run = await page.evaluate(() => {
        const captures = []
        const seen = new Set()
        let state
        for (let i = 0; i < 1400; i++) {
          state = window.__probe.step(1)
          const f = window.fighterState.fighters[0]
          const pose =
            f.animation === 'hurt'
              ? f.animationAge < 7
                ? 'hurt-first'
                : 'hurt-second'
              : f.animation === 'ko'
                ? f.animationAge < 25
                  ? `fall-${Math.floor(f.animationAge / 5)}`
                  : f.animationAge >= 45
                    ? 'ko-grounded'
                    : null
                : null
          if (pose && !seen.has(pose)) {
            seen.add(pose)
            captures.push({ pose, fighter: f, png: window.__probe.snapshot() })
          }
        }
        return { state, captures }
      })
      assert.equal(run.state.error, null)
      for (const capture of run.captures)
        writeFileSync(
          resolve(output, `${players}p-${capture.pose}.png`),
          Buffer.from(capture.png.split(',')[1], 'base64'),
        )
      if (reviewed && players === 1) {
        assert.ok(run.captures.some((c) => c.pose === 'hurt-first'))
        assert.ok(run.captures.some((c) => c.pose === 'ko-grounded'))
        assert.equal(run.state.state, 'gameover')
      }
      gameplay.push({
        players,
        state: run.state,
        captures: run.captures.map(({ png, ...rest }) => rest),
        errors: await page.evaluate(() => window.__probe.errors()),
      })
    }
    const gallery = await browser.newPage({ viewport: { width: 1024, height: 496 } })
    const panels = [
      ['2p-special.png', 'EXACT SOURCE COLORS'],
      ['1p-ko-grounded.png', 'AUTHORED KNOCKDOWN'],
    ].map(
      ([file, label]) =>
        `<section><h2>${label}</h2><img src="data:image/png;base64,${readFileSync(resolve(output, file)).toString('base64')}" /></section>`,
    )
    await gallery.setContent(
      `<style>body{margin:0;background:#000;color:white;font:16px monospace;display:flex}section{width:512px}h2{height:48px;margin:0;display:grid;place-items:center;font-size:16px;font-weight:normal}img{width:512px;height:448px;image-rendering:pixelated;display:block}</style>${panels.join('')}`,
    )
    await gallery.screenshot({ path: resolve(output, 'native-overview.png') })
    await gallery.close()
  }
  for (const file of frozenFiles)
    assert.equal(hash(readFileSync(resolve(folder, file))), before[file])
  const report = {
    date: new Date().toISOString(),
    moduleSha256: hash(readFileSync(moduleFile)),
    assetSha256: hash(readFileSync(assetFile)),
    unchangedInputs: before,
    frames: results.length,
    nativeComparisons: results.length * 2,
    mismatches: results.flatMap((r) => r.renders).reduce((n, r) => n + r.mismatches, 0),
    results,
    gameplay,
    limits: web
      ? [
          'All character and effect frames are selected through stationary fighter render fixtures in both facings; gameplay and projectile behavior are intentionally outside this proof.',
          'Expected PNGs are independently decoded from source RGBA by the importers; original timing/state metadata remains unverified.',
        ]
      : [
          'Render fixtures validate controller origins/layer order/native pixels; gameplay captures separately retain the actual clip set.',
          '9/16 source scaling remains; original timing/state mapping and web projectile behavior are not reproduced. Reviewed reactions are authored sequencing, not recovered original metadata.',
          'Special pose shows real source effects; the moving projectile remains the existing generic fighter projectile.',
        ],
  }
  writeFileSync(resolve(output, 'proof.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(
    JSON.stringify(
      {
        frames: report.frames,
        nativeComparisons: report.nativeComparisons,
        mismatches: report.mismatches,
        gameplay: gameplay.map(({ players, state, errors, captures }) => ({
          players,
          state,
          errors,
          captures: captures.map((c) => c.pose),
        })),
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
