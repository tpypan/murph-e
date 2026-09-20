# Coast Circuit: original kart foundation

A complete reusable 1P/2P arcade kart game, intended as a composable local foundation rather than source for the model to rewrite on each request.

- Perspective road with eased curves, kerbs, lane markings, checker grid, coast/grass scenery, palms, turn signs, billboards and speed effects.
- Six physical karts: one human + five AI or two humans + four AI. Two-player views are stacked inside the existing 256×224 runtime. Cabinet player count is authoritative.
- Three default laps; four forward-only ordered gates per lap; position, timer, lap/progress, scoring and terminal race results. No instant finish-line shortcut.
- Acceleration, brake, speed-sensitive steering, lateral corner force, grass drag, rival bump collisions, charge-and-release mini-turbos and track boost pads.
- Eighteen saved original 32×32 frames covering idle, drive, steering both ways, drift both ways, turbo and crash spin. Frame timing, anchors, pixel hurtboxes, track-space collision dimensions and driver/exhaust attachment points live with the assets.
- Three-second grid countdown freezes travel but still responds to steering, revving and handbrake lights. Inputs feel connected from the first frame.
- Optional per-driver source art and three roadside art slots preserve native crop dimensions, ground anchors and exact per-frame palettes. Nearest-neighbor projection uses a bounded raster cache and clips each view independently. Existing default sprites and physics are unchanged.

`api.md` is the small exact contract supplied to the composing model. `module.js` is the standalone shipped factory, generated from `module.base.js` + `assets.json`. `create-assets.mjs` preserves the original pixel artwork's authoring source. No downloaded game code, commercial sprites, external packages, images, imports or network are required in the shipped game.

## Verification

From repository root:

```sh
node library/catalog/kart/create-assets.mjs
node library/catalog/kart/build.mjs
node library/catalog/kart/verify.mjs
node --test library/catalog/kart/palette-adapter.test.mjs
pnpm --filter @htn/probe exec node --import tsx ../../library/catalog/kart/probe.mjs
pnpm --filter @htn/probe exec node ../../library/catalog/kart/palette-native.mjs --scenery-revision
```

- `behavior-results.json`: eleven deterministic behavior/asset checks, including two complete ordered laps, both humans finishing/2P winner, drift release, human-only checkpoint rewards, brake/grass, timer loss, authoritative player count and replay. A steering controller drives the whole track in these tests; the test does not teleport the player or edit private state.
- `verification/palette-adapter/behavior.tap`: six adapter regression checks for invalid art, palette/anchor preservation, variable frame sizes/timing, cached exact nearest-neighbor pixels, clipping, roadside rendering, and complete custom-art 1P/2P races matching original telemetry, scoring and reset.
- `verification/palette-adapter/before.json` and `after.json`: ten native default-art frames (five states in each player mode) match exactly before/after the adapter change. Three additional native tests compare 94 opaque fixture pixels against exact expected RGB (including 24 opaque-black pixels) and verify a tall P2 sprite never enters P1's viewport. `palette-native.mjs --baseline` deliberately replaces the legacy baseline; normal verification must omit that flag.
- `probe-results.json`: actual repository probe, both 1P and 2P. All checks pass including every declared direction, A, B and player-two controls; no repair notes. About 0.7–0.9 seconds per complete probe locally.
- `render-results.json` + `screenshots/`: real runtime snapshots at grid, straight, left bend, right bend and later laps for 1P/2P. These are output from the shipped module, not design mockups. Render batches measured approximately 0.2–0.3 ms per synchronous game frame on this Mac; that is a local rendering observation, not an end-to-end generation benchmark.

## Boundaries

This is an approachable, short pseudo-3D circuit racer. It does not implement item weapons, jumps, arbitrary free-roam physics, elevation occlusion, commercial driving rules or licensed tracks. Imported source art is a visual skin; it does not reproduce the source game's mechanics, animation timing or collision geometry automatically. Native source distance/LOD pose selection is not implemented. The default animation set is complete for the implemented kart states; a named character needs a separately supplied compatible set, not a claim that recoloring makes the driver that character. The progress ring is a normalized lap indicator, not a geometrically exact overhead course map.

Catalog admission stays separate from implementation: manifest quality remains draft until the parent catalog's independent evidence review promotes the exact content hash.

## Coastal scenery and advance-bend review (2026-09-19)

The current module uses an original exact-RGB coastal environment palette, cooler asphalt bands, contrasting road edges/shoulders, separate distant ridge colors, section-specific harbor buildings and cliff rocks, beacons and perspective marker posts. Vehicle art, collisions, acceleration, drift and lap rules are unchanged. A compact cue samples actual upcoming curvature out to 1.6 seconds at driving speed, helping players prepare before a bend enters the short split-screen horizon. It does not auto-steer.

Thirteen behavior checks now include complete default three-lap ordered gates and lap HUD, plus an advance-cue/state-purity check. `verification/default-play/runtime-proof.json` reuses the offline native racing proof helper with this exact original factory, `{}` config and no imported asset config: actual controller inputs complete three default laps in 1P and 2P, verify ordered gate scoring, direct controls, timeout and reset. Source-art Pole Position proof is separate in the private pack.

`verification/palette-adapter/before.json` and `after.json` remain the historical adapter-only comparison. The intentional environment revision is separately labeled in `scenery-after.json`; run `palette-native.mjs --scenery-revision` for current exact-RGB, opaque-black and viewport checks. Do not replace the historical baseline or claim the new background is pixel-identical. Before/after scene captures are in `verification/polish-comparison-native.png` and `polish-comparison-3x.png`. Current render timings are recorded in `render-results.json`; older timing observations above do not describe this revised scene.

This remains a lightweight pseudo-3D arcade presentation, not a realistic vehicle simulator, geometric track map, commercial-art replica or human handling study.
