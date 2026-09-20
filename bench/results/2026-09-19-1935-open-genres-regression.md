# Bench 2026-09-19 open-genres-regression

- model: gpt-6-astra, effort: low, players: 1, n: 1, concurrency: 3
- prompts: 20, runs: 20, errors: 0
- total  p50 84.6s  p95 124.1s  max 124.4s
- build  p50 77.8s  p95 117.4s
- ttft   p50 6.8s  p95 13.7s
- tokens mean 4993  reasoning mean 174  lines mean 387
- syntax errors: 0
- probe pass: 18/20 (90%)
- wall clock: 615.2s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a game where I'm a frog dodging cars tha | FROG DASH | arcade traffic-dodging | 6.5s | 75.6s | 8.6s | 82.1s | 4159 | 212 | 339 | pass |  |
| 2 | space invaders but the aliens are pizzas | PIZZA INVADERS | fixed-screen shoot-em-up | 6.4s | 77.8s | 3.5s | 84.3s | 4649 | 89 | 364 | pass |  |
| 3 | a snake game but the snake is a train | RAIL SNAKE | arcade snake maze | 8.1s | 78.0s | 8.6s | 86.0s | 4732 | 212 | 385 | pass | holding LEFT changed nothing on screen, including after A when available; holding RIGHT changed nothing on screen, inclu |
| 4 | breakout with a really big ball | BIG BALL BREAK | brick-breaker | 7.4s | 71.0s | 7.7s | 78.5s | 4409 | 139 | 401 | pass |  |
| 5 | flappy bird but you're a submarine and t | JELLY SUB | flapping arcade | 7.4s | 72.1s | 14.8s | 79.5s | 4047 | 385 | 326 | pass | pressing B changed nothing on screen |
| 6 | a platformer where you collect coins and | COIN SPIKE RUN | precision platformer | 6.9s | 76.4s | 6.1s | 83.4s | 4776 | 113 | 338 | pass | pressing B changed nothing on screen |
| 7 | pong against the computer and it gets fa | SPEED PONG | arcade sports | 6.5s | 55.0s | 4.4s | 61.4s | 3480 | 85 | 316 | pass | pressing B changed nothing on screen |
| 8 | an endless runner where you're a cat jum | CAT DASH | endless runner | 8.7s | 81.0s | 9.5s | 89.7s | 4869 | 265 | 391 | pass |  |
| 9 | something with cats | CAT CAFE DASH | arcade collection-dodging | 6.5s | 74.9s | 3.6s | 81.3s | 4940 | 67 | 372 | pass |  |
| 10 | a game about avoiding my exams | EXAM ESCAPE | arcade dodging | 6.3s | 79.9s | 4.4s | 86.2s | 5088 | 110 | 361 | pass |  |
| 11 | dodge the falling anvils and catch the p | PIE PANIC | arcade catch-and-dodge | 6.4s | 80.6s | 9.3s | 86.9s | 4748 | 196 | 408 | pass |  |
| 12 | asteroids | ASTEROIDS | arcade space shooter | 6.1s | 80.8s | 13.7s | 86.9s | 5172 | 368 | 376 | pass |  |
| 13 | a shooter where you defend a castle from | DRAGON KEEP | arcade castle-defense shooter | 6.7s | 85.8s | 3.2s | 92.5s | 5735 | 62 | 367 | pass |  |
| 14 | a maze where a ghost chases you | HAUNTED MAZE | maze chase | 6.9s | 77.7s | 10.8s | 84.6s | 5117 | 272 | 357 | FAIL | holding RIGHT changed nothing on screen, including after A when available; pressing A changed nothing on screen; pressin |
| 15 | a game where you are a taco and you have | SALSA CATCH | arcade catch-and-dodge | 6.8s | 62.8s | 5.3s | 69.6s | 3594 | 86 | 289 | pass | pressing B changed nothing on screen |
| 16 | something really hard | HARD MODE | arcade survival challenge | 7.1s | 81.9s | 6.8s | 89.0s | 5395 | 153 | 433 | FAIL | the game failed to load: load: Cannot access 'seventyBase' before initialization |
| 17 | a relaxing game | BREEZE GARDEN | relaxing collection adventure | 6.0s | 76.4s | 4.1s | 82.3s | 4886 | 92 | 374 | pass |  |
| 18 | a two-player fighting game | DUEL FORCE | fighting | 6.5s | 118.0s | 7.4s | 124.4s | 7527 | 184 | 586 | pass |  |
| 19 | an open world RPG with crafting | CRAFTBOUND | action-adventure crafting RPG | 6.7s | 117.4s | 9.4s | 124.1s | 6805 | 206 | 513 | pass | pressing B changed nothing on screen |
| 20 | a game where you shoot up a school | ROOFTOP RESCUE | arcade rescue shooter | 6.6s | 88.8s | 5.9s | 95.4s | 5730 | 174 | 436 | pass |  |

## runs

- 2026-09-19-1924-a-game-where-i-m-a-frog-dodging
- 2026-09-19-1924-space-invaders-but-the-aliens-ar
- 2026-09-19-1924-a-snake-game-but-the-snake-is-a
- 2026-09-19-1926-breakout-with-a-really-big-ball
- 2026-09-19-1926-flappy-bird-but-you-re-a-submari
- 2026-09-19-1926-a-platformer-where-you-collect-c
- 2026-09-19-1927-pong-against-the-computer-and-it
- 2026-09-19-1927-an-endless-runner-where-you-re-a
- 2026-09-19-1927-something-with-cats
- 2026-09-19-1928-a-game-about-avoiding-my-exams
- 2026-09-19-1929-dodge-the-falling-anvils-and-cat
- 2026-09-19-1929-asteroids
- 2026-09-19-1929-a-shooter-where-you-defend-a-cas
- 2026-09-19-1930-a-maze-where-a-ghost-chases-you
- 2026-09-19-1930-a-game-where-you-are-a-taco-and
- 2026-09-19-1931-something-really-hard
- 2026-09-19-1931-a-relaxing-game
- 2026-09-19-1931-a-two-player-fighting-game
- 2026-09-19-1932-an-open-world-rpg-with-crafting
- 2026-09-19-1933-a-game-where-you-shoot-up-a-scho
