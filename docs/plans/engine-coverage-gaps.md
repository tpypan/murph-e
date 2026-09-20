# What every new game needs, and which game families expose the gaps

> Updated scope: prioritize familiar arcade loops. The [current arcade-only build order](arcade-catalog-next.md) supersedes broad RPG, crafting, mining and card-game suggestions below. The arena and short Gauntlet-style shooter have now been implemented; see their verification artifacts.

Source audit, 2026-09-20, after the multiplayer-first change. This identifies
requirements and proposed work; it does not implement these additional systems.
No games were generated and no model APIs were called. Game examples are design
proposals, not evidence of visitor demand.

## Already provided

The runtime provides seeded gameplay randomness, a fixed 60 Hz simulation,
latched per-player buttons, drawing, palettes, procedural sounds, scores,
pause/start/restart, and win/loss screens. The harness saves generation artifacts,
checks basic runtime/input behavior and permits one bounded repair. New
specifications require a solo/two-player design and both modes are probed.
Existing catalog foundations have additional authored behavior/visual evidence.
These are useful foundations to preserve rather than recreate.

## Requirements to establish before generating code

| Priority | Requirement | Evidence of the current gap | Concrete next step |
| --- | --- | --- | --- |
| 1 | **Turn structure and control eligibility** | `MultiplayerPlanSchema` distinguishes co-op/versus and camera, but has no simultaneous/alternating-turn field or per-role control states. The generic probe tests input at fixed early frames. A legitimate P2 waiting for a turn can fail; the idle-motion check can also reject a valid static puzzle board. | Add an explicit interaction schedule and control eligibility. Use genre/scenario-aware checks that advance through selection, turn handoff and gameplay. Require meaningful P2 agency when eligible, rather than movement before its turn. |
| 2 | **Proof that the requested mechanics work** | `referenceIntent` preserves requested changes in the spec, but the live acceptance probe measures loads, drawing, motion and input effects. It cannot demonstrate that a promised key opens a door, an item hits a rival, or a recipe consumes ingredients correctly. | Record mandatory mechanics and observable acceptance scenarios. Use structured state/events from reviewed modules and deterministic test scripts; keep generic input probes as a smoke test. |
| 3 | **Complete match and reset behavior** | Runtime `init`, `win`, `gameOver` and reset exist. New-game acceptance does not generally reach a real victory/defeat and restart it. The shell has no distinct draw outcome; tied matches currently need authored handling. | Specify progression, elimination/respawn, tie resolution, terminal behavior and reset ownership. Test a complete relevant success/failure/reset cycle for both modes. Calm/sandbox games need appropriate completion/exit criteria, not a forced defeat. Add a native draw result if required by the supported games. |
| 4 | **Composable game systems** | Retrieval supplies at most one foundation. Harvested declarations are unreviewed and often capture private state. Even compatible ideas such as maze movement plus bombs cannot simply be linked together now. | Introduce reviewed modules with capabilities, dependencies, coordinate systems, commands/events and explicit score/damage/state ownership. Prove each shared module with at least two real consumers. |
| 5 | **World, camera and collision policy** | The runtime exposes drawing and an AABB-overlap helper. Scrolling, split views, tile movement, swept collisions and actor collision response live inside individual foundations. There is no general game-facing camera/tile/physics service in the API. | Extract small optional camera, tile-world and collision modules. Define screen/world coordinates, solid versus trigger geometry, camera bounds and behavior when two humans separate. Keep projected racing and top-down worlds explicit rather than assuming interchangeable coordinates. |
| 6 | **Art matched to actual actions** | Sprite metadata already supports poses, anchors, geometry and unsupported states. Some available source sets contain individual action poses or props. A named actor or a walking sheet does not establish a complete attack, carry, climb or grapple cycle. | Make each seed declare the exact camera/directions/animation states it needs; validate those against complete reviewed assets. Keep collision dimensions consistent with the chosen presentation. |
| 7 | **Bounded simulation cost and difficulty** | Runtime catch-up and telemetry are bounded, and individual foundations cap many entities. The live acceptance result does not include a per-frame performance budget or a long-run growth check for arbitrary generated code. Catching exceptions is not a frame-time limit. | Give modules entity limits, lifetimes and bounded spawn work. Measure update/draw duration and entity growth under worst-case inputs in offline checks. Specify safe spawn spacing and difficulty bounds per genre. |

The first three improve correctness immediately. The middle layer of reviewed
modules produces the largest reuse gains. Avoid making every game implement
inventory, AI or crafting: only require the capabilities its design needs.

