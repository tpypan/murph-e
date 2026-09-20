# Curated game foundations

These are reusable, locally authored game implementations and animation sets.
Verified games are also playable from the home carousel. The cabinet can create
new games from spoken requests and always waits for PLAY before starting a run.
`library/assets/` additionally contains a source-checked CC0 art set.

## How generation uses them

1. Select at most one relevant, verified foundation compatible with the cabinet's
   1P/2P choice. Unrelated requests keep the open-ended code writer.
2. Give the planner and Astra the actual `api.md` configuration/hook contract.
   Do not spend model output tokens reproducing tested source or pixel rows.
3. Astra writes `init/update/draw` wrappers and the requested customization.
4. Link only referenced `ARCADE.<entry>` factories into a standalone `game.js`.
   Relevant verified or source-checked sprite sets are available through `ART.get(id)`;
   its original pixels and normalized animation/geometry metadata are linked too.
5. Run the ordinary input/runtime probe and bounded repair. Repair receives the
   customization and contracts rather than the entire generated bundle.

The live build screen can render the selected foundation or saved sprite animations
before code tokens arrive, clearly marked DRAFT. When a complete customization can
render, it replaces the base preview in the isolated worker. This is a real asset
preview, not a claim that the model has finished those lines.

Sprite retrieval matches positive character identities, excludes explicitly
negated identities, and checks camera and required animation coverage. A fighter
request cannot receive a walk-only source import. Complete compatible originals
remain available when source art lacks the necessary states. Bundled foundation
art is not offered again as a separate set. Shared franchise tags alone never
select an unrelated character or prop.

## Files, SQLite and provenance

Each foundation directory contains a manifest, factory module, model-facing API,
demo/spec, original asset data, authoring sources and test/render evidence. Source
files are authoritative. `data/catalog.sqlite` is a disposable index plus durable
generated-candidate history. Its `sprite_sets` rows include actual saved pixels,
60 Hz frame timing, anchors, rectangular/circular collision shapes, coordinate
conventions, unsupported states and provenance.

Every completed build, repair, remix and remix-repair output is archived before
validation under `data/catalog/candidates/<code-sha256>/`. The database deduplicates
identical code but preserves each attempt's immutable prompt, spec, model/effort,
raw output, selected foundation and sprite hashes. Validation events retain pending,
passed, failed, error or cancelled outcomes. A probe exception cannot discard the
emitted code. Candidates start **quarantined**. Passing a
crash/input probe never promotes new code to a reusable foundation. Capturing a
candidate does not automatically extract a general-purpose mechanic from it.

Offline reviews preserve exact code/evidence hashes and append-only findings
about controls, rules, identity, presentation and other observed problems. The
`candidate`, `review` and `findings` commands expose these records without
promoting the game or feeding unreviewed text into a generation prompt. See
[candidate review](../../docs/research/candidate-review-feedback.md).

```sh
pnpm harness catalog list
pnpm harness catalog index
pnpm harness catalog sprites
pnpm harness catalog candidates
pnpm harness catalog preview maze --players 2
```

Preview writes an isolated run; it does not publish or promote the pack. Malformed
or incomplete packs are excluded and diagnosed without taking other generation
offline. `HTN_CATALOG=0` disables retrieval for comparison.

## Admission

`manifest.quality.status` is only descriptive. The loader requires `quality.json`
with the current content hash and hash-bound evidence for behavior, visual review,
and the actual runtime probe for **every** advertised player count. Editing the
factory, API, manifest or declared assets/files invalidates admission. Evidence
edits also invalidate it. Run the family-specific behavioral suite, real runtime
play-through, and inspect native screenshots before recording a new review.

Private, locally reviewed adaptations can live under the gitignored
`data/local-catalog/<id>/` directory. Default discovery combines this directory
with `library/catalog/`; passing an explicit directory to `loadCatalog(dir)` keeps
that read isolated. Local packs use exactly the same manifest, content hashing,
and behavior/visual/1P/2P evidence requirements. Cached source URLs or downloaded
sheets alone never grant admission. Missing local data is normal. Duplicate IDs
across roots exclude **all** claimants with a diagnostic, so give adaptations
distinct IDs. Roots and pack directories cannot be symlinks; referenced files
and evidence cannot escape the pack through traversal or symlinks.

A named adaptation can declare `match.requirePhrase: true` to require one of its
phrases even when its genre matches. `match.priority` is an integer from 0 to 10
(default 0), used only after semantic scores tie; it cannot create a match or
beat a more specific match. For example, a local Donkey Kong adaptation can use
`phrases: ["donkey kong"]`, the original climber's genres, `requirePhrase: true`
and `priority: 1`. Generic barrel games still select the original. Draft or stale
local adaptations remain unavailable, allowing the verified original to match.

```sh
pnpm --filter @htn/harness exec node --import tsx ../../scripts/verify-catalog.ts maze
```

Loose art uses a separate `source-checked` status, bound to normalized data,
original source bytes, license and integrity/visual/provenance evidence. This
status establishes the supplied art contract, not game balance. Walking poses
are not advertised as full attack or hurt animations. Palette swaps cannot
silently stand in for an unsupported named character.

## Scope

External art discovery lives in [the source registry](../sources/README.md): 19
game pages and 92 selected sheet references, searchable with
`pnpm harness catalog sources "spider man"`. SQLite indexes these in separate
`reference_games`/`reference_sheets` tables. Thirteen source PNGs are cached locally;
discovery or download does not grant runtime-ready sprite admission. Reviewed private
Donkey Kong, Pole Position, Pac-Man, Sonic, Spider-Man and Atari Batman art adaptations bring the
local collection to 19 reviewed packs across 13 game families and 67 sprite sets.
These totals include private source material only on this machine. Some sprite
sets are props or partial pose collections, not complete fighting characters.

The active target is 10–15 distinct families, with lightweight implementation,
recognizable structure, fair bounded difficulty, real terminal/reset flows and
complete relevant animation states. Progress and remaining work live in
`docs/plans/curated-arcade-library.md`. Admission is not a claim of commercial
Street Fighter fidelity, human-tested balance or physical CRT calibration.
