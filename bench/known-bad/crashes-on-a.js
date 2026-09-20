// CONTROLS: left right a
let x
function init() { x = 120 }
function update(api) {
  if (api.btn('left')) x--
  if (api.btn('right')) x++
  if (api.btnp('a')) throw new Error('action crash')
}
function draw(api) {
  api.cls(1)
  api.rectfill(0, 190, 256, 34, 3)
  api.rectfill(x, 100, 12, 12, 8)
  api.rectfill(api.frame % 200, 50, 10, 10, 10)
}
