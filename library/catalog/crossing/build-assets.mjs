import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const frames = {},
  animations = {}
function picture(w, h) {
  const p = Array.from({ length: h }, () => Array(w).fill('.'))
  const dot = (x, y, c) => {
    if (x >= 0 && x < w && y >= 0 && y < h) p[y][x] = c.toString(16)
  }
  const rect = (x, y, ww, hh, c) => {
    for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) dot(xx, yy, c)
  }
  return { p, dot, rect, rows: () => p.map((r) => r.join('')) }
}
function frame(id, pixels, box) {
  frames[id] = {
    pixels,
    size: { w: pixels[0].length, h: pixels.length },
    anchor: { x: Math.floor(pixels[0].length / 2), y: Math.floor(pixels.length / 2) },
    hitboxes: box ? [box] : [],
    hurtboxes: box ? [box] : [],
  }
}
function clip(id, ids, duration = 6) {
  animations[id] = {
    loop: true,
    frames: ids.map((id) => ({
      frame: id,
      duration,
      anchor: frames[id].anchor,
      hitboxes: frames[id].hitboxes,
      hurtboxes: frames[id].hurtboxes,
    })),
  }
}
for (let p = 0; p < 2; p++)
  for (const [direction, turns] of [
    ['up', 0],
    ['right', 1],
    ['down', 2],
    ['left', 3],
  ]) {
    const ids = []
    for (let pose = 0; pose < 3; pose++) {
      const c = picture(16, 16)
      c.rect(4, 4, 8, 8, 3)
      c.rect(5, 3, 6, 8, 11)
      c.rect(3, 2, 3, 4, 11)
      c.rect(10, 2, 3, 4, 11)
      c.dot(4, 3, 7)
      c.dot(11, 3, 7)
      c.dot(4, 2, 0)
      c.dot(11, 2, 0)
      c.rect(6, 6, 4, 4, p ? 8 : 12)
      c.rect(5, 10, 6, 2, 3)
      if (pose === 1) {
        c.rect(1, 3, 3, 2, 11)
        c.rect(12, 3, 3, 2, 11)
        c.rect(2, 12, 3, 3, 11)
        c.rect(11, 12, 3, 3, 11)
      } else {
        c.rect(2, 5 + pose, 3, 3, 11)
        c.rect(11, 5 + pose, 3, 3, 11)
        c.rect(2, 10, 4, 3, 3)
        c.rect(10, 10, 4, 3, 3)
        c.dot(3, 12, 11)
        c.dot(12, 12, 11)
      }
      let rows = c.p
      for (let r = 0; r < turns; r++)
        rows = rows[0].map((_, x) => rows.map((row) => row[x]).reverse())
      const id = `frog-${p}-${direction}-${pose}`
      frame(
        id,
        rows.map((r) => r.join('')),
        { x: -5, y: -5, w: 10, h: 10 },
      )
      ids.push(id)
    }
    clip(`frog-${p}-${direction}-idle`, [ids[0], ids[2]], 18)
    clip(`frog-${p}-${direction}-hop`, [ids[1], ids[2]], 4)
  }
for (let color = 0; color < 3; color++)
  for (let phase = 0; phase < 2; phase++) {
    const c = picture(28, 14),
      body = [8, 9, 12][color]
    c.rect(2, 2, 24, 10, 1)
    c.rect(3, 3, 22, 8, body)
    c.rect(1, 4, 2, 6, 6)
    c.rect(25, 4, 2, 6, 6)
    c.rect(8, 3, 10, 8, 1)
    c.rect(9, 4, 8, 6, 12)
    c.rect(11, 4, 5, 1, 7)
    c.rect(5, 1, 5, 2, 0)
    c.rect(19, 1, 5, 2, 0)
    c.rect(5, 11, 5, 2, 0)
    c.rect(19, 11, 5, 2, 0)
    c.dot(6 + phase, 1, 6)
    c.dot(20 + phase, 12, 6)
    c.rect(24, 3, 2, 2, 10)
    c.rect(24, 9, 2, 2, 10)
    c.rect(3, 4, 2, 1, 7)
    c.rect(3, 9, 2, 1, 7)
    frame(`car-${color}-${phase}`, c.rows(), { x: -13, y: -5, w: 26, h: 10 })
  }
for (let color = 0; color < 3; color++)
  clip(`car-${color}`, [`car-${color}-0`, `car-${color}-1`], 6)
const log = picture(64, 14)
log.rect(1, 1, 62, 12, 2)
log.rect(2, 2, 60, 10, 4)
log.rect(3, 3, 58, 1, 9)
log.rect(3, 10, 58, 2, 5)
for (let x = 8; x < 61; x += 13) {
  log.rect(x, 5, 8, 1, 2)
  log.rect(x - 3, 8, 9, 1, 9)
}
log.rect(1, 3, 3, 8, 9)
log.rect(60, 3, 3, 8, 9)
log.rect(2, 5, 1, 4, 4)
frame('log', log.rows(), { x: -31, y: -6, w: 62, h: 12 })
clip('log', ['log'])
for (let phase = 0; phase < 5; phase++) {
  const c = picture(16, 14)
  if (phase < 4) {
    const shell = phase < 2 ? 3 : phase === 2 ? 9 : 13
    c.rect(4, 3, 8, 8, shell)
    c.rect(5, 2, 6, 10, shell)
    c.rect(6, 4, 4, 5, 11)
    c.dot(7, 4, 7)
    c.rect(2, phase % 2 ? 4 : 7, 3, 3, 3)
    c.rect(11, phase % 2 ? 7 : 4, 3, 3, 3)
    c.rect(6, 0, 4, 3, 11)
    c.dot(7, 0, 0)
    c.dot(9, 0, 0)
  } else {
    c.rect(3, 5, 4, 1, 12)
    c.rect(9, 7, 4, 1, 12)
    c.rect(6, 3, 4, 1, 1)
  }
  frame(`turtle-${phase}`, c.rows(), phase === 4 ? null : { x: -7, y: -6, w: 14, h: 12 })
}
clip('turtle-swim', ['turtle-0', 'turtle-1'], 10)
clip('turtle-warning', ['turtle-2', 'turtle-3'], 6)
clip('turtle-sunk', ['turtle-4'], 1)
for (let phase = 0; phase < 3; phase++) {
  const c = picture(16, 16)
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      r = 3 + phase * 2
    c.rect(
      Math.round(7 + Math.cos(a) * r),
      Math.round(7 + Math.sin(a) * r),
      2,
      2,
      phase === 0 ? 7 : 12,
    )
  }
  frame(`splash-${phase}`, c.rows(), null)
}
clip('splash', ['splash-0', 'splash-1', 'splash-2'], 8)
writeFileSync(
  resolve(import.meta.dirname, 'assets.json'),
  JSON.stringify({
    schemaVersion: 1,
    fps: 60,
    palette: 'pico8-16',
    coordinates: 'center anchors; collision geometry relative to center',
    frames,
    animations,
    provenance: {
      kind: 'original',
      authors: ['Arcade project'],
      sources: [],
      method:
        'Original deterministic hand-shaped indexed pixels; no commercial game asset extraction',
    },
  }),
)
