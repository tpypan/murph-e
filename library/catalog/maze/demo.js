let game
// biome-ignore lint/correctness/noUnusedVariables: Runtime entry point.
function init(api) {
  game = ARCADE.maze({
    avatar: 'goose',
    huntMode: 'player-hunts',
    levels: 3,
    capturesToClear: 8,
    huntSeconds: 60,
  })
  game.init(api)
}
// biome-ignore lint/correctness/noUnusedVariables: Runtime entry point.
function update(api, dt) {
  game.update(api, dt)
}
// biome-ignore lint/correctness/noUnusedVariables: Runtime entry point.
function draw(api) {
  game.draw(api)
}
