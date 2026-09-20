# Shared context: Arcade

Version 2. Shared design guidance; the supplied runtime API and stage output format are authoritative.

Build the user's specific idea as a short arcade loop. Record required identities, actions and mechanics before selecting components. Explicit requested changes take precedence over a referenced game's usual rules. Separate facts from interpretations; resolve uncertainty that would change the hero or primary action.

The current target is 256×224 at 60 simulation updates per second. Primitives use the default 16-colour palette; each sprite draw may use its own exact RGB palette. Supplied ART sets may contain multiple aligned colour planes, which their draw helpers render together. There is no global 16-colour limit across a scene. Preserve supplied source colours rather than quantizing them to the default palette. `update(api, dt)` receives seconds, with `dt = 1/60`. The runtime owns the top 12 pixels, input mapping, START, pause, HUD and results. Read the supplied runtime API; design cards do not add functions to it. The cabinet selects player count.

The plan must specify:

- Player movement and the main action, including when each control is eligible.
- What the player wants, what prevents it, and the skillful decision that improves the outcome.
- An early understandable opportunity to act and score.
- Collision roles, damage protection, score events, and loss/win conditions.
- Separate difficulty limits and encounter timing, with a readable escalation.
- Required asset identities, dimensions, poses and collision footprints.
- Observable scenarios that demonstrate the requested mechanic and a complete round/reset.

Use tested components when supplied. Let the generated code provide the distinctive interactions and arrangement. Never quietly replace an unsupported signature mechanic with an easier genre. Every advertised control must work in its declared state; an airborne character need not jump again unless double jumping is specified.

All probabilities, counters, spawns and bonuses need bounds and reset rules. Score each event once. Keep difficulty parameters independent enough to diagnose unfair combinations. Use deterministic runtime time/randomness and keep rendering free of gameplay state changes.

Human-visible checks matter: identify the hero without a name label, understand the next action from the playfield, read the controls, and explain why a life was lost. Evaluate on the actual CRT. Automated correctness checks are necessary, but do not establish recognizability or fun.
