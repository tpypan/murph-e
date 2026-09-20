# Curated Arcade library — active goal

User objective: 10–15 polished lightweight arcade foundations with complete reusable
animation/mechanics assets; accurate named-character adaptations; appropriate 1P/2P;
Astra composes/customizes them; new generation results grow a local database.
This goal is not complete merely because a catalog, manifests, or crash probes exist.

## Current user restriction: Codex for development, API for app users

The user clarified the boundary and updated this goal on 2026-09-19: building
base games, iteration and testing must use the signed-in Codex subscription,
Astra medium, with offline tools and no paid API requests. Real people using the
app still generate games through its API. The earlier blanket block was an
incorrect interpretation and is replaced by a request-scoped app-only guard.
Do not enter that scope, call the app endpoint, run paid benches or drive the UI
into live generation as a workaround during development. Historical API results
below are evidence, never permission to spend again.

## Approach under evaluation

- Author and playtest foundations offline. Start with fighter and pseudo-3D kart racer.
- Keep immutable source, animation pixel data, and metadata in reviewable files.
- SQLite indexes capabilities, versions, hashes, provenance and generated candidates.
- Retrieve a bounded relevant factory/API contract. Bundle its tested implementation
  and assets deterministically into the final standalone game.js. Astra emits the
  customization and new mechanics, not thousands of unchanged sprite rows.
- Unknown requests retain the open-ended writer. The collection is not a genre gate.
- Save every newly generated candidate. Runtime success is not art/gameplay approval;
  reuse admission requires behavior, visual, input, reset and terminal-flow evidence.
- A complete animation set has actual frames, durations, anchors, attack/hurt geometry,
  state transitions, palette and provenance. Metadata without usable frames is insufficient.

## Current inventory — offline continuation

The collection now has **13 distinct mechanics families**, with 13 public packs
and six private source-art adaptations (19 total). The sprite index contains
67 sets: 40 verified foundation sets and 27 source-checked sets. Props and partial
pose collections count as sets; these are not 67 complete fighting characters.

Sonic now has a source-art two-act platformer with physical slopes/loop, spin dash,
ring recovery, checkpoints and independent split-view racing. The latest stages
add layered coast/ridge scenery, upper paths and required jump gaps. Three native
completion routes and 92 exact source-color/facing comparisons pass. An optimal
route is about 16 seconds; this is a compact authored game, not the original ROM.

Private DC imports include Batman, Joker and Superman. The original partial pose
collections remain unchanged. A separate Atari Batman adaptation now supplies the
fighter contract with 33 source-derived frames and 17 clips; neutral victory,
defensive holds and shared aerial-kick poses are explicitly reused, not claimed as
recovered original states. Its source-prop flight, timing and geometry are authored.
Source-art Spider-Man has all 16 declared fighter states plus three web effects.
Both private demos offer independent human character confirmation; original Flash
art remains available. See the [Batman review](../research/batman-atari-fighter-review.md).

Retrieval now respects explicit character exclusions and fighter/camera animation
requirements. A source archive entry is never enough to claim a usable fighter.
The source Spider-Man asset also composes through ART with the ordinary fighter;
his name alone does not force another requested genre into the private duel.

The [completion audit](../research/goal-completion-audit.md) records remaining
evidence limits. The 320×240 shell currently scales the game below its native
256×224 resolution; 640×480 is the working display target pending cabinet details.
Human balance and physical CRT acceptance remain separate from automated checks.
Historical API benchmarks below predate the user's Codex-only development rule.

The combined offline pass now passes 138 harness tests and the harness typecheck.
The cabinet regression visits all 19 previews and covers swipe/keyboard browsing,
mode choice, Ready, pause/resume, reduced motion and zero model/speech requests.
The current audio audit passes all 103 saved-game/template/catalog mode samples
with no excluded catalog packs. It proves reachable gameplay cues, not speaker tuning.
Default bomber completion now covers solo and versus, including native reset;
the new test also caught and fixed exhausted co-op players resurrecting between
levels. Versus opponents are stationary in the completion fixture, and the
optional co-op route is carried by P1; this does not claim human balance.

Every completed build/repair/remix is now archived before validation. Identical
code keeps separate immutable attempt metadata and an append-only outcome history;
probe exceptions and cancellation remain inspectable. Legacy candidate rows are
preserved without inventing missing historical metadata. Storage failure is logged,
and an interrupted partial stream is not presented as a complete generated game.
Structured local reviews now bind observations to exact code/evidence hashes;
four historical scoring/control/HUD defects are queryable without promoting those
candidates. Prompt defaults no longer impose universal one-point rewards,
one-minute versus rounds or a global 16-colour ceiling. Original user wording is
retained through repair and CLI remix.

