# Tier 2 goal: the product

Everything in tier 1, plus identity, a leaderboard, multiplayer on hacker
badges, and voice remixes. This is what we want on the table on demo day.

## The experience

**Choose 1P or 2P.** The attract screen shows two options, 1 PLAYER and
2 PLAYERS, picked with the stick and A. This happens before anyone speaks
and it decides the controls and how many players the game is written for.

**Plug in.** The attract screen also says "PLUG IN YOUR BADGE TO SAVE YOUR
SCORE". The person plugs their badge into a cable on the front of the
cabinet. If the badge has never met the cabinet, the arcade app is pushed
to it in a few seconds. They open it from the launcher, and the screen says
"HI, <NAME>". Their scores from now on have their name on them. They can
do this at any point before the game-over screen, including while the code
is streaming. If they never plug in, they play as GUEST. There is no
scanner, no QR and nothing to hold up to anything.

**Leaderboard.** Attract mode cycles a top-ten board across all games and a
per-game board on each game-over screen. Scores are keyed by badge ID, so a
person keeps their identity across every game they ask for.

**Two players on badges.** After picking 2 PLAYERS the screen says "PLUG IN
BOTH BADGES", then the pair holds TALK and describes the game. While the
code streams, each badge gets the arcade app if it is missing, they open it,
and each badge screen turns its player colour: "YOU ARE PLAYER 2". The
game is generated for two players in a shared arena on the cabinet
monitor. D-pad and A and B on the badge are the controls; the cabinet stick
is not used. On a hit the badge's LEDs flash; on a win they chase. If only
one badge is ready when the game is, the screen waits briefly and then
offers to play it as one player on the stick.

**Remix.** While a game is running, holding TALK and saying "make it faster"
or "add a boss that shoots" produces a modified version of the same game in
well under the original build time, and the score resets.

## Done means

- **Plug-in identity.** A badge that already has the arcade app puts a name
  on screen within five seconds of being plugged in and opened. A
  never-before-seen badge does the same in under thirty seconds including
  the push. Works for every badge we can find at the event, not just ours.
  Plugging in never blocks LISTENING, BUILDING or PLAYING.
- **Leaderboard.** Persists across restarts. Shows in attract mode and on
  game over. Guest scores are kept but unnamed.
- **Mode choice.** 1P and 2P are picked on the attract screen, the choice
  is visible on the title card, and a 2P prompt spoken in 1P mode still
  produces a one-player game.
- **Two badges.** Two badges plugged in at once register as separate
  players with the right names and colours. Input latency from a badge
  button to the screen is not noticeably worse than the joystick. Pulling a
  cable mid-game does not crash the game or lose the score.
- **Two-player games.** The generator produces a working two-player game
  for at least 8 of 10 two-player bench prompts: versus and co-op survival,
  all same-screen.
- **Badge feedback.** LEDs react to at least hit, score and win. The badge
  screen shows the player's colour and number.
- **Remix.** A remix completes in under half the tier 1 build p50 and keeps
  the parts of the game that were not mentioned.

## Explicitly not in tier 2

- Wireless badges. Every badge is on a cable.
- Three or four players. Two is the demo.
- The cabinet sending anything to the badge beyond what the install needs.
  The README says serial input does not reach a running app, so LED and
  screen feedback comes from the Lua app's own button events, not from game
  state.
- QR codes, barcode scanners, NFC. Identity is the cable.
- Games saved to a person's account, sharing, or anything off the cabinet.

## Depends on

- The badge verification checklist in `docs/badge-integration.md` §6,
  run on real badges on the first day of the event. The hot-plug check
  (step 3) decides the on-screen plug-in instructions; none of the checks
  can block this tier.
- A USB hub and two or three USB-C data cables on the front of the cabinet.
