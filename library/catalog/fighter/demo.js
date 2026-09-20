let game
// biome-ignore lint/correctness/noUnusedVariables: Runtime entry point.
function init(api) {
  game = ARCADE.fighter({
    characterSelect: true,
    roster: ['batman', 'flash'],
    roundsToWin: 2,
    roundSeconds: 60,
    difficulty: 0.6,
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