Pong's home preview now uses the actual serve input. A rendered-pixel browser
check proves a serve, paddle return and scored point without starting the real
game. Runtime builds also sync the cabinet's served files, fixing a stale-preview
deployment found during that check. All 38 demo/player modes pass the offline
footprint/CPU sampler; details and its measurement limits are in the completion audit.

## Scope / evidence ledger

| Deliverable | Current state | Evidence required |
| --- | --- | --- |
| SQLite + file catalog, version/hash retrieval | Implemented | Retrieval, dedupe, incomplete packs, stale source/evidence and unique run tests pass |
| Tested fighter, named Batman/Flash, 1P/2P | Admitted | 53 behavior checks; independent character selection and real combat/render evidence; 60 original poses |
| Kart racer, 1P/2P | Admitted | 13 behavior and 6 adapter checks; native default three-lap routes; human-only checkpoint/finish hooks, drift, readable split-view bend cues and 18 original frames |
| Maze, barrel/ladder climber, Pong, Breakout | Admitted | Independent behavior/probe/render review; maze input delay found and fixed before admission |
| 10–15 distinct arcade families | Thirteen admitted | Content-bound behavior, visual and 1P/2P evidence; route/fixture limits recorded individually |
| Complete relevant animation data + source art | Implemented across thirteen | Timing/anchors/geometry preserved; original, CC0 and private commercial source classifications stay distinct; unsupported states explicit |
| Astra medium composition + actual custom request | Actual outputs audited; expanded bench complete | Frozen samples exposed AI hook/scoring bugs and oversized climber art. Both foundation contracts fixed; expanded twelve-sample benchmark passed probes with rule/overlay defects recorded |
| Automatic candidate ingestion, controlled reuse | Implemented | Builds/repairs/remixes archived before validation; per-attempt history preserved through dedupe; runtime pass stays quarantined |
| Cabinet integration, streamed previews, no autoplay | Verified | Actual controlled SSE, 320/640 layout screenshots, DRAFT assets, cancellation and START gating |
| Quality/latency evaluation vs current generator | Measured; quality work remains | Twelve-family audit plus standard 32-prompt v4.4 benchmark; retrieval/control failure, malformed transformed sprite and freeform timeout remain |

## Initial measured composition results

Unique run IDs and separate artifacts for each sample, Astra medium:

| Request | 1P total / output tokens | 2P total / output tokens |
| --- | --- | --- |
| Batman versus Flash fighter | 16.6 s / 396 | 13.5 s / 206 |
| Night coastal kart race | 35.5 s / 1,378 | 44.3 s / 1,662 |

All four passed the actual input probe. These are individual observations, not a
large-sample latency or fun/balance study. The reusable code/pixels are bundled
outside model output. Earlier same-minute benchmark artifacts collided because
run IDs only contained a minute timestamp and prompt slug; run storage now uses
milliseconds plus an atomic unique suffix, and these four samples were rerun.

No claim of RL or training: this is retrieval, composition, evaluation and curation.
Do not promote a generated file because it is merely syntactically valid or animated.
Do not overwrite the user's existing games. The later user request authorizes the
current home carousel and playing these local games; creation still waits for PLAY.

## Source discovery and actual-output audit

- [External source library](../../library/sources/README.md): 16 verified Arcade game pages and 87 curated sheet links indexed in SQLite, with kind/camera/family/limitations/rights metadata. Eight raw PNGs cached, including Pole Position car/scenery and Pac-Man actor/palette sheets; discovered links never grant runtime availability.
- [Spider-Man import proof](../research/spider-man-sheet-audit.md): 57 original source crops, authored adapter clips and actual fighter runtime evidence. Hurt/KO mappings remain uncertain. Optional exact per-sprite palettes implemented; 55 source frames preserve every supported opaque RGB pixel. Two web-effect frames need layering, and hurt/KO mappings remain uncertain. This is not a complete admitted commercial sprite pack.
- [Frozen generation audit](../bench-2026-09-19-catalog-generations.md) follows full input routes and documents real failures that the short probe missed. Existing sample games are preserved unchanged.
- The goal remains active: expanded generation audit covers twelve fresh samples; imported art still needs uncertain-clip and layering work, and human balance/physical CRT testing has not happened. Admission establishes a reviewed reusable technical foundation, not commercial-game fidelity or a fun score.

- [Expanded Astra audit](../bench-2026-09-19-catalog-expanded.md): 12/12 raw probes passed and eight full native wins; generated score/spec drift and HUD-overlap defects are retained as explicit failures of quality, despite probe success.
- [Runtime palette verification](../runtime-palette-validation.md): 245 legacy snapshots match byte-for-byte; exact colors also match the isolated DRAFT worker. [Donkey Kong import](../research/donkey-kong-sheet-audit.md) supplies native source frames on the tested climber, not original ROM levels/mechanics.

