# Game-generation harness plan

Hack the North 2026. A person walks up to the cabinet, says a game into the mic,
and plays it on the stick and buttons. The next person does the same.

The whole design is driven by one number: **seconds from end-of-speech to
"press START"**. Everything below is chosen to make that number small first and
the game good second.

Target (to be measured, not assumed): **p50 under 60 s, p95 under 2 min**, with
the screen visibly doing something within 3 s of the person finishing speaking.

---

## 1. Why the takehome harness is the wrong shape here

`takehome-tpypan-game-studio` is a good reference but it optimises for the
opposite thing: it exists to produce *comparable* 3D games for a judge panel, so
it happily spends 40 minutes per game. Its own run logs:

| run | wall time | tool calls | GDScript lines |
|---|---|---|---|
| claude-sonnet-4.5 | 8.9 min | 68 | 1319 |
| claude-sonnet-4.5 | 9.1 min | 54 | 1301 |
| gemini-3.1-pro | 6.9 min | 21 | 555 |
| claude-opus-5 | 11.4 min | 9 | 930 |
| grok-4.6 | 23.4 min | 52 | 2018 |
| gpt-5.1-codex | 30.9 min | 21 | 612 |
| gpt-5.6-sol | 42.7 min | 28 | 867 |

Where the time goes, and what changes for the cabinet:

| takehome | cost | cabinet |
|---|---|---|
| Multi-turn agent loop (agent-runner): design turn, build turn, nudge turns, tool calls to read/write files and run `godot --import` | dominant. Every tool round trip is a full model call with growing context | **one streamed call** that emits the whole game. No file tools, no shell. |
| Godot 4 + GDScript | import cache build, headless import only catches parse errors, capture needs a real window, web export ~10 s, models are far less fluent in GDScript than JS | **browser canvas runtime**. Zero build step, loads instantly, headless Chromium verifies in seconds, models are extremely fluent. |
| Open-ended 3D brief with narrative, branching, endings | 900 to 2000 lines of output | **constrained 8-bit arcade contract**: 200 to 400 lines against a runtime we own. |
| Judge panel, VLM scoring, RL framing | minutes, and irrelevant here | a **pass/fail probe** (loads, no errors, moves, responds to input). No scoring. |

Godot is not a bad engine for this, it is just paying for capabilities we do not
need (3D, scene tree, physics, export pipeline) with the one currency we cannot
spare. If we later want Godot-quality 2D, the model-side contract stays the same
and only the runtime changes, but that is not the hackathon.

## 2. Engine decision: browser runtime, harness-owned "fantasy console" API

The model does not write a game from scratch. It writes **one JS file** against
a tiny API we ship (think PICO-8, but ours):

```
// The model implements exactly these three:
function init(api)          // called once
function update(api, dt)    // fixed 60 Hz
function draw(api)          // after each update

// api surface (all we give it, deliberately small):
api.W, api.H                // 256 x 224 logical pixels, integer-scaled to the monitor
api.btn(name)               // 'up' 'down' 'left' 'right' 'a' 'b' 'start' -- held
api.btnp(name)              // pressed this frame
api.cls(color)
api.rect(x,y,w,h,color), api.rectfill(...)
api.circ / api.circfill / api.line / api.pset
api.spr(sprite, x, y, flipX)      // sprite = array of strings, 1 char = 1 pixel, from a 16-colour palette
api.text(str, x, y, color)        // built-in 8x8 pixel font
api.sfx(kind)                     // 'jump' 'hit' 'coin' 'explode' 'select' 'die' -- chiptune, synthesised in Web Audio
api.rnd(n), api.clamp, api.dist   // small helpers
api.score(n), api.gameOver(), api.win()   // the runtime owns the HUD, game-over screen, and "press START"
```

Why this shape wins on latency:

- **Fewer output tokens.** The runtime owns the frame loop, input mapping, pixel
  scaling, audio synthesis, HUD, attract mode and game-over flow. The model only
  writes gameplay. 250 lines instead of 900.
- **Fewer failures, so fewer repair rounds.** The takehome's system prompt is a
  list of Godot-specific footguns discovered by running games (`.tscn`
  cross-references, missing InputMap, meshes without collision). A closed API
  has almost none of those. A game that calls only these functions has very few
  ways to be broken.
- **Controls are a contract, not a guess.** The USB encoder enumerates as a
  keyboard. The runtime maps its keycodes to `up/down/left/right/a/b/start` once.
  The model never sees a keycode. This removes the whole category of "movement
  keys do nothing" that the takehome spent a playability grader on.
