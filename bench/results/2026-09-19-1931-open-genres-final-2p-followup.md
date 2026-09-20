# Bench 2026-09-19 open-genres-final-2p-followup

- model: gpt-6-astra, effort: low, players: 2, n: 1, concurrency: 2
- prompts: 2, runs: 2, errors: 0
- total  p50 79.8s  p95 91.8s  max 91.8s
- build  p50 72.9s  p95 84.6s
- ttft   p50 5.5s  p95 8.8s
- tokens mean 4614  reasoning mean 139  lines mean 369
- syntax errors: 0
- probe pass: 2/2 (100%)
- wall clock: 92.4s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | sumo wrestling where you push each other | RING RUMBLE | two-player sumo brawler | 7.1s | 84.6s | 8.8s | 91.8s | 5051 | 194 | 390 | pass |  |
| 2 | a race to collect the most coins before  | COIN DASH | versus coin-collection racing | 6.9s | 72.9s | 5.5s | 79.8s | 4176 | 84 | 348 | pass |  |

## runs

- 2026-09-19-1929-sumo-wrestling-where-you-push-ea
- 2026-09-19-1929-a-race-to-collect-the-most-coins
