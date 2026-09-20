import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = dirname(fileURLToPath(import.meta.url))
const frames = {}
function add(id, pixels, durationTicks, anchor, hitboxes = []) {
  frames[id] = { width: pixels[0].length, height: pixels.length, pixels, durationTicks, anchor, hitboxes, hurtboxes: [], provenance: 'Original pixel artwork authored for this project.' }
}
for (let p = 0; p < 2; p++) for (const width of [32, 40, 52]) for (const state of ['idle', 'hit']) {
  const c = state === 'hit' ? 'a' : p ? '8' : 'c'
  const pixels = Array.from({ length: 7 }, (_, y) => Array.from({ length: width }, (_, x) =>
    (x < 2 || x >= width - 2) && (y === 0 || y === 6) ? '.' : y < 2 ? '7' : y > 4 ? '1' : x < 3 || x >= width - 3 ? '6' : c).join(''))
  add(`paddle-${p}-${width}-${state}`, pixels, state === 'hit' ? 10 : 60, { x: width / 2, y: 0 }, [{ x: 0, y: 0, w: width, h: 7 }])
}
for (const color of [12, 10, 9, 14, 11, 8, 13]) for (const hp of [1, 2, 3]) {
  const c = color.toString(16)
  const pixels = Array.from({ length: 9 }, (_, y) => Array.from({ length: 23 }, (_, x) => {
    if (x === 0 || x === 22 || y === 8) return '1'
    if (y === 0 || x === 1) return '7'
    if (hp < 3 && (x === 11 + (y % 3) - 1 || hp === 1 && x === 17 - y)) return '1'
    if (hp === 3 && ((x === 3 || x === 19) && y === 3)) return '7'
    return c
  }).join(''))
  add(`brick-${color}-${hp}`, pixels, 60, { x: 0, y: 0 }, [{ x: 0, y: 0, w: 23, h: 9 }])
}
add('ball-0', ['.777.', '777a7', '77aa7', '7aaa7', '.777.'], 5, { x: 2, y: 2 }, [{ shape: 'circle', x: 2, y: 2, radius: 2 }])
add('ball-1', ['.777.', '7aa77', '7a777', '77777', '.777.'], 5, { x: 2, y: 2 }, [{ shape: 'circle', x: 2, y: 2, radius: 2 }])
for (const [type, color, icon] of [['wide', 'c', ['.....', '7...7', '77777', '7...7', '.....']], ['slow', 'b', ['.777.', '.7...', '.777.', '...7.', '.777.']], ['multi', 'e', ['.....', '.7.7.', '.....', '..7..', '.....']]]) for (let phase = 0; phase < 2; phase++) {
  const pixels = Array.from({ length: 9 }, (_, y) => Array.from({ length: 9 }, (_, x) => x === 0 || x === 8 || y === 0 || y === 8 ? (phase ? '7' : color) : x >= 2 && x <= 6 && y >= 2 && y <= 6 && icon[y - 2][x - 2] === '7' ? '7' : '1').join(''))
  add(`pickup-${type}-${phase}`, pixels, 10, { x: 4, y: 4 }, [{ x: 0, y: 0, w: 9, h: 9 }])
}
add('spark-0', ['.7.', '777', '.7.'], 3, { x: 1, y: 1 })
add('spark-1', ['7.7', '...', '7.7'], 4, { x: 1, y: 1 })
add('spark-2', ['...', '.7.', '...'], 8, { x: 1, y: 1 })
const assets = { schemaVersion: 1, id: 'breakout-art', palette: 'pico-8', provenance: { kind: 'original', authors: ['Arcade project'], sources: [], license: 'LicenseRef-Project-Original' }, coordinateSystem: 'Frame-local pixels; ball circle expands brick and paddle contact volumes.', frames,
  animations: { ball: { frames: ['ball-0', 'ball-1'], loop: true }, impact: { frames: ['spark-0', 'spark-1', 'spark-2'], loop: false }, brickDamage: { frames: ['brick-12-3', 'brick-12-2', 'brick-12-1'], loop: false, advance: 'one frame per accepted collision, not elapsed time' }, wide: { frames: ['pickup-wide-0', 'pickup-wide-1'], loop: true }, slow: { frames: ['pickup-slow-0', 'pickup-slow-1'], loop: true }, multi: { frames: ['pickup-multi-0', 'pickup-multi-1'], loop: true } } }
writeFileSync(join(dir, 'assets.json'), JSON.stringify(assets, null, 2) + '\n')
writeFileSync(join(dir, 'module.js'), readFileSync(join(dir, 'module.base.js'), 'utf8').replace('__ART__', JSON.stringify(assets)))
