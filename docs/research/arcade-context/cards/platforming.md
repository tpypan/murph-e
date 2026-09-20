# Platforming and flight trajectory

Evidence: [Building a Better Jump](https://media.gdcvault.com/gdc2016/Presentations/Pittman_Kyle_BuildingBetterJump.pdf) derives motion from desired trajectory; [Celeste & Forgiveness](https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html) describes input and position tolerance.

Proposed application:

- Choose jump height H and time to apex T, rather than unrelated gravity/impulse guesses. With downward-positive y and constant acceleration: `g = 2H/T²`, `vy0 = -2H/T`. H is pixels, T seconds.
- Illustrative starting point: H=32, T=0.32 gives g=625 px/s² and vy0=-200 px/s. These are our tuning choices, not Celeste's values.
- State whether early release shortens ascent, falling uses different gravity, and horizontal input accelerates or sets velocity. Recompute reachable gaps after such changes.
- Consider 0.10 s coyote/buffer windows for grounded jumping; test the windows' boundaries. Do not apply grounded-jump restrictions to a flapping-flight mechanic.

Checks: tap versus hold; land after buffered input; expire coyote time; ceiling contact; measured apex; reachable first gap. Continuous formulas are initial estimates—measure the discrete controller.
