import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = dirname(fileURLToPath(import.meta.url))
const frames = {}
function add(id, pixels, durationTicks, anchor, hitboxes = []) {
  frames[id] = { width: pixels[0].length, height: pixels.length, pixels, durationTicks, anchor, hitboxes, hurtboxes: [], provenance: 'Original pixel artwork authored for this project.' }
}
for (let p = 0; p < 2; p++) for (const state of ['idle', 'hit']) {
  const c = state === 'hit' ? 'a' : p ? '8' : 'c'
  const pixels = Array.from({ length: 34 }, (_, y) => y === 0 || y === 33 ? '.7777.' : y === 1 ? '777777' : y === 32 ? '155551' : `7${c.repeat(4)}1`)
  add(`paddle-${p}-${state}`, pixels, state === 'hit' ? 11 : 60, { x: 3, y: 17 }, [{ x: 0, y: 0, w: 6, h: 34 }])
}
add('ball-0', ['.777.', '777a7', '77aa7', '7aaa7', '.777.'], 5, { x: 2, y: 2 }, [{ shape: 'circle', x: 2, y: 2, radius: 2 }])
add('ball-1', ['.777.', '7aa77', '7a777', '77777', '.777.'], 5, { x: 2, y: 2 }, [{ shape: 'circle', x: 2, y: 2, radius: 2 }])
add('spark-0', ['.7.', '777', '.7.'], 3, { x: 1, y: 1 })
add('spark-1', ['7.7', '...', '7.7'], 4, { x: 1, y: 1 })
add('spark-2', ['...', '.7.', '...'], 8, { x: 1, y: 1 })
const assets = { schemaVersion: 1, id: 'pong-art', palette: 'pico-8', provenance: { kind: 'original', authors: ['Arcade project'], sources: [], license: 'LicenseRef-Project-Original' }, coordinateSystem: 'Frame-local pixels; subtract anchor for world placement. Collision planes also include the ball radius.', frames,
  animations: { ball: { frames: ['ball-0', 'ball-1'], loop: true }, impact: { frames: ['spark-0', 'spark-1', 'spark-2'], loop: false }, paddleIdle: { frames: ['paddle-0-idle'], loop: true }, paddleHit: { frames: ['paddle-0-hit'], loop: false } } }
writeFileSync(join(dir, 'assets.json'), JSON.stringify(assets, null, 2) + '\n')
writeFileSync(join(dir, 'module.js'), readFileSync(join(dir, 'module.base.js'), 'utf8').replace('__ART__', JSON.stringify(assets)))
