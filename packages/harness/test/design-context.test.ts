import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  DESIGN_CARD_IDS,
  designCore,
  MAX_CONTEXT_CARDS,
  MAX_CONTEXT_CHARS,
  recordDesignContext,
  selectDesignContext,
} from '../src/design-context.ts'
import { buildPrompt, loadTemplates } from '../src/prompt.ts'
import { remixSystemPrompt, remixUserTurn } from '../src/remix.ts'
import { repairUserTurn } from '../src/repair.ts'
import { createRun } from '../src/run-store.ts'
import { type GameSpec, GameSpecSchema, specJsonSchema, specPrompt } from '../src/spec.ts'

const spec: GameSpec = {
  title: 'ROOFTOP HOP',
  oneLiner: 'Jump between roofs.',
  genre: 'platformer',
  mechanics: ['Jump across gaps and collect fruit.'],
  controls: { left: 'Move left', right: 'Move right', up: null, down: null, a: 'Jump', b: null },
  palette: 'arcade',
  lose: 'Fall off the roof.',
  scoring: 'Collect fruit.',
  moderated: false,
  note: '',
  remix: false,
  changes: [],
  players: 1,
}
const ids = (text: string, game: Partial<GameSpec> = {}) =>
  selectDesignContext(text, game).cards.map((c) => c.id)

test('new and hybrid genres survive validation without mapping to a template', () => {
  for (const genre of ['fighting', 'rhythm', 'racing', 'puzzle-platformer', 'magnetic-golf']) {
    const game = GameSpecSchema.parse({ ...spec, genre })
    assert.equal(game.genre, genre)
    const prompt = buildPrompt({ ...game, players: 1 }, genre, loadTemplates())
    assert.equal(prompt.chosen, null)
    assert.doesNotMatch(prompt.system, /EXAMPLE GAME/)
    assert.doesNotMatch(prompt.user, /TEMPLATE TO ADAPT/)
  }
  assert.equal('enum' in specJsonSchema.properties.genre, false)
  assert.equal(GameSpecSchema.safeParse({ ...spec, genre: '' }).success, false)
})

test('art direction and detailed mechanics survive specification and build handoff', () => {
  const mechanics = Array.from({ length: 10 }, (_, i) => `Required mechanic ${i}`)
  const game = GameSpecSchema.parse({
    ...spec,
    genre: 'fighting',
    mechanics,
    artDirection: '56px fighters with attack, guard and hurt silhouettes.',
  })
  const prompt = buildPrompt({ ...game, players: 1 }, 'Street Fighter', loadTemplates())
  assert.match(prompt.user, /56px fighters/)
  assert.match(prompt.user, /Required mechanic 9/)
  assert.ok(specJsonSchema.required.includes('artDirection'))
})

test('example selection respects player count and does not impose a different game', () => {
  const templates = loadTemplates()
  assert.ok(buildPrompt(spec, 'platformer', templates).chosen)
  assert.equal(buildPrompt({ ...spec, players: 2 }, 'coop platformer', templates).chosen, null)
  assert.ok(buildPrompt({ ...spec, players: 2, genre: 'coop' }, 'coop', templates).chosen)
})

test('unused control labels become null rather than advertising fake actions', () => {
  assert.equal(
    GameSpecSchema.parse({ ...spec, controls: { ...spec.controls, b: 'No action' } }).controls.b,
    null,
  )
  const game = GameSpecSchema.parse({
    ...spec,
    controls: {
      left: ' Move left ',
      right: 'Move right',
      up: 'Unused',
      down: null,
      a: 'none',
      b: 'N/A',
    },
  })
  assert.deepEqual(game.controls, {
    left: 'Move left',
    right: 'Move right',
    up: null,
    down: null,
    a: null,
    b: null,
  })
})

test('explicit signature mechanics survive a mismatched template genre', () => {
  assert.ok(
    ids('swing between buildings with a grapple', { genre: 'dodge' }).includes('swing-grapple'),
  )
  assert.ok(ids('a maze where ghosts chase me', { genre: 'dodge' }).includes('grid-movement'))
  assert.ok(ids('pong with both human players', { genre: 'versus' }).includes('ball-paddle'))
})

