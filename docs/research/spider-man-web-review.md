# Spider-Man traveling web and wrap source review

The cached source contains actual independent traveling web/projectile art, burst art, and mesh-wrap art. The strongest first integration candidate is the five-frame horizontal projectile strip beside the standing web-shot poses: **merged cells 369+370, then 371–374**. The nearby expanding/disappearing burst group is **368,364,365,362,363 in source X order**. Compact mesh-wrap candidates are **735–740**, with 770 a possible continuation across the row break.

These are distinct effect-only pixels, not the existing body/emission frames 343/345/346/349/344 and not a renamed generic projectile. No mappings, assets, controller code, quality records or prior proofs were modified. Original game timing, damage, speed, hitbox, wrap duration and move-state association remain unverified.

## Source and evidence

Reviewed the existing numbered contact sheets and the actual original sheet regions around y=2850–3014 and y=5490–5933. The source remains the cached indexed PNG, SHA-256 `140acafe486efc32761c98cf60134eed376f2f08a1896904abb2e1f3d4ba8c3f`.

New ignored outputs in `data/reference-cache/spriters-resource/spider-man/web-review/`:

- `web-effects-contact.png`: labeled original-color travel, burst, compact wrap, larger wrap and alternate coil/ring groups. Preview enlargement is nearest-neighbor only; each label states 1× or 2×.
- `standing-shot-source-context.png`, `mesh-coil-source-context.png`: original source rectangles preserving spatial relationships.
- `review-crops.json`: merged rectangles, trims, dimensions, exact source RGB counts and crop hashes.
- `*-source.png`: extracted original-resolution effect-only RGBA crops.
- `make-review.py`: local reproduction using Pillow/NumPy and existing source pixels only.

The final contact sheet and both original-context crops were visually inspected. The full path to the contact is `/Users/shayaanazeem/Downloads/htncodex/htn-2026/data/reference-cache/spriters-resource/spider-man/web-review/web-effects-contact.png`.

## Candidate meaning and confidence

| Group | Visual evidence | Confidence boundary |
| --- | --- | --- |
| 369+370,371–374 | Five consecutive low horizontal cells: bright rounded leading mass with trailing white/lilac strands and flecks. Lies directly beside standing web-shooting pose/effect material. | High confidence as traveling effect art; medium confidence in the intended original move linkage/order. Rounded leading end is left in the source; mirror with the right-facing body import if used. |
| 368,364,365,362,363 | Adjacent burst grows into a ring and disperses into wisps. Increasing source X gives this visible progression; numeric IDs do not. | High confidence as burst/dispersal effect art. Medium confidence as hit effect rather than launch/collision/block dissipation; no event semantics are supplied. |
| 735–740 | Curved mesh expands into a compact upright cocoon/bundle; later variants retain a similar silhouette. | High confidence as mesh/wrap-like art. Whether it wraps a hit target for this specific projectile, and for how long, is not established from the sheet alone. |
| 770 | Compact bundle at the far left of the next row, dimensions resembling the preceding compact family. | Plausible continuation/alternate compact frame; do not prepend it to the large-wrap family simply because its source Y is later. |
| 763–769 | Larger curved mesh and larger upright bundles, visually related to compact wrap. | High confidence in larger wrap-like appearance, but target-size/state selection is unknown. Use one size family deliberately rather than mixing silhouettes arbitrarily. |
| 793,794,782–785 and later repetitions | Thin coiled horizontal form expands to hollow loops and dissipates. | Alternate visible web-like family; linkage to the chosen shot/burst is less certain. Keep out of the first integration unless deliberately authored and labeled. |

## Correct crop boundaries

Rectangles below are `[left, top, right, bottom]` in original sheet pixels, with right/bottom exclusive. Retain source index 0 transparency, make magenta index 1 transparent, and keep other source RGB values exact.

**Segmentation correction:** 369 and 370 are not two complete projectile frames. The actual sheet has one rectangular magenta cell spanning x=130–236; opaque foreground divides its background and causes the automatic scanner to produce two candidates. Both isolated candidates visibly cut the projectile at a vertical edge. The reviewed full crop is `[130,2994,236,3013]`, including the foreground gap between the candidate regions. The contact/review JSON use that corrected rectangle under ID369 and label it `369+370`. A future importer must use this explicit rectangle rather than relying only on overlap union.

Large wrap candidate765 likewise needs the existing overlap-union procedure to include scanner component771; the review JSON records the merged complete rectangle. IDs are segmentation identifiers, not source animation labels.

