# Bench 2026-09-19 catalog-medium-composition-1p

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 2
- prompts: 2, runs: 2, errors: 0
- total  p50 14.8s  p95 67.5s  max 67.5s
- build  p50 6.0s  p95 58.9s
- ttft   p50 2.1s  p95 33.2s
- tokens mean 1547  reasoning mean 536  lines mean 751
- syntax errors: 0
- probe pass: 2/2 (100%)
- wall clock: 68.1s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Street Fighter but with Batman and the F | GOTHAM CLASH | one-on-one fighting | 8.7s | 6.0s | 2.1s | 14.8s | 322 | 37 | 881 | pass |  |
| 2 | A kart racing game around a coastal circ | NIGHT COAST | arcade kart racing | 8.6s | 58.9s | 33.2s | 67.5s | 2771 | 1034 | 621 | pass |  |

## runs

- 2026-09-19-2109-street-fighter-but-with-batman-a
- 2026-09-19-2109-a-kart-racing-game-around-a-coas