- **Verification is headless and fast.** Playwright + headless Chromium runs
  canvas 2D fine. Load, tick 5 s, inject synthetic `btn` state through the same
  runtime seam, diff frames. Under 10 s, no GPU window, no offscreen positioning.
- **Sandboxing is free.** The game runs in a sandboxed `<iframe>`; a crash
  surfaces as `window.onerror` to the shell, which can show "regenerating" instead
  of a frozen cabinet.

Alternatives considered and rejected for the hackathon:

- **TIC-80 / PICO-8.** Thematically perfect, but PICO-8 is proprietary and both
  have Lua APIs the models know less well than canvas JS, plus harder headless
  verification. Our runtime is 300 lines and gives the same aesthetic.
- **Phaser / Kaboom.** Bigger API surface means more ways to be wrong and more
  tokens spent on boilerplate. Nothing they add matters at 256x224.
- **Godot 2D.** See section 1.

## 3. Latency budget

Where the seconds go once the person stops talking. Estimates marked *est.*
need to be measured with the bench in section 8 on day one.

| stage | est. | lever |
|---|---|---|
| speech to text | 1 to 2 s | push-to-talk button, stream audio, hosted STT |
| **spec** (gpt-5.6-luna, effort none): title, genre template, 3-5 mechanics, palette, win/lose | ~1 s | small structured output; result goes on screen immediately, so the person sees "BUILDING: *Frog Dodge*" before any code exists |
| **build** (streamed): game.js | dominant: output tokens ÷ tokens per second | see below |
| verify (headless probe) | 5 to 8 s | run in parallel with the tail of the stream where possible; hard cap |
| repair (only on failure) | one more build-sized call | bounded to 1 round, then fallback |
| load into the cabinet iframe | < 0.5 s | |

The build stage is the whole game. Its levers, in order of impact:

1. **Output size.** 250 to 400 lines ≈ 3k to 6k tokens. The spec step and the
   prompt's few-shot examples are how we hold the model at that size. A game that
   streams 12k tokens is a prompt failure, not a model failure.
2. **Tokens per second.** Tony's call, 2026-09-19: quality over the last
   ten seconds. Build call is **`gpt-5.6-sol` at `reasoning.effort: "low"`**:
   31 s end to end for a whole 345-line game in the bench, streaming at
   ~97 visible tokens per second. That is inside the 60 s target with room
   for a repair round. `gpt-6-astra` at low is the step up (40 s, 2.5x the
   price) and is the A/B in the day-one bench, on fun rather than on speed.
   gpt-5.4 was rejected on quality; the bench numbers are in
   `bench-2026-09-19-openai-models.md`.
3. **Effort.** `low` for the build. `none` is accepted on the 5.6 family
   and worth one bench run, but on Sol the reasoning tokens at `low` were
   already small (79), so the saving is a few seconds at most. Never
   `medium` or above on the build path: it doubled Sol's time to 50 s.
   The spec call uses **`gpt-5.6-luna` at `none`** (0.6 s to first token,
   20x cheaper). Repair and remix stay on Sol: they edit Sol's own code and
   quality is the point.
4. **Prompt caching.** The system prompt (runtime API reference + 2 or 3 complete
   example games + house rules) is 5k to 10k tokens and identical every time.
   One `cache_control` breakpoint at the end of it. Check
   `usage.cache_read_input_tokens` is non-zero on the second call or something
   is silently invalidating it.
5. **Race.** Fire 2 Sol seeds in parallel, take the first that passes the
   probe, cancel the other. This is the cheapest way to pull p95 toward p50
   now that the build model is the slower one. Cuts tail
   latency and halves the odds of a repair round. Costs tokens, which is fine
   for a demo.
6. **Perceived latency.** Stream the code onto the cabinet screen as it
   generates, in a green-on-black terminal font, with the spec title above it.
   Watching a game get written is part of the show. A 45 s build that the
   person watches happen feels shorter than a 30 s spinner.

Things that would blow the budget, so we do not do them: agentic tool loops,
letting the model run its own verification, multi-file output, asking for
narrative or branching, any judge that produces a score.

## 4. Pipeline

```
 mic ──► STT ──► spec (luna) ──► build (streamed) ──► probe ──► cabinet plays
                     │                 │                 │
                     │ shown on        │ streamed to     │ fail: 1 repair round
                     │ screen at ~2s   │ screen live     │ fail again: fallback game
                     ▼                 ▼                 ▼
                              run store: every stage's timing + artifacts
```

