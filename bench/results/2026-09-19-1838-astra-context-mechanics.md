# Bench 2026-09-19 astra-context-mechanics

- model: gpt-6-astra, effort: low, players: 1, n: 1, concurrency: 4
- prompts: 4, runs: 4, errors: 0
- total  p50 53.6s  p95 61.4s  max 61.4s
- build  p50 49.9s  p95 57.0s
- ttft   p50 3.5s  p95 10.9s
- tokens mean 2908  reasoning mean 136  lines mean 227
- syntax errors: 0
- probe pass: 4/4 (100%)
- wall clock: 61.6s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a monkey swinging on ropes between rooft | ROOFTOP SWING | platformer | 4.3s | 57.0s | 10.9s | 61.4s | 3040 | 253 | 245 | pass |  |
| 2 | a maze where a ghost chases me, with dif | GHOST MAZE | snake | 5.3s | 45.7s | 3.3s | 51.0s | 2926 | 81 | 222 | pass | holding LEFT changed nothing on screen, including after A when available; holding DOWN changed nothing on screen, includ |
| 3 | a spaceship dodging aimed volleys and ro | FAN ESCAPE | shooter | 3.7s | 49.9s | 7.2s | 53.6s | 2716 | 134 | 215 | pass | pressing B changed nothing on screen |
| 4 | Batman jumping between Gotham rooftops a | GOTHAM GADGETS | platformer | 4.1s | 49.9s | 3.5s | 54.0s | 2951 | 74 | 226 | pass |  |

## runs

- 2026-09-19-1837-a-monkey-swinging-on-ropes-betwe
- 2026-09-19-1837-a-maze-where-a-ghost-chases-me-w
- 2026-09-19-1837-a-spaceship-dodging-aimed-volley
- 2026-09-19-1837-batman-jumping-between-gotham-ro
