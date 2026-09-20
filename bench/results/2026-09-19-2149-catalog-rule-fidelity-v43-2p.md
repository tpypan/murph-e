# Bench 2026-09-19 catalog-rule-fidelity-v43-2p

- model: gpt-6-astra, effort: medium, players: 2, n: 1, concurrency: 1
- prompts: 1, runs: 1, errors: 0
- total  p50 11.6s  p95 11.6s  max 11.6s
- build  p50 3.6s  p95 3.6s
- ttft   p50 1.4s  p95 1.4s
- tokens mean 151  reasoning mean 0  lines mean 305
- syntax errors: 0
- probe pass: 1/1 (100%)
- wall clock: 12.3s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Donkey Kong style: climb a construction  | KITTY TOWER | cooperative arcade platformer | 7.9s | 3.6s | 1.4s | 11.6s | 151 | 0 | 305 | pass | holding UP changed nothing on screen, including after A when available; holding DOWN changed nothing on screen, includin |

## runs

- 2026-09-19-214938605-donkey-kong-style-climb-a-constr-jUQSBq
