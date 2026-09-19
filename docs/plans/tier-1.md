# Tier 1 implementation plan

Goal doc: `docs/goals/tier-1.md`. Design and latency reasoning:
`docs/harness-plan.md`. This document is the build order, the interfaces
between the pieces, and what "done" means for each milestone, so three
people can work in parallel without stepping on each other.

Estimates are for one focused person per track and are there for ordering,
not for promising.

## 0. Tracks

| track | owns | blocked by |
|---|---|---|
| **A: runtime + cabinet page** | `packages/runtime`, `apps/cabinet` UI | nothing; starts with a hand-written game |
| **B: harness + bench + probe** | `packages/harness`, `packages/probe`, `bench/`, `library/` | the runtime API being frozen (M1), which is a half-day |
| **C: STT + hardware + kiosk** | STT route and client, encoder mapping, launch script, mic | the cabinet page shell existing (M5 skeleton) |

Track A freezes the runtime API by the end of M1 and publishes it as a
markdown reference. From then on B writes prompts against that reference
and A cannot change the API without B's templates changing in the same
commit (rule 2 in `AGENTS.md`).

## 1. Milestones

```
M0 scaffold ─┬─ M1 runtime ──── M5 cabinet page ──┬─ M7 kiosk + encoder ── M8 dry run
             │                                     │
             ├─ M2 gen ── M3 bench ── M4 probe+repair+race+library
             │
             └─ M6 STT ───────────────────────────┘
```

### M0. Scaffold (1 h)

pnpm workspace, TypeScript, Biome, `.env` loading, one shared `tsconfig`.

```
package.json            workspaces: packages/*, apps/*
pnpm-workspace.yaml
biome.json
tsconfig.base.json
packages/runtime/       package.json, src/, dev.html
packages/harness/       package.json, src/, bin
packages/probe/         package.json, src/
apps/cabinet/           create-next-app, App Router, Tailwind
bench/prompts.txt       20 prompts (below)
library/templates/      the example games that ride in the prompt
library/games/          passing generated games
docs/
```

Done: `pnpm install`, `pnpm lint`, `pnpm -r build` all pass on an empty
workspace.

### M1. Runtime (4 h, track A)

A single `runtime.js` with no dependencies that turns a `game.js` into a
running game. The API below is the contract. Freeze it at the end of this
milestone and write `packages/runtime/API.md`, which is pasted verbatim into
the build prompt.

**Game contract.** `game.js` defines three globals:

```js
function init(api) {}           // once, after load and after every restart
function update(api, dt) {}     // fixed 60 Hz; dt is always 1/60
function draw(api) {}           // after each update
```

**API.** Everything the game can touch is on `api`:

```
Screen      api.W = 256, api.H = 224. Colours are palette indices 0..15.
Input       api.btn(name)    held      name ∈ up down left right a b start
            api.btnp(name)   pressed this frame
            (second arg is a player index, default 0; tier 1 games ignore it)
Drawing     api.cls(c)  api.pset(x,y,c)  api.line(x0,y0,x1,y1,c)
            api.rect(x,y,w,h,c)  api.rectfill(x,y,w,h,c)
            api.circ(x,y,r,c)    api.circfill(x,y,r,c)
            api.spr(sprite, x, y, flipX?, flipY?)
              sprite = array of equal-length strings, one char per pixel,
              '0'..'f' = palette index, '.' = transparent. Cached by identity.
            api.text(str, x, y, c)     built-in 8x8 pixel font, uppercase
            api.textCenter(str, y, c)
Sound       api.sfx(name)   name ∈ jump hit coin explode select die powerup shoot
            api.tone(freq, ms, wave?)   wave ∈ square triangle saw noise
Game flow   api.score(n) sets, api.addScore(n) adds. Runtime draws the HUD.
            api.gameOver()   runtime shows GAME OVER + score, waits for START,
                             then calls init() again
            api.win()        same with YOU WIN
Helpers     api.rnd(n)  api.rndi(a,b)  api.clamp(v,lo,hi)  api.dist(x0,y0,x1,y1)
            api.t   seconds since init      api.frame   frames since init
            api.collide(ax,ay,aw,ah,bx,by,bw,bh)   AABB
```

