// Break a template on purpose, probe it, repair it once, probe again.
// Run: pnpm --filter @htn/harness exec tsx src/repair-test.ts
import { closeProbe, probe } from '@htn/probe'
import { readRepoFile } from './env.ts'
import { buildPrompt, loadTemplates } from './prompt.ts'
import { repair } from './repair.ts'
import type { GameSpec } from './spec.ts'

const spec: GameSpec = {
  title: 'SKY FALL',
  oneLiner: 'Dodge anvils, catch pies.',
  genre: 'dodge',
  hook: 'Pies fall through the anvil lanes, so catching them means standing under danger.',
  ramp: 'anvils; at 20 s two at a time; at 45 s a fast one that splits',
  mechanics: ['move left and right', 'hop with A', 'anvils hurt, pies score'],
  controls: { left: 'move left', right: 'move right', up: null, down: null, a: 'hop', b: null },
  palette: 'arcade',
  lose: 'three hits',
  scoring: 'pies and survival',
  moderated: false,
  note: '',
  remix: false,
  changes: [],
  players: 1,
}
const good = readRepoFile('library/templates/dodge.js')
// Two bugs: A no longer hops, and the game ends itself at frame 30.
const broken = good
  .replace("if ((api.btnp('a') || api.btnp('b')) && g.onGround) {", 'if (false) {')
  .replace(
    'function update(api, dt) {\n  g.time += dt',
    'function update(api, dt) {\n  g.time += dt\n  if (api.frame === 30) api.gameOver()',
  )
if (broken === good) throw new Error('template changed; update repair-test')

const controls = ['left', 'right', 'a']
const before = await probe(broken, { controls, title: spec.title })
console.log('before:', before.ok ? 'PASS' : 'FAIL', before.observations)
if (before.ok) throw new Error('expected the broken game to fail')

const prompt = buildPrompt(spec, 'dodge the falling anvils and catch the pies', loadTemplates())
const t0 = performance.now()
const r = await repair(prompt, spec, broken, before.observations)
console.log(
  `repair: ${((performance.now() - t0) / 1000).toFixed(1)}s, ${r.usage.output} tokens, syntax ${r.syntaxError ?? 'ok'}`,
)
const after = r.syntaxError ? null : await probe(r.code, { controls, title: spec.title })
console.log('after:', after?.ok ? 'PASS' : 'FAIL', after?.observations ?? [r.syntaxError])
await closeProbe()
process.exit(after?.ok ? 0 : 1)
