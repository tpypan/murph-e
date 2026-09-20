import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import { closeProbe, probe } from '../src/probe.ts'

after(closeProbe)
const options = { controls: ['left', 'right', 'a'], thumb: false }
const fixture = (name) =>
  readFileSync(new URL(`../../../bench/known-bad/${name}.js`, import.meta.url), 'utf8')

test('crashes on A and directions fail even if other controls work', async () => {
  for (const name of ['crashes-on-a', 'crashes-on-direction']) {
    const r = await probe(fixture(name), options)
    assert.equal(r.ok, false)
    assert.equal(r.checks.survivesInput, false)
    assert.ok(r.observations.some((o) => o.includes('crashed when player 1')))
  }
})

test('a soft B check cannot hide an input crash', async () => {
  const code = fixture('crashes-on-direction').replace("if (api.btn('left'))", "if (api.btnp('b'))")
  const r = await probe(code, { ...options, controls: [...options.controls, 'b'] })
  assert.equal(r.ok, false)
  assert.equal(r.checks.survivesInput, false)
})

test('player two input crashes are hard failures', async () => {
  const code = fixture('crashes-on-direction').replace(
    "if (api.btn('left'))",
    "if (api.btn('left', 1))",
  )
  const r = await probe(code, { ...options, players: 2 })
  assert.equal(r.ok, false)
  assert.equal(r.checks.survivesInput, false)
  assert.ok(r.observations.some((o) => o.includes('crashed when player 2')))
})

const airSteering = `
let x, flight
function init() { x = 120; flight = 0 }
function update(api) {
  if (api.btnp('a')) flight = 40
  if (flight > 0) {
    flight--
    if (api.btn('left')) x--
    if (api.btn('right')) x++
  }
}
function draw(api) {
  api.cls(1)
  api.rectfill(0, 190, 256, 34, 3)
  api.rectfill(x, 100 - flight, 12, 12, 8)
  api.rectfill(api.frame % 200, 50, 10, 10, 10)
}`

test('directions that work only after jumping pass', async () => {
  const r = await probe(airSteering, options)
  assert.equal(r.ok, true, r.observations.join('; '))
  assert.equal(r.checks.respondsToDirection, true)
})

test('A-only movement does not mask broken direction controls', async () => {
  const r = await probe(
    airSteering.replaceAll('x--', 'flight += 0').replaceAll('x++', 'flight += 0'),
    options,
  )
  assert.equal(r.ok, false)
  assert.equal(r.checks.respondsToDirection, false)
  assert.equal(r.checks['responds:a'], true)
})

const drift = `
let x, leaning
function init() { x = 120; leaning = false }
function update(api) {
  const direction = (api.btn('right') ? 1 : 0) - (api.btn('left') ? 1 : 0)
  x += direction
  leaning = direction !== 0 && api.btn('a')
}
function draw(api) {
  api.cls(1)
  api.rectfill(0, 190, 256, 34, 3)
  api.rectfill(x, 100, leaning ? 20 : 12, 12, 8)
  api.rectfill(api.frame % 200, 50, 10, 10, 10)
}`

test('held actions that require steering pass without changing their mechanic', async () => {
  const r = await probe(drift, options)
  assert.equal(r.ok, true, r.observations.join('; '))
  assert.equal(r.checks['responds:a'], true)
})

test('steering alone cannot make a dead action pass', async () => {
  const r = await probe(drift.replace("direction !== 0 && api.btn('a')", 'false'), options)
  assert.equal(r.ok, false)
  assert.equal(r.checks.respondsToDirection, true)
  assert.equal(r.checks['responds:a'], false)
})

test('a crash only when combining action and steering remains a hard failure', async () => {
  const r = await probe(
    drift.replace(
      'leaning = direction',
      "if (direction && api.btn('a')) throw new Error('drift crash'); leaning = direction",
    ),
    options,
  )
  assert.equal(r.ok, false)
  assert.equal(r.checks.survivesInput, false)
})

const twoActors = `
let positions
function init(api) { positions = Array.from({length:api.players}, (_,i)=>50+i*100) }
function update(api) {
  for (let player=0;player<positions.length;player++) {
    if(api.btn('left',player)) positions[player]-=1
    if(api.btn('right',player)) positions[player]+=1
    if(api.btnp('a',player)) positions[player]+=12
  }
}
function draw(api) {
  api.cls(1)
  api.rectfill(0,190,256,34,3)
  positions.forEach((x,i)=>api.rectfill(x,100,12,12,i===0?8:10))
  api.rectfill(api.frame%200,50,10,10,7)
}`

test('action-only multiplayer cannot pass when player two is ignored', async () => {
  const broken = twoActors.replaceAll("api.btnp('a',player)", "player===0 && api.btnp('a',0)")
  const result = await probe(broken, { players: 2, controls: ['a'], thumb: false })
  assert.equal(result.ok, false)
  assert.equal(result.checks.respondsToP2, false)
})

test('dual-mode checks accept independently controlled actors and action-only games', async () => {
  for (const controls of [['left', 'right', 'a'], ['a']]) {
    const result = await probe(twoActors, {
      players: 2,
      controls,
      thumb: false,
      requireIndependentPlayers: true,
    })
    assert.equal(result.ok, true, result.observations.join('; '))
    assert.equal(result.checks.independentPlayerEffects, true)
  }
})

test('a mirrored shared controller fails the independent-player check', async () => {
  const mirrored = twoActors
    .replaceAll("api.btn('left',player)", "(api.btn('left',0)||api.btn('left',1))")
    .replaceAll("api.btn('right',player)", "(api.btn('right',0)||api.btn('right',1))")
    .replaceAll("api.btnp('a',player)", "(api.btnp('a',0)||api.btnp('a',1))")
  const result = await probe(mirrored, { ...options, players: 2, requireIndependentPlayers: true })
  assert.equal(result.ok, false)
  assert.equal(result.checks.respondsToP2, true)
  assert.equal(result.checks.independentPlayerEffects, false)
})