**STT.** Push-to-talk on a dedicated cabinet button. **`gpt-live-transcribe`**
from the kiosk page over WebRTC with a short-lived token minted by a server
route (the OpenAI realtime docs name WebRTC as the browser path; the Node
WebSocket path is the fallback if kiosk mic capture is awkward). It streams transcript deltas while
the person is still talking, which does two things: the transcript is final
the instant they release the button, and their words appear on the screen as
they speak, which is part of the arcade show. Turn detection stays off; the
button release commits the turn. `gpt-transcribe` ($0.0045/min vs $0.017/min)
is the fallback if the live model misbehaves on a noisy floor; it costs about
one extra second after release.

**Spec.** One small structured-output call. The output is what the build prompt
consumes and what the screen shows:

```json
{ "title": "FROG DODGE", "genre": "dodge", "one_liner": "...",
  "mechanics": ["player moves left/right at bottom", "cars fall", "speed ramps every 10 s"],
  "controls": { "left": "move left", "right": "move right", "a": "jump" },
  "palette": "gameboy",
  "lose": "hit by a car", "score": "seconds survived" }
```

The genre field selects a **template** in the build prompt: dodge, shooter,
platformer, snake, breakout, runner, pong, maze. Each template is a complete
working example game in the prompt (this is the few-shot). The model adapts the
nearest template rather than inventing structure, which is why output stays small
and why it rarely breaks. Anything off-template falls back to the nearest one and
the spec says so.

**Build.** One streamed call, system prompt cached, user turn = spec JSON + the
original transcript. Output is a single fenced JS block. Strip the fence, done.
No tools.

**Probe.** Playwright, headless Chromium, the same runtime the cabinet uses
with a test hook. Pass/fail on:

