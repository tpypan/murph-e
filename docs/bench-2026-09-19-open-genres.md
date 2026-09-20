# Open genres and expressive pixel art — 2026-09-19

The user requested richer arcade games after a Street Fighter request became a
tiny static-sprite dodge game. The generation contract now preserves the actual
genre, accepts new and hybrid genres, and includes an explicit art direction.
It no longer asks for 120–220 lines, tiny sprites, or a reskin of a global example.
Examples are optional and must match both genre and player count. Fighting
guidance specifies attack states, readable poses, spacing, blocking, hitstun and
opponent recovery. Scrolling stages, rounds and progression are allowed.

Models remain Astra low for build/repair/remix and Luna none for specification.
The 256×224 runtime, fixed 16-colour palette, single JavaScript file, 12k output
token budget and no external assets/network remain. There is no reference-image
research stage. These changes remove prompt restrictions; they do not establish
commercial-quality art, animation, or game balance.

## Measurements

These are specification plus one builder call, excluding transcription, review,
probe, repairs and cabinet delivery. They do not measure the cabinet's candidate
race. Small samples and overlapping benchmark jobs limit latency comparisons.

| Batch | p50 | p95 | First-pass result |
| --- | ---: | ---: | --- |
| Previous Astra context, 20 one-player prompts | 44.8 s | 57.6 s | 19/20 original probe, 20/20 after the earlier input-check correction |
| Open genres v3, 20 one-player prompts | 84.6 s | 124.1 s | 18/20 |
| Open genres v3, 12 two-player prompts | 92.5 s | 121.7 s | 10/12 original probe |
| Final v3.1, four focused genre prompts | 131.7 s | 161.3 s | 3/4 original probe; 4/4 with conditional-action check |
| Final v3.1, two-player sumo and coin follow-up | 79.8 s | 91.8 s | 2/2 |

Raw results are in `bench/results/*open-genres*.{json,md}`. The initial focused
batch generated fighting and rhythm successfully but timed out on brawler and
racing at 120 seconds. A brawler retry timed out too. The build/repair deadline
was raised to 180 seconds; spec stays 30 seconds and remix 60 seconds. This is a
deliberate latency regression for the requested richer output, not a speed win.
The deadline applies per call, not to the entire pipeline.

Final focused outputs:

| Game | Actual genre | Spec + build | Current probe |
| --- | --- | ---: | --- |
| RING RIVALS | fighting | 135.4 s | pass, UP observation remains |
| GOBLIN KNIGHT | side-scrolling beat 'em up | 161.3 s | pass |
| BEATFALL | rhythm | 95.1 s | pass |
| DRIFT CIRCUIT | top-down racing | 131.7 s | pass |

Thumbnails were visually inspected for the new fighters and brawler. The earlier
STREET CLASH output also received targeted jump/attack/block/crouch pose checks
and a scripted complete combat run (win, score 4000, no runtime error). This is
limited evidence of visible animation and a completable round, not a fun score.

## Failures and bounded fixes

- The initial one-player batch had a load-time initialization error and a maze
  decoy that the short probe could not activate. The initialization error passed
  one existing repair call in 79.8 seconds; its original failed result remains.
  The maze remains an unresolved eligibility/probe observation.
- Initial two-player sumo locked inputs during an intro; coin collection declared
  unused actions as strings. Final instructions allow practice during intros and
  require null unused controls; exact unused labels also normalize to null.
  Both newly generated follow-up games pass in two-player mode.
- Racing requires holding A while steering to drift. The checker previously
  pressed A alone and rejected it. It now tries held action combinations against
  the identical movement-only baseline. Steering alone cannot pass a dead A,
  and crashes during the combination still fail. New regression cases cover all
  three situations. Brawler's held B is recognized by the same check.

Saved code was rechecked without new model calls. Results are separately stored
in `bench/results/2026-09-19-open-genres-current-probe.json`, retaining the original
benchmark outcomes. Specs in these rechecks normalize exact unused labels; saved
two-player mode is preserved. The initial two-player batch becomes 11/12 with
normalization; its intro-locked sumo still fails. The one-player batch stays
18/20. No generated source was rewritten to improve those counts.

## Local validation

- 26 harness tests and 8 browser input regression tests pass.
- All 50 saved library games and 10 templates pass with their actual controls.
- All 10 deliberately broken fixtures fail, including input-triggered crashes.
- Harness, probe and cabinet TypeScript checks pass; changed source passes Biome
  and `git diff --check`.

Passing means basic loading, drawing, survival and input checks. It does not
verify every move, enemy strategy, score balance or visual resemblance. Prompt
changes apply to new generations; existing library games retain their code.
