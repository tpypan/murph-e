# v4.4 palette benchmark — partial failure observations

This is a bounded read-only inspection of completed failed samples while the standard benchmark is still running. It is **not the final benchmark report or a pass-rate estimate**. At inspection, no final `palette-v44` result file had been written. Root owns aggregate totals. No frozen game, prompt, factory or runtime was changed, and no generation/probe was rerun for this audit.

## FROG CROSS: retrieval miss and a redundant declared control

- Run: `2026-09-19-222114269-a-game-where-i-m-a-frog-dodging-jF7L9P`.
- Request: “a game where I'm a frog dodging cars that get faster”.
- Bundled game SHA-256: `b00e3041150d6bb131f75305f1180f96742c9c296aa6794b5e1e91a856665495`.
- Stored probe: loads, survives, draws and moves all pass. Hard failure: `responds:a = false`; DOWN at the bottom boundary is a soft no-motion observation.
- `catalog-context.json.parts` is empty. The spec genre is `arcade traffic-crossing`.

The crossing foundation supports the core requested frog/traffic/escalation loop, but retrieval compares exact normalized phrases and exact genres. Its phrases are `frogger`, `road crossing`, `river crossing`, `cross the road`; its genres are `crossing`, `road crossing`, `river crossing`, `frogger`. None matches this transcript or the generated genre `arcade traffic crossing`. The builder therefore received no `ARCADE.crossing` contract. This is a catalog retrieval miss, not evidence that the foundation itself failed.

The planner adds A as “hop in the currently held direction.” In `customization.js:254`, movement is already requested whenever a direction is held; the next line sets the same flag to true on A **only when a direction is already held**. A alone does nothing, and A plus a direction does nothing additional. This is a control/spec mismatch, not a color failure. The user did not request that extra button. The frog calls the legacy three-argument `api.spr`; no custom palette is supplied.

Suggested follow-up, not implemented here: add a bounded mechanics-aware retrieval case for frog + cars/traffic (plus synonymous crossing genre tests), and keep unused buttons null. A declared action should have a distinct effect in a reachable state; do not invent a redundant confirm action just to fill a control slot. Preserve intentionally different requests rather than broadly mapping every frog or vehicle mention to crossing.

## TANK DUEL: ragged rows become invalid custom-palette indices after rotation

- Run: `2026-09-19-222117732-tanks-in-an-arena-last-one-stand-mMwDZe`.
- Request: “tanks in an arena, last one standing wins”.
- Bundled game SHA-256: `da4abff331f3fb90608b5f72b140f538598a6fb72019487e4bd2184b6bc668d5`.
- Stored probe: load succeeds, then every relevant draw path fails with `Sprite pixel index f has no color in its 8-entry palette`.
- No matching foundation was selected. The catalog has no tank-combat factory; a generic fighter would not implement directional tank movement, shell geometry and arena cover simply by changing labels.

The API prompt already explains 1–16 palette entries, local indexing, complete RGB strings, and out-of-range errors. The model supplies valid eight-entry BLUE/RUST palettes and a valid five-entry FIRE palette. **Every directly written sprite index fits its intended palette.** This is not simply an author typing `f` into an eight-color sprite:

1. `RUST_HULL` has 20 rows. Zero-based rows **6 and 13 are 23 characters**; all other rows are 24. `BLUE_HULL` is consistently 24 wide. Turrets and fire sprites are rectangular.
2. `rotateArt()` (`customization.js:104–111`) iterates `src[0].length` and concatenates `src[y][x]` without validating row lengths or missing values.
3. The missing cells become the literal string **`undefined`**. A read-only reproduction of this transform produces the row `......undefined......undefined......` (36 characters instead of 20).
4. Subsequent rotation exposes the word's hexadecimal letters `d`, `e`, and `f`; one resulting row is `f1233554233333333245321.`.
5. P2 starts facing direction 2 (`customization.js:143`), so its already-rotated malformed hull reaches `api.spr(..., palette)` on the first draw (`customization.js:492`).

The new palette guard correctly rejects index 15 for a palette whose highest slot is 7. The underlying ragged-art/unsafe-transform defect is independent of the palette extension; the old permissive fixed-palette path would interpret the same accidental letters as visible colors instead of reporting this range error. This sample therefore exposes a **real integration/usability risk for optional palettes**, while providing no evidence of incorrect RGB rendering or palette caching.

Suggested targeted safeguards, not implemented here:

- Preflight authored sprite rows for equal length and the exact `.`/hex alphabet before any transform. Test generated rotations too, not just source literals.
- Require rotation helpers to reject invalid source geometry or explicitly pad missing cells as transparent. Never concatenate unchecked `undefined` into pixel rows.
- For every concrete sprite/palette pair, including transformed poses, check the largest used index against palette length. Include the failing sprite/pose in diagnostics when possible.
- Keep the strict runtime error rather than silently extending a palette, mapping to nearest colors, or ignoring bad indices. A repair should fix the malformed data/transform; changing palette length would hide the underlying corrupted geometry.
- Add this ragged-row rotation fixture as a regression alongside legitimate eight-color sprites and legacy no-palette compatibility.

The stored probe is enough to establish the crash; this audit only reproduced the pure string rotation to trace its cause. It did not execute or mutate the cartridge.

## Boundary of these observations

These are two specific failed samples, not overall v4.4 conclusions. The same initial batch includes successful selected-foundation examples, but this audit does not claim their complete mechanic or art quality from a short probe. In particular, a catalog retrieval miss, an invented control, and malformed transformed sprite data need different remedies; none justifies claiming the per-sprite RGB renderer generally failed.

## Regression retained

The minimal `bench/known-bad/ragged-palette-rotation.js` fixture preserves the ragged-row/rotation failure. `packages/probe/scripts/palette-probe.test.mjs` verifies it fails as a hard draw error, and that repairing only the short row produces a valid eight-color cartridge responding to all directions and shooting. Both tests pass in Chromium; the frozen TANK DUEL sample is unchanged. The normal `pnpm test:probe` command includes this regression.
