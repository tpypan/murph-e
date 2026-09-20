# Overview

## Background

Hack the North 2026. The team is building a physical arcade cabinet around a
Mac mini: a monitor, a microphone, a joystick and four buttons on a USB
encoder that shows up as a keyboard. Someone walks up, chooses one or two players,
holds the mic button, describes a game, and a pipeline writes it while they watch. They can also browse
a muted gameplay carousel and choose an existing local game. They play it on
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

- **An 8-bit runtime we own.** 256x224, a default 16-colour palette plus optional per-sprite palettes, a PICO-8-style API
  of about twenty functions. It runs in a sandboxed iframe in a kiosk Chromium
  on the Mac. The runtime owns the frame loop, input, sound synthesis, HUD,
  attract mode and the game-over screen. The model writes only gameplay.
- **A bounded generator.** Transcript to a small spec, two streamed `game.js`
  candidates racing through a headless probe, one repair round if needed,
  then an explicit library fallback. Current timings are in
  `bench-2026-09-19-astra-medium.md`.
- **Open genre and visual planning.** Genre is descriptive rather than a fixed
  template menu. Specs preserve detailed mechanics and include art direction;
  builders have no line-count target or tiny-sprite requirement. Matching examples
  are optional API references. The current runtime limits still apply.
- **Local design context.** The spec selects from 17 research-backed mechanic
  cards; deterministic signals protect explicit mechanics. A shared core and
  at most four cards guide specification, build, repair and remix. Source
  provenance and exact prompts are saved per run. This does not perform live
  reference lookup or generate external sprite assets. Local original implementation
  references now also supply maze topology/ghost lifecycle and combat timing code,
  including two reusable ghost sprite frames. These are tested components, not
  complete game engines or a downloaded sprite library.
- **A live code stream.** A large green terminal shows code as the game is written, with separate writing, testing and repair feedback.
  The display keeps the CRT safe area and waits for START after verification;
  a separate muted draft preview shows streamed sprite rows and procedural scenes
  in a disposable worker. It never advances the playable game.
- **Push-to-talk microphone.** Player count is an explicit first-screen choice.
  Microphone access is requested only on TALK-down after that choice opens the
  listening screen; in-game voice changes are
  disabled and the cabinet endpoint ignores previous-game context.
  Release, cancel, leaving the page, or switching away stops the audio tracks;
  no microphone or cloud speech session is kept open. Voice input proceeds through
  a local audio-reactive waveform while held, finishing transcription with the
  mic off, and a read-only transcript review. CREATE GAME explicitly begins
  generation after review. Input is voice-only; hold TALK again to replace the idea.
- **A CRT-first kiosk shell.** A flat 4:3 frame, 8% safe margins and plain action
  labels while the physical cabinet controls are pending. Player selection, voice, transcript review, building,
  ready, playing and results are separate stages. The home carousel previews verified
  local games with synthetic input in a separate muted sandbox; the real game waits
  for PLAY. START
  starts a prepared game or pauses a running one; menus and voice preserve the
  paused run. See `design-guide.md` for the cabinet layout and controls.
- **Badges as identity and controllers, over one cable.** Plugging a badge
  into the cabinet over USB-C is the only way to tap in. The cabinet pushes
  the arcade Lua app to the badge if it is missing and reads the badge ID
  and name back over the same wire. Who plays is fixed by the mode, never
  decided per press: a one-player game is played on the cabinet controls, and
  a plugged-in badge only puts a name on the score; a two-player game is
  played on two plugged-in badges, which become controllers 1 and 2, and the
  cabinet controls only work the menus.

The scope in three tiers is in `docs/goals/`. Tier 1 is the cabinet working
end to end for one player. Tier 2 adds identity, leaderboard, multiplayer on
badges. Voice remixes remain in the harness CLI but are disabled in the cabinet.
Tier 3 is wireless badges and take-home games.

## Decisions so far (2026-09-19)

| decision | choice | why, in one line | detail |
|---|---|---|---|
| Engine | browser canvas runtime we own | zero build step, models are fluent in JS, headless verify in seconds | `harness-plan.md` §2 |
| Generation shape | one streamed call, no tools | tool round trips were the whole 40 minutes | `harness-plan.md` §1 |
| Provider | OpenAI | Tony's call | |
| Build and repair model | `gpt-6-astra`, effort medium (CLI remix remains low) | requested medium upgrade; longer latency budget | `bench-2026-09-19-astra-medium.md` |
| Spec model | `gpt-5.6-luna`, effort none | 0.6 s to first token | same |
| STT | local `faster-whisper`, `tiny.en`, CPU int8 | audio-reactive meter while held, English transcript after release; no speech API key | `harness-plan.md` §4 |
| Display | 256x224, default 16 colours plus per-sprite palettes, aspect-preserving pixel scaling | every game looks like it belongs to the same cabinet | |
| Identity | USB-C serial hello from the arcade app, both modes | one gesture for identity and controls; badge NFC is a reader, not a tag; QR dropped 2026-09-19 | `badge-integration.md` §3 |
| Multiplayer transport | USB-C serial | the only low-latency channel the badge exposes | `badge-integration.md` §2 |
| Player count | chosen on the attract screen, 1P or 2P, before speaking | an explicit choice beats inferring it from speech; 2P means both players on badges | `badge-integration.md` §4 |
| Remix | search/replace blocks against the game on screen, one call | a few hundred output tokens instead of a whole game, so a change lands in seconds | `plans/tier-2.md` M4 |
| Leaderboard | one JSON file keyed by badge id, guests kept | nothing to deploy, survives restarts, the badge id is the only identity we have | `plans/tier-2.md` M2 |
| Badge dev loop | an in-process fake badge that speaks the console protocol | the whole 2P flow runs on a laptop; the hardware checklist is what is left | `plans/tier-2.md` M0 |
| Not doing | NFC reader, Wi-Fi from badges, custom firmware, Godot, true 3D, judge scoring | | |

## Hardware on the cabinet

- Mac mini, monitor, microphone.
- One joystick and four buttons, A B X Y in a diamond, on a USB encoder that
  shows up as a keyboard. A is confirm and B is back on every shell screen; in
  a game they are the game's A and B. X is START and Y is TALK (hold to speak),
  set by `PANEL_ROLES` in `apps/cabinet/app/input.ts` and confirmed on setup
  day. Until the board is on the desk the encoder codes are numpad
  placeholders and F3 on the cabinet page shows a simulated panel.
- To buy: a USB hub and two or three USB-C data cables on the front of the
  cabinet (one per badge, plus a spare). Not a barcode scanner, not an NFC
  reader.

## People and parallel tracks

Tier 1 splits into tracks that do not block each other: the runtime and
kiosk page, the harness and bench, and STT plus hardware. Tier 2 badge
plumbing touches the generator only through a `players` field in the spec,
which is set by the 1P/2P choice on the attract screen, not by the model.
