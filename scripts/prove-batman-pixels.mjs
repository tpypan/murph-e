// Exact source-color Batman frame rendering, both directions, through native fighter.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..'),
  cache = resolve(root, 'data/reference-cache/spriters-resource/dc-arcade/batman-fighter'),
  out = resolve(cache, 'native-pixels'),
  actor = JSON.parse(readFileSync(resolve(cache, 'actor.json'))),
  module = readFileSync(resolve(root, 'library/catalog/fighter/module.js'), 'utf8'),
  sha = (x) => createHash('sha256').update(x).digest('hex')
mkdirSync(out, { recursive: true })
const { chromium } = createRequire(resolve(root, 'packages/probe/package.json'))('playwright'),
  browser = await chromium.launch(),
  page = await browser.newPage(),
  comparisons = []
try {
  await page.route('**/*', (r) =>
    r.request().url().startsWith('file:') ? r.continue() : r.abort(),
  )
  await page.goto(`${pathToFileURL(resolve(root, 'packages/runtime/index.html')).href}?probe=1`)
  await page.waitForFunction(() => Boolean(window.__probe))
  for (const [name, frame] of Object.entries(actor.frames)) {
    const fixture = structuredClone(actor)
    fixture.animations.idle = {
      loop: true,
      frames: [{ frame: name, duration: 60, anchor: frame.anchor, hitboxes: [], hurtboxes: [] }],
    }
    const code = `const game=(${module})({assets:{subject:${JSON.stringify(fixture)}},roster:['subject','subject'],sound:false});function init(api){game.init(api)}function update(){}function draw(api){game.draw(api)}`
    const expected = `data:image/png;base64,${readFileSync(resolve(cache, 'frames', `${name}.png`)).toString('base64')}`
    const result = await page.evaluate(
      async ({ code, expected, frame }) => {
        const p = window.__probe,
          load = p.load(code, 7, 'BATMAN SOURCE COLORS', 2)
        if (!load.ok) throw Error(JSON.stringify(load))
        p.start()
        const rt = window.__runtime,
          orig = rt.api.spr,
          np = 1 + (frame.layers?.length || 0),
          results = []
        let n = 0,
          bg,
          origin
        const pixels = () => {
          const p = new Uint32Array(256 * 224)
          rt.screen.blit(p)
          return new Uint8Array(p.buffer)
        }
        const img = new Image()
        img.src = expected
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const src = ctx.getImageData(0, 0, img.width, img.height).data
        rt.api.spr = (...args) => {
          if (n % np === 0) {
            bg = pixels()
            origin = { x: args[1], y: args[2], flip: args[3] }
          }
          orig(...args)
          n++
          if (n % np) return
          const actual = pixels()
          let mismatches = 0,
            opaque = 0,
            transparent = 0,
            clipped = 0
          for (let y = 0; y < img.height; y++)
            for (let x = 0; x < img.width; x++) {
              const dx = origin.x + (origin.flip ? img.width - 1 - x : x),
                dy = origin.y + y,
                si = (y * img.width + x) * 4,
                di = (dy * 256 + dx) * 4
              if (dx < 0 || dx >= 256 || dy < 0 || dy >= 224) {
                clipped++
                continue
              }
              if (src[si + 3]) {
                opaque++
                for (let k = 0; k < 4; k++)
                  if (src[si + k] !== actual[di + k]) {
                    mismatches++
                    break
                  }
              } else {
                transparent++
                for (let k = 0; k < 4; k++)
                  if (bg[di + k] !== actual[di + k]) {
                    mismatches++
                    break
                  }
              }
            }
          results.push({ ...origin, mismatches, opaque, transparent, clipped })
        }
        p.step(1)
        rt.api.spr = orig
        return { results, errors: p.errors(), png: p.snapshot() }
      },
      { code, expected, frame },
    )
    assert.deepEqual(result.errors, [])
    assert.equal(result.results.length, 2)
    for (const r of result.results) {
      assert.equal(r.mismatches, 0, name)
      assert.equal(r.clipped, 0, name)
    }
    if (['ready', 'kick', 'prone', 'throw'].includes(name))
      writeFileSync(resolve(out, `${name}.png`), Buffer.from(result.png.split(',')[1], 'base64'))
    comparisons.push({ name, source: frame.source, renders: result.results })
  }
  writeFileSync(
    resolve(out, 'proof.json'),
    `${JSON.stringify({ moduleSha256: sha(module), actorSha256: sha(readFileSync(resolve(cache, 'actor.json'))), frames: 33, comparisons: 66, mismatches: 0, results: comparisons }, null, 2)}\n`,
  )
  console.log('66 exact native source/mirror comparisons passed')
} finally {
  await browser.close()
}