**Runtime responsibilities.** Fixed-step loop with an accumulator; integer
scaling of the 256x224 canvas to the window with `image-rendering: pixelated`
and black bars; the 16-colour palette (a fixed one, pick a well-known
16-colour arcade palette and never change it); sprite cache; the pixel font;
Web Audio synth for the eight named sfx and `tone`; HUD (score top-left,
HI top-right); the START-to-begin, GAME OVER and YOU WIN overlays; a crash
guard (`try/catch` around `init`, `update`, `draw` that posts the error to
the parent and freezes the frame instead of throwing); an `api.rnd` seeded
from a value the shell passes in, so the probe is reproducible.

**Shell protocol.** The runtime never listens to the keyboard. The parent
page posts messages into the iframe and the runtime posts back:

```
parent -> runtime   {type:'input', player, button, down}
                    {type:'load', code, seed}         // game.js source
                    {type:'start'} {type:'reset'}
                    {type:'inject', frames:[{player,button,down,at}]}  // scripted input
runtime -> parent   {type:'ready'} {type:'state', state:'title'|'playing'|'gameover'|'win', score}
                    {type:'error', message, stack}
                    {type:'frame', hash}              // only when probing
```

Attract mode and the probe both use `inject`.

**Test hook.** When loaded with `?probe=1` the runtime exposes
`window.__probe = { step(n), frameHash(), state(), inject(frames) }` so the
probe can drive it deterministically without real time passing.

**Reference game.** Hand-write `library/templates/dodge.js` against the API
while building it. It is the first template and the first thing the probe
runs. Play it in `packages/runtime/dev.html` with the keyboard.

Done: the reference game is fun to play for a minute, `API.md` exists and
matches the code, every message in the protocol has been exercised from
`dev.html`, and a screenshot of the game is in the PR.

### M2. `gen`: transcript to game.js (3 h, track B)

`packages/harness/src/`:

- `spec.ts`: `gpt-5.6-luna`, effort `none`, structured output to:

  ```ts
  type GameSpec = {
    title: string            // ≤ 14 chars, uppercase, shown on screen
    oneLiner: string
    genre: 'dodge'|'shooter'|'platformer'|'snake'|'breakout'|'runner'|'pong'|'flappy'
    mechanics: string[]      // 3 to 5 short lines
    controls: { up?, down?, left?, right?, a?, b? : string }
    palette: 'arcade'|'gameboy'|'nes'|'cga'  // a hint for colour choice, not a different palette
    lose: string
    scoring: string
    players: 1                // fixed in tier 1
  }
  ```

  The prompt also carries the moderation rule: anything unsafe, hateful or
  not a game becomes the nearest safe arcade game and the title says so.

- `build.ts`: `gpt-5.6-sol`, effort `low`, streamed. Request shape:

  ```
  system:  API.md verbatim
           + house rules (single file, three globals, no assets, no DOM, no
             timers, no async, ~250 lines, a way to lose within 30 s of play,
             score visible, juice: sfx on every event, screen flash on hit)
           + two complete templates that are NOT the chosen genre
  user:    the spec as JSON
           + the original transcript
           + the template for the chosen genre, in full, with "adapt this"
  ```

  The system prefix is identical across calls so OpenAI's prompt cache
  applies; only the user turn changes. Output is one fenced JS block. The
  function yields text deltas as they arrive and returns the stripped code.

- `run-store.ts`: `runs/<timestamp>-<slug>/` with `transcript.txt`,
  `spec.json`, `game.js`, `events.jsonl` (every stage with a timestamp and
  token counts), later `probe.json` and `timings.json`.

- CLI `pnpm harness gen "<transcript>"`: prints the spec, streams the code to
  the terminal, writes the run, prints the timings line:
  `spec 0.9s  build 29.4s (2811 tok)  total 30.3s`.

- `pnpm harness play runs/<id>`: opens the game in the default browser via
  `packages/runtime/dev.html?run=...` so a human can play it.

Done: five different transcripts produce five different playable `game.js`
files, played by a human, with timings recorded.

### M3. Bench and prompt tuning (4 h, track B, the important afternoon)

