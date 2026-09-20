# Spider-Man sheet: local import proof

The initial quantized import produced a working local fighter prototype using **57 source frames** and the `ARCADE.fighter` custom-asset contract. It ran against the existing Flash artwork at 256×224. Both player modes passed the actual runtime probe. A source-derived punch and kick applied real damage through the controller; their captured scores are 70 and 260. Those original assets, cartridge, results and screenshots are preserved unchanged.

The subsequent per-sprite palette implementation now has a separate **55-frame exact-color import**. Every one of its 49,688 opaque pixels matches the equally scaled source RGB in the actual runtime. Two web-effect frames exceed 16 opaque colors and are explicitly unsupported. See the exact-color proof below; this subset is not claimed to be a complete playable imported fighter.

A new, separate **57-frame exact-color composite import** now retains both web-effect frames using one extra palette plane each. Independent local RGBA decoding matches all 51,585 opaque pixels and 101,602 transparent locations. This is source/encoding proof only: the fighter controller does not yet draw the extra layers, and hurt/KO are still proxies. The old 55-frame exact subset and 57-frame quantized artifacts remain unchanged.

This is a complete **adapter shape**, not a recovered Marvel vs. Capcom character implementation. The source is an image sheet without machine-readable move labels, timing, pivots or collision boxes. Most pose categories are visually clear; exact jump order, guard semantics, and particularly hurt/KO identification remain uncertain. Those uncertainties are retained in the mapping and asset metadata.

## Source and preservation

