# Multiplayer from the start

Implemented on `codex/jev-experiment`, 2026-09-20. New games target **both solo and
local two-player play in one game.js**. The menu's `players` value still chooses
how many humans are active now. The runtime and badge hardware currently support
one or two local humans; this change does not add network play or higher counts.

## Design and generation

The generated-spec schema now requires a `multiplayer` plan: co-op or versus,
solo adaptation, both human roles, shared or split camera, score/life ownership,
and end/reset conditions. Historical specs can still be read without this field,
but the live specification producer rejects a new response that omits it.

Both planner prompts and the build prompt require the same file to handle
`api.players=1` and `api.players=2`. Player state and indexed inputs are established
at init; solo may use a CPU opponent, AI partner or suitable solo balancing. In
2P both humans must have meaningful independent actions and visible identities.
A spectator or a CPU-owned second human slot does not satisfy the contract.
One control mapping applies to each human; the cabinet owns START and player
selection. Existing model, effort, request deadlines and spending guards remain.

Standard and Jev-assisted generation only use foundations whose current verified
manifest supports both counts. Pre-spec retrieval applies the same filter. The
old sky-racer is still verified for 1P playback, but is excluded from new game
requests until it gains and verifies 2P. That removes its previous short-wrapper
fast path for now; do not describe the old 15.5s benchmark as a measurement of this
new policy. No legacy game or quality evidence was rewritten.

## Acceptance and repair

For each new-plan build, repair, remix or remix repair, the harness probes the same
code in 1P and 2P before returning success. It keeps the selected session's thumbnail,
prefixes observations by mode and stores separate checks in run evidence. A failure
in either mode enters the existing bounded repair path, followed by both checks
again. A successful solo check cannot conceal a failed multiplayer check.
Legacy specs without the plan retain their original validation behavior; normal
new specification output cannot take that legacy path.

The probe fixes the action-only loophole: with no directions declared, P2 needs
a working declared action. New dual-mode games additionally compare deterministic
P1-only and P2-only input traces against idle and each other. This rejects ignored
P2 input and identical mirrored controller effects. It is an observable-input
heuristic, not a proof of fair balance, correct actor ownership through a full
match or every end-state transition. Those remain authored behavior-test and
play-review requirements. More unusual cooperative role designs may need a
specific behavior test if the generic visual-input heuristic cannot observe them.

The standard catalog verifier requires both counts and invokes the independent
input check. Each new reusable foundation still needs content-bound behavior,
visual and runtime evidence for both counts. Shared components need explicit
player/team ownership, instance isolation and reset behavior.

## Verification

Offline regressions cover required new-spec fields, legacy reading, both planner
modes, build/repair guidance, standard/Jev foundation filtering, rejection and
repair when only 2P fails, action-only ignored P2 and mirrored controls. Existing
saved foundation demos are also checked against the new two-mode probe without
mutating their admission evidence. No paid model call is needed for these checks.

The expansion roadmap now treats multiplayer as an acceptance requirement for
every new seed and promotion. Existing solo-only saved games are not automatically
converted. A future library UI for switching an already saved generated game
between modes is separate from this generation contract; callers still load the
same generated code with the chosen runtime player count.

Validation completed: 174 harness tests, 14 browser probe regressions, and
TypeScript checks for harness/probe/cabinet passed. All 13 existing foundations
advertising both counts passed the new probe in both modes. Saved results:
`bench/audits/multiplayer-first-2026-09-20/foundation-probes.json`.
These are offline fixture/saved-code checks, not paid live-generation measurements.
