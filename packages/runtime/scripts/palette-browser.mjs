import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const preview = readFileSync(resolve(root, 'packages/runtime/build-preview.html'), 'utf8')
const workerCode = JSON.parse(preview.match(/new Blob\(\[("(?:[^"\\]|\\.)*")\],/)?.[1] || 'null')
assert.equal(typeof workerCode, 'string', 'test the worker actually embedded in build-preview.html')
const colors = [
  '#000000',
  '#0033ee',
  '#0066ff',
  '#0088ff',
  '#162eaa',
  '#263faa',
  '#3650aa',
  '#4661aa',
  '#5672aa',
  '#6683aa',
  '#7694aa',
  '#86a5aa',
  '#96b6aa',
  '#a6c7aa',
  '#b6d8aa',
]
const code = `const COLORS=${JSON.stringify(colors)},OTHER=['#000000',...COLORS.slice(1).reverse()];
const ROW=Array.from({length:15},(_,i)=>i.toString(16).repeat(12)).join(''),PIXELS=Array.from({length:16},(_,i)=>i%4===0?'.'.repeat(180):ROW);
function init(){}function update(){}function draw(api){api.cls(13);api.spr(PIXELS,8,24,false,false,COLORS);api.spr(PIXELS,8,50,true,true,OTHER);for(let y=0;y<16;y++)for(let x=0;x<180;x++)api.pset(x+8,y+80,api.pget(x+8,y+24));api.text('EXACT RGB',8,108,7);api.text('PGET APPROX BELOW',8,120,7);api.spr(['f.0.8'],200,24);}`
const browser = await chromium.launch()
const report = []
const out = '/tmp/arcade-palette-test'
mkdirSync(out, { recursive: true })
try {
  const page = await browser.newPage()
  await page.goto(`file://${root}/packages/runtime/index.html?probe=1`)
  for (const players of [1, 2]) {
    const result = await page.evaluate(
      async ({ code, workerCode, players }) => {
        const probe = window.__probe
        const loaded = probe.load(code, 7, '', players)
        probe.start()
        const state = probe.step(1)
        const packed = new Uint32Array(256 * 224)
        window.__runtime.screen.blit(packed)
        const worker = await new Promise((resolve, reject) => {
          const url = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' })),
            w = new Worker(url)
          const timer = setTimeout(() => {
            w.terminate()
            URL.revokeObjectURL(url)
            reject(Error('worker timeout'))
          }, 3000)
          w.onerror = (e) => {
            clearTimeout(timer)
            w.terminate()
            URL.revokeObjectURL(url)
            reject(Error(e.message))
          }
          w.onmessage = (e) => {
            clearTimeout(timer)
            w.terminate()
            URL.revokeObjectURL(url)
            resolve(e.data.type === 'pixels' ? Array.from(e.data.pixels) : e.data)
          }
          w.postMessage({ code, players, motion: false })
        })
        return {
          loaded,
          state,
          native: Array.from(new Uint8Array(packed.buffer)),
          worker,
          snapshot: probe.snapshot(),
          hash: probe.frameHash(),
          stats: probe.frameStats(),
        }
      },
      { code, workerCode, players },
    )
    assert(result.loaded.ok)
    assert.equal(result.state.error, null)
    assert.deepEqual(result.worker, result.native, 'DRAFT worker RGBA must equal native probe RGBA')
    for (let i = 0; i < colors.length; i++) {
      const rgb = Number.parseInt(colors[i].slice(1), 16),
        offset = (25 * 256 + 8 + i * 12) * 4
      assert.deepEqual(result.native.slice(offset, offset + 4), [
        (rgb >>> 16) & 255,
        (rgb >>> 8) & 255,
        rgb & 255,
        255,
      ])
    }
    assert(result.stats.colors > 16)
    const png = Buffer.from(result.snapshot.split(',')[1], 'base64')
    writeFileSync(resolve(out, `${players}p-exact-colors.png`), png)
    report.push({
      players,
      state: result.state,
      hash: result.hash,
      stats: result.stats,
      workerMatches: true,
      all15ColorsExact: true,
      pngHash: createHash('sha256').update(png).digest('hex'),
    })
  }
  const invalid = await page.evaluate(
    async (workerCode) =>
      new Promise((resolve, reject) => {
        const url = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' })),
          worker = new Worker(url)
        const timer = setTimeout(() => {
          worker.terminate()
          reject(Error('worker timeout'))
        }, 3000)
        worker.onmessage = (e) => {
          clearTimeout(timer)
          worker.terminate()
          URL.revokeObjectURL(url)
          resolve(e.data.type)
        }
        worker.postMessage({
          code: "function init(){}function update(){}function draw(api){api.spr(['f'],0,20,false,false,['#123456'])}",
          players: 1,
          motion: false,
        })
      }),
    workerCode,
  )
  assert.equal(invalid, 'unavailable')
  report.push({ invalidPaletteWorker: 'unavailable' })
} finally {
  await browser.close()
}
writeFileSync(resolve(out, 'browser-results.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
