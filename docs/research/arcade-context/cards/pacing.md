# Encounter pacing and difficulty

Evidence: [The AI Systems of Left 4 Dead](https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf), slides 77–91, separates dramatic pacing from difficulty and uses pressure/recovery phases.

Proposed application:

- Define two controls: difficulty selects bounded enemy capabilities; pacing decides when those capabilities appear.
- Begin with an authored sequence: teach, build pressure, peak, recover, introduce a variation. Choose short durations appropriate to a cabinet; do not copy a long cooperative game's timings.
- Change one difficulty dimension at a time initially. Keep caps on speed, density, simultaneous threats and minimum gaps.
- If adapting to player performance, record it for replays and score comparisons. Do not secretly change jump physics during a round.

Checks: observe a full pacing cycle; verify recovery actually reduces incoming pressure; simulate maximum difficulty and overlapping spawns. Constant growth in every parameter is not a pacing plan. These cabinet rules are our adaptation, not Valve's prescribed arcade settings.
