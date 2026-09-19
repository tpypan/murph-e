# Tier 2 goal: the product

Everything in tier 1, plus identity, a leaderboard, multiplayer on hacker
badges, and voice remixes. This is what we want on the table on demo day.

## The experience

**Tap in.** The attract screen says "SHOW YOUR BADGE TO PLAY". The person
holds their badge's QR code (the one it shows on boot) up to the scanner on
the cabinet. The screen says "HI, <NAME>" and their scores from now on have
their name on them. If they skip it, they play as GUEST.

**Leaderboard.** Attract mode cycles a top-ten board across all games and a
per-game board on each game-over screen. Scores are keyed by badge ID, so a
person keeps their identity across every game they ask for.

**Multiplayer on badges.** Someone says "a two-player game." The screen says
"PLUG IN YOUR BADGES". Two to four people plug their badges into the hub on
the front of the cabinet. Each badge gets the arcade app installed
automatically if it is missing, they open it from their launcher, and the
badge screen turns their player colour: "YOU ARE PLAYER 2". The game is
generated for that many players in a shared arena on the cabinet monitor.
D-pad and A and B on the badge are the controls. On a hit the badge's LEDs
flash; on a win they chase.

**Remix.** While a game is running, holding TALK and saying "make it faster"
or "add a boss that shoots" produces a modified version of the same game in
well under the original build time, and the score resets.

## Done means

- **Tap-in.** Scanning a badge QR puts a name on screen within a second and
  on the leaderboard after a game. Works for every badge we can find at the
  event, not just ours.
- **Leaderboard.** Persists across restarts. Shows in attract mode and on
  game over. Guest scores are kept but unnamed.
- **Multiplayer.** Four badges plugged in at once all register as separate
  players with the right names and colours. Input latency from a badge
  button to the screen is not noticeably worse than the joystick. A
  never-before-seen badge goes from plugged in to controlling a game in
  under a minute including the app install.
- **Multiplayer games.** The generator produces a working 2 to 4 player game
  for at least 8 of 10 multiplayer bench prompts: versus, co-op survival and
  party mini-games, all same-screen.
- **Badge feedback.** LEDs react to at least hit, score and win. The badge
  screen shows the player's colour and number.
- **Remix.** A remix completes in under half the tier 1 build p50 and keeps
  the parts of the game that were not mentioned.

## Explicitly not in tier 2

- Wireless badges. Every badge is on a cable.
- The cabinet sending anything to the badge beyond what the install needs
  (the LED and screen feedback is driven by the Lua app from its own button
  events and a few serial lines, not from game state, unless the day-one
  badge check shows the serial console reaches a running app).
- Games saved to a person's account, sharing, or anything off the cabinet.

## Depends on

- The badge verification checklist in `docs/badge-integration.md` §6,
  run on real badges on the first day of the event. Two of its five checks
  decide details in this tier; none of them can block it.
- A USB barcode scanner and a USB hub with four USB-C cables.
