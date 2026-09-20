# Enemy roles and state changes

Evidence: [The Pac-Man Dossier](https://pacman.holenet.info/), Jamey Pittman's technical analysis, documents different pursuit targets and chase/scatter/frightened states. This is not an official Namco specification.

Proposed application: assign enemies contrasting roles such as direct pursuit, interception and guarding. Use explicit state transitions and a visual cue when threat behavior changes. Avoid making every enemy track the player identically. Limit how many can attack together and protect the initial spawn.

Checks: each role produces a distinct trace; state changes occur on schedule; vulnerable enemies stop damaging the player; respawn restores the correct state. Exact historical target formulas and timings are unnecessary unless reproducing that game is requested.