- `bench/prompts.txt`: 20 transcripts written the way people actually talk,
  covering every genre at least twice, a few vague ones ("something with
  cats"), a few over-ambitious ones ("an open world RPG"), one inappropriate
  one for the moderation rule.
- `pnpm harness bench bench/prompts.txt [--model ...] [--effort ...] [--n 2]`
  runs them concurrently with a cap of 4 in flight, writes
  `bench/results/<date>-<label>.md` with per-prompt timings and a header of
  p50, p95, tokens, and (after M4) probe pass rate.
- Runs to do, in order: Sol low (baseline), Sol none, Astra low. Then read
  every failure and every ugly game, add the rule that would have prevented
  it to the house rules, re-run Sol low. Two or three of these loops.

This is where the templates earn their keep. Write the remaining templates
(`shooter`, `platformer`, `snake`, `breakout`, `runner`, `pong`, `flappy`)
against the API, each ~200 lines, each played by a human first. A model
adapting a known-good template is the single biggest lever on both pass rate
and output size.

Done: a results file for each run, the chosen effort written into
`AGENTS.md`, p50 under 60 s on Sol with the final prompt, and a decision
recorded on whether Astra earns its extra ten seconds.

### M4. Probe, repair, race, library (4 h, track B)

`packages/probe/src/probe.ts`: Playwright, headless Chromium, one page with
`runtime.js?probe=1`. Steps:

| check | how | observation on failure |
|---|---|---|
| loads | `load` then `init` with no `error` message within 1 s | the error and stack, verbatim |
| survives | `step(300)` with no error | same |
| draws | `frameHash()` at frame 60 ≠ hash of a blank frame | "the screen was blank after one second" |
| moves | hashes at frames 60, 120, 180 not all equal, with no input | "nothing on screen changed over three seconds with no input" |
| responds | hold `left` for 60 frames; hash differs from the same frames without input | "holding LEFT for one second changed nothing on screen" |
| responds to A | tap `a`; same | "pressing A changed nothing" |
| not instant death | state is still `playing` after 120 frames of no input | "the game ended by itself within two seconds" |

Total under 8 s. Returns `{ ok, observations: string[], thumb: PNG }`.

`repair.ts`: Sol low, the game source plus the observations as a list, ask
for the corrected full file. One round. Then `pipeline.ts`:

```
spec -> race: build ×2 (different seeds) -> first to pass probe wins,
        cancel the other -> if both fail: repair the one with fewer
        observations -> probe -> if that fails: library fallback
```

Fallback picks the library game whose spec genre matches, else random. The
pipeline emits typed events the cabinet will stream:
`spec`, `token`, `probe`, `repair`, `fallback`, `ready`, each with timings.

`library/games/`: every passing game is copied in as
`<slug>/{spec.json, game.js, thumb.png}`. `pnpm harness seed` runs the bench
prompts with `--n 2` and keeps everything that passes, which is how the 20
to 30 library games get made.

Done: probe passes every template and every library game; a hand-broken
copy of each template (syntax error, no draw, ignores input, dies at frame
0) fails with the right observation; `bench` reports pass rate; the
library has 20+ games.

### M5. Cabinet page (5 h, track A)

`apps/cabinet`, one route, one client component that is a state machine:

```
ATTRACT   library game playing itself via inject, title overlay,
          "HOLD TALK AND SAY A GAME"
LISTENING on TALK down: mic level meter, transcript appearing live
BUILDING  on TALK up: title card from the spec within ~2 s, then the code
          streaming in a terminal font, progress bar keyed to expected
          tokens (~2800), status line: BUILDING → CHECKING → REPAIRING
PLAYING   the game iframe, full screen, input forwarded
GAMEOVER  runtime overlay; START restarts; TALK goes to LISTENING;
          60 s idle returns to ATTRACT
FALLBACK  one line ("COULDN'T BUILD THAT ONE, HERE'S <TITLE>") then PLAYING
```

- `app/api/generate/route.ts`: POST the transcript, respond with SSE of the
  pipeline events. The pipeline runs in-process (Playwright included), so
  run the cabinet with `next start` on the Mac, not on Vercel.
- Input: one `input.ts` module maps `keydown`/`keyup` to
  `{player:0, button, down}` and posts into the iframe. Dev mapping: arrows,
  Z=a, X=b, Enter=start, Space=TALK (hold). The encoder mapping is one more
  table in the same file, filled in at M7.
- The game iframe is `sandbox="allow-scripts"` and loads the runtime and the
  code via `load`; nothing in the game can reach the page.
- Styling: black, one pixel font, CRT-ish scanline overlay if it costs
  nothing. Everything readable from two metres.

Done: the whole loop works with the keyboard and the harness, a screenshot
of each state is in the PR, and a crash injected into a game (throw in
`update`) shows the fallback path instead of a frozen screen.

### M6. STT (3 h, track C)

- `app/api/stt-token/route.ts`: mints a short-lived realtime token for the
  kiosk page. Verify the current shape in the OpenAI realtime transcription
  docs at build time; the guide names WebRTC as the browser path.
- Client: on TALK down, `getUserMedia`, open the realtime transcription
  session with `gpt-live-transcribe`, show deltas as they arrive. On TALK
  up, commit the turn, take the final transcript, close the session, POST to
  `/api/generate`.
- Kiosk Chromium is launched with the flag that auto-accepts the mic
  permission so nobody has to click a dialog on a machine with no mouse.
- Fallback path behind a flag: record the clip, POST it to `gpt-transcribe`
  on release. Keep both; decide on the floor.

Done: ten sentences spoken at normal volume in a noisy room come back
readable, with words on screen while speaking, and the transcript lands in
the pipeline within a second of releasing TALK.

### M7. Kiosk and encoder (3 h, track C)

- Plug in the encoder, read its keycodes with a five-line page, fill the
  mapping table. Decide which physical button is TALK.
- `scripts/kiosk.sh`: builds, starts `next start`, launches Chromium
  `--kiosk --autoplay-policy=no-user-gesture-required` plus the mic flag,
  pointed at the cabinet page. Sleep and screensaver off on the Mac.
- Audio out through the cabinet speakers; unlock Web Audio on the first
  START press in attract mode.
- Two-hour soak with a looping script that hits generate every three
  minutes; watch memory and the log.

Done: from a cold boot of the Mac mini, one command gets to attract mode.

### M8. Dry run (2 h, everyone)

- `pnpm harness seed` for the library.
- Ten people who have not seen it ask for a game each, on the real
  hardware. Record every latency, every failure, and every "I'd play that
  again". This is the tier 1 acceptance test in `docs/goals/tier-1.md`.
- Fix what broke. Re-run the bench. Tag `tier-1`.

## 2. Bench prompts, first draft

```
a game where I'm a frog dodging cars that get faster
space invaders but the aliens are pizzas
a snake game but the snake is a train
breakout with a really big ball
flappy bird but you're a submarine and the pipes are jellyfish
a platformer where you collect coins and avoid spikes
pong against the computer and it gets faster every point
an endless runner where you're a cat jumping over dogs
something with cats
a game about avoiding my exams
dodge the falling anvils and catch the pies
asteroids
a shooter where you defend a castle from dragons
a maze where a ghost chases you
a game where you are a taco and you have to catch salsa
something really hard
a relaxing game
a two-player fighting game            (tier 1 should turn this into one player and say so)
an open world RPG with crafting       (should scope it down to one arcade loop)
<one inappropriate prompt for the moderation rule>
```

## 3. Interfaces summary

| from | to | shape |
|---|---|---|
| kiosk page | `/api/generate` | `POST {transcript}` → SSE `spec|token|probe|repair|fallback|ready` |
| pipeline | run store | `runs/<id>/…` |
| pipeline | library | `library/games/<slug>/…` on pass |
| kiosk page | runtime iframe | `postMessage` protocol in M1 |
| probe | runtime | `window.__probe` in M1 |
| harness | OpenAI | Responses API, streamed, `reasoning.effort` per call |

## 4. What we are deliberately not building in tier 1

Anything in the badge doc, remix, a `players` field that does anything,
game quality scoring, an admin dashboard, deploys anywhere but the Mac mini,
tests beyond the probe and the bench.
