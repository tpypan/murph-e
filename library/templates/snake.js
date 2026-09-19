// TITLE: SNAKE
// GENRE: snake
// CONTROLS: up down left right a
// Classic grid snake. The d-pad turns, A gives a short speed boost. Eat food
// to grow and score; hitting a wall or yourself ends the game. The snake
// speeds up as it grows.

const CELL = 8
const COLS = 32
const ROWS = 25 // rows 0..24 below a 2-cell HUD strip
const TOP = 16 // pixels; keeps the runtime HUD clear

let g

function init(api) {
  g = {
    body: [], // head first: { x, y } in cells
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 0, y: 0 },
    stepEvery: 9, // frames per move; shrinks as the snake grows
    timer: 0,
    boost: 0,
    grow: 0,
  }
  for (let i = 0; i < 4; i++) g.body.push({ x: 8 - i, y: 12 })
  placeFood(api)
  api.score(0)
}

function placeFood(api) {
  for (let tries = 0; tries < 200; tries++) {
    const x = api.rndi(1, COLS - 2)
    const y = api.rndi(1, ROWS - 2)
    if (!g.body.some((b) => b.x === x && b.y === y)) {
      g.food = { x, y }
      return
    }
  }
}

function update(api, dt) {
  // Turn, but never straight back into yourself.
  const want = api.btnp('up')
    ? { x: 0, y: -1 }
    : api.btnp('down')
      ? { x: 0, y: 1 }
      : api.btnp('left')
        ? { x: -1, y: 0 }
        : api.btnp('right')
          ? { x: 1, y: 0 }
          : null
  if (want && (want.x !== -g.dir.x || want.y !== -g.dir.y)) g.nextDir = want
  if (api.btnp('a')) {
    g.boost = 30
    api.sfx('select')
  }
  if (g.boost > 0) g.boost--

  g.timer++
  const every = Math.max(3, g.stepEvery - (g.boost > 0 ? 4 : 0))
  if (g.timer < every) return
  g.timer = 0

  g.dir = g.nextDir
  const head = g.body[0]
  const nx = head.x + g.dir.x
  const ny = head.y + g.dir.y

  const hitWall = nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS
  const hitSelf = g.body.some((b) => b.x === nx && b.y === ny)
  if (hitWall || hitSelf) {
    api.sfx('die')
    api.flash(8, 3)
    api.shake(12)
    api.gameOver()
    return
  }

  g.body.unshift({ x: nx, y: ny })
  if (nx === g.food.x && ny === g.food.y) {
    api.addScore(10)
    api.sfx('coin')
    api.flash(10, 1)
    g.grow += 2
    if (g.body.length % 3 === 0) g.stepEvery = Math.max(4, g.stepEvery - 1)
    placeFood(api)
  }
  if (g.grow > 0) g.grow--
  else g.body.pop()
}

function draw(api) {
  api.cls(3)
  // Checkered field with a wall border.
  for (let y = 0; y < ROWS; y++) {
    for (let x = y % 2; x < COLS; x += 2) api.rectfill(x * CELL, TOP + y * CELL, CELL, CELL, 11)
  }
  api.rect(0, TOP, COLS * CELL, ROWS * CELL, 4)
  api.rect(1, TOP + 1, COLS * CELL - 2, ROWS * CELL - 2, 4)

  // Food
  api.circfill(g.food.x * CELL + 4, TOP + g.food.y * CELL + 4, 3, 8)
  api.pset(g.food.x * CELL + 3, TOP + g.food.y * CELL + 2, 7)

  // Snake, head brighter with eyes.
  for (let i = g.body.length - 1; i >= 0; i--) {
    const b = g.body[i]
    api.rectfill(b.x * CELL + 1, TOP + b.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 10 : 9)
  }
  const h = g.body[0]
  api.pset(h.x * CELL + 2 + (g.dir.x > 0 ? 3 : 0), TOP + h.y * CELL + 2 + (g.dir.y > 0 ? 3 : 0), 0)
  api.pset(h.x * CELL + 5 - (g.dir.x < 0 ? 3 : 0), TOP + h.y * CELL + 5 - (g.dir.y < 0 ? 3 : 0), 0)
  if (g.boost > 0) api.text('BOOST', api.W - 44, api.H - 8, 7)
}
