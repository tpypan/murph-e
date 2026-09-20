# Bench 2026-09-19 astra-medium-reference-quality

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 2
- prompts: 2, runs: 2, errors: 1
- total  p50 162.1s  p95 162.1s  max 162.1s
- build  p50 154.0s  p95 154.0s
- ttft   p50 44.5s  p95 44.5s
- tokens mean 9051  reasoning mean 1552  lines mean 657
- syntax errors: 0
- probe pass: 1/1 (100%)
- wall clock: 190.6s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Can we generate a game like Pac-Man? But | GOOSE CHASE | maze-chase | 8.1s | 154.0s | 44.5s | 162.1s | 9051 | 1552 | 657 | pass | holding LEFT changed nothing on screen, including after A when available; holding DOWN changed nothing on screen, includ |
| 2 | Street Fighter but with Batman, Superman |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |

## runs

- 2026-09-19-2029-can-we-generate-a-game-like-pac
- (none)
