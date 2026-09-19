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
listening, F8 injects a crash (exercises the fallback path).
