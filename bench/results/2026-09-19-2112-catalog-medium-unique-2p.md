# Bench 2026-09-19 catalog-medium-unique-2p

- model: gpt-6-astra, effort: medium, players: 2, n: 1, concurrency: 2
- prompts: 2, runs: 2, errors: 0
- total  p50 13.5s  p95 44.3s  max 44.3s
- build  p50 5.5s  p95 37.5s
- ttft   p50 2.9s  p95 18.2s
- tokens mean 934  reasoning mean 285  lines mean 710
- syntax errors: 0
- probe pass: 2/2 (100%)
- wall clock: 45.3s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Street Fighter but with Batman and the F | GOTHAM SPEED | one-on-one fighting | 8.0s | 5.5s | 2.9s | 13.5s | 206 | 65 | 874 | pass |  |
| 2 | A kart racing game around a coastal circ | NIGHT COAST GP | arcade kart racing | 6.9s | 37.5s | 18.2s | 44.3s | 1662 | 505 | 546 | pass |  |

## runs

- 2026-09-19-211146666-street-fighter-but-with-batman-a-BKjcS0
- 2026-09-19-211146680-a-kart-racing-game-around-a-coas-7dafTY
