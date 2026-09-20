# Bench 2026-09-19 astra-medium-final-2p-timeouts

- model: gpt-6-astra, effort: medium, players: 2, n: 1, concurrency: 3
- prompts: 3, runs: 3, errors: 0
- total  p50 244.4s  p95 272.9s  max 272.9s
- build  p50 237.5s  p95 264.4s
- ttft   p50 71.9s  p95 94.2s
- tokens mean 7410  reasoning mean 1162  lines mean 764
- syntax errors: 1
- probe pass: 2/3 (67%)
- wall clock: 273.0s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | two knights defending a castle from gobl | CASTLE GUARD | cooperative castle-defense action | 6.9s | 237.5s | 60.4s | 244.4s | 11421 | 1552 | 741 | pass |  |
| 2 | we are two astronauts fixing a space sta | STATION SAVERS | cooperative action-survival | 7.6s | 235.6s | 71.9s | 243.2s | 10808 | 1935 | 767 | pass |  |
| 3 | co-op zombie survival with a shotgun | DEAD HOLD | cooperative top-down zombie survival shooter | 8.4s | 264.4s | 94.2s | 272.9s | 0 | 0 | 783 | FAIL | SyntaxError: Unexpected end of input; the game failed to load: load: Unexpected end of input |

## runs

- 2026-09-19-2036-two-knights-defending-a-castle-f
- 2026-09-19-2036-we-are-two-astronauts-fixing-a-s
- 2026-09-19-2036-co-op-zombie-survival-with-a-sho
