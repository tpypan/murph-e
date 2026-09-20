// CONTROLS: left right a
let x
let y
function init() { x = 120; y = 100 }
function update(api) {
  if (api.btn('left')) throw new Error('direction crash')
  if (api.btn('right')) x++
  if (api.btnp('a')) y -= 10
}
function draw(api) {
  api.cls(1)
  api.rectfill(0, 190, 256, 34, 3)
  api.rectfill(x, y, 12, 12, 8)
  api.rectfill(api.frame % 200, 50, 10, 10, 10)
}