test('spec model can select guidance for unfamiliar references without a name dictionary', () => {
  const selected = ids('a game with Quindle the Magnificent', {
    designCards: ['reference-identity', 'readability'],
  })
  assert.ok(selected.includes('reference-identity'))
  assert.ok(selected.includes('readability'))
})

test('new premises do not inherit the old game signature before specification', () => {
  const current = {
    ...spec,
    genre: 'shooter' as const,
    mechanics: ['Shoot many bullets.'],
    designCards: ['projectiles'],
  }
  const p = specPrompt('snake but the snake is a train', { current })
  assert.ok(p.context.cards.some((c) => c.id === 'grid-movement'))
  assert.equal(p.context.cards[0]?.id, 'grid-movement')
  assert.ok(p.user.includes('A game is already on screen'))
})

test('legacy specs parse without designCards; invalid model selections are rejected', () => {
  assert.ok(GameSpecSchema.safeParse(spec).success)
  assert.equal(GameSpecSchema.safeParse({ ...spec, designCards: ['invented-card'] }).success, false)
  assert.equal(
    GameSpecSchema.safeParse({ ...spec, designCards: DESIGN_CARD_IDS.slice(0, 5) }).success,
    false,
  )
})

test('context is deterministic, deduplicated, bounded and does not embed source URLs', () => {
  const transcript =
    'Swing, jump, shoot fireballs, chase ghosts, pong paddles, snakes, moving platforms and combos'
  const a = selectDesignContext(transcript, {
    ...spec,
    designCards: ['platforming', 'platforming'],
  })
  assert.deepEqual(
    a,
    selectDesignContext(transcript, { ...spec, designCards: ['platforming', 'platforming'] }),
  )
  assert.ok(a.cards.length <= MAX_CONTEXT_CARDS)
  assert.equal(a.cards.length, new Set(a.cards.map((c) => c.id)).size)
  assert.ok(a.characters <= MAX_CONTEXT_CHARS)
  assert.doesNotMatch(a.text, /https?:\/\//)
  assert.ok(a.sources.length > 0)
  assert.ok(a.sources.every((s) => s.url.startsWith('https://')))
  assert.notEqual(a.hash, selectDesignContext('a calm pong match').hash)
})

test('a moderated replacement selects from its own spec, not the original transcript', () => {
  const c = selectDesignContext('swing from vines', {
    ...spec,
    moderated: true,
    designCards: ['platforming'],
  })
  assert.equal(
    c.cards.some((x) => x.id === 'swing-grapple'),
    false,
  )
})

test('a previously moderated game does not suppress a new request before specification', () => {
  const p = specPrompt('swing from vines', { current: { ...spec, moderated: true } })
  assert.ok(p.context.cards.some((c) => c.id === 'swing-grapple'))
})

test('core prefix remains cacheable while per-request card selection changes', () => {
  const templates = loadTemplates()
  const a = buildPrompt(spec, 'jump over gaps', templates)
  const b = buildPrompt(
    { ...spec, genre: 'shooter', designCards: ['projectiles'] },
    'shoot fireballs',
    templates,
  )
  assert.equal(a.system, b.system)
  assert.notEqual(a.user, b.user)
  assert.ok(a.user.includes(a.designContext.text))
  assert.ok(a.system.includes(designCore()))
  assert.ok(specPrompt('jump').user.includes('SELECTED ARCADE DESIGN GUIDANCE'))
  assert.match(specPrompt('jump').system, /Select up to four designCards/)
})

test('two-player prompts retain their input contract and relevant guidance', () => {
  const p = buildPrompt(
    { ...spec, players: 2, genre: 'versus' },
    'pong for two humans',
    loadTemplates(),
  )
  assert.match(p.system, /api\.btn\(name, 0\)/)
  assert.ok(p.designContext.cards.some((c) => c.id === 'ball-paddle'))
  assert.match(specPrompt('pong', { players: 2 }).system, /currently starting with two humans/)
})

test('repair and remix preserve the selected guidance without widening edit scope', () => {
  const p = buildPrompt(spec, 'jump across rooftops', loadTemplates())
  const repaired = repairUserTurn(p, spec, 'function init() {}', ['A crashes'])
  const remixed = remixUserTurn(
    spec,
    'function init() {}',
    ['Increase jump height'],
    p.designContext,
    'Increase jump height, but keep the original timer.',
  )
  assert.ok(repaired.includes(p.designContext.text))
  assert.ok(remixed.includes(p.designContext.text))
  assert.match(remixed, /Do not redesign or retune unrelated mechanics/)
  assert.match(repaired, /change as little as needed/)
  assert.ok(repaired.includes('=== WHAT THE PERSON SAID ===\njump across rooftops'))
  assert.ok(
    remixed.includes(
      '=== WHAT THE PERSON SAID ===\nIncrease jump height, but keep the original timer.',
    ),
  )
  const remixSystem = remixSystemPrompt(p)
  assert.ok(remixSystem.startsWith(p.system))
  assert.match(remixSystem, /earlier complete-game output instruction.*is replaced/)
  assert.doesNotMatch(remixSystem, /120-to-220-line/)
  assert.match(
    remixSystem.split('=== REMIX STAGE OUTPUT CONTRACT ===')[1]!,
    /Output only small SEARCH\/REPLACE blocks/,
  )
})

test('multiplayer and art guidance preserve the selected factory instead of contradicting it', () => {
  const planner = specPrompt('Pong for two players', { players: 2 })
  assert.doesNotMatch(planner.system, /round must be decidable within about a minute/)
  assert.match(planner.system, /Preserve a supplied foundation's documented round timing/)
  const p = buildPrompt(
    { ...spec, players: 2, genre: 'pong', scoring: 'One point for winning a rally.' },
    'Pong for two players, first to seven',
    [],
  )
  assert.equal(p.catalog?.parts[0]?.manifest.id, 'pong')
  assert.match(p.user, /One point earns 100 runtime score/)
  assert.doesNotMatch(p.system, /give a point with api\.addScore\(1,/)
  assert.match(p.system, /planner's spec is a draft interpretation/)
  assert.doesNotMatch(p.system, /a fixed 16-colour palette/)
  assert.match(p.system, /no global 16-colour limit across a scene/)
  for (const players of [1, 2] as const)
    assert.match(specPrompt('A richly shaded pixel game', { players }).system, /aligned planes/)
})

test('repair retains an explicit requested change even when the draft spec contradicts it', () => {
  const request = 'Pac-Man but I am a goose hunting fleeing ghosts; do not collect pellets'
  const draft = { ...spec, genre: 'maze', mechanics: ['Collect pellets while ghosts chase you.'] }
  const prompt = buildPrompt(draft, request, [])
  const repaired = repairUserTurn(prompt, draft, 'function init(){}', ['A crashes'])
  assert.equal(prompt.transcript, request)
  assert.ok(repaired.includes(request))
  assert.ok(repaired.includes(draft.mechanics[0]!))
  assert.match(prompt.system, /explicit user request.*priority/)
  assert.doesNotThrow(() =>
    repairUserTurn({ ...prompt, transcript: undefined }, draft, 'function init(){}', []),
  )
})

test('run artifacts retain exact selected text, versions, hashes and provenance', () => {
  const run = createRun('jump on roofs', mkdtempSync(join(tmpdir(), 'htn-context-')))
  const context = selectDesignContext('jump on roofs', spec)
  recordDesignContext(run, 'build', context)
  const stored = JSON.parse(readFileSync(join(run.dir, 'context-build.json'), 'utf8'))
  assert.deepEqual(stored, context)
  const event = readFileSync(join(run.dir, 'events.jsonl'), 'utf8')
  assert.match(event, /design-context/)
})

test('context can be disabled for comparison without affecting prompt output contracts', () => {
  const previous = process.env.HTN_DESIGN_CONTEXT
  process.env.HTN_DESIGN_CONTEXT = '0'
  try {
    const p = buildPrompt(spec, 'swing and shoot', loadTemplates())
    assert.equal(p.designContext.enabled, false)
    assert.equal(p.designContext.text, '')
    assert.deepEqual(p.designContext.cards, [])
    assert.doesNotMatch(p.system, /ARCADE DESIGN CONTRACT/)
    assert.match(p.user, /One fenced js block/)
  } finally {
    if (previous === undefined) delete process.env.HTN_DESIGN_CONTEXT
    else process.env.HTN_DESIGN_CONTEXT = previous
  }
})
