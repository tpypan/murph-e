# Goal completion audit — 2026-09-19

Scope: offline inspection of the current files, executable foundations, recorded
native-runtime proofs and cabinet tests. No model requests or live generation.
This is a completion audit, not another admission certificate or a human playtest.
The requirements below come from `docs/plans/curated-arcade-library.md` and the
user's ongoing request for a small, reusable, polished arcade collection.

## Inventory at audit start

Direct `loadCatalog()` discovery returned **17 verified packs, 13 distinct factory
families, zero issues**. The four private packs reuse climber, maze, kart and
speed-platformer controllers; they are not four additional mechanics families.
`loadSpriteCatalog(parts)` returned **66 sets: 40 verified, 25 source-checked,
one draft**, with zero issues. “66 sets” does not mean 66 complete fighting-game
characters. Effects, props, directional actors and foundation-specific sets all
count. The draft Spider-Man set remains ineligible for retrieval.

Public families: fighter, kart, maze, climber, Pong, Breakout, formation shooter,
Asteroids, crossing, bomber, falling blocks, missile defense and speed platformer.
Private source-art adaptations: Donkey Kong, Pac-Man, Pole Position and Sonic.

The bundled factory texts range from 11,958 bytes (Pong) to 233,868 (fighter);
the largest private factory is 215,656 bytes (Pole Position). These are source
sizes, not measured download/compressed sizes or a frame-time benchmark.

## Requirement matrix

| Requirement | Demonstrated evidence | Assessment / specific limit |
| --- | --- | --- |
| 10–15 distinct popular arcade foundations | 13 distinct public factories with actual modules, demos, contracts, animation data and content-bound reviews | Breadth met. Do not report 17 distinct games/mechanics or imply original commercial implementations. |
| Functional full games with scoring, escalation, loss/win and reset | Family-specific input policies and recorded native routes; scores, terminal ownership, life/reset checks; collision, ghost-house, checkpoint and attack-window tests | Strong technical coverage. Some native completions use assisted configuration; see below. This does not establish human balance or uniformly polished feel. |
| Meaningful 1P and independent 2P | All 17 advertise both modes; behavioral checks cover separate input/score ownership; team versus competitive rules differ by family | Met at controller level. Fighter also has actual cabinet keyboard proof for separate selection/lock/unlock and both-confirm gating. |
| Complete relevant animations and useful metadata | Usable pixel rows, timed clips, palettes, anchors, collision conventions, source/provenance and explicit unsupported states; exact native pixel proofs for imported assets | Met for reviewed supported states, not every possible action. `actor.character()` rejects incomplete/incompatible fighting sets; source-checked walking art is not a complete fighter. Spider-Man remains draft and separately audited. |
| Relevant stored pieces compose without reproducing all source | Factories bundle deterministically; `ART` preserves animation and projectile metadata; frozen generated customizations and offline contract tests exist | Partly proven. Selection/matching was found to offer incomplete/inappropriate identity art and is being corrected by root. One selected foundation is not automatic arbitrary hybrid composition. |
| Every generated result is archived automatically | Code-hash storage, SQLite candidate table and quarantine already exist | **Gap reproduced in source:** build/repair archive happens after awaited probe; thrown probes skip it. Remix branches never call archive. Deduplicated later runs retain only run ID, not their own prompt/spec/model provenance. Root delegated a narrow corrective pass. |
| Small runtime; no external game assets/network | Plain runtime, one linked `game.js`, local exact palettes and source files, no external engine required | Met for play. Speech is local after model setup. New customer game generation uses API and is not offline; assistant development remains Codex/offline only. |
| Sound belongs to gameplay | Actual `api.sfx`/`tone` calls; indexed sound bank; `bench/audits/audio/gameplay-audit.json` records 93/93 inspected code/mode samples with gameplay cues, and audio UI proof passes | Functional event/audio coverage. Not speaker loudness, fatigue or physical cabinet tuning. |
| CRT-readable presentation and physical inputs | 640/320 screenshots, safe-area layout, keyboard routing and no-autoplay tests; detailed design guide | **Not complete at 320×240:** actual fighter selection canvas measured 128×112 (half native); small letters lose strokes. 640 works in saved inspection. No physical CRT/encoder/overscan/viewing-distance acceptance. |
| Quickly generate a good requested game | Frozen known-foundation samples compose in roughly 10–44 seconds; current source/import work avoids printing thousands of unchanged pixels | Not a universal latency guarantee. Frozen standard v4.4 was 29/32 short-probe passes, completed-only p50 168.8s/187.2s (1P/2P), plus a 300s timeout. New offline improvements are not a new measured model-quality/latency benchmark. |

