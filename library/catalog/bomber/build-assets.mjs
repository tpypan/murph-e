import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const frames = {},
  animations = {}
function pic(w = 18, h = 18) {
  const p = Array.from({ length: h }, () => Array(w).fill('.'))
  const dot = (x, y, c) => {
      if (x >= 0 && x < w && y >= 0 && y < h) p[y][x] = c.toString(16)
    },
    rect = (x, y, ww, hh, c) => {
      for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) dot(xx, yy, c)
    }
  return { p, dot, rect, rows: () => p.map((r) => r.join('')) }
}
function add(id, p, box = { x: -5, y: -6, w: 10, h: 12 }) {
  frames[id] = {
    pixels: p,
    size: { w: p[0].length, h: p.length },
    anchor: { x: 9, y: 9 },
    hitboxes: box ? [box] : [],
    hurtboxes: box ? [box] : [],
  }
}
function clip(id, ids, duration = 5, loop = true) {
  animations[id] = {
    loop,
    frames: ids.map((frame) => ({
      frame,
      duration,
      anchor: frames[frame].anchor,
      hitboxes: frames[frame].hitboxes,
      hurtboxes: frames[frame].hurtboxes,
    })),
  }
}
for (let player = 0; player < 2; player++)
  for (const direction of ['up', 'down', 'left', 'right']) {
    const ids = []
    for (let pose = 0; pose < 3; pose++) {
      const c = pic(),
        color = player ? 8 : 12,
        dy = pose === 1 ? 1 : 0
      c.rect(5, 2 + dy, 8, 7, 6)
      c.rect(6, 1 + dy, 6, 8, 7)
      c.rect(7, 0 + dy, 4, 2, 14)
      c.rect(6, 9 + dy, 6, 5, color)
      c.rect(5, 14, 4, 3, 14)
      c.rect(10, 14 - (pose % 2), 4, 3, 14)
      c.rect(3, 10 + (pose % 2), 3, 3, 14)
      c.rect(12, 10 + ((pose + 1) % 2), 3, 3, 14)
      if (direction === 'down') {
        c.rect(7, 4 + dy, 4, 3, 1)
        c.dot(7, 4 + dy, 7)
        c.dot(10, 4 + dy, 7)
      } else if (direction === 'left') c.rect(5, 4 + dy, 4, 3, 1)
      else if (direction === 'right') c.rect(10, 4 + dy, 4, 3, 1)
      else c.rect(7, 3 + dy, 4, 3, 6)
      const id = `player-${player}-${direction}-${pose}`
      add(id, c.rows())
      ids.push(id)
    }
    clip(`player-${player}-idle-${direction}`, [ids[0]], 8)
    clip(`player-${player}-walk-${direction}`, ids, 5)
  }
for (let type = 0; type < 3; type++) {
  const ids = []
  for (let pose = 0; pose < 2; pose++) {
    const c = pic(),
      color = [14, 9, 11][type]
    c.rect(4, 4, 10, 10, 2)
    c.rect(5, 2, 8, 13, color)
    c.rect(3, 5, 12, 8, color)
    c.rect(5, 13, 3, 3, 2)
    c.rect(10, 13 - pose, 3, 3, 2)
    c.rect(5, 5, 3, 4, 7)
    c.rect(10, 5, 3, 4, 7)
    c.dot(6, 7, 1)
    c.dot(11, 7, 1)
    if (type === 1) {
      c.dot(3, 2, 9)
      c.dot(14, 2, 9)
      c.rect(7, 11, 4, 1, 1)
    } else if (type === 2) {
      c.rect(5, 3, 8, 2, 3)
      c.rect(8, 10, 2, 3, 3)
    } else c.rect(7, 11, 4, 2, 8)
    const id = `enemy-${type}-${pose}`
    add(id, c.rows())
    ids.push(id)
  }
  clip(`enemy-${type}`, ids, 9)
}
const bombIds = []
for (let phase = 0; phase < 3; phase++) {
  const c = pic()
  c.rect(5, 5, 9, 10, 5)
  c.rect(3, 7, 13, 6, 5)
  c.rect(5, 6, 9, 8, 0)
  c.rect(4, 8, 11, 4, 0)
  c.rect(5, 7, 3, 2, 6)
  c.rect(10, 3, 2, 3, 9)
  c.rect(11, 2, 3, 2, 10)
  c.dot(13 + (phase % 2), 1, phase === 1 ? 7 : 8)
  const id = `bomb-${phase}`
  add(id, c.rows(), { x: -7, y: -7, w: 14, h: 14 })
  bombIds.push(id)
}
clip('bomb', bombIds, 6)
for (const kind of ['center', 'horizontal', 'vertical']) {
  const ids = []
  for (let phase = 0; phase < 3; phase++) {
    const c = pic()
    if (kind !== 'vertical') {
      c.rect(0, 4 - (phase % 2), 18, 10, 9)
      c.rect(0, 6, 18, 6, 10)
      c.rect(0, 8, 18, 2, 7)
    }
    if (kind !== 'horizontal') {
      c.rect(4 - (phase % 2), 0, 10, 18, 9)
      c.rect(6, 0, 6, 18, 10)
      c.rect(8, 0, 2, 18, 7)
    }
    const id = `flame-${kind}-${phase}`
    add(id, c.rows(), { x: -8, y: -8, w: 16, h: 16 })
    ids.push(id)
  }
  clip(`flame-${kind}`, ids, 3)
}
const crate = pic()
crate.rect(0, 0, 18, 18, 2)
crate.rect(1, 1, 16, 16, 4)
crate.rect(2, 2, 14, 2, 9)
crate.rect(2, 14, 14, 2, 5)
for (let i = 3; i < 15; i++) {
  crate.dot(i, i, 9)
  crate.dot(17 - i, i, 9)
}
add('crate', crate.rows(), { x: -9, y: -9, w: 18, h: 18 })
clip('crate', ['crate'])
for (const kind of ['range', 'capacity', 'speed']) {
  const c = pic()
  c.rect(2, 2, 14, 14, 7)
  c.rect(3, 3, 12, 12, 1)
  if (kind === 'range') {
    c.rect(8, 4, 2, 10, 10)
    c.rect(4, 8, 10, 2, 10)
  }
  if (kind === 'capacity') {
    c.rect(5, 7, 8, 6, 0)
    c.rect(7, 5, 3, 3, 6)
    c.rect(10, 4, 3, 2, 10)
  }
  if (kind === 'speed') {
    for (let i = 0; i < 5; i++) {
      c.rect(5 + i, 4 + i, 4, 2, 12)
      c.rect(5 + i, 12 - i, 4, 2, 12)
    }
  }
  add(`pickup-${kind}`, c.rows(), null)
  clip(`pickup-${kind}`, [`pickup-${kind}`], 1)
}
const deaths = []
for (let n = 0; n < 4; n++) {
  const c = pic()
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4,
      r = 2 + n * 2
    c.rect(Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r), 2, 2, n < 2 ? 7 : 13)
  }
  add(`burst-${n}`, c.rows(), null)
  deaths.push(`burst-${n}`)
}
clip('burst', deaths, 6, false)
writeFileSync(
  resolve(import.meta.dirname, 'assets.json'),
  JSON.stringify({
    schemaVersion: 1,
    fps: 60,
    palette: 'pico8-16',
    coordinates: '18×18 center-anchored pixels; collision geometry relative to center',
    frames,
    animations,
    provenance: {
      kind: 'original',
      authors: ['Arcade project'],
      sources: [],
      method:
        'Original deterministic hand-shaped indexed pixels; no commercial code, sprites or ROM extraction',
    },
  }),
)
