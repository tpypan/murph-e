# Tier 2 implementation plan

Goal doc: `docs/goals/tier-2.md`. Badge research and the wired design:
`docs/badge-integration.md`. Tier 1, which this builds on:
`docs/plans/tier-1.md`. This is the build order, the interfaces between the
pieces, what "done" means for each milestone, and which parts cannot be
verified without a badge in hand.

Written 2026-09-19 on the `tier-2` worktree. Everything here that does not
need a physical badge is built against a fake badge that speaks the real
serial protocol, so the whole two-player flow runs on a laptop with no
hardware. The hardware checklist at the end is what is left.

## 0. What exists already

- The runtime takes a player index on every input call and keeps button
  state for four players. Games written so far ignore it.
- `packages/badge` (landed here from the main checkout's in-progress work):
  hot-plug over `serialport`, the IDE's push protocol with paced 128-byte
  chunks, `manifest.cfg` version check, `uitree` identity shortcut, and a
  `BadgeHub` that emits `attached / installing / installed / waiting /
  hello / button / bye / detached / error`. The Lua app logs
  `ARCADE HELLO`, `ARCADE MAP`, `B <code> <1|0>` and `ARCADE BYE`. All of it
  was verified on one and two real badges (`docs/badge-integration.md` §6).
- `apps/cabinet/app/api/badges/route.ts` streams hub events over SSE and
  `app/badges.ts` turns them into the shell's `{player, button, down}`
  events. Every badge drives player 0 until the 1P/2P menu exists.

## 1. Tracks and order

```
M0 fake badge ── M1 two players (runtime, spec, templates, probe, bench)
                      │
                      ├── M2 leaderboard ── M3 cabinet: menu, identity, 2P flow
                      │                          │
                      └── M4 remix ──────────────┴── M5 walkthrough ── M6 docs
```

M1 is the long pole because it changes the runtime API (hard rule 2: the
runtime, `API.md` and every template move in one commit, then the bench
runs). M2 and M4 are independent of each other and of M3.

## 2. Milestones

### M0. Fake badge and a testable hub (2 h)

The hub currently opens `serialport` directly. Put a seam under it so the
same hub code runs against a virtual badge:

```
packages/badge/src/
  wire.ts        Wire: { write(buf), onData(fn), onClose(fn), close() }
                 SerialWire wraps SerialPort. Transport: { list(), open(path) }
                 SerialTransport lists Espressif ports; FakeTransport lists
                 fake badges.
  fake.ts        FakeBadge: a scripted badge console. Answers `badge> `,
                 `cat …/manifest.cfg`, `mkdir`, `put` (READY, then OK <n>
                 after the bytes arrive, and it counts the chunks so an
                 unpaced write is detectable), `reload`, `uitree`, `apps`.
                 plug / unplug / open (logs HELLO + MAP) / press / exit (BYE).
  hub.ts         takes `transports: Transport[]`; default is serial + fake.
  link.ts        unchanged logic, built on a Wire instead of a SerialPort.
```

- `POST /api/badges/fake` `{op: 'plug'|'unplug'|'open'|'exit'|'press', …}`
  drives the fake transport inside the cabinet server. It exists in every
  build; it is a dev tool, not a security boundary, and the cabinet is on a
  LAN-less Mac.
- Cabinet dev keys: F1 and F2 plug and open fake badge 1 and 2 (press
  again to unplug). I J K L, N, M drive player 2 from the keyboard as plain
  shell input, for playing a 2P game alone.
- `pnpm badge fake` runs the hub against two fake badges through a whole
  scenario and prints the events. `pnpm test:badge` asserts the sequence
  (node's test runner, `packages/badge/test/`).

Done: `pnpm test:badge` passes: protocol parsing, push chunking, hello,
buttons per slot, bye, detach, and a never-seen badge getting the app
pushed before its hello. `pnpm badge watch` still works with a real badge
(hardware checklist item H1).

### M1. Two players (5 h)

**Runtime.** `load` gains `players` (1 or 2). New on `api`:

```
api.players                     1 or 2, fixed for the game
api.btn(name, p) api.btnp(name, p)   p is 0 or 1; default 0
api.addScore(n, p) api.score(n, p) api.getScore(p)
                                in a 2P game, omitting p applies to both
                                players (a shared co-op score)
api.win(p)                      in 2P: "PLAYER 1 WINS" / "PLAYER 2 WINS";
                                without p: YOU WIN, as before
api.gameOver()                  unchanged; the end screen shows both scores
api.P1 = 12, api.P2 = 8         the player colours (blue, red), so every
                                2P game reads the same way
```

The HUD in 2P shows `P1 <score>` on the left in blue and `P2 <score>` on
the right in red, no HI. The `state` message gains `scores: [a, b]` and
`winner: 0 | 1 | null`. `Input` already holds four players.

**API.md** gets a "Two players" section. It is pasted into every build
prompt, so it is also where the model learns the rules above.

**Spec.** `players` is set by the caller, never by the model.
`specify(transcript, { players })`. In 2P the genre list is `versus` and
`coop` and the instructions say: two players on one screen in a shared
arena, same controls for both, say which player is which colour, versus
means one wins, co-op means a shared score and a shared loss. A 2P request
in 1P mode still becomes one player (unchanged rule).

**Templates.** `library/templates/versus.js` (LASER DUEL: top-down arena,
d-pad moves, A shoots, B dashes, three hits each, `api.win(p)`, a point per
hit) and `coop.js` (SWARM: two players back to back, enemies from every
edge, A shoots, shared score, shared lives, `gameOver` when the lives run
out). Both around 180 lines, both played by a human with the P2 keys.

**Build prompt.** A second system prefix for 2P (`prompt_cache_key`
`htn-build-2p-v1`): API, house rules, a 2P addendum (both players must be
able to act from frame one; the end screen must be reachable by either
player; never let one player's input move the other; `api.P1` / `api.P2`
for the sprites), and both 2P templates as the examples. The user turn
carries the chosen template as in 1P.

**Probe.** `probe(code, { players })`. For 2P it adds `responds:p2` (hold
a direction as player 1 and the frame changes) as a hard check and
`soft:responds:p2:a`. The thumbnail script moves both players.

**Bench.** `--players 2` on `gen`, `run`, `bench`, `seed`.
`bench/prompts-2p.txt` has 10 prompts: five versus, five co-op, two vague.

Done: `pnpm exercise` passes with the new checks (2P scores, `win(p)`,
per-player input); every template including the two new ones passes the
probe; `pnpm harness bench bench/prompts-2p.txt --players 2` passes at
least 8 of 10; `pnpm harness bench bench/prompts.txt` (1P) p50 and pass
rate within a few seconds and a couple of games of the 2026-09-19 result,
because the API reference in the prompt grew.

### M2. Leaderboard (2 h)

```
packages/harness/src/scores.ts
  ScoreEntry { id, badgeId: string | null, name, score, players,
               game: { slug, title }, at }
  addScore(entry) -> appends to data/scores.json (gitignored, survives
                     restarts, written atomically)
  topScores({ game?, limit = 10 }) -> best score per (badge or guest, game),
                     highest first; guests are kept, shown as GUEST
apps/cabinet/app/api/scores/route.ts
  GET ?game=<slug>  -> { overall: ScoreEntry[], game: ScoreEntry[] }
  POST ScoreEntry   -> { ok }
```

The cabinet posts one entry per player when the runtime reports `gameover`
or `win` from PLAYING: the badge in that player's slot names it, else
GUEST. The `ready` event now carries `slug` (the library slug when the game
was kept, else the run id) so entries key to a game. Attract mode shows the
overall top ten in a panel; the game-over overlay shows the per-game top
ten next to the runtime's own GAME OVER card.

Done: `pnpm test:scores` (node test on the store: dedupe by badge and game,
guest rows kept, ordering, atomic write survives a partial file); the
walkthrough screenshot shows both boards; a restart of `next dev` keeps
the entries.

### M3. Cabinet: mode menu, identity, two-player flow (4 h)

State additions:

```
mode: 1 | 2                       chosen on the attract screen with the stick
                                  (up/down) and A; shown on the title card
session: {
  players: [{ badgeId, name, color, detached } | null, null]
}
```

- **Attract.** "1 PLAYER / 2 PLAYERS" selector above the TALK prompt. A
  confirms, TALK works at any time in the current mode. Under it: "PLUG IN
  YOUR BADGE TO SAVE YOUR SCORE" in 1P; "PLUG IN BOTH BADGES" in 2P, with
  the two slots drawn as empty boxes that fill with the names as the hellos
  arrive. The roster is shown in every phase, so plugging in during the
  build works.
- **Identity.** A hub `hello` fills the slot the hub assigned. In 1P every
  badge is player 0 (the first one wins the name; extra badges are ignored
  for scores). A `detached` or `bye` mid-game marks the slot detached but
  keeps the identity until the game ends, so the score still gets the name
  (goal: pulling a cable never loses a score). The roster clears when the
  cabinet returns to ATTRACT.
- **2P input.** Badge slot n drives player n. The cabinet stick and
  keyboard stay wired to player 0 so the "play it 1P" fallback and dev
  play both work.
- **Ready in 2P.** If both slots have said hello, PRESS START as usual.
  Otherwise a banner: "WAITING FOR PLAYER 2 … OR PRESS START TO PLAY 1P
  ON THE STICK". START from any source begins the game regardless; the
  runtime already accepts START from any player.
- **Generate.** `POST /api/generate { transcript, players }`.

Done: `pnpm screenshots:cabinet` (extended in M5) drives the whole 2P flow
with fake badges; unplugging a fake badge mid-game (via the API) leaves the
game running and the game-over entry named.

### M4. Remix (3 h)

Holding TALK while a game is on screen (PLAYING or GAMEOVER) opens
LISTENING with the hint "SAY A CHANGE, OR A NEW GAME". On release the
cabinet posts `{ transcript, players, current: { code, spec, slug, title } }`.

Pipeline, one bounded path, no loops:

1. **Spec** with the current spec in the prompt. The schema gains
   `remix: boolean` and `changes: string[]`. The model decides whether the
   words are a change to the running game or a new game; a new game takes
   the tier 1 path unchanged. Without a current game `remix` is forced
   false.
2. **Remix build** (`remix.ts`): the same cached system prefix, a user turn
   with the current code and the change list, and an output format of
   search/replace blocks:

   ```
   <<<<<<< SEARCH
   exact lines from the current file
   =======
   replacement lines
   >>>>>>> REPLACE
   ```

   Blocks are applied in order, exact match first, then a
   whitespace-insensitive match. Typical output is 300 to 800 tokens, so
   the call is 5 to 10 s instead of 30. `max_output_tokens` 4000. If a
   block does not match, the remix is treated as a failed probe.
3. **Probe** the result with the same seed and controls.
4. On failure, **one repair round** on the full file with the observations
   (the existing `repair`), probe again.
5. On failure again, `ready` with the original code and the note
   "COULDN'T REMIX THAT. KEPT THE ORIGINAL". Never the library: the game
   the person was playing still works.

The score resets because the cabinet reloads the game. Remixed games are
not written to the library (they would be near-duplicates).

`pnpm harness bench-remix bench/remixes.txt`: lines of
`<library slug> | <instruction>`. Reports p50 and p95 of the whole path,
probe pass rate, and the share of the original lines kept (a proxy for
"keeps the parts that were not mentioned").

Done: remix p50 under half the tier 1 build p50 (under 18 s against the
36 s of 2026-09-19); at least 8 of 10 remixes pass the probe; kept-lines
share above 70% on the median remix; the walkthrough shows one remix.

### M5. Walkthrough (1 h)

`packages/probe/scripts/screenshot-cabinet.mjs` grows a tier 2 pass after
the tier 1 one, against the same server, using the fake badge API:

```
 8-attract-menu        both mode options and the leaderboard panel
 9-2p-plug             2P chosen, "PLUG IN BOTH BADGES", one badge plugged: "HI, <NAME>"
10-2p-both             second badge in, both names in their colours
11-2p-building         a real 2P generation, title card says 2 PLAYERS
12-2p-playing          both players moving (P1 keyboard, P2 fake badge presses)
13-2p-unplug           badge 2 pulled mid-game via the API; still playing, roster shows it detached
14-2p-gameover         the end card plus the per-game board with two named rows
15-remix-listening     TALK during the game, the remix hint
16-remix-ready         the remixed game, same title, score reset
```

Done: all sixteen screenshots exist from one run against `next dev` and
the tier 1 pass still lands its seven.

### M6. Docs and status (1 h)

`AGENTS.md` (repo map, verify section for 2P, scores, remix and fake
badges), `docs/runbook.md` (dev keys, fake badges, `data/scores.json`),
this file's status table and the hardware checklist, `docs/overview.md`
decisions table (remix output format).

## 3. Interfaces summary

| from | to | shape |
|---|---|---|
| kiosk page | `/api/generate` | `POST { transcript, players, current? }` → SSE, `ready` now carries `slug`, `players`, `source` may be `remix` |
| kiosk page | `/api/badges` | SSE: `roster`, then hub events |
| dev tools | `/api/badges/fake` | `POST { op, serial, … }` |
| kiosk page | `/api/scores` | `GET ?game=` / `POST ScoreEntry` |
| kiosk page | runtime iframe | `load` gains `players`; `state` gains `scores`, `winner` |
| hub | transports | `Transport.list()` / `open()` → `Wire` |
| harness | OpenAI | build (1P and 2P prefixes), remix (search/replace), spec (with `current`) |

## 4. Not in this plan

Wireless badges, three or more players, anything sent to a badge after
install (the README says serial input does not reach a running app), a
badge screen that knows its player number (see H4), QR or NFC of any kind,
accounts, sharing.

## 5. Hardware checklist

What could not be verified on the worktree because it needs a badge, a
hub, or the cabinet. Each is a few minutes with the hardware on the desk.

| # | check | how | what it decides |
|---|---|---|---|
| H1 | the refactored hub still talks to a real badge | `pnpm badge watch`, plug in, open the app, press every button | M0 did not break the serial path (the fake speaks the protocol from `docs/badge-integration.md` §1, which the real badge was verified against, but the fake is not the badge) |
| H2 | never-seen badge onboarding time | `pnpm badge push` and stopwatch from cable-in to HELLO | goal: under 30 s including the push; on 2026-09-19 the push itself was under 1 s |
| H3 | two badges as P1 and P2 in a generated 2P game | pick 2P, plug both, generate, play | input latency versus the stick; slot order matches hello order |
| H4 | badge screen shows the player number | needs a way to tell the badge its slot after install: try `put /littlefs/apps/arcade/slot.txt` from the console while the app runs and read it from Lua, if the sandbox has a file read; else the screen shows only the colour | whether "YOU ARE PLAYER 2" is possible on the badge; the cabinet monitor shows it either way |
| H5 | LED chase on win | add a START-hold chase to `on_button` in `main.lua`; the sandbox has no `pcall`, so test on a badge before shipping | badge feedback beyond the A/B flash |
| H6 | cable pull mid-game on real hardware | pull the cable, keep playing on the stick, check the score is named | the detach path with a real port close |
| H7 | a badge that is already in the app when plugged in | open the app first, then plug in | the `uitree` identity shortcut on a fresh port |
| H8 | encoder mapping and which button is TALK | `packages/runtime/keys.html` | unchanged from tier 1 (M7) |
| H9 | remix and 2P on the real cabinet mic | say "make it faster" during a game on the floor | STT quality on remix phrasing |

## 6. Status

Filled in per milestone as they land; see the commit log for the detail.

| milestone | state | verified by |
|---|---|---|
| M0 fake badge | done | `pnpm test:badge` 10/10 (protocol, paced push, hello/button/bye/detach per slot, uitree identity, ring overflow wedge); `pnpm badge fake` scenario; fake badge driven through the running cabinet server over `/api/badges/fake` and seen on `/api/badges`. Real serial path untested here: both badges on this Mac were held by another process (H1) |
| M1 two players | done | `pnpm exercise` 26/26 (shared and per-player scores, `win(p)`, per-player input, the shell's `end` message); 10/10 templates and 37/37 library games pass the probe; `bench/known-bad/` 8/8 fail including the new `ignores-p2.js`; 2P bench `2026-09-19-0905-gpt-5.6-sol-none-2p.md` 11/12 pass, p50 29.5 s; 1P bench `2026-09-19-0859-gpt-5.6-sol-none.md` 20/20 pass, p50 26.2 s (was 18/20 and 36.4 s on the same prompts before the API grew, so no latency cost). The probe now samples five frames after an A tap: a 9-frame sword swing is visible |
| M2 leaderboard | done | `pnpm test:scores` 4/4 (best per badge and game, guests kept, clamping, corrupt file survives, atomic write); `data/scores.json` is gitignored and outlives restarts; boards on the attract and game-over screens are in the M5 walkthrough |
| M3 cabinet flow | done | Playwright against `next dev` with two fake badges: 1P/2P menu on the stick, `P1 TONY PAN` / `P2 SAM RIVERA` from the hub hellos, a pulled cable shows `(UNPLUGGED)` and the game keeps running, F9 ends the round and the per-game board shows the named row, Escape returns to attract with the overall board. Screenshots in `bench/screenshots/` (gitignored); the full pass is `pnpm screenshots:cabinet` (M5) |
| M4 remix | pending | |
| M5 walkthrough | pending | |
| M6 docs | pending | |