## Behavior evidence versus overstated completion

The verifiers check substantive mechanics rather than only “canvas changed.”
Examples inspected in source: Breakout runs all three formations, checks each
durability transition and swept collisions at a larger timestep; formation shooter
clears all three default waves and verifies single-credit kills; Asteroids checks
seam geometry, retained inertia, safe rate-limited warp and default-sector clears;
missile defense checks finite ammo and the actual expanding/contracting radius
sequence; fighter tests real attack/hurt windows and independent character select.

Important fixture boundaries:

- Bomber's older `test.mjs` assisted routes retain their labels (nine lives/180s or open boards). The later `default-test.mjs` and `evidence/default-runtime.json` close the default-settings completion gap: solo `{}` clears both levels/all seven enemies in 5,512 frames; versus `{}` clears default crates over three rounds in 4,740 frames with both controllers credited. Native independent input, terminal and reset checks pass. The versus target remains stationary during each attack, so adversarial balance is still unproven. Optional coop changes only mode and is carried by P1 after idle P2 is eliminated; it exposed and now covers the zero-life resurrection bug at level transition.
- `library/catalog/maze/screenshots.mjs` classic cooperative completion disables
  ghosts; its separate hunt route uses all four. Stronger classic evidence exists
  in the private Pac-Man `verification/native-play.json`: actual default wrapper,
  all ghosts and three rounds in both modes. Do not describe the old public
  shortcut as the full adversarial proof.
- Falling-blocks deterministic bots clear a 12-line goal in about ten seconds.
  That verifies line handling, locks, garbage and results, not reasonable human
  difficulty or an organic game session.
- Generic fighter probe starts on character select and reports unchanged UP,
  DOWN and unlocked B. Dedicated selection-then-combat native proofs cover those
  controls; the generic short probe alone does not.

Twelve existing behavior verifiers passed again in temporary copies so admitted
source and evidence were not rewritten. Fighter's other 45 tests passed in its
copy; the separate asset-render test needs its repository-relative runtime path
and was therefore run from its original read-only location. Native
browser proofs were inspected as saved artifacts rather than silently rerun or
re-signed during this read-only audit.

## Concrete remaining work / inaccurate claims to avoid

1. Archive fully emitted candidates **before** validation, preserve each attempt's
   immutable provenance, and record outcomes for errors/cancellation/remix as well
   as successful builds. A probe exception must not erase generated work.
2. Keep matching compatible with the requested role and identity. More stored sets
   are not helpful if a top-down walk-only character is handed to the fighter.
3. Treat 320×240 as an explicit unresolved presentation limitation until an actual
   screenshot at sufficient native pixel scale passes visual review. See
   `bench/audits/fighter-selection-ui/results.json` and `selection-320.png`.
4. Bomber default-settings completion is now recorded for solo and versus, with native direct-control/terminal/reset checks. Keep the stationary versus opponent and P1-carried optional coop limitations explicit; this is not a human/adversarial balance study.
5. Refresh stale inventory claims. `library/catalog/README.md` still says 15 packs,
   12 families and 57 sets; the active-goal ledger includes older 15/58 milestones
   and an obsolete fighter 15-check row. Historical results should keep their date
   and scope, with one current summary distinguishing 13 families from 17 packs.

