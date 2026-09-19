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
packages/probe/     headless Playwright verifier for a game.js.
apps/cabinet/       Next.js kiosk page + API routes (STT token, generate).
library/            games that passed the probe: spec.json, game.js, thumb.png
bench/              canned prompts and bench results.
runs/               every generation attempt, gitignored.
docs/               design docs, goals, plans, research.
```

Until a package exists, its plan is in `docs/plans/tier-1.md`.

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
- Build, repair, remix: `gpt-5.6-sol`, `reasoning.effort: "low"`, streamed.
- Spec: `gpt-5.6-luna`, `reasoning.effort: "none"`, structured output.
- STT: `gpt-live-transcribe`.
- Do not change a model or effort setting without a bench run. The bench is
  `pnpm harness bench`; results go in `bench/results/`. Why these models:
  `docs/bench-2026-09-19-openai-models.md`.

## Hard rules

1. **The build path is one streamed call.** No agent loops, no tool use, no
   "let the model run the game and iterate." That is what made the previous
   harness take 40 minutes. Repair is one bounded round, then the fallback
   library.
2. **The runtime API is the contract.** Games are written against it by a
   model that only sees the API reference and the templates in the prompt.
   If you change the API, change all three in the same commit: the runtime,
   the reference in the prompt, and every template in `library/templates/`.
   Then run the bench.
3. **Latency is a test.** A change that moves p50 for the bench prompts by
   more than a few seconds needs a reason in the commit message.
4. **Games are single-file `game.js`** implementing `init`, `update`, `draw`
   against the runtime. No assets, no imports, no network.
5. **The cabinet never dead-ends.** Every failure path ends in a playable
   game from the library and a message on screen.
6. **Input is owned by the shell, not the game.** Keyboard, encoder and badge
   serial all become the same `{player, button, down}` events posted into the
   game iframe. Games never read keycodes.

## How to verify

- Runtime change: `pnpm exercise` (headless: every protocol message, the
  probe hook, crash guard, determinism), then `pnpm serve` and play
  `http://localhost:5173/packages/runtime/dev.html` with the keyboard, or
  `pnpm screenshots` for a screenshot of every state. Rebuild `runtime.js`
  with `pnpm runtime:build` first; it is gitignored.
- Prompt or model change: `pnpm harness bench bench/prompts.txt` and compare
  p50, p95 and probe pass rate to the last result file.
- Probe change: run it on `library/` and confirm every library game still
  passes, then on `bench/known-bad/` and confirm every broken one still fails.
- Cabinet change: `pnpm dev`, drive it with the keyboard (arrows, Z, X,
  Enter, hold Space to talk), screenshot each state.

## Where decisions live

- Engine, pipeline shape, latency budget: `docs/harness-plan.md`.
- Model choice and the numbers behind it: `docs/bench-2026-09-19-openai-models.md`.
- Badges, plug-in identity, 1P/2P modes, multiplayer transport:
  `docs/badge-integration.md`.
- Scope per tier: `docs/goals/`.
- Changing one of these is fine. Update the doc in the same change.
