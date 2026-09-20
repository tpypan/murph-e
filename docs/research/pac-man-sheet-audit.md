# Pac-Man source-art import audit

Reviewed 2026-09-19. This import supplies source artwork to the project's tested maze controller. It does not recover the original arcade program, original animation timing, or original maze rules from the PNG.

## Inspected sources

Both source pages were opened in the browser after ordinary web retrieval returned HTTP 403. Their visible uploader, dimensions, and image URLs were verified; the downloaded native PNGs were inspected separately.

| Sheet | Source | Cached geometry and SHA-256 |
| --- | --- | --- |
| General Sprites, 52631 | [Pac-Man / General Sprites](https://www.spriters-resource.com/arcade/pacman/asset/52631/), Superjustinbros | RGBA, 680×248; `2a13b214b274eb48d9dfe1352c5bcc0ebd22de98600a27cd9d0baa40c2f4bd4f` |
| All Assets/Palettes, 159361 | [Pac-Man / All Assets/Palettes](https://www.spriters-resource.com/arcade/pacman/asset/159361/), Caylie C | RGBA, 1000×750; `7dbc934a79bfd7530448d7ccee2757bcf326d49c75845f6d0eebb4403063c723` |

The General Sprites page reports a June 2026 sheet update. Its current image is the authority for this mapping, rather than coordinates from an older revision. The larger atlas was inspected for palette organization and retained as a reference; **runtime actor pixels come only from 52631**. The separately indexed Maze Parts sheet 73389 was not downloaded or imported in this bounded pass.

Raw PNGs and matching JSON provenance sidecars live in `data/reference-cache/spriters-resource/pac-man/`. `library/sources/spriters-resource-arcade.json` records both verified cache entries. The source registry now has 16 games, 87 selected sheet links, and eight locally downloaded PNGs. Every raw source still has `runtimeReady: false`.

These are archived commercial game graphics, not CC0 artwork. Uploader attribution and archive availability do not supply a redistribution license. Source pixels and derivatives stay in ignored private data directories. The importer does not grant catalogue admission or modify quality status.

## Exact cell mapping

All imported cells retain their native **16×16** canvas and a center anchor at (8,8). No mirroring, rotation, scaling, or recoloring is used.

| State | Source coordinates and selection |
| --- | --- |
| Player right | x=456/472/488, y=0: wide, narrow, closed mouth |
| Player left | x=456/472/488, y=16: wide, narrow, closed mouth |
| Player up | x=456/472/488, y=32: wide, narrow, closed mouth |
| Player down | x=456/472/488, y=48: wide, narrow, closed mouth |
| Player death | x=504 through 664 in 16-pixel steps, y=0: eleven collapse/burst drawings |
| Final disappearance | x=664, y=16: an empty source cell used as an explicitly authored blank hold |
| Blinky / Pinky / Inky / Clyde | y=64/80/96/112; x=456/472 right, 488/504 left, 520/536 up, 552/568 down |
| Frightened blue | x=584/600, y=64 |
| Frightened flash | x=616/632, y=64 |
| Returning eyes | x=584/600/616/632, y=80: right/left/up/down |

Mouth openings and ghost pupil positions were inspected to confirm direction labels. Each ghost direction uses its two matching gait poses. The result has **63 occupied source cells and one blank hold**, stored as 64 runtime frames. Several closed-mouth cells contain repeated drawings; this count is not a claim of 64 distinct original drawings.

The source contains no separately identified reform tween. Each `reform-0..3` clip reuses eyes-up followed by that ghost's two up-facing body poses. This is an authored eyes-to-body transition using genuine source drawings, explicitly distinguished from a recovered original animation.

## Color and transparency integrity

The PNG has opaque black baked behind the sprites. It does not contain an original transparent index that can simply be preserved. The importer retains every original crop unchanged, then creates an explicit alpha mask by removing **only exact black pixels connected to a cell boundary**. Enclosed black pixels remain opaque. The selected actor cells contain zero enclosed black pixels, so there is no claim that this source supplied distinguishable internal black detail for them.

A separate fixture verifies that the mask preserves enclosed opaque black and removes exterior black. Every encoded opaque pixel must equal the corresponding source RGBA pixel; every encoded palette/row frame is reconstructed and checked. No other color is treated as transparent, and no quantization occurs. Imported frames use at most **three opaque RGB colors** each, carried through the runtime's optional per-sprite palette.

`scripts/import-pac-man-reference.py` verifies the expected source hash, source dimensions, and matching provenance sidecar before importing. The recorded run performed **32,901 assertions** covering crop integrity, mask behavior, palette reconstruction, dimensions/counts, and bounded death/reform durations. `integrity.json` records the result. The actual catalogue `normalizeSpriteSet` function also accepted the full set with 64 frames and 36 clips.

## Controller contract

`maze-config.json` contains:

```js
{
  avatar: 'chomper',
  playerMarkers: true,
  assets: { frames, animations }
}
```

The configuration supplies all 36 chomper-family clips: both players' four movement directions and death; all four ghosts' four directions; blue/flash frightened clips; four eyes directions; and four reform clips. Both players retain the source yellow artwork. Optional project P1/P2 markers distinguish simultaneous cooperative players; an arbitrary second source palette is not invented.

`source-assets.json` presents the same frames and clips under `sets['pac-man-actors']` for catalogue ingestion. Frames retain provenance, source rectangles, native size, palette, anchor, and geometry metadata. Individual animation entries use the existing maze shape `{frame, duration, anchor, hitboxes, hurtboxes}`, with duration measured in 60Hz ticks.

| Clip | Authored controller timing |
| --- | --- |
| Movement | Closed, narrow, wide, narrow; four ticks per step, looping |
| Ghost movement | Two gait poses; seven ticks per step, looping |
| Frightened / flash | Two gait poses; seven ticks per step, looping |
| Returning eyes | One directional pose, one-tick loop |
| Death | Eleven source drawings plus blank hold; six ticks each, 72 ticks total |
| Reform | Eyes-up, body-up-0, body-up-1; 15 ticks each, 45 ticks total, non-looping |

These timings fit the project's 75-tick death and 45-tick reform phases. They are authored timing, not measurements of the original ROM or the archive's community GIFs.

Normal actor geometry copies the project's anchor-relative 6×6 collision box at (-3,-3). Returning eyes and reform steps are marked noncolliding. This metadata is not inferred from the source outline; the adapter retains authoritative foundation collision behavior separately from imported drawing size. The blank death frame also carries no opaque geometry of its own.

## Outputs and verification scope

The ignored import directory contains source PNGs/sidecars, untouched source crop PNGs, alpha-masked PNGs, `sheet-map.json`, `source-assets.json`, `maze-config.json`, `integrity.json`, and `reviewed-actor-contact.png`. The contact sheet was visually inspected: complete directional mouths, four distinct ghost colors, readable directional pupils, frightened faces, death collapse/burst, and isolated eyes are present.

Configuration SHA-256: `87c2020543ce5ddc4f99cf32b692030672aa81a7c7cbe099fd51cc5a6de32320`.

An independent native pixel proof is implemented in `scripts/prove-pac-man-pixels.mjs`, with results at `data/local-catalog/pac-man-maze-reference/verification/pixels.json`. It decodes the original atlas and saved crops independently, recomputes the transparency mask, and compares all **16,384 source-cell pixels** against normalized catalogue data. It then draws every frame through the actual built runtime's `api.spr`, using its exact palette over two alternating checker backdrops. All **32,768 native RGBA pixel comparisons** pass, including transparent pixels preserving the underlying checker. An additional native fixture confirms opaque custom black draws while a transparent dot leaves the backdrop intact. Both passes report zero runtime errors. `pixels-native-0.png` was visually inspected: complete direction/state poses and source palette colors are visible at native size.

That evidence records private factory SHA-256 `57cb03b25d2da0bc76a8ac5b8d169f4758da8e129852a70988400048d6d25c4b` and runtime SHA-256 `1683361f3b43eb323c9d202135f9fd7ae583c19d7bb3bce5792c0d9d2396072b`. The pixel proof draws supplied frames directly; it does not substitute for a gameplay replay of that wrapper. The independent adapter review found palette forwarding present in both ordinary and tunnel-copy drawing, bounded non-looping death/reform clips, copied imported arrays, and collision lookup retained against the canonical project artwork metadata. No blocking mapping or renderer defect was identified in this review.

This audit validates extraction, catalogue shape, and native sprite rendering. The gameplay section below separately records wrapper-default playback and admission evidence. No model/API call is used by these checks, and this import is not evidence of successful Astra generation. Original intermissions, enlarged sprites, fruit/HUD integration, original maze tiles/topology, source timing, and the original alternating two-player rules are outside this import.

## Native default gameplay and admission

The optional source-art adapter is now implemented in the original maze foundation
(v1.1.0). Imported visuals cannot replace its canonical collision metadata. Native
legacy screenshot comparisons stayed byte-identical for all eleven captures.
The foundation passed 18 behavioral checks plus actual 1P/2P input probes.

`scripts/build-pac-man-local-catalog.mjs` builds the private draft.
`scripts/prove-pac-man-local.mjs` plans ordinary directional button inputs using
read-only current actor telemetry, then replays those inputs through the real
Chromium runtime. The exact private default configuration `{}` was tested:

| Mode | Full default route | Native score | Result |
| --- | --- | --- | --- |
| 1P | All three rounds, all four ghosts active, 5,474 frames | 11,350 | Win, two lives left |
| 2P | All three rounds, all four ghosts active, 3,030 frames | 8,550 each | Win, three shared lives left |
| 1P idle | 2,313 frames | 0 | Shared lives exhausted; game over |
| 2P idle | 2,280 frames | 10 each | Shared lives exhausted; game over |

The stationary second player begins on a pellet and collects it on the first tick;
reset checks inspect the state before that tick. Scores were compared at recorded
checkpoints, errors remained empty, fresh init cleared terminal state and scores,
and both declared-direction runtime probes passed. Their blocked up/down spawn
observations remain recorded; the default spawn is a horizontal corridor.

Native captures of the house, 2P play, frightened ghosts, returning eyes, re-forming
bodies, death and all round clears live in the private pack's `verification/`.
Inspected source colors, mouths, pupils, central house/door and 1/2 markers remain
readable at native 256×224. This input planner is not human playtesting.

Private pack `pac-man-maze-reference` was admitted at content hash
`c1342720cce87f3789c6e652a769e7116ebd1a72c5157ef488700756fe52c1fb`.
The original maze adapter is admitted at
`e33a1e7d03d98d7110b8f848ec9f0f44a5cf183407719f5b9f44f9debb8e755d`.
`quality.json` binds the respective behavior, native runtime, visual and source-pixel
evidence to these contents. Raw discovery entries remain reference-only; they do
not bypass the pack's admission check.

No fresh Astra generation or latency measurement is claimed: the project's
enforced API spend limit remains unresolved. The generated-wrapper path is
therefore validated locally, not through a new paid generation call.

## Retrieval and live preview

`scripts/prove-pac-man-preview.mjs` uses the actual current catalogue and preview
code. Named Pac-Man requests choose the private source pack in 1P/2P; generic maze
requests retain the original. The more specific “goose chasing ghosts” wording
selects the original goose foundation. An explicit goose/hunter customization of
the source pack also correctly switches to the complete original goose artwork.

This test exposed an actual UI defect: the preview iframe silently rejected
assembled payloads above 150k. A source pack with a tiny customization is 202,662
characters after linkage. The host now accepts up to 1,000,000 characters while
retaining CSP, opaque-origin isolation and the one-second termination watchdog.
Over-limit requests report preview-unavailable. The cabinet still parses at most
150k of generated customization; the larger allowance is for the assembled draft.

The proof records exact native/worker and actual sandboxed-iframe RGBA comparisons,
source→goose preview transition, oversized rejection, infinite-init termination and
recovery to a valid preview for both player counts. The source default preview is
a DRAFT of the existing base; the completed customization replaces it. It is not
a claim that pending model code has finished. No paid generation was performed.

The strengthened preview run compares 126 native/worker frames exactly, through
frame 180, including frames 120/180 after ghosts leave the house. Both source-art
player modes produce 19 distinct RGBA frames; goose variants produce 18. This
checks actual animation, not only matching a static initial frame. The actual
iframe source→customization→failure→recovery sequences pass separately in both
player modes.
