import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import vm from 'node:vm'
import { ROOT } from '../src/env.ts'
import { buildPrompt } from '../src/prompt.ts'
import { referenceContext } from '../src/reference-context.ts'
import { type GameSpec, GameSpecSchema, specJsonSchema, specPrompt } from '../src/spec.ts'

function example(id: string, expression: string) {
  const code = readFileSync(resolve(ROOT, `library/reference/${id}.js`), 'utf8')
  return vm.runInNewContext(`${code}\n${expression}`, {}, { timeout: 1000 })
}

test('maze layout is rectangular; every pellet is reachable without entering the house', () => {
  const result = example(
    'maze-chase',
    `(() => {
    const badWidths = MAZE_LAYOUT.filter(row => row.length !== 19).length;
    const start = { x:9, y:15 };
    const unreachable = [];
    for (let y=0;y<19;y++) for(let x=0;x<19;x++) {
      if ('.o'.includes(mazeTile(x,y)) && !mazeStepToward(start,{x,y},'player')) unreachable.push([x,y]);
    }
    return { badWidths, unreachable, playerDoor:mazeCanEnter(9,7,'player'),
      ghostDoor:mazeCanEnter(9,7,'leaving'), wrap:mazeNeighbor(0,9,-1,0,'player'),
      noWrap:mazeNeighbor(0,0,-1,0,'player') };
  })()`,
  )
  assert.equal(result.badWidths, 0)
  assert.deepEqual(Array.from(result.unreachable), [])
  assert.equal(result.playerDoor, false)
  assert.equal(result.ghostDoor, true)
  assert.equal(result.wrap.x, 18)
  assert.equal(result.noWrap, null)
})

test('all ghosts leave the house; captured ghosts visibly travel home and leave again', () => {
  example(
    'maze-chase',
    `
    for (let id=0;id<4;id++) {
      const g=mazeGhost(id);
      for(let t=0;t<600;t++) mazeGhostTick(g,true,false);
      if(g.state !== 'chase' || g.x!==9 || g.y!==6) throw Error('ghost failed to exit');
      g.x=1;g.y=3;g.state='frightened';
      if(!mazeCapture(g) || mazeCapture(g)) throw Error('capture must score once');
      if(g.x!==1 || g.y!==3) throw Error('capture teleported');
      let sawHouse=false;
      for(let t=0;t<600;t++) { mazeGhostTick(g,true,true); if(g.state==='house') sawHouse=true; }
      if(!sawHouse || g.state!=='frightened') throw Error('return/release failed');
    }
    for(const sprite of MAZE_GHOST_FRAMES)
      if(sprite.length!==12 || sprite.some(row=>row.length!==12 || /[^.0-9a-f]/.test(row))) throw Error('invalid sprite');
  `,
  )
})

test('combat damage window matches contact pose, hits once, and recovery cannot attack', () => {
  example(
    'combat',
    `
    const f={id:0,x:50,y:190,face:1,hp:100,stun:0,move:null};
    const g={id:1,x:66,y:190,face:-1,hp:100,stun:0,move:null,blocking:false};
    if(!combatStart(f,'jab')) throw Error('could not start');
    let hits=0;
    for(let age=0;age<21;age++) {
      const phase=combatPhase(f.move,f.moveAge);
      if(phase.active !== (age>=6 && age<9)) throw Error('bad window');
      if((phase.pose==='jab-contact') !== phase.active) throw Error('pose mismatch');
      const hit=combatHit(f,g,{x:60,y:140,w:20,h:50});
      if(hit) hits++;
      if(combatStart(f,'heavy')) throw Error('cancel bypassed recovery');
      combatAdvance(f);
    }
    if(hits!==1 || g.hp!==93 || f.move!==null) throw Error('incorrect damage/reset');
  `,
  )
})

test('guard requires facing the attack and knockout interrupts a move', () => {
  example(
    'combat',
    `
    for(const face of [-1,1]) {
      const f={id:0,x:50,y:190,face:1,hp:100,stun:0,move:null};
      const g={id:1,x:66,y:190,face,hp:7,stun:0,move:null,blocking:true};
      combatStart(f,'jab');f.moveAge=6;
      const hit=combatHit(f,g,{x:60,y:140,w:20,h:50});
      if(hit.blocked !== (face===-1)) throw Error('wrong guard direction');
      if(face===1 && (g.hp!==0 || combatStart(g,'jab'))) throw Error('KO can attack');
    }
  `,
  )
})

test('references follow mechanics and preserve new genres, moderation and opt-out', () => {
  assert.deepEqual(referenceContext('Pac-Man but a goose hunts the ghosts').ids, ['maze-chase'])
  assert.deepEqual(referenceContext('hero', { genre: 'side-view fighting' }).ids, ['combat'])
  assert.deepEqual(referenceContext('snake').ids, [])
  assert.deepEqual(referenceContext('Pac-Man', { moderated: true, genre: 'runner' }).ids, [])
  assert.equal(referenceContext('Street Fighter').hash, referenceContext('Street Fighter').hash)
  assert.ok(referenceContext('Street Fighter in a maze').text.length < 18000)
  const previous = process.env.HTN_REFERENCE_CONTEXT
  try {
    process.env.HTN_REFERENCE_CONTEXT = '0'
    assert.equal(referenceContext('Street Fighter').text, '')
  } finally {
    if (previous === undefined) delete process.env.HTN_REFERENCE_CONTEXT
    else process.env.HTN_REFERENCE_CONTEXT = previous
  }
})

test('planner gets the structural contract; builder gets working code and sprite data', () => {
  const transcript = 'Pac-Man but a goose hunts ghosts'
  const p = specPrompt(transcript)
  assert.match(p.user, /ghost-only door/)
  assert.doesNotMatch(p.user, /function mazeGhost/)
  const spec: GameSpec = {
    title: 'GOOSE CHASE',
    oneLiner: 'Hunt ghosts in a maze.',
    genre: 'maze chase',
    mechanics: ['The goose hunts ghosts.'],
    controls: {
      left: 'Turn left',
      right: 'Turn right',
      up: 'Turn up',
      down: 'Turn down',
      a: null,
      b: null,
    },
    palette: 'arcade',
    lose: 'Lose all lives',
    scoring: 'Catch ghosts',
    moderated: false,
    note: '',
    remix: false,
    changes: [],
    players: 1,
  }
  const intent = {
    reference: 'Pac-Man',
    preserve: ['Ghost house and tunnels'],
    change: ['Goose hunts ghosts permanently'],
  }
  const parsed = GameSpecSchema.parse({ ...spec, referenceIntent: intent })
  assert.deepEqual(parsed.referenceIntent, intent)
  assert.ok(specJsonSchema.required.includes('referenceIntent'))
  assert.match(p.system, /ghosts flee by default/)
  const b = buildPrompt({ ...parsed, players: 1 }, transcript, [])
  assert.match(b.user, /Goose hunts ghosts permanently/)
  assert.match(b.user, /function mazeGhost/)
  assert.match(b.user, /MAZE_GHOST_FRAMES/)
  assert.match(b.user, /not functions already installed/)
})
