# Bench 2026-09-19 catalog-expanded-medium-1p-unique-a

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 2
- prompts: 6, runs: 6, errors: 0
- total  p50 14.2s  p95 29.0s  max 29.0s
- build  p50 6.0s  p95 17.0s
- ttft   p50 3.4s  p95 10.4s
- tokens mean 388  reasoning mean 136  lines mean 434
- syntax errors: 0
- probe pass: 6/6 (100%)
- wall clock: 56.1s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Bomberman-style bomb maze: clear two are | BOMB MAZE | grid-based action maze | 7.4s | 4.6s | 2.5s | 12.1s | 168 | 27 | 579 | pass | holding LEFT changed nothing on screen, including after A when available; holding UP changed nothing on screen, includin |
| 2 | Frogger-style crossing: get five frogs h | FROGGER | cooperative crossing action | 6.8s | 7.6s | 3.4s | 14.4s | 334 | 76 | 409 | pass | holding DOWN changed nothing on screen, including after A when available |
| 3 | A falling-block puzzle with seven-piece  | LINE RACE | falling-block puzzle | 12.0s | 17.0s | 10.4s | 29.0s | 678 | 293 | 252 | pass |  |
| 4 | A Space Invaders and Galaga-style format | DIVER FORMATIO | cooperative formation shooter | 8.9s | 16.6s | 10.3s | 25.5s | 665 | 271 | 628 | pass |  |
| 5 | Asteroids-style space rocks: clear three | SECTOR BREAK | inertial arcade space shooter | 7.6s | 5.2s | 2.9s | 12.8s | 237 | 68 | 550 | pass | holding DOWN changed nothing on screen, including after A when available |
| 6 | Missile Command-style city defense over  | MISSILE COMMAN | target-defense arcade | 8.2s | 6.0s | 3.4s | 14.2s | 246 | 79 | 186 | pass |  |

## runs

- 2026-09-19-214446690-bomberman-style-bomb-maze-clear-CWk6hj
- 2026-09-19-214446733-frogger-style-crossing-get-five-3BCpPv
- 2026-09-19-214459222-a-falling-block-puzzle-with-seve-WVM6uz
- 2026-09-19-214501361-a-space-invaders-and-galaga-styl-bidMUV
- 2026-09-19-214527145-asteroids-style-space-rocks-clea-PGS93r
- 2026-09-19-214528358-missile-command-style-city-defen-IGqNxx
