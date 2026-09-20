# ARCADE.missileDefense(config)

Creates `{ init(api), update(api, dt), draw(api), inspect() }`. Forward the generated cartridge's lifecycle methods to this object. `dt` is seconds. `api.players` selects one cursor or two independent cooperative cursors. The module owns missile trajectories, defensive blasts, ammunition and city survival.

```js
let game;
function init(api) { game = ARCADE.missileDefense({ waves: 4 }); game.init(api); }
function update(api, dt) { game.update(api, dt); }
function draw(api) { game.draw(api); }
```

| Configuration | Default / bounds | Meaning |
| --- | --- | --- |
| `waves` | 4 / 1–8 | Finite number of authored difficulty steps. |
| `timeLimit` | 240 / 30–900 seconds | Overall defeat deadline. |
| `seed` | 19 / unsigned integer | Deterministic arrival positions/target selection. |
| `onIntercept(event, api)` | optional | `{ player, chain, wave }` when an incoming missile is destroyed. |
| `onWave(event, api)` | optional | `{ wave, cities, bonus }` after a complete defended wave. |

The D-pad moves the targeting cursor, with normalized diagonal speed. Hold A to fire toward its current position every 0.26 seconds. B cycles launch batteries on a fresh press. The cursor number/color and matching line beneath a battery identify each player's selected station. An empty or destroyed selected battery cannot fire; choosing another is meaningful. Interceptors travel at 205 px/s and explode at their fixed selected destination, so aiming ahead matters.

Three visible batteries carry 10/14/10 shared shots each wave. Six cities are separate survival targets. Enemy trails converge toward visible living targets. A wave has `4 + 4 * wave` initial missiles; speed and spawn pressure rise to bounded limits. From wave two, some arrivals are paired. From wave three, marked fork-shaped missiles can split at altitude into at most two city-bound missiles. Active counts are bounded; there are no invisible instant ground hits.

Defensive blasts expand, hold, then contract through a real radius sequence of 3/7/12/18/24/24/18/12/7/3 pixels. Durations are 3/4/5/6/10/10/6/5/4/3 ticks at 60 Hz. Collision uses the same phase radius that the art depicts. Intercepting a missile creates a smaller 0.625-scale secondary blast which can independently intercept further missiles. These are actual chain reactions with ownership and score, not decorative particles. Direct interceptions earn 25, chain interceptions 50.

Once every arrival, interceptor and blast resolves, the wave clears. Each player receives `50 * survivingCities + 2 * remainingAmmo`. A two-second resupply phase refills all stations and rebuilds one lost city before the next wave. The final wave wins if any city survives. Losing all cities, or reaching the overall deadline, calls game over once. Restarting with `init` resets everything including scores, seed and statistics.

2P shares cities, stations and ammunition but keeps separate cursors, selected batteries, cooldowns, shots, blast ownership and scores. Both contribute to one defense objective; neither is an automatic follower. A player's interception credits only that player; survival bonuses credit both.

`inspect()` returns a detached snapshot including phase, clock, wave, cities, batteries, cursors, missiles, rockets, active explosions and telemetry. It is observation-only. Hooks can add theme-specific feedback; unsupported config fields do nothing. There is no invisible shield, aim assist, external image loading or separate renderer dependency.

`assets.json` includes original city skyline/light states and ruins, loaded/firing/empty/ruined batteries, enemy and split heads, both cursors, interceptor frames and both owners' full-size/chain blast stages. It records frame-local pixel data, dimensions, timing, anchors and collision geometry. City/ground placement and explosion collision are code-owned; do not treat static sprite dimensions as arbitrary new physics. No ripped assets or commercial game source is included.
