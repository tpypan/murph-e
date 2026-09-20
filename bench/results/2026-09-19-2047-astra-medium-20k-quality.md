# Bench 2026-09-19 astra-medium-20k-quality

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 2
- prompts: 2, runs: 2, errors: 1
- total  p50 283.1s  p95 283.1s  max 283.1s
- build  p50 271.2s  p95 271.2s
- ttft   p50 124.2s  p95 124.2s
- tokens mean 14430  reasoning mean 4142  lines mean 906
- syntax errors: 0
- probe pass: 1/1 (100%)
- wall clock: 309.9s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Can we generate a game like Pac-Man? But | GOOSE CHASE | maze chase | 11.9s | 271.2s | 124.2s | 283.1s | 14430 | 4142 | 906 | pass | holding RIGHT changed nothing on screen, including after A when available; holding UP changed nothing on screen, includi |
| 2 | Street Fighter but with Batman, Superman |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 300s request deadline |

## runs

- 2026-09-19-2042-can-we-generate-a-game-like-pac
- (none)