None of these findings warrants a fresh paid-model request. Archive/matching,
default-route coverage and layout can be corrected and checked offline. Human
gameplay and physical CRT acceptance remain separate from automated admission.

## Follow-up: archival defect corrected offline

The bounded archival correction now saves fully emitted build, repair, remix and
remix-repair output before validation. `candidate_attempts` preserves each
run/stage/variant's prompt, complete spec, model/effort, selected part/sprite hashes,
raw output and customization. Identical code still has one `game.js`, while
separate immutable `attempts/<id>.json` files preserve its distinct origins.
`candidate_validation_events` and separate outcome files retain pending, passed,
failed, exception and cancelled observations. A pending record accurately means
validation has not finished; it is not silently labeled a failed runtime test.

Existing candidate and run rows survive schema extension. Missing historical
per-attempt provenance is **not** reconstructed or invented. Output that never
finishes streaming is still a transport failure, not a completed archived game.
Storage failure is logged explicitly and does not replace an otherwise playable
result; that is a known operational boundary of the “every result” guarantee.

Verification: `candidate-history.test.ts` covers distinct requests/models with
identical code, same-run variant/remix/repair separation, immutable metadata,
pending-before-probe ordering, exceptions/cancellation, storage failure and legacy
schema preservation. `pipeline-history.test.ts` executes the actual pipeline and
storage with mocked producers and a network tripwire, covering probe exception,
repair, remix, failed-remix repair and raced identical output. No providers are
imported or called by that integration test. Existing catalog tests still pass.

Matching, Spider-Man admission and bomber completion are being corrected in
parallel. The inventory above is a timestamped audit snapshot, not a claim that
their subsequent changes are absent; the parent task maintains the final ledger.

## Previous combined offline check

Those corrections are now integrated: 18 verified packs / 13 mechanics families,
66 sprite sets (40 verified, 26 source-checked), zero discovery issues. Spider-Man
is admitted for the authored fighter contract and has an actual-demo character
picker. Fighter retrieval excludes partial source poses and negated identities;
an actual saved Spider-Man set composes with the public fighter through ART.

The full 121-test harness suite and typecheck pass. The actual home browser
regression passes all 18 previews, player-mode and Ready gating, pause/resume,
reduced motion and safe-area checks with zero model requests. The updated audio
audit passes 101 samples. Default bomber completion and the co-op life-reset fix
are documented in its native evidence, with fixture limits retained.

The 320×240 gameplay legibility finding remains open. 640×480 is the working target
pending the user's cabinet resolution; human balance and physical CRT acceptance
have not been inferred from browser or bot tests. Historical latency evidence is
unchanged, and no new paid model measurements were made.

## Follow-up: source Batman, prompt consistency and usable previews

The current index has **19 verified packs across 13 mechanics families**, with
**67 sprite sets (40 verified, 27 source-checked)** and no discovery issues.
The extra pack is Atari Batman on the existing fighter controller, not another
mechanics family. Its 33 source-derived frames supply the documented contract
through explicit pose reuse; authored timing, defensive holds, neutral victory
and held-prop flight are distinguished from recovered source art. The old partial
Batman/Joker/Superman collections remain unchanged. See the
[source Batman review](batman-atari-fighter-review.md) for 66 pixel comparisons,
30 both-facing move cases, five projectile cases and both actual-demo player modes.

The final harness suite passes 129 tests and typecheck. The real cabinet passes
all 19 previews, Ready gating, both player modes, pause/resume and reduced motion.
A separate Pong check measures the rendered ball crossing the court, a paddle
return and an awarded point while the playable game remains at frame zero. It
caught both a missing attract-mode serve and a stale served runtime bundle.
The serve driver is corrected; the root runtime build now also syncs the cabinet's
public files without restarting the USB/badge server. This browser check blocks
generation, speech, external requests and score writes.

