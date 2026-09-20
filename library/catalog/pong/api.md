# ARCADE.pong(config)

Returns `{ init(api), update(api, dt), draw(api), inspect() }`. Call all three lifecycle methods from the generated cartridge. `dt` is seconds. `api.players` selects 1P versus a CPU or simultaneous competitive 2P. Do not implement a second ball simulation around this module.

```js
let game;
function init(api) { game = ARCADE.pong({ difficulty: 0.45 }); game.init(api); }
function update(api, dt) { game.update(api, dt); }
function draw(api) { game.draw(api); }
```

Configuration:

| Field | Default / range | Effect |
| --- | --- | --- |
| `winScore` | 7 / 1–15 | Points required to win. |
| `difficulty` | 0.45 / 0–1 | CPU observation interval, movement speed and aim error. |
| `timeLimit` | 180 / 30–600 seconds | Leader wins when time expires; ties enter next-point sudden death. |
| `onPoint(event, api)` | optional function | After a point: `{ player, points: [p1,p2] }`. |
| `onMatch(event, api)` | optional function | Once at termination: `{ winner, points }`. |

Controls are identical on both controllers: UP/DOWN moves the paddle; LEFT/RIGHT are equivalent aliases. A serves and, during rallies, charges a power return while reducing movement speed. B holds precision movement. A pressed during the short serve pause is queued; gameplay never serves for a human without an A press. CPU serves automatically after its pause.

The ball starts at 116 px/s, gains 7 on a return or 25 on a charged return, and caps at 255. Impact location plus paddle velocity determines the return angle. Moving paddles add decaying spin. Paddle collision uses a swept face test inside 120 Hz substeps. CPU observes periodically, follows the observed ball with aim error, and has finite speed; it cannot teleport or read an exact future intercept. One point earns 100 runtime score. First to the target wins; 2P calls `api.win(winnerIndex)`. A CPU victory calls `api.gameOver()`.

`inspect()` returns a detached JSON snapshot for behavioral tests and presentation hooks: phase, clock, players, server, points, winner, sudden-death flag, paddles, ball and telemetry. It is observational, not a state mutation API. `init` completely resets a match and scores.

The module owns the 256×224 playfield below the runtime score HUD. Add themed presentation after `game.draw(api)` while preserving court/paddle/ball visibility; do not cover y=12–200 with an opaque overlay. Content changes that alter physics should be made in this foundation and verified, rather than inventing undocumented config options. Hook exceptions are deliberately visible to the runtime/probe.

`assets.json` contains original palette-index frames for idle/hit paddles, animated ball and three impact phases. Each frame records pixels, dimensions, duration at 60 ticks/sec, anchor and collision geometry. Periodic ball frames last five ticks. Paddle flash is event-driven. Impact particles use the first two frames then a colored final pixel. These are paddle-game primitives, not humanoid animation assets. No reference-game artwork or source is bundled.
