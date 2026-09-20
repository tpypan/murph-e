# Collision and moving platforms

Evidence: [Celeste & TowerFall Physics](https://maddymakesgames.com/articles/celeste_and_towerfall_physics/index.html) separates movable actors from solids, retains fractional movement, and distinguishes carrying from pushing.

Proposed application:

- Keep velocity precision even when drawing at integer pixels. Separate collision shapes from sprite bounds.
- For modest speeds, resolve movement along each axis with bounded steps. For fast projectiles use a swept check or bounded substeps; end-position overlap can miss thin walls.
- Determine platform riders before moving the platform. Define push, carry and crush behavior explicitly.
- A one-way platform blocks downward crossings from above. Drop-through temporarily ignores that platform; it must not disable all floor collision indefinitely.
- Cap displacement and iteration count so a bad generated value cannot create an unbounded loop.

Checks: standing on a moving lift, side push into a wall, ceiling contact, landing on a platform edge, dropping through one floor, and a projectile crossing a thin obstacle. Assert finite coordinates and no unresolved solid overlap.
