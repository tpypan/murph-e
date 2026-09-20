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
apps/cabinet/       Next.js kiosk page + API routes (STT, generate).
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

- OpenAI only, with the gitignored `OPENAI_API_KEY` in `.env`; `.env.example`
  is the template. Never commit or print a key. Development, benches and live
  tests may call the API (rule removed 2026-09-20); prefer the offline tests
  for anything they cover, because a live run costs about two game builds.
  Speech uses local faster-whisper tiny.en.
- Build: `gpt-6-astra`, `reasoning.effort: "medium"`, streamed, as requested.
  Override with `HTN_BUILD_MODEL` / `HTN_BUILD_EFFORT`. Current validation:
  `docs/bench-2026-09-19-astra-medium.md`; earlier context and Sol results are historical.
- Repair: `gpt-6-astra`, `reasoning.effort: "medium"`.
- Remix: `gpt-6-astra`, `reasoning.effort: "low"`, search/replace blocks
  against the game on screen, so a few hundred output tokens instead of a
  whole game. Override with `HTN_REMIX_MODEL` / `HTN_REMIX_EFFORT`. The
  bench is `pnpm harness bench-remix bench/remixes.txt`.
  This is CLI-only for now. The cabinet disables voice changes, ignores TALK
  during play/Ready/results, and only records after MAKE A GAME opens voice with the selected 1P/2P mode.
- Judge: `gpt-5.6-sol`, `reasoning.effort: "low"`, over the source and three
  screenshots. Historical bench only, never on the cabinet's path. Override with
  `HTN_JUDGE_MODEL` / `HTN_JUDGE_EFFORT`.
- Spec: `gpt-5.6-luna`, `reasoning.effort: "none"`, structured output. The
  same call decides whether words spoken over a running game are a remix
  of it or a new game. `players` (1 or 2) is never inferred from speech and
  nobody is asked: every cabinet request runs `pipelineBoth`, a 1P pipeline
  (the cabinet controls) and a 2P pipeline (the two badges) in parallel, each
  with its own spec, race, probe, run and library slot (`-2p` slug). Every
  event carries `players`. The kiosk opens READY as soon as the version the
  badges call for lands and shows the other when it arrives; up/down on READY
  switches. Spend per request is about double a single build.
- Genre is open-ended metadata, independent of player count. New specs include
  art direction; do not remap unsupported requests to dodge or impose line/sprite
  size ceilings. Examples are optional and must match genre and player count.
- Local implementation references: `library/reference/` supplies tested original maze
  and combat helpers, selected independently of exact genre names. Planner gets the
  contracts; build/repair get code and available pixel sprite data. See its README.
  `HTN_REFERENCE_CONTEXT=0` disables this layer for comparisons.
- STT: `/api/stt` sends the clip to the OpenAI transcription API by default
  (`HTN_STT_MODEL`, default `gpt-4o-mini-transcribe`). That is for real people
  at the cabinet.
  `HTN_STT=local` switches to local `faster-whisper` with `tiny.en`, English,
  CPU int8, over stdin to a resident Python worker: run `pnpm stt:setup` once.
  Model files and the Python venv are local and gitignored.
- Do not change a model or effort setting without a bench run. The bench is
  `pnpm harness bench`; results go in `bench/results/`. Why these models:
  `docs/bench-2026-09-19-openai-models.md`.

## Hard rules

1. **The build path is one streamed call per version.** Two versions run in
   parallel, never in sequence. No agent loops, no tool use, no
   "let the model run the game and iterate." That is what made the previous
   harness take 40 minutes. Repair is one bounded round, then the fallback
   library. Remix is the same shape: one call, one repair, then the game
   that was already on screen.
2. **A game that passes the probe is not yet a game.** The probe answers
   "does this run"; `docs/research/arcade-game-design.md` is what separates
   that from "is this worth playing", and the Design block at the top of the
   house rules is that research compressed. Validate changes with offline saved-game
   playtests and genre-specific review; a probe pass alone does not measure quality.
3. **The runtime API is the contract.** Games are written against it by a
   model that only sees the API reference and the templates in the prompt.
   If you change the API, change all three in the same commit: the runtime,
   the reference in the prompt, and every template in `library/templates/`.
   Then run the offline runtime and probe tests, and the bench.
4. **Latency is a test.** A change that moves p50 for the bench prompts by
   more than a few seconds needs a reason in the commit message.
5. **Games are single-file `game.js`** implementing `init`, `update`, `draw`
   against the runtime. No external assets, imports or network. Tested local
   catalog factories and pixel data may be bundled deterministically into that
   file; Astra emits customization against the supplied contracts. Reviewable
   files are authoritative and SQLite stores their index and generated candidates.
6. **The cabinet never dead-ends.** Generation failures preserve the current game and
   return to transcript review with the idea/player count intact and a sanitized
   reason. Retry is explicit; account-limit errors never loop automatically.
   Runtime crashes offer an
   explicitly labelled library fallback, waiting for START.
7. **Input is owned by the shell, not the game.** Keyboard, encoder and badge
   serial all become the same `{player, button, down}` events posted into the
   game iframe. Games never read keycodes.

## How to verify

- Runtime change: `pnpm exercise` (headless: every protocol message, the
  probe hook, crash guard, determinism), then `pnpm serve` and play
  `http://localhost:5173/packages/runtime/dev.html` with the keyboard, or
  `pnpm screenshots` for a screenshot of every state. Rebuild `runtime.js`
  with `pnpm runtime:build` first; it also syncs the built iframe/runtime assets
  into the running cabinet's public directory without a server restart. Built files are gitignored.
