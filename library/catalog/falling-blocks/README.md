# Falling Blocks foundation

Seven-bag fairness, independent versus wells, ghost/next preview, fixed bounded kicks, a 0.42-second/eight-reset landing lock, soft/hard drop, line combos, bounded garbage and target-line wins. Two identical controller policies now yield identical boards and same-frame shared wins: attack delivery is symmetric and does not disturb bag RNG.

Original code and pixel artwork. The manifest keeps its declarative draft value; verified admission is determined by the content-hash-bound quality.json. Exact options, controls and hooks are in `api.md`. The contract is `ARCADE.fallingBlocks(config)` returning init/update/draw/inspect/layout; the supplied demo must be bundled with that factory by the catalogue.

`module.base.js` and `build.mjs` are editable sources. The build writes self-contained `module.js` plus reusable `assets.json` with frame geometry, anchors, timings and provenance. No external images, third-party source or heavy game engine is needed at runtime.

Run from the repository root:

```sh
node library/catalog/falling-blocks/build.mjs
node library/catalog/falling-blocks/verify.mjs
pnpm --filter @htn/probe exec node --import tsx ../../library/catalog/falling-blocks/probe.mjs
node library/catalog/falling-blocks/screenshots.mjs
```

`policy.js` is an automated test controller using detached observable state and ordinary buttons; it never writes positions, scores, blocks, ammunition or health. It is not included in the shipped game. `verify.mjs` checks important mechanical invariants, reset and full terminal runs. The observable policy clears twelve lines in 10.67 simulated seconds in 1P. Two independent copies clear thirteen lines simultaneously in 10.03 seconds with three sent and one received garbage row per board. Separate real-control tests verify wall kicks, eight lock resets, topout and P2 winning when P1 tops out.

`probe-results.json` records actual 1P/2P @htn/probe passes with no soft observations. `render-results.json` records full games in the actual browser runtime. Native frames under `screenshots/` include play and terminal states; `visual-review.json` lists the frames actually inspected and their hashes. Browser tests need local Chromium launch permission on restricted hosts.

Limitations: Original bounded kicks intentionally differ from exact SRS; no hold, counterclockwise rotation or T-spin scoring is implemented. The automated placement policy is faster than a human and proves reachability, not calibrated human difficulty. Native 256×224 screenshots were inspected; physical CRT overscan, badge/controller hardware and human difficulty calibration remain separate checks.

Version1.1 adds opt-in `clearFlash:{color:10,seconds:0.35}` and detached `layout()` rectangles. The flash changes only the clearing player's existing well outline. The 2P center gutter is reserved for NEXT/TIME and both previews; never draw a divider through it. Default pixels and gameplay are unchanged. This improves future compositions; the earlier generated benchmark cartridges remain frozen.

`node library/catalog/crossing/presentation-proof.mjs` verifies both packs using actual joystick/button events in native Chromium, including legal clear states, bounded options, reset, default-frame equality and pixel-by-pixel protection of the shared HUD. Its falling-blocks results and 1P/2P captures are in `verification/presentation/`.
