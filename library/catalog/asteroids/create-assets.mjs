import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = dirname(fileURLToPath(import.meta.url)),
  sets = {}
function canvas(w, h) {
  const rows = Array.from({ length: h }, () => Array(w).fill('.'))
  const dot = (x, y, c) => {
    x = Math.round(x)
    y = Math.round(y)
    if (x >= 0 && x < w && y >= 0 && y < h) rows[y][x] = c
  }
  const line = (x, y, xx, yy, c) => {
    const n = Math.max(1, Math.ceil(Math.hypot(xx - x, yy - y)))
    for (let i = 0; i <= n; i++) dot(x + ((xx - x) * i) / n, y + ((yy - y) * i) / n, c)
  }
  return {
    dot,
    line,
    rows: () => rows.map((r) => r.join('')),
    poly(points, fill, stroke) {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          let inside = false
          for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const a = points[i],
              b = points[j]
            if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
              inside = !inside
          }
          if (inside) dot(x, y, fill)
        }
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length]
        line(a[0], a[1], b[0], b[1], stroke)
      }
    },
  }
}
const ship = { width: 26, height: 26, frames: {}, animations: {} }
for (let d = 0; d < 16; d++) {
  const angle = (d * Math.PI) / 8,
    rot = (x, y) => [
      13 + x * Math.cos(angle) - y * Math.sin(angle),
      13 + x * Math.sin(angle) + y * Math.cos(angle),
    ]
  for (let flame = 0; flame < 3; flame++) {
    const a = canvas(26, 26)
    a.poly(
      [
        [0, -9],
        [-6, 7],
        [0, 4],
        [6, 7],
      ].map((p) => rot(...p)),
      '1',
      '7',
    )
    const p = rot(0, -3),
      q = rot(0, 4)
    a.line(...p, ...q, 'c')
    a.dot(...rot(-2, 3), 'c')
    a.dot(...rot(2, 3), 'c')
    if (flame) {
      a.line(...rot(-2, 7), ...rot(0, flame === 1 ? 12 : 10), '9')
      a.line(...rot(2, 7), ...rot(0, flame === 1 ? 12 : 10), '9')
      a.line(...rot(0, 7), ...rot(0, flame === 1 ? 10 : 9), 'a')
    }
    const key = (flame ? 'thrust' + flame : 'idle') + '-' + d
    ship.frames[key] = {
      pixels: a.rows(),
      durationMs: flame ? 70 : 120,
      anchor: { x: 13, y: 13 },
      hurtboxes: [{ kind: 'circle', x: 13, y: 13, r: 6 }],
      hitboxes: [],
      sockets: { muzzle: { x: rot(0, -9)[0], y: rot(0, -9)[1] } },
    }
  }
  ship.animations['heading' + d] = { frames: ['idle-' + d], frameMs: 120, loop: true }
  ship.animations['thrust' + d] = {
    frames: ['thrust1-' + d, 'thrust2-' + d],
    frameMs: 70,
    loop: true,
  }
}
sets.ship = ship
for (const [size, w, radius] of [
  [3, 38, 17],
  [2, 26, 11],
  [1, 16, 6],
]) {
  const set = {
    width: w,
    height: w,
    frames: {},
    animations: { rotate: { frames: [], frameMs: 150, loop: true } },
  }
  for (let n = 0; n < 8; n++) {
    const a = canvas(w, w),
      cx = w / 2,
      points = []
    for (let k = 0; k < 10; k++) {
      const t = (k * Math.PI) / 5 + (n * Math.PI) / 4,
        r = radius * (0.76 + 0.22 * Math.sin(k * 1.71 + size))
      points.push([cx + Math.cos(t) * r, cx + Math.sin(t) * r])
    }
    a.poly(points, '1', '6')
    for (let k = 0; k < 3; k++) {
      const t = k * 2.1 + n * 0.25,
        rr = radius * 0.36,
        x = cx + Math.cos(t) * rr,
        y = cx + Math.sin(t) * rr
      a.line(x - 2, y - 1, x + 1, y + 2, '5')
      a.dot(x, y - 2, '7')
    }
    const key = 'rot-' + n
    set.frames[key] = {
      pixels: a.rows(),
      durationMs: 150,
      anchor: { x: cx, y: cx },
      hurtboxes: [{ kind: 'circle', x: cx, y: cx, r: radius * 0.8 }],
      hitboxes: [{ kind: 'circle', x: cx, y: cx, r: radius * 0.8 }],
    }
    set.animations.rotate.frames.push(key)
  }
  sets['rock' + size] = set
}
const saucer = {
  width: 24,
  height: 12,
  frames: {},
  animations: { fly: { frames: ['fly-0', 'fly-1'], frameMs: 130, loop: true } },
}
for (let n = 0; n < 2; n++) {
  const a = canvas(24, 12)
  a.poly(
    [
      [1, 7],
      [5, 4],
      [8, 4],
      [9, 1],
      [15, 1],
      [17, 4],
      [20, 4],
      [23, 7],
      [18, 10],
      [6, 10],
    ],
    '2',
    'e',
  )
  a.line(9, 3, 14, 3, '7')
  for (let x = 5; x < 20; x += 5) a.dot(x, 7, n ? 'a' : '7')
  saucer.frames['fly-' + n] = {
    pixels: a.rows(),
    durationMs: 130,
    anchor: { x: 12, y: 6 },
    hurtboxes: [{ kind: 'circle', x: 12, y: 6, r: 10 }],
    hitboxes: [],
  }
}
sets.saucer = saucer
const burst = {
  width: 30,
  height: 30,
  frames: {},
  animations: { explode: { frames: [], frameMs: 80, loop: false } },
}
for (let n = 0; n < 5; n++) {
  const a = canvas(30, 30)
  for (let k = 0; k < 10; k++) {
    const t = (k * Math.PI) / 5,
      r = 3 + n * 2
    a.line(
      15 + Math.cos(t) * r,
      15 + Math.sin(t) * r,
      15 + Math.cos(t) * (r + 2),
      15 + Math.sin(t) * (r + 2),
      n % 2 ? '9' : 'a',
    )
  }
  const key = 'burst-' + n
  burst.frames[key] = {
    pixels: a.rows(),
    durationMs: 80,
    anchor: { x: 15, y: 15 },
    hurtboxes: [],
    hitboxes: [],
  }
  burst.animations.explode.frames.push(key)
}
sets.burst = burst
const art = {
  schemaVersion: 1,
  id: 'vector-drift',
  palette: 'runtime-pico8',
  transparent: '.',
  sets,
  collision: {
    ship: { radius: 6 },
    rocks: { large: 13.6, medium: 8.8, small: 4.8 },
    shot: { radius: 1.5 },
    saucer: { radius: 10 },
  },
  license: {
    spdx: 'LicenseRef-Project-Original',
    notes:
      'Original code-native palette rasterization of authored polygons. No ripped or copied art.',
  },
  provenance: {
    kind: 'original',
    authors: ['Arcade project'],
    sources: [],
    createdAt: '2026-09-19',
  },
}
writeFileSync(join(dir, 'assets.json'), JSON.stringify(art, null, 2) + '\n')
console.log(
  'Saved ' +
    Object.values(sets).reduce((n, s) => n + Object.keys(s.frames).length, 0) +
    ' original asteroids frames.',
)
