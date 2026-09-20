# Pole Position source-art import audit

Reviewed 2026-09-19. This is a local adaptation of archived car artwork onto the project's original racing controller. It is not an emulation or a claim to reproduce Pole Position's physics, qualification, gearing, track, or original animation timing.

## Source and provenance

- [Pole Position arcade archive](https://www.spriters-resource.com/arcade/poleposition/).
- [F1 car sheet 94319](https://www.spriters-resource.com/arcade/poleposition/asset/94319/), uploader Sonicfan32. Cached `data/reference-cache/spriters-resource/pole-position/94319.png` is an RGBA PNG, **957 × 160**. SHA-256: `1363ed964d192c916320fc5b10010bfc8bed908a0637b85f5e39051fb23dee42`.
- [Miscellaneous sheet 97926](https://www.spriters-resource.com/arcade/poleposition/asset/97926/), uploader Yawackhary, contributor Sonicfan32. Cached PNG is indexed, **820 × 744**. SHA-256: `0544805776c88d8a9207d8fbc042a5c16a85b46709c1947e1b70cfeacde0e5de`. Inspected its gantries, turn arrows, scenery, fonts, and branded signs; **none of its pixels are in this car import**.

The car sheet credits Namco and describes a MAME rip. The uploader's credit note does not establish rights to redistribute the original commercial artwork. Raw and derived pixels stay in ignored private data directories. The importer is original processing code and does not classify this artwork as CC0. Root-maintained source sidecars preserve the reviewed URLs, download records, hashes, and reference-only status; this importer does not edit them or the source registry.

## Mapping decisions

The first car row occupies y=0–32, and its wheel variants occupy y=33–65. **Columns are different steering angles, not successive driving animation frames.** Driving therefore alternates matching columns between these two rows. Mistaking the atlas for a uniform animation strip would make the car rock through unrelated yaw angles.

| Imported poses | Reviewed source windows | Native extracted size |
| --- | --- | --- |
| Straight, two wheel phases | x=0, y=0/33, 64 × 33 windows | 52 × 28 |
| Moderate right steer, two wheel phases | x=192, y=0/33, 64 × 33 windows | 51 × 28 |
| Strong right steer, two wheel phases | x=508, y=0/33, 64 × 33 windows | 60 × 28 |
| Wreck then five explosion poses | x=0/64/128/192/256/320, y=66, 64 × 34 windows | 61 × 29, 58 × 20, 47 × 22, 50 × 27, 55 × 30, 62 × 32 |

The importer tight-crops each reviewed window after identifying the backing color. Four left poses are explicit horizontal mirrors of the two right-steer pairs. The mapping records their derivative origin and transforms the anchor consistently. They are not additional independent source drawings.

Four lower-left palette samples have exactly the same silhouette as the straight source car. A positional comparison establishes an unambiguous source-RGB-to-variant-RGB mapping for red, white, orange, and green variants. Some source colors merge in the white and green variants; the mapping is consequently not one-to-one. Applied variants reproduce those source palette choices, rather than assigning arbitrary replacement colors. Wreck and explosion poses retain their original red/fire palette for every driver.

The result is **12 source pose crops, 4 mirrored derivatives, and 4 palette-reference samples**, assembled as four vehicle sets with 16 frames each. The resulting 64 runtime frames are not 64 independently drawn original poses.

## Pixel integrity and geometry

`scripts/import-pole-position-reference.py` reads the cached source only, verifies its expected hash and dimensions, and writes reproducible crops, frame data, mapping, configuration, integrity report, and a labeled contact sheet.

The sole transparency rule removes exact RGBA **(153, 217, 234, 255)**. Opaque source black remains opaque. Frame data keeps exact source RGB colors using at most **10 opaque colors per frame**, within the runtime's optional 16-entry per-sprite palette. There is no color quantization or spatial resampling in the imported data. Native crop PNGs are checked against the source, and every encoded frame is reconstructed and compared to its intended RGB/alpha pixels. The recorded run performed **70,472 assertions**.

Each frame has native dimensions and an authored ground anchor. `sourceWidth: 52` and `displayWidth: 42` define a consistent projection scale across all poses; a wider explosion is not compressed to the width of the straight car. Runtime perspective scaling is nearest-neighbor and changes on-screen size. Exact source colors do not imply that every source pixel survives a smaller projected rendering, particularly in the two-player view.

Pixel `hitboxes` and `hurtboxes` are empty because sprite imagery does not recover the game's original physics. Each set instead records the current controller's actual **track-space** collision geometry: half-width 0.15, half-length 45, candidate lane gap at most 0.30 and longitudinal gap at most 90. It also records the relative-speed threshold, response multipliers, separation, invulnerability, and crash duration. These are explicitly project-controller rules, bound to `module.base.js` SHA-256 `c6c127349564e5adfc697b2b6ef597b59edef870cc8d91eb497cef9a9f918b2c`, not measurements from the Pole Position ROM.

## Runtime contract and authored timing

`kart-config.json` supplies `assets.vehicles` and six driver references using the four vehicle IDs. It leaves default three-lap and 180-second rules intact. Root converts the runtime `vehicles` list into the catalogue's `sets` structure; the importer does not duplicate it or approve the pack.

| Controller state | Clip and authored timing |
| --- | --- |
| Idle | Straight pose, 200 ms, looping |
| Drive | Straight wheel pair, 100 ms/frame, looping |
| Steer left/right | Matching moderate-yaw wheel pair, 100 ms/frame, looping |
| Drift left/right | Matching strong-yaw wheel pair, 100 ms/frame, looping |
| Boost | Straight pair at 80 ms/frame; no invented boost drawing |
| Crash | Wreck plus five explosion frames, 650/6 ms/frame, one shot |

The adapter begins crash playback at impact and clamps to the last pose. Frame-level duration overrides are omitted so drive and boost can share drawings with different clip timing. Source drawings are genuine; state assignment, anchors, playback timing, drift, turbo, and collision behavior are project adaptations. Distance-specific source sprites, reverse/front views, original qualification, gears, and source roadside artwork are not implemented here.

## Evidence and current limits

Import evidence lives in `data/reference-cache/spriters-resource/pole-position/`: `sheet-map.json`, `source-assets.json`, `kart-config.json`, `integrity.json`, and `reviewed-car-contact.png`. The contact sheet was inspected at native geometry with enlarged nearest-neighbor previews. Current configuration SHA-256 is `55ec77be3ae8172b04efff9f7312134cf15e017fb28f781aec18451eca075581`; source-assets SHA-256 is `a32bd5085830629c254309c4a195fba48f39eb2b2892b729582d5f7274922268`.

Native proof is in `data/local-catalog/pole-position-racer-reference/verification/runtime-proof.json`. It loads the exact private wrapper with **empty configuration**, so imported defaults cannot be masked by separately passing the reviewed config. Read-only telemetry plans ordinary button transitions, which are replayed through the native runtime input interface. No teleportation or state mutation is used.

Both one-player and independent two-player races clear all 12 ordered checkpoints, finish three laps, reach terminal states, and reset to matching fresh frame hashes with zero runtime errors. The one-player finish scores 2,430; the two-player finish scores 2,435 and 2,430. Both timeout paths also terminate and reset. Generic probes pass, retaining their honest soft observation that DOWN at rest produces no change; the dedicated moving-car control checks cover braking. Native screenshots show the actual car palettes, both cameras, steering, drift, and the source crash sequence. The source contact sheet, `1p-race-straight.png`, and `2p-race-crash-plus-20.png` were also independently inspected for this audit.

Root's visual evidence binds final catalogue content hash `6ad2241e29a60979067f781efcbc648b7f562c3400052570dc1269b5be66dc73`. The final metadata refresh corrected palette-map wording; the proven factory and pixels were unchanged. Normalized factory hash remains `a6ede5a93ec25e9975854f276e9ada01342dfc02536d9bceed6137c29d9fb3d9`.

The admitted pack is selected for explicit Pole Position requests in both player modes. Generic kart requests continue selecting the original kart pack. `verification/catalog-preview.json` records that the actual bundled catalog preview produces byte-identical RGBA in the isolated DRAFT worker and the native runtime, in both modes. The SQLite index contains 14 verified packs across 12 game families and 56 sprite sets. Source discovery alone still cannot admit a pack.

The original kart adapter also passed all 11 existing behavior tests and six new asset tests; ten before/after native screenshots match exactly. A synthetic native render verifies 94 opaque RGB pixels, including 24 black pixels, and 210 clipped second-player pixels with no leakage into the first camera. The harness suite passes all 65 tests.

This establishes a locally tested source-art adaptation, not human balance testing, physical CRT validation, or an original-ROM recreation. An attempted fresh Astra generation was blocked before output by the project's HTTP 429 enforced spend limit; the failed attempt is retained in `bench/results/2026-09-19-2247-pole-position-source-medium-1p.json`. **End-to-end model generation is not validated by these offline import and runtime checks.** No billing settings were changed and the failed request was not retried.

### Preview verification scope correction

The earlier native/preview parity check used the isolated worker directly. A later
Pac-Man integration test found the actual iframe host still rejected assembled
code above 150k, which also excluded this 215k racer pack. The shared preview host
now allows a bounded 1,000,000-character assembled payload and keeps its watchdog
and CSP; the full cabinet large-fighter test and Pac-Man iframe tests pass. This
correction does not turn the earlier worker-only comparison into a full Pole
Position cabinet-generation test. Fresh model generation remains unverified.
