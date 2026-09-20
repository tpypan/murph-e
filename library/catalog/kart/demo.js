// Bundler prepends the original local kart foundation as ARCADE.kart.
const game = ARCADE.kart({ laps: 3, difficulty: 0.45, theme: 'coast',
  drivers: [{ name: 'SUNSET', body: 8, helmet: 10 }, { name: 'COMET', body: 12, helmet: 7 }] });
function init(api) { game.init(api); }
function update(api, dt) { game.update(api, dt); }
function draw(api) { game.draw(api); }
