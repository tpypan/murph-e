# Missile Defense foundation

Finite 10/14/10-shot batteries, six separate cities, independent colored cursors, interceptors aimed at fixed destinations, exact growing/shrinking blast collision radii, real chain reactions, paired/splitting arrivals, four finite escalating waves and resupply/recovery.

Original code and pixel artwork. The manifest keeps its declarative draft value; verified admission is determined by the content-hash-bound quality.json. Exact options, controls and hooks are in `api.md`. The contract is `ARCADE.missileDefense(config)` returning init/update/draw/inspect; the supplied demo must be bundled with that factory by the catalogue.

`module.base.js` and `build.mjs` are editable sources. The build writes self-contained `module.js` plus reusable `assets.json` with frame geometry, anchors, timings and provenance. No external images, third-party source or heavy game engine is needed at runtime.

Run from the repository root:

```sh
node library/catalog/missile-defense/build.mjs
node library/catalog/missile-defense/verify.mjs
pnpm --filter @htn/probe exec node --import tsx ../../library/catalog/missile-defense/probe.mjs
node library/catalog/missile-defense/screenshots.mjs
```

`policy.js` is an automated test controller using detached observable state and ordinary buttons; it never writes positions, scores, blocks, ammunition or health. It is not included in the shipped game. `verify.mjs` checks important mechanical invariants, reset and full terminal runs. Default 1P/2P policies survive four waves in 56.00/55.55 simulated seconds, intercept all 56 initial missiles, produce seven/six chain kills and preserve all six cities. Separate idle play loses all cities, exercises a split and rebuilds two cities before defeat. A held-fire test exhausts the center battery after exactly fourteen shots. A single-shot test observes the actual blast grow from radius 3 to 24 then shrink back to 3.

`probe-results.json` records actual 1P/2P @htn/probe passes with no soft observations. `render-results.json` records full games in the actual browser runtime. Native frames under `screenshots/` include play and terminal states; `visual-review.json` lists the frames actually inspected and their hashes. Browser tests need local Chromium launch permission on restricted hosts.

Limitations: Cursor aiming uses only the arcade D-pad; no mouse/touch aiming or hidden aim assistance. The four-wave seed is deliberately approachable; bot-perfect city survival does not substitute for human cabinet playtesting. Native 256×224 screenshots were inspected; physical CRT overscan, badge/controller hardware and human difficulty calibration remain separate checks.
