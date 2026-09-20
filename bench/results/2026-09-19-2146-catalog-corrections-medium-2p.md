# Bench 2026-09-19 catalog-corrections-medium-2p

- model: gpt-6-astra, effort: medium, players: 2, n: 1, concurrency: 2
- prompts: 2, runs: 2, errors: 0
- total  p50 25.0s  p95 44.3s  max 44.3s
- build  p50 17.8s  p95 37.2s
- ttft   p50 9.3s  p95 25.8s
- tokens mean 961  reasoning mean 463  lines mean 417
- syntax errors: 0
- probe pass: 2/2 (100%)
- wall clock: 44.9s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Donkey Kong style: climb a construction  | KITTY TOWER | cooperative platforming | 7.1s | 37.2s | 25.8s | 44.3s | 1283 | 749 | 360 | pass | holding UP changed nothing on screen, including after A when available; holding DOWN changed nothing on screen, includin |
| 2 | A coastal arcade kart racer with three l | COASTAL ACE | arcade kart racing | 7.1s | 17.8s | 9.3s | 25.0s | 638 | 176 | 474 | pass |  |

## runs

- 2026-09-19-214515421-donkey-kong-style-climb-a-constr-FfjiwI
- 2026-09-19-214515458-a-coastal-arcade-kart-racer-with-VU4QGj
