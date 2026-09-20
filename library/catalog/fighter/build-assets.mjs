import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Original, deterministic pixel artwork. All coordinates and silhouettes are
// authored here; this does not trace, fetch, or reproduce any commercial sheet.
const W = 72,
  H = 68,
  OX = 30,
  OY = 64
const poses = {
  idle0: {
    bob: 0,
    legs: [-8, -20, -12, 0, 8, -22, 12, 0],
    arms: [-12, -40, -9, -32, 12, -44, 15, -36],
  },
  idle1: {
    bob: 1,
    legs: [-8, -20, -12, 0, 8, -22, 12, 0],
    arms: [-12, -39, -9, -31, 12, -43, 15, -35],
  },
  idle2: {
    bob: 0,
    legs: [-8, -20, -12, 0, 8, -22, 12, 0],
    arms: [-12, -41, -10, -33, 12, -44, 16, -37],
  },
  walk0: {
    bob: 0,
    legs: [-5, -21, -14, 0, 8, -22, 12, -1],
    arms: [-12, -39, -6, -34, 12, -44, 14, -36],
  },
  walk1: {
    bob: -1,
    legs: [-4, -23, -4, -2, 7, -20, 15, 0],
    arms: [-11, -42, -8, -34, 13, -43, 15, -35],
  },
  walk2: {
    bob: 0,
    legs: [4, -20, 8, 0, -7, -21, -7, -4],
    arms: [-12, -44, -8, -35, 13, -41, 17, -33],
  },
  walk3: {
    bob: 1,
    legs: [8, -21, 13, 0, -5, -20, -13, 0],
    arms: [-12, -43, -7, -35, 12, -40, 15, -33],
  },
  jump0: {
    bob: -2,
    legs: [-8, -20, -4, -7, 11, -25, 14, -15],
    arms: [-14, -42, -10, -50, 12, -43, 15, -51],
  },
  jump1: {
    bob: -1,
    legs: [-7, -21, -14, -8, 10, -20, 16, -8],
    arms: [-15, -40, -19, -46, 14, -42, 21, -48],
  },
  jump2: {
    bob: 0,
    legs: [-7, -21, -10, 0, 7, -22, 11, -1],
    arms: [-14, -39, -14, -33, 14, -40, 18, -34],
  },
  crouch: {
    bob: 15,
    legs: [-11, -10, -15, 0, 12, -12, 16, 0],
    arms: [-10, -29, -5, -25, 12, -31, 17, -28],
  },
  windup: {
    bob: 1,
    lean: -2,
    legs: [-8, -20, -12, 0, 8, -22, 12, 0],
    arms: [-13, -39, -8, -32, 8, -41, 2, -41],
  },
  punch: {
    lean: 3,
    legs: [-6, -20, -12, 0, 11, -21, 16, 0],
    arms: [-12, -38, -8, -32, 19, -43, 31, -43],
  },
  punchRecover: {
    lean: 1,
    legs: [-7, -20, -12, 0, 9, -22, 13, 0],
    arms: [-12, -40, -8, -32, 15, -43, 20, -41],
  },
  airPunch: {
    lean: 2,
    legs: [-8, -22, -14, -10, 11, -24, 13, -16],
    arms: [-12, -39, -8, -32, 19, -43, 31, -43],
  },
  airKick: {
    lean: -5,
    legs: [-8, -23, -14, -11, 17, -26, 34, -22],
    arms: [-14, -39, -19, -33, 11, -44, 15, -38],
  },
  kickWind: {
    lean: -4,
    legs: [-5, -20, -8, 0, 13, -24, 8, -15],
    arms: [-13, -40, -14, -33, 10, -42, 15, -36],
  },
  kick: {
    lean: -6,
    legs: [-3, -20, -5, 0, 18, -27, 35, -32],
    arms: [-15, -39, -20, -33, 9, -44, 14, -37],
  },
  kickRecover: {
    lean: -2,
    legs: [-3, -21, -8, 0, 14, -26, 20, -16],
    arms: [-13, -39, -15, -32, 11, -43, 15, -35],
  },
  sweep: {
    bob: 15,
    lean: -3,
    legs: [-10, -11, -15, 0, 17, -7, 34, -3],
    arms: [-11, -27, -17, -18, 11, -30, 18, -26],
  },
  specialWind: {
    lean: -3,
    legs: [-6, -20, -11, 0, 10, -20, 16, 0],
    arms: [-14, -40, -16, -46, 9, -41, 1, -45],
  },
  special: {
    lean: 4,
    legs: [-10, -20, -18, 0, 9, -23, 14, 0],
    arms: [-13, -38, -20, -35, 21, -43, 33, -43],
  },
  dash: {
    bob: 8,
    lean: 10,
    legs: [-10, -16, -24, -4, 11, -20, 13, 0],
    arms: [-13, -34, -23, -27, 17, -39, 25, -45],
  },
  guard: {
    lean: -2,
    legs: [-8, -20, -12, 0, 8, -22, 12, 0],
    arms: [-8, -40, 5, -46, 10, -42, 13, -50],
  },
  crouchGuard: {
    bob: 15,
    legs: [-11, -10, -15, 0, 12, -12, 16, 0],
    arms: [-7, -30, 5, -34, 11, -31, 14, -38],
  },
  hurt: {
    lean: -7,
    bob: 1,
    legs: [-7, -20, -12, 0, 8, -22, 12, 0],
    arms: [-13, -38, -20, -34, 10, -38, 19, -31],
  },
  hurt2: {
    lean: -10,
    bob: 3,
    legs: [-8, -18, -15, 0, 7, -20, 13, 0],
    arms: [-14, -37, -20, -43, 10, -38, 17, -44],
  },
  fall: {
    lean: -13,
    bob: 12,
    legs: [-13, -12, -23, -4, 7, -17, 14, -6],
    arms: [-15, -29, -22, -34, 7, -28, 16, -25],
  },
  ko: { lying: true },
  victory: {
    lean: 0,
    legs: [-6, -22, -9, 0, 6, -22, 9, 0],
    arms: [-13, -44, -16, -58, 13, -44, 16, -58],
  },
}