- Reviewed local Donkey Kong adaptation is now eligible for named requests (13 packs / 12 families, 52 sprite sets). Its artwork is private; original levels/hammer/lifts are not claimed. `data/local-catalog` uses the same content-bound admission gate and falls back to the original when absent or stale.

- Actual named Donkey Kong request retrieved the private source-art adaptation, emitted 134 customization tokens, and passed its probe in 10.1 seconds; native 1P/2P full routes independently reached three-stage wins. See the DK audit for exact run and limitations.

- Actual 2P cabinet HTTP generation also selected the Donkey Kong source pack and reached READY in 12.1 seconds, including streamed source-art preview. These two timings are individual observations, not a latency guarantee.
- [Final standard v4.4 benchmark](../bench-2026-09-19-palette-v44.md): 18/20 1P and 11/12 2P attempts passed; zero completed syntax errors, two probe failures and one 300-second timeout. Completed-only p50/p95: 168.8/220.6 seconds (1P), 187.2/254.1 seconds (2P). Freeform latency, retrieval misses and generated control/geometry defects remain unresolved; the broader goal stays active.

- [Pole Position source-art racer](../research/pole-position-sheet-audit.md) is admitted locally: 12 source poses plus mirrors and four source palettes, with native 1P/2P full three-lap races, controls, crash playback, timeout and reset evidence. The original kart adapter preserves all ten legacy comparison frames. This brings the local index to 14 verified packs / 12 families / 56 sprite sets. Named retrieval and isolated-worker DRAFT frame parity pass; original Pole Position qualification, gears, track and scenery are not implemented.
- Fresh Pole Position model generation is unverified: the API returned HTTP 429 for the project's enforced spend limit before generating output. No retry or billing change was made. Offline development and curation can continue; this is not a reason to mark the broader goal achieved or blocked.

## Offline continuation: source-art maze and generation-contract fixes

The preceding status-response turn was no-progress; this continuation changes
authoritative code, imports and verified runtime evidence. No paid generation calls
were attempted while the project spend limit remains active.

- Pac-Man source actors are imported with exact RGB, 64 native cells and 36 complete
  clips, preserving timing, anchors, geometry and per-crop provenance. Independent
  source/native pixel comparisons pass. The private named pack is now admitted.
- Maze v1.1 accepts complete source art while preserving canonical collision rules.
  Eighteen behavior checks and both real probes pass; eleven old screenshots are
  byte-identical. The exact private default 1P/2P games both completed all three
  rounds with all four active ghosts through ordinary input replays. Idle loss and
  fresh reset also pass. See the Pac-Man audit for hashes, scores and limits.
- Crossing v1.1 supplies per-player home-notice slots; falling-blocks v1.1 supplies
  well-border clear flashes and both expose layout geometry. Actual-input native
  pixel comparisons prove the provided effects preserve TIME/NEXT and default
  gameplay. Thirteen behavior checks/four probes pass. Arbitrary custom overlays
  can still be wrong; historical generated games were not rewritten.
- Mechanics-aware retrieval recovers the frozen frog/traffic miss and tests unnamed
  paddle and brick variants, negations, named-pack gating and unsupported hybrids.
  Offline frozen comparison is 8 → 9 selected foundations over 31 saved specs (32
  request rows); other 30 selections unchanged. This is not a fresh model-quality
  or latency improvement measurement.
- Current index: 15 verified packs / 12 families / 57 sprite sets / 16 source games /
  87 sheet references / 8 cached PNGs. Full harness suite 76/76 and typecheck pass.

Remaining goal work: stronger fighting-game visual/action fidelity and source clip
certainty, layered high-color source effects, broader composition reliability and
freeform latency, human gameplay/balance and physical CRT/controller review. Current
evidence does not establish all of those requirements; the full goal stays active.

### Live-preview host defect found and fixed

The Pac-Man integration check found that the actual preview iframe rejected
assembled code above 150,000 characters, even when a direct worker could render it.
This made large linked artwork packs invisible in the live build screen.
`packages/runtime/build-preview.mjs` now bounds the assembled payload at 1,000,000
characters and reports rejection explicitly. The separate 150k customization parser
limit, opaque iframe, no-network CSP and one-second worker watchdog stay in place.
The rebuilt preview was synced to the running cabinet.

The real cabinet regression now sends the actual large fighter pack, verifies
oversize rejection and valid recovery, and terminates a large infinite-init draft.
The existing cancellation, reduced-motion, no-autoplay and voice lifecycle checks
pass; 26/26 runtime exercises pass. Pac-Man's private preview proof tests actual
1P/2P iframe rendering and source-to-goose customization against native RGBA.
Earlier Pole Position preview parity covered the worker alone, so it did not
prove that the size-limited host would accept its payload.

