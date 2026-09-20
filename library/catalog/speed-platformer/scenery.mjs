// Original native-pixel scenery, authored offline; no source-game backgrounds.
export function scenery() {
  const result = []
  for (let act = 0; act < 2; act++) {
    const palette =
      act === 0
        ? [
            '#143c63',
            '#206d99',
            '#409caf',
            '#70c5c4',
            '#b5e0cf',
            '#eff6da',
            '#283e39',
            '#405943',
            '#51834c',
            '#78ab42',
            '#b5d860',
            '#523f36',
            '#735044',
            '#99633f',
            '#bd8650',
            '#e5b568',
          ]
        : [
            '#31304f',
            '#555173',
            '#82768c',
            '#ba929b',
            '#e9b2a0',
            '#ffdbc0',
            '#323d47',
            '#44574e',
            '#657550',
            '#9d995e',
            '#d1c086',
            '#39394b',
            '#505063',
            '#696479',
            '#918293',
            '#bdacaf',
          ]
    const make = (w, h, paint) => {
      const p = Array.from({ length: h }, () => Array(w).fill('.'))
      const dot = (x, y, c) => {
        x = Math.round(x)
        y = Math.round(y)
        if (x >= 0 && x < w && y >= 0 && y < h) p[y][x] = c
      }
      const rect = (x, y, ww, hh, c) => {
        for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) dot(xx, yy, c)
      }
      const oval = (cx, cy, rx, ry, c) => {
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
          for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
            if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) dot(x, y, c)
      }
      paint({ dot, rect, oval })
      return { pixels: p.map((r) => r.join('')), palette }
    }
    const sky = make(256, 128, ({ rect }) => {
      for (let y = 0; y < 128; y++) rect(0, y, 256, 1, String(Math.min(4, Math.floor(y / 28))))
    })
    const sea = make(256, 128, ({ rect }) => {
      rect(0, 0, 256, 128, '1')
      for (let y = 0; y < 128; y += 5) {
        rect(0, y, 256, 1, y < 18 ? '3' : '2')
        for (let x = (y * 17) % 43; x < 256; x += 47)
          rect(x, y + 1, 12 + (y % 9), 1, y < 28 ? '4' : '2')
      }
    })
    const cloud = make(96, 32, ({ oval, rect }) => {
      oval(42, 22, 40, 8, '3')
      oval(32, 17, 18, 11, '4')
      oval(53, 12, 17, 11, '4')
      oval(70, 19, 19, 7, '4')
      oval(51, 10, 13, 8, '5')
      oval(30, 15, 13, 7, '5')
      rect(15, 24, 69, 2, '4')
    })
    const island = make(112, 96, ({ dot, rect }) => {
      for (let x = 0; x < 112; x++) {
        const y = Math.floor(
          28 + 30 * Math.abs((x - 56) / 56) ** 1.4 + 5 * Math.sin(x * 0.13) + (act ? 8 : 0),
        )
        rect(x, y, 1, 96 - y, '1')
        rect(x, y, 1, 4, '2')
        if (x % 31 < 2) rect(x, y + 9, 1, 70, '0')
        if (x % 29 < 7) rect(x, y + 8, 1, 27, '2')
        if (!act && x > 71 && x < 78) rect(x, y + 5, 1, 72, x % 3 ? '3' : '4')
      }
      for (let x = 0; x < 112; x += 7) dot(x, 90, '3')
    })
    const tiles = Array.from({ length: 8 }, (_, slice) =>
      make(4, 32, ({ rect, dot }) => {
        for (let y = 0; y < 32; y++)
          for (let x = 0; x < 4; x++) {
            const xx = x + slice * 4,
              seam = y % 16 === 0 || (xx + (Math.floor(y / 16) % 2) * 16) % 32 === 0
            const shade = act
              ? y % 16 < 2
                ? 'e'
                : y % 16 > 13
                  ? 'b'
                  : (Math.floor(xx / 16) + Math.floor(y / 16)) % 2
                    ? 'd'
                    : 'c'
              : (Math.floor(xx / 16) + Math.floor(y / 16)) % 2
                ? 'd'
                : 'c'
            dot(x, y, seam ? 'b' : shade)
            if ((xx * 11 + y * 7) % 61 === 0) dot(x, y, 'e')
          }
      }),
    )
    const turf = Array.from({ length: 8 }, (_, slice) =>
      make(4, 12, ({ rect, dot }) => {
        rect(0, 0, 4, 2, 'a')
        rect(0, 2, 4, 3, '9')
        rect(0, 5, 4, 3, '8')
        for (let x = 0; x < 4; x++) {
          const depth = 7 + (((slice * 4 + x) * 7) % 5)
          rect(x, 7, 1, depth - 7, '6')
          if ((x + slice) % 3 === 0) dot(x, 4, 'a')
        }
      }),
    )
    const loop = make(100, 100, ({ dot }) => {
      for (let y = 0; y < 100; y++)
        for (let x = 0; x < 100; x++) {
          const r = Math.hypot(x - 50, y - 50)
          if (r < 38 || r > 49) continue
          dot(
            x,
            y,
            r < 40
              ? 'a'
              : r < 43
                ? '8'
                : r > 47
                  ? 'b'
                  : (Math.floor(x / 8) + Math.floor(y / 8)) % 2
                    ? 'd'
                    : 'e',
          )
        }
    })
    const palm = make(96, 100, ({ rect, oval, dot }) => {
      for (let y = 35; y < 100; y++) {
        const x = 48 + Math.round(Math.sin(((y - 35) / 65) * 1.4) * 9)
        rect(x, y, 7, 1, 'b')
        rect(x + 1, y, 4, 1, y % 8 < 2 ? 'f' : 'd')
        rect(x + 5, y, 1, 1, 'c')
      }
      for (const [dx, dy] of [
        [-43, 8],
        [-33, -20],
        [-14, -30],
        [22, -26],
        [43, -5],
        [34, 24],
        [-29, 29],
      ]) {
        for (let t = 0; t <= 1; t += 0.018) {
          const x = 49 + dx * t,
            y = 35 + dy * t + 12 * t * t
          const thick = Math.max(1, Math.round(5 * (1 - t)))
          rect(Math.round(x) - thick, Math.round(y), thick * 2, 3, t < 0.6 ? '8' : '9')
          if (t < 0.85) dot(x, y - 1, 'a')
        }
      }
      oval(49, 39, 4, 4, 'b')
      oval(55, 40, 4, 4, 'd')
    })
    const fern = make(32, 20, ({ rect, dot }) => {
      for (let i = 0; i < 7; i++) {
        const dx = (i - 3) * 4
        for (let t = 0; t < 1; t += 0.06) {
          const x = 16 + dx * t,
            y = 19 - (15 - Math.abs(dx) * 0.5) * Math.sin(t * Math.PI * 0.65)
          rect(Math.round(x), Math.round(y), 3, 2, i % 2 ? '8' : '9')
          dot(x, y, 'a')
        }
      }
    })
    result.push({ sky, sea, cloud, island, tiles, turf, loop, palm, fern })
  }
  return result
}
