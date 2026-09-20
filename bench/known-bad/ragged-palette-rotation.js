// Minimal original repro of TANK DUEL's malformed-row rotation defect.
// All authored indices fit eight colors. Row 6 is short; rotating it twice
// inserts letters from "undefined", including f, which must fail clearly.
const COLORS = [
  '#111820', '#253544', '#48647c', '#7098ba',
  '#1258ba', '#287ce8', '#64caff', '#e0f8ff',
]
const HULL = [
  '..1111..',
  '.122221.',
  '12333321',
  '12344321',
  '12377321',
  '12333321',
  '.12221.',
  '..1111..',
]
let poses, x, y, facing, shots, ticks

function rotateArt(rows) {
  const rotated = []
  for (let column = 0; column < rows[0].length; column++) {
    let row = ''
    for (let sourceY = rows.length - 1; sourceY >= 0; sourceY--) row += rows[sourceY][column]
    rotated.push(row)
  }
  return rotated
}

function init(api) {
  api.score(0)
  x = 120
  y = 112
  facing = 2
  ticks = 0
  shots = []
  poses = [HULL]
  for (let direction = 1; direction < 4; direction++) poses.push(rotateArt(poses[direction - 1]))
}

function update(api, dt) {
  ticks++
  if (api.btn('left')) { x -= 60 * dt; facing = 2 }
  if (api.btn('right')) { x += 60 * dt; facing = 0 }
  if (api.btn('up')) { y -= 60 * dt; facing = 3 }
  if (api.btn('down')) { y += 60 * dt; facing = 1 }
  x = api.clamp(x, 8, 240)
  y = api.clamp(y, 40, 160)
  if (api.btn('a') && ticks % 8 === 0) {
    shots.push({ x: x + 4, y })
    api.sfx('shoot')
  }
  for (const shot of shots) shot.y -= 120 * dt
  shots = shots.filter((shot) => shot.y > 30)
}

function draw(api) {
  api.cls(1)
  api.rectfill(0, 176, 256, 48, 3)
  api.rectfill((ticks * 2) % 248, 24, 8, 3, 6)
  api.spr(poses[facing], x, y, false, false, COLORS)
  for (const shot of shots) api.rectfill(shot.x, shot.y, 2, 4, 10)
}
