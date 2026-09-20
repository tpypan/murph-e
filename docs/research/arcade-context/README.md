# Arcade design context for game generation

Research collected 2026-09-19. This local context library is now connected to specification, build, repair and remix. It contains 18 reviewed sources and 17 focused cards. Source metadata and selection tags are in [manifest.json](manifest.json). Implementation: `packages/harness/src/design-context.ts`.

## What to give the model

Give the designer [core.md](core.md), the actual user request, and a few matching cards. Give the builder the resulting concrete plan, the exact runtime API, selected implementation cards, and approved asset metadata. Give the verifier the cards' observable checks and the plan's required behaviors. Do not paste this entire bibliography into every build.

The cards distinguish evidence from our proposed application. Numeric tuning choices and acceptance checks are proposals until tested on this runtime and the physical cabinet. A source describing a successful game does not establish that copying one technique produces an enjoyable new game.

Some sources concern modern games. Their movement, readability and pacing methods can inform a retro arcade game; they are not evidence that all historical 8-bit/16-bit games used those methods. The Pac-Man Dossier is original technical analysis, not an official Namco specification. GDC PDFs were read in relevant sections, not watched as videos.

## Source map

| Source | Why it is useful here | Context card |
| --- | --- | --- |
| [Kyle Pittman — Building a Better Jump](https://media.gdcvault.com/gdc2016/Presentations/Pittman_Kyle_BuildingBetterJump.pdf) | Design movement from intended trajectory | [Platforming](cards/platforming.md) |
| [Maddy Thorson — Celeste & TowerFall Physics](https://maddymakesgames.com/articles/celeste_and_towerfall_physics/index.html) | Small collision architecture and moving platforms | [Collision](cards/collision.md) |
| [Maddy Thorson — Celeste & Forgiveness](https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html) | Input/position tolerance | [Platforming](cards/platforming.md) |
| [Nintendo — Adjusting the Map in a Daily Cycle](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-New-Super-Mario-Bros-Wii/Volume-2/4-Adjusting-the-Map-in-a-Daily-Cycle/4-Adjusting-the-Map-in-a-Daily-Cycle-233027.html) | Teaching through encounter placement and iteration | [Onboarding](cards/onboarding.md) |
| [Kenta Cho — BulletML Reference](https://www.asahi-net.or.jp/~cs8k-cyu/bulletml/bulletml_ref_e.html) | Reusable, parameterized attack sequences | [Projectiles](cards/projectiles.md) |
| [Kenta Cho — Gunroar instructions](https://www.asahi-net.or.jp/~cs8k-cyu/windows/gr_e.html) | A concrete risk/reward scoring example | [Scoring](cards/scoring.md) |
| [Jamey Pittman — The Pac-Man Dossier](https://pacman.holenet.info/) | Enemy roles, state changes and reward opportunities | [Enemy roles](cards/enemy-roles.md) |
| [Michael Booth — The AI Systems of Left 4 Dead](https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf) | Pacing distinct from difficulty | [Pacing](cards/pacing.md) |
| [Derek Yu — Pixel Art Tutorial: Basics](https://www.derekyu.com/makegames/pixelart.html) | Pixel shapes, value clusters and palette discipline | [Readability](cards/readability.md) |
| [Valve — Illustrative Rendering in Team Fortress 2](https://cdn.fastly.steamstatic.com/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2.pdf) | Validating identity through silhouette | [Readability](cards/readability.md) |
| [Box2D — Distance Joint](https://box2d.org/documentation/group__distance__joint.html) | Distinguishing rigid constraints, limits and springs | [Swing/grapple](cards/swing-grapple.md) |
| [Glenn Fiedler — Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) | Stable simulation and bounded catch-up | [Simulation](cards/simulation.md) |
| [Smith, Whitehead & Mateas — Tanagra](https://www.researchgate.net/publication/224242275_Tanagra_Reactive_Planning_and_Constraint_Solving_for_Mixed-Initiative_Level_Design) | Constraint-based playable layouts; author-uploaded paper | [Layouts](cards/layouts.md) |
| [Staley et al. — Meta Arcade](https://openreview.net/pdf?id=6Tw0QPDyXML) | Configurable arcade components and parameter families | [Composition](cards/composition.md) |
| [Itay Keren — Scroll Back](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers) | Showing the space the player needs to act | [Camera](cards/camera.md) |
| [Mike Ambinder — Valve's Approach to Playtesting](https://cdn.fastly.steamstatic.com/apps/valve/2009/GDC2009_ValvesApproachToPlaytesting.pdf) | Observed behavior alongside player reports | [Evaluation](cards/evaluation.md) |
| [Benji Bananas — publisher listing](https://play.google.com/store/apps/details?id=com.fingersoft.benjibananas&hl=en) | Grounding a named game/mechanic | [Reference identity](cards/reference-identity.md) |
| [Batman — official DC profile](https://www.dc.com/characters/batman) | Grounding a named character/setting | [Reference identity](cards/reference-identity.md) |

The [ball/paddle](cards/ball-paddle.md) and [grid movement](cards/grid-movement.md) cards are our engineering recipes, informed by the component/simulation references. Their specific algorithms are not claims about how the original Pong, Breakout or Snake code worked.

## Connected retrieval

1. The shared core is a stable system-prompt prefix. Before specification, explicit request signals select preliminary cards; an old game's genre is only a weak hint.
2. The existing Luna spec call sees a small ID/title/tag catalogue and returns up to four `designCards` in structured JSON. This handles semantic choices and unfamiliar named characters without another model call. Older stored specs without that field still work.
3. The builder selector combines those IDs with weighted explicit-mechanic signals and genre fallbacks. Swinging, jumping, shooting and grid/ball mechanics rank above generic defaults. The original request and full spec remain present even when a guidance card is omitted.
4. Each stage has a hard cap of four cards and 9,000 characters for core plus selected text, excluding the catalogue, stage instructions, API and examples. This is a character bound, not a measured token limit. Cards are guidance, not additional features to implement. Repair and remix retain the selected guidance and their existing bounded output contracts.
5. The shared core is read for each prompt, so core corrections do not require restarting the cabinet/badge process. Cards and the manifest remain cached for the module's lifetime and need a module reload after edits. Stable system prefixes and OpenAI prompt cache keys support provider caching. There is no semantic game-result cache yet. Each run records `context-spec.json`, `context-build.json`, exact selected text, card versions/hashes, selection reasons and source URLs, plus `spec-prompt.txt` and `prompt.txt`.

No vector database, web lookup, extra agent call, art stage or card-derived gameplay verifier was added. The existing probe checks observable basic behavior; it does not prove the guidance was followed. `HTN_DESIGN_CONTEXT=0` disables core/cards for comparisons but does not restore all historical prompt wording or model defaults.

| Request | Suggested cards |
| --- | --- |
| Rooftop jumping with a named hero | platforming, collision, layouts, reference-identity; readability for art |
| Swinging between vines/buildings | swing-grapple, layouts, camera, reference-identity |
| Spaceship against bullet patterns | projectiles, pacing, scoring, readability |
| Maze pursuit | grid-movement, enemy-roles, scoring, onboarding |
| Pong or Breakout variant | ball-paddle, scoring, evaluation |
| Snake variant | grid-movement, simulation, scoring |
| Runner or flapping flight | platforming for motion design, layouts, camera, pacing; do not import grounded-jump rules blindly |

These cards describe behavior, not installed API functions. The current engine does not automatically acquire a grapple helper or a reachability solver by including a card. The builder must use the real API or an implemented, tested component.

## What still needs request-specific lookup

Character/game version, actual visual references, distinctive mechanics, animation poses, and ambiguous named entities. Store facts separately from interpretations and retain the user's explicit modifications. Text-only profiles are insufficient to approve a visual asset. Do not invent a canonical colour palette from a character name; inspect the intended version's artwork.

See [the rooftop example](examples/rooftop-request.md) for a concrete selection and missing-reference checklist. No images or sprite packs have been approved by this research step.

## Validation and remaining work

The input-crash false positive in the verifier is fixed, and direction checks also compare steering after A against an A-only baseline. Model calls have full-response deadlines (spec 30 s, build/repair 300 s, remix 60 s). These are per-request limits, not an overall cabinet deadline. See [the historical benchmark report](../../bench-2026-09-19-astra-context.md) for the earlier model/context validation and its then-current limits. The user requested Astra alongside that integration, so comparison with stored Sol results cannot isolate the benefit of the context.

Reference images, reusable tested mechanic components, richer mechanic acceptance checks, cancellation/watchdog improvements and actual cabinet playtests remain in [the implementation proposal](../../plans/arcade-generation-v2.md). Judge mechanic fidelity, recognizability, time to first meaningful action, unfair deaths and enjoyment separately from basic probe passes.

Additional viewing: [Juice It or Lose It — Martin Jonasson and Petri Purho](https://www.gdcvault.com/play/1016789/Juice-It-or-Lose). Only the session description was reviewed here, so detailed claims from the talk are not used in the cards.
