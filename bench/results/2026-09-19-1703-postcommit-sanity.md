# Bench 2026-09-19 postcommit-sanity

- model: gpt-5.6-sol, effort: none, players: 1, n: 1, concurrency: 3
- prompts: 6, runs: 6, errors: 0
- total  p50 30.2s  p95 40.2s  max 40.2s
- build  p50 26.4s  p95 29.4s
- ttft   p50 1.1s  p95 2.5s
- tokens mean 2738  reasoning mean 0  lines mean 219
- syntax errors: 0
- probe pass: 5/6 (83%)
- wall clock: 92.3s

## fun

- fun score mean 57.67  p50 45
- grace 5/6  losable 4/6  agency>1 3/6  agency mean 9.57
- score tiers mean 1.5  spread mean 2.67  first point mean 12.08s
- density ramp mean 1  colours mean 11.5  sfx kinds mean 4.5  flash+shake 6/6
- judge mean 2.92 over 6, again 2.33
- judge axes: hook 2.83, riskReward 2.83, ramp 3, feel 3.17, readability 2.67, variety 3

| # | prompt | title | genre | total | tok | lines | probe | fun | judge | again | worst |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a game where I am a frog dodging cars th | FROGGER RUSH | dodge | 36.8s | 2651 | 214 | pass | 75 | 3.83 | 4 | The starting bank is perfectly safe, so players can avoid all pressure forever. |
| 2 | space invaders but the aliens are pizzas | PIZZA INVADERS | shooter | 40.2s | 2957 | 232 | pass | 82 | 3.33 | 3 | Most runs end before the 20s boxes or 45s boss can appear. |
| 3 | a snake game but the snake is a train | TRAIN SNAKE | snake | 28.0s | 2470 | 214 | pass | 45 | 2.17 | 2 | Runs end in seconds, before cargo, coal, or runaway engines matter. |
| 4 | a platformer where you collect coins and | SPIKE DASH | platformer | 30.2s | 2468 | 196 | FAIL | 35 | 1.5 | 1 | The run ends in under a second, before any coin or mechanic can matter. |
| 5 | asteroids | ASTEROID RUN | shooter | 29.5s | 2889 | 225 | pass | 45 | 3.17 | 2 | Bot never scored; tiny sprites and rotation aiming make the action hard to parse. |
| 6 | a maze where a ghost chases you | GHOST MAZE | dodge | 31.8s | 2994 | 233 | pass | 64 | 3.5 | 2 | The bot earned nothing for 68 seconds, so the core reward loop is far too inaccessible. |

## runs

- 2026-09-19-1701-a-game-where-i-am-a-frog-dodging
- 2026-09-19-1701-space-invaders-but-the-aliens-ar
- 2026-09-19-1701-a-snake-game-but-the-snake-is-a
- 2026-09-19-1702-a-platformer-where-you-collect-c
- 2026-09-19-1702-asteroids
- 2026-09-19-1702-a-maze-where-a-ghost-chases-you
