# Tier 3 goal: stretch

Only after tier 2 is stable on the actual cabinet. Each item is independent;
pick by what the badge checks and the crowd say.

## Wireless badges for party games

Badges broadcast button presses over BLE and the Mac listens. Anyone in the
crowd opens the arcade app, presses A, and is in the game with no cable. This
only works for games that tolerate lossy, late input: quiz buzzers, "press
when the light turns green", vote-with-your-badge, crowd-controlled snake.

Done means: a BLE scanner on the Mac reliably receives payloads from 10
badges at once, a crowd game with 10 players runs for five minutes without a
dropped player, and input-to-screen latency is under 300 ms.

Depends on the two unknowns in `docs/badge-integration.md` §2 checking out:
whether a Mac can see the badge's `LUA1` frames, and the firmware's send rate
limit.

## Take it home

The game-over screen shows a QR code. Scanning it on a phone opens the same
game, playable with on-screen touch controls, with the person's name and
score on it. Each game is one HTML file, so this is a static host and a
touch overlay in the runtime.

Done means: any game generated on the cabinet is playable on a phone within
ten seconds of scanning, and the link keeps working after the event.

## Attract-screen choices by voice

On the attract screen, "make it harder" or "make it look like Game Boy"
before asking for a game sets difficulty and palette for the next build.
Small spec change, mostly prompt work.

## Explicitly never

NFC, custom badge firmware, anything that edits a badge's event firmware or
identity, 3D, Godot, split screen.
