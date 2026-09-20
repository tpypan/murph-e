# Curated Arcade library

The library supplies reusable arcade mechanics and animation assets so a new game
can focus on the requested changes. It is a starting point, not a closed genre
list or permission to replace an unsupported idea with a different game.

## Development and billing

Follow the [repository billing rule](../../AGENTS.md#user-billing-rule--takes-precedence-over-historical-benchmark-instructions).
Assistant development, iteration and testing use Codex and offline tools; no paid
API requests without new explicit user authorization. Real cabinet users may
still generate through the app API. Do not use that route to bypass the rule.

## Architecture

- Reviewable files are authoritative: each pack contains its factory, API
  contract, assets, demo, provenance and evidence. SQLite indexes these files and
  retains generated-candidate history; it is not a substitute for source files.
- Retrieval supplies at most one relevant, admitted foundation plus compatible
  sprite sets. The builder receives their contracts and writes customization.
  Referenced `ARCADE` factories and `ART` data are bundled into one `game.js`.
- Preserve explicit user changes. Foundation controls, scoring and terminal rules
  govern defaults; new mechanics require actual supported hooks or new code.
  Character names, labels and palette swaps do not create missing character art.
- Animations carry real pixels, frame durations, anchors, collision conventions,
  palettes and provenance. Complete compatible side-view sets can supply the
  fighter contract through `ART.get(id).character()`; partial sets cannot.
- Completed build, repair and remix outputs are archived before validation.
  Identical code retains separate attempt metadata and outcome history.
  Candidates remain quarantined until independently reviewed; a probe pass does
  not automatically admit code, extract reusable mechanics or train the model.
- Playback stays lightweight: no game-time imports, external assets or network.
  Draft previews are isolated; the playable game waits for the player's START.

## Supported collection

The public repository contains 13 mechanics families: fighting, kart racing,
maze chase, barrel climbing, Pong, Breakout, formation shooting, Asteroids,
road/river crossing, bomb arenas, falling blocks, missile defense and momentum
platforming. Each advertises 1P and 2P with family-specific behavior evidence.

The final 2026-09-19 audit also covered six private source-art adaptations,
bringing that machine's inventory to 19 packs and 67 sprite sets. These totals
include props and partial poses, not 67 complete characters. Private commercial
art stays under ignored local data paths and is absent from a clean checkout.
See the [catalog guide](../../library/catalog/README.md) for discovery, indexing,
composition, admission commands and the distinction between source art and games.

## Evidence and limits

Content hashes bind admission to behavior, native rendering and runtime/input
proofs for each advertised player count. Changes invalidate that approval.
Source-checked art establishes pixels and metadata, not recovered commercial
physics, timing or human-tested balance. Sound checks establish reachable
procedural cues, not physical speaker tuning.

Arbitrary hybrid composition and faithful new mechanics still need verification;
short probes cannot prove them. Historical generation timings are observations,
not latency guarantees. Human balance and physical CRT/controller acceptance
remain unverified; the 2026-09-19 audit also records a 320×240 scaling limitation.

- [Completion audit and evidence limits](../research/goal-completion-audit.md)
- [SQLite and sound audit](../catalog-and-audio-audit.md)
- [Candidate reviews and feedback](../research/candidate-review-feedback.md)
- [Source registry and rights](../../library/sources/README.md)
- [Current CRT design guide](../design-guide.md)
