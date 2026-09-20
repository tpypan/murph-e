# Local implementation references

These are original project examples, not copies of commercial game source, complete
engines, or guarantees of visual quality. `maze-chase.js` contains an original maze,
ghost-house lifecycle, pathfinding helpers and two original pixel sprite frames.
`combat.js` contains shared attack timing, hitboxes and directional guard. The paired
Markdown files explain integration requirements and preserve user-requested changes.

The planner receives the relevant prose contract; the builder and repair call receive
both prose and code. Selection uses mechanics/transcript signals independently of the
open genre label. No network fetch occurs during generation. At most these two packs
are supplied. The full text and SHA-256 hash are saved as `implementation-context.json`
with each build. `HTN_REFERENCE_CONTEXT=0` disables this layer for comparisons.

Tests in `packages/harness/test/reference-context.test.ts` check pellet reachability,
house/door permissions, tunnel wrapping, every ghost's exit/capture/return/release,
valid sprite dimensions, damage/pose synchronization, one-hit accounting and guard.
These are component checks, not automated verification that the model integrated them.

Background research (not copied into the examples):
- https://github.com/floooh/pacman.c — readable recreation with house states and timing.
  It includes ROM-derived media; its code license is not a blanket asset license.
- https://github.com/ikemen-engine/Ikemen-GO — open-source fighting engine and documentation.
- https://www.spriters-resource.com/page/guidelines_sprites/ — sheet organization.

Future asset integration should store complete compatible animation sets with frame
rectangles, anchors, timing, palette, provenance and license. The current runtime
still consumes its original pixel strings; PNG atlas loading and a downloaded sprite
catalog are NOT part of this change. Do not present these examples as such a catalog.

New specs also record `referenceIntent` (reference, preserved features, requested
changes). Legacy specs remain readable. Builder instructions prioritize explicit
changes over conventional game rules and contradictory incidental spec details.
