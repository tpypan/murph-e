# Encoder bring-up: making the real cabinet controls work

Written 2026-09-20, before the board was on the desk. This is the procedure
for the session that has the real encoder plugged in: what to look at, what
to change, and what to run before calling the cabinet controls done. Every
step here is offline; nothing needs a model call (`AGENTS.md`, billing rule).

## What already exists

The panel is fully built against placeholder key codes, so bring-up is a
mapping exercise, not a build.

| piece | where | what it does |
|---|---|---|
| Panel model | `apps/cabinet/app/input.ts` | `ENCODER_KEYS` maps a `KeyboardEvent.code` to a panel input (`up down left right a b x y`); `PANEL_ROLES` says X is START and Y is TALK; `buttonForCode` turns codes into shell buttons, encoder table first |
| Routing | `apps/cabinet/app/cabinet.tsx`, `onKeyboardInput` and `onBadgeInput` | 1P: the panel plays, badges only name the score. 2P: badges play, the panel is ignored except START. Menus from either. `?cabinet=1` makes this strict; without it the keyboard stands in for the badges in 2P |
| Simulator | `apps/cabinet/app/panel.tsx`, F3 | lights on every player-one press, names the last code it received, and its buttons dispatch the encoder codes as synthetic key events |
| Keycaps | `apps/cabinet/app/game-controls.tsx` | with `?cabinet=1` the play legend says A and B, not A / Z and B / X |
| Kiosk | `scripts/kiosk.sh` | opens `/?cabinet=1` |
| Code reader | `packages/runtime/keys.html` (`pnpm serve`, port 5173) | prints the code of every key pressed |
| Tests | `packages/probe/scripts/panel-ui-test.mjs`, `input-routing-ui-test.mjs` | the whole loop on the encoder codes; who plays in 1P and 2P with two fake badges |
| Docs that name the placeholders | `docs/design-guide.md` (Physical input), `docs/runbook.md` (Encoder mapping, Keyboard), `docs/overview.md` (Hardware), `AGENTS.md` (Cabinet change), `docs/plans/tier-2.md` (H8) | say "numpad placeholders" until this procedure is done |

The placeholders: `Numpad8 2 4 6` for the stick, `Numpad1 3 7 9` for A B X Y.

## Step 1: find out what the board actually is

Plug the encoder into the Mac with the stick and all four buttons wired.

1. Open `http://localhost:5173/packages/runtime/keys.html` (`pnpm serve`) and
   press every stick direction and every button. Write the eight codes down.
2. **If nothing prints**, the board is not a keyboard. Most "zero delay" USB
   encoders enumerate as a HID gamepad. Check with
   `system_profiler SPUSBDataType | grep -A8 -i "encoder\|joystick\|gamepad"`
   and, in Chrome, open a page that logs `navigator.getGamepads()` on
   `gamepadconnected`. If it is a gamepad, see "If the board is a gamepad"
   below before anything else; the rest of this doc still applies afterwards.
3. Record which physical button is which letter on the panel, and where the
   four sit in the diamond. The overlay assumes X top, Y left, A right,
   B bottom (`DIAMOND` in `panel.tsx`); fix it if the panel differs.
4. Check for collisions. The eight codes must be distinct and must not be
   any of: `ArrowUp/Down/Left/Right KeyZ KeyX Enter Space KeyV` (dev keys),
   `KeyI KeyJ KeyK KeyL KeyN KeyM` (player-two dev keys), or the dev hooks
   in the `cabinet.tsx` keydown effect: `F1 F2 F3 F8 F9 KeyF KeyP KeyR Escape`.
   A collision with a dev key is fine (the encoder table wins for player
   one in `buttonForCode`) but a collision with a dev hook is not: that
   effect runs on every keydown regardless of the table. If it happens,
   gate those hooks on `!cabinetRef.current` in `cabinet.tsx`.
5. Hold a direction and A together, then two directions (a diagonal), then
   all four buttons. Every code must arrive and release independently;
   `keys.html` counts presses per code. Encoders that ghost or drop the
   third key will show it here.
6. Hold one button for five seconds and watch `keys.html`: the count must
   stay at 1 (auto-repeat is ignored by `e.repeat`, but some boards send
   their own repeated down events, which would register as new presses).

## Step 2: change the code

1. `apps/cabinet/app/input.ts`: replace the eight values in `ENCODER_KEYS`
   with the real codes. Keep the panel names. If START and TALK are the
   other way round on the diamond, swap `PANEL_ROLES`. Delete the
   "PLACEHOLDER" comment.
