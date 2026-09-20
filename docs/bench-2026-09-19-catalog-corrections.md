# Corrected kart and climber composition checks

Astra medium is unchanged. The current kart foundation emits checkpoint/finish hooks only for human racers, with documented base rewards; the current climber rejects oversized avatar art that does not fit its floor spacing. Historical generated files are preserved.

| Request | Mode | Total | Build tokens | Actual probe |
| --- | --- | ---: | ---: | --- |
| Three-lap red ACE coastal kart | 1P | 37.8 s | 689 | Pass |
| Three-lap red ACE coastal kart | 2P | 25.0 s | 638 | Pass |
| Three-stage kitten rescue climber | 1P retry | 11.8 s | 212 | Pass |
| Three-stage kitten rescue climber | 2P | 44.3 s | 1,283 | Pass |

The first 1P climber spec request exceeded the existing 30-second deadline. It emitted no game and is retained as a failed request in the first result file; the bounded retry passed. Do not fold that failed attempt out of end-to-end reliability reporting.

Files:
- `bench/results/2026-09-19-2144-catalog-corrections-medium-1p.json`
- `bench/results/2026-09-19-2145-catalog-climber-fit-retry-1p.json`
- `bench/results/2026-09-19-2146-catalog-corrections-medium-2p.json`

Inspection of all four model-written wrappers confirms both kart modes customize real track/driver properties and add no duplicate score/finish hook. Both climber modes reuse the fitting built-in worker and kitten artwork. The 1P climber is a small lifecycle wrapper over the actual three-stage foundation.

A remaining issue appeared in the 2P climber spec: it invents rescuer-only bonus ownership and team termination on a single timer expiry, contradicting the foundation defaults and adding behavior the user did not request. The builder then writes score-adjustment and timeout hooks to honor those incidental spec details. This is not a runtime crash; it is unnecessary semantic drift. The planner/build handoff needs stronger default-rule fidelity, followed by another measured test. Do not describe all four samples as fully semantically faithful simply because they passed the input probe.

Native probe thumbnails for the 1P samples were visually reviewed: compact worker fits between girders, goal remains visible; kart has readable road, ACE red vehicle and correct race HUD. Full playable-route coverage for the foundations lives in their content-bound evidence; these four new samples have short runtime probes and source inspection, not new full human playtests.

## Targeted v4.3 prompt follow-up

Strengthened the planner and shared factory guidance: unrequested scoring, life/timeout, control and terminal rules remain authoritative in the tested contract; the builder must not write hooks solely to honor incidental planner inventions. Explicit transcript changes still take priority. Cache keys are now spec/build v4.3; model/effort unchanged.

The same 2P climber request now produces a 151-token wrapper, completes in 11.6s and passes the actual probe (`2026-09-19-214938605-donkey-kong-style-climb-a-constr-jUQSBq`). Inspection confirms no score-adjustment hooks and no early team-timeout override; it uses the tested default rules. This is one measured follow-up, not a statistical latency claim. The planner still words the shared rescue award ambiguously as both a rescuer bonus and a shared clear bonus; the builder correctly leaves actual scoring to the factory. Further spec truthfulness evaluation remains appropriate.
