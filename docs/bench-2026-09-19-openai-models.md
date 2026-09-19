# OpenAI model latency bench, 2026-09-19

One streamed Responses API call per row, identical prompt: "write a complete
self-contained 8-bit canvas dodge game, 200-300 lines, code only". This is a
*harder* task than the real build call will be (the real one writes gameplay
against our runtime, not a whole game), so treat these as an upper bound.
`tok/s` is visible output tokens per second after first token. n=1 unless noted.

| model | effort | TTFT s | total s | out tok | reasoning tok | tok/s | lines |
|---|---|---|---|---|---|---|---|
| gpt-5.6-luna | none | 0.6 | 8.5 | 1760 | 0 | 225 | 218 |
| gpt-5.6-luna | low (n=4) | 3.0–4.0 | 10.8–18.7 | 2205–2394 | 262–447 | 132–259 | 220–289 |
| gpt-5.4-mini | low (n=4) | 1.5–3.7 | 12.6–19.6 | 2473–2916 | 117–191 | 144–210 | 272–310 |
| gpt-5.4 | none | 0.7 | 13.9 | 2095 | 0 | 158 | 228 |
| gpt-5.4 | low (n=4) | 2.1–4.2 | 15.6–22.0 | 2374–2947 | 97–256 | 151–168 | 271–310 |
| gpt-5.3-codex | low (n=4) | 3.3–9.0 | 15.8–22.1 | 2592–2990 | 272–695 | 176–195 | 268–298 |
| gpt-5.5 | low (n=4) | 1.7–2.9 | 21.7–27.7 | 2496–3254 | 38–96 | 123–135 | 272–334 |
| gpt-5.4 | medium | 7.2 | 25.9 | 3586 | 516 | 165 | 358 |
| gpt-5.6-terra | low | 3.4 | 30.7 | 2675 | 58 | 96 | 310 |
| gpt-5.6-sol | low | 3.7 | 31.3 | 2765 | 79 | 97 | 345 |
| gpt-5.5 | medium | 9.7 | 35.9 | 3830 | 516 | 127 | 371 |
| gpt-6-astra | low | 4.3 | 39.6 | 2661 | 53 | 74 | 294 |
| gpt-5.6-sol | medium | 15.9 | 50.1 | 3086 | 516 | 75 | 361 |
| gpt-6-astra | medium | 18.2 | 52.5 | 3087 | 502 | 75 | 304 |
| gpt-5.4-mini | medium | 63.0 | 75.7 | 10939 | 8534 | 190 | 301 |

Other findings:

- `reasoning.effort: "none"` is accepted by gpt-5.4 and the gpt-5.6 family.
  `"minimal"` is rejected (`unsupported_value`). `gpt-5.1-codex-mini` is not
  available on this key.
- All 16 generated games parse (`node --check`). Four were opened in Chrome
  (luna none, luna low, 5.4 none, 5.4 low): all render a playable-looking road
  and frog with a HUD and no console errors.
- The Sol / Terra / Astra tier streams visible output at roughly half the
  tokens per second of 5.4 (75–97 vs 150–170). For a fixed-size output that is
  a 2x latency cost with no benefit an arcade game can use.
- gpt-5.4-mini at medium blew up to 8.5k reasoning tokens on one call (63 s
  TTFT). Small models at medium effort have a fat tail; low or none is the
  safe setting.
- Pricing (from the OpenAI models page, 2026-09-19): Sol $4/$20, Terra $2/$12,
  Luna $0.20/$1.20, Astra $10/$50 per 1M in/out. At ~3k output tokens a game
  costs cents on any of them.

Decision: see `harness-plan.md` section 9.


## Addendum: full pipeline bench, 20 prompts, tuned prompt (2026-09-19, later)

Run with `pnpm harness bench bench/prompts.txt` after the house rules were
tightened (120 to 220 lines, grace period, A always does something) and all
eight templates existed. Concurrency 4. Results in `bench/results/`.

| build model / effort | total p50 | total p95 | ttft p50 | out tokens | lines | probe pass |
|---|---|---|---|---|---|---|
| gpt-5.6-sol low (baseline, one template, old rules) | 54.8 s | 84.3 s | 15.0 s | 3344 | 353 | 15/19 |
| gpt-5.6-sol low | 45.6 s | 51.5 s | 11.8 s | 2815 | 279 | 18/20 |
| **gpt-5.6-sol none** | **36.4 s** | **42.5 s** | **1.0 s** | 2414 | 270 | 18/20 |
| gpt-6-astra low | 32.8 s | 38.5 s | 2.3 s | 2281 | 204 | 18/20 |

Findings:

- Effort `none` on Sol removes 10 to 40 s of pre-output reasoning and costs
  nothing in probe pass rate. Thumbnails of the same prompts look as rich as
  the `low` run. It is the default build setting.
- Astra low is 4 s faster still and writes shorter games, at 2.5x the price
  per token. Its games lean on on-screen control hints and night palettes.
  Not enough of a difference to switch; kept as the A/B via
  `HTN_BUILD_MODEL=gpt-6-astra HTN_BUILD_EFFORT=low`.
- The two failures per run are the same two prompts: "a maze where a ghost
  chases you" (grid movement that ignores a held direction for a second) and
  "a two-player fighting game" (A does nothing until the fight starts). Both
  are repair material, not model material.
- The moderation prompt was replaced with a safe game in all runs.