2. `packages/probe/scripts/panel-ui-test.mjs` and
   `input-routing-ui-test.mjs`: update the `KEY` tables to the same codes
   (Playwright presses by code name, so any code the board sends works).
3. `apps/cabinet/app/panel.tsx`: fix `DIAMOND` if the geometry differs.
4. Docs: replace "numpad placeholders" wording in `docs/design-guide.md`,
   `docs/runbook.md`, `docs/overview.md` and `AGENTS.md`; mark H8 done in
   `docs/plans/tier-2.md` with the date and the codes.
5. Sticker X as START and Y as TALK (or the other way, matching
   `PANEL_ROLES`). The screen keeps saying START and TALK.

## Step 3: verify offline

Run these before touching the cabinet, all with no key and no network:

```
pnpm exec biome check apps/cabinet/app packages/probe/scripts
pnpm --filter @htn/cabinet exec tsc --noEmit        # ignore stale .next/ stubs
HTN_BADGES=off pnpm dev
pnpm --filter @htn/probe exec node scripts/panel-ui-test.mjs
pnpm --filter @htn/probe exec node scripts/input-routing-ui-test.mjs
pnpm --filter @htn/probe exec node scripts/player-flow-ui-test.mjs
pnpm test:badge
```

All must pass. `home-ui-test.mjs` needs demo packs that are not in the
repo; its failure on missing batman/sonic/spider packs is not yours.

## Step 4: verify on the cabinet, by hand

`scripts/kiosk.sh --dev` (opens `/?cabinet=1`). Press F3 once so the
overlay shows what the shell receives. Go through every row; each is a
minute.

| screen | do | expect |
|---|---|---|
| Home | stick up/down, left/right | selection moves; left/right toggles 1P/2P on the player row and browses games on the title row |
| Home | A on PLAY | READY for the demo; A again plays it |
| Home | A on MAKE A GAME | DESCRIBE YOUR GAME |
| Voice | hold Y | LISTENING with the level meter; release: YOU SAID with the words |
| Voice | B | back to home; A after review: build |
| Options | stick, A, B | moves, toggles sound, B returns |
| READY | left/right | pages through long instructions |
| READY | B | home |
| 1P play | stick, A, B | the game moves and acts; legend says A and B (no Z / X) |
| 1P play | X | pause to home with RESUME GAME; A on RESUME continues |
| 1P play | Y held | nothing (no voice during play) |
| 1P play, badge plugged in | badge d-pad, A, START | nothing happens; header shows the badge name; score posts under it |
| Game over | B | home; A: READY again |
| 2P, two badges | panel stick, A, B | nothing; both badges move their own player |
| 2P | panel X | pauses; RESUME continues |
| 2P, one badge | A on READY | game starts; player two idles; hint says PLUG IN BOTH BADGES |
| Any | unplug the encoder mid-hold, plug it back | the held direction must not stay stuck: START (pause) releases every input through the runtime's `setPaused`; if the game keeps moving after a pull, add a release on `visibilitychange`/timer in `attachKeyboard` |
| Any | leave it for a minute | no phantom presses (a noisy encoder shows as flicker on the F3 overlay) |
| Attract idle | wait 60 s on game over | returns home |

Also check latency by feel against a badge in 2P (`docs/plans/tier-2.md` H3).

## If the board is a gamepad

Add a second source in `input.ts` that polls `navigator.getGamepads()` on
`requestAnimationFrame` and emits the same `{player, button, down}` events
as `attachKeyboard`, then attach it in `cabinet.tsx` next to
`attachKeyboard(onKeyboardInput)` (same routing function, so the 1P/2P rule
holds without changes). Map axes 0 and 1 (or the hat) to the four
directions with a dead zone around 0.5, and buttons by index to A B X Y
through a `GAMEPAD_BUTTONS: Record<number, PanelInput>` table with the same
placeholders-to-real procedure as `ENCODER_KEYS`. The F3 overlay keeps
working if the gamepad source also dispatches synthetic key events for the
codes in `ENCODER_KEYS` (simplest), or if `panelInputForCode` learns a
`gamepad:<index>` code form. Chrome only exposes a gamepad after a button
press, so the first press on the attract screen is lost: fine. Playwright
cannot press a gamepad, so keep the keyboard tables and tests as they are
and add a unit test for the gamepad mapping function instead.

## Done means

- `ENCODER_KEYS` holds real codes, `PANEL_ROLES` matches the stickers, both
  test key tables match, and every command in step 3 passes.
- Every row of the step 4 table was done on the cabinet by a person.
- The docs no longer say "placeholder" and H8 is marked done with the codes.
- One commit: `feat(cabinet): map the real encoder` (no AI attribution).
