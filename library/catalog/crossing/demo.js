let game
// biome-ignore lint/correctness/noUnusedVariables: Runtime entry.
function init(api) {
  game = ARCADE.crossing({ levels: 3, lives: 3, timeLimit: 90 })
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
