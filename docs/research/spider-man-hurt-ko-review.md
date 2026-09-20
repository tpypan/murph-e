# Spider-Man hurt and KO source review

The local sheet contains stronger visual candidates than the imported hurt/KO proxies. In particular, **src519–src522 clearly depict a grounded, reclined/downed body**, and **src479/src480 clearly depict a backward recoil with the chest and head thrown back**. These observations improve confidence in the pose category. They do not establish the original move name, engine state, frame order, timing, anchors, or collision geometry.

No imported mapping, source image, existing proof, or game code was changed in this review. The current `hurt: [110,45]` and `ko: [168,171]` therefore remain explicitly labeled proxies.

## Local evidence inspected

Read `spider-man-sheet-audit.md`, the existing reviewed mapping and all 12 `cells-*.png` contact sheets, covering numbered cells 0–818. Then inspected the original indexed sheet region spanning y=4050–4579, which includes the candidate damage/fall rows and the start of the separate effects area. The source is the already cached 1917×5966 PNG with SHA-256:

`140acafe486efc32761c98cf60134eed376f2f08a1896904abb2e1f3d4ba8c3f`

New outputs live only in the ignored directory `data/reference-cache/spriters-resource/spider-man/hurt-ko-review/`:

- `hurt-ko-comparison.png`: five labeled rows comparing the existing hurt and KO proxies with recoil, falling and downed candidates. All cells preserve original RGB and appear at 2× nearest-neighbor scale without mirroring.
- `source-context-4050-4579.png`: an unmodified rectangular crop of the original sheet. Retaining its spatial layout matters because candidate IDs alone do not give reliable animation order.
- `045-source.png`, `110-source.png`, `168-source.png`, `171-source.png`, `479-source.png`–`481-source.png`, `514-source.png`–`522-source.png`: original-resolution transparent crops.
- `review-crops.json`: exact merged cell/trim coordinates, dimensions, source hash and crop hashes.
- `make-review.py`: offline reproduction script using the same connected-cell overlap union as the reviewed importer, existing source alpha and magenta-background removal. No quantization, model calls, generated art or network access.

The comparison image was visually inspected after creation.

## Findings

| Candidate | Visible evidence | Confidence and boundary |
| --- | --- | --- |
| Current hurt 110,45 | Compact raised-hand/hunched poses, from widely separated source rows. | Weak evidence for a coherent hit-reaction sequence; current proxy label remains appropriate. |
| 479,480 | Torso bends sharply backward, head follows the backward arc, arms spread, feet stay planted. Both are on the y=4128 source row at x=146 and x=307. | High confidence in recoil-like appearance. Medium confidence as standing damage art. Original strength, order and duration remain unknown. |
| 481 | More upright backward lean, palms spread, head back. Source x=999, y=4128. | Useful alternative recoil candidate, **not proven to follow 480**: other source cells lie between them. |
| Current KO 168,171 | 168 has the hands reaching toward/supporting the ground with raised legs; 171 is extended horizontally with a raised leg. Neighboring cells include curled acrobatic forms. | Ambiguous fall/acrobatic poses; especially weak as a final grounded KO hold. |
| 514–518 | Progresses visually from backward-leaning airborne body to rotation, inverted body and low/ground-contact curled pose. | High confidence that these are fall/tumble-like poses. Medium confidence in a related fall group; numeric order is only a proposed authored ordering, not recovered animation metadata. |
| 519–522 | Same reclined silhouette, one knee raised, other leg along the ground; head/shoulders lower between variants. These four crops sit next to each other at y=4418. | High confidence in downed/grounded appearance. Medium confidence as a knockdown/KO ending group. Whether the game uses them for KO, temporary knockdown, or recovery cannot be determined from pixels alone. |

The source row preceding the downed group also contains other standing, rotating and inverted poses (507–518). The following group (523–532) includes upright and inverted bodies. This broader context supports inspecting the region as damage/throw/fall material, but does not prove any particular state label. No readable action labels or frame durations occur in the inspected region.

## Recommended next implementation boundary

For a newly authored prototype revision, test a recoil using 479/480 and inspect 481 as an alternate recovery pose. Test a fall using the 514–518 group and a grounded ending from 519–522. Holding 521 or 522 would communicate a grounded defeat more clearly than the present horizontal src171 proxy. These are recommendations based on visible pose categories, not admission of an original Marvel vs. Capcom sequence.

Any implementation should be a separate new artifact/version so the original 57-frame proof remains reproducible. Re-extract candidates from the indexed source, preserve exact colors, and review anchors against the arena ground line: simply reusing the prior automatic bottom-of-crop anchor can make a falling body stick to the floor or slide. Give any new durations the explicit label “authored prototype timing,” then validate transitions and terminal hold in the native fighter. Keep hurt/KO source-state attribution marked unverified unless stronger local evidence is obtained. This review alone does not justify removing all proxy/metadata limitations or calling the character complete.

## Separate authored reaction revision

