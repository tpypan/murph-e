# Next arcade foundations

Updated 2026-09-20 after the user narrowed the catalog to normal arcade games.
This list supersedes the broad kitchen/mining/RPG/card-game suggestions in the
older coverage brainstorms. Priorities are engineering judgment about missing
mechanics, not a measured popularity ranking.

Every addition must use the cabinet joystick and A/B, support solo and local 2P,
start quickly, have a readable objective/score, and finish a short round.

| Priority | Arcade game family | Missing reusable parts | Solo / 2P |
| --- | --- | --- | --- |
| 1 | Side-scrolling run-and-gun | Scrolling camera, jump buffering, platforms, directional fire, weapon drops, encounter gates, boss patterns | Smaller solo encounters / two independent co-op actors |
| 2 | Scrolling street beat ’em up | Depth-lane movement, multi-enemy melee, hit stun, knockback, grabs, crowd spacing, health pickups | Solo balancing / co-op with separate health and scores |
| 3 | Bubble shooter / match puzzle | Aim preview, wall bounces, hex-grid snapping, connected-group removal, unsupported-cluster drops, pressure and top-out | Solo score attack / independent competitive boards |
| 4 | Pinball | Flippers, bumpers, ball restitution, sensors, launches, drains, multipliers and multiball | Solo table / alternating full turns or separate tables; turn-aware tests required |
| 5 | Arcade football / air hockey | Actor-ball collision, kicks/possession, goals, serves, clock and CPU opponent | CPU opponent / versus |
| 6 | Single-screen action platformer | One-way and moving platforms, jump/stomp/trap rules, collision-safe enemy spawns, clear-screen progression | Smaller solo waves / co-op |

Existing sources that can be promoted sooner, after actual 2P redesign and review:
Snake, flap/thrust-through-gates, catch-and-dodge and a short obstacle runner.
Also upgrade the existing plane racer to genuine 2P; its old 1P admission is not
eligible for new multiplayer-first generation.

## Added in this iteration

- **EMBER WATCH** (`arena-survivor`): single-screen monster wave shooter, aimed
  projectiles, dash, bounded upgrades, health drops, guardian and co-op revives.
- **KEYSTONE KEEP** (`dungeon-gauntlet`): short Gauntlet-style room shooter with
  monster clearing, persistent objective keys, consumable door unlocks, treasure,
  room transitions and a final guardian. No campaign or RPG systems.

The shared source is `library/mechanics/expedition-kit/kit.js`; each shipped pack
bundles its own immutable copy and original wizard/monster/pickup art. This adds
reusable top-down collision, visibility-aware targeting, grid pursuit, telegraphed
shots, wave scheduling, score ownership, revive and key/door progression.
These are verified whole-game contracts. Harvested individual functions remain
review candidates, not independently verified mix-and-match modules.

## Engine work justified by these gaps

1. A scrolling world/camera and tested platform collision module for run-and-gun
   and platformers, with explicit two-player camera rules.
2. Scenario-based acceptance for real mechanics: hits, goals, doors, matching,
   turn handoff, victory/loss and reset. Input response alone is insufficient.
3. Contracts for reviewed mechanic modules: dependencies, input/state ownership,
   update order, safe configuration and art/geometry requirements.
4. Turn-aware multiplayer verification before alternating pinball/golf or other
   turn-taking games; the current early-input checks assume simultaneous play.
5. Complete action-specific art and bounded entity/per-frame costs per game.

Do not implement generic crafting, persistent RPG progression, card campaigns or
open-world survival merely to grow the component count.

## Verification and inventory

Both new packs are admitted with content-bound behavior, visual, runtime and full
match evidence in their `verification/` directories. Thirty behavior checks cover
twelve default completed matches across three seeds; four native browser replays
match exact scores/events and reset correctly. Default native matches take 41.92–
65.67 seconds. These are simulated play times, not generation timings.

The active catalog now has 16 verified foundations (15 support both modes; the
historical plane racer remains solo-only) and 60 indexed sprite records. The two
packs share seven original sprite sets, indexed under each pack. SQLite preserved
all prior source history and added two source versions / 294 declarations, yielding
274 source versions, 25,469 declarations and 12,379 distinct snippets. Individual
extracted declarations still require review before independent reuse.

Offline retrieval checks confirm both new contracts reach the deterministic and
Jev candidate menus, unsupported core mechanics abstain, and the full Jev request
stays within its configured budget. No paid generation, model or speech API calls
were used for this work.