The refreshed audio audit passes all 103 samples with no excluded catalog packs.
It exercises the actual runtime with two fixed input seeds and records gameplay
cues after START; it does not establish coverage of every sound branch or physical
speaker levels. The report is `bench/audits/audio/gameplay-audit.json`.

The offline footprint/CPU sampler ran all 38 demo/player-mode combinations with
no load/runtime errors, exclusions or discovery issues. On this Apple M4, the
largest assembled demo is 534,887 bytes (87,577 gzip); the slowest observed p95
update/draw sample is 5.325 ms for two-player Sonic. These timings include native
pixel drawing, input driving and probe hashing after 180 warmup frames, with one
seed and at most 600 sampled active frames. They exclude browser presentation,
GPU scheduling, physical display and model latency, so they are not a universal
60 FPS guarantee. Reproduce with `scripts/audit-catalog-performance.ts`; exact
per-demo hashes and observations are in `bench/audits/catalog-performance.json`.

Prompt review removed conflicting universal one-point scoring and one-minute
versus guidance. Selected foundation rules now control defaults unless the user
explicitly asks to change them; the original request survives both repair and
CLI remix even when the planner omits a detail. The planner and shared core no
longer impose a global 16-colour ceiling over exact source palettes. Original
fighter sprites now retain their known side-view camera metadata, preventing a
wrong-view Batman fallback in a top-down request. Offline prompt/retrieval checks
prove those context changes, not a new measured model-quality improvement.

The archive now stores append-only, exact-hash reviews. Four confirmed historical
score/control/HUD defects are queryable in SQLite, with original evidence; all
four candidates remain quarantined. This is review feedback and regression work,
not RL, automatic training or automatic reusable-code admission. See
[candidate review](candidate-review-feedback.md).

Kart scenery and road edges were revised for readability, including advance bend
cues in split screen. Original/private racers retain their actual default
three-lap native input routes in both modes. Human handling preferences,
adversarial balance and physical CRT acceptance remain separate. The earlier
320×240 below-native-scale limitation is still unresolved; 640×480 remains the
working target pending the cabinet's input resolution.

## Final integration and branch readiness

The full suite now passes 138 harness tests, 12 badge tests and 26 offline browser
runtime checks. All four packages build; cabinet and harness typechecks pass.
Real home checks visit all 19 local entries, including named Sonic/Batman/Spider-Man
adaptations. A separate fixture proves metadata refresh, selection/mode retention,
changed-revision cache invalidation, transient-error recovery and no autoplay.

An actual retrieval defect is corrected: “Batman and Flash riding karts” and
Batman/Flash-themed Pong no longer treat the character pair as a fighting mechanic.
Bare Batman/Flash and explicit Street Fighter still select the fighter. Native
assembled 1P/2P tests prove kart throttle, independent paddles and fighter character
confirmation; this is contract/composition evidence, not a new model benchmark.

Code streams now require a provider terminal event. Syntactically valid partial
output ending at transport EOF cannot pass as a completed game. Conversely,
provider-completed output survives teardown errors or simultaneous cancellation
and reaches durable archival. The pipeline records cancellation before probing,
repairing, returning a fallback or publishing Ready. The raced winner is preserved,
while a late completed loser is retained as a cancelled attempt. The CLI-only
remix path receives the same terminal-output protections. All regressions use
mocked producers and network tripwires; no paid model calls were made.

Clean-checkout inspection covers every public manifest, declared file and quality
evidence path: 199 required paths across 13 public foundations are present and
Git-eligible. With private roots absent, 13 verified demos load and all 26 player
modes assemble without diagnostics. The six commercial source-art adaptations
remain private under ignored data paths; downloaded sprites, SQLite/run history,
speech models, dependencies and credentials are not part of the repository push.
Cabinet predev/prebuild reconstructs its ignored runtime bundles.