| Candidate | Reviewed source rectangle | Trimmed size | Opaque RGB colors |
| --- | --- | --- | ---: |
| 369+370 | `[130, 2994, 236, 3013]` | 95×19 | 6 |
| 371 | `[237, 2994, 343, 3013]` | 92×18 | 6 |
| 372 | `[344, 2994, 450, 3013]` | 94×16 | 6 |
| 373 | `[451, 2994, 557, 3013]` | 89×17 | 6 |
| 374 | `[558, 2994, 664, 3013]` | 94×17 | 6 |
| 368 | `[665, 2949, 729, 3013]` | 46×57 | 6 |
| 364 | `[730, 2933, 794, 3013]` | 60×65 | 6 |
| 365 | `[795, 2933, 859, 3013]` | 47×73 | 6 |
| 362 | `[860, 2917, 924, 3013]` | 53×77 | 4 |
| 363 | `[925, 2917, 989, 3013]` | 54×79 | 4 |
| 735 | `[1295, 5513, 1407, 5641]` | 100×114 | 7 |
| 736 | `[1408, 5513, 1504, 5641]` | 91×126 | 8 |
| 737 | `[1505, 5513, 1617, 5641]` | 97×120 | 8 |
| 738 | `[1618, 5513, 1714, 5641]` | 92×122 | 8 |
| 739 | `[1715, 5513, 1811, 5641]` | 92×122 | 8 |
| 740 | `[1812, 5513, 1908, 5641]` | 92×122 | 8 |
| 770 | `[1, 5674, 97, 5802]` | 92×122 | 8 |
| 763 | `[98, 5642, 226, 5802]` | 124×140 | 7 |
| 764 | `[227, 5642, 355, 5802]` | 121×157 | 8 |
| 765 | `[356, 5642, 484, 5802]` | 128×149 | 8 |
| 766 | `[485, 5642, 613, 5802]` | 123×152 | 8 |
| 767 | `[614, 5642, 742, 5802]` | 123×152 | 8 |
| 768 | `[743, 5642, 871, 5802]` | 123×152 | 8 |
| 769 | `[872, 5642, 1000, 5802]` | 123×152 | 8 |

## Suggested authored integration contract

Use an independently positioned projectile entity with its own travel frames, origin, facing, velocity and finite lifetime. Associate the existing body emission clip with an explicitly authored launch moment; do not draw the travel strip at the fighter's feet. On an actual collision, use an explicitly authored burst transition and, only if the design chooses a temporary bind mechanic, register compact wrap art around the target body. Make the bind finite and test player input recovery. Art alone does not establish damage or original move behavior.

The selected travel/burst/wrap families fit one 16-color palette per frame at original resolution (travel6, burst4–6, compact wrap7–8), so no color approximation is needed. A later 9/16 import should independently compare decoded RGBA against scaled source and preserve each frame's exact RGB. Trim-independent effect anchors are necessary to prevent the strip or expanding ring from jittering. Source color correctness, collision behavior, bound-target state and native rendering must each be tested in the implementation pass.

Any new integration remains an authored adaptation until original semantics can be verified. This review supplies actual source effects and defensible crop boundaries; it does not admit commercial art to the library, establish a redistribution license, or claim a complete original character.

## Separate authored web import

The explicitly requested next import is implemented in `scripts/import-spider-web.py`. Running it offline creates `custom-assets-web.json` from immutable `custom-assets-reviewed.json`, with 84 total frames: all prior 68 frame objects preserved exactly plus 16 effect frames. Every prior character clip retains its data except the explicitly added emitter socket on the second special step. No current core or admission files are changed.

```sh
python3 scripts/import-spider-web.py
```

The three new clips use exact source RGB at the existing mirrored nearest-neighbor 9/16 scale:

- `webTravel`: merged369+370,371,372,373,374; four authored ticks each, looping. Every frame anchors to its rightmost visible leading-tip center. The tail extends left of this impact-center coordinate.
- `webImpact`: 368,364,365,362,363; three authored ticks each, non-looping, using trimmed visual-center anchors.
- `webBind`: 735,736,737,738,739,740; authored ticks4,5,5,5,5,5, non-looping with terminal-frame hold, using bottom-center anchors at the target ground reference.

All effect steps have empty hit/hurt box arrays. Character-level optional projectile parameters are:

```json
{
  "travel": "webTravel",
  "impact": "webImpact",
  "bind": "webBind",
  "speed": 3.6,
  "life": 90,
  "box": {"x": -10, "y": -3, "w": 10, "h": 6},
  "bindTicks": 38
}
```

The box was adjusted behind the leading-tip anchor to cover the compact visible projectile head. It does not extend over the long trailing strands or six pixels ahead of the visible tip. The contact sheet overlays the box on every travel frame and was visually inspected. All behavior numbers and effect timing are authored prototype choices, not original game rules.

The emitter socket is `projectileOrigin: {x:54,y:14}` on special step1 (the second step, frame `src345`). These are **stored source-sprite pixels after the reviewed scale/mirror**, not original sheet coordinates or feet-relative world coordinates. Frame345 is66×42 with step anchor(23,42); the socket therefore yields a right-facing feet-relative offset(+31,-28). It was selected from a 10× nearest pixel-grid inspection of the visible wrist/palm emission center. The marked `emitter-socket.png` shows the exact selection. The controller must apply its normal flipped-anchor transform when firing left.

