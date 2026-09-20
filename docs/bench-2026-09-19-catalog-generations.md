# Saved Astra medium catalog generation audit

Eight real saved generations were audited, including their **historical bundled factory code**, their model-written customization, and their actual specs. Seven foundation compositions and one stored-art/custom-logic game reached their intended winning terminal state in the browser. The audit also found substantive defects that the short probe missed: solo kart rewards and completion feedback from AI racers, an oversized climber avatar that does not fit its level geometry, and weaker presentation/contract mismatches described below.

These are observations about the saved September 19 benchmark outputs. Later catalog fixes do not change these embedded game files. No generation, foundation, runtime, key, or live cabinet state was modified during the audit.

## Evidence and reproduction

- Script: [`scripts/audit-catalog-generations.mjs`](../scripts/audit-catalog-generations.mjs).
- Evidence directory: [`bench/audits/catalog-generations`](../bench/audits/catalog-generations).
- Run `node scripts/audit-catalog-generations.mjs` from the repository root. Playwright is resolved from the existing probe workspace. No model call, network fetch, or API key is involved.
- Optional argument selects a case substring, e.g. `kart-2p`. `breakout-native` runs the additional browser-feedback completion check.
- Every ordinary screenshot is the **unchanged saved game.js** running in an isolated headless Chromium runtime, loaded with seed 7 and the correct player count. Native PNGs are 256×224; `-4x.png` files are nearest-neighbor 1024×896 enlargements, not new artwork.
- An independent Node VM reads copied `inspect()` snapshots to plan physical button transitions. The browser replays only those inputs. No game object is teleported, no life/score/physics value is overwritten, and no progression shortcut is invoked. Each JSON includes source SHA-256, planned input transitions, telemetry, native runtime states/scores/errors, and screenshot frame numbers.
- Breakout's long open-loop trajectory diverged between Node and Chromium in its last formation. That replay correctly records a browser loss and `scoreMatches: false`; it is **not counted as a browser win**. A separate browser-local input policy completed all three formations. That diagnostic appends an in-memory update wrapper which reads `game.inspect()`, supplies `api.btn` for one call, restores it, and logs telemetry. It changes no stored source, configuration, physics, drawing, or game state. Its distinct result is `breakout-native-feedback.json`.
- Screenshots were visually inspected, including opening/attack fighters, both kart modes, climber ladders/barrels, Pong rally, Breakout damage and third formation, and stored-art ninja walk/dash.

## Results

| Saved output | Browser result | Substantive evidence |
| --- | --- | --- |
| GOTHAM CLASH, 1P | Win, 2–0 rounds, 23.3 s | Batman/Flash identities, punch pose, projectile special, round reset, CPU damage, score 3620. |
| GOTHAM SPEED, 2P | P2 win, 2–1 rounds, 41.4 s | Both indexed human control paths, attack/special poses, P1/P2 score 4130/4800. |
| NIGHT COAST, 1P | Win, 3 laps, 42.4 s including grid | Ordered gates, rivals, steering, drift/turbo, plus confirmed callback/scoring defects below. |
| NIGHT COAST GP, 2P | P1 win; both complete 3 laps, 50.6 s including grid | Separate shared-canvas views and indexed inputs; 8 aggregate drift boosts; scores 4001/4000. |
| KITTY KONG, 1P | Win, all 3 stages, 43.9 s | 16 barrels spawned, 9 ladder drops, 15 edge drops, 3 rescues, one hit, two lives left. |
| SPIN PONG, 1P | Win, 7–0, 61.1 s | 18 player returns, 18 charged returns, 28 wall bounces, longest rally 15, score 700. |
| CRACKOUT, 1P | Win with native feedback, 179.6 s | 160 accepted brick hits, 84 bricks destroyed, 3 formations, 2 pickups, 1 lost ball, 2 lives left, score 4495. |
| MOON NINJA, 1P | Win, 10 scrolls, 11.5 s | Actual stored blue ninja ART walk/dash poses; patrol damage, 2 lives lost, score 1100. |

No native runtime exception occurred in these scenarios. This establishes executable, completable games for these requests; it does not establish human fun, competitive balance, all seeds, audio quality, CRT hardware behavior, or universal composition safety.

## Confirmed defects and mismatches

### 1. Solo kart rewards rival progress and announces a rival's finish as yours

The historical kart module calls `onCheckpoint` and `onFinish` for all six racers. The generated solo wrapper does not filter `event.player`. In a solo game the runtime maps every score write to P1, so AI checkpoint awards add to the player's score. The foundation subsequently uses its own cached human score for absolute writes, removing some previously awarded AI points.

The no-input reproduction is decisive:

