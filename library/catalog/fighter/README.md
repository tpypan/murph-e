# Rooftop fighting foundation

This is a complete original small fighting game and a reusable composition factory, with original Batman/Flash fan-art as the customization example. It is inspired by the spacing, commitment and round structure of arcade fighting games. It is not commercial Street Fighter source, animation, or a claim of equivalent production quality.

The runtime remains 256×224 at 60Hz. Two 60px characters share a layered rooftop, independent health/meter, visible round pips and timer. The shell owns player input, START and score display. There is no browser/network dependency. A 1P game controls the opponent with a seeded, cadence-limited CPU; 2P removes the CPU and uses controller index 1.

## Files and data ownership

- `module.js`: ready-to-bundle expression evaluating to a factory, no imports.
- `core.js`: readable combat implementation; never modify generated module alone.
- `build-assets.mjs`: deterministic authored pixel polygons and 30 pose definitions per character. No image retrieval/tracing.
- `assets.json`: both complete cached pose sets, cropped pixel rows, feet anchors, dimensions, clip timing, active hitboxes, hurtboxes and provenance. Sixteen clips cover idle, walk, jump, crouch, ground/air attacks, sweep, both specials, both guards, hurt, KO and victory.
- `build.mjs`: builds assets and embeds them with the factory in `module.js`.
- `api.md`: bounded composition contract, exact options/defaults, identity limitations and controls.
- `demo.js`, `spec.json`: original Batman vs Flash composition; changing runtime player count selects 1P/2P behavior.
- `test.mjs`, `collision-test.mjs`, `asset-test.mjs`, `projectile-test.mjs`, `selection-test.mjs`, `verify.mjs`: deterministic state tests and machine-readable result.
- `screenshots.mjs`: isolated actual runtime loads, action renders, terminal flow and original pose contact sheets. It never touches the live cabinet game.
- `selection-screenshots.mjs`: offline native selection/versus/selected-match screens and real-input assertions in both player modes, including same-character versus.

Custom characters must supply complete visual/frame metadata through `assets` and choose their ID in `roster`. `names` is only a label. Unknown identities fail clearly. Base movement, guard, jump, hitstop, scoring, round reset and terminal behavior are reused; numerical attack timing can vary without desynchronizing active poses and collision. Sprite metadata supplies the actual collision boxes. See `api.md` for every supported field.

## Verified behavior

Run from repository root:

```sh
node library/catalog/fighter/build.mjs
node library/catalog/fighter/verify.mjs
node library/catalog/fighter/screenshots.mjs
node library/catalog/fighter/selection-screenshots.mjs
```

The original fifteen behavior tests cover the baseline, including independent inputs, responsive harmless intro, push boxes, exact startup/active/recovery, no repeated damage, hitstop, standing/crouch guard interactions, jump attacks and landing, meter/projectile/dash differences, CPU-only loss without score contamination, P2 indexed victory, timeout and full round reset, deterministic inputs/seed, unsupported identity rejection, custom metadata hitboxes, synchronized timing overrides, and follow-up input buffered during hitstop. `evidence/behavior.json` contains the exact output and code/test hashes.

`evidence/runtime.json` records error-free Chromium runtime loads in both player modes plus a real runtime 1P game-over and P2 win. The P2 terminal scenario scored `[0,1870]` with winner index 1; idle human loss scored 0. Those checks go beyond a scene drawing once. Runtime screenshots cover standing poses, kicking, airborne action, speed dash, projectile and both end states.

## Visual inspection and remaining limits

Inspected `evidence/2p-ready.png`, `2p-kick.png`, `batman-poses.png`, and `flash-poses.png` at native pixels. The cowl/cape and speedster mask/lightning costume distinguish the named characters; articulated limbs give different attack, guard, crouch and KO silhouettes; floor contact is stable across cropped-frame anchors. HUD is readable and below the runtime score strip. Atlas pixels are cached once and drawn via `api.spr`, not rebuilt every frame.

This is a reviewed playable baseline, not evidence of competitive fighting balance or physical CRT playtesting. The CPU is a bounded heuristic, there is no throw system or large combo tree, only two bundled identities, and the original palette artwork is less detailed than commercial 16-bit fighter animation. The cabinet's two-button layout intentionally combines down modifiers with attack buttons. Human playtesting across skill levels should guide timing and AI tuning. The two DC identities are original fan-art; underlying character rights remain with their owners.

## Composite frames and collision review