| check | how | what it catches |
|---|---|---|
| loads | `init` runs without throwing within 1 s | syntax errors, undefined API calls |
| survives | 300 ticks of `update`/`draw` with no exception | runtime errors in the loop |
| draws | frame at t=1 s is not a uniform fill | empty games |
| moves on its own | frame diff over the idle phase | static screens |
| responds to input | frame diff with `left` held vs idle, then `a` pressed | dead controls (the takehome's idle-vs-driven measurement, ported) |
| does not end instantly | `gameOver` not called in the first 2 s with no input | spawns the player into a wall |

Each failure maps to a one-line observation, phrased as evidence (the takehome's
`GATE_FEEDBACK` idea): "TypeError at line 41: api.sprite is not a function" or
"holding LEFT for 2 s changed nothing on screen". That plus the original code is
the entire repair prompt.

**Repair.** One round, Sol again, cached prefix, the failing code and the
observation. If it fails again, do not loop. Load the closest game from the
fallback library and say so on screen ("couldn't build that one, here's
FROG DODGE from earlier"). The cabinet never dead-ends.

**Fallback library.** Every game that passes the probe is saved. Before the
event, generate 20 to 30 across the genre templates so day one has a bench and a
library. During the event, similar requests can also be answered by **remix**:
if the spec's genre and mechanics closely match a library entry, hand the model
that game and ask for the diff-sized changes. Much smaller output. Worth doing
only if the bench shows from-scratch p50 is not good enough.

## 5. Cabinet shell

One fullscreen Chromium (`--kiosk`) page on the Mac mini, a state machine:

```
ATTRACT ──(hold TALK)──► LISTENING ──(release)──► BUILDING ──► PLAYING ──► GAME OVER ──► ATTRACT
                                                     │                        │
                                                     └── fail ──► FALLBACK ───┘
```

- ATTRACT: cycles through library games playing themselves (the runtime can run
  a game with scripted input) with "HOLD THE MIC BUTTON AND SAY A GAME".
- BUILDING: spec title, streaming code, a progress bar keyed to expected tokens.
- PLAYING: the game in a sandboxed iframe; `start` on the game-over screen
  restarts, holding TALK from anywhere goes back to LISTENING for the next person.

Input mapping lives in exactly one file. First task on cabinet setup day is
plugging in the encoder and reading its keycodes.

## 6. Repo layout

TypeScript throughout, pnpm workspace. The harness must run and be benchmarked
from a terminal with no cabinet, no mic, and no browser window, because that is
how we will iterate on the prompt for 30 hours.

```
htn-2026/
  packages/
    runtime/        the fantasy-console API. Plain TS -> one runtime.js. No deps.
                    Also exports the test hook the probe uses.
    harness/        spec -> build -> probe -> repair. Anthropic SDK. CLI entry:
                      pnpm harness gen "a game where you are a frog dodging cars"
                      pnpm harness bench prompts.txt   # p50/p95, pass rate, tokens/s
                    runs/ holds every attempt: transcript, spec, code, probe
                    result, per-stage timings. This is the takehome's run_store,
                    reduced.
    probe/          Playwright verifier. Called by harness, runnable alone.
  apps/
    cabinet/        Next.js (App Router): the kiosk page, an API route that
                    streams build progress over SSE, STT endpoint. Serves
                    runtime.js and the library.
  library/          passing games, one folder each: spec.json, game.js, thumb.png
  docs/
```

## 7. What to take from the takehome repo

Take the ideas, not the code. The code is Python against agent-runner and Godot,
none of which survives.

| keep | as |
|---|---|
| "constraints in the prompt come from observed failures, never from theory" | the way we write the build prompt: run the bench, read the failures, add a rule |
| probe's idle-vs-driven motion measurement | the `responds to input` check |
| feedback phrased as observations, never thresholds (`repair.py`) | the repair prompt |
| run store with per-run events and timings | `packages/harness/runs/`, in TS |
| "an empty response ends the loop and reads as success" (the nudge logic) | probe check `loads` + `draws`, so an empty game is a failure not a pass |
| one brief in version control so runs are comparable (`briefs.py`) | `bench/prompts.txt` |

Drop: agent-runner, Godot, the judge panel, VLM scoring, pairwise tournaments,
static analysis, z-scores, the Next.js dashboard.

## 8. Build order

Ordered so the latency number exists as early as possible and everything after
it is measured against it.

1. **Runtime** (`packages/runtime`). Hand-write one game against it (a dodge
   game) to shake out the API. Half a day.
2. **Harness `gen`**: spec + build, no probe, prints the code and the timings.
   Now we have a latency number. Two hours.
3. **Bench**: 20 prompts, run both model candidates, record p50/p95/pass. Pick
   the model and effort. This is the most important afternoon of the project.
4. **Probe** + repair + fallback. Now failures stop being demo-enders.
5. **Cabinet shell**: kiosk page, SSE streaming from the harness, iframe player,
   state machine. Keyboard input first (arrow keys + Z/X), encoder mapping when
   the hardware is on the table.
6. **STT** + push-to-talk button.
7. **Attract mode**, streaming-code visual, library pre-generation, remix if
   the bench says we need it.

Steps 1 to 4 are terminal-only and can be built before the cabinet exists.

## 9. Decisions

Settled 2026-09-19:

- **Provider: OpenAI.** Key lives in `.env` (gitignored), template in
  `.env.example`. Verified against `/v1/models`.
- **Build model: `gpt-5.6-sol`, effort `low`**, also for repair and remix.
  Spec: `gpt-5.6-luna`, effort `none`. Bench in `bench-2026-09-19-openai-models.md`.
  The day-one bench A/Bs Sol against `gpt-6-astra` on the real prompt, judged
  by playing the games, not by the clock.
- **Badges.** Wired USB-C serial is the only identity path and the only
  badge controller path: plugging in is tapping in, in both modes. No QR
  scanner (dropped 2026-09-19, one identity path is enough), no NFC reader
  because the badge is itself the reader. Full analysis and the day-one
  verification list in `badge-integration.md`.
- **Player count is a menu, not an inference.** The attract screen asks 1P
  or 2P before LISTENING. The cabinet writes `players` into the spec
  request and the spec model does not get to change it. 1P plays on the
  cabinet stick; 2P plays on two plugged-in badges. Adds nothing to the
  latency budget because it happens before speech.
- **STT: `gpt-live-transcribe`**, streamed, push-to-talk commits the turn.
- **Display: 256x224, 16-colour fixed palette**, integer-scaled. Every game
  looks like it belongs to the same cabinet.
- **Steering: v1 is one utterance, one game.** Holding TALK while a game is
  running is a *remix* of that game ("make it faster", "add a boss"): the
  current code goes in the prompt and the model returns the changed file.
  Same pipeline, smaller output, so it is cheap to add once one-shot works.
  It is step 7 in the build order, not before.

Still to settle before the cabinet build, none of them blocking the harness:

- **Encoder keycodes.** One stick and four buttons on the cabinet; the exact
  keycodes the encoder emits are read on setup day. The runtime API takes a
  player index on every input call so badges plug in as players 1 and 2.
- **Prompt moderation.** A public floor means someone will say something
  offensive or off-topic. The spec step gets a short rule: anything unsafe or
  not a game becomes the nearest safe arcade game, and the screen says what it
  heard. Cheap to add, embarrassing to skip.
- **Idle and hand-off rules.** Return to attract mode after 60 s without input
  on the game-over screen; cap a session at a few minutes so the line moves.
- **Audio unlock.** Web Audio needs a user gesture. The START press on the
  attract screen is that gesture; the runtime must not try to play before it.
- **Take it home.** Parked until the core product works.
