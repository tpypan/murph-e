# Reusing saved games and their parts

Collection and verification run offline;
they never call a model or require an API key.

## What is stored

`data/catalog.sqlite` now indexes named functions, variable declarations, sprite
arrays and state from every saved source in `library/games`, `library/templates`,
`library/catalog`, `data/local-catalog`, `data/catalog/candidates` and `runs`.
Nested declarations are included and marked with their scope requirements.
Anonymous inline code remains in its enclosing fragment and the complete source.

The first backfill covered both this worktree and the original `htn-2026` checkout:
442 source locations, 271 distinct code versions, 24,987 declarations and 12,263
distinct snippets. These include 3,647 functions and 762 sprite-data declarations.
These are inventory counts, not claims of independently reusable behavior. Five
old runs contain truncated JavaScript: their original bytes and parse errors are
retained, but no fragments are exported from them.

Complete, immutable source copies live under `data/components/<sha256>/game.js`.
SQLite stores deduplicated snippets, line/offset locations, resolved dependencies,
scope blockers, source history, and available spec/license/provenance metadata.
Both the original games and the previous generation-usage evidence remain intact.
Unchanged code is parsed once per extractor version. Changed source gets a new hash.

Normal app generation queues collection after archiving complete build/repair
candidates and saving library games. Callers don't await this for readiness.
Collection failures leave the game playable and write `data/components/index-errors.jsonl`;
the offline backfill retries them. This is local deferred work, not a durable job service:
an interrupted process can leave indexing to the next sweep.

## Rebuild after pulling main

The SQLite file and immutable local history stay under gitignored `data/`.
The source games, verified foundation packs, schema, extraction code and evidence
are committed. On a fresh checkout, run `pnpm install --frozen-lockfile`, then
`pnpm catalog:rebuild` to index these sources offline. This also includes any
existing local saved runs and local catalog entries without deleting component
history. A fresh clone has fewer historical source versions than the development
database because private runs and generated candidates are not published.

The assembler reads verified pack files directly, so new catalog games work even
before rebuilding the optional SQLite search inventory. API keys remain local.

## Commands

Run from the repository root:

```sh
pnpm harness components index
pnpm harness components find "sky-karts" --limit 30
pnpm harness components find "sprite-data"
pnpm harness components export <component-id> /tmp/reviewed-part.js
```

`components index /absolute/path/to/another/repo` reads that checkout's collections
into this worktree's database, without modifying the other checkout. A sweep with
parse errors returns nonzero and retains the valid sources and error report.
`data/components/inventory.json` contains the latest sweep and aggregate counts.

Export includes a closed dependency graph and a provenance sidecar. It preserves
declaration order and refuses missing dependencies, mutable shared globals, nested
captures, computed initialization and unresolved external bindings. It checks the
archived source and snippet hashes, and never executes a fragment. A closed graph
can still mutate its arguments or contain undesirable game behavior: export status
is always `needs-review`, never automatic runtime approval.

## How collection becomes faster generation

Review a useful group of fragments, make state local to an instance, document its
settings and behavior, and add a catalog factory with behavior, runtime and visual
evidence. The existing `ARCADE.<entry>(config)` assembler bundles the tested source
directly. Astra receives the API contract and writes only the needed customization.
Unreviewed inventory is not inserted into prompts, so collecting more history does
not make every model request larger or promote broken code.

The first new reusable factory is `ARCADE.skyRacer(config)` in
`library/catalog/sky-racer`. It packages plane movement/art, altitude, AI rivals,
boosts/items, hazards, checkpoints, laps, HUD, scoring and cup results. Its demo is
170 characters; the assembler supplies roughly 32 KB of implementation. Supported
settings include rival speed, boost cooldown, names and the player's palette.
It is single-player overhead racing; unsupported mechanics still require new code.

The exact request “i want to create a game like maria cart but instead of cars use
planes” matches this historical foundation in offline retrieval. New generation
now requires both player counts, so it excludes the 1P-only plane racer until
that pack gains verified 2P support. The request parser
now separates the removed cars from the desired planes. Jev may choose among the
eligible verified foundations as before; no new live model test was run for this change.

## Verification

- 168 offline harness tests pass, including extraction, dependency closure, metadata,
  history/deduplication, deferred indexing, tamper detection, and routing regressions.
- Harness and cabinet TypeScript checks pass; the local app responds HTTP 200.
- `node library/catalog/sky-racer/verify.mjs` exercises controls, state isolation,
  reset, bounded settings, scoring and complete cups reaching victory and defeat.
- From `packages/harness`, `node --import tsx ../../scripts/verify-sky-racer.ts`
  checks runtime compatibility, pixel/score equivalence to the preserved source,
  and 150-second default/custom gameplay runs. Screenshots at 2/15/40 seconds and
  results are saved under the pack's `verification/` directory.
- Visual review confirmed distinct planes, a readable HUD/results screen and the
  configured player palette. Evidence hashes in `quality.json` bind catalog admission
  to these specific files. Changing the pack requires renewed checks and review.

The 170-character example demonstrates avoided code emission, not a measured new
API latency. Full-game quality and the suitability of each extracted fragment still
need review before broader reuse.
