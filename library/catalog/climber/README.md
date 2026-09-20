# Crane Rescue

Original lightweight barrel-and-ladder foundation for `ARCADE.climber(config)`; see `api.md` for the exact composer's contract. All code and pixel artwork are locally authored. `module.js` is generated from `module.base.js` and `assets.json`; `create-assets.mjs` is the reproducible original pixel-art authoring source.

This deliberately preserves the recognizable structure: sloped girder floors, working versus broken ladders, a visible thrower and hazard supply, rolling barrels that can drop through ladders, an upper rescue target, jump-over scoring, time bonus, life loss, stage variants and increasing pressure. Cooperative 2P uses the same board with independent controls/lives; either rescuer completes the shared goal.

The 33-frame original asset collection includes worker idle/walk/climb/rise/fall/hurt/death, gorilla idle/throw, rolling/falling barrels, fire/explosion and waiting/rescued cat. Every set carries clip timing, anchors, boxes and provenance. Palette/pose replacements are supported through the documented complete-set contract.

Research applied: `docs/research/arcade-context/cards/platforming.md` (measured jump trajectory), `collision.md` (bounded movement and downward floor crossing), `layouts.md` (a real required route), and `scoring.md` (unique event awards). No commercial source code or sprites were copied.

## Checks

```sh
node library/catalog/climber/create-assets.mjs
node library/catalog/climber/build.mjs
node library/catalog/climber/verify.mjs
pnpm --filter @htn/probe exec node --import tsx ../../library/catalog/climber/probe.mjs
node library/catalog/climber/screenshots.mjs
```

- `behavior-results.json`: eleven deterministic checks for complete animation data, immediate independent movement, ladder eligibility/exit, measured jump apex and short hop, barrel paths/drop choices, unique jump scoring, hit/life/terminal flow, actual traversal of all three layouts with the default three lives, solo/co-op rescue, custom objective/art contracts, reset and replay. The traversal controller uses the same physical inputs as a player, waits at unsafe ladder exits and follows barrels rather than forcing impossible overtakes; it never edits private state.
- `probe-results.json`: actual repository probe passes in 1P and 2P. UP/DOWN have expected soft notes at the starting position because there is no ladder there. The focused ladder test proves their real eligible behavior; climbing eligibility is not weakened to satisfy a generic initial-position hash comparison.
- `render-results.json` and `screenshots/`: actual bundled-module runtime snapshots in 1P/2P and later stages. These are rendered game frames, not mockups.

The module retains draft status until independent catalog admission. Automated traversal demonstrates functional routes and endings; it is not a claim that visual quality, difficulty balance or all possible themes have been human playtested. Unsupported mechanics are explicit in `api.md`.
