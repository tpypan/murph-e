# ARCADE.fallingBlocks(config)

Creates `{ init(api), update(api, dt), draw(api), inspect(), layout() }`. Forward the cartridge's lifecycle methods to this object. `dt` is seconds. `api.players` is authoritative: one well in 1P; two independent simultaneous wells in versus 2P. Do not add a second gravity/collision loop around the foundation.

```js
let game;
function init(api) { game = ARCADE.fallingBlocks({ targetLines: 12 }); game.init(api); }
function update(api, dt) { game.update(api, dt); }
function draw(api) { game.draw(api); }
```

| Configuration | Default / bounds | Meaning |
| --- | --- | --- |
| `targetLines` | 12 / 0–100 | Clear this many lines to win; zero disables the line objective. |
| `timeLimit` | 240 / 30–900 seconds | Overall bound. 1P loses on expiry; 2P compares lines then score. |
| `seed` | 7 / unsigned integer | Deterministic independent seven-bag sequences. Equal seeds give both players equal piece sequences; garbage does not consume bag RNG. |
| `garbage` | true | In 2P, multi-line clears send garbage. False changes versus into a line race. |
| `onLock(event, api)` | optional | `{ player, piece, lines }` after legal placement. `piece` is I/O/T/S/Z/J/L and `lines` is the number now ready to clear. |
| `onClear(event, api)` | optional | `{ player, lines, total, attack }` after row removal. `attack` is the intended attack; incoming queue capacity can reduce delivery. |
| `clearFlash` | disabled | `{color:10,seconds:0.35}` flashes only that player's existing well outline when rows begin clearing. Color is palette0–15 (default10); duration0.1–1 second (default0.35). Does not alter hooks, gameplay or points. |

LEFT/RIGHT moves the active piece. DOWN soft-drops. A rotates clockwise; B hard-drops and locks. Rotation and hard drop require fresh presses. Horizontal repeat starts after 0.16 seconds and repeats every 0.055 seconds. A square does not visibly rotate. There is no hold action or counterclockwise action in this two-button contract.

The well is 10×20. Shapes use fixed rotation centers; rotation tests a short deterministic list of horizontal/upward kicks. These are original fixed kick rules, **not** a claim of exact SRS/Guideline compatibility. Landing lock delay is 0.42 seconds. Grounded movement/rotation can reset it at most eight times per piece; time already accumulated is preserved while briefly airborne. Hard drop ignores the delay. A landing ghost and next-three queue support planning.

Gravity begins at 0.8 seconds/cell. Every six lines increases level; the interval decreases by a factor of 0.82, bounded below by 0.055 seconds. A clear animates for 0.2 seconds before rows compact. Single/double/triple/four-row clears give 100/300/500/800 times level, plus consecutive-clear and consecutive-four-row bonuses. Soft/hard drop gives one/two points per cell. Pieces locking above the well or failing to spawn cause topout. `init` restores all wells, RNG and scores.

2P uses separate pieces, movement, queues, scores and lock timers. Clears of two/three/four rows propose one/two/four garbage rows. The opponent can queue at most four and receives at most two after a placement. Clearing rows cancels that player's pending rows. Attacks are delivered after both boards advance, preventing same-frame update-order advantage. Garbage rows share a visible hole and never overwrite occupied blocks silently: pushing a filled top row out causes topout. The first target reached or the surviving player wins. Both reaching the target in the same simulation tick gives a shared win; an exact time-limit tie gives game over.

For a requested clear pulse use `clearFlash:{color:10,seconds:0.35}` instead of manually drawing borders or a screen divider. `layout()` after init returns detached `{scoreHud,controls,sharedHud,wells}` geometry. Each well has `{player,cell,field,border,next}`; rectangles are `{x,y,w,h}` in native256×224 coordinates. To recolor an outline explicitly, use only `api.rect(border.x,border.y,border.w,border.h,color)`; do not fill that rectangle. In 1P the well border is(72,22,93,183); in2P borders are(13,32,83,163) and(159,32,83,163). The center gutter x100–155 is reserved for shared NEXT/TIME and both previews: **never draw a full-height divider at x127/128**. Runtime scores and bottom control legend are protected too.

`inspect()` is a detached JSON snapshot of phase, clock, target, player count and boards (grid, piece, actual occupied cells, grounded state, pending garbage, next queue and telemetry). Layout and inspect are observation interfaces, not writable state APIs. Existing event hooks are unchanged; unsupported config keys do nothing. Arbitrary wrapper drawing can still obscure the HUD, so use the semantic flash or declared geometry.

`assets.json` contains original beveled block/miniature frames, ghost outlines and three clear-animation frames. Pixel rows, dimensions, anchors, timing and geometry are supplied. Game collision is whole grid occupancy; decorative bevel rectangles are not collision shrinkage. No third-party artwork, game source, or commercial logos are bundled.
