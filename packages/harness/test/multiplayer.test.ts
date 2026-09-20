import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { catalogMatchEvidence, loadCatalog } from '../src/catalog.ts'
import { jevRequest } from '../src/jev.ts'
import { buildPrompt } from '../src/prompt.ts'
import { repairUserTurn } from '../src/repair.ts'
import {
  type GameSpec,
  GameSpecSchema,
  GeneratedGameSpecSchema,
  specJsonSchema,
  specPrompt,
} from '../src/spec.ts'

const legacy = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../../../library/catalog/sky-racer/spec.json'),
    'utf8',
  ),
)
const multiplayer = {
  mode: 'versus' as const,
  solo: 'Race against three CPU pilots.',
  playerOne: 'Steer the first plane, use items and boost.',
  playerTwo: 'Independently steer a second plane, use items and boost.',
  camera: 'split' as const,
  scoring: 'Separate lap progress, items, cooldowns and placement points for each pilot.',
  endConditions:
    'First human across the finish wins versus; solo wins by beating the CPU. Reset all pilots and scores.',
}

test('new specs require a real multiplayer plan; historical files remain readable', () => {
  assert.equal(GameSpecSchema.safeParse(legacy).success, true)
  assert.equal(GeneratedGameSpecSchema.safeParse(legacy).success, false)
  assert.equal(GeneratedGameSpecSchema.safeParse({ ...legacy, multiplayer }).success, true)
  for (const bad of [
    { ...multiplayer, playerTwo: '' },
    { ...multiplayer, solo: ' ' },
    { ...multiplayer, mode: 'spectator' },
  ]) {
    assert.equal(GeneratedGameSpecSchema.safeParse({ ...legacy, multiplayer: bad }).success, false)
  }
  assert.ok(specJsonSchema.required.includes('multiplayer'))
  assert.equal(specJsonSchema.properties.multiplayer.additionalProperties, false)
})

test('solo and multiplayer planning/build/repair require the same dual-mode game', () => {
  for (const players of [1, 2] as const) {
    const spec: GameSpec = { ...legacy, multiplayer, players }
    const plan = specPrompt('race airplanes', { players })
    const build = buildPrompt(spec, 'race airplanes', [])
    assert.match(plan.system, /BOTH api.players=1 and api.players=2/)
    assert.match(build.system, /BOTH api.players=1 and api.players=2/)
    assert.match(build.system, /explicit player index/)
    assert.match(build.user, /Independently steer a second plane/)
    assert.equal(build.catalog?.parts.length, 0, '1P-only plane pack cannot constrain the new game')
    assert.doesNotMatch(plan.user, /AVAILABLE TESTED FOUNDATION: ARCADE.skyRacer/)
    assert.match(
      repairUserTurn(build, spec, 'function init() {}', ['2P mode: no P2 input']),
      /2P mode: no P2 input/,
    )
  }
})

test('Jev and normal generation exclude single-mode foundations even for a solo session', () => {
  const parts = loadCatalog()
  const q = 'Mario Kart but with planes'
  const sky = parts.find((p) => p.manifest.id === 'sky-racer')!
  assert.equal(sky.status, 'verified', 'legacy playback evidence is preserved')
  const rows = catalogMatchEvidence(q, { players: 1, requireMultiplayer: true }, parts)
  assert.ok(rows.find((r) => r.part === sky)!.excluded.some((r) => r.includes('both 1P and 2P')))
  assert.ok(!jevRequest(q, { ...legacy, players: 1 }, parts).candidates.includes(sky))
  const pong = catalogMatchEvidence('Pong', { players: 1, requireMultiplayer: true }, parts)
  assert.equal(pong.find((r) => r.score > 0)?.part.manifest.id, 'pong')
})
