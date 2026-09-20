# Bench 2026-09-19 astra-medium-references-final

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 2
- prompts: 2, runs: 2, errors: 1
- total  p50 247.6s  p95 247.6s  max 247.6s
- build  p50 238.4s  p95 238.4s
- ttft   p50 134.3s  p95 134.3s
- tokens mean 0  reasoning mean 0  lines mean 686
- syntax errors: 1
- probe pass: 0/1 (0%)
- wall clock: 247.8s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Can we generate a game like Pac-Man? But | GHOST GOOSE | maze-chase | 9.2s | 238.4s | 134.3s | 247.6s | 0 | 0 | 686 | FAIL | SyntaxError: Unexpected end of input; the game failed to load: load: Unexpected end of input |
| 2 | Street Fighter but with Batman, Superman |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | spec exceeded its 30s request deadline |

## runs

- 2026-09-19-2036-can-we-generate-a-game-like-pac
- (none)
