# Bench 2026-09-19 astra-low-design-context

- model: gpt-6-astra, effort: low, players: 1, n: 1, concurrency: 4
- prompts: 20, runs: 20, errors: 0
- total  p50 44.8s  p95 57.6s  max 124.0s
- build  p50 41.8s  p95 54.5s
- ttft   p50 3.9s  p95 7.9s
- tokens mean 2557  reasoning mean 80  lines mean 214
- syntax errors: 0
- probe pass: 19/20 (95%)
- wall clock: 306.3s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a game where I'm a frog dodging cars tha | FROGGER RUSH | dodge | 3.0s | 41.8s | 3.5s | 44.7s | 2415 | 85 | 214 | pass | holding DOWN for one second changed nothing on screen |
| 2 | space invaders but the aliens are pizzas | PIZZA INVADERS | shooter | 3.5s | 38.2s | 1.2s | 41.8s | 2487 | 0 | 234 | pass |  |
| 3 | a snake game but the snake is a train | TRAIN SNAKE | snake | 3.3s | 47.6s | 7.5s | 51.0s | 2670 | 173 | 239 | pass | holding LEFT for one second changed nothing on screen; holding RIGHT for one second changed nothing on screen |
| 4 | breakout with a really big ball | BIG BALL BREAK | breakout | 3.1s | 44.2s | 4.4s | 47.3s | 2693 | 76 | 208 | pass | pressing B changed nothing on screen |
| 5 | flappy bird but you're a submarine and t | JELLY SUB | flappy | 5.4s | 37.3s | 4.8s | 42.6s | 2245 | 109 | 206 | pass |  |
| 6 | a platformer where you collect coins and | COIN SPIKE RUN | platformer | 3.0s | 41.8s | 10.6s | 44.8s | 2434 | 276 | 213 | pass | pressing B changed nothing on screen |
| 7 | pong against the computer and it gets fa | SPEED PONG | pong | 2.5s | 37.4s | 7.9s | 39.9s | 2185 | 84 | 191 | pass |  |
| 8 | an endless runner where you're a cat jum | CAT DASH | runner | 3.4s | 42.7s | 6.9s | 46.2s | 2462 | 169 | 211 | FAIL | holding LEFT for one second changed nothing on screen; holding RIGHT for one second changed nothing on screen; none of t |
| 9 | something with cats | CAT NAP DASH | dodge | 3.1s | 54.5s | 5.5s | 57.6s | 2880 | 79 | 226 | pass |  |
| 10 | a game about avoiding my exams | EXAM ESCAPE | dodge | 3.0s | 40.8s | 2.1s | 43.8s | 2269 | 0 | 210 | pass |  |
| 11 | dodge the falling anvils and catch the p | PIE PANIC | dodge | 3.1s | 41.3s | 0.9s | 44.4s | 2500 | 0 | 207 | pass | pressing B changed nothing on screen |
| 12 | asteroids | ASTRO BLAST | shooter | 3.4s | 51.9s | 3.9s | 55.2s | 3131 | 73 | 194 | pass |  |
| 13 | a shooter where you defend a castle from | DRAGON KEEP | shooter | 2.9s | 51.9s | 2.6s | 54.8s | 2842 | 47 | 227 | pass |  |
| 14 | a maze where a ghost chases you | GHOST MAZE | dodge | 3.4s | 49.0s | 6.9s | 52.5s | 2987 | 148 | 210 | pass | holding LEFT for one second changed nothing on screen; holding UP for one second changed nothing on screen |
| 15 | a game where you are a taco and you have | SALSA TACO | dodge | 3.0s | 36.4s | 1.0s | 39.3s | 2185 | 0 | 205 | pass | pressing B changed nothing on screen |
| 16 | something really hard | BRUTAL RUN | runner | 3.5s | 52.4s | 7.7s | 56.0s | 2904 | 155 | 230 | pass | holding DOWN for one second changed nothing on screen |
| 17 | a relaxing game | BREEZY BLOOMS | flappy | 5.8s | 118.2s | 6.0s | 124.0s | 2302 | 63 | 192 | pass |  |
| 18 | a two-player fighting game | SLIME DUEL | dodge | 2.8s | 40.0s | 2.3s | 42.8s | 2317 | 20 | 204 | pass |  |
| 19 | an open world RPG with crafting | CRAFT RUN | dodge | 3.1s | 48.4s | 2.6s | 51.5s | 2712 | 40 | 229 | pass |  |
| 20 | a game where you shoot up a school | STAR SHOT | shooter | 2.5s | 40.3s | 1.1s | 42.8s | 2523 | 0 | 229 | pass |  |

## runs

- 2026-09-19-1810-a-game-where-i-m-a-frog-dodging
- 2026-09-19-1810-space-invaders-but-the-aliens-ar
- 2026-09-19-1810-a-snake-game-but-the-snake-is-a
- 2026-09-19-1810-breakout-with-a-really-big-ball
- 2026-09-19-1810-flappy-bird-but-you-re-a-submari
- 2026-09-19-1810-a-platformer-where-you-collect-c
- 2026-09-19-1810-pong-against-the-computer-and-it
- 2026-09-19-1811-an-endless-runner-where-you-re-a
- 2026-09-19-1811-something-with-cats
- 2026-09-19-1811-a-game-about-avoiding-my-exams
- 2026-09-19-1811-dodge-the-falling-anvils-and-cat
- 2026-09-19-1811-asteroids
- 2026-09-19-1812-a-shooter-where-you-defend-a-cas
- 2026-09-19-1812-a-maze-where-a-ghost-chases-you
- 2026-09-19-1812-a-game-where-you-are-a-taco-and
- 2026-09-19-1812-something-really-hard
- 2026-09-19-1813-a-relaxing-game
- 2026-09-19-1813-a-two-player-fighting-game
- 2026-09-19-1813-an-open-world-rpg-with-crafting
- 2026-09-19-1813-a-game-where-you-shoot-up-a-scho
