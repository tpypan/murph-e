# Simulation and reproducibility

Evidence: [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) explains why timestep handling affects physics and how excessive catch-up work can overwhelm a simulation.

Proposed application:

- Use the runtime's fixed `dt` and seeded RNG; generated games must not create another frame loop.
- Keep units explicit: pixels/second, seconds, or frames. Convert at boundaries. Collision substeps do not imply extra input presses or duplicate score events.
- Advance gameplay in update; draw observes state. Initialize every counter and collection on restart.
- Pin code, component versions, seed and input trace for replay. Bound entity counts and per-frame work.

Checks: same seed/input produces matching gameplay state; render-only calls do not advance play; pausing freezes simulation; long rounds retain bounded work. Fixed timestep alone does not guarantee identical results across browser versions or arbitrary physics implementations.
