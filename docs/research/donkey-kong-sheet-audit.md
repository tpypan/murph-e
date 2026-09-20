# Donkey Kong sheet import audit

The local proof imports **42 actual source frames at native size**, preserves their exact RGB colors, and exercises the climber controller with them. This is an art/controller integration proof, not the original Donkey Kong program or a reconstruction of all its stages.

Commercial pixels and derived art/game files remain under the ignored `data/reference-cache/spriters-resource/donkey-kong/` directory. They are not labeled original/CC0 or admitted to a public redistributable pack. The tracked `scripts/import-dk-reference.py` is original processing code; it neither downloads nor publishes art.

## Sources and color authority

| Source | Verified properties |
|---|---|
| [Characters and Objects — 252263](https://www.spriters-resource.com/arcade/dk/asset/252263/) | Uploader `125scratch`; indexed PNG, 252×526; SHA-256 `3b7ddf955f382aa00e707566f281f4ac2b86a39a98f2f5a58a385e3442006ace`. |
| [Tiles — 106602](https://www.spriters-resource.com/arcade/dk/asset/106602/) | Uploader `Superjustinbros`; indexed PNG, 368×256; SHA-256 `8389614a265d2e14af217e020a1fea60249143d6cb0fc8582a107c9ac6af6d9f`. |
| GIF 3242 | Mario walking: four frames at 50 ms; silhouettes and RGB match reviewed PNG cells. |
| GIF 5795 | Mario death: four frames at 90 ms; silhouettes match, RGB differs. |
| GIF 5797 | DK rolling a barrel: three frames at 260 ms; silhouettes match, some RGB differs. |
| GIF 5798 | Drum flame: four frames at 100 ms; silhouettes match, most RGB differs. |
| GIF 6860 | Hammer walking: 48 frames at 20 ms; embedded comment says edited with ezgif.com/speed. Kept unused; no hammer gameplay claimed. |

Source URLs, archive pages, uploaders, hashes and rights notes accompany every file. `gif-audit.json` records **15 exact silhouette matches** against sheet rectangles. GIF timing is archive-preview evidence, not recovered ROM timing.

The sheet includes alternate palette keys labeled MAME 0.115 and earlier, MAME 0.116 and later, and FinalBurn Neo. The proof preserves the PNG's actual RGB values; it does not silently switch to another listed palette or GIF colors. Character-sheet indices 0/1 are teal atlas backing and explicitly removed for transparent crops. Index 13 is opaque artwork black and remains. Unmodified indexed source crops retain the full original palette separately. Tile blocks preserve opaque black; no transparency is inferred there.

## Mapping and timing

Every rectangle and confidence note is in `sheet-map.json`. The importer verifies saved crop bytes/palettes and reconstructed opaque RGB values. It passes **18,738 pixel/geometry/clip assertions**, plus the 15 GIF silhouette checks.

| Set | Frames / native canvas | Mapping |
|---|---|---|
| `worker` | 11 / 16×16 | Idle plus verified walk order 0,1,0,2 at GIF 50 ms. Rear-facing climb poses at authored 120 ms. Jump is an interpreted airborne/running pose. Hurt explicitly reuses the first death pose as a proxy. Death uses four verified poses at GIF 90 ms. |
| `target` | 4 / 16×32 | Pauline wait/standing poses at authored 250 ms. The second pair serves `rescued`; a distinct original rescue animation is not established. |
| `gorilla` | 5 / 48×32 | Two idle poses at authored 350 ms. Three verified throw poses retimed to **500/3 ms each** for the controller's 0.5-second release; original GIF 260 ms remains metadata. |
| `barrel` | 6 / 16×16 | Four rolls at authored 80 ms; two side-view poses assigned to falling at authored 90 ms. Falling is an interpreted source-state label. |
| `fire` | 8 / 16×16 | Four verified drum-flame poses at GIF 100 ms. Four source blue impact frames form an authored 80 ms consumption burst; their original event is unverified. The controller reuses flames for moving hazards. |
| `props` | 4 / 16×16 | Ladder, oil drum, two hammers; reference only, excluded from runnable config. |
| `tiles` | 4 / 64×40 | Four source tile-palette blocks; reference only, not reconstructed level/collision geometry. |

Each imported frame uses **1–4 opaque colors**: Mario three, DK and Pauline four. The old fixed-PICO conversion changed costume hues despite this small color count. The comparison labels that rendition lossy; the current runtime proof uses exact palettes.

No spatial scaling was applied. Mario fits the current 20×20 visual allowance and unchanged 8×16 physics. Authored anchors are player (8,16), Pauline (8,32), DK (24,32), barrel (8,8), flame (8,16). These are not recovered original pivots, hitboxes or gameplay timings.

## Adapter contract and limits

`climber-config.json` contains:

```js
{
  avatars: [{sprites: worker}, {sprites: worker}],
  targetSprites: target,
  art: {gorilla, barrel, fire},
  cage: false,
  rescueText: 'PAULINE RESCUED!'
}
```

Frames supply `pixels`, exact `palette`, anchor and animation metadata. The updated adapter forwards paletted frames through `api.spr` without default worker recolors. The root's foundation changes disable the cage when requested and replace the formerly hardcoded cat rescue message. This import task did not edit runtime/foundation files.

The x39 DK foot puts its native canvas at x15–62, close to the x65 barrel spawn. Its approximately y63 foot keeps the 32-pixel body below the HUD. Native screenshots verify placement and release pose; original release sockets were not supplied.

The sheet says barrel animation reverses for left movement. Mirroring also reverses apparent rotational sense. Sequence equivalence against original play is unmeasured; no extra temporal reversal was applied because that could reverse it twice. This is an outstanding fidelity check, not a demonstrated bug.

Girders, ladders, scenery and drum remain procedural. Tiles are preserved for deliberate later integration. The layout, physics, barrel choices, scoring, timer/lives, three-stage structure and cooperative 2P rules remain the foundation's implementation. This does not add original stage topology, hammer combat, lifts, conveyors or rivet removal. Both players use Mario art with independent inputs and P1/P2 labels.

## Actual runtime verification

`runtime-proof.mjs` first verifies exact rendering of a custom `#123456` pixel. A deterministic planner reads public `inspect()` state and emits ordinary button events, replayed through Chromium's `__probe.inject`. It never patches positions, lives, collision state or controller functions.

Base factory plus reviewed config: both 1P and 2P pass the probe, complete **three rescues**, reach `win`, and reset to a playable zero-score run with no errors. 1P takes 2,636 gameplay ticks and scores 17,800; 2P takes 2,629 ticks and scores 17,800 each. Routes include jump, ladder climbing, barrel throws and damage/respawn. They do not earn a barrel jump-over bonus. This proves integration/completion, not original-game fidelity or difficulty quality.

Generic probe observations that UP/DOWN do nothing at spawn remain recorded. Those controls are ladder-gated. A separate same-seed stationary-versus-DOWN comparison reaches an eligible ladder and confirms a different native framebuffer. In 2P it selects the player actually climbing.

Native screenshots were inspected for identity, colors, placement, poses, release, rescue label and victory. Exact runtime/factory/config/game hashes and input timelines are saved.

The private wrapper was then verified separately from `data/local-catalog/dk-climber-reference/module.js` using **factory defaults (`{}`)**. Its 1P/2P probes, three-rescue routes, eligible DOWN comparisons and zero-score resets all pass without runtime errors. All **20 comparable screenshots are byte-identical** to the base-factory-plus-config proof. Wrapper factory SHA-256 is `f75a77247246f7aabaeacdbc58873d705497913435da290aa264d27c406d90fb`; the evidence is in its `verification/runtime-proof.json`. The wrapper's start, rescue and final victory screenshots were also directly inspected. This task did not promote or approve the pack.

Useful files under the private cache:

- `source-vs-pico-contact.png`: all 42 source frames beside the labeled old conversion.
- `1p-start.png`, `1p-throw.png`, `1p-climb.png`, `1p-rescue.png`: real runtime captures.
- `2p-jump.png`, `2p-terminal.png`: cooperative players and victory.
- `1p-ladder-still.png` / `1p-ladder-down.png` and 2P equivalents: eligible descent.
- `frames/source-crops/`, `frames/source-rgba/`: untouched indexed crops and transparent native-color frames.
- `source-assets.json`, `climber-config.json`, `gif-audit.json`, `frame-audit.json`, `integrity.json`: data/provenance.
- `prototype-game.js`, `runtime-proof.mjs`, `runtime-proof.json`, `input-plans.json`: reproducible proof.

From the repository root:

```sh
python3 scripts/import-dk-reference.py
pnpm --filter @htn/probe exec node --import tsx ../../data/reference-cache/spriters-resource/donkey-kong/runtime-proof.mjs
```

The proof accepts `--factory /absolute/module.js --out /absolute/folder --default-config` to test a private wrapper with **{}**, rather than masking broken defaults by supplying the imported config again. Source files/mapping and the updated built runtime must already exist. Scripts do not change pack approval status.

## Local generation availability

The primary review admitted the private `dk-climber-reference` adaptation after inspecting the exact wrapper screenshots, verifying both complete input routes and resets, and binding behavior/visual/runtime evidence to content hash `b30a039e6d600ef3386a1d4ddcde00a17f7843ee9ebddc6d080db3192a423a22`. The reusable adapter is built by `scripts/build-dk-local-catalog.mjs`; rebuilding changes content and requires fresh evidence before reuse. Files and source pixels remain under ignored `data/local-catalog/`.

Default catalogue discovery now includes reviewed local packs. This one requires the phrase “Donkey Kong”; its priority only resolves an equally relevant match. Generic barrel-climber requests still select the original foundation. SQLite holds 13 reviewed packs across 12 families and 52 sprite sets, including the seven imported reference sets. Props/tiles remain indexed source material, not implemented hammer or tile-layout mechanics. The external source registry itself still cannot grant runtime admission.

A fresh Astra medium request then selected this admitted pack and passed the actual input probe in **10.1 seconds** (134 generated tokens). Saved run: `2026-09-19-222931315-donkey-kong-with-mario-pauline-a-rzdM4g`; benchmark: `bench/results/2026-09-19-2229-dk-source-local-medium-1p.json`. The emitted customization delegates to `ARCADE.climber` and retains the reviewed default artwork. The full pixels/controller are bundled outside model output. This is one measured composition, not a latency distribution or human playtest.

The running cabinet's actual `POST /api/generate` path was also exercised in 2P with one candidate. It emitted `spec`, the source-art `foundation` preview, streamed tokens, `built`, passing `probe`, and `ready`. Total 12.1 seconds; model build 2.94 seconds / 134 tokens. Run `2026-09-19-223141609-donkey-kong-with-mario-pauline-a-ngfy8V`; `verification/cabinet-api-result.json` records the response and proves both preview and final cartridge include `dk-climber-reference`. The user's existing browser/game was not replaced. Existing live-build UI tests separately verify preview isolation, cancellation and START gating.