function render(character, poseName) {
  const p = poses[poseName]
  const pixels = Array.from({ length: H }, () => Array(W).fill('.'))
  const dot = (x, y, c) => {
    x = Math.round(x + OX)
    y = Math.round(y + OY)
    if (x >= 0 && x < W && y >= 0 && y < H) pixels[y][x] = c.toString(16)
  }
  const poly = (points, c) => {
    const minY = Math.floor(Math.min(...points.map((q) => q[1]))),
      maxY = Math.ceil(Math.max(...points.map((q) => q[1])))
    for (let y = minY; y <= maxY; y++)
      for (let x = -OX; x < W - OX; x++) {
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
  const rect = (x, y, w, h, c) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) dot(xx, yy, c)
  }
  const line = (x, y, xx, yy, c) => {
    const n = Math.max(Math.abs(xx - x), Math.abs(yy - y))
    for (let i = 0; i <= n; i++)
      dot(x + ((xx - x) * i) / (n || 1), y + ((yy - y) * i) / (n || 1), c)
  }
  const limb = (a, b, r1, r2, c, shade, light) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      l = Math.hypot(dx, dy),
      nx = -dy / l,
      ny = dx / l
    const q = (s, t) => [s[0] + nx * t, s[1] + ny * t]
    poly([q(a, -r1 - 1), q(a, r1 + 1), q(b, r2 + 1), q(b, -r2 - 1)], 1)
    poly([q(a, -r1), q(a, r1), q(b, r2), q(b, -r2)], c)
    poly([q(a, -r1), q(a, 0), q(b, 0), q(b, -r2)], shade)
    line(
      a[0] + nx * (r1 - 1),
      a[1] + ny * (r1 - 1),
      b[0] + nx * (r2 - 1),
      b[1] + ny * (r2 - 1),
      light,
    )
  }
  const bat = character === 'batman',
    main = bat ? 13 : 8,
    shade = bat ? 5 : 2,
    bright = bat ? 6 : 14,
    boot = bat ? 1 : 9,
    skin = 15
  if (p.lying) {
    if (bat)
      poly(
        [
          [-25, -7],
          [-11, -20],
          [4, -19],
          [26, -3],
          [-27, -2],
        ],
        1,
      )
    limb([-11, -9], [5, -9], 6, 5, main, shade, bright)
    limb([5, -9], [19, -4], 4, 3, main, shade, bright)
    limb([15, -5], [27, -4], 3, 3, boot, shade, bat ? 13 : 10)
    limb([-7, -8], [-1, -2], 3, 3, main, shade, bright)
    rect(-22, -14, 10, 10, bat ? 1 : 8)
    rect(-20, -7, 6, 3, skin)
    rect(-17, -12, 3, 1, 7)
    if (bat) {
      poly(
        [
          [-24, -12],
          [-24, -19],
          [-20, -13],
        ],
        1,
      )
      poly(
        [
          [-17, -14],
          [-16, -19],
          [-13, -11],
        ],
        1,
      )
    }
  } else {
    const bob = p.bob || 0,
      lean = p.lean || 0
    const hip = [lean * 0.25, -25 + bob * 0.45],
      chest = [lean, -43 + bob],
      head = [lean + 1, -53 + bob]
    const legs = p.legs,
      arms = p.arms
    const knee0 = [legs[0], legs[1]],
      foot0 = [legs[2], legs[3]],
      knee1 = [legs[4], legs[5]],
      foot1 = [legs[6], legs[7]]
    const elbow0 = [arms[0] + lean, arms[1] + bob * 0.4],
      hand0 = [arms[2] + lean, arms[3] + bob * 0.4],
      elbow1 = [arms[4] + lean, arms[5] + bob * 0.4],
      hand1 = [arms[6] + lean, arms[7] + bob * 0.4]
    if (bat) {
      const sway = poseName.endsWith('1') ? 3 : 0
      poly(
        [
          [chest[0] - 7, chest[1] - 4],
          [chest[0] + 6, chest[1] - 3],
          [hip[0] - 1, -4],
          [-10 - sway, -8],
          [-19 - sway, -3],
          [-16 - sway, -15],
          [-26 - sway, -8],
          [-20, -29],
        ],
        1,
      )
      poly(
        [
          [chest[0] - 6, chest[1] - 2],
          [-19 - sway, -11],
          [-13 - sway, -16],
          [-9 - sway, -7],
          [hip[0] - 3, -8],
        ],
        0,
      )
      line(chest[0] - 7, chest[1], -19 - sway, -10, 13)
      line(chest[0] - 4, chest[1] + 6, -12 - sway, -9, 5)
    }
    // Far limbs are darker; fingers and boots retain their own silhouette.
    limb([hip[0] - 4, hip[1]], knee0, 4, 4, shade, 1, main)
    limb(knee0, foot0, 3, 3, boot, 1, bat ? 13 : 10)
    poly(
      [
        [foot0[0] - 4, foot0[1] - 3],
        [foot0[0] + 3, foot0[1] - 3],
        [foot0[0] + 6, foot0[1]],
        [foot0[0] - 4, foot0[1] + 1],
      ],
      1,
    )
    rect(foot0[0] - 3, foot0[1] - 2, 8, 2, boot)
    limb([chest[0] - 6, chest[1] + 2], elbow0, 4, 3, shade, 1, main)
    limb(elbow0, hand0, 3, 3, boot, 1, main)
    poly(
      [
        [chest[0] - 9, chest[1] - 3],
        [chest[0] + 8, chest[1] - 3],
        [hip[0] + 7, hip[1] + 3],
        [hip[0] - 7, hip[1] + 3],
      ],
      1,
    )
    poly(
      [
        [chest[0] - 7, chest[1] - 2],
        [chest[0] + 7, chest[1] - 2],
        [hip[0] + 5, hip[1] + 2],
        [hip[0] - 6, hip[1] + 2],
      ],
      main,
    )
    poly(
      [
        [chest[0] - 7, chest[1]],
        [chest[0] - 1, chest[1] + 2],
        [hip[0] - 1, hip[1]],
        [hip[0] - 6, hip[1] + 1],
      ],
      shade,
    )
    line(chest[0] + 1, chest[1] - 1, chest[0] + 5, chest[1], bright)
    line(chest[0] + 5, chest[1] + 1, hip[0] + 4, hip[1] - 3, bright)
    line(hip[0] - 3, hip[1] - 6, hip[0] + 3, hip[1] - 6, shade)
    if (bat) {
      poly(
        [
          [chest[0] - 4, chest[1] + 5],
          [chest[0] + 5, chest[1] + 5],
          [chest[0] + 5, chest[1] + 10],
          [chest[0] - 4, chest[1] + 10],
        ],
        10,
      )
      poly(
        [
          [chest[0] - 4, chest[1] + 5],
          [chest[0] - 2, chest[1] + 8],
          [chest[0], chest[1] + 6],
          [chest[0] + 2, chest[1] + 8],
          [chest[0] + 5, chest[1] + 5],
          [chest[0] + 3, chest[1] + 9],
          [chest[0], chest[1] + 11],
          [chest[0] - 2, chest[1] + 9],
        ],
        1,
      )
    } else {
      poly(
        [
          [chest[0] - 3, chest[1] + 4],
          [chest[0] + 3, chest[1] + 4],
          [chest[0] + 5, chest[1] + 7],
          [chest[0] + 3, chest[1] + 11],
          [chest[0] - 3, chest[1] + 11],
          [chest[0] - 5, chest[1] + 7],
        ],
        7,
      )
      poly(
        [
          [chest[0] + 2, chest[1] + 3],
          [chest[0] - 2, chest[1] + 8],
          [chest[0] + 1, chest[1] + 8],
          [chest[0] - 2, chest[1] + 13],
          [chest[0] + 5, chest[1] + 6],
          [chest[0] + 1, chest[1] + 6],
        ],
        10,
      )
    }
    rect(hip[0] - 6, hip[1] - 2, 12, 3, 9)
    rect(hip[0] - 2, hip[1] - 2, 3, 3, 10)
    limb([hip[0] + 4, hip[1] + 1], knee1, 4, 4, main, shade, bright)
    limb(knee1, foot1, 3, 3, boot, 1, bat ? 13 : 10)
    poly(
      [
        [foot1[0] - 4, foot1[1] - 3],
        [foot1[0] + 3, foot1[1] - 3],
        [foot1[0] + 6, foot1[1]],
        [foot1[0] - 4, foot1[1] + 1],
      ],
      1,
    )
    rect(foot1[0] - 3, foot1[1] - 2, 8, 2, boot)
    line(foot1[0] - 2, foot1[1] - 2, foot1[0] + 4, foot1[1] - 2, bat ? 13 : 10)
    limb([chest[0] + 6, chest[1] + 1], elbow1, 4, 3, main, shade, bright)
    limb(elbow1, hand1, 3, 3, boot, shade, bat ? 13 : 10)
    rect(hand1[0] - 2, hand1[1] - 2, 5, 5, boot)
    line(hand1[0], hand1[1] - 2, hand1[0] + 2, hand1[1] - 2, bat ? 6 : 10)
    // Neck, cowl, pointed ears / wing bolts, brow and exposed jaw.
    rect(head[0] - 3, head[1] + 5, 7, 5, shade)
    poly(
      [
        [head[0] - 6, head[1] - 5],
        [head[0] + 3, head[1] - 6],
        [head[0] + 6, head[1] - 3],
        [head[0] + 6, head[1] + 2],
        [head[0] + 8, head[1] + 3],
        [head[0] + 5, head[1] + 4],
        [head[0] + 4, head[1] + 8],
        [head[0] - 3, head[1] + 8],
        [head[0] - 6, head[1] + 4],
      ],
      1,
    )
    poly(
      [
        [head[0] - 5, head[1] - 4],
        [head[0] + 3, head[1] - 5],
        [head[0] + 5, head[1] - 2],
        [head[0] + 5, head[1] + 3],
        [head[0] + 3, head[1] + 7],
        [head[0] - 3, head[1] + 6],
        [head[0] - 5, head[1] + 3],
      ],
      bat ? 1 : 8,
    )
    if (bat) {
      poly(
        [
          [head[0] - 6, head[1] - 3],
          [head[0] - 6, head[1] - 11],
          [head[0] - 2, head[1] - 4],
        ],
        1,
      )
      poly(
        [
          [head[0] + 1, head[1] - 5],
          [head[0] + 4, head[1] - 11],
          [head[0] + 5, head[1] - 2],
        ],
        1,
      )
      line(head[0] - 4, head[1] - 4, head[0] - 4, head[1] + 1, 13)
    } else {
      poly(
        [
          [head[0] - 5, head[1] - 1],
          [head[0] - 10, head[1] - 4],
          [head[0] - 7, head[1] + 1],
          [head[0] - 10, head[1] + 3],
          [head[0] - 5, head[1] + 2],
        ],
        10,
      )
      line(head[0] - 3, head[1] - 4, head[0] + 2, head[1] - 4, 14)
    }
    rect(head[0] + 1, head[1] + 3, 4, 3, skin)
    dot(head[0] + 4, head[1] + 6, 4)
    line(head[0] + 1, head[1], head[0] + 4, head[1] - 1, 7)
    dot(head[0] + 4, head[1], bat ? 1 : 2)
  }
  let x0 = W,
    y0 = H,
    x1 = 0,
    y1 = 0
  pixels.forEach((r, y) => {
    r.forEach((c, x) => {
      if (c !== '.') {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
    })
  })
  return {
    pixels: pixels.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1).join('')),
    anchor: { x: OX - x0, y: OY - y0 },
    size: { w: x1 - x0 + 1, h: y1 - y0 + 1 },
  }
}

