# DC arcade source imports

Three actual DC character sheets are now imported as private, partial animation actors: **Batman 22 frames, Joker 23 frames, Superman 16 frames**. They preserve native resolution and exact source RGB. All 61 frames passed independent encoded-RGBA comparison against their source crops (115,367 opaque pixels, zero mismatches). The downloaded sheets and final output contact sheets were visually inspected.

## Verified arcade sources

| Character | Actual arcade game/category | Primary sheet and uploader | Sheet size |
| --- | --- | --- | --- |
| Batman | Batman (Atari, 1991), Arcade | [Batman 31098](https://www.spriters-resource.com/arcade/batman/asset/31098/), Yawackhary |608×1408|
| The Joker | Batman (Atari, 1991), Arcade | [The Joker 110272](https://www.spriters-resource.com/arcade/batman/asset/110272/), shadowman44 |431×968|
| Superman | Superman, Taito, Arcade | [Superman 108348](https://www.spriters-resource.com/arcade/superman/asset/108348/), jin315 |1225×2716|

The [Batman game page](https://www.spriters-resource.com/arcade/batman/) identifies its Atari 1991 edition and lists Batman/The Joker. The [Superman game page](https://www.spriters-resource.com/arcade/superman/) identifies Arcade, Taito and side-view; its source sheet carries a Taito 1988 copyright graphic. The playable Superman page was accessible in the user's browser even though the raw page fetch returned 403; its visible download link supplied the actual PNG. No console or custom/fan sheet is labeled Arcade in this import.

The public, non-pixel source index is `library/sources/spriters-resource-dc-arcade.json`. It records observed image URLs, archive credit, checksums, source dimensions, private pack paths and coverage limits.

## Usable imported scope

| Private actor ID | Frames | Actual declared clips |
| --- | ---: | --- |
|`dc-batman-arcade/batman`|22|walk 6, jump 7, crouch 3, punch 2, kick 4|
|`dc-joker-arcade/joker`|23|hatWalk 6, hatPistol 2, hatCrouch 1, hatFall 6, walk 8|
|`dc-superman-arcade/superman`|16|idle 1, walk 6, punch 5, crouch 2, hover 2|

These are partial pose-category mappings, not reconstructed original animations. In particular, Joker's hat/no-hat states are kept in separate clips; there is no invented transformation. The imported Batman and Superman strikes visibly contain the named broad pose action, but original attack strength/state names are not recovered. Character-specific projectile mechanics, complete fighting move trees, hit/hurt boxes and 16-clip fighter compatibility are not supplied. Missing poses are not duplicated or renamed to satisfy a contract.

The existing normalizer accepts all three packs with no issues. `actor.json` has frames, local exact palettes, optional full-canvas color layers, per-step duration and empty collision arrays; manifest records camera, tags, license/provenance and source image hash. Anchors are authored bottom-center preview registration. Jump/hover world trajectories must come from a controller; source engine pivots are unknown. Durations use explicit authored 60 Hz preview ticks, not purported original timing.

## Import and evidence

Run `python3 scripts/import-dc-arcade.py`. Optional `--download` retrieves only the three fixed PNG URLs observed on their primary source pages if the cache files are missing. It does not run any model or generation API. The script verifies the exact expected source checksums before cropping and refuses to overwrite a pack containing an admission quality record.

Every frame uses an explicitly reviewed source rectangle, key-background removal, and a transparent trim. No scale, mirroring, smoothing or recoloring is applied. Colors are partitioned into planes of at most 16 RGB entries with at most 8 extra planes; all planes have the same dimensions. Each source opaque pixel has exactly one plane owner, and `.` is transparency. Independently decoded planes must match source RGBA, with hidden transparent RGB normalized to zero.

During contact-sheet review, crop boundaries that captured neighboring legs/capes were corrected and rerun. Joker's selected crouch is deliberately only the clearly separable first pose; other partially overlapping crouched pistol cells were left out. No black outlines or detached art are erased by blanket color remapping.

Each private `data/local-assets/dc-*-arcade/` directory contains:

- `manifest.json`, `actor.json`, `README.md`, `LICENSE.md`.
- `sources/<assetId>.png`: untouched original sheet.
- `evidence/source-rgba.json`: exact crop/trim rectangles, native sizes, per-plane palettes/counts, source/actor checksums and equality results.
- `evidence/contact.png`: all final imported frames with clip/frame IDs, reviewed visually at native resolution.
- `previews/*.png`: decoded RGBA frames.

Original cache checksums:

- Batman: `b394fc88ff78734fe1976da90d3d081e1665c5f151d7fad5975d8e1f20b23c2a`.
- Joker: `01fb6386debd5cf978af52806e64dd0f3a21d128dc5671072c03205c0346f8f0`.
- Superman: `f4a0cd3f73623bb2d1b441cb269c46b4aa25dac187d48b456e5f374db27f5579`.

All source and derived commercial pixels remain under ignored private cache/local-assets paths. Source checking means the declared partial clips match the credited images; it must not be confused with full combat integration or a complete original character.


## Source-only admission

`scripts/check-dc-arcade.mjs` verifies source/actor/import hashes and the exact frame count, records the completed visual/provenance review, and writes the existing content-hash-bound `quality.json` checks for integrity, visual and provenance. All three packs now normalize as **source-checked**, with `fighterReady:false`. Evidence is `evidence/source-review.json`; it includes the reviewed contact hash and the precise scope/limitations. The parent integration indexes these normalized actors into the existing database.

Run the checker offline from the repository root:

```sh
pnpm --filter @htn/harness exec node --import tsx ../../scripts/check-dc-arcade.mjs
```

Admission does not turn a partial actor into a full fighter. The importer refuses to overwrite these admitted packs; an intentional future mapping revision requires renewing the source-only evidence against its new content hash.
