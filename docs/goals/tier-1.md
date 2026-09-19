# Tier 1 goal: the cabinet works, end to end, for one player

This is the demo if everything else fails. It must exist, stable, before any
tier 2 work starts.

## The experience

1. The cabinet is in attract mode: earlier games play themselves on screen
   with "HOLD TALK AND SAY A GAME" over them.
2. Someone holds the TALK button and says "a game where I'm a frog dodging
   cars that get faster." Their words appear on the screen as they say them.
3. They let go. Within about two seconds the screen shows a title card:
   **FROG DODGE**, one line about the game, and "BUILDING".
4. Code streams onto the screen in a terminal font with a progress bar.
   It takes about half a minute.
5. The screen goes black, the title comes back with "PRESS START". They
   press START and play. Arrows move, A and B do what the title card said.
6. They die. "GAME OVER, SCORE 42, PRESS START TO RETRY". They can retry,
   or the next person holds TALK and it starts over.
7. If anything goes wrong in the middle, the screen says so in one line and
   loads a game from the library instead. Nobody at the cabinet ever sees a
   spinner that does not end.

## Done means

- **Latency.** Over the 20 prompts in `bench/prompts.txt`, p50 from
  end-of-speech to "PRESS START" is under 60 s and p95 under 2 min, measured
  by the bench and recorded in `bench/results/`.
- **Reliability.** At least 18 of the 20 bench prompts produce a game that
  passes the probe on the first or second try. Every failure ends in a
  library game on screen within 10 s of the failure.
- **Playability.** A human plays 10 generated games in a row on the cabinet
  controls. All 10 respond to input, have a way to lose, and show a score.
  At least 7 of the 10 are ones you would play twice.
- **Cabinet.** The kiosk runs fullscreen on the Mac mini from a single
  launch script, survives 2 hours of use without a restart, and can be
  driven entirely from the joystick, the four buttons and the mic.
- **Library.** 20 to 30 pre-generated games across every genre template,
  used by attract mode and as fallbacks.
- **Dev loop.** `pnpm harness gen "..."` produces a playable game from a
  terminal with no cabinet, mic or browser window. `pnpm harness bench`
  produces the latency and pass-rate table. Both are documented in
  `AGENTS.md`.

## Explicitly not in tier 1

- Any use of the hacker badge. No tap-in, no leaderboard, no multiplayer.
- Voice remix of a running game.
- Two-player anything.
- Any game longer than a few minutes or with levels, saves or menus.
- Any scoring of game quality beyond pass/fail.

## Risks specific to this tier

- **Sol is slower than the fast tier.** The race (two seeds in parallel,
  first to pass wins) is the mitigation, and effort `none` is the fallback
  if the bench says `low` misses the target.
- **The probe passes bad games.** A game can load, move and respond to input
  and still be unplayable. The human playability check above is the only
  real test, so it is a done criterion, not a nice-to-have.
- **STT on a loud floor.** Push-to-talk plus a directional mic. If live
  transcription is unreliable, `gpt-transcribe` on the committed clip is the
  fallback and costs about a second.
