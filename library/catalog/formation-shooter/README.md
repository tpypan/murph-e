# Prism Squadron

Original reusable fixed-screen shooter, `ARCADE.formationShooter(config)`. A complete default game with four marching ranks, faster movement as the wave thins, announced dive attacks, terrain shields that both sides can destroy, bonus UFO, energy-shield action, lives/safe respawn and three increasingly demanding waves. Two players cooperate on one arena with independent input, lives and score.

The 30-frame original pixel collection includes ship idle/fire/energy shield, three enemy species' marching/diving/warning states, UFO and explosion. Indexed rows, timing, anchors, collision boxes and original provenance are stored in `assets.json`. `api.md` documents exact supported configuration, complete art overrides and real scoring/event hooks. No commercial source or sprites were copied.

`module.js` is a generated standalone factory. Edit the readable `module.base.js` / `create-assets.mjs`, regenerate assets as needed, then run `build.mjs`; don't format the generated expression directly. The build normalizes the source formatter's leading statement separator and embeds compact asset JSON. Shipped factory is approximately 31 KB with all art.

## Verification

```sh
node library/catalog/formation-shooter/create-assets.mjs
node library/catalog/formation-shooter/build.mjs
node library/catalog/formation-shooter/verify.mjs
pnpm --filter @htn/probe exec node --import tsx ../../library/catalog/formation-shooter/probe.mjs
node library/catalog/formation-shooter/screenshots.mjs
```

Seven behavior checks cover frame/clip integrity, independent movement/fire, energy-shield recharge, persistent terrain damage, dive/UFO warnings, bounded threats, complete three-wave 1P and 2P wins with default lives, unique enemy scoring, a real no-input loss, clean reset, art rejection and deterministic replay. The verification pilots use actual controls and observation copies, not state mutation or an artificial win shortcut.

`probe-results.json` records the actual repository probe in 1P and 2P; both pass without observations. `render-results.json` and ten screenshots record real bundled-runtime frames through terminal wins in both modes. `screenshots.mjs` reuses the tested input controller, and each saved frame checks the actual runtime error state.

It is intentionally a formation shooter rather than a scrolling shooter, capture/dual-ship game or bullet-hell boss. Unsupported requested mechanics need explicit implementation. The manifest keeps its declarative draft value; current admission is determined by content-bound quality.json; automated wins are evidence of functioning mechanics, not a claim that every customization is balanced.
