# Bench 2026-09-19 catalog-medium-unique-1p

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 2
- prompts: 2, runs: 2, errors: 0
- total  p50 16.6s  p95 35.5s  max 35.5s
- build  p50 8.5s  p95 28.5s
- ttft   p50 4.1s  p95 12.5s
- tokens mean 887  reasoning mean 224  lines mean 712
- syntax errors: 0
- probe pass: 2/2 (100%)
- wall clock: 36.0s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Street Fighter but with Batman and the F | GOTHAM CLASH | fighting | 8.1s | 8.5s | 4.1s | 16.6s | 396 | 98 | 883 | pass |  |
| 2 | A kart racing game around a coastal circ | NIGHT COAST | kart racing | 7.0s | 28.5s | 12.5s | 35.5s | 1378 | 349 | 540 | pass |  |

## runs

- 2026-09-19-211144657-street-fighter-but-with-batman-a-qljlj3
- 2026-09-19-211144675-a-kart-racing-game-around-a-coas-XuHLfP
