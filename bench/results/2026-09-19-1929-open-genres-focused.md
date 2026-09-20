# Bench 2026-09-19 open-genres-focused

- model: gpt-6-astra, effort: low, players: 1, n: 1, concurrency: 2
- prompts: 4, runs: 4, errors: 2
- total  p50 76.6s  p95 94.0s  max 94.0s
- build  p50 70.3s  p95 86.7s
- ttft   p50 3.1s  p95 9.8s
- tokens mean 5069  reasoning mean 182  lines mean 391
- syntax errors: 0
- probe pass: 2/2 (100%)
- wall clock: 254.8s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | I want to create a game which is like St | STREET CLASH | fighting | 7.4s | 86.7s | 3.1s | 94.0s | 5774 | 68 | 439 | pass | holding UP changed nothing on screen, including after A when available |
| 2 | A side scrolling beat em up where a knig |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 120s request deadline |
| 3 | A rhythm game where I hit A or B in time | NOTE BEAT | rhythm | 6.3s | 70.3s | 9.8s | 76.6s | 4363 | 296 | 343 | pass |  |
| 4 | A top down racing game with corners, dri |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 120s request deadline |

## runs

- 2026-09-19-1924-i-want-to-create-a-game-which-is
- (none)
- 2026-09-19-1926-a-rhythm-game-where-i-hit-a-or-b
- (none)
