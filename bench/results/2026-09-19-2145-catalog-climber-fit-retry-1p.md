# Bench 2026-09-19 catalog-climber-fit-retry-1p

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 1
- prompts: 1, runs: 1, errors: 0
- total  p50 11.8s  p95 11.8s  max 11.8s
- build  p50 5.5s  p95 5.5s
- ttft   p50 3.3s  p95 3.3s
- tokens mean 212  reasoning mean 64  lines mean 304
- syntax errors: 0
- probe pass: 1/1 (100%)
- wall clock: 12.3s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Donkey Kong style: climb a construction  | KITTY KONG | arcade platforming | 6.3s | 5.5s | 3.3s | 11.8s | 212 | 64 | 304 | pass | holding UP changed nothing on screen, including after A when available; holding DOWN changed nothing on screen, includin |

## runs

- 2026-09-19-214511653-donkey-kong-style-climb-a-constr-ezypIV
