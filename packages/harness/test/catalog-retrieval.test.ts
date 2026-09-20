import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  assembleCatalog,
  type CatalogPart,
  catalogContext,
  catalogMatchEvidence,
  catalogSource,
  loadCatalog,
} from '../src/catalog.ts'

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/catalog-retrieval-v44.json', import.meta.url), 'utf8'),
)
const parts: CatalogPart[] = fixture.manifests.map((manifest: CatalogPart['manifest']) => ({
  manifest: {
    ...manifest,
    version: 'retrieval-fixture',
    description: '',
    assets: [],
    match: { priority: 0, requirePhrase: false, ...manifest.match },
  },
  status: 'verified',
  checks: [],
  hash: manifest.id,
  module: '(config)=>({})',
  api: '',
  dir: '',
}))
type Spec = { genre?: string; players?: number; moderated?: boolean }
const selected = (text: string, spec: Spec = {}, candidates = parts) =>
  catalogMatchEvidence(text, spec, candidates)
    .filter((r) => r.score > 0)
    .slice(0, 1)
    .map((r) => r.part.manifest.id)

test('paired request mechanics recover crossing, paddle-rally and brick-breaking variants before planning', () => {
  for (const text of [
    "a game where I'm a frog dodging cars that get faster",
    'A frog avoids traffic',
    'Dodge cars as a frog',
    'Hop across a road with traffic',
    'Cross a river on logs',
  ])
    assert.deepEqual(selected(text), ['crossing'], text)
  for (const text of [
    'Keep a ball going back and forth between two paddles',
    'A paddle and ball rally against a computer opponent',
    'Use paddles to return the ball',
  ])
    assert.deepEqual(selected(text), ['pong'], text)
  for (const text of [
    'Move a paddle to bounce a ball and destroy the bricks',
    'A paddle returns the ball to smash blocks',
    'Clear bricks by hitting them with a ball from a paddle',
  ])
    assert.deepEqual(selected(text), ['breakout'], text)
  const evidence = catalogMatchEvidence(fixture.rows[0].prompt, {}, parts).find(
    (r) => r.part.manifest.id === 'crossing',
  )!
  assert.deepEqual(evidence.signals, ['mechanics:frog avoids moving traffic'])
  assert.equal(evidence.score, 8)
})

test('only bounded genre aliases are recognized; unknown genres and lone theme nouns stay open', () => {
  for (const [genre, id] of [
    ['arcade traffic-crossing', 'crossing'],
    ['frog-crossing action', 'crossing'],
    ['arcade sports ball-paddle duel', 'pong'],
    ['competitive paddle and ball duel', 'pong'],
    ['cooperative brick breaking', 'breakout'],
  ])
    assert.deepEqual(selected('An arcade game', { genre }), [id], genre)
  for (const text of [
    'frog',
    'cars',
    'traffic',
    'ghost',
    'paddle',
    'bricks',
    'A frog paints cars',
    'Cars dodge frogs',
    'Frogs live by a pond; cars race elsewhere',
    'A brick house with a ball on the porch',
    'Paddle a boat back and forth carrying a ball',
    'A ghost paints a traffic crossing sign',
    'A space garden',
  ])
    assert.deepEqual(selected(text, { genre: 'unknown exploration' }), [], text)
  assert.deepEqual(selected('A game', { genre: 'frog painting cars' }), [])
  assert.deepEqual(selected('A game', { genre: 'paddle based crafting adventure' }), [])
})

test('explicit negation never becomes a positive name, paired mechanic or genre backdoor', () => {
  for (const [text, genre] of [
    ['Not Frogger; just a frog portrait', 'crossing'],
    ["I don't want Pong", 'pong'],
    ['No Breakout please', 'brick breaking'],
    ['A frog that is not dodging cars', 'crossing'],
    ['Pong without a ball', 'pong'],
    ['Breakout with no bricks', 'breakout'],
    ['Frogger without traffic', 'crossing'],
  ])
    assert.deepEqual(selected(text!, { genre }), [], text)
  for (const [text, id] of [
    ['Not Pong, a brick breaker', 'breakout'],
    ['No Frogger; a paddle and ball rally', 'pong'],
    ['Breakout rather than Pong', 'breakout'],
    ['Pong instead of Breakout', 'pong'],
    ['Pong without guns', 'pong'],
    ['Not just Pong: make it faster', 'pong'],
    ['A frog dodging cars but no guns', 'crossing'],
  ])
    assert.deepEqual(selected(text!), [id], text)
})

