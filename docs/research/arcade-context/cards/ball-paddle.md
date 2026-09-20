# Ball/paddle games

Our proposed engineering recipe, informed by [Meta Arcade's configurable components](https://openreview.net/pdf?id=6Tw0QPDyXML) and [fixed-step simulation](https://gafferongames.com/post/fix_your_timestep/). These are not documented historical Pong/Breakout internals.

- Define serve, active rally and lost-ball states. Shell START must not become an undocumented gameplay key.
- Make paddle contact position influence rebound angle. Bound speed and enforce enough vertical travel to prevent near-horizontal endless rallies.
- Resolve wall, paddle and brick contacts consistently, including corners. Award a brick once when destroyed; separate the ball after contact to avoid repeated reversal while overlapping.
- At higher speed, use swept collision or bounded substeps.
- Limit computer reaction/movement explicitly if using an opponent; avoid perfect tracking by default.

Checks: edge hits, two bricks at a corner, thin targets at maximum speed, simultaneous loss/contact, serve after losing a life, and complete clear/reset. Any A/B ability must have a real role such as serve, controlled boost or shield.
