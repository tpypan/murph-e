# Catalog expansion by reusable capability

> Updated scope: prioritize familiar arcade loops. The [current arcade-only build order](arcade-catalog-next.md) supersedes broad RPG, crafting, mining and card-game suggestions below. The arena and short Gauntlet-style shooter have now been implemented; see their verification artifacts.

Audited 2026-09-20 on `codex/jev-experiment`. This is a source, contract, database and offline routing audit; it does not certify the play quality of all saved games or measure real visitor demand. No paid model calls were made. Proposed request examples below are coverage hypotheses.

## Multiplayer requirement added after this audit

Every proposed seed, promotion and shared gameplay module must be designed for
both solo and local two-player use from the start. Specify co-op or versus,
independent input/state, solo adaptation, camera and score/life/end/reset rules.
Examples: survivor/dungeon/kitchen/mining use co-op; racing/sports use versus;
Snake/Flap can use independent racing or score competition; catch/dodge can share
the playfield with explicit ownership. Puzzle games need independent boards or
meaningful cooperative roles. Those are starting choices, not permission to
ignore a user's requested mode.

Passing both runtime/input modes is required for new generation. Full behavior
and visual review for both modes is required before reusable admission. Existing
single-player sources below are migration candidates, not ready promotions. The
1P-only sky-racer cannot be selected by the new generation policy until upgraded.
See [multiplayer-first implementation](multiplayer-first.md).

## What is actually available

The active loader admits **14 foundations**, with no diagnostics: Asteroids, Bomber, Breakout, Climber, Crossing, Falling Blocks, Fighter, Formation Shooter, Kart, Maze, Missile Defense, Pong, Sky Racer and Speed Platformer. Thirteen support 1P and 2P; Sky Racer supports only 1P. These cover a substantial range of classic arcade loops.

The active branch also has **57 saved games** and **46 indexed sprite sets**. A sprite set may be a prop, combined sheet or partial pose collection; it does not necessarily supply a complete playable character. Six additional source-art adaptations exist under the original checkout's `data/local-catalog`, but this branch's loader does not discover them. They mostly extend existing families rather than add new mechanics. Older documentation's totals of 19 packs / 67 sprite sets describe that other checkout, not this branch.

SQLite holds **272 source versions, 444 source locations, 25,175 declarations and 12,268 distinct snippet blobs**. There are 3,677 function declarations and 767 sprite-data declarations. Every extracted declaration has `needs-review` status. Bundled copies, variants, failed attempts and nested declarations contribute to these counts. 19,262 declarations have a nested-scope blocker. Even a declaration with no direct blocker can have blocked dependencies or unsuitable behavior.

The ready-to-bundle interfaces are the verified `ARCADE` foundations and compatible `ART` assets. Raw component inventory is not automatically selected or linked. `catalogContext()` supplies **at most one foundation**; recognized multi-family requests are excluded from that selection. Jev chooses among eligible foundations and optional presets, not arbitrary harvested functions.

The plane benchmark demonstrates the benefit of a complete matching foundation: 242.12s to 15.52s, with 27,856 versus 217 generated code characters. It reused the same gameplay and art; it is not evidence that unrelated games will have that latency.

## Immediate gains from games we already have

These are packaging candidates, not pre-approved reusable engines. Review actual behavior, make state per-instance, expose a small contract, and revalidate before admission.

| Foundation to add | Existing starting material | Components worth retaining | Requests it could cover |
| --- | --- | --- | --- |
| Snake / growing trail | `library/games/train-snake` and `train-snake-2` | Buffered grid turns, occupancy map, body/trail following, growth, valid item placement | Snake with trains, worms, caterpillars or delivery vehicles |
| Flap / thrust through gates | `library/games/jelly-sub`, `jelly-sub-2`, `library/templates/flappy.js` | Gravity/thrust controller, gap spawning, swept obstacle checks, distance scoring | Flappy submarine, jetpack bird, flying fish |
| Catch and dodge | `pie-anvil`, `salsa-taco`, `star-catch`, `cat-catcher-2` | Falling-object spawner, collectible/hazard roles, catch windows, bounded difficulty | Catch pizza, dodge exams, collect raindrops |
| Endless runner | `cat-dash`, `ice-fish-dash`, `turbo-dash` | Autoscrolling, jump controller, obstacle spacing, lane changes and scrolling scenery | Dinosaur runner, penguin escape, lane-dodging tunnel |
| Rhythm microgame, after a deeper review | `bada-beat` | Beat phase, input windows, note lanes, combo/miss accounting | Tap on the beat, rhythm dodging, short musical challenges |

Choose one strongest source per family instead of cataloguing every reskin. Runner jump/lane modes need explicit contracts and verification; do not assume they are interchangeable. `bada-beat` is only a seed: its comments allow untouched notes to pass safely, so its rule set needs deliberate review before becoming a general rhythm game. Audio-clock synchronization and latency calibration are separate missing capabilities.

