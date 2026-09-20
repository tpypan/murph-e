let game
// biome-ignore lint/correctness/noUnusedVariables: Runtime entry.
function init(api) {
  game = ARCADE.bomber({ levels: 2, roundsToWin: 2 })
  game.init(api)
}
// biome-ignore lint/correctness/noUnusedVariables: Runtime entry.
function update(api, dt) {
  game.update(api, dt)
}
// biome-ignore lint/correctness/noUnusedVariables: Runtime entry.
function draw(api) {
  game.draw(api)
}
