# Bench 2026-09-19 catalog-expanded-medium-2p-unique-a

- model: gpt-6-astra, effort: medium, players: 2, n: 1, concurrency: 2
- prompts: 6, runs: 6, errors: 0
- total  p50 20.5s  p95 32.1s  max 32.1s
- build  p50 13.8s  p95 23.2s
- ttft   p50 9.4s  p95 16.3s
- tokens mean 524  reasoning mean 214  lines mean 440
- syntax errors: 0
- probe pass: 6/6 (100%)
- wall clock: 82.7s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Bomberman-style bomb maze: clear two are | BOMBBOUND DUO | cooperative bomb-maze action | 7.1s | 7.6s | 5.3s | 14.7s | 259 | 118 | 579 | pass | holding LEFT changed nothing on screen, including after A when available; holding UP changed nothing on screen, includin |
| 2 | Frogger-style crossing: get five frogs h | FROGGER DUO | cooperative arcade crossing | 6.7s | 13.8s | 9.4s | 20.5s | 520 | 249 | 411 | pass | holding DOWN changed nothing on screen, including after A when available; player two holding DOWN changed nothing on scr |
| 3 | A falling-block puzzle with seven-piece  | LINE RACE | competitive falling-block puzzle | 5.9s | 20.8s | 12.1s | 26.7s | 706 | 263 | 258 | pass |  |
| 4 | A Space Invaders and Galaga-style format | ALIEN FORMATIO | cooperative formation shooter | 8.9s | 23.2s | 16.3s | 32.1s | 640 | 341 | 623 | pass |  |
| 5 | Asteroids-style space rocks: clear three | ASTEROID DUO | cooperative inertial space shooter | 9.9s | 4.2s | 2.1s | 14.2s | 174 | 49 | 540 | pass | holding DOWN changed nothing on screen, including after A when available; player two holding DOWN changed nothing on scr |
| 6 | Missile Command-style city defense over  | CITY COMMAND | cooperative target-defense arcade | 8.2s | 20.9s | 10.0s | 29.2s | 847 | 262 | 226 | pass |  |

## runs

- 2026-09-19-214555508-bomberman-style-bomb-maze-clear-RGytYD
- 2026-09-19-214555581-frogger-style-crossing-get-five-hsiNoa
- 2026-09-19-214610803-a-falling-block-puzzle-with-seve-FsLJ8C
- 2026-09-19-214616390-a-space-invaders-and-galaga-styl-pXmr67
- 2026-09-19-214637731-asteroids-style-space-rocks-clea-gZVohC
- 2026-09-19-214648782-missile-command-style-city-defen-wUi7zq