Final preview evidence includes 126 exact native/worker frame comparisons through
ghost release (19 distinct source-art frames per player mode), actual iframe
customization/rejection/watchdog/recovery checks, and a passing real-cabinet suite
with a public large fighter pack. All 15 packs remain verified with no catalogue
load issues.

### Home carousel — local demos, 2026-09-19

The requested home redesign now presents all 15 verified catalog games through
metadata and per-selection demo endpoints. Swipe, arrows and cabinet input browse;
1P/2P applies to Play and Make a Game. Play opens instructions before starting.
The muted sandbox preview skips the first three seconds and loops up to 30 seconds;
actual gameplay remains paused and cannot submit preview scores. Reduced motion
shows a still. Rapid browsing cannot launch the previous loaded game.

Offline evidence: 30 demo modes assembled/ran; all 30 rendered changing views over
240 native frames. The home browser regression visited all 15 previews, exercised
swipe/keyboard selection, mode selection, Ready, pause/resume, voice entrance and
reduced motion, and checked 320×240, 640×480 and 1280×720 layouts. Player-flow and
build-preview suites also pass. Model/speech calls were mocked or blocked in the
browser tests; zero live model requests. Screenshots and home results are in
`bench/audits/home-ui/`. Physical CRT calibration remains unverified.

### Fighter composition and source reactions — Codex-only offline pass

Fighter 1.1 supports exact-color composite frames and per-step anchors, all-to-all timed hit/hurt geometry, true empty-hurtbox invulnerability, and consistent projectile direction after the owner turns. Invalid custom palettes/planes/geometry/frame references and missing attack phases fail before play. Airborne KO/timeout winners and losers now land instead of freezing; wide defeated poses stay visible at stage edges.

Verification: 29 fighter checks, fresh actual-runtime 1P/2P probes and native screenshots pass. Content-hash admission and SQLite were refreshed; all 15 packs remain verified. The full harness suite passes 92/92. No paid API was used.

Private Spider-Man source study: all 57 earlier frames now render with exact source colors through the fighter (114 both-facing comparisons). A separate 68-frame revision replaces the ambiguous hurt/KO proxies with visually reviewed recoil/fall/downed source poses using explicit authored timing and registration; 136 native comparisons have zero mismatches. Natural CPU combat captures both hurt stages, falling and final grounded KO. Old imports/proofs remain unchanged. This revision is not admitted as a finished character: signature web behavior, source-state certainty, larger native-art staging and further playfeel review remain.

The next signature-mechanic pass has source evidence ready in `../research/spider-man-web-review.md`: separate traveling strand, burst and compact wrapping cells with exact crop rectangles. These are reference candidates, not yet indexed playable web assets. The first projectile needs an explicit merged crop because the cell scanner split its visible trail.


### Character-specific projectiles and durable sprite reuse — offline pass

Fighter 1.2 adds authored emitter sockets, exact-color travel/impact/bind clips and explicit projectile collision geometry. The optional short grounded trap breaks on follow-up damage, has a rebinding cooldown and clears at round reset; guard/air interactions remain distinct. Long source trails grow out of the hand instead of appearing across the body on their first frame. All 41 fighter checks and fresh native 1P/2P original-pack probes pass; public fighter evidence and the 15-pack index were refreshed.

The private Spider-Man draft now has 84 source frames and 19 clips, with independent source import proofs and 168 exact native both-facing render comparisons. Actual input scenarios exercise source-art shots from both controllers, guard, jump-over and CPU gameplay. This is an authored adaptation, not recovered proprietary code/timing. The source set remains draft until the remaining move/scale/feel review is complete.

Sprite normalization and linking now preserve per-step projectileOrigin and per-character projectile definitions through SQLite and ART. Compatible side-view sets can supply ART.get(id).character() to the fighter factory without the model printing or reconstructing pixels/timing. The adapter rejects incomplete poses, incompatible box coordinates, fractional timing and pre-mirrored clips. Existing generic ART drawing remains supported. Private data/local-assets is discovered alongside library/assets; explicit test roots stay isolated and duplicate identities cannot shadow one another. No paid API calls were made.

Final integration evidence for this pass: 99/99 harness tests, harness typecheck and changed-file formatting pass. Fresh discovery reports 15 verified foundation packs and 58 sprite sets with no load issues; the new private set is explicitly draft, retains 84 frames/19 clips and its emitter in SQLite, and is excluded by the actual selection function. No claim is made that the full quality/latency/hardware goal is complete.