const sequences = {
  idle: [
    ['idle0', 10],
    ['idle1', 10],
    ['idle2', 10],
    ['idle1', 10],
  ],
  walk: [
    ['walk0', 5],
    ['walk1', 5],
    ['walk2', 5],
    ['walk3', 5],
  ],
  jump: [
    ['jump0', 10],
    ['jump1', 20],
    ['jump2', 10],
  ],
  crouch: [['crouch', 1]],
  light: [
    ['windup', 5],
    ['punch', 3],
    ['punchRecover', 10],
  ],
  airLight: [
    ['jump0', 4],
    ['airPunch', 6],
    ['jump1', 10],
  ],
  airHeavy: [
    ['jump0', 8],
    ['airKick', 6],
    ['jump1', 14],
  ],
  heavy: [
    ['kickWind', 11],
    ['kick', 5],
    ['kickRecover', 14],
    ['idle0', 7],
  ],
  sweep: [
    ['crouch', 9],
    ['sweep', 5],
    ['crouch', 20],
  ],
  special: [
    ['specialWind', 13],
    ['special', 5],
    ['punchRecover', 22],
  ],
  dash: [
    ['specialWind', 9],
    ['dash', 12],
    ['punchRecover', 24],
  ],
  guard: [['guard', 1]],
  crouchGuard: [['crouchGuard', 1]],
  hurt: [
    ['hurt', 6],
    ['hurt2', 8],
  ],
  ko: [
    ['hurt2', 10],
    ['fall', 16],
    ['ko', 90],
  ],
  victory: [['victory', 1]],
}
const attackBoxes = {
  punch: [{ x: 14, y: -48, w: 20, h: 9, kind: 'mid' }],
  airPunch: [{ x: 14, y: -48, w: 20, h: 14, kind: 'overhead' }],
  airKick: [{ x: 14, y: -33, w: 25, h: 17, kind: 'overhead' }],
  kick: [{ x: 16, y: -38, w: 24, h: 13, kind: 'overhead' }],
  sweep: [{ x: 12, y: -14, w: 29, h: 12, kind: 'low' }],
  dash: [{ x: 10, y: -47, w: 23, h: 38, kind: 'mid' }],
}
const characters = {}
for (const name of ['batman', 'flash']) {
  const frames = Object.fromEntries(Object.keys(poses).map((key) => [key, render(name, key)]))
  const animations = Object.fromEntries(
    Object.entries(sequences).map(([key, seq]) => [
      key,
      {
        loop: ['idle', 'walk', 'guard', 'crouchGuard', 'crouch', 'victory'].includes(key),
        frames: seq.map(([frame, duration]) => ({
          frame,
          duration,
          anchor: frames[frame].anchor,
          hitboxes: attackBoxes[frame] || [],
          hurtboxes:
            frame === 'ko'
              ? []
              : [
                  {
                    x: -9,
                    y: poses[frame].bob === 15 ? -39 : -59,
                    w: 19,
                    h: poses[frame].bob === 15 ? 38 : 58,
                  },
                ],
        })),
      },
    ]),
  )
  characters[name] = {
    id: name,
    subject:
      name === 'batman' ? 'Batman (DC character fan-art)' : 'The Flash (DC character fan-art)',
    frames,
    animations,
  }
}
const assets = {
  schemaVersion: 1,
  palette: 'pico8-16',
  fps: 60,
  coordinates: 'feet origin, positive x faces opponent; anchor locates feet in each cropped bitmap',
  provenance: {
    kind: 'original',
    authors: ['Arcade project'],
    method: 'Deterministic original pixel polygon artwork; no commercial sprite extraction',
    sources: [],
    characterRights:
      'Batman and The Flash are DC characters; this original fan-art does not grant character trademark or copyright rights.',
  },
  characters,
}
writeFileSync(resolve(import.meta.dirname, 'assets.json'), JSON.stringify(assets))
console.log('Wrote original fighter assets:', Object.keys(poses).length, 'poses per character')
