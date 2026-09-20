# Bench 2026-09-19 astra-medium-references

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 4
- prompts: 20, runs: 20, errors: 7
- total  p50 162.7s  p95 180.0s  max 180.0s
- build  p50 154.5s  p95 173.0s
- ttft   p50 43.8s  p95 67.8s
- tokens mean 7722  reasoning mean 1425  lines mean 557
- syntax errors: 0
- probe pass: 13/13 (100%)
- wall clock: 822.6s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a game where I'm a frog dodging cars tha | FROG CROSS | arcade road-crossing | 8.2s | 154.5s | 65.4s | 162.7s | 8115 | 2070 | 499 | pass | holding DOWN changed nothing on screen, including after A when available |
| 2 | space invaders but the aliens are pizzas | PIZZA INVADERS | fixed-screen shoot-em-up | 8.0s | 101.4s | 24.6s | 109.4s | 5708 | 690 | 532 | pass |  |
| 3 | a snake game but the snake is a train | RAIL SNAKE | grid-based arcade snake | 7.6s | 156.0s | 67.8s | 163.5s | 8505 | 2271 | 461 | pass | holding LEFT changed nothing on screen, including after A when available; holding RIGHT changed nothing on screen, inclu |
| 4 | breakout with a really big ball | BIG BALL BREAK | breakout | 9.0s | 112.5s | 18.9s | 121.5s | 6606 | 516 | 550 | pass | pressing B changed nothing on screen |
| 5 | flappy bird but you're a submarine and t | JELLY SUB | flapping obstacle course | 7.3s | 119.6s | 40.9s | 126.9s | 6478 | 1339 | 455 | pass |  |
| 6 | a platformer where you collect coins and | COIN SPIKE RUN | platformer | 5.7s | 159.8s | 42.3s | 165.5s | 8940 | 1324 | 680 | pass |  |
| 7 | pong against the computer and it gets fa | SPEED PONG | arcade ball-paddle | 6.1s | 99.6s | 33.7s | 105.7s | 5531 | 1034 | 416 | pass |  |
| 8 | an endless runner where you're a cat jum | CAT DASH | endless runner | 7.2s | 161.0s | 55.8s | 168.3s | 8447 | 1864 | 600 | pass | holding DOWN changed nothing on screen, including after A when available |
| 9 | something with cats |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 10 | a game about avoiding my exams | EXAM ESCAPE | arcade survival dodge | 7.0s | 173.0s | 43.8s | 180.0s | 9939 | 1209 | 806 | pass |  |
| 11 | dodge the falling anvils and catch the p | PIE PANIC | arcade catch-and-dodge | 6.3s | 144.0s | 50.4s | 150.4s | 7667 | 1552 | 516 | pass |  |
| 12 | asteroids | ASTEROIDS | arcade space shooter | 6.1s | 130.7s | 32.9s | 136.8s | 7392 | 1034 | 554 | pass |  |
| 13 | a shooter where you defend a castle from |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 14 | a maze where a ghost chases you |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 15 | a game where you are a taco and you have | SALSA CATCH | catching arcade | 5.9s | 164.7s | 64.5s | 170.6s | 8398 | 2070 | 541 | pass |  |
| 16 | something really hard |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 17 | a relaxing game |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 18 | a two-player fighting game |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 19 | an open world RPG with crafting |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | build exceeded its 180s request deadline |
| 20 | a game where you shoot up a school | STARFALL DEFEN | arcade shooter | 6.0s | 160.7s | 49.4s | 166.7s | 8665 | 1552 | 632 | pass |  |

## runs

- 2026-09-19-2026-a-game-where-i-m-a-frog-dodging
- 2026-09-19-2026-space-invaders-but-the-aliens-ar
- 2026-09-19-2026-a-snake-game-but-the-snake-is-a
- 2026-09-19-2026-breakout-with-a-really-big-ball
- 2026-09-19-2028-flappy-bird-but-you-re-a-submari
- 2026-09-19-2028-a-platformer-where-you-collect-c
- 2026-09-19-2029-pong-against-the-computer-and-it
- 2026-09-19-2029-an-endless-runner-where-you-re-a
- (none)
- 2026-09-19-2031-a-game-about-avoiding-my-exams
- 2026-09-19-2031-dodge-the-falling-anvils-and-cat
- 2026-09-19-2032-asteroids
- (none)
- (none)
- 2026-09-19-2034-a-game-where-you-are-a-taco-and
- (none)
- (none)
- (none)
- (none)
- 2026-09-19-2037-a-game-where-you-shoot-up-a-scho