A subsequent explicitly requested implementation now lives in `scripts/import-spider-reactions.py`. It writes only the new ignored `custom-assets-reviewed.json` and `reviewed-reactions/` artifact namespace. The immutable `custom-assets-layered.json` remains the baseline: its 57 frame objects, the previous quantized/exact evidence, and all other 14 clips remain unchanged. The new version has 68 frames and updates only hurt and KO clip selection/registration. This is an authored prototype improvement, not recovered original state metadata.

Reproduce offline:

```sh
python3 scripts/import-spider-reactions.py
```

The source hash must match the reviewed original. Each new source cell is independently read from the indexed PNG, overlap-unioned, trimmed, scaled by nearest-neighbor 9/16 and mirrored. RGB values are partitioned into at most 16-color planes; all 11 additional frames happen to fit one plane each. The decoder independently reconstructs RGBA and compares against the separately transformed source-RGBA path: **9,549 opaque pixels + 20,530 transparent locations, zero mismatches, 182 opaque-black pixels retained**. Every original frame object and every unchanged clip are checked for equality. All 514 pre-existing cache/source files present at the initial revision run retained their hashes.

New registration uses an explicit approximate pelvis X and a separate authored clearance above the ground for fall frames. Consequently, airborne `anchor.y` can exceed the frame height intentionally. This makes the body rise then descend in the preview rather than pinning every rotation's lowest pixel to the floor. It is not a recovered source-game trajectory.

| Frame | Native size | Anchor (x,y) | Duration (60 Hz ticks) | Bottom clearance | Exact RGB colors |
| --- | --- | --- | ---: | ---: | ---: |
| 479 | 78×43 | (40,42) | 7 | 0 | 15 |
| 480 | 91×45 | (49,44) | 9 | 0 | 13 |
| 514 | 70×53 | (33,68) | 5 | 16 | 14 |
| 515 | 78×41 | (36,64) | 5 | 24 | 14 |
| 516 | 49×52 | (23,71) | 5 | 20 | 14 |
| 517 | 82×37 | (37,48) | 5 | 12 | 15 |
| 518 | 46×38 | (21,41) | 5 | 4 | 15 |
| 519 | 78×25 | (36,24) | 6 | 0 | 14 |
| 520 | 84×25 | (39,24) | 6 | 0 | 14 |
| 521 | 83×26 | (38,25) | 8 | 0 | 15 |
| 522 | 84×26 | (39,25) | 90 | 0 | 15 |

Hurt uses 479→480. KO uses 514→515→516→517→518→519→520→521→522. Both clips are non-looping; 522 is the grounded final pose. The native controller must separately demonstrate how it holds/clamps the terminal pose. All new collision bounds are explicitly labeled authored conservative frame bounds; they are not source collision data.

The 3× nearest `reviewed-reactions/contact.png` was visually inspected. It uses a shared ground line and registered pelvis X for every stage. `hurt.gif` and `ko.gif` are convenience looping previews of the authored durations; GIF looping does not change the non-looping clip contract. `proof.json` includes source/baseline/output hashes, coordinates, counts, independent equality assertions and preservation evidence.

- Baseline layered SHA-256: `6e07233ca90caf159471f24cac3e1e2f49684e5b8b30b137a5f5750d6aa2c44e`.
- New reviewed asset SHA-256: `e7003d930d66f132a15c70e508663f8ec599850395c557cbf6f5c93bd5143456`.
- Contact sheet: `/Users/shayaanazeem/Downloads/htncodex/htn-2026/data/reference-cache/spriters-resource/spider-man/reviewed-reactions/contact.png`.

No fighter module, core, quality/admission record, original source or old proof was modified. Native controller transition/terminal-hold proof remains a separate integration task. Original game states/order/timing remain unverified, and the commercial art remains private and unadmitted.

## Native integration completed

`node scripts/prove-fighter-layered.mjs --reviewed` runs the actual fighter with this separate asset revision and saves `fighter-reviewed-proof/proof.json`. It verifies every one of the 68 frames in both facings (136 comparisons, zero pixel mismatches) and retains the full clip set for the gameplay pass. The 1P CPU fight naturally triggers recoil stages479/480, all five fall phases, then the held grounded522 pose before game-over. The 2P pass reaches a P1 win with independent score ownership. Both runs have no runtime errors.

The controller now settles airborne fighters under gravity during round-end and keeps wide defeated sprites inside the horizontal stage boundary. Separate regressions cover a lethal hit during a jump and both players airborne at timeout, preserving scores/health while they land. In the natural source-art CPU capture, Spider-Man reaches the left corner; the full grounded body remains visible rather than clipping at x<0.

`fighter-reviewed-proof/native-overview.png` is a 2× nearest-neighbor presentation of actual native gameplay captures, not redrawn art. The source's existing orange/red palette and 9/16 spatial scale remain unchanged. These results validate the authored adaptation's rendering and reaction transitions; they do not establish original Marvel vs. Capcom move ordering, timing, balance or signature web behavior.
