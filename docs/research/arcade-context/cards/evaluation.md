# Observe behavior and evaluate the actual game

Evidence: [Valve's Approach to Playtesting](https://cdn.fastly.steamstatic.com/apps/valve/2009/GDC2009_ValvesApproachToPlaytesting.pdf) uses direct observation and player reports, while discussing the limitations of each.

Proposed application:

- Separate correctness, request fidelity, readability and enjoyment. Record each independently.
- Automate movement, scoring, collisions, round completion, reset and named-mechanic scenarios over several seeds. A crash after input is a failure, never evidence of responsiveness.
- Observe people playing on the cabinet without coaching. Note time to first meaningful action, misunderstandings, unfair deaths and willingness to replay. Ask what they thought happened afterward.
- Compare generated sprites with the intended reference without showing the name as a hint. Treat model visual ratings as an aid, not ground truth.

Checks: save failing seeds/traces and the exact reference/asset versions; report quality alongside processing latency; retain held-out prompts. Passing a movement probe or earning points is not sufficient evidence of a good game.
