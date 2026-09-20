import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const dir = import.meta.dirname,
  root = resolve(dir, '../../..'),
  require = createRequire(resolve(root, 'packages/probe/package.json'))
const { chromium } = require('playwright'),
  module = readFileSync(resolve(dir, 'module.js'), 'utf8')
const browser = await chromium.launch(),
  page = await browser.newPage({ viewport: { width: 768, height: 672 } })
const results = []
try {
  await page.route('**/*', (route) =>
    route.request().url().startsWith('file:') ? route.continue() : route.abort(),
  )
  await page.goto('file://' + resolve(root, 'packages/runtime/index.html') + '?probe=1')
  mkdirSync(resolve(dir, 'screenshots'), { recursive: true })
  for (const players of [1, 2]) {
    const code = `const game=(${module})({});let held=[new Set(),new Set()],previous=[new Set(),new Set()];function init(api){game.init(api)}function update(api){const s=game.inspect();for(const p of s.people){const act=s.acts[p.act],gap=act.terrain.some((point,i)=>i&&point[2]&&p.x>act.terrain[i-1][0]-65&&p.x<point[0]+10),enemy=!p.roll&&p.enemies.some(e=>!e.dead&&e.x-p.x>0&&e.x-p.x<38);held[p.id]=new Set(p.dead||p.transition||p.finished?[]:['right',...(gap||enemy?['a']:[]),...(!gap&&p.grounded&&Math.abs(p.vx)>2?['down']:[])]);if(p.id===1&&s.ticks<45)held[p.id].clear()}const proxy=Object.create(api);proxy.btn=(k,p=0)=>held[p].has(k);proxy.btnp=(k,p=0)=>held[p].has(k)&&!previous[p].has(k);game.update(proxy);previous=held.map(x=>new Set(x))}function draw(api){game.draw(api)}`
    const load = await page.evaluate(
      ({ code, players }) => window.__probe.load(code, 7, 'AZURE DASH', players),
      { code, players },
    )
    if (!load.ok) throw Error(JSON.stringify(load))
    await page.evaluate(() => window.__probe.start())
    let last = 0
    for (const [name, tick] of [
      ['start', 12],
      ['hills', 130],
      ['loop', 192],
      ['spring', 280],
      ['ridge', 700],
      ['finish', 1200],
    ]) {
      const state = await page.evaluate((n) => window.__probe.step(n), tick - last)
      last = tick
      const image = await page.evaluate(() => window.__probe.snapshot())
      writeFileSync(
        resolve(dir, `screenshots/${players}p-${name}.png`),
        Buffer.from(image.split(',')[1], 'base64'),
      )
      results.push({
        players,
        name,
        tick,
        moduleHash: createHash('sha256').update(module).digest('hex'),
        load,
        state,
      })
      if (state.error) throw Error(JSON.stringify(state))
    }
  }
  writeFileSync(resolve(dir, 'render-results.json'), JSON.stringify(results, null, 2) + '\n')
  console.log('Captured 12 native runtime frames, 1P and 2P; no model/network calls')
} finally {
  await browser.close()
}
