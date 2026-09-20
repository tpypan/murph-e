# Private Sonic native verification — 2026-09-19

The private `data/local-catalog/sonic-speed-reference` adapter is verified against its exact content hash. The four actors in `data/local-assets/sonic-two-reference` are source-checked. This imports actual Sonic 2 art, not the ROM, original game timing or an assertion of fighter readiness.

`node scripts/build-sonic-local-catalog.mjs` assembled the reviewed source art with the final original speed-platformer module. Rebuilding changes the hash and requires running the proof/admission again.

`node scripts/prove-sonic-local.mjs` runs the native browser runtime with every non-file request blocked. It records real runtime button inputs, without mutating gameplay state. Three routes finish both original acts at tick960 after the scenery/route polish: 1P, 2P with P1 winning, and 2P with P2 winning. The other player receives a45-tick starting delay. All routes have zero runtime errors. The input controller reads inspect data to jump gaps/enemies and roll while traveling; these are deterministic route proofs, not human playtesting.

All46 source frames (38 hero frames across12 clips plus8 ring/checkpoint/goal frames) are tested facing right and left through the native controller sprite renderer.92 comparisons report zero RGB/transparency mismatches and zero clipped pixels. Each individual source PNG is inserted through the public hero configuration for this exhaustive render fixture; object placement during gameplay is additionally visible in screenshots. Native black and transparent backing remain distinct. Original source-crop equality and hashes are retained in import-integrity.json. Animation timing, anchors and boxes remain explicitly authored.

The complete source contact and representative native1P/2P views were visually inspected: hills, physical loop, second act and completion. Sonic remains identifiable in both split views. Source Sonic rings, checkpoints and goal coexist with original project terrain, scenery, enemies and springs.

`pnpm --filter @htn/harness exec node --import tsx ../../scripts/check-sonic-local.mjs` binds evidence hashes to source and adapter quality records and reopens both catalogs to assert their admitted statuses. It fails if source, adapter, render proof or route screenshots differ from recorded evidence.

Private evidence is under `data/local-catalog/sonic-speed-reference/evidence/`: routes.json, pixels.json, review.json and18 gameplay PNGs. Useful views:1p-130.png,2p-192.png,2p-700.png,2p-1200-p2win.png. Source review/contact: `data/local-assets/sonic-two-reference/evidence/`.

Sources: [Sonic sheet10073](https://www.spriters-resource.com/sega_genesis/sonicth2/asset/10073/) (Triangly, with Tiaremoana credited) and [Common Objects85563](https://www.spriters-resource.com/sega_genesis/sonicth2/asset/85563/) (Tiaremoana). Original downloaded sheets and metadata remain private and hash-bound. No paid model API, live generation or network service was used for these proofs.

## Cabinet and retrieval integration

The cabinet carousel offers **SONIC: COAST DASH** immediately after the kart and fighter. Both 1P and 2P are playable local demos; loading one does not call a model. The generic original foundation remains **AZURE DASH** for requests without Sonic's identity. Explicit positive Sonic requests retrieve the private source-art adapter; unrelated Sonic kart/fighting requests are not forced into this platformer.

`data/catalog.sqlite` now indexes 18 admitted game packs, 66 sprite sets, and 92 reference sheets across 19 source games. These counts describe this local checkout. The public source registry merges the existing arcade manifest with the new DC arcade and Sonic Genesis manifests. Exact source hashes and sidecars distinguish downloaded sheets from discovery links. Source discovery never grants game admission.

The same update adds the fighter's independent P1/P2 picker, and build guidance asks future multi-character fighters to use it. The newly imported DC arcade sets are partial source actors; the current picker uses the existing complete Batman/Flash sets. See [DC import coverage](dc-arcade-imports.md).

Rebuild metadata without generation: `pnpm --filter @htn/harness exec node --import tsx src/cli.ts catalog index`. This does not erase generated candidates. The offline sound audit passed all 101 currently indexed game/mode/template checks, including both modes of the new packs.
