import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = dirname(fileURLToPath(import.meta.url))
const sets = {}
const make = (w, h) => {
  const rows = Array.from({ length: h }, () => Array(w).fill('.'))
  return {
    dot(x, y, c) {
      if (x >= 0 && x < w && y >= 0 && y < h) rows[y | 0][x | 0] = c
    },
    rect(x, y, ww, hh, c) {
      for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) this.dot(i, j, c)
    },
    rows: () => rows.map((r) => r.join('')),
  }
}
function add(set, key, a, ms, anchor, hurtboxes = [], hitboxes = []) {
  set.frames[key] = { pixels: a.rows(), durationMs: ms, anchor, hurtboxes, hitboxes }
}
const ship = {
  width: 18,
  height: 20,
  frames: {},
  animations: {
    idle: { frames: ['idle-0', 'idle-1'], frameMs: 140, loop: true },
    fire: { frames: ['fire-0', 'fire-1'], frameMs: 70, loop: false },
    shield: { frames: ['shield-0', 'shield-1'], frameMs: 80, loop: true },
  },
}
for (let n = 0; n < 6; n++) {
  const a = make(18, 20)
  a.rect(8, 1, 2, 4, '7')
  a.rect(7, 5, 4, 7, 'c')
  a.rect(6, 9, 6, 7, 'c')
  a.rect(8, 6, 2, 5, '1')
  a.rect(3, 11, 4, 5, '7')
  a.rect(11, 11, 4, 5, '7')
  a.rect(1, 14, 5, 3, 'c')
  a.rect(12, 14, 5, 3, 'c')
  a.rect(6, 16, 6, 2, '1')
  a.rect(4, 17, 2, 2, n % 2 ? '9' : 'a')
  a.rect(12, 17, 2, 2, n % 2 ? 'a' : '9')
  if (n === 2 || n === 3) {
    a.rect(8, 0, 2, 4, n === 2 ? 'a' : '7')
    a.rect(6, 1, 6, 1, 'a')
  }
  if (n >= 4) {
    for (let y = 0; y < 20; y++) {
      const x = Math.round(2 - Math.sin((y / 19) * Math.PI) * 2)
      a.dot(x, y, n % 2 ? '7' : 'c')
      a.dot(17 - x, y, n % 2 ? '7' : 'c')
    }
  }
  add(
    ship,
    ['idle-0', 'idle-1', 'fire-0', 'fire-1', 'shield-0', 'shield-1'][n],
    a,
    n < 2 ? 140 : n < 4 ? 70 : 80,
    { x: 9, y: 10 },
    [{ x: 4, y: 5, w: 10, h: 12 }],
  )
}
sets.ship = ship
for (let type = 0; type < 3; type++) {
  const alien = {
    width: 16,
    height: 12,
    frames: {},
    animations: {
      march: { frames: ['march-0', 'march-1'], frameMs: 250, loop: true },
      dive: { frames: ['dive-0', 'dive-1'], frameMs: 100, loop: true },
      warn: { frames: ['warn-0', 'warn-1'], frameMs: 100, loop: true },
    },
  }
  for (let n = 0; n < 6; n++) {
    const a = make(16, 12),
      c = ['b', 'e', '9'][type]
    a.rect(4, 2, 8, 7, c)
    a.rect(2, 4, 12, 4, c)
    a.rect(3, 1, 2, 2, c)
    a.rect(11, 1, 2, 2, c)
    a.rect(5, 4, 2, 2, '0')
    a.rect(9, 4, 2, 2, '0')
    a.rect(6, 7, 4, 1, '1')
    if (type === 1) a.rect(6, 0, 4, 3, '7')
    if (type === 2) {
      a.rect(0, 4, 3, 5, c)
      a.rect(13, 4, 3, 5, c)
    }
    const lift = n % 2 ? 2 : 0
    a.rect(1, 8 - lift, 3, 3, c)
    a.rect(12, 8 - lift, 3, 3, c)
    a.rect(4, 9, 2, 2, c)
    a.rect(10, 9, 2, 2, c)
    if (n === 2 || n === 3) {
      a.rect(0, 2 + (n % 2), 3, 7, c)
      a.rect(13, 2 + (n % 2), 3, 7, c)
      a.rect(7, 10, 2, 2, 'a')
    }
    if (n >= 4) {
      a.rect(5, 4, 2, 2, 'a')
      a.rect(9, 4, 2, 2, 'a')
    }
    add(
      alien,
      ['march-0', 'march-1', 'dive-0', 'dive-1', 'warn-0', 'warn-1'][n],
      a,
      n < 2 ? 250 : 100,
      { x: 8, y: 6 },
      [{ x: 2, y: 2, w: 12, h: 8 }],
      [{ x: 3, y: 3, w: 10, h: 7 }],
    )
  }
  sets['alien' + type] = alien
}
const ufo = {
  width: 24,
  height: 12,
  frames: {},
  animations: { fly: { frames: ['fly-0', 'fly-1'], frameMs: 120, loop: true } },
}
for (let n = 0; n < 2; n++) {
  const a = make(24, 12)
  a.rect(8, 1, 8, 3, '8')
  a.rect(4, 4, 16, 3, '8')
  a.rect(1, 7, 22, 3, '7')
  a.rect(4, 10, 16, 1, '5')
  for (let x = 3; x < 22; x += 5) a.rect(x, 7, 2, 1, n ? 'a' : 'c')
  a.rect(10, 2, 4, 2, 'e')
  add(ufo, 'fly-' + n, a, 120, { x: 12, y: 6 }, [{ x: 2, y: 3, w: 20, h: 7 }])
}
sets.ufo = ufo
const burst = {
  width: 20,
  height: 20,
  frames: {},
  animations: {
    explode: { frames: ['burst-0', 'burst-1', 'burst-2', 'burst-3'], frameMs: 80, loop: false },
  },
}
for (let n = 0; n < 4; n++) {
  const a = make(20, 20)
  for (let i = 0; i < 12; i++) {
    const t = (i * Math.PI) / 6,
      r = 2 + n * 2,
      x = Math.round(10 + Math.cos(t) * r),
      y = Math.round(10 + Math.sin(t) * r)
    a.rect(x, y, n < 2 ? 3 : 2, n < 2 ? 3 : 2, n % 2 ? '9' : 'a')
  }
  if (n === 0) a.rect(7, 7, 6, 6, '7')
  add(burst, 'burst-' + n, a, 80, { x: 10, y: 10 })
}
sets.burst = burst
const data = {
  schemaVersion: 1,
  id: 'prism-squadron',
  palette: 'runtime-pico8',
  transparent: '.',
  sets,
  collision: {
    ship: { halfWidth: 5, halfHeight: 6 },
    alien: { halfWidth: 6, halfHeight: 4 },
    ufo: { halfWidth: 10, halfHeight: 4 },
    shot: { radius: 2 },
  },
  provenance: {
    kind: 'original',
    authors: ['Arcade project'],
    sources: [],
    createdAt: '2026-09-19',
  },
  license: {
    spdx: 'LicenseRef-Project-Original',
    notes: 'Original palette pixel artwork; no commercial sheets copied.',
  },
}
writeFileSync(join(dir, 'assets.json'), JSON.stringify(data, null, 2) + '\n')
console.log('Saved 30 original formation-shooter frames.')
