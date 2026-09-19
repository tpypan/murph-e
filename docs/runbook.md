# Runbook: setup day and the floor

## Cold boot to attract mode

```
git clone <repo> && cd htn-2026
cp .env.example .env            # paste OPENAI_API_KEY
mise install && pnpm install
pnpm --filter @htn/probe exec playwright install chromium
scripts/kiosk.sh                # builds, starts next on :3000, launches Chrome --kiosk
```

`scripts/kiosk.sh --dev` runs `next dev` in a normal window instead. Logs
land in `~/htn-arcade-logs/`. The script keeps the Mac awake with
`caffeinate`; also turn off the screensaver and sleep in System Settings.

Quit the kiosk with Cmd+Q on a keyboard, or `pkill -f "Google Chrome"`.

## Encoder mapping (M7)

1. Plug the encoder into the Mac. It enumerates as a keyboard.
2. `pnpm serve` and open `http://localhost:5173/packages/runtime/keys.html`.
3. Press every direction and button; the page lists the `KeyboardEvent.code`
   for each.
4. Fill `ENCODER_KEYS` in `apps/cabinet/app/input.ts`, one line per input:
   up, down, left, right, a, b, start, talk. Decide which physical button is
   TALK; the plan assumes one of the four buttons.
5. `pnpm screenshots:cabinet` still passes with the keyboard mapping, and a
   human plays one round on the real controls.

## Microphone

- Chrome needs the mic permission once per profile; the kiosk script passes
  `--use-fake-ui-for-media-stream`, which auto-accepts it.
- If the live session misbehaves, the page falls back to posting the
  recorded clip on release. If both fail, the LISTENING panel shows a text
  box: type the game and press Enter.
- Test with a synthesised clip:
  `say -o x.aiff "a snake game but the snake is a train"`,
  `afconvert -f WAVE -d LEI16@24000 -c 1 x.aiff x.wav`,
  `pnpm stt:test x.wav "snake train"`.

## Soak

With the server up: `node scripts/soak.mjs 120 180` runs a generation every
three minutes for two hours and writes `soak.log`. Watch `ps -o rss -p
$(pgrep -f "next start")` for memory.

## Library

`pnpm harness seed bench/prompts.txt --n 2` fills `library/games/` with every
passing game. The attract loop and every fallback draw from it. Templates are
always available even with an empty library.

## Keyboard (dev and emergencies)

Arrows, Z = A, X = B, Enter = START, hold Space = TALK, Esc cancels
listening or returns to attract from a game, F8 injects a crash (exercises
the fallback path), F9 ends the round on screen. Player two from the
keyboard: I J K L move, N = A, M = B.

## Badges and two players

- Real badges: plug in over USB-C. The hub in the cabinet server installs
  the arcade app if the badge lacks it and waits for the player to open it;
  the screen then says HI, <NAME>. Only one process may hold a badge's
  port, so do not run `pnpm badge watch` and the cabinet at once.
- Fake badges, for rehearsing without hardware: F1 plugs (or unplugs) a
  badge that already has the app, F2 one that needs it pushed; both open
  the app by themselves. `POST /api/badges/fake` drives more of them.
- 2 PLAYERS on the attract screen means both players are on badges: badge
  slot 1 is player one, slot 2 is player two, in the order they opened the
  app. The cabinet stick still drives player one, which is the fallback
  when only one badge is ready.

## Leaderboard

`data/scores.json`, gitignored, one entry per player per game over. Delete
the file to reset it. Guests are kept as GUEST rows; a badge keys its rows
by badge id across every game.

## Remix

Hold TALK while a game is on screen and say a change ("make it faster",
"add a boss"). The spec step decides whether it is a change or a new game;
a change comes back as search/replace edits to the running game in well
under a build, and the score resets. If the edit cannot be applied or fails
the probe twice, the original game stays on screen and the banner says so.
