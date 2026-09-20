# Vector Drift

Original reusable inertial shooter, `ARCADE.asteroids(config)`. Ships turn and thrust through a toroidal field with retained momentum and a useful brake. Large rocks split into medium then small rocks; projectiles and collision use matching wrapping. Announced saucers, aimed shots, bounded spawns, hyperspace cooldown, safe respawn, lives and three escalating sectors provide a complete arcade loop. 2P is independent cooperative flight without friendly fire.

The 79-frame original asset collection includes sixteen ship headings with paired thrust frames, three rotating rock sizes, saucer and explosion. Every frame stores pixel rows, timing, anchors and collision metadata, with original provenance. The rocks and ships were authored as original polygon shapes and rasterized directly into palette pixels; no commercial assets were imported. The art/data and exact override contract are available to the composing model through `api.md` and `assets.json`.

`module.js` is generated from readable `module.base.js` plus compact art JSON and is about 96 KB. Edit authoring files then rebuild; don't format the generated expression directly. `build.mjs` normalizes the source formatter's leading statement separator.

## Verification

```sh
node library/catalog/asteroids/create-assets.mjs
node library/catalog/asteroids/build.mjs
node library/catalog/asteroids/verify.mjs
pnpm --filter @htn/probe exec node --import tsx ../../library/catalog/asteroids/probe.mjs
node library/catalog/asteroids/screenshots.mjs
```

Eight substantive behavior checks cover frame integrity, independent rotation/thrust, retained inertia and braking, wrapping both axes and exact seam distance, projectile lifetime/caps, warp cooldown, actual three-size rock splitting and scoring, complete three-sector 1P and 2P wins with default lives, warned saucers, genuine collision loss, reset and replay. The pilot uses the real rotation/fire/brake/hyperspace controls, including evasion of rock and saucer-shot threats; it does not mutate the game's private state.

Actual repository probe passes 1P/2P. DOWN receives a soft observation at the stationary start, as expected for a brake; the focused inertia/braking test proves its moving behavior. The controller-specific screenshot helper initially missed its angle utility; it was fixed and all final screenshot/error artifacts were regenerated. This was an audit-script error, not a game-module failure.

`render-results.json`, `probe-results.json`, `behavior-results.json` and ten actual runtime screenshots hold the evidence. Catalog admission is determined by content-bound quality.json. This foundation does not implement gravity wells, solid terrain, scrolling missions or inventory, and does not claim a commercial source-code reproduction.