- [The Spriters Resource asset 275483](https://www.spriters-resource.com/arcade/marvelvscapcom/asset/275483/), Marvel vs. Capcom Spider-Man, uploader `kilburto`.
- Source PNG: 1917×5966; SHA-256 `140acafe486efc32761c98cf60134eed376f2f08a1896904abb2e1f3d4ba8c3f`.
- Cached parent provenance: `data/reference-cache/spriters-resource/marvel-spider-man-275483.json`.
- The original cached PNG is unchanged. Raw indexed frame crops, transparent RGBA crops and the original indexed palette are retained separately from the lossy runtime conversion.
- All original and derived commercial pixel data, including the prototype cartridge, stays under the ignored `data/reference-cache/spriters-resource/spider-man/` directory. No pixel data was put in `library/assets`, no CC0 label was added, and nothing was published.

The original processing code is `scripts/import-spider-reference.py`. It performs no network request. `--scan` produces numbered candidate cells from connected magenta-background regions, filtering nested holes. A foreground limb sometimes separates a cell's background into overlapping components; the reviewed import unions those bounds before cropping. `--build` reconstructs the reviewed import and visual artifacts.

## The palette issue is real

The PNG is indexed, with **36 used indices but 35 distinct RGB triples**. Two indices share black RGB but different meaning:

- Index 0 is transparent black, as declared by the PNG transparency chunk.
- Index 20 is opaque black inside the art.
- Index 1 is opaque magenta, used as the sheet's background/chroma key.

Flattening RGB first would lose that distinction. The importer preserves the source indexed crops, then makes indices 0 and 1 transparent for extracted artwork while retaining opaque black outlines.

The orange/yellow appearance is present in the source palette. Its suit ramp includes `#ff8800`, `#ff6600`, `#ff3300`, `#dd0000`, `#bb0000` and `#880000`. There was no alternative palette table in the inspected sheet/footer, and no evidence establishes whether these are a working palette, a costume variant or the intended default colors. **No purported canonical red recolor was applied.**

An idle frame and a straight-punch frame each use **15 opaque colors**. The web-shooting frame sampled uses 20 because it includes emission artwork. The ordinary character art therefore fits a 16-entry sprite palette, with transparency represented separately. The original runtime's particular fixed PICO-8 RGB values were the color bottleneck: several distinct source blues collapsed into the same runtime blue, and the red/orange ramp also lost shading.

`source-palette.json` preserves every used source index/RGB/count/alpha value. `runtime-palette-map.json` records the explicit nearest-RGB conversion into the actual unchanged runtime palette. The comparison image shows this loss; it does not present the quantized version as faithful source colors.

## Reviewed clip assignments

IDs are the deterministic scan's candidate frame IDs; exact merged source rectangles and trim coordinates are in `mapping.json`. “High” means the visible pose category is clear, not that original game metadata was recovered.

| Adapter clip | Source IDs | Confidence and qualification |
| --- | --- | --- |
| idle | 0–8 | High: recognizable low fighting stance loop. |
| walk | 9–14 | Medium: stepping cycle; original forward/back semantics unverified. |
| jump | 16, 23, 31, 39 | Medium: actual airborne poses; prototype order is authored. |
| crouch | 15 | High: clear low crouching pose. |
| light | 233, 234, 235, 236 | High: straight punch and retraction; strength/timing chosen for our controller. |
| heavy | 247, 248, 249, 247 | High: standing side kick; custom heavy timing. |
| airLight | 295, 299, 296 | Medium: airborne reach/punch poses; original move class unverified. |
| airHeavy | 315, 316, 317 | High: airborne extended-leg kick poses. |
| sweep | 274, 276, 275 | Medium: low extended kick; original move name/strength unverified. |
| guard | 71, 72 | Medium: protective raised arms near shield effects; original guard state unverified. |
| crouchGuard | 82, 83 | Medium: low protective arms; original guard state unverified. |
| hurt | 110, 45 | **Low: explicit recoil/hunched pose proxies**, not recovered original hurt animation. |
| ko | 168, 171 | **Low: falling/lying pose proxies**, not an established original KO sequence. |
| victory | 139, 140, 142, 143 | High: salute/thumbs-up poses; original selection/order unverified. |
| special | 343, 345, 346, 349, 344 | High: visible web-shooting poses. See projectile limitation below. |
| dash | 153–156 | Medium: low travel poses mapped to our existing generic dash. |

Frames are mirrored explicitly because the source attacks face left while the custom-asset contract's unflipped art faces right. The prototype uses nearest-neighbor **9/16 scaling** to fit the current fighter world and existing Flash artwork. This discards source pixels; it is another quality tradeoff, not a property of 8-bit graphics. The original-resolution crops remain available.

Feet/pelvis anchors and hurt/hit boxes are **newly authored approximations** in the tested controller's coordinate system. Attack timing uses that controller's known startup/active/recovery windows. None are represented as Capcom frame data. The runtime's existing movement, guard, hitstop, scoring and round rules remain unchanged.

## Native controller proof and remaining gaps

`custom-assets.json` supplies all 16 required clips under character ID `spider-man-reference`. The prototype selects that ID and `flash`; it does not relabel Batman. Actual native captures show idle, walk, punch, kick, airborne kick and crouch. `runtime-proof.json` contains both probe results, capture states and an empty error list.

The existing fighter draws a generic angular projectile directly in code. Supplying web-shooting poses does not turn that projectile into a web. To avoid pretending otherwise, this proof configures Spider-Man's supported **dash** special. A faithful web special still needs an explicit projectile-art/behavior extension, and the low-confidence hurt/KO mappings need reference verification before this can be treated as a finished imported character.

The initial proof motivated source-specific sprite palettes. That renderer change has now been implemented separately and is tested below. Avoiding source downscaling still requires a deliberate arena and collision review. Per-frame palettes preserve the ordinary 15-color character cells; larger web effects remain outside the single-palette contract.

## Exact-color import and native proof

`python3 scripts/import-spider-reference.py --exact` reads the original indexed PNG again, using the reviewed quantized import only for crop rectangles, trim, dimensions, anchors and clip metadata. It performs the same nearest-neighbor 9/16 scaling and facing mirror. Every used opaque source RGB becomes a compact local hex slot, with `frame.palette` retaining the exact `#RRGGBB`; `.` remains transparent. Slot mappings record the original source indices, so opaque index-20 black cannot be confused with transparent index 0 or magenta backing index 1.

This mode writes **new** `custom-assets-exact.json`, `exact-palette-import.json`, `frames/scaled-source-exact/` and `frames/runtime-exact/` outputs. It does not run or overwrite the quantized `--build` path. The import asserts decoded RGBA equality for every supported frame, unchanged geometry, and the source/legacy asset hashes. All 15 retained clips preserve their previous timing, anchors and boxes exactly; this does not make the authored metadata original Capcom data.

Of the existing 57 frames, **55 fit**. `src345` has 19 opaque RGB colors after scaling and `src346` has 20. They are reported with their complete palettes/source-slot maps and omitted. Their `special` clip is also omitted; idle, walk, jump, crouch, light, heavy, airLight, airHeavy, sweep, guard, crouchGuard, hurt, KO, victory and dash are retained. No reduction, silent fallback, replacement pose or claimed web implementation is added. The fighter validator requires all 16 clips even when dash is chosen, so this 15-clip exact asset is intentionally an incomplete subset, not a drop-in full fighter.

The ignored `exact-runtime-proof.mjs` renders **both versions of all 55 frames** through the current native `api.spr` renderer at identical per-frame positions. Expected RGBA is read independently from the freshly scaled source PNG. The check compares every opaque RGB/alpha, every transparent location against the unchanged background, and every opaque-black location. It does not call a model, rewrite pixels, move entities, or use a mocked renderer.

| Native proof | Old fixed palette | Exact per-frame palette |
| --- | ---: | ---: |
| Compared frames | 55 | 55 |
| Opaque pixels compared | 49,688 | 49,688 |
| Opaque RGB mismatches with equally scaled source | 48,836 | **0** |
| Transparent background mismatches, 97,955 locations | 0 | **0** |
| Opaque-black mismatches, 852 locations | 0 | **0** |
| Idle frame 0: preserved colors | 9 of 15 | **15 of 15** |
| Idle frame 0: mismatches / opaque pixels | 891 / 903 | **0 / 903** |
| Punch frame 234: preserved colors | 9 of 15 | **15 of 15** |
| Punch frame 234: mismatches / opaque pixels | 963 / 981 | **0 / 981** |

Idle uses the same 62×54 sprite, anchor `(24,53)`, native draw origin `(104,137)` in both cases. Punch uses the same 86×43 sprite, anchor `(27,43)`, origin `(101,147)`. All native renders have an empty error list. The proof hash-checks that `custom-assets.json`, `prototype-game.js`, old `runtime-proof.json`, `runtime-idle.png`, `runtime-punch.png` and the original source PNG remain unchanged.

- Exact asset SHA-256: `96df2b3be28df8ce7c69989dfbe445ed71f8c9e0b591cae6e98cc54e78039054`.
- Runtime used for proof SHA-256: `1683361f3b43eb323c9d202135f9fd7ae583c19d7bb3bce5792c0d9d2396072b`.
- `exact-runtime-proof.json` contains all 110 native comparisons, per-frame PNG hashes and original-art/source metadata hashes.
- `runtime-exact-vs-quantized.png` shows actual native framebuffer screenshots side by side.
- `runtime-exact-vs-quantized-zoom.png` shows labeled 4× nearest-neighbor crops of those same screenshots. No smoothing, recoloring, or AI-redrawn art.

This proves preservation of the source's existing colors, including its orange/red costume ramp. It does **not** restore pixels removed by downscaling, identify the intended costume palette, recover original animation timing, validate proxy hurt/KO poses, or implement web mechanics. Those remain separate work. All derived commercial pixels remain in the ignored private cache; the asset is not admitted to the redistribution/generation library.

## Local outputs

All paths below are relative to `data/reference-cache/spriters-resource/spider-man/`:

- `source-clips.png`: original-palette contact sheet of the mapped source poses.
- `source-animation.gif`: actual source frames animated with explicitly authored timing.
- `palette-comparison.png`: source-palette poses versus the native fixed-palette conversion; runtime examples are enlarged for comparison.
- `runtime-idle.png`, `runtime-walk.png`, `runtime-punch.png`, `runtime-kick.png`, `runtime-air-kick.png`, `runtime-crouch.png`: screenshots from the actual unchanged runtime.
- `frames/source-indexed/`: indexed crops preserving original palette/transparency metadata.
- `frames/source-rgba/`: source-resolution RGBA crops with only sheet backgrounds removed.
- `frames/runtime/`: mirrored, downscaled, quantized PNG previews matching `custom-assets.json` pixels.
- `mapping.json`, `source-palette.json`, `runtime-palette-map.json`, `runtime-proof.json`: provenance, mapping and actual verification evidence.

Rebuild locally:

```sh
python3 scripts/import-spider-reference.py --scan
python3 scripts/import-spider-reference.py --build
pnpm --filter @htn/probe exec node --import tsx ../../data/reference-cache/spriters-resource/spider-man/runtime-proof.mjs

# New exact-color subset and independent native pixel comparison; old outputs retained.
python3 scripts/import-spider-reference.py --exact
node data/reference-cache/spriters-resource/spider-man/exact-runtime-proof.mjs
```

The runtime proof script and generated cartridge are private cache artifacts. The source PNG and its parent provenance are prerequisites. This import is not automatically admitted to the licensed asset library or the generation catalogue.


## Exact-color composite import (57 reviewed frames)

`python3 scripts/import-spider-reference.py --layered` re-reads the original indexed PNG after checking the reviewed source SHA-256. It uses the existing `custom-assets.json` crop/trim, nearest 9/16 scale, mirror, dimensions, anchors, clip ordering, timing and boxes. No new pose assignments, guessed moves, recoloring or palette quantization are introduced.

The new ignored `custom-assets-layered.json` retains `pixels` + `palette` as the base plane and adds `layers: [{pixels, palette}]` only for the two over-limit frames. Every plane has the same width and height, at most 16 exact RGB colors, and `.` transparency; at most eight extra planes are allowed. Colors are partitioned into disjoint planes, so each source opaque pixel appears exactly once. Source index 20 stays opaque black; index 0 and magenta backing index 1 stay transparent. The old 55 exact frame objects are retained verbatim, including their metadata.

| Import proof | Result |
| --- | ---: |
| Reviewed frames / unchanged reviewed clips | 57 / 16 |
| Opaque pixels / transparent locations compared | 51,585 / 101,602 |
| Opaque black pixels preserved | 882 |
| RGBA mismatch pixels | **0** |
| `src345`: exact colors / palette sizes | 19 / 16 + 3 |
| `src346`: exact colors / palette sizes | 20 / 16 + 4 |
| Previously existing cache and source files hash-preserved | 433 |

The importer independently decodes the serialized hex slots and RGB palettes to RGBA, then compares every location against a separately cropped/scaled/mirrored RGBA read of the indexed source. Transparent RGB is normalized to zero in both arrays, since hidden RGB does not render. It additionally checks each opaque pixel has exactly one plane owner, every plane has the same dimensions, all anchors/dimensions and animation metadata match the reviewed manifest, and all previous cache files plus the source retain their initial hashes. The proof does not rely on a fighter screenshot.

New private outputs (relative to `data/reference-cache/spriters-resource/spider-man/`):

- `custom-assets-layered.json`: all 57 exact-color source encodings; SHA-256 `6e07233ca90caf159471f24cac3e1e2f49684e5b8b30b137a5f5750d6aa2c44e`.
- `layered-palette-import.json`: per-frame counts, palette-plane sizes, zero-mismatch assertions, PNG hashes, and the full prior-file preservation manifest.
- `frames/runtime-layered/`: decoded RGBA previews for all 57 frames; the directory name describes their coordinate scale, not a native rendering claim.
- `layered-special-contact.png`: all five reviewed special frames in order, enlarged 3× with nearest-neighbor sampling, labeled with authored durations and exact color counts. This is a decoded source-color contact sheet, not a fighter screenshot.
- `layered-special-animation.gif`: a convenience preview of the same reviewed sequence using the existing authored timings.

The contact sheet shows `src343`, `src345`, `src346`, `src349`, `src344`; it was visually inspected after generation. Its absolute local path is `/Users/shayaanazeem/Downloads/htncodex/htn-2026/data/reference-cache/spriters-resource/spider-man/layered-special-contact.png`.

This closes the encoding color limit for the existing reviewed 57 frames only. It does **not** admit the asset to the library, recover source move metadata, validate proxy hurt/KO poses, implement web mechanics, or demonstrate that the fighter draws composite layers. Controller integration and its native rendering proof require a separate pass. All commercial source and derived pixel data remain in the ignored cache; nothing is published.

## Native fighter composite integration

The fighter 1.1 controller now draws the base plane and all registered palette layers, honors clip-step anchors, and consumes every hit/hurt box rather than just the first. `scripts/prove-fighter-layered.mjs` checks all 57 frozen reviewed frames through the actual fighter and native runtime, in both facings: **114 comparisons, zero RGB/transparency mismatches, zero clipped fixture pixels**. Draw-call observation captures the background before each fighter and framebuffer after its final plane; it does not replace rendering. Independent scaled-source PNGs provide expected pixels. Frozen legacy files remain unchanged.

The native proof separately exercises the unchanged clip set through real 1P/2P inputs, captures special and recovery poses, and reaches 1P loss and P1 victory in 2P. This proves the emitted web-colored hand effect is present; the traveling projectile is still the generic controller projectile, not a finished web mechanic. Proofs and captures live in `fighter-layered-proof/` under the private cache.

`--reviewed` selects the separate authored reaction revision from `import-spider-reactions.py`: 68 frames and **136 exact native comparisons**. The new recoil and fall/grounded poses are captured during an actual CPU fight, with no fighter-state edits. Both hurt stages, all five fall stages and terminal grounded KO occur. See `spider-man-hurt-ko-review.md`. The previous import limitations describe their historical boundary; neither old manifests nor proofs were rewritten to imply later validation happened earlier. Source spatial scaling remains 9/16; original game frame data and some clip classifications are not recovered.