## New games with the highest reuse value

Order reflects engineering judgment about breadth, cabinet controls and overlap with existing code, rather than a measured popularity ranking. Start with short, finishable arcade versions. Each row requires original or appropriately sourced complete art for its camera and actions.

| Priority | Playable seed to build | New reusable systems | Follow-on requests enabled | Existing material to examine |
| --- | --- | --- | --- | --- |
| 1 | **Arena survivor**: survive a short monster siege, collect XP, choose upgrades, defeat a final enemy | Top-down actor movement; bounded enemy-wave director; factions and targeting; reusable projectile/weapon emitters; damage/status effects; XP and upgrade choices | Zombie survival, wizard battles, robot defense, bullet-pattern bosses; later dungeon combat and tower attacks | Shooter wave/projectile code, bomber pursuit behavior, `slime-spell`; these are not yet a general arena/combat contract |
| 2 | **Room-based dungeon adventure**: clear rooms, find keys, unlock doors, fight a boss | Room/tile collision; scene transitions; interactables; keys and inventory; room objectives; checkpoints; boss phase machine | Zelda-like arcade quests, treasure hunts, escape rooms, stealth rooms, small roguelites | Maze reachability, combat timing, and arena systems from priority 1; maze ghost rules are not a general dungeon engine |
| 3 | **Co-op kitchen / workshop**: carry ingredients through timed stations and deliver orders | Object ownership; pickup/carry/place; context-sensitive action; recipes; station state machines; order queues and timers; co-op contention rules | Cooking, factory assembly, package delivery, potion mixing, repair shops | `pack-that` and `craft-dash` are source candidates, not complete station/recipe systems |
| 4 | **Small mining and building survival game**: gather resources, craft a tool, build a shelter, survive a short night | Editable tile world; break/place validation; inventory stacks; recipe transactions; tool tiers/durability; resource respawn; local enemy navigation | Minecraft-inspired 2D building, digging, farming, base defense, Terraria-like variations | Bomber destructible cells, `craft-dash` resource state, inventory/interaction from priorities 2–3 |
| 5 | **Path-based tower defense**: place and upgrade defenses to stop several waves | Build grid and placement rules; enemy route progress; tower targeting; projectile/status systems; economy; upgrade/sell transactions | Bloons-like defense, castle defense, plants defending a garden, turret survival | Missile Defense interception, maze navigation, arena waves; current Missile Defense has no tower-placement economy |
| 6 | **Two-player football / air-hockey arena**: move, aim a kick, score goals | Actor–ball impulses; friction/restitution; goals and out-of-bounds rules; possession/kicks; round/serve reset; reaction-limited opponent | Football, hockey, dodgeball and ball-based party games | Pong/Breakout collision work, with new actor/ball rules; paddle collision alone is insufficient |

Arena + dungeon is the strongest first pair for reusable breadth. Kitchen + mining should share inventory and interaction primitives once their different rules are concrete. Tower defense can reuse the arena's weapon/wave systems; it need not recreate them.

## Important extensions and the next wave

- **Item kart racing:** extend the existing kart foundation with item slots, crates, targeting, projectiles, status effects and readable effects. Its current API explicitly excludes items/weapons. Sky Racer already implements several item concepts, but they are private to its factory. Extract and adapt the behavior deliberately; its overhead coordinates and the kart's projected road coordinates differ.
- **Two-player plane racing:** add real independent player state, camera policy, input ownership and race results to Sky Racer. The current contract rejects 2P. A player-count label is not this feature.
- **Precision action platformer:** a short Mario-like course with tile collision, coyote time, jump buffering, moving platforms, stomps, breakable blocks and power-up states. Existing Speed Platformer has momentum, loops and two fixed acts; its supported settings are primarily presentation. It cannot provide these requested rules through config alone.
- **Run-and-gun:** build after the precision platformer and weapon kit. It contributes aim directions, muzzle sockets, enemy telegraphs, scrolling encounter placement and boss patterns. Use joystick direction plus A/B actions; do not assume mouse or twin-stick aim.
- **Co-op street brawler:** a depth-lane movement model, crowd navigation, target selection, knockback/stun, pickups and revive flow. The existing duel fighter provides useful attack timing, but two combatants in a side-view duel do not establish multi-enemy brawler behavior.
- **Grid push puzzle:** Sokoban-style crates, switches, doors and undo. Particularly valuable for an occupancy layer, reversible move transactions and puzzle-solvability checks. Add after the quick promotions if effort is constrained.
- **Match-three / chain puzzle:** swap validation, match scanning, cascade/refill and dead-board detection. Falling Blocks does not supply this loop. This adds a distinct non-action family.
- **Swing/grapple challenge:** rope constraints, anchor selection, tension/release and momentum preservation. A superhero fighting animation or projectile is not a swinging controller. Defer until platform movement and collision are stable.