test('unsupported additions and competing core loops abstain instead of silently losing requested mechanics', () => {
  for (const [text, genre] of [
    ['two frogs catching flies and dodging cars together', 'cooperative frog-crossing action'],
    ['Frogger with a tongue attack', 'crossing'],
    ['Frogger where you drive a car', 'crossing'],
    ['Frogger in a maze', 'crossing'],
    ['A frog shooting cars', 'crossing'],
    ['Pong with bricks to destroy', 'pong'],
    ['Pong and Frogger', 'pong'],
    ['Breakout with falling blocks that you rotate', 'breakout'],
    ['Pong and a frog dodging cars while catching flies', 'pong'],
    ['A paddle and ball rally with guns', 'pong'],
    ['Pong with both players on the same side', 'pong'],
    ['Breakout with shooting lasers', 'breakout'],
  ])
    assert.deepEqual(selected(text!, { genre, players: 2 }), [], text)
  assert.deepEqual(
    selected('A frog dodging cars', { genre: 'racing' }),
    ['crossing'],
    'incidental planner genre cannot replace requested mechanics',
  )
  assert.deepEqual(
    selected('tanks in an arena, last one standing wins', {
      genre: 'versus tank combat',
      players: 2,
    }),
    [],
  )
})

test('named local packs keep their positive-phrase gate, priority, admission and player constraints', () => {
  const base = parts.find((p) => p.manifest.id === 'kart')!
  const local: CatalogPart = {
    ...base,
    hash: 'private',
    manifest: {
      ...base.manifest,
      id: 'pole-position-reference',
      match: { phrases: ['pole position'], genres: ['racing'], priority: 1, requirePhrase: true },
    },
  }
  const candidates = [...parts, local]
  assert.deepEqual(selected('Pole Position', { genre: 'racing' }, candidates), [
    'pole-position-reference',
  ])
  assert.deepEqual(selected('A kart race', { genre: 'racing' }, candidates), ['kart'])
  assert.deepEqual(
    selected('Pole Position', { genre: 'racing' }, [...parts, { ...local, status: 'draft' }]),
    ['kart'],
  )
  assert.deepEqual(selected('not Pole Position; a kart race', { genre: 'racing' }, candidates), [
    'kart',
  ])
  assert.deepEqual(
    selected(
      'frog dodging cars',
      { players: 2 },
      parts.map((p) => ({ ...p, manifest: { ...p.manifest, supportsPlayers: [1] } })),
    ),
    [],
  )
  assert.deepEqual(selected('Pole Position', { moderated: true, genre: 'racing' }, candidates), [
    'kart',
  ])
  assert.deepEqual(selected('frog dodging cars', { moderated: true, genre: 'unknown' }), [])
  assert.deepEqual(selected('Frogger', { moderated: true, genre: 'brick-breaker' }), ['breakout'])
  assert.deepEqual(selected('frog dodging cars', {}, [...parts].reverse()), ['crossing'])
  assert.equal(catalogContext('frog dodging cars', {}, parts).parts[0]?.manifest.id, 'crossing')
})

test('character pair hints cannot replace explicit kart or paddle mechanics with fighting', () => {
  for (const players of [1, 2]) {
    for (const request of [
      'Batman and Flash riding karts',
      'Batman versus Flash racing go-karts',
      'Batman and Flash drive karts on a circuit',
      'Batman and Flash in a kart race',
    ])
      assert.deepEqual(selected(request, { players }), ['kart'], request)
    for (const request of [
      'Pong with Batman and Flash as the paddles',
      'Batman and Flash return a ball back and forth with paddles',
    ])
      assert.deepEqual(selected(request, { players, genre: 'fighting' }), ['pong'], request)
    for (const request of ['Batman and Flash', 'Street Fighter with Batman and Flash'])
      assert.deepEqual(selected(request, { players }), ['fighter'], request)
  }
  assert.deepEqual(selected('Not racing karts; Street Fighter with Batman and Flash'), ['fighter'])
  assert.deepEqual(selected('Pong with Batman and Flash and bricks to destroy'), [])
  assert.deepEqual(selected('Street Fighter and a kart race'), [])
})