The import independently decodes serialized palette/hex-slot planes and compares them with a separately transformed source RGBA path: **17,686 opaque pixels and 12,399 transparent locations; zero RGBA mismatches**. Transparent hidden RGB is normalized before comparison. All new frames fit one palette plane; no quantization or recoloring is performed. Source index0 and magenta backing index1 are transparent. Source/baseline/prior-artifact hashes and all old-frame/clip equality assertions pass.

New ignored outputs, relative to `data/reference-cache/spriters-resource/spider-man/`:

- `custom-assets-web.json`: separate authored web revision; SHA-256 `eb0ce8d0efb080fe6ad81e4e9385614df5f679bafc1566b8b4585250892b92d6`.
- `web-import/proof.json`: exact source rectangles, trims, colors, dimensions, anchors, authored durations, socket, projectile contract, independent equality results and preservation manifest.
- `web-import/web*.png`: independent decoded effect previews.
- `web-import/effects-contact.png`: native-size coordinate registration enlarged2×, with anchor crosses and travel-head collision overlay.
- `web-import/emitter-grid.png`, `web-import/emitter-socket.png`:10× source-sprite inspection and selected emitter.

The parent baseline SHA-256 remains `e7003d930d66f132a15c70e508663f8ec599850395c557cbf6f5c93bd5143456`. Native controller proof must separately validate firing position in both facings, collision/head geometry, effect playback, bounded target bind and recovery. This source import does not claim those gameplay tests passed or that original web semantics have been recovered. Existing historical character clip notes remain preserved; the new web-revision provenance describes this proposed adaptation. Commercial art remains in the ignored private cache.

The bind clip was revised to non-looping so its 29-tick wrap animation holds the final cocoon for the rest of the authored 38-tick trap rather than reopening the initial expanding mesh. The controller must support terminal hold for this effect.


## Native all-frame pixel proof

`node scripts/prove-fighter-layered.mjs --web` selects the web revision and writes a separate ignored `fighter-web-pixels-proof/` directory. The original default and `--reviewed` modes retain their previous selection/output paths. The web mode intentionally skips gameplay and gallery capture: the parent integration owns behavioral proof.

After the controller was rebuilt to accept a non-looping bind clip, local Chromium rendered **all84 frames in both facings (168 comparisons)** through the actual fighter-origin/layer-draw path and native runtime renderer. Every comparison passed exact opaque RGBA, transparent-background, anchor-origin and unclipped-render assertions: **zero mismatches and zero clipped pixels**. The expected effect PNGs come from `web-import/webNNN.png`; original character and authored-reaction frames use their existing independent source/decoded PNGs. Frozen baseline imports and import proofs remained unchanged.

`fighter-web-pixels-proof/proof.json` records the current module/asset hashes, per-frame counts/origins/facings and aggregate results. This proves pixel rendering and placement for stationary fixtures; it does not replace actual projectile travel/collision/bind/recovery testing.


## Native controller integration — authored adaptation

Fighter 1.2 now consumes the declared travel/impact/bind clips, exact palettes, per-step emitter and collision rectangle. The active hand socket produces (+31,-28) before facing reflection; travel starts there and reveals its long trail as it moves, rather than appearing through the shooter. A grounded unblocked hit applies 17 damage once and a 38-simulation-tick bind. The 29-tick mesh clip holds its final pose until release. A follow-up hit breaks the trap; 120-tick immunity prevents immediate rebinding. Guard and airborne hits do not bind. Effects and bindings clear at the documented round transitions.

`node scripts/prove-fighter-web.mjs` runs five isolated native scenarios via real runtime input: P1 hit, P2 mirrored hit, block, jump-over and 1P CPU. Both hit scenarios score 170 for the correct player, capture wrap and release, and reach a normal round win; blocking chips one health without trap or attack score; jumping avoids the shot and the tied round correctly restarts; the CPU scenario eventually defeats the idle human after their opening shot. Every scenario has zero runtime errors. The test uses actual source assets, current module code and authored timing, with no state teleports or network/model calls.

Evidence is stored in `fighter-web-gameplay-proof/proof.json`, its per-state PNGs, and `native-overview.png`. The separate all-frame pixel proof was rerun against the same module. This establishes the implemented web mechanic and renderer, not original Marvel vs. Capcom semantics or the quality of every body animation.

`scripts/store-spider-draft.mjs` verifies those evidence hashes and saves the 84-frame/19-clip set under ignored `data/local-assets/spider-man-reference/`. The actor retains source pixels, authored frame timing/anchors/boxes, the hand socket, projectile definition and provenance. It deliberately has no admission report: it is a draft for further curation, excluded from generation retrieval. Original-size composition, remaining move-by-move review and human playfeel are outstanding.
