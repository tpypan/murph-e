import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { scenery } from './scenery.mjs'

const dir = import.meta.dirname
const hero = { id: 'azure-hare', subject: 'Original Azure Hare', frames: {}, animations: {} }
for (const [name, count, duration, loop] of [
  ['idle', 2, 18, true],
  ['walk', 4, 7, true],
  ['run', 6, 4, true],
  ['jump', 2, 8, true],
  ['roll', 4, 3, true],
  ['skid', 2, 6, true],
  ['hurt', 2, 7, true],
  ['victory', 2, 12, true],
]) {
  const ids = []
  for (let pose = 0; pose < count; pose++) {
    const pixels = Array.from({ length: 32 }, () => Array(32).fill('.'))
    const rect = (x, y, w, h, c) => {
      for (let yy = Math.max(0, y); yy < Math.min(32, y + h); yy++)
        for (let xx = Math.max(0, x); xx < Math.min(32, x + w); xx++) pixels[yy][xx] = c
    }
    const oval = (cx, cy, rx, ry, c) => {
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++)
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) pixels[y][x] = c
    }
    if (name === 'roll') {
      oval(16, 20, 10, 10, '1')
      oval(16, 19, 9, 9, 'c')
      oval(
        16 + Math.round(Math.cos((pose * Math.PI) / 2) * 5),
        19 + Math.round(Math.sin((pose * Math.PI) / 2) * 5),
        4,
        3,
        '7',
      )
      oval(16, 19, 3, 3, '2')
    } else {
      const bob = name === 'run' ? pose % 2 : 0
      oval(15, 21 + bob, 7, 8, '1')
      oval(15, 20 + bob, 6, 7, 'c')
      oval(17, 22 + bob, 4, 5, 'f')
      oval(16, 12 + bob, 8, 7, '1')
      oval(17, 11 + bob, 7, 6, 'c')
      rect(11, 1 + bob, 3, 10, 'c')
      rect(18, 0 + bob, 3, 10, 'c')
      rect(12, 2 + bob, 1, 6, 'e')
      rect(19, 1 + bob, 1, 6, 'e')
      oval(21, 15 + bob, 5, 3, 'f')
      rect(22, 9 + bob, 3, 4, '7')
      rect(24, 10 + bob, 1, 3, '0')
      rect(25, 14 + bob, 2, 2, '0')
      rect(9, 17 + bob, 13, 3, '9')
      rect(5, 19 + bob, 7, 3, '9')
      rect(3, 20 + bob, 4, 2, 'a')
      const stride =
        name === 'run' || name === 'walk'
          ? Math.round(Math.sin((pose / count) * Math.PI * 2) * 4)
          : 0
      rect(11 + stride, 27, 5, 3, '8')
      rect(17 - stride, 27, 5, 3, '8')
      rect(10 + stride, 30, 7, 2, '7')
      rect(16 - stride, 30, 7, 2, '7')
      if (name === 'victory') {
        rect(24, 17, 3, 7, 'c')
        rect(24, 12, 4, 5, '7')
      }
      if (name === 'skid') {
        rect(2, 28, 5, 2, '6')
        rect(0, 25, 3, 2, '7')
      }
      if (name === 'hurt') {
        rect(22, 9 + bob, 4, 1, '0')
        rect(24, 10 + bob, 1, 3, '0')
      }
    }
    const id = `${name}${pose}`
    hero.frames[id] = { pixels: pixels.map((r) => r.join('')), anchor: { x: 16, y: 32 } }
    ids.push({ frame: id, duration })
  }
  hero.animations[name] = { loop, frames: ids }
}
const art = {
  schemaVersion: 1,
  provenance: { kind: 'original', authors: ['Arcade project'], sources: [] },
  hero,
  scenery: scenery(),
}
writeFileSync(resolve(dir, 'assets.json'), JSON.stringify(art, null, 2) + '\n')
writeFileSync(
  resolve(dir, 'module.js'),
  `(function(){const SPEED_ART=${JSON.stringify(art)};\n${readFileSync(resolve(dir, 'core.js'), 'utf8')}\nreturn speedPlatformerFactory;})()`,
)
console.log('Built original speed platformer (offline)')