test('actual retrieved kart, Pong and fighter wrappers link and use the correct 1P/2P controllers', async () => {
  const { Runtime } = await import(new URL('../../runtime/src/runtime.ts', import.meta.url).href)
  const installed = loadCatalog()
  for (const players of [1, 2])
    for (const [request, entry] of [
      ['Batman and Flash riding karts', 'kart'],
      ['Pong with Batman and Flash as the paddles', 'pong'],
      ['Street Fighter with Batman and Flash', 'fighter'],
    ]) {
      // This is an offline controller-routing/linking proof, not a model-generated
      // finished reskin. Requested identities still require truthful presentation.
      const context = catalogContext(request!, { players }, installed)
      assert.equal(context.parts[0]?.manifest.entry, entry, request)
      const spriteIds = context.sprites?.map((s) => s.id) ?? []
      const spriteSetup = spriteIds.length
        ? `const actors=${JSON.stringify(spriteIds)}.map(id=>ART.get(id));api.__linkedActors=actors.map(actor=>Object.keys(actor.frames).length);`
        : ''
      const source = `let game;function init(api){${spriteSetup}game=ARCADE.${entry}(${entry === 'fighter' ? '{characterSelect:true}' : '{}'});game.init(api)}function update(api,dt){game.update(api,dt)}function draw(api){game.draw(api);api.__capture(game.inspect())}`
      const code = assembleCatalog(source, context)
      assert.equal(catalogSource(code), source)
      assert.equal(assembleCatalog(code, context), code, 'repair relinking remains idempotent')
      let state: Record<string, unknown> = {}
      const runtime = new Runtime(null, { probe: true, post: () => {} })
      assert.deepEqual(runtime.load(code, 19, 'ROUTING TEST', 0, players), { ok: true })
      runtime.api.__capture = (snapshot: Record<string, unknown>) => {
        state = snapshot
      }
      runtime.start()
      runtime.step(1)
      if (spriteIds.length)
        assert.ok(runtime.api.__linkedActors.every((frames: number) => frames > 0))
      if (entry === 'kart') {
        runtime.step(181)
        const initial = structuredClone(state.racers) as { human: boolean; distance: number }[]
        runtime.input.set(players - 1, 'a', true)
        runtime.step(100)
        const raced = state.racers as { human: boolean; distance: number }[]
        assert.equal(raced.filter((r) => r.human).length, players)
        assert.ok(raced[players - 1]!.distance > initial[players - 1]!.distance + 100)
        if (players === 2) assert.equal(raced[0]!.distance, initial[0]!.distance)
        assert.equal(state.fighters, undefined)
      } else if (entry === 'pong') {
        const before = JSON.stringify(state.paddles)
        runtime.input.set(players - 1, 'up', true)
        runtime.step(20)
        assert.notEqual(JSON.stringify(state.paddles), before)
        assert.ok(state.ball)
        assert.equal(state.fighters, undefined)
      } else {
        assert.equal(state.phase, 'select')
        for (let player = 0; player < players; player++) runtime.input.set(player, 'a', true)
        runtime.step(1)
        for (let player = 0; player < players; player++) runtime.input.set(player, 'a', false)
        runtime.step(140)
        assert.equal(state.phase, 'fight')
        assert.deepEqual(
          (state.fighters as { id: string }[]).map((f) => f.id),
          ['batman', 'flash'],
        )
      }
      assert.notEqual(runtime.state, 'error', request)
    }
})

function legacy(text: string, spec: Spec) {
  const norm = (s: string) =>
    ` ${s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()} `
  return parts
    .map((part) => {
      const m = part.manifest,
        input = norm(spec.moderated ? '' : text)
      const phrase = (m.match?.phrases ?? m.tags).reduce(
        (best, p) =>
          input.includes(norm(p)) ? Math.max(best, 10 + norm(p).trim().split(' ').length) : best,
        0,
      )
      const genre = (m.match?.genres ?? m.tags).some(
        (g) => norm(g).trim() === norm(spec.genre ?? '').trim(),
      )
        ? 5
        : 0
      return { part, score: m.match?.requirePhrase && !phrase ? 0 : phrase + genre }
    })
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.part.manifest.match?.priority ?? 0) - (a.part.manifest.match?.priority ?? 0) ||
        a.part.manifest.id.localeCompare(b.part.manifest.id),
    )
    .slice(0, 1)
    .map((r) => r.part.manifest.id)
}

test('frozen standard32 requests isolate offline coverage changes from historical game quality', (t) => {
  assert.equal(fixture.rows.length, 32)
  const complete = fixture.rows.filter((r: { spec: Spec | null }) => r.spec)
  assert.equal(complete.length, 31)
  let before = 0,
    after = 0,
    changed = 0
  for (const row of complete) {
    const old = legacy(row.prompt, row.spec),
      current = selected(row.prompt, row.spec)
    assert.deepEqual(
      old,
      row.historicalSelection,
      `${row.runId}: frozen legacy matcher matches the stored catalog selection`,
    )
    assert.deepEqual(current, row.expectedSelection, row.prompt)
    if (old.length) before++
    if (current.length) after++
    if (JSON.stringify(old) !== JSON.stringify(current)) changed++
  }
  assert.equal(changed, 1)
  t.diagnostic(
    `Retrieval-only offline comparison: ${before}/31 -> ${after}/31 selections, one justified crossing recovery; other30 unchanged. One of32 requests has no saved spec. No generation, latency or game-quality conclusion.`,
  )
})
