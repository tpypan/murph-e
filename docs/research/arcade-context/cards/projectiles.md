# Projectile and attack patterns

Evidence: [BulletML](https://www.asahi-net.or.jp/~cs8k-cyu/bulletml/bulletml_ref_e.html) represents attacks using fire/wait/repeat operations, reusable actions, direction modes and speed changes.

Proposed application:

- Select a small pattern: aimed volley, fan, ring with a gap, rotating stream, or crossing lanes. Define origin, count, angles, speed, interval, lifetime and repeats as data.
- Distinguish aiming at the player's position when fired from continuous homing. Telegraph the former; explicitly bound turn rate for the latter.
- Schedule attack, recovery and movement phases. Prevent concurrent patterns from sealing every escape route.
- Cap active bullets, pattern recursion/repetition, lifetime and speed. Patterns should differ in the movement decision they demand, not only colour.
- Keep visual bullet size distinct from the damage radius when using forgiving hitboxes.

Checks: count/lifetime caps; offscreen cleanup; first-shot warning; overlap of two patterns; an escape route for the chosen player controller. The pattern menu and fairness checks are our additions, not guarantees provided by BulletML.