- Prompt or model change: use offline prompt/retrieval/stream tests and frozen runs.
  `pnpm playtest <game.js>` measures an existing saved game locally without model
  calls. Treat these bot metrics as genre-dependent diagnostics, not catalog admission.
  The historical A/B is `docs/bench-2026-09-19-game-design.md`.
  The bench commands (including `--fun` and its model judge):
  `pnpm harness bench bench/prompts.txt` and
  `pnpm harness bench bench/prompts-2p.txt --players 2` (goal 8 of 10).
  Remix: `pnpm harness bench-remix bench/remixes.txt` (goal p50 under half
  the build p50, most of the original kept).
- Probe change: run it on `library/` and confirm every library game still
  passes, then on `bench/known-bad/` and confirm every broken one still fails.
  `pnpm test:probe` covers input crashes and controls that work only after A.
- Design context: `pnpm test:scores` also checks card retrieval, prompt wiring,
  legacy specs, budget limits and reproducible run artifacts. The local context
  library lives in `docs/research/arcade-context/`; its shared core is read for
  each prompt, while cards and the manifest are cached for the module's lifetime.
  Reload that module after changing cards/manifest; do not interrupt the shared
  cabinet/badge process just to refresh core text. `HTN_DESIGN_CONTEXT=0` disables guidance for comparison.
  Model requests have full-response deadlines: spec 30 s, build/repair 300 s,
  remix 60 s. Deadline and cancellation regression tests run in the same suite.
- Badge change: `pnpm test:badge` first (the hub against an in-process fake
  badge that speaks the console protocol: push, hello, buttons, bye,
  unplug, the ring-overflow wedge). `pnpm badge fake` prints the same
  scenario. Then `pnpm badge watch` with a real badge plugged in prints
  every hub event (attach, install, hello, buttons). `pnpm badge push`
  forces a reinstall of `packages/badge/app`. Bump `version` in
  `manifest.cfg` and `APP_VERSION` in `protocol.ts` together; the hub
  reinstalls on mismatch. The badge's Lua sandbox has no `pcall`. Only one
  process can hold a port: stop any other `pnpm dev` or `badge watch` first.
- Leaderboard change: `pnpm test:scores`. `pnpm test` runs badge and harness
  tests; `pnpm test:probe` separately runs browser-based probe regressions
  after `pnpm runtime:build`.
- Cabinet change: `pnpm dev`, then the offline UI tests below. The one live
  check is `pnpm --filter @htn/probe exec node scripts/live-generation-ui-test.mjs`
  (server with `HTN_BADGES=off`): a real two-version build through the page,
  both versions switchable and playable; it costs about two game builds.
  `pnpm screenshots:cabinet` is stale against the current UI; historically it captured sixteen
  screenshots: the tier 1 loop with one real generation and the F8 crash
  injection, then the tier 2 pass with two fake badges: the 1P/2P menu,
  plug-in, a real two-player generation, a cable pull mid-game, the
  leaderboards and a remix. Or drive it by hand: arrows, Z, X, Enter (confirm/pause), hold
  Space or V to talk, Esc cancels or returns to menu, F1/F2 plug or unplug a
  fake badge, F3 shows the simulated panel, I J K L N M are player two, F8
  injects a crash, F9 ends the round.
  `pnpm --filter @htn/probe exec node scripts/home-ui-test.mjs` verifies all local
  demo previews, swipe/keyboard browsing, mode selection, pause/resume, reduced
  motion and screenshots with model/speech calls blocked.
  For the live build screen, `pnpm --filter @htn/probe exec node scripts/build-ui-test.mjs`
  drives controlled SSE chunks through the actual UI with no model calls. It
  covers live code, sprite pixels, isolated procedural previews, worker timeouts,
  racing candidates, repair output, menu-only voice creation, cancellation,
  reduced motion, no autoplay, and screenshots at 320×240, 640×480 and 1280×720.
  `pnpm --filter @htn/probe exec node scripts/player-flow-ui-test.mjs` checks the
  initial 1P/2P choice, microphone gating, chosen count in generation requests,
  cancellation, current-game resume and retained in-game controls.
  `pnpm --filter @htn/probe exec node scripts/panel-ui-test.mjs` drives the same
  loop only through the physical panel's encoder codes (numpad placeholders in
  `apps/cabinet/app/input.ts`: 8 2 4 6 stick, 1 3 7 9 for A B X Y; X is START,
  Y is TALK), presses the F3 simulated panel with the mouse, and checks the
  `?cabinet=1` keycaps. Fill `ENCODER_KEYS` from the real board on setup day.
  `pnpm --filter @htn/probe exec node scripts/input-routing-ui-test.mjs` (server
  started with `HTN_BADGES=off`) proves who plays: 1P on the cabinet controls
  with a badge only naming the score, 2P on the two fake badges with the panel
  ignored except START, menus from either, and the laptop keyboard stand-in.
  `docs/encoder-bringup.md` is the setup-day procedure for the real encoder.
  Two-version generation is covered offline by `pnpm test:scores`
  (`pipeline-history.test.ts`: both versions in isolated runs, tagged events,
  one version falling back) and by the UI tests' `/api/generate` stubs, which
  emit a tagged `ready` per version.
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

- CRT shell layout and physical controls: `docs/design-guide.md`.
