let game
// biome-ignore lint/correctness/noUnusedVariables: runtime lifecycle entry point
function init(api) {
  game = ARCADE.asteroids({ waves: 3, lives: 3 })
  game.init(api)
}
// biome-ignore lint/correctness/noUnusedVariables: runtime lifecycle entry point
function update(api, dt) {
  game.update(api, dt)
}
// biome-ignore lint/correctness/noUnusedVariables: runtime lifecycle entry point
function draw(api) {
  game.draw(api)
}
