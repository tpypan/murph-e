# Swinging and grappling

Evidence: [Box2D's distance-joint reference](https://box2d.org/documentation/group__distance__joint.html) distinguishes rigid distance, springs and limits. It is conceptual guidance, not an API available in this runtime.

Proposed application:

- Specify anchor selection, range, line of sight, attach input, release input, and whether the rope is taut, slack, elastic or retractable.
- A taut fixed-length pendulum and a maximum-length rope behave differently. Choose intentionally. If implementing an inextensible maximum-length rope, constrain only extension beyond its length; remove outward radial velocity without erasing tangential motion. Handle a zero-length direction safely.
- Release preserves current velocity. Any extra launch boost must be explicit and bounded.
- Collision must still work during the swing. Start with fixed anchors and no wrapping unless wrapping is requested and supported.

Checks: attach in/out of range; remain within length tolerance; release along motion; miss an anchor without freezing; collide with a wall; reach the next anchor. These checks and controller choices are our proposed design.
