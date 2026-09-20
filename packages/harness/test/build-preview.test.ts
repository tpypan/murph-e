import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  codeWindow,
  draftScene,
  draftSprite,
  draftSprites,
} from '../../../apps/cabinet/app/build-preview.ts'

test('sprite pixels arrive row by row without evaluating game code', () => {
  const partial = "const HERO = ['..88..', '.8778.', '87"
  assert.deepEqual(draftSprite(partial), { name: 'HERO', rows: ['..88..', '.8778.'] })
  assert.equal(draftSprite(`${partial}7788'];`)?.rows.length, 3)
  assert.deepEqual(draftSprite(`\`\`\`js\n${partial}`), draftSprite(partial))
  assert.equal(draftSprite('const BAD = [(()=>{throw new Error("executed")})(), "ff"];'), null)
  assert.equal(draftSprite('const enemies = [{x:3,y:4}];'), null)
  assert.equal(draftSprite('const MAP = ["111","111"]; const HERO = [".8.","888"];')?.name, 'HERO')
  assert.equal(
    draftSprite(`const HERO = [${Array(100).fill('"ffff"').join(',')}];`)?.rows.length,
    96,
  )
})

test('multiple literal sprites remain separate while their rows stream', () => {
  assert.deepEqual(draftSprites('const HERO=[".8.","888"];const STAR=[".a.","aaa", "a'), [
    { name: 'HERO', rows: ['.8.', '888'] },
    { name: 'STAR', rows: ['.a.', 'aaa'] },
  ])
})

test('literal companion palettes retain exact RGB, opaque slot zero, and partial pixel rows', () => {
  const prefix = "const HERO_PALETTE = ['#000000', '#0033ee', '#0066FF', '#0088ff'];\n"
  assert.deepEqual(draftSprite(`${prefix}const HERO = ['.12.', '0230', '1`), {
    name: 'HERO',
    rows: ['.12.', '0230'],
    palette: ['#000000', '#0033ee', '#0066FF', '#0088ff'],
  })
  assert.deepEqual(
    draftSprite(`const HERO_PALETTE = ['#123456',]\nconst HERO = ['00', '.0'];`)?.palette,
    ['#123456'],
  )
  const colors = Array.from({ length: 16 }, (_, i) => `'#${i.toString(16).repeat(6)}'`)
  assert.equal(
    draftSprite(`const HERO_PALETTE=[${colors}];const HERO=['ef','FE'];`)?.palette?.length,
    16,
  )
})

test('known partial, malformed, nonliteral, or out-of-range palettes never use legacy false colors', () => {
  const hero = "const HERO=['00','01'];"
  for (const value of [
    "['#000000', '#ffffff'", // no closing bracket
    "['#000000', '#ffff']",
    "['#000000', '#gggggg']",
    '[]',
    "['#000000']", // sprite uses absent index 1
    `[${Array(17).fill("'#000000'").join(',')}]`,
    "['#000000', '#ffffff'].map(x => x)",
    "['#000000', '#ffffff'] + other",
    "['#000000', '#ffffff']\n.concat(other)",
    "(()=>{throw new Error('must never run')})()",
    "['#000000', getColor()]",
  ])
    assert.equal(draftSprite(`const HERO_PALETTE=${value};${hero}`), null, value)
  assert.equal(draftSprite(`let HERO_PALETTE;${hero}`), null)
  assert.equal(draftSprite(`${hero}const HERO_PALETTE=['#000000','#ffffff'];`), null)
  assert.equal(
    draftSprite(`const HERO_PALETTE=['#000000','#ffffff'];let HERO_PALETTE;${hero}`),
    null,
  )
})

test('palette declarations in comments and quoted code do not change legacy sprite colors', () => {
  const hero = "const HERO=['88','78'];"
  for (const prefix of [
    '// 🕹 const HERO_PALETTE = invalid;\n',
    '/* const HERO_PALETTE = invalid; */',
    'const explanation = "const HERO_PALETTE = invalid;";',
    'const explanation = `const HERO_PALETTE = invalid;`;',
  ])
    assert.deepEqual(draftSprite(prefix + hero), { name: 'HERO', rows: ['88', '78'] })
  assert.equal(draftSprite('// const GHOST=["88","88"];'), null)
  assert.deepEqual(
    draftSprites("const BAD_PALETTE=[];const BAD=['00','00'];const STAR=['aa','a.'];"),
    [{ name: 'STAR', rows: ['aa', 'a.'] }],
  )
})

test('procedural previews close draw only after complete statements or blocks', () => {
  const prefix = 'function init(api) {}\nfunction update(api) {}\nfunction draw(api) {'
  assert.equal(draftScene(`${prefix} api.rectfill(0,`), null)
  assert.equal(draftScene(`${prefix} api.cls(1); api.rectfill(0,`), `${prefix} api.cls(1);\n}`)
  const loop = `${prefix} for(let i=0;i<3;i++){ api.pset(i,1,7); }`
  assert.equal(draftScene(`${loop} api.text("hi`), `${loop}\n}`)
  const strings = `${prefix} api.text("};",1,1);`
  assert.equal(draftScene(`${strings} /* }; */ api.text(`), `${strings}\n}`)
  assert.equal(draftScene('<<<<<<< SEARCH\napi.cls(1)\n=======\napi.cls(2)'), null)
  const complete = `${prefix} api.cls(0); helper(api); }\nfunction helper(api) { api.pset(1,1,7); }`
  assert.equal(draftScene(complete), complete)
})

test('code window preserves code case and wraps long lines within the CRT width', () => {
  const lines = codeWindow(
    '```js\nfunction update(api) {\n  Player.X += 12345678901234567890;\n}\n```',
    12,
    5,
  )
  assert.equal(lines.length, 5)
  assert.ok(lines.every((line) => line.length <= 12))
  assert.match(lines.join(''), /Player.X/)
  assert.doesNotMatch(lines.join(''), /```/)
})
