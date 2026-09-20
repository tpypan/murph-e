# Bench 2026-09-19 open-genres-final-focused

- model: gpt-6-astra, effort: low, players: 1, n: 1, concurrency: 2
- prompts: 4, runs: 4, errors: 0
- total  p50 131.7s  p95 161.3s  max 161.3s
- build  p50 123.4s  p95 153.7s
- ttft   p50 6.7s  p95 16.4s
- tokens mean 6389  reasoning mean 186  lines mean 454
- syntax errors: 0
- probe pass: 3/4 (75%)
- wall clock: 294.4s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | I want to create a game which is like St | RING RIVALS | fighting | 7.9s | 127.4s | 5.4s | 135.4s | 6709 | 85 | 489 | pass | holding UP changed nothing on screen, including after A when available |
| 2 | A side scrolling beat em up where a knig | GOBLIN KNIGHT | side-scrolling beat 'em up | 7.6s | 153.7s | 6.7s | 161.3s | 8268 | 124 | 565 | pass | pressing B changed nothing on screen |
| 3 | A rhythm game where I hit A or B in time | BEATFALL | rhythm | 7.9s | 87.2s | 10.6s | 95.1s | 4413 | 222 | 374 | pass |  |
| 4 | A top down racing game with corners, dri | DRIFT CIRCUIT | top-down racing | 8.3s | 123.4s | 16.4s | 131.7s | 6165 | 314 | 387 | FAIL | pressing A changed nothing on screen |

## runs

- 2026-09-19-1929-i-want-to-create-a-game-which-is
- 2026-09-19-1929-a-side-scrolling-beat-em-up-wher
- 2026-09-19-1932-a-rhythm-game-where-i-hit-a-or-b
- 2026-09-19-1932-a-top-down-racing-game-with-corn