The 1.1 controller draws ordered, independently paletted frame layers with one shared registration and facing transform. It consumes every timed hit/hurt box, treats empty hurtboxes as invulnerable, and supports explicit clip-step anchors. Source frames with 19/20 opaque colors no longer lose their effect colors. Custom assets fail early on malformed planes, references, timing and geometry. A projectile keeps its impact direction after an aerial cross-up turns its owner.

Fourteen additional offline tests exercise native Screen RGB output, overlapping planes, transparent and opaque-black pixels, both facings, legacy rendering, invalid asset rejection, multi-box collisions, one-hit score accounting, invulnerability, exact duration boundaries projectile direction, and airborne knockout/timeout landing. Rendering proof for all 57 cached Spider-Man frames (114 native comparisons) lives separately under the ignored source cache; it does not bundle that commercial art into this public foundation.

Round-end input and damage remain locked while airborne fighters settle under gravity. Defeated poses keep their full width inside the stage after combat ends, including wider imported lying frames.

## Reusable special-move effects

Version 1.2 adds per-character travel/impact/bind clips and authored frame-local emission sockets. Effects reuse the exact-color layered renderer, facing, duration and registration metadata. Travel damage follows an explicit local box. A long trail emerges from its source as it travels; no full trail is drawn through the character at launch. Optional grounded binding is finite, breaks on follow-up damage, cannot immediately refresh, and clears between rounds. Blocking and airborne targets never bind. The original Batman/Flash defaults keep their existing projectile and dash.

`projectile-test.mjs` exercises source-independent complete synthetic assets, both emission directions, palettes/layers, hit/block/miss/air outcomes, input recovery, score ownership, immunity, reset and malformed contracts. Separate native source-art evidence under `data/reference-cache/spriters-resource/spider-man/` compares all 84 draft frames in both directions and runs real-input hit, mirror, block, jump and CPU scenarios. That private Spider-Man adaptation has authored mechanics and is not bundled or admitted by this public foundation.

## Character selection

Version 1.3 enables selection in the public demo. The reusable factory keeps its old immediate round intro unless `characterSelect:true` is supplied. A 1P human chooses against a labelled CPU; 2P has independent cyan/yellow cursors and locks. Left/right chooses, A locks, B unlocks. The game waits indefinitely for the required human confirmations, then shows a one-second versus card that still permits cancellation. A held confirm is suppressed until that player releases it. Both players may select the same character; P1/P2 labels then remain beneath the fighters during play.

Large idle previews and cropped portrait tiles use the actual bundled pose pixels, including palette layers for custom sets. Preview-only nearest-neighbor fitting keeps larger imported frames within their display area; it does not change combat sprite data or collision geometry. The public roster remains the two actual bundled identities. Expanding `selectableRoster` requires complete validated assets, never renamed substitutes.

Seven selection tests cover independent cursors, persistent locks, cancellation during versus, stale/held button edges, 1P CPU semantics, same-character movement/markers, complete-asset rejection, an input-driven full two-round match, and fresh reset. Existing 41 combat/art tests remain in the suite. `evidence/selection-runtime.json` binds real Chromium input checks and nine native 256×224 screenshots to the module/demo/runtime hashes. See `1p-select.png`, `2p-select-p1-locked.png`, `2p-versus.png`, and `2p-same-character-fight.png`. These verify local rendering and controller semantics, not physical CRT readability or hardware calibration.

## CPU mix-ups and behavioral audit

Version 1.4 adds delayed visible-stance decisions, low sweeps, distinct high/low guards and a committed jumping overhead. It repairs an out-of-range attack intention that previously crouched in place and lost its button edge. Every move retains the same startup, recovery, damage and collision rules. Two-player human combat never executes the CPU branch.

The original CPU could not beat permanent standing guard: all 48 seed/difficulty trials stayed at full health for 18,000 updates, repeating tied rounds. A single jab followed by back-guard won every tested match. The new CPU ends all those tested stalls through ordinary low attacks. Against five taps per second at default difficulty, repeated jabs won 1/16 matches and repeated sweeps won 12/16; at hard difficulty those policies won 0/16 and 3/16. Easy sweep play remains successful in 16/16. These are narrow scripted policies, not a human balance study or an optimal-play result.

Five additional `cpu-test.mjs` regressions bring the suite to 53 tests. The offline `scripts/audit-fighter-control.mjs` records the 192-case matrix and optional actual native-runtime input replays; current evidence is in `evidence/cpu-control.json`. Before/after artifacts live under `bench/audits/fighter-control/`. Native default matches reproduce the old exploit and verify that the changed controller answers it without synthetic state edits. No model/provider requests are used.
