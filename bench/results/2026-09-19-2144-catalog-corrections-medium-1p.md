# Bench 2026-09-19 catalog-corrections-medium-1p

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 2
- prompts: 2, runs: 2, errors: 1
- total  p50 37.8s  p95 37.8s  max 37.8s
- build  p50 31.3s  p95 31.3s
- ttft   p50 31.3s  p95 31.3s
- tokens mean 689  reasoning mean 162  lines mean 476
- syntax errors: 0
- probe pass: 1/1 (100%)
- wall clock: 38.8s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Donkey Kong style: climb a construction  |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | spec exceeded its 30s request deadline |
| 2 | A coastal arcade kart racer with three l | ACE COAST KART | arcade kart racing | 6.4s | 31.3s | 31.3s | 37.8s | 689 | 162 | 476 | pass |  |

## runs

- (none)
- 2026-09-19-214340810-a-coastal-arcade-kart-racer-with-6Tszg7
