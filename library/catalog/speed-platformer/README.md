# Azure Dash

Original two-act momentum platformer with native-size original Azure Hare sprites. Left/right accelerate and reverse, A/Up jumps, B/Down rolls, Down+B charges a release dash. Palm Coast introduces speed and a physical gravity-driven loop; Sunset Ridge adds steeper climbs, spring-assisted gaps and elevated routes. Two players race independently in vertically stacked views.

All work is offline. `node build.mjs` rebuilds original art and standalone module. `node --test test.mjs` exercises real input sequences. `node screenshots.mjs` loads only local runtime files in isolated Chromium and saves native framebuffer images. No API or generated models are used.

Admission is bound to the current source hash, behavior tests, native runtime routes and recorded visual review. Source-art adaptations belong in private packs; this public pack includes no commercial sprites.

## Environment and route polish

The environment is original authored pixel art (`scenery.mjs`), rendered with separate exact RGB palettes for coast and dusk. Clouds, distant cliffs and the foreground use independent parallax depths. Curved palms, ferns, shaded turf, tapered floating platforms and alternating earth/stone strata distinguish the acts. The loop is a continuous ring whose inner grass edge matches the 38-pixel physical track radius.

Palm Coast introduces a connected upper platform route and a forgiving lower valley before two fatal chasms. Sunset Ridge adds three chasms, an uphill approach and a second physical momentum loop. Ring arcs and approach signs preview jump paths. Braking before the first vertical jump reaches the optional upper route; a short hop before the first spring reaches the lower valley. Springs occupy clear landing surfaces, separated from enemies so a same-tick enemy bounce cannot cancel their lift.

The camera leads movement (at least 165 pixels of forward room in the tested fast sections), centers physical loops and follows high spring flights without clipping the source-sized actor in either split view. Shorter act headings reveal the initial controls sooner. An optimized input-aware route takes 992 native ticks (about 16.5 seconds), compared with 960 before this pass. That is an optimal route measurement, not a human difficulty estimate. These remain compact arcade courses, not full-length source-game stages.

Nineteen mechanics tests cover controls, both loops, full spring lift, optional high/low paths, rings, pit/checkpoint recovery and split-view camera headroom. `node scripts/prove-sonic-local.mjs --public` from the repository root records genuine native input routes for 1P and both possible 2P winners, including neutral-input runtime reset. The corresponding private proof additionally verifies 92 exact source/mirrored RGB comparisons. No sound assets or sound behavior changed; jump, spring, ring and enemy cues retain their existing implementation. Physical cabinet and human play acceptance remain outside these automated proofs.

Before/after native Sonic captures are retained in `verification/polish-before/` and the private adapter evidence directory. Public admission covers the original Azure Hare art; private Sonic source pixels remain separate and unchanged.

The pacing baseline is retained in `verification/pacing-before/`; current original-art captures are in `screenshots/`, with full native input/reset records in `verification/default-native/`. Private source frames and captures remain in the private adapter.
