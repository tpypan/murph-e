# AGENTS.md

Read this before touching the repo. It is short on purpose. The long-form
reasoning lives in `docs/`, and this file tells you which doc answers which
question.

## What this is

A voice-to-arcade-game cabinet for Hack the North 2026. A person speaks a
game into a mic, a pipeline writes it, and they play it on real arcade
controls. The one number we optimise is seconds from end-of-speech to
"PRESS START". Read `docs/overview.md` first, then the goal doc for the tier
you are working on.

## Repo map

```
packages/runtime/   the 8-bit fantasy-console runtime games run on. No deps.
packages/harness/   transcript -> spec -> game.js -> probe -> repair. CLI.
packages/probe/     headless Playwright verifier for a game.js, plus the fun
                    probe: a bot plays the game and reports whether it is
                    worth playing.
packages/badge/     hacker badge over USB serial: hot-plug, app push, hello and
                    button events. Ships the arcade Lua app in app/.
apps/cabinet/       Next.js kiosk page + API routes (STT token, generate).
library/            games that passed the probe: spec.json, game.js, thumb.png
bench/              canned prompts and bench results.
runs/               every generation attempt, gitignored.
data/               the leaderboard (scores.json), gitignored.
docs/               design docs, goals, plans, research.
```

Tier 1 is built (`docs/plans/tier-1.md`). Tier 2 (two players on badges,
leaderboard, remix) is built against a fake badge; what still needs real
hardware is the checklist in `docs/plans/tier-2.md`.

## Stack and conventions

- TypeScript everywhere. pnpm workspace. Biome for lint and format. Node via
  mise. Check for a lockfile before running any package manager.
- `apps/cabinet` is Next.js App Router. Server Components by default;
  `'use client'` only where there is state or a browser API.
- The runtime is plain TS compiled to one `runtime.js`. It must not depend on
  anything: it is loaded into a sandboxed iframe and into the probe.
- Pure functions by default. Classes only for services with lifecycle
  (serial ports, the STT session).
- Comments in English. Conventional commits: `feat(harness): ...`. Never add
  AI attribution lines to commits or PRs.
- Playwright for the probe and for end-to-end checks. Verify UI changes with
  a screenshot before calling them done.

## Models and keys

- OpenAI only. `OPENAI_API_KEY` in `.env` (gitignored). `.env.example` is the
  template. Never commit a key; never print one in a log.
- Build: `gpt-5.6-sol`, `reasoning.effort: "none"`, streamed (bench
  2026-09-19: p50 36 s, 90% probe pass; `low` was 46 s for the same pass
  rate; the re-run after tier 2 landed was p50 26 s, 20/20). Override with
  `HTN_BUILD_MODEL` / `HTN_BUILD_EFFORT`; `gpt-6-astra` at `low` is the
  A/B (33 s, same pass rate, 2.5x the price). Two-player prompts: p50
  30 s, 11/12.
