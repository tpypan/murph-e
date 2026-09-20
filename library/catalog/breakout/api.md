# ARCADE.breakout(config)

Returns `{ init(api), update(api, dt), draw(api), inspect() }`. Call these lifecycle methods from the generated cartridge. `dt` is seconds. `api.players` selects 1P or simultaneous cooperative 2P. Keep this module responsible for collision and scoring.

```js
let game;
function init(api) { game = ARCADE.breakout({ lives: 3 }); game.init(api); }
function update(api, dt) { game.update(api, dt); }
function draw(api) { game.draw(api); }
```

Configuration:

| Field | Default / range | Effect |
| --- | --- | --- |
| `stages` | Three authored formations | Up to six arrays of up to seven eight-character rows. `0` is empty; `1`, `2`, `3` are brick durability. Rows normalize to eight columns; an empty formation receives one playable target. |
| `lives` | 3 / 1–9 | Shared life pool. A life is lost only when the final active ball falls. |
| `timeLimit` | 360 / 30–900 seconds | Finite overall run; expiry loses. |
| `onBrick(event, api)` | optional function | On destruction: `{ player, stage, id, combo, points }`; stage is one-based. |
| `onStage(event, api)` | optional function | On clearing a stage: `{ stage, lives }`. |

LEFT/RIGHT moves your paddle. A launches from your paddle when serving; during play a fresh A press opens a 0.3-second power-return window with a 0.9-second cooldown. B holds precision movement. A pressed during the serve pause is queued. In 2P each player covers their own half of the court; either may claim the serve with A. Scores remain separate and credit the ball's last paddle contact. Both players share stages, lives and the final win.

Ball movement uses earliest swept expanded-AABB collision for every brick, wall and paddle contact. It preserves remaining movement time after a rebound, with a bounded contact loop. Impact placement plus paddle velocity sets outgoing angle. A pulse adds speed; a nonzero horizontal floor prevents permanently vertical loops. Speed caps at 218 px/s. Native authored stages contain 84 bricks and 142 total hit points.

Every sixth destroyed brick drops a cycling pickup: wider paddle for 10 seconds, slower movement for 8 seconds, or up to three simultaneous balls. Destroyed bricks score `20 * originalDurability + min(80, combo * 5)`. Combo increases across consecutive brick destructions and resets on a paddle return or lost life. Pickup capture earns 50; clearing a stage earns each player 250. After a brief clear phase the next formation waits for an explicit serve. Clearing the final formation calls `api.win()` once; exhausting lives or time calls `api.gameOver()` once.

`inspect()` returns a detached JSON snapshot: phase, clock, players, stage (zero-based), lives, owner, combo, slow timer, paddles, balls, bricks, pickups and telemetry. It is observational, not a mutation API. `init` fully resets the run and both scores.

The module owns the 256×224 playfield below the runtime score HUD. The game can use authored `stages` and event hooks to add a specific theme. Add presentation after `game.draw(api)` without obscuring the court. Unsupported config fields do nothing; new mechanics must be explicitly implemented and verified. Hook errors stay visible to the runtime/probe.

`assets.json` holds original palette-index art: both paddles at normal/wide sizes, 21 color/damage brick states, two ball frames, three two-frame pickup icons and three impact phases. All frames have dimensions, pixel rows, duration at 60 ticks/sec, anchors and contact geometry. Every fresh brick uses intact art regardless of durability. Cracks advance with accepted hits (`maxHp - hp`), not remaining HP or elapsed time: frame suffix 3 is intact, 2 is one hit of damage, 1 is two hits. One-hit bricks disappear directly from intact; tougher bricks visibly crack before breaking. Ball frames last five ticks; pickup frames last ten. Final impact particles become colored pixels. No third-party artwork or commercial game code is included.
