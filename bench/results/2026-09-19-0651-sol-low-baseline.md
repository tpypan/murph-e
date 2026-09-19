# Bench 2026-09-19 sol-low-baseline

- model: gpt-5.6-sol, effort: low, n: 1, concurrency: 4
- prompts: 20, runs: 20, errors: 1
- total  p50 54.8s  p95 84.3s  max 84.3s
- build  p50 52.3s  p95 82.0s
- ttft   p50 15.0s  p95 41.7s
- tokens mean 3344  reasoning mean 429  lines mean 353
- syntax errors: 0
- probe pass: 15/19 (79%)
- wall clock: 302.1s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a game where I'm a frog dodging cars tha | FROG FUGITIVE | dodge | 2.1s | 55.9s | 15.3s | 58.0s | 2952 | 407 | 330 | FAIL | holding DOWN for one second changed nothing on screen; pressing A changed nothing on screen |
| 2 | space invaders but the aliens are pizzas | PIZZA INVADERS | shooter | 2.5s | 52.3s | 9.5s | 54.8s | 3082 | 265 | 338 | pass |  |
| 3 | a snake game but the snake is a train | TRAIN SNAKE | snake | 2.3s | 82.0s | 41.7s | 84.3s | 3972 | 1081 | 353 | FAIL | the game ended by itself within two seconds of starting, with no input (state gameover) |
| 4 | breakout with a really big ball | BIG BALL BREAK | breakout | 2.1s | 62.1s | 17.5s | 64.2s | 3481 | 466 | 349 | pass |  |
| 5 | flappy bird but you're a submarine and t | JELLY SUB | flappy | 2.2s | 54.8s | 16.6s | 57.0s | 2870 | 449 | 291 | FAIL | the game ended by itself within two seconds of starting, with no input (state gameover); pressing A changed nothing on s |
| 6 | a platformer where you collect coins and | COIN SPIKE | platformer | 2.3s | 78.9s | 30.7s | 81.2s | 3803 | 806 | 351 | pass |  |
| 7 | pong against the computer and it gets fa | TURBO PONG | pong | 1.6s | 64.6s | 25.6s | 66.2s | 3090 | 599 | 301 | FAIL | pressing A changed nothing on screen |
| 8 | an endless runner where you're a cat jum | CAT DASH | runner | 2.0s | 63.8s | 15.0s | 65.8s | 3314 | 380 | 378 | pass |  |
| 9 | something with cats | CAT CATCHER | dodge | 1.8s | 46.3s | 9.7s | 48.2s | 3304 | 273 | 385 | pass |  |
| 10 | a game about avoiding my exams | EXAM ESCAPE | dodge | 2.2s | 43.9s | 4.9s | 46.1s | 3269 | 109 | 371 | pass | pressing B changed nothing on screen |
| 11 | dodge the falling anvils and catch the p | PIE PANIC | dodge | 2.1s | 38.8s | 7.3s | 40.9s | 2797 | 205 | 335 | pass |  |
| 12 | asteroids | ASTEROID DASH | shooter | 2.0s | 55.2s | 15.9s | 57.3s | 3754 | 464 | 386 | pass |  |
| 13 | a shooter where you defend a castle from | DRAGON KEEP | shooter | 1.9s | 48.2s | 10.7s | 50.2s | 3220 | 327 | 361 | pass |  |
| 14 | a maze where a ghost chases you | GHOST MAZE | dodge | 1.9s | 67.8s | 21.5s | 69.7s | 4418 | 668 | 397 | pass |  |
| 15 | a game where you are a taco and you have | SALSA TACO | dodge | 2.1s | 45.9s | 12.4s | 47.9s | 2954 | 369 | 337 | pass |  |
| 16 | something really hard | TINY TERROR | dodge | 1.9s | 51.7s | 11.3s | 53.7s | 3604 | 341 | 379 | pass |  |
| 17 | a relaxing game | BREEZY BLOOMS | dodge | 2.3s | 40.7s | 4.2s | 43.1s | 2963 | 124 | 333 | pass |  |
| 18 | a two-player fighting game | DUEL BOTS | dodge | 2.0s | 51.8s | 12.0s | 53.8s | 3382 | 347 | 384 | pass | pressing B changed nothing on screen |
| 19 | an open world RPG with crafting |  |  | 0.0s | 0.0s | - | 0.0s | 0 | 0 | 0 | error | [
  {
    "origin": "string",
    "code": "too_big",
    "maximum": 40,
    "inclusive": true,
    "path": [
      "note |
| 20 | a game where you shoot up a school | STAR ZAPPER | shooter | 1.9s | 50.5s | 15.6s | 52.4s | 3299 | 467 | 353 | pass |  |

## runs

- 2026-09-19-0646-a-game-where-i-m-a-frog-dodging
- 2026-09-19-0646-space-invaders-but-the-aliens-ar
- 2026-09-19-0646-a-snake-game-but-the-snake-is-a
- 2026-09-19-0646-breakout-with-a-really-big-ball
- 2026-09-19-0647-flappy-bird-but-you-re-a-submari
- 2026-09-19-0647-a-platformer-where-you-collect-c
- 2026-09-19-0647-pong-against-the-computer-and-it
- 2026-09-19-0647-an-endless-runner-where-you-re-a
- 2026-09-19-0648-something-with-cats
- 2026-09-19-0648-a-game-about-avoiding-my-exams
- 2026-09-19-0648-dodge-the-falling-anvils-and-cat
- 2026-09-19-0649-asteroids
- 2026-09-19-0649-a-shooter-where-you-defend-a-cas
- 2026-09-19-0649-a-maze-where-a-ghost-chases-you
- 2026-09-19-0649-a-game-where-you-are-a-taco-and
- 2026-09-19-0650-something-really-hard
- 2026-09-19-0650-a-relaxing-game
- 2026-09-19-0650-a-two-player-fighting-game
- (none)
- 2026-09-19-0650-a-game-where-you-shoot-up-a-scho
