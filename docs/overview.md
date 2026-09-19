# Overview

## Background

Hack the North 2026. The team is building a physical arcade cabinet around a
Mac mini: a monitor, a microphone, a joystick and four buttons on a USB
encoder that shows up as a keyboard. Someone walks up, holds the mic button,
describes a game, and a pipeline writes it while they watch. They play it on
the stick. The next person in line does the same.

Every hacker at the event carries a Hacker Badge: an ESP32-C3 device with a
screen, eight buttons, LEDs, a USB-C port and a Lua app sandbox. The badges
are how we do identity and, later, multiplayer.

## What we are optimising

**Seconds from the end of speech to a playable game.** Everything else is
second. A person at an arcade cabinet will wait about a minute if the screen
is doing something interesting, and will not wait five.

Target: p50 under 60 s, p95 under 2 min, something on screen within 3 s of
the person finishing their sentence.

## Where we came from

Tony's earlier harness (`takehome-tpypan-game-studio`) produces 3D Godot games
from a brief through a multi-turn coding agent, then scores them with a judge
panel. It works, and its own logs show 7 to 43 minutes per game with 5 to 68
tool calls each. That shape is wrong for a cabinet, so this repo keeps the
ideas that transfer (constraints from observed failures, an idle-vs-driven
motion probe, feedback phrased as observations, a run store) and none of the
code, the engine, or the judge.

## What we are building instead

- **An 8-bit runtime we own.** 256x224, 16-colour palette, a PICO-8-style API
  of about twenty functions. It runs in a sandboxed iframe in a kiosk Chromium
  on the Mac. The runtime owns the frame loop, input, sound synthesis, HUD,
  attract mode and the game-over screen. The model writes only gameplay.
- **A one-call generator.** Transcript to a small spec (1 s), spec to one
  streamed `game.js` (about 30 s), a headless probe (under 10 s), one repair
  round if needed, a fallback library if that fails too.
- **A kiosk shell.** Attract, listening, building (the code streams onto the
  screen), playing, game over, back to attract.
- **Badges as identity and controllers, over one cable.** Plugging a badge
  into the cabinet over USB-C is the only way to tap in. The cabinet pushes
  the arcade Lua app to the badge if it is missing and reads the badge ID
  and name back over the same wire. Single players play on the cabinet
  stick and plug in only to put a name on their score. Two-player games are
  played on two plugged-in badges, which become controllers 1 and 2.

The scope in three tiers is in `docs/goals/`. Tier 1 is the cabinet working
end to end for one player. Tier 2 adds identity, leaderboard, multiplayer on
badges and voice remixes. Tier 3 is wireless badges and take-home games.

## Decisions so far (2026-09-19)

| decision | choice | why, in one line | detail |
|---|---|---|---|
| Engine | browser canvas runtime we own | zero build step, models are fluent in JS, headless verify in seconds | `harness-plan.md` §2 |
| Generation shape | one streamed call, no tools | tool round trips were the whole 40 minutes | `harness-plan.md` §1 |
| Provider | OpenAI | Tony's call | |
| Build model | `gpt-5.6-sol`, effort low | 31 s for a whole game, quality tier above 5.4 which was rejected on quality | `bench-2026-09-19-openai-models.md` |
| Spec model | `gpt-5.6-luna`, effort none | 0.6 s to first token | same |
| STT | `gpt-live-transcribe`, push-to-talk | words on screen while they talk, transcript final on release | `harness-plan.md` §4 |
| Display | 256x224, 16 colours, integer scaled | every game looks like it belongs to the same cabinet | |
| Identity | USB-C serial hello from the arcade app, both modes | one gesture for identity and controls; badge NFC is a reader, not a tag; QR dropped 2026-09-19 | `badge-integration.md` §3 |
| Multiplayer transport | USB-C serial | the only low-latency channel the badge exposes | `badge-integration.md` §2 |
| Player count | chosen on the attract screen, 1P or 2P, before speaking | an explicit choice beats inferring it from speech; 2P means both players on badges | `badge-integration.md` §4 |
| Not doing | NFC reader, Wi-Fi from badges, custom firmware, Godot, 3D, split screen, judge scoring | | |

## Hardware on the cabinet

- Mac mini, monitor, microphone.
- One joystick and four buttons on a USB encoder. Button roles: A, B, START,
  TALK (hold to speak). Exact keycodes read on setup day.
- To buy: a USB hub and two or three USB-C data cables on the front of the
  cabinet (one per badge, plus a spare). Not a barcode scanner, not an NFC
  reader.

## People and parallel tracks

Tier 1 splits into tracks that do not block each other: the runtime and
kiosk page, the harness and bench, and STT plus hardware. Tier 2 badge
plumbing touches the generator only through a `players` field in the spec,
which is set by the 1P/2P choice on the attract screen, not by the model.