- Player distance remains **0**, lap remains **0**.
- First AI checkpoint produces **50 points at frame 445**.
- An AI finish produces **“COAST COMPLETE / TIME 0:41.56”** while P1 is still sitting on the start line, with 2700 points.
- All 60 AI checkpoint callbacks eventually grant **3000 points**; the player then loses on the 180-second timeout.
- In active play, native screenshots show `SCORE 475` and `HI 575` because an absolute human score update removes prior rival awards.

Evidence: `kart-1p-idle-audit.json`, `kart-1p-idle-audit-rival-finish-4x.png`, and `kart-1p.json` score event ledger. The ordinary human checkpoint itself awards a base 100 plus wrapper 50, but its banner reports only `+50`. The spec does not prescribe 50; the mismatch is between the presented award and actual total. The 2P wrapper explicitly describes its additions as extra rewards and filters nonhuman IDs, so it does not have the same rival-scoring bug.

### 2. Climber artwork fits the animation API but does not fit the game geometry

Astra generated a complete **28×44** worker set with idle/walk/climb/jump/hurt/death clips and supplied it through the supported `avatars[].sprites` option. This is real generated customization, not an ignored property. But adjacent floors are only about **34–36 pixels** apart, while the physics collision body is roughly **16 pixels tall** (`p.y - 16` in barrel collision).

The worker's head and upper body intersect the next girder even when standing normally; its visual body and collision body disagree. `climber-1p-ladder-4x.png` and `climber-1p-barrels-4x.png` make this visible. Its avatar frames also provide empty hurtbox arrays; these do not resize the foundation's physical collision body. The spec separately promises a white/pink kitten, while the reused default target is orange.

Recommended contract change: describe safe visual bounds, actual collision geometry and floor clearance explicitly; validate a custom avatar against the level's clearance or offer a coherent scaled-layout option. “Any frame up to 48×48” is not a sufficient composition guarantee.

### 3. Kart night art is only a partial transformation

The model does pass the supported `theme: "night"`, and the historical module uses it. The dark sky/ridge change is real. However, the ocean, grass, beach and road remain daylight-bright; the moon is a solid yellow block and the scene lacks the spec's dark cliffs, pale surf, headlights and warm harbor lighting. This is a gap in the foundation's theme coverage plus an overpromising spec, not an invented ignored configuration key.

The 2P gate ribbon occupies the lower central driving area and covers part of the player's kart. The long finish notice also competes with the lower driving status area. The top runtime score strip, lap counters and timer remain readable. See `kart-2p-checkpoint-4x.png` and `kart-2p-finish-banner-4x.png`.

The old kart also calls `sfx('win')`; the runtime silently ignores unknown named effects. This loses the finish cue rather than crashing. Both generated kart bundles retain that historical typo.

### 4. A few claimed details exceed the saved implementations

- The 1P fighter spec describes Flash's speed special as “always-available”; the factory requires and consumes **60 meter** for both projectile and dash specials. Character identity, directional guard, attack phases and rounds are implemented, but that specific promise is wrong.
- The kart spec implies rival pacing increases across the race and a distinct final-lap harbor/cliff peak. The saved track repeats every lap and the AI difficulty parameter is fixed. Three-lap progression works; those additional adaptive claims were not implemented by the wrapper.
- Breakout selects its crack sprite by **remaining HP**, rather than damage relative to original HP. Consequently ordinary one-hit bricks already look heavily cracked at first appearance. A three-hit brick does progress through more cracked states when damaged, but the distinction between “fresh weak brick” and “damaged tough brick” is unclear.

### 5. Balance remains weaker than execution correctness

The simple input policy beat solo Flash 2–0, finishing the second round with Batman at full health. The three-stage climber policy rescued every kitten without needing a jump, despite barrels being present and one collision. These are reproducible balance observations, not proof that no human will find the games challenging. They show why “probe passes” and even “bot reaches win” should not be the final quality metric.

## What did work

The seven foundation wrappers use real supported top-level configuration properties; no unrecognized top-level option was found. The model did not quietly request nonexistent `nightMode`, `driftEnabled` or similar options. Both fighter rosters reference actual bundled Batman/Flash animation sets. The kart tracks/drivers and callbacks are genuinely wired. The climber's new worker pixels really render. Pong's point hook and Breakout's custom formations both execute beyond the initial probe. The ninja calls `ART.get("ninja-adventure/ninja-blue")`, uses its directional walk clips and ability pose, and implements the requested top-down mechanics itself.

Pong scoring is one 100-point award per won rally; its visual-only hook does not duplicate it. Breakout's damage/score events remain distinct and it clears all 84 authored bricks. Ninja marks each collected scroll taken before awarding 100 or 150, preventing repeated overlap awards. No tested wrapper paints over the runtime's top score strip.

## Screenshots

These are actual generated outputs, not standalone foundation demos:

