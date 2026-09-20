# Bench 2026-09-19 astra-medium-references-2p

- model: gpt-6-astra, effort: medium, players: 2, n: 1, concurrency: 3
- prompts: 12, runs: 12, errors: 5
- total  p50 162.9s  p95 177.1s  max 177.1s
- build  p50 154.5s  p95 170.2s
- ttft   p50 36.6s  p95 60.8s
- tokens mean 8525  reasoning mean 1136  lines mean 615
- syntax errors: 0
- probe pass: 7/7 (100%)
- wall clock: 709.5s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a two-player fighting game with wizards  | ARCANE DUEL | projectile fighting | 6.8s | 170.2s | 38.3s | 177.1s | 9670 | 1034 | 694 | pass |  |
| 2 | tanks in an arena, last one standing win | TANKS ARENA | versus arena tank combat | 6.6s | 150.6s | 56.4s | 157.2s | 8173 | 1548 | 527 | pass |  |
| 3 | sumo wrestling where you push each other | RING RUMBLE | two-player sumo brawler | 8.3s | 154.5s | 34.4s | 162.9s | 8953 | 1034 | 661 | pass |  |
| 4 | a race to collect the most coins before  | COIN CLASH | two-player arena collection race | 6.2s | 165.5s | 34.3s | 171.6s | 9601 | 1034 | 719 | pass | holding DOWN changed nothing on screen, including after A when available; player two holding DOWN changed nothing on scr |
| 5 | pong but both players are humans | HUMAN PONG | competitive paddle sports | 6.3s | 102.1s | 19.6s | 108.5s | 5922 | 516 | 440 | pass |  |
| 6 | two knights defending a castle from gobl |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 7 | we are two astronauts fixing a space sta |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 8 | co-op zombie survival with a shotgun |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 9 | two frogs catching flies and dodging car |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 10 | something fun for me and my friend | DUO DASH | cooperative arena-collection | 7.1s | 164.6s | 36.6s | 171.7s | 9532 | 1034 | 664 | pass |  |
| 11 | a game about pizza |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 12 | snake but there are two snakes | TWIN SNAKES | competitive grid-arena snake | 7.1s | 150.3s | 60.8s | 157.4s | 7821 | 1755 | 599 | pass | holding UP changed nothing on screen, including after A when available; holding DOWN changed nothing on screen, includin |

## runs

- 2026-09-19-2026-a-two-player-fighting-game-with
- 2026-09-19-2026-tanks-in-an-arena-last-one-stand
- 2026-09-19-2026-sumo-wrestling-where-you-push-ea
- 2026-09-19-2029-a-race-to-collect-the-most-coins
- 2026-09-19-2029-pong-but-both-players-are-humans
- (none)
- (none)
- (none)
- (none)
- 2026-09-19-2034-something-fun-for-me-and-my-frie
- (none)
- 2026-09-19-2035-snake-but-there-are-two-snakes
