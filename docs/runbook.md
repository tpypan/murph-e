# Runbook: setup day and the floor

## Cold boot to attract mode

```
git clone <repo> && cd murph-e
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

The full setup-day procedure, including what to do if the board turns out
to be a gamepad rather than a keyboard, is `docs/encoder-bringup.md`. In
short: the panel is a joystick and four buttons, A B X Y in a diamond. A is confirm
and B is back on every shell screen; X is START and Y is TALK. Until the board
arrives the codes in `ENCODER_KEYS` are numpad placeholders (8 2 4 6 for the
stick, 1 3 7 9 for A B X Y) and F3 on the cabinet page shows a simulated panel
whose buttons send those codes.

1. Plug the encoder into the Mac. It enumerates as a keyboard.
2. `pnpm serve` and open `http://localhost:5173/packages/runtime/keys.html`,
   or press F3 on the cabinet page: the overlay lights the panel input it
   received and names the code, so the board is checked one button at a time.
3. Press every stick direction and A, B, X, Y; note each `KeyboardEvent.code`.
4. Replace the eight values in `ENCODER_KEYS` (`apps/cabinet/app/input.ts`),
   keeping the panel names up, down, left, right, a, b, x, y. If START and
   TALK are the other way round on the real diamond, swap `PANEL_ROLES`.
   Sticker X and Y as START and TALK; the screen keeps those words.
5. `pnpm --filter @htn/probe exec node scripts/panel-ui-test.mjs` (update its
   `KEY` table to the real codes) and a human plays one round on the panel.

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

Arrows, Z = A, X = B, Enter = START, hold Space or V = TALK, Esc cancels
listening or returns to the menu from a game, F8 injects a crash (exercises
the fallback path), F9 ends the round on screen. The numpad is the encoder's
placeholder codes (8 2 4 6 stick, 1 3 7 9 for A B X Y) and F3 shows the
simulated panel, which can be clicked. Player two from the keyboard: I J K L
move, N = A, M = B. The kiosk script opens `/?cabinet=1`, which swaps the
keyboard hints on screen (A / Z) for the panel's own letters.

## Badges and two players

- Real badges: plug in over USB-C. The hub in the cabinet server installs
  the arcade app if the badge lacks it and waits for the player to open it;
  the screen then says HI, <NAME>. Only one process may hold a badge's
  port, so do not run `pnpm badge watch` and the cabinet at once.
- Fake badges, for rehearsing without hardware: F1 plugs (or unplugs) a
  badge that already has the app, F2 one that needs it pushed; both open
  the app by themselves. `POST /api/badges/fake` drives more of them.
- Who plays is fixed by the mode. 1 PLAYER: the cabinet controls play; a
  plugged-in badge only names the score and its buttons are ignored during
  the game. 2 PLAYERS: badge slot 1 is player one, slot 2 is player two, in
  the order they opened the app; the cabinet controls do not play, but START
  still pauses and the panel works the menus. With one badge the game still
  starts (player two idles) so the cabinet never dead-ends. Off the cabinet
  (no `?cabinet=1`) the keyboard stands in for the badges in 2P: arrows and
  Z X for player one, I J K L N M for player two.
- The scenario test for all of this is
  `pnpm --filter @htn/probe exec node scripts/input-routing-ui-test.mjs`
  against `HTN_BADGES=off pnpm dev`; it plugs the two fake badges itself.

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
