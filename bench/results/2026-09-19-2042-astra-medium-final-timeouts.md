# Bench 2026-09-19 astra-medium-final-timeouts

- model: gpt-6-astra, effort: medium, players: 1, n: 1, concurrency: 4
- prompts: 4, runs: 4, errors: 0
- total  p50 233.4s  p95 254.6s  max 254.6s
- build  p50 223.9s  p95 232.4s
- ttft   p50 78.0s  p95 103.5s
- tokens mean 2027  reasoning mean 388  lines mean 741
- syntax errors: 3
- probe pass: 1/4 (25%)
- wall clock: 254.7s

| # | prompt | title | genre | spec | build | ttft | total | tok | reas | lines | probe | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | something with cats | CAT CATCHER | arcade collection chase | 29.4s | 225.2s | 90.9s | 254.6s | 0 | 0 | 765 | FAIL | SyntaxError: Unexpected end of input; the game failed to load: load: Unexpected end of input |
| 2 | a shooter where you defend a castle from | DRAGON KEEP | defense shooter | 8.5s | 232.4s | 103.5s | 241.0s | 0 | 0 | 770 | FAIL | SyntaxError: Unexpected end of input; the game failed to load: load: Unexpected end of input |
| 3 | a maze where a ghost chases you | GHOST MAZE | maze chase | 6.6s | 144.6s | 52.5s | 151.2s | 8109 | 1552 | 617 | pass | holding UP changed nothing on screen, including after A when available; holding DOWN changed nothing on screen, includin |
| 4 | Street Fighter but with Batman, Superman | DC ROOFTOP RUM | one-on-one fighting | 9.5s | 223.9s | 78.0s | 233.4s | 0 | 0 | 812 | FAIL | SyntaxError: Unexpected end of input; the game failed to load: load: Unexpected end of input |

## runs

- 2026-09-19-2037-something-with-cats
- 2026-09-19-2037-a-shooter-where-you-defend-a-cas
- 2026-09-19-2037-a-maze-where-a-ghost-chases-you
- 2026-09-19-2037-street-fighter-but-with-batman-s
