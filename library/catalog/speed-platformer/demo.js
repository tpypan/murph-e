let game
function init(api) {
  game = ARCADE.speedPlatformer({ title: 'AZURE DASH' })
  game.init(api)
}
function update(api, dt) {
  game.update(api, dt)
}
function draw(api) {
  game.draw(api)
}
