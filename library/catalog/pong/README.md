# Pong foundation

Pong: finite-reaction CPU, impact placement/spin, power-charge tradeoff, separate 2P input, score-to-seven matches and reset.

Original code and pixel art, authored for this project. No commercial source or ripped assets are bundled. `manifest.json` deliberately remains draft until the parent catalogue's independent admission step accepts content-addressed evidence.

`module.base.js` and `build.mjs` are editable sources. `build.mjs` deterministically writes the self-contained factory `module.js` and reusable `assets.json`. Read `api.md` for exact configuration, controls, extension hooks and animation semantics. The demo requires catalogue bundling to supply `ARCADE.pong`; it is not a standalone browser script.

Run from the repository root:

```sh
node library/catalog/pong/build.mjs
node library/catalog/pong/verify.mjs
pnpm --filter @htn/probe exec node --import tsx ../../library/catalog/pong/probe.mjs
node library/catalog/pong/screenshots.mjs
```

Behavioral tests run the actual factory and inspect detached state using ordinary input policies; they never rewrite internal positions, lives, scores or brick health. They verify metadata/palette frames, explicit serving, the B precision modifier, independent player input, reset and complete terminal paths. A deterministic policy wins 7–0 against the CPU in 72.17 seconds; a separate policy wins 0–7 as P2. CPU victory produces gameOver. All full matches emit one terminal event.

`probe-results.json` records actual @htn/probe 1P/2P passes, including soft observations rather than hiding them. `render-results.json` records complete matches in the browser runtime and real terminal `win` state. `visual-review.json` lists the native screenshots actually opened for inspection. Browser verification needs permission to launch local Chromium on hosts with sandbox restrictions.

Limitations: Paddle-game primitives are intentionally geometric; these packs do not solve humanoid fighter art or unrelated genres. Visual inspection used the native 256×224 framebuffer, not a physical CRT or cabinet controls. Generic B-only probes report no visual change because B is a movement modifier; behavioral tests verify its slower motion. P2 A has no serve effect until P2 owns the serve, and its power-return role is verified in a complete P2-winning match.