- Repair: `gpt-5.6-sol`, `reasoning.effort: "low"` (it has to reason about
  the probe's observations).
- Remix: `gpt-5.6-sol`, `reasoning.effort: "none"`, search/replace blocks
  against the game on screen, so a few hundred output tokens instead of a
  whole game. Override with `HTN_REMIX_MODEL` / `HTN_REMIX_EFFORT`. The
  bench is `pnpm harness bench-remix bench/remixes.txt`.
- Judge: `gpt-5.6-sol`, `reasoning.effort: "low"`, over the source and three
  screenshots. Bench only, never on the cabinet's path. Override with
  `HTN_JUDGE_MODEL` / `HTN_JUDGE_EFFORT`.
- Spec: `gpt-5.6-luna`, `reasoning.effort: "none"`, structured output. The
  same call decides whether words spoken over a running game are a remix
  of it or a new game. `players` (1 or 2) comes from the cabinet's menu,
  never from the model.
- STT: `gpt-live-transcribe` over WebRTC from the kiosk page;
  `gpt-transcribe` on a recorded clip as the fallback.
- Do not change a model or effort setting without a bench run. The bench is
  `pnpm harness bench`; results go in `bench/results/`. Why these models:
  `docs/bench-2026-09-19-openai-models.md`.

## Hard rules

1. **The build path is one streamed call.** No agent loops, no tool use, no
   "let the model run the game and iterate." That is what made the previous
   harness take 40 minutes. Repair is one bounded round, then the fallback
   library. Remix is the same shape: one call, one repair, then the game
   that was already on screen.
2. **A game that passes the probe is not yet a game.** The probe answers
   "does this run"; `docs/research/arcade-game-design.md` is what separates
   that from "is this worth playing", and the Design block at the top of the
   house rules is that research compressed. Changing it needs a `--fun` bench,
   not just a probe pass.
3. **The runtime API is the contract.** Games are written against it by a
   model that only sees the API reference and the templates in the prompt.
   If you change the API, change all three in the same commit: the runtime,
   the reference in the prompt, and every template in `library/templates/`.
   Then run the bench.
4. **Latency is a test.** A change that moves p50 for the bench prompts by
   more than a few seconds needs a reason in the commit message.
5. **Games are single-file `game.js`** implementing `init`, `update`, `draw`
   against the runtime. No assets, no imports, no network.
6. **The cabinet never dead-ends.** Every failure path ends in a playable
   game from the library and a message on screen.
7. **Input is owned by the shell, not the game.** Keyboard, encoder and badge
   serial all become the same `{player, button, down}` events posted into the
   game iframe. Games never read keycodes.

## How to verify

- Runtime change: `pnpm exercise` (headless: every protocol message, the
  probe hook, crash guard, determinism), then `pnpm serve` and play
  `http://localhost:5173/packages/runtime/dev.html` with the keyboard, or
  `pnpm screenshots` for a screenshot of every state. Rebuild `runtime.js`
  with `pnpm runtime:build` first; it is gitignored.
- Prompt or model change: `pnpm harness bench bench/prompts.txt` and compare
  p50, p95 and probe pass rate to the last result file. If the change is meant
  to make the games better rather than faster, add `--fun` (and `--n 2`, since
  one run per prompt is noise): it playtests and judges every game and prints
  losability, distinct point values, agency and the six judge axes. The A/B
  that set the current numbers is `docs/bench-2026-09-19-game-design.md`.
  `pnpm playtest <game.js>` prints the same measurements for one file.
  Two-player prompts: `pnpm harness bench bench/prompts-2p.txt --players 2`
  (goal 8 of 10).
  Remix: `pnpm harness bench-remix bench/remixes.txt` (goal p50 under half
  the build p50, most of the original kept).
- Probe change: run it on `library/` and confirm every library game still
  passes, then on `bench/known-bad/` and confirm every broken one still fails.
- Badge change: `pnpm test:badge` first (the hub against an in-process fake
  badge that speaks the console protocol: push, hello, buttons, bye,
  unplug, the ring-overflow wedge). `pnpm badge fake` prints the same
  scenario. Then `pnpm badge watch` with a real badge plugged in prints
  every hub event (attach, install, hello, buttons). `pnpm badge push`
  forces a reinstall of `packages/badge/app`. Bump `version` in
  `manifest.cfg` and `APP_VERSION` in `protocol.ts` together; the hub
  reinstalls on mismatch. The badge's Lua sandbox has no `pcall`. Only one
  process can hold a port: stop any other `pnpm dev` or `badge watch` first.
- Leaderboard change: `pnpm test:scores`. `pnpm test` runs every package test.
- Cabinet change: `pnpm dev`, then `pnpm screenshots:cabinet` for sixteen
  screenshots: the tier 1 loop with one real generation and the F8 crash
  injection, then the tier 2 pass with two fake badges: the 1P/2P menu,
  plug-in, a real two-player generation, a cable pull mid-game, the
  leaderboards and a remix. Or drive it by hand: arrows, Z, X, Enter, hold
  Space to talk, Esc cancels or returns to attract, F1/F2 plug or unplug a
  fake badge, I J K L N M are player two, F8 injects a crash, F9 ends the
  round.
- STT change: `pnpm stt:test <clip.wav> "<expected words>"` feeds a 24 kHz
  WAV through Chromium's fake microphone (make one with `say -o x.aiff ...`
  and `afconvert -f WAVE -d LEI16@24000 -c 1 x.aiff x.wav`).

## Where decisions live

- Engine, pipeline shape, latency budget: `docs/harness-plan.md`.
- Model choice and the numbers behind it: `docs/bench-2026-09-19-openai-models.md`.
- Badges, plug-in identity, 1P/2P modes, multiplayer transport:
  `docs/badge-integration.md`.
- Tier 2 build order, interfaces, remix format and the hardware checklist:
  `docs/plans/tier-2.md`.
- What makes a game fun, and how the Design rules were derived and measured:
  `docs/research/arcade-game-design.md` and
  `docs/bench-2026-09-19-game-design.md`.
- Scope per tier: `docs/goals/`.
- Changing one of these is fine. Update the doc in the same change.
