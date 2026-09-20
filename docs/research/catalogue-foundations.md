# Arcade catalogue foundations

Research checked 2026-09-19. This document separates source facts from proposed
acceptance criteria. The criteria below are our engineering requirements, not a
claim that all historical games used identical rules or that these games have
already been implemented. Named commercial games identify a design reference;
they do not grant reuse rights to their artwork or ROM data.

## Recommended architecture

Use a **curated mechanics library and animation catalogue**, with immutable source
files and a local SQLite index. A database makes relationships, provenance,
compatibility, and validation results queryable; it does not make art better.
SQLite is designed for local application data and supports transactional updates.
[SQLite's own application-format documentation](https://www.sqlite.org/appfileformat.html).

Keep original PNGs, animation manifests, source excerpts, tests, and contact sheets
in versioned directories. Index their IDs and content hashes in SQLite, along with
tags and quality status. This is an engineering choice for reviewability in this
repository, not a claim that PNG BLOBs in SQLite are inherently slow. Generated
artifacts and play sessions belong in the writable data directory. Rebuilding the
index from curated manifests must not lose the source assets.

At generation time, retrieve one compatible full-game reference, a small number
of relevant tested mechanics, and compatible animation sets. Rank by mechanics,
camera, input requirements, player semantics, runtime version, and visual style.
An exact named-character match is useful but must not hide that the selected art
is generic. Do not select a generic dodge game merely because it supports 2P.
These fifteen families are seed coverage, **not an allowed-genre list**.

The model should see concise contracts and executable examples. It should select
asset IDs and describe custom variations rather than repeatedly reproduce
thousands of existing pixel values. A deterministic assembly step can embed
selected validated sprite data into the final single-file game. This preserves
the lightweight offline runtime while avoiding model transcription errors. If
the runtime later accepts an atlas, use the same manifest rather than another
asset representation.

For a request such as “Street Fighter with Batman and the Flash,” retrieval must
solve two separate requirements: a functional fighting system and suitable
character art. A blue ninja is not Batman, and a red ninja is not the Flash. A
character adaptation needs recognizable silhouette, costume features, compatible
poses, and distinctive moves. Store the character request and any asset mismatch
explicitly. Generic art is a useful baseline for mechanics, not evidence that the
requested character likeness has been achieved.

## Fifteen seed families and their gates

Every family needs an actual playable reference, deterministic behavior tests,
and captured visual review. Passing a short “loads and moves” probe does not
establish that the game is polished. The proposed two-player modes below are
adaptation choices; they are not historical claims about each original release.

| Family / popular reference | Mechanics and presentation that define the reference | Proposed 1P / 2P semantics | Behavioral acceptance criteria |
| --- | --- | --- | --- |
| Versus fighter / Street Fighter II | Spacing, distinct light/heavy reach and recovery, facing, blocking, jump arcs, grounded full-body poses, hit reaction, KO and rounds. Use one timeline for pose, active hitbox, and recovery. [Official Capcom manual](https://game.capcom.com/manual/CFC/en/ps4/page/10/1). | CPU opponent with readable decisions / simultaneous human versus. | An attack cannot damage during startup or recovery; one hit per target per swing; blocking depends on facing; stun interrupts eligible moves; pushboxes prevent overlap; both players can win a round and match; simultaneous KO has a policy. Capture idle, walk, jump, guard, attack contact, hurt, and KO frames. |
| Kart circuit / Super Mario Kart | Track geometry, steering and traction, intentional drifting, items, collision recovery, lap/rank readability, speed cues and distinct course landmarks. [Nintendo manual](https://www.nintendo.com/es-es/games/oms/snes-classic/manuals/super-mario-kart/manual.pdf). | Race against AI / race against a human with a genuinely usable camera layout. | Ordered checkpoints prevent lap cheating and reverse laps; off-road slows rather than traps; drift release changes behavior predictably; item pickup/use/expiry work; AI finishes a lap without teleporting; collisions separate; rankings use progress along track. Shared-camera top-down and split-view pseudo-3D are different presentation choices, not interchangeable placeholders. |
| Fixed-screen platform ascent / Donkey Kong | Readable sloped platforms, ladders, rolling hazards, timed jumps, visible destination, alternate routes, and a complete clear/death cycle. [Nintendo's original-game description](https://www.nintendo.com/en-gb/Games/NES/Donkey-Kong-780429.html). | Solo climb / alternate score runs or deliberately designed simultaneous co-op. | All intended routes are reachable using actual motion; ladders connect floors; a barrel follows a visible route; jump clearance matches sprite feet; death cannot instantly recur on respawn; reaching the goal advances the level. A second player must have independent input and an explicit life/clear policy. |
| Paddle duel / Pong | Crisp immediate paddle movement, legible ball, placement-controlled rebound, short serve pause, score and match winner. [Author's working implementation](https://github.com/jakesgordon/javascript-pong). | Bounded imperfect AI / simultaneous versus. | Swept collision prevents tunneling at max speed; edge impacts change angle; no almost-horizontal endless rally; a miss awards exactly one point; serve resets safely; win score ends the match; AI cannot exceed its configured paddle speed. |
| Maze chase / Pac-Man | Connected corridors, buffered corner turns, a visible enemy house and door, staggered exits, pursuit/escape states, tunnels, collectible progress. [Namco operator manual, hosted copy](https://wwyss.ch/Arcades_Manuals/Manuals/Arcades/Ms_Pacman_Galaga_Cocktail_manual.pdf). | Solo chase / explicit co-op collection or hunter-versus-runner adaptation. | Every required collectible is reachable; player cannot enter the enemy house; each enemy leaves and returns through the door; tunnel wrap pairs are valid; queued turns fire at the next legal junction. “A goose chasing ghosts” must preserve permanent hunting if requested, instead of quietly returning to power-pill-only capture. |
| Brick breaker / Breakout | Controlled rebound, visible brick damage/removal, authored formations, ball service, finite misses and stage transition. [Atari's rules](https://atari.com/pages/breakout). | Solo paddle / cooperative shared paddle field or separate competitive fields. | Fast balls hit thin bricks; corner contacts do not double-score; last brick advances; ball cannot become trapped; lost ball decrements one life; serve requires the intended input. Test one player's controls with the other idle. |
| Formation shooter / Space Invaders and Galaga | Designed entry paths, stable formation slots, committed dive paths or formation descent, shot limits, readable projectile contrast, explosions and wave boundaries. [Bandai Namco's Galaga explanation](https://galaga.com/en/history/galaga.php); [Taito's Space Invaders page](https://www.taito.co.jp/en/mob/0000030019). | Solo / simultaneous cooperative ships, shared wave state and independent lives. | Entering enemies reach their slots; diver returns or exits; speed/dive intensity rises within a bounded schedule; shot collision cannot skip; final enemy resolves the wave; two ships never overwrite each other's input or score. Difficulty must not be random unavoidable spawn damage. |
| Inertial arena shooter / Asteroids | Rotation, thrust, retained momentum, toroidal wrap, projectile lifetime, splitting rocks and short spawn protection. [Atari's modern reference description](https://atari.com/products/asteroids-recharged). | Solo survival / cooperative survival or clearly labeled versus. | Rotation does not translate; thrust changes velocity; wrap preserves velocity; splitting produces smaller children once; safe spawn rejects nearby hazards; terminal state occurs with lives exhausted. Art should expose ship orientation and thrust, not merely a rotating rectangle. |
| Traffic and river crossing / Frogger | Discrete hops, lane rhythms, safe medians, moving log support, distinct road/water hazards, separate destination slots. [Konami's original-arcade description](https://www.konami.com/crossmedia/us/en/products/frogger/). | Solo rescue / cooperative separate frogs and destination ownership. | Landing resolves after the hop; logs carry the player; unsupported water kills; a filled home cannot be counted twice; all home slots complete a round; lane wrapping cannot produce an unavoidable immediate collision. |
| Bomb grid arena / Bomberman | Grid placement, fuse telegraph, cross-shaped blast blocked by walls, destructible blocks, chain reactions and a readable round winner. [Official Konami controls](https://www.konami.com/games/bomberman/online/manual/en/switch/index.html). | CPU opponents / simultaneous versus or authored co-op challenge. | Bomb owner can step off once but cannot walk back through; solid walls stop blast; destructible wall is removed once; blast chain cannot recurse forever; one damage event per blast/life; spawns have escape space; a draw or final survivor ends the round. |
| Trap-and-pop platform arena / Bubble Bobble | Platform movement plus a capture state before defeat, drifting trapped enemies, popping chains, escaped-enemy pressure, collectible rewards. [Taito's official description](https://www.taito.co.jp/en/BB4F/steam). | Solo / simultaneous co-op with readable player colors. | Projectile capture changes state without immediately killing; trapped enemy floats and expires; a pop defeats only eligible captured enemies; clearing the room advances; no target can remain unreachable forever; both players can trigger and receive rewards under the chosen policy. |
| Falling-block puzzle / Tetris, with a separate Dr. Mario variant | Legible grid, predictable discrete rotation, repeat delay, gravity, lock, resolve and spawn phases, next-piece preview. [Official Tetris rules](https://play.tetris.com/about); [small MIT implementation](https://github.com/jakesgordon/javascript-tetris). | Solo score attack / independent wells and explicit garbage or score-race rules. | Piece cannot overlap locked cells; rotation near walls has a documented rule; simultaneous lines clear atomically; gravity accelerates monotonically within limits; top-out is reachable; 2P wells and RNG streams do not overwrite each other. A color-match capsule variant needs its own matching/gravity tests and art, not a renamed tetromino game. |
| Horizon road racer / OutRun | Segmented road projection, curves, hills, roadside landmarks, traffic approach/occlusion, off-road slowdown and checkpoints. [Author's four-stage implementation/tutorial](https://github.com/jakesgordon/javascript-racer). | Solo time/checkpoint run / alternate time trial or two actual viewpoints. | Forward progress is monotonic; projection stays finite over crests; road curve affects steering; roadside collision occurs at world distance, not merely screen overlap; checkpoints grant time once; finish and timeout resolve. A scrolling straight road with random cars is insufficient evidence for this reference. |
| Interception defense / Missile Command | Cursor aiming, finite ammunition, flight time, expanding/decaying explosion fields, chain interception, endangered bases and wave cadence. [Atari's rules](https://atari.com/pages/missilecommand). | Solo defense / two colored cursors protecting shared cities. | A shot travels to the chosen target before detonation; explosion only damages during its radius/lifetime; chain score occurs once; ammo reaches zero; surviving cities carry to next wave; no cities ends the run; moving the aim after firing does not redirect an existing shot. |
| Belt-scrolling brawler / Final Fight | Ground-plane depth distinct from jump height, approach/attack range, crowd spacing, hit reaction, gated encounters, scrolling street composition. [Capcom's original manual page](https://captown.capcom.com/en/classic_games/17). | Solo against crowds / simultaneous co-op. | Fighters at different ground depth do not hit despite sprite overlap; hitstun prevents immediate retaliation; waves unlock camera gates; enemies cannot stack invisibly; each player can independently move/attack/recover; camera does not abandon a living partner. This is not the same engine as a one-lane duel. |

For each reference, require a short playable loop with a real start, escalation,
loss, and clear/win condition. Match numerical tuning to measured play rather
than reproducing a historical table by memory. Store a small expected-behavior
fixture: inputs, seed, initial state, event assertions, and capture ticks.

## Source code worth studying or adapting

| Source | Concrete value | Reuse boundary |
| --- | --- | --- |
| [Jake Gordon Pong](https://github.com/jakesgordon/javascript-pong) | Collision, serve/rally/match state, bounded AI. | Repository marks source MIT. Preserve the notice if adapting; separately inventory bundled art/audio. |
| [Jake Gordon Breakout](https://github.com/jakesgordon/javascript-breakout) | Ball/brick collision, stage state, gameplay balance discussion. | [License](https://raw.githubusercontent.com/jakesgordon/javascript-breakout/master/LICENSE) grants MIT-style source permission but separately identifies audio as CC BY-ND 2.0. Do not treat the whole directory as one permissive asset pack. |
| [Jake Gordon racer](https://github.com/jakesgordon/javascript-racer) | Incremental straight-road, curve, hill and traffic projection code. | Source MIT. README explicitly restricts included music to that project and identifies borrowed OutRun sprite graphics. Use code concepts/adapted licensed code; replace art/audio. The author calls it a starting point, not a polished finished racer. |
| [Jake Gordon Tetris](https://github.com/jakesgordon/javascript-tetris) | Compact grid, rotation and update loop. | MIT; the author explicitly says this implementation lacks polish. Useful primitive, not a quality target by itself. |
| [Ikemen GO](https://github.com/ikemen-engine/Ikemen-GO) | A mature fighting engine's separation of movement, hit state, animation and match flow. | Engine MIT, bundled screenpack/other assets have separate licenses. Its Go/MUGEN stack is not a drop-in component for this small JS runtime. Read selected systems rather than placing its entire source in every prompt. |
| [SuperTuxKart](https://github.com/supertuxkart/stk-code) | Kart steering/drift/items, AI paths, progress and race state; useful reference for behavior requirements. | [Project licensing](https://supertuxkart.github.io/stk-website/Licensing) identifies GPLv3 code and per-asset licenses. A wholesale port has integration and license costs; it is not a lightweight sprite package. |
| [floooh/pacman.c](https://github.com/floooh/pacman.c) | Readable state machine and clock-driven ghost house lifecycle. | The [source header](https://raw.githubusercontent.com/floooh/pacman.c/master/pacman.c) explicitly says embedded sprite, palette and audio data came from arcade ROM dumps. Do not ingest those bytes as original licensed asset seeds. Use our original maze artwork and tested lifecycle implementation. |

No source has been copied into the runtime by this research document. A public
GitHub repository or an emulator's open license is not, by itself, an asset
license for all game content it can load. The Spriters Resource is valuable for
visual/reference research; ripped sprites need item-specific provenance and
reuse permission before becoming redistributable default assets.

## Practical animation and art seeds

These author/project pages were checked. Downloaded archives still need file-level
inspection, source hashes and a local manifest before promotion. “Animated” on a
store page does not guarantee every state required by our engine exists.

| Candidate | Evidence and useful coverage | Integration notes |
| --- | --- | --- |
| [Ninja Adventure, Pixel-Boy and AAA](https://pixel-boy.itch.io/ninja-adventure-asset-pack) | Author lists CC0, 50+ animated characters, 30+ animated monsters, bosses, effects and tiles. The [official GitHub example](https://github.com/pixel-boy/NinjaAdventure) contains only a small subset. | Good top-down actor/monster seed. Preserve actual source motion; do not claim these are full side-view fighters. Normalize palette without discarding the original PNG. |
| [SunnyLand, Ansimuz](https://ansimuz.itch.io/sunny-land-pixel-game-art) | Author page labels the asset pack CC0 and includes animated platform actors/enemies, scenery and effects. | Free art archive is distinct from premium Plus content. Suitable for an attractive platforming reference; inspect included states and separate art/audio provenance. |
| [Pixel Platformer, Kenney](https://kenney.nl/assets/pixel-platformer) | CC0; 18×18 tiles, 200 files, environment and character material. | Strong consistent platform scene kit. Verify which images are animation phases before promising a complete action set. |
| [Pixel Shmup, Kenney](https://kenney.nl/assets/pixel-shmup) | CC0; 16×16 tiles, 128 files. | Useful aircraft, ground and effects family with consistent pixel density. |
| [Pixel Vehicle Pack, Kenney](https://kenney.nl/assets/pixel-vehicle-pack) | Publisher marks it CC0. | Useful top-down vehicles; not an OutRun rear-view turning/crest animation set. Camera compatibility is a retrieval requirement. |
| [Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) and [Tiny Battle](https://kenney.nl/assets/tiny-battle), Kenney | Both CC0; 16×16 coherent assets. | Props, items, terrain and units support readable worlds. They do not replace full character motion cycles. |
| [Free 8-Directional Melee Character, Hormelz](https://hormelz.itch.io/8-directional-melee-character) | Author labels CC0 and lists 38 animations including jabs, kicks, hit reactions, jumps, deaths and fireball. | Promising richer combat seed. The page and older author comments reveal frame-dimension/JSON-export issues; inspect every imported sheet and derive stable foot anchors. Do not assume an advertised frame grid. |
| [Wrestling Assets, Chasersgaming](https://opengameart.org/content/wrestling-assets) | Creator-authored pixel sheets, labeled CC0, including wrestling/punch/kick material. | Small retro combat art source. Need visual slicing and state coverage inspection. |
| [Boxer Game Character, Raga2D](https://opengameart.org/content/boxer-game-character) | CC0; author lists idle, forward/back walk, three punches, block, hurt/dizzy and KO. | Complete boxing motion candidate but cartoon art style; palette/downscale review needed for this CRT art direction. |
| [Godinez Fighter, siwoku](https://siwoku.itch.io/godinez-fighter) | Author labels CC0; paid standard pack lists 19 animations. | The free pack only advertises idle/run/jump, so do not call that a complete fighter. Paid acquisition is separate from reuse license and was not performed here. |
| [Universal LPC generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) | Layered character assembly with compatible poses; supports per-layer license/author export through `CREDITS.csv` and generated credits. | Best for top-down humanoids with clothing variants. Licenses vary per layer; not all equipment supports expanded run/jump/climb states. Retrieve a complete compatible selection, export its credits and selection JSON, and verify animation coverage. Do not label the entire collection CC0 or assume side-view fighter poses. |

## Minimum asset contract

An asset record should contain an immutable ID/version and source hash; source
URL, author, source revision and license text/reference; original dimensions,
palette and camera; normalized palette/transparency policy; and supported
character roles, directions and animation states. The original file must remain
available for a later higher-color renderer.

For each frame store its source rectangle, duration in simulation ticks, anchor
relative to that rectangle, and explicit collision metadata. Distinguish:

- **Hurtbox:** where this actor can be damaged.
- **Hitbox:** active attack volume, damage event and permitted active ticks.
- **Pushbox / footprint:** physical space occupied on the ground.
- **Attachment anchors:** hand, weapon, hat/cape, projectile spawn and shadow.

If timing or collision boxes are newly authored for our engine, mark them as such;
they are not facts recovered from a PNG. Require empty hitboxes on non-attacking
poses. Mirroring must also mirror boxes and attachment anchors. Cropping must
preserve world-foot position across frames. A frame need not be unique to every
state, but repeated static art must not be called a walk/attack animation.

Animation completeness is **role-specific**: maze actors need directional motion
and capture/death response; a fighter needs idle, forward/back walk, jump phases,
guard, light/heavy attacks, hurt and KO; a kart needs camera-appropriate turning,
drift, spin/crash and visual speed feedback. Store missing states as unsupported
and filter retrieval, rather than inventing a label for an absent drawing.

## Learning from each generated game

Persist every generation as a **candidate**, with model/configuration, exact
retrieved IDs/hashes, requested mechanics, generated code/assets and test results.
Failure data is valuable: it shows missing contracts and prevents repeated
regressions. It must not become a positive example because it merely parsed.

Promote a game or extracted component only after it passes its mechanic-specific
tests, both claimed player modes, runtime/performance checks, visual review and
a short play review. Deduplicate by content hash; record the parent versions and
what changed. If a generated asset embeds an existing library frame, keep its
original provenance rather than relabeling it as new art. Store negative feedback
and quarantine/regress a previously accepted component when it fails.

This is retrieval and evaluation, not reinforcement learning of Astra's weights.
Useful rewards include successful completion, input responsiveness, action-pose
consistency, clear objective/feedback, repeat-play preference and reference
fidelity. A model judge can triage visual defects, but deterministic checks must
still verify state transitions and human play should decide whether the reference
actually feels good. Benchmark fixed prompts and seeds before promoting changes.

## First implementation experiments

1. Build polished original fighter, maze, kart and platform references first;
   these cover the user's observed failures and expose the most expensive asset
   requirements. Use actual animation sheets and match collision to their poses.
2. Measure full-code generation against deterministic assembly plus smaller
   customization on the same prompts/seeds. Record code size, first visual,
   total latency, runtime errors, mechanic assertions and visual/play ratings.
3. Expand the remaining families with their own coherent art and behavior tests.
   A table of fifteen labels or fifteen renamed generic games is not completion.
4. Add generated candidates to the index automatically, while promotion remains
   evidence-based. Retrieve only compatible, verified components by default.

The user's requests authorize richer assets and reuse. The old local “no assets”
rule describes the previous implementation; the new implementation should keep
offline, bounded loading and lean output without using that rule to preserve the
current visual limitations.
