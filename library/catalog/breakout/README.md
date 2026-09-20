# Breakout foundation

Breakout: swept collisions, three authored multi-hit stages, pickups, combo scoring, timed power returns and a shared-life cooperative 2P field.

Original code and pixel art, authored for this project. No commercial source or ripped assets are bundled. `manifest.json` deliberately remains draft until the parent catalogue's independent admission step accepts content-addressed evidence.

`module.base.js` and `build.mjs` are editable sources. `build.mjs` deterministically writes the self-contained factory `module.js` and reusable `assets.json`. Read `api.md` for exact configuration, controls, extension hooks and animation semantics. The demo requires catalogue bundling to supply `ARCADE.breakout`; it is not a standalone browser script.

Run from the repository root:

```sh
node library/catalog/breakout/build.mjs
node library/catalog/breakout/verify.mjs
pnpm --filter @htn/probe exec node --import tsx ../../library/catalog/breakout/probe.mjs
node library/catalog/breakout/screenshots.mjs
node library/catalog/breakout/damage-screenshots.mjs
```

Behavioral tests run the actual factory and inspect detached state using ordinary input policies; they never rewrite internal positions, lives, scores or brick health. They verify metadata/palette frames, explicit serving, the B precision modifier, independent player input, reset and complete terminal paths. Default formations contain 84 bricks and 142 durability hits. Deterministic 1P/2P policies clear all three stages in 135.02/154.12 seconds with the default three lives intact. 2P scores are 2380/2700. A separate 50ms-step run clears eight triple-hit bricks with exactly 24 hits.

`probe-results.json` records actual @htn/probe 1P/2P passes, including soft observations rather than hiding them. `render-results.json` records complete matches in the browser runtime and real terminal `win` state. `visual-review.json` lists the native screenshots actually opened for inspection. Browser verification needs permission to launch local Chromium on hosts with sandbox restrictions.

The damage regression drives a real mixed 1/2/3-hit formation, checks the actual rendered sprite after every accepted collision, and reaches the six-hit clear. It proves every fresh brick starts intact; one-hit bricks disappear without pre-existing cracks; two- and three-hit bricks gain cracks after damage. `damage-replay.json` records those ordinary paddle inputs. `damage-screenshots.mjs` replays them in the native runtime and captures every durability transition. `damage-baseline.json` and `screenshots/damage-before-fix-fresh.png` preserve the original incorrect fresh-brick rendering for comparison; do not regenerate that baseline from corrected code.

Limitations: Paddle-game primitives are intentionally geometric; these packs do not solve humanoid fighter art or unrelated genres. Visual inspection used the native 256×224 framebuffer, not a physical CRT or cabinet controls. Generic 2P B-only probing can report no visual change because B modifies movement speed; behavioral tests verify that speed difference. 2P is shared-field cooperative play, not independent simultaneous single-player games.
