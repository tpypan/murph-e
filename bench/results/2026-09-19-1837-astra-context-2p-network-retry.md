# Bench 2026-09-19 astra-context-2p-network-retry

- model: gpt-6-astra, effort: low, players: 2, n: 1, concurrency: 3
- prompts: 3, runs: 3, errors: 0
- total  p50 55.7s  p95 60.4s  max 60.4s
- build  p50 50.1s  p95 55.4s
- ttft   p50 2.9s  p95 3.8s
- tokens mean 2840  reasoning mean 62  lines mean 213
- syntax errors: 0
- probe pass: 3/3 (100%)
- wall clock: 60.6s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | something fun for me and my friend | DUO STAR DASH | versus | 5.7s | 50.1s | 2.6s | 55.7s | 2873 | 46 | 203 | pass |  |
| 2 | a game about pizza | PIZZA PANIC | coop | 4.9s | 55.4s | 2.9s | 60.4s | 3057 | 52 | 231 | pass |  |
| 3 | snake but there are two snakes | SNAKE DUEL | versus | 5.2s | 43.8s | 3.8s | 48.9s | 2591 | 88 | 206 | pass |  |

## runs

- 2026-09-19-1836-something-fun-for-me-and-my-frie
- 2026-09-19-1836-a-game-about-pizza
- 2026-09-19-1836-snake-but-there-are-two-snakes
