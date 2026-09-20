# Reachable layouts and encounter chunks

Evidence: [Tanagra](https://www.researchgate.net/publication/224242275_Tanagra_Reactive_Planning_and_Constraint_Solving_for_Mixed-Initiative_Level_Design), by Smith, Whitehead and Mateas, uses gameplay beats, geometry patterns and constraints to preserve platformer playability under its model.

Proposed application:

- Generate chunks with entry/exit position and velocity ranges. Validate connections against the actual movement controller.
- A platform edge needs feasible height, horizontal travel, landing width and clearance. A grapple transition also needs a usable anchor and release state.
- Place optional rewards after validating the required route. A risky shortcut must not accidentally become the only possible route.
- Use bounded sampling of valid chunks. If a sampled combination fails, select a known valid connection rather than retrying indefinitely.

Checks: route traversal across seeds; worst-case entry states; empty spawn space; reward accessibility; moving-hazard timing. Geometric reachability alone cannot prove fairness or fun, and Tanagra's guarantees do not automatically transfer to our controller.
