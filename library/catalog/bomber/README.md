# Grid Bomb Arena

Original complete bomb-arena foundation for the 256×224 cabinet. `module.js` is an import-free factory expression bundled as `ARCADE.bomber(config)`. `demo.js` constructs it inside init. `api.players` selects solo or independent two-player play. The full supported option list, defaults, limits and event/overlay hooks are in [api.md](api.md); no unlisted customization keys are accepted.

The game has buffered tile movement, one-way escape from placed bombs, exact visible fuses, cross blasts blocked by pillars/crates, chained detonation, per-owner bomb capacity, delayed pickups, three distinct enemy movement policies, contact and blast damage, respawn immunity, lives, a visible locked/unlocked lower-center exit and level progression. Two-player versus counts wins over reset arenas; co-op has separate lives, inputs and scores with shared progress. Default co-op ignores a teammate's flames but preserves self-blast danger. All modes have clock limits and explicit runtime terminal calls.

The original pixel assets include both players' four-direction idle/walk animations, three enemy walk sets, bomb pulses, all three connected blast shapes, crate art, three pickup icons and a complete death burst. Assets contain palette indices, durations, center anchors and relative collision boxes. The code uses fixed tile geometry; sprite boxes document matching visual/actor bounds, rather than claiming an external physics atlas. `build-assets.mjs` is the original geometry source. No game ROM, extracted sprites or commercial source was used. The art is a compact original foundation, not commercial Bomberman fidelity.

Rebuild and verify:

```
node library/catalog/bomber/build.mjs
node library/catalog/bomber/verify.mjs
node library/catalog/bomber/screenshots.mjs
node library/catalog/bomber/default-native.mjs
cd packages/harness
node --import tsx ../../scripts/verify-catalog.ts bomber
```

Eight behavioral suites cover immediate independent inputs, walls and safe starts; ownership/capacity and one-way leave; exact fuse and chained cross blasts; crate blocking/score/delayed upgrades; self-blast/lives/immunity/terminal; a full real-input solo clear with all three default enemy roles and the default crate layout; two complete 2P versus wins and round reset; cooperative damage policy and two-level completion; and bounded draw termination. `route.mjs` only reads snapshots to plan and sends ordinary button events. It cannot mutate game state. Replays are serialized and executed again in the actual browser runtime, with exact score/terminal assertions. The actual repository declared-controls probe runs separately for 1P and 2P.

Evidence is stored under `evidence/` and `verification/`. The solo skill replay uses lives9/time180/levels1 to accommodate the automated player, while retaining the default layout and all three enemy roles. Co-op completion uses enemyCount1/crateDensity0/lives9/time180 across two levels; the independent default-layout suite covers obstruction, and the versus replay covers two active participants' lethal mechanics. The versus skill replay uses an open board to isolate genuine bomb escape, kill, win and round reset. These are functional proofs, not a claim that the default difficulty is fully balanced. No physical CRT, human fun study or commercial asset comparison has been completed.

Known bounds: eleven-by-nine board, five enemies maximum, no scrolling, enemy bomb planting, arbitrary map, arbitrary roster or network play. Enemy roles are compact corridor heuristics, not search-heavy tactical agents. A tied versus clock or simultaneous knockout ends as gameOver because the runtime has no draw-specific overlay. A separate human difficulty pass is still appropriate. Leave the manifest draft until the catalog owner reviews the hash-bound behavior, runtime and visual evidence.

## Default-settings completion evidence (2026-09-19)

`default-test.mjs` and `default-native.mjs` add separate, unassisted settings proofs; the older assisted fixtures above retain their original labels. Solo config `{}` clears both default levels and all seven enemies in 5,512 frames with one of three lives remaining, within each 100-second clock. Versus config `{}` clears the normal crate layouts over three rounds in 4,740 frames, records winners P2/P1/P1 and final wins `[2,1]`. Both controllers navigate, place bombs and earn crate points in their winning rounds; the opposing target stays still. This proves normal-settings completion and input/score ownership, not adversarial balance.

The optional cooperative route changes only `{mode:'coop'}`. P1 clears both default levels after idle P2 is eliminated, so this is a carry/transition regression, not a two-active-player cooperation proof. It reproduced a bug where arena reset revived a player at zero lives, causing negative lives. Reset now preserves elimination across levels. Native evidence includes independent movement checks and actual runtime reset restoring level one, scores, living players and an empty bomb list.

All controllers plan from detached observations and emit ordinary button edges; they do not modify game state, enemies, clocks, lives or board layouts. The 11 behavior checks and saved default replays remain offline. Human difficulty and physical CRT acceptance are still unmeasured.
