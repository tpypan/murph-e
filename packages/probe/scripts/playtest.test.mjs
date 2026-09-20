import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { playtest } from '../src/playtest.ts'
import { closeProbe } from '../src/probe.ts'

after(closeProbe)
const game = (end) => `
let ticks;
function init(){ticks=0}
function update(api){ticks++; if(ticks===60){api.addScore(100);api.sfx('coin');api.flash();api.shake();api.${end}()}}
function draw(api){api.cls(0);api.spr(['01'],20,30,false,false,['#000000','#123456']);api.rect(ticks%200,50,4,4,7)}
`
test('finite wins are not deaths, while losses remain losable; telemetry survives palette runtime', async () => {
  const options = { seconds: 4, shots: false, controls: [] }
  const win = await playtest(game('win'), options)
  assert.equal(win.ok, true)
  assert.equal(win.idleDeathS, null)
  assert.equal(win.botDeathS, null)
  assert.equal(win.losable, false)
  assert.equal(win.grace, true)
  assert.equal(win.botScore, 100)
  assert.equal(win.scoreEvents, 1)
  assert.equal(win.sfxCalls, 1)
  assert.equal(win.flash, 1)
  assert.equal(win.shake, 1)
  assert.ok(win.colors >= 3)
  const loss = await playtest(game('gameOver'), options)
  assert.equal(loss.ok, true)
  assert.equal(loss.idleDeathS, 1)
  assert.equal(loss.botDeathS, 1)
  assert.equal(loss.losable, true)
  assert.equal(loss.grace, false)
})
