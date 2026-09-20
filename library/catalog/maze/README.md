# Maze chase and goose hunt foundation

A complete original maze game, with 1P and shared-maze 2P cooperation. The base layout was authored in this project's original `library/reference/maze-chase.js`; this foundation turns it into a full playable game. No original commercial ROM, maze, code or sprite sheet was copied.

Classic mode has real pellet routes, power pickups, four ghost roles, timed scatter/chase behavior, buffered grid turns, immediate reversal and paired tunnels. The central enclosed house, separate starting slots and pink ghost-only door are actually rendered. Ghosts visibly leave, captured eyes travel home, bodies reform, and ghosts release again. Connected blue wall outlines on black corridors preserve familiar maze-chase readability.

Permanent hunter mode is a distinct rule policy, used by the supplied goose example. Ghosts always flee, contact always captures, and power expiry never changes contact into damage. Capture quotas and a clock give the hunt a clear objective. A honk briefly stuns nearby ghosts. In 2P both geese move independently while sharing progress and scores. Classic 2P uses shared lives and resets both players after a loss.

## Reusable files

- `module.js`: import-free factory expression for the catalog assembler.
- `core.js`: readable source. `build.mjs` combines it with original assets.
- `build-assets.mjs`: reproducible original pixel artwork, without external images.
- `assets.json`: 156 frames and 54 clips. Both players' chomper/goose movement covers all four directions; goose honk/death, four ghost colors/directions, frightened/flashing variants, returning eyes and reform clips are complete. Every frame has duration via its clip, a center anchor, dimensions, collision boxes and provenance. The runtime uses the metadata for drawing and contact; returning-eye frames have no collision boxes.
- `api.md`: every supported configuration field/default, actual controls, policy differences and customization limits.
- `demo.js`/`spec.json`: the permanent goose-hunter composition.
- `test.mjs`/`verify.mjs`: deterministic behavior verification and exact result artifact.
- `screenshots.mjs`: actual isolated runtime rendering and full input replays; never affects the live cabinet.

## Verification

From repository root:

```sh
node library/catalog/maze/build.mjs
node library/catalog/maze/verify.mjs
node library/catalog/maze/screenshots.mjs
```

Eighteen behavioral tests cover every-pickup reachability, forbidden house entry, connected tunnels, full directional assets, immediately responsive movement/honk during the informational READY banner, safe ghost waiting, buffered junction turns, continuous reverse/tunnel movement, chase/scatter timing, all four ghost exits, capture→return→reform→release for every ghost, classic contact loss and both-player reset, power pickup/expiry, full-maze cooperative collection, complete hunter victory with all four ghosts active, timeout, level progression/reset, identity rejection and invalid maps.

The ghost lifecycle test captured each ghost once and observed each return home, reform and release for a second time within 618 frames. `evidence/lifecycle.json` preserves those events/state. There were no life-loss events in the permanent hunt.

The real Chromium runtime replayed all inputs from two complete behavior scenarios: every pellet collected on the full maze with ghosts disabled (cooperative score 1,950 each), and an eight-capture cooperative goose hunt with all four real ghosts (score 2,610 each). Both returned runtime `win` with equal player scores. Separate runtime checks reached classic 1P game-over and hunter timeout. `evidence/runtime.json` records errors and terminal states. Disabling ghosts in the pellet replay isolates coverage of every route; it is not a claim that a human has beaten the default challenge.

## Visual review and limitations

Inspected native-pixel screenshots of classic READY/house, ghost release, cooperative goose hunting/capture, both complete terminal states and the full animation contact sheet. Blue outlines form connected wall shapes; pellet paths, power pickups, the house and door are visible; colored ghost slots and moving returning eyes make the lifecycle understandable. White goose shapes have an extended neck, orange beak/feet and blue/red player wing markings. Eye-only and reform frames are visually distinct. Character/ghost artwork is intentionally small and original; this is not commercial Pac-Man sprite fidelity.

`evidence/visual.json` lists reviewed files and hashes. Human difficulty/fun evaluation and physical CRT playtesting remain future validation. The baseline map has 19×19 tiles and fixed house/tunnel anchors; this is a reusable maze game, not an unrestricted level-editor or arbitrary-character generator. The screenshot/player replays verify functional behavior, not universal gameplay quality.

The repository declared-controls probe also passes both 1P and 2P: `node --import tsx ../../scripts/verify-catalog.ts maze` from `packages/harness`. Its remaining direction observations are soft checks for up/down blocked by the starting corridor walls; the independent buffered-turn tests exercise both directions at open junctions. The shell START is the only start gate. Players initially stand still and can move/honk immediately during the short READY banner; ghosts remain harmless in their house during that banner.

## Imported artwork adapter

`assets:{frames,animations}` accepts a complete reviewed sprite set with native
pixels, per-frame palettes/anchors and authored 60Hz durations. Visual replacements
cannot change the controller's collision rules. Incomplete clips, invalid palettes,
and lifecycle animations longer than their controller phase fail before play.
The optional `playerMarkers` setting distinguishes identical source characters in 2P.

The adapter adds deterministic comparison tests for shared-life contact/capture,
source-color tunnel copies, defensive copying and malformed assets. All eleven
legacy native screenshots match the pre-adapter images byte-for-byte.
`evidence/adapter-baseline.json` records those hashes.

A separate private Pac-Man source-art pack uses this adapter; see
`docs/research/pac-man-sheet-audit.md`. Its default 1P/2P full three-round input
replays use all four active ghosts and are replayed in the actual browser runtime.
This does not replace human playtesting or claim original-ROM behavior.