## Additional games beyond the earlier six priorities

The earlier plan already proposes an arena survivor, dungeon adventure, co-op
kitchen, mining/building, tower defense and ball sports. These further families
would exercise different missing primitives. Every seed must include a meaningful
solo mode and local two-player mode using the cabinet's d-pad and A/B controls.

| Seed game | Solo / two-player design | New primitives | What can be reused now |
| --- | --- | --- | --- |
| **Co-op switch-and-door puzzle platformer** | Solo can switch between two characters; 2P gives each human one character. Authored puzzles remain solvable in both modes. | Pressure plates, movable crates, door circuits, linked objectives, checkpoint/reset and joint camera rules | Platform movement, grid occupancy and current co-op conventions; circuit and puzzle validation are new |
| **Platform arena fighter** | CPU opponent / 1v1 humans | Damage-driven knockback, ring-outs, stocks, recovery jumps, one-way platforms and respawn protection | Fighter attack timing and platform motion as adaptation candidates; the current duel fighter is not this complete loop |
| **Turn-based artillery duel** | CPU opponent / alternating human turns | Aim and charge, ballistic trajectories, blast falloff, turn handoff, shot resolution and optionally destructible terrain | Projectile/collision code as raw material; needs turn-aware acceptance first |
| **Mini-golf or pinball** | Solo score challenge / alternating golf shots or parallel pinball score competition | Ball response against arbitrary surfaces, friction, bumpers, sensors, shot/stroke state and goal detection | Pong/Breakout supply narrow ball-collision precedents; new surface and round rules are required |
| **Co-op stealth heist** | Solo infiltrator / complementary human roles | Vision cones, line-of-sight, patrol routes, suspicion/alarm states, switches/keys and an extraction objective | Maze navigation and future interaction/inventory modules |
| **Grapple obstacle course** | Solo time trial / two independent racing views | Anchor selection, rope constraints, tension/release, airborne momentum and checkpoints | Platform motion and future camera/collision modules; existing superhero art does not supply the controller |
| **Turn-based card or board battle** | CPU opponent / turn-taking humans or defined team roles | Legal-action validation, turn phases, hand/deck/board state, seeded shuffles, effect resolution and terminal rules | Seeded RNG, input and score shell; needs a readable d-pad selection UI and turn-aware tests |
| **Fishing / timing competition** | Solo catch goal / two fishing spots with separate lines and scores | Cast/charge, bite windows, tension/reel state, catch tables, per-player inventory and timed objectives | Existing timing/collection code; rod/line behavior and rules are new |

These are compact original arcade adaptations. A genre label does not grant the
physics, art, AI or level design of a named commercial game. In particular,
turn-taking modes should not be marked supported by the current generic
multiplayer acceptance gate until its assumptions are corrected.

## Efficient build order

1. Add interaction schedule and scenario-based acceptance to the design contract.
   Exercise the new turn path with a tiny artillery duel or grid puzzle.
2. Build a shared world/collision/camera foundation through the co-op puzzle
   platformer, alongside the earlier arena/dungeon pair. Extract common code only
   where their actual needs align.
3. Extend those systems through a platform fighter and a stealth heist.
4. Use golf/artillery to justify more general ballistics/physics; use grapple only
   when rope behavior is independently validated. Card battles and fishing add
   further breadth after the primary action/puzzle paths work.

Before expanding this far, the earlier low-effort Snake, Flap and Catch/Dodge
promotions still make sense, provided their new two-player designs are tested.
The old plane racer also needs 2P before its fast reuse path can return.

## Sources inspected

- `packages/runtime/API.md` and `packages/runtime/src/runtime.ts`: public services,
  lifecycle, outcome states, seeded RNG and exception handling.
- `packages/runtime/src/input.ts`: input latching and scheduling. Although input
  storage has four slots, runtime player selection and scores currently clamp to
  one or two; this is not four-player support.
- `packages/harness/src/spec.ts`, `multiplayer.ts`, `prompt.ts`, `catalog.ts`,
  `components.ts`: plans, routing, contracts and extracted-component limits.
- `packages/probe/src/probe.ts`, `playtest.ts`, and
  `packages/harness/src/pipeline.ts`: generic acceptance versus longer optional
  saved-game playtests. A generic bot is not a solver or a full correctness proof.
- `library/catalog/*/api.md` and saved-game specs, together with
  `docs/plans/catalog-expansion.md`: existing mechanics and proposed additions.
