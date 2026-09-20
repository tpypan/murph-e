import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'

const dir = dirname(fileURLToPath(import.meta.url)), root = resolve(dir, '../../..')
const out = join(dir, 'verification/palette-adapter')
mkdirSync(out, { recursive: true })
const require = createRequire(join(root, 'packages/probe/package.json'))
const { chromium } = require('playwright')
const module = readFileSync(join(dir, 'module.js'), 'utf8')
const baseline = process.argv.includes('--baseline')
const sceneryRevision = process.argv.includes('--scenery-revision')
const label = baseline ? 'before' : sceneryRevision ? 'scenery-after' : 'after'
const before = baseline ? null : JSON.parse(readFileSync(join(out, 'before.json'), 'utf8'))
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.route('**/*', r=>r.request().url().startsWith('file:')?r.continue():r.abort())
await page.goto('file://' + root + '/packages/runtime/index.html?probe=1')
const results = []
const customResults = []
async function nativePixels(config, players) {
  const code = `const game=(${module})(${JSON.stringify(config)});function init(api){game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api)}`
  const load = await page.evaluate(({code,players})=>{const r=__probe.load(code,7,'PALETTE TEST',players);__probe.start();__probe.step(1);return r},{code,players})
  assert.equal(load.ok,true)
  const data = await page.evaluate(async()=>{
    const png=__probe.snapshot(),img=new Image();img.src=png;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=224;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    return {pixels:Array.from(ctx.getImageData(0,0,256,224).data),png,errors:__probe.errors()}
  })
  assert.equal(data.errors.length,0)
  return data
}
function fixture(id, pixels, palette) {
  return {id,sourceWidth:pixels[0].length,displayWidth:pixels[0].length,
    frames:{one:{pixels,palette,anchor:{x:Math.floor(pixels[0].length/2),y:pixels.length}}},
    animations:Object.fromEntries(['idle','drive','steerLeft','steerRight','driftLeft','driftRight','boost','crash'].map(p=>[p,{frames:['one'],frameMs:100}]))}
}
try {
  for (const players of [1, 2]) {
    const code = `const game=(${module})({laps:3});
function init(api){game.init(api)}
function update(api,dt){const s=game.inspect(),old=api.btn;api.btn=(b,p=0)=>{const c=s.racers[p],v=-c.x*2+c.curve*.6;return b==='a'||b==='left'&&v<-.035||b==='right'&&v>.035||b==='b'&&Math.abs(c.curve)>.3&&(api.frame%110)<75};game.update(api,dt);api.btn=old}
function draw(api){game.draw(api)}`
    const load = await page.evaluate(({ code, players }) => { const r = __probe.load(code, 7, 'COAST CIRCUIT', players); __probe.start(); return r }, { code, players })
    assert.equal(load.ok, true)
    let prev = 0
    for (const [name, frame] of [['grid', 1], ['straight', 440], ['corner', 540], ['s-bend', 660], ['late', 1800]]) {
      await page.evaluate(n => __probe.step(n), frame - prev); prev = frame
      const data = await page.evaluate(() => ({ png: __probe.snapshot(), hash: __probe.frameHash(), errors: __probe.errors() }))
      assert.equal(data.errors.length, 0)
      writeFileSync(join(out, `${label}-${players}p-${name}.png`), Buffer.from(data.png.split(',')[1], 'base64'))
      if (before && !sceneryRevision) assert.equal(data.hash, before.results.find(r => r.players === players && r.name === name).hash, `${players}P ${name} legacy rendering changed`)
      results.push({ players, name, frame, hash: data.hash, errors: data.errors })
    }
  }
  if (!baseline) {
    const source=['..1111..','.100001.','12000021','22222222'],palette=['#000000','#ABCDEF','#FE5432']
    for(const players of [1,2]){
      const art=fixture('exact',source,palette)
      const data=await nativePixels({assets:{vehicles:[art]},drivers:[{asset:'exact'},{asset:'exact'}]},players)
      const scale=players===1?1.55:.87,w=Math.round(8*scale),h=Math.round(4*scale),x=Math.round(128-4*w/8)
      let checked=0,black=0
      for(let p=0;p<players;p++){
        const base=players===1?219:p===0?113:220,y=base-h
        for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){
          const index=source[Math.floor((dy+.5)*4/h)][Math.floor((dx+.5)*8/w)]
          if(index==='.')continue
          const hex=palette[parseInt(index,16)],offset=((y+dy)*256+x+dx)*4
          const expected=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))
          assert.deepEqual(data.pixels.slice(offset,offset+3),expected,`${players}P source pixel ${dx},${dy}`)
          checked++;if(index==='0')black++
        }
      }
      assert.ok(black>0)
      writeFileSync(join(out,`custom-exact-${players}p.png`),Buffer.from(data.png.split(',')[1],'base64'))
      customResults.push({players,test:'native exact scaled RGB including opaque black',checkedPixels:checked,blackPixels:black,errors:data.errors})
    }
    const first=fixture('first',['1111','1111'],['#000000','#FA0123'])
    const second=fixture('second',Array(140).fill('1111'),['#000000','#16CDCA'])
    const clipped=await nativePixels({assets:{vehicles:[first,second]},drivers:[{asset:'first'},{asset:'second'}]},2)
    let lower=0
    for(let y=12;y<224;y++)for(let x=0;x<256;x++){
      const i=(y*256+x)*4,isSecond=clipped.pixels[i]===22&&clipped.pixels[i+1]===205&&clipped.pixels[i+2]===202
      if(isSecond){assert.ok(y>=119,'second player art leaked above its viewport');lower++}
    }
    assert.ok(lower>100)
    writeFileSync(join(out,'custom-clipped-2p.png'),Buffer.from(clipped.png.split(',')[1],'base64'))
    customResults.push({players:2,test:'native tall P2 sprite never writes into P1 viewport',visiblePixels:lower,errors:clipped.errors})
  }
} finally { await browser.close() }
writeFileSync(join(out, `${label}.json`), JSON.stringify({ moduleHash: createHash('sha256').update(module).digest('hex'), legacyEqual: !baseline && !sceneryRevision, intentionalSceneryRevision: sceneryRevision, legacyReference: before?.moduleHash, results, customResults }, null, 2) + '\n')
console.log(`${sceneryRevision ? 'Captured revised scenery for' : baseline ? 'Captured' : 'Matched'} ${results.length} native legacy frames; ${customResults.length} custom palette/viewport checks passed`)
