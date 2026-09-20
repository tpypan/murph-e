# Bench 2026-09-19 catalog-classics-medium-1p-final

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 2
- prompts: 3, runs: 3, errors: 0
- total  p50 22.2s  p95 62.1s  max 62.1s
- build  p50 14.8s  p95 54.7s
- ttft   p50 11.0s  p95 15.5s
- tokens mean 1418  reasoning mean 340  lines mean 337
- syntax errors: 0
- probe pass: 3/3 (100%)
- wall clock: 62.5s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Donkey Kong style: climb a construction  | KITTY KONG | arcade platforming | 7.4s | 54.7s | 15.5s | 62.1s | 3180 | 516 | 540 | pass | holding UP changed nothing on screen, including after A when available; holding DOWN changed nothing on screen, includin |
| 2 | Classic Pong with satisfying spin, charg | SPIN PONG | competitive paddle sports | 6.9s | 12.4s | 7.4s | 19.3s | 505 | 177 | 208 | pass | pressing B changed nothing on screen |
| 3 | Breakout with three brick formations, to | CRACKOUT | brick-breaker | 7.3s | 14.8s | 11.0s | 22.2s | 569 | 328 | 264 | pass |  |

## runs

- 2026-09-19-212228451-donkey-kong-style-climb-a-constr-Ifg12N
- 2026-09-19-212228482-classic-pong-with-satisfying-spi-ViM0GJ
- 2026-09-19-212248206-breakout-with-three-brick-format-4ZaE5n
