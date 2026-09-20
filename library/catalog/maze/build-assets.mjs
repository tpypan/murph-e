import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Original indexed-pixel artwork, not commercial sprite extraction or tracing.
const frames = {},
  clips = {}
const names = ['right', 'down', 'left', 'up']
function canvas(w = 14, h = 14) {
  const p = Array.from({ length: h }, () => Array(w).fill('.'))
  const dot = (x, y, c) => {
    x = Math.round(x)
    y = Math.round(y)
    if (x >= 0 && x < w && y >= 0 && y < h) p[y][x] = c.toString(16)
  }
  const rect = (x, y, ww, hh, c) => {
    for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) dot(xx, yy, c)
  }
  const poly = (points, c) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let inside = false
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i],
            b = points[j]
          if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
            inside = !inside
        }
        if (inside) dot(x, y, c)
      }
  }
  return { p, dot, rect, poly, rows: () => p.map((r) => r.join('')) }
}
function addFrame(id, pixels, hitbox = { x: -3, y: -3, w: 6, h: 6 }) {
  frames[id] = {
    pixels,
    size: { w: pixels[0].length, h: pixels.length },
    anchor: { x: 7, y: 7 },
    hitboxes: [hitbox],
    hurtboxes: [hitbox],
  }
}
function addClip(id, ids, duration = 5, loop = true) {
  clips[id] = {
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
  for (let direction = 0; direction < 4; direction++) {
    const chomper = [],
      goose = [],
      honk = []
    for (let phase = 0; phase < 4; phase++) {
      const c = canvas(),
        opening = [0.08, 0.42, 0.8, 0.42][phase],
        angle = (direction * Math.PI) / 2
      for (let y = 1; y < 13; y++)
        for (let x = 1; x < 13; x++) {
          const dx = x - 6.5,
            dy = y - 6.5,
            r = Math.hypot(dx, dy),
            a = Math.atan2(dy, dx) - angle,
            delta = Math.atan2(Math.sin(a), Math.cos(a))
          if (r < 5.8 && Math.abs(delta) > opening) c.dot(x, y, player ? 9 : 10)
        }
      if (direction === 0) c.dot(7, 3, 0)
      if (direction === 2) c.dot(6, 3, 0)
      if (direction === 3) c.dot(9, 6, 0)
      if (direction === 1) c.dot(4, 6, 0)
      const cid = `chomper-${player}-${names[direction]}-${phase}`
      addFrame(cid, c.rows())
      chomper.push(cid)
      const g = canvas(),
        wing = player ? 8 : 12,
        step = phase % 2
      if (direction === 0 || direction === 2) {
        g.poly(
          [
            [1, 7],
            [4, 5],
            [7, 5],
            [8, 2],
            [10, 1],
            [12, 3],
            [11, 6],
            [10, 8],
            [9, 10],
            [6, 12],
            [3, 11],
            [2, 9],
            [0, 8],
          ],
          6,
        )
        g.poly(
          [
            [2, 7],
            [5, 6],
            [8, 6],
            [9, 2],
            [11, 2],
            [11, 5],
            [9, 7],
            [9, 9],
            [7, 11],
            [3, 10],
          ],
          7,
        )
        g.poly(
          [
            [3, 7],
            [8, 7],
            [7, 10],
            [4, 10],
          ],
          wing,
        )
        g.dot(10, 3, 0)
        g.rect(11, 4, 3, 2, 9)
        g.rect(4 - step, 12, 3, 1, 9)
        g.rect(7 + step, 11, 3, 1, 9)
        if (direction === 2) for (const row of g.p) row.reverse()
      } else {
        g.poly(
          [
            [3, 7],
            [5, 5],
            [5, 2],
            [7, 1],
            [9, 2],
            [9, 5],
            [11, 7],
            [11, 10],
            [9, 12],
            [4, 12],
            [2, 10],
          ],
          6,
        )
        g.poly(
          [
            [4, 6],
            [6, 5],
            [6, 2],
            [8, 2],
            [8, 5],
            [10, 6],
            [10, 10],
            [8, 11],
            [4, 10],
          ],
          7,
        )
        g.rect(3, 7, 2, 3, wing)
        g.rect(9, 7, 2, 3, wing)
        g.rect(4 - step, 12, 2, 1, 9)
        g.rect(8 + step, 12, 2, 1, 9)
        if (direction === 1) {
          g.rect(6, 4, 3, 2, 9)
          g.dot(5, 3, 0)
          g.dot(9, 3, 0)
        } else {
          g.rect(6, 0, 3, 1, 9)
          g.rect(5, 6, 4, 3, 7)
        }
      }
      const gid = `goose-${player}-${names[direction]}-${phase}`
      addFrame(gid, g.rows())
      goose.push(gid)
      if (phase < 3) {
        const rows = g.rows().map((r) => r.split(''))
        const wingY = 7 - phase
        for (let x = 0; x < 3; x++) {
          rows[wingY][x] = (player ? 8 : 12).toString(16)
          rows[wingY][13 - x] = (player ? 8 : 12).toString(16)
        }
        const id = `goose-${player}-honk-${names[direction]}-${phase}`
        addFrame(
          id,
          rows.map((r) => r.join('')),
        )
        honk.push(id)
      }
    }
    addClip(`chomper-${player}-${names[direction]}`, chomper, 4)
    addClip(`goose-${player}-${names[direction]}`, goose, 5)
    addClip(`goose-${player}-honk-${names[direction]}`, honk, 5, false)
  }
for (let color = 0; color < 4; color++)
  for (let direction = 0; direction < 4; direction++) {
    const ids = []
    for (let phase = 0; phase < 2; phase++) {
      const g = canvas(),
        c = [8, 14, 12, 9][color]
      g.poly(
        [
          [2, 12],
          [2, 5],
          [3, 3],
          [5, 1],
          [9, 1],
          [11, 3],
          [12, 5],
          [12, 12],
          [10, 11],
          [8, 13],
          [6, 11],
          [4, 13],
        ],
        c,
      )
      if (phase) g.rect(3, 11, 2, 2, c)
      else g.rect(7, 11, 2, 2, c)
      g.dot(4, 3, 7)
      g.dot(3, 4, 7)
      g.rect(3, 5, 3, 4, 7)
      g.rect(8, 5, 3, 4, 7)
      const dx = [1, 0, -1, 0][direction],
        dy = [0, 1, 0, -1][direction]
      g.rect(4 + dx, 6 + dy, 1, 2, 1)
      g.rect(9 + dx, 6 + dy, 1, 2, 1)
      const id = `ghost-${color}-${names[direction]}-${phase}`
      addFrame(id, g.rows())
      ids.push(id)
    }
    addClip(`ghost-${color}-${names[direction]}`, ids, 7)
  }
for (const flashing of [false, true]) {
  const ids = []
  for (let phase = 0; phase < 2; phase++) {
    const g = canvas(),
      body = flashing ? 7 : 1,
      face = flashing ? 8 : 7
    g.poly(
      [
        [2, 12],
        [2, 5],
        [3, 3],
        [5, 1],
        [9, 1],
        [11, 3],
        [12, 5],
        [12, 12],
        [10, 11],
        [8, 13],
        [6, 11],
        [4, 13],
      ],
      body,
    )
    g.rect(4, 5, 2, 2, face)
    g.rect(9, 5, 2, 2, face)
    for (let x = 4; x < 11; x++) g.dot(x, 9 + ((x + phase) % 2), face)
    const id = `frightened-${flashing ? 'flash' : 'blue'}-${phase}`
    addFrame(id, g.rows())
    ids.push(id)
  }
  addClip(`frightened-${flashing ? 'flash' : 'blue'}`, ids, 7)
}
for (let direction = 0; direction < 4; direction++) {
  const g = canvas()
  g.rect(3, 5, 3, 4, 7)
  g.rect(8, 5, 3, 4, 7)
  const dx = [1, 0, -1, 0][direction],
    dy = [0, 1, 0, -1][direction]
  g.rect(4 + dx, 6 + dy, 1, 2, 12)
  g.rect(9 + dx, 6 + dy, 1, 2, 12)
  const id = `eyes-${names[direction]}`
  addFrame(id, g.rows())
  frames[id].hurtboxes = []
  frames[id].hitboxes = []
  addClip(id, [id], 1)
}
for (let color = 0; color < 4; color++) {
  const ids = []
  for (let phase = 0; phase < 3; phase++) {
    const base = frames[`ghost-${color}-up-0`].pixels.map((r) => r.split(''))
    for (let y = 0; y < 14; y++)
      for (let x = 0; x < 14; x++)
        if (y < 10 - phase * 5 && base[y][x] !== '.' && base[y][x] !== '7') base[y][x] = '.'
    const id = `reform-${color}-${phase}`
    addFrame(
      id,
      base.map((r) => r.join('')),
    )
    frames[id].hurtboxes = []
    frames[id].hitboxes = []
    ids.push(id)
  }
  addClip(`reform-${color}`, ids, 15, false)
}
for (const avatar of ['chomper', 'goose'])
  for (let p = 0; p < 2; p++) {
    const ids = []
    for (let phase = 0; phase < 4; phase++) {
      const g = canvas()
      if (avatar === 'chomper') {
        for (let y = 0; y < 14; y++)
          for (let x = 0; x < 14; x++) {
            const dx = x - 6.5,
              dy = y - 6.5,
              a = Math.atan2(dy, dx)
            if (Math.hypot(dx, dy) < 5.8 && Math.abs(a + Math.PI / 2) > phase * 0.7)
              g.dot(x, y, p ? 9 : 10)
          }
      } else {
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4,
            r = 2 + phase
          g.dot(7 + Math.cos(a) * r, 7 + Math.sin(a) * r, 7)
          g.dot(7 + Math.cos(a) * r + 1, 7 + Math.sin(a) * r, 6)
        }
      }
      const id = `${avatar}-${p}-death-${phase}`
      addFrame(id, g.rows())
      ids.push(id)
    }
    addClip(`${avatar}-${p}-death`, ids, 12, false)
  }
const assets = {
  schemaVersion: 1,
  fps: 60,
  palette: 'pico8-16',
  coordinates: 'center anchor in 14x14 frame; directional clips right/down/left/up',
  frames,
  animations: clips,
  provenance: {
    kind: 'original',
    authors: ['Arcade project'],
    sources: [],
    method:
      'Original deterministic pixel polygons and mouth masks; no commercial sprite extraction',
  },
}
writeFileSync(resolve(import.meta.dirname, 'assets.json'), JSON.stringify(assets))
console.log(
  `Wrote ${Object.keys(frames).length} original maze frames / ${Object.keys(clips).length} clips`,
)