| Scene | Native / enlarged screenshot |
| --- | --- |
| Batman and Flash, opening | [native](../bench/audits/catalog-generations/fighter-1p-idle.png) · [4×](../bench/audits/catalog-generations/fighter-1p-idle-4x.png) |
| Fighter punch | [native](../bench/audits/catalog-generations/fighter-1p-attack.png) · [4×](../bench/audits/catalog-generations/fighter-1p-attack-4x.png) |
| Fighter projectile special | [native](../bench/audits/catalog-generations/fighter-1p-special.png) · [4×](../bench/audits/catalog-generations/fighter-1p-special-4x.png) |
| Solo coastal drift | [native](../bench/audits/catalog-generations/kart-1p-drift.png) · [4×](../bench/audits/catalog-generations/kart-1p-drift-4x.png) |
| Two-player coastal drift | [native](../bench/audits/catalog-generations/kart-2p-drift.png) · [4×](../bench/audits/catalog-generations/kart-2p-drift-4x.png) |
| Rival finish shown to stationary P1 | [native](../bench/audits/catalog-generations/kart-1p-idle-audit-rival-finish.png) · [4×](../bench/audits/catalog-generations/kart-1p-idle-audit-rival-finish-4x.png) |
| Climber ladder | [native](../bench/audits/catalog-generations/climber-1p-ladder.png) · [4×](../bench/audits/catalog-generations/climber-1p-ladder-4x.png) |
| Climber barrels | [native](../bench/audits/catalog-generations/climber-1p-barrels.png) · [4×](../bench/audits/catalog-generations/climber-1p-barrels-4x.png) |
| Pong rally | [native](../bench/audits/catalog-generations/pong-1p-rally.png) · [4×](../bench/audits/catalog-generations/pong-1p-rally-4x.png) |
| Breakout brick damage | [native](../bench/audits/catalog-generations/breakout-1p-cracked-bricks.png) · [4×](../bench/audits/catalog-generations/breakout-1p-cracked-bricks-4x.png) |
| Breakout third formation | [native](../bench/audits/catalog-generations/breakout-1p-stage-three.png) · [4×](../bench/audits/catalog-generations/breakout-1p-stage-three-4x.png) |
| Stored ninja art, walking | [native](../bench/audits/catalog-generations/ninja-1p-walking.png) · [4×](../bench/audits/catalog-generations/ninja-1p-walking-4x.png) |
| Stored ninja art, dash | [native](../bench/audits/catalog-generations/ninja-1p-dash.png) · [4×](../bench/audits/catalog-generations/ninja-1p-dash-4x.png) |

## Scope and next checks

This audit preserves all saved artifacts. Root owns any resulting fixes and admission decisions. The highest-value follow-ups are human-only hook contracts with exact reward ownership, art-to-level geometry constraints, truthful spec generation from the selected factory API, and native browser scenario tests that reach checkpoint/finish/rescue events. Human play and CRT viewing are still needed to assess feel and legibility; automated clears are evidence of viability, not a substitute for that review.

## Frozen sample identities

| Case | Saved run | SHA-256 of game.js |
| --- | --- | --- |
| fighter-1p | `2026-09-19-211144657-street-fighter-but-with-batman-a-qljlj3` | `2e851b81bf61453771c5a2ffca28822b0ccd2897ea2fd397e7d076e08c842dfc` |
| fighter-2p | `2026-09-19-211146666-street-fighter-but-with-batman-a-BKjcS0` | `0e5caf40013991e6dab9caa3c3b4e20cec619ebf457d58a3d13edcf32557dfc0` |
| kart-1p | `2026-09-19-211144675-a-kart-racing-game-around-a-coas-XuHLfP` | `083afb32489ae470c297694558312b9d570af4acbc264d2ba1503ceafe27381e` |
| kart-2p | `2026-09-19-211146680-a-kart-racing-game-around-a-coas-7dafTY` | `209a19605573da8abddda0f447eb67141d022a8b0aa8657893a4f7957f388b32` |
| climber-1p | `2026-09-19-212228451-donkey-kong-style-climb-a-constr-Ifg12N` | `8bfe3151361ca09cf4792a2f3a75e109dc20cd4a2940ede65cfc03e9242a98b3` |
| pong-1p | `2026-09-19-212228482-classic-pong-with-satisfying-spi-ViM0GJ` | `f21b7503635221724bdd6a3b1cd33018ce6ee6f3bce7b80395258f7f458860d3` |
| breakout-1p | `2026-09-19-212248206-breakout-with-three-brick-format-4ZaE5n` | `cbe00fd9c770104c10b5b221774ad89274b8366223630124dbf87f738469c333` |
| ninja-1p | `2026-09-19-212231442-a-top-down-blue-ninja-in-a-moonl-MkrhM9` | `bacd6410f2b1ec6ee7be03ab3ebc26be5a2691942d7cbe889e1587a3165efabe` |

Runtime bundle used for the final kart check: `697ecd39282c4a3613162a456df4227c9f71507144dda6b67bbe66cb53852101`.
