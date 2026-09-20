# Bench 2026-09-19 astra-low-design-context-2p

- model: gpt-6-astra, effort: low, players: 2, n: 1, concurrency: 4
- prompts: 12, runs: 12, errors: 3
- total  p50 51.5s  p95 81.2s  max 81.2s
- build  p50 47.8s  p95 77.4s
- ttft   p50 3.8s  p95 5.6s
- tokens mean 2776  reasoning mean 70  lines mean 204
- syntax errors: 0
- probe pass: 9/9 (100%)
- wall clock: 1117.4s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a two-player fighting game with wizards  | FIRE DUEL | versus | 4.0s | 44.3s | 3.5s | 48.3s | 2611 | 50 | 205 | pass |  |
| 2 | tanks in an arena, last one standing win | TANK DUEL | versus | 3.4s | 44.1s | 4.1s | 47.5s | 2759 | 63 | 214 | pass |  |
| 3 | sumo wrestling where you push each other | RING RUMBLE | versus | 3.6s | 44.9s | 4.3s | 48.5s | 2667 | 65 | 197 | pass |  |
| 4 | a race to collect the most coins before  | COIN CLASH | versus | 3.7s | 50.6s | 3.5s | 54.3s | 2893 | 61 | 197 | pass |  |
| 5 | pong but both players are humans | HUMAN PONG | versus | 7.3s | 35.6s | 3.8s | 42.9s | 2253 | 79 | 185 | pass | pressing B changed nothing on screen |
| 6 | two knights defending a castle from gobl | CASTLE GUARD | coop | 3.7s | 47.8s | 3.0s | 51.5s | 2801 | 62 | 201 | pass |  |
| 7 | we are two astronauts fixing a space sta | ORBIT REPAIR | coop | 3.7s | 48.4s | 4.7s | 52.1s | 2664 | 88 | 224 | pass |  |
| 8 | co-op zombie survival with a shotgun | DEAD AIM | coop | 3.8s | 59.2s | 5.6s | 63.1s | 3486 | 116 | 218 | pass |  |
| 9 | two frogs catching flies and dodging car | FROG FLYWAY | coop | 3.8s | 77.4s | 2.7s | 81.2s | 2851 | 44 | 199 | pass |  |
| 10 | something fun for me and my friend |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | terminated |
| 11 | a game about pizza |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | terminated |
| 12 | snake but there are two snakes |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | terminated |

## runs

- 2026-09-19-1815-a-two-player-fighting-game-with
- 2026-09-19-1815-tanks-in-an-arena-last-one-stand
- 2026-09-19-1815-sumo-wrestling-where-you-push-ea
- 2026-09-19-1815-a-race-to-collect-the-most-coins
- 2026-09-19-1816-pong-but-both-players-are-humans
- 2026-09-19-1816-two-knights-defending-a-castle-f
- 2026-09-19-1816-we-are-two-astronauts-fixing-a-s
- 2026-09-19-1816-co-op-zombie-survival-with-a-sho
- 2026-09-19-1817-two-frogs-catching-flies-and-dod
- (none)
- (none)
- (none)