## The component layer we should build alongside these games

The present system goes directly from whole foundation to raw snippet inventory. The useful middle layer is a **reviewed mechanic module**: a cohesive group of code with a documented contract, not every small function as a separately selectable unit.

Start with modules proven in the first games: `topdown-motion`, `combat-and-projectiles`, `wave-director`, `inventory-and-recipes`, `grid-world`, `interactions`, `objectives-and-rounds`. Some underlying pieces already exist inside current factories; the missing work is making ownership, behavior and compatibility explicit. Do not build a speculative universal engine before two real games need the same module.

For each module, store/index:

- Immutable ID, version, source hash and provenance; relationship to the source games and reviewed evidence.
- Capabilities provided and required: camera/coordinate space, collision conventions, entity/state ownership, supported player modes, runtime API version and input needs.
- Validated configuration; lifecycle/reset contract; commands and events; bounded entity limits. In particular, define who owns damage, score awards, randomness and termination.
- Asset requirements: actor directions, full animation states, sizes, anchors, hit/hurt boxes, attachment points, palette and source rights. Current top-down assets include useful poses, but individual attack poses are not full attack cycles.
- Review status and evidence covering each supported mode and combination. Preserve raw `needs-review` inventory separately from admitted modules.

Proposed assembly flow: identify the core loop, retrieve compatible verified modules, let Jev choose among actual supported options, validate the combination in code, and let Astra write only the glue or missing behavior. Unsupported requests must retain the custom-code path. Existing rules intentionally avoid silently choosing half of a hybrid; expanding composition must preserve that correctness.

This matches TypeSafe's documented [Choice primitive](https://docs.typesafe.ai/primitives/choice): selection from explicit alternatives, with a no-match outcome. The modular game contracts and compatibility validator are work we must implement; TypeSafe does not supply them for us.

## Concrete first batch and acceptance criteria

1. Promote **Snake, Flap and Catch/Dodge** from saved sources. Review runner candidates alongside them; package only if the actual controls and obstacle rules hold up.
2. Build **Arena Survivor** and **Dungeon Adventure**, extracting shared combat, movement, objectives and inventory where a second consumer proves the interface.
3. Extend **Kart with Items**, using the new weapon/status contracts where compatible and retaining correct road projection.
4. Build **Co-op Kitchen**, then **Mining/Building** and **Tower Defense** using the shared systems above. Sports and puzzle families provide the next independent breadth.

A finished seed should provide: one reviewed playable game; an explicit supported/unsupported request list; reusable module/asset contracts; deterministic behavior/reset/terminal tests; runtime and visual evidence for advertised player modes; and offline retrieval examples for a faithful match, a requested variation and an incompatible request. Raw automatic harvesting remains useful provenance, not the acceptance gate.

Test reuse by assembling at least two meaningfully different small games from each proposed shared module. Measure avoided generated code, verified request coverage and manual quality. When separately authorized to run paid timing tests, report repeated end-to-end measurements; no speed promise follows from component counts alone.

## Audit evidence and limitations

- `bench/audits/catalog-coverage-2026-09-20/snapshot.json`: active content hashes, loader status, sprite records and 24 offline request cases. The script uses hand-authored genre labels and invokes no models; a deterministic selection is not a prediction of Jev's final judgment.
- `bench/audits/catalog-coverage-2026-09-20/database-summary.json`: read-only counts from the actual SQLite database.
- Checked contracts: `library/catalog/*/api.md`, `library/reference/README.md`, `packages/harness/src/catalog.ts`, `packages/harness/src/jev.ts`, and the component schema/extractor. Saved-game metadata and selected source implementations informed promotion candidates.
- Offline cases confirm no existing deterministic foundation for Snake, Flappy, the proposed new families, item kart racing or 2P plane racing. The current generic platformer genre can select Speed Platformer for an explicit Mario-like block/power-up request; its contract cannot implement those changes without new code. Fix capability matching alongside new coverage.
- A Pac-Man + Bomberman request has zero eligible foundations because recognized mixed mechanics are excluded. This is a composition gap, not missing copies of those two games.
- For many unmatched requests, Jev currently receives most eligible foundation contracts (up to all 14). As the catalog grows, add capability-based retrieval and measure recall/request size. The existing router has a 96,000-character request guard. More catalog entries should not mean sending every contract on every request.
- No generated game was promoted, no database content was modified, and no paid generation/evaluation was run in this audit.

## Follow-up: engine-wide gaps and more families

See [engine coverage gaps](engine-coverage-gaps.md) for turn-aware controls,
mechanic-specific acceptance, lifecycle checks, reusable camera/collision systems
and eight additional seed families. This follow-up identifies work; it does not
claim those systems or games are implemented.
