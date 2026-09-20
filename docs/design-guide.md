# Arcade — cabinet design

The physical arcade machine and CRT are the primary target. The attached Voice
Arcade design guide informs the visual language; the user's voice-only and
physical-control requirements take precedence over its desktop typing examples.

## Display

- Center one 4:3 screen, with black outside it. Preserve aspect in fullscreen.
- Keep essential text and controls at least 8% inside the screen edges. The
  complete game canvas is inset as well, so its existing score HUD is protected.
- Flat black, white text, cyan headings, yellow actions, green recording meter.
  Gray secondary labels remain high contrast. No simulated scanlines, glow,
  gradients, shadows, rounded panels, or decorative cabinet bezel.
- Press Start 2P, uppercase, normal weight. Main text uses 2.5% of screen width;
  supporting labels use 2%. Test at the actual CRT resolution and viewing distance.
- One task per screen, no scrolling or sidebars. Paginate long recognized requests
  and game instructions with a MORE button; preserve words rather than clipping.
- The game API remains 256×224 with a default 16-color palette plus optional per-sprite palettes. The guide's 320×240 example
  is not an engine migration. Fit games without stretching; use pixelated scaling.
  Fractional output scaling still needs physical CRT validation.

## Physical input

All keyboard, panel and badge input passes through the same shell handler.
The panel is a joystick and four buttons, A B X Y in a diamond. X is START and
Y is TALK (`PANEL_ROLES` in `apps/cabinet/app/input.ts`; sticker the buttons to
match). The board is a USB HID gamepad ("ESP32-S3 Arcade Controller"), read
through the Gamepad API by `attachGamepad` and replayed as the numpad codes
(8 2 4 6 for the stick, 1 3 7 9 for A B X Y), which are also what the keyboard
and the tests press; F3 shows a simulated panel whose buttons send those codes,
lights on every player-one press and names the last code it received. It sits
in the gutter beside the game.
`docs/encoder-bringup.md` is the procedure for mapping the real board.

Who plays is fixed by the player count, never decided per press. A
one-player game is played on the cabinet controls; a plugged-in badge only
names the score and its buttons are ignored during play. A two-player game
is played on the two badges (hub slot 1 and 2); the cabinet controls are
ignored during play except START, which pauses from anywhere. On every other
screen the panel and any badge both work the menus. Off the cabinet (no
`?cabinet=1`) the keyboard stands in for the badges in a two-player game so
it can be developed on a laptop.

| Control | Menu / voice / ready | During 1P play | During 2P play |
| --- | --- | --- | --- |
| Stick | Select; left/right page through text | Game movement | Ignored |
| A | Confirm | Game action A | Ignored |
| B | Back or cancel | Game action B | Ignored |
| START (X) | Confirm / play / resume | Pause to menu | Pause to menu |
| Hold TALK (Y) | Record only after choosing player count | No action | No action |
| Release TALK | Stop mic, transcribe locally when recording | No action | No action |
| Badge d-pad, A, B | Same as the panel | Ignored | Player 1 or 2 by slot |
| Badge START | Confirm / play / resume | Ignored | Pause to menu |

Development keyboard: arrows, Z=A, X=B, Enter=START, Space or V=TALK.
Escape cancels or opens menu, P pauses, R opens Ready to restart, F fullscreen,
F3 toggles the simulated panel. The kiosk opens `/?cabinet=1`, which makes the
play legend's keycaps the panel letters (A, B) instead of the keyboard hints
(A / Z, B / X) and hides the player-two keyboard hint.
Player-two development keys remain I/J/K/L/N/M; M is not a global mute key.
Sound and fullscreen are available in Options. Player count is the first choice,
not an option buried in settings. Keep the development input bindings working,
but do not advertise STICK, START: OK or B: BACK before the cabinet controls exist.
Shell buttons use plain labels such as CANCEL, MAKE GAME and PLAY; the actual
game's movement and action legend stays visible during play.

## Flow

The home screen shows muted gameplay from the verified local catalog. Cropped
still previews of the previous and next games peek in beside the animated center
game. Swipe the center, click a side preview, or move the stick left/right to browse.
There are no arrow glyphs, ARCADE heading, demo label or position counter. Only
the selected game and its two neighbors are prefetched, with a bounded local cache.
Up/down moves
between the game, player count, PLAY, MAKE A GAME, Resume and Options. The
1 PLAYER / 2 PLAYERS row applies to the demos only and follows the badges (two
in: 2P) unless overridden. MAKE A GAME never asks: both versions are built.

PLAY opens the selected game's instructions; a second PLAY starts the real run.
The home preview uses synthetic inputs in a separate sandbox and never starts the
playable game, records a score, or calls a model. Reduced motion displays a still.
Leaving home stops the preview. Returning home remembers the selected demo and
mode; RESUME GAME preserves the current run and its own player count.
While home is visible, refresh the catalog every five seconds and when focus
returns. Preserve the selected game by ID and the player mode. Revision-bound
preview/detail caches replace changed code; a temporary refresh failure keeps
the current menu usable.

MAKE A GAME → hold to talk → transcribing → read-only review → building → ready →
playing → results. Building makes two versions at once, a one-player game for
the cabinet controls and a two-player game for the badges; the build screen
follows the one the badges call for and says the other is building too. READY
opens as soon as that version lands, with a line naming it (1 PLAYER · CABINET
CONTROLS or 2 PLAYERS · BADGES) and whether the other version is switchable,
still building or could not be made. Up/down switches; until someone does,
the version on screen follows the badges (plug both in for 2P). MAKE A GAME opens voice with the microphone off; only holding
TALK starts recording. MAKE GAME confirms the transcript; PLAY separately starts
the finished game. Real gameplay never autoplays.
No text-entry fallback, step bar, or promotional tagline. Voice changes/remixes
are disabled. To create another game, return home and choose MAKE A GAME first; TALK is
ignored outside the voice screen, including during play, Ready, results, options
and generation. Existing games are never
sent as context to the cabinet generation endpoint.

The microphone opens only while TALK is held, with a 30-second cap and no visible
timer. A centered 160×40 pixel waveform reacts to microphone volume and speech
frequencies, with tapered edges and a quick attack / gentle decay. Audio is transcribed on this Mac by
faster-whisper tiny.en after release. Cancellation releases audio resources.

The build screen adapts the original main-branch code stream to the CRT layout:
one yellow heading for the actual writing/testing/repair status. A green code
stream sits beside a visual preview within the same cyan horizontal rules.
Up to three literal sprites take shape row by row. Once enough initialization
and drawing code arrives, the preview shows the actual scene, including characters
drawn with procedural helpers. The small gray DRAFT label distinguishes it from
the verified game. Until art arrives, the panel says WAITING FOR ART.
Before code arrives, four yellow pixels pulse (static with reduced motion).
No telemetry counters, estimated percentage, or LIVE BUILD header. One candidate is shown coherently when builders race;
the final winning game can differ from that draft. Repairs start a new code feed.
The preview never executes code in the
cabinet window: a completed statement prefix of draw is tried in a disposable
worker inside an opaque-origin iframe, with network access disabled by CSP.
Syntax/missing-dependency errors keep the last good image. A one-second watchdog
terminates stuck drafts; cleanup stops the worker, with a two-second heartbeat
expiry if the iframe disappears before cleanup is delivered. The preview
is muted, has no player input, and does not advance the actual playable game.

Code uses a monospace face at 2% of screen width and preserves case;
labels retain the uppercase pixel font. Eleven lines wrap at 30 characters within
a fixed window. The preview preserves runtime sprite palettes and pixelated aspect-preserving
scaling. The cursor stops during testing; reduced-motion removes blinking and
renders a still draft instead of its animation. CANCEL stops generation, and PLAY
starts the ready game. The build header does not advertise TALK while recording is
unavailable.

Generation failures return to transcript review with the idea and player count
intact. Account limits, missing credentials and temporary service failures show
short, sanitized explanations. Retrying is explicit; never automatically loop
on an account limit. An unrelated library fallback cannot overwrite a failure
or replace the requested game. A failed candidate does not cancel another
candidate that is still building. The current game remains available via CANCEL.
A runtime crash can load a clearly labelled fallback, waiting at Ready for START.

Menus, voice, and loss of focus pause the game and clear held game inputs.
Returning from voice cancellation or choosing Resume preserves the running game.
The player header stays visible during play: P1 and the badge name at top left,
P2 at top right in two-player mode, with a small badge-colour marker. Guests
show GUEST. Names stay white for contrast; long names truncate within their corner.
The game viewport reserves room beneath the header as well as above the controls.
During play, a compact legend gives each mapped input its own column, with Z/X
keyboard equivalents for A/B. Short reminders retain explicit modified actions
such as DOWN+A: SWEEP and DOWN+B: SPECIAL. P2 keyboard hints share the lower
START/PAUSE row. Detailed descriptions remain on Ready;
play shows short action reminders instead of generated paragraphs. The viewport
reserves the legend’s measured height, capped at 20% of screen width so a verbose
mapping can never collapse the game area. Verify long six-button mappings at CRT
sizes as well as simple movement/jump games.
Sound starts on during play; Options can mute it. Home previews, Ready, building,
voice input and paused games stay silent. Final sound effects can finish on the
results screen. Reduced-motion disables blinking and working-meter movement;
real measured microphone feedback remains visible. Errors use alerts and buttons
have visible focus outlines. No setup keys or implementation details in play.

## Physical acceptance still needed

Confirm output resolution, CRT overscan, refresh/interlace behavior, viewing-distance
legibility, the USB encoder's actual keycodes, microphone, and cabinet speakers.
The 8% safe area is a provisional margin, not a claim of calibration to this CRT.
Browser screenshots verify layout but do not substitute for that hardware check.


## Badge controller screen

The badge uses a flat black 320×240 layout, yellow Arcade heading, full cyan
PLAYER 1 / PLAYER 2 label, white player name and controls, and a yellow footer.
The font is the cabinet's Press Start 2P raster on its native 8×8 grid, scaled by
whole pixels. Long control lists page every four seconds, wrapped to 18 characters
for the 16px text. Exact identity metadata retains original casing separately.
Glyphs use compact RGB565 font atlases and reuse their UI widgets across updates.
The title and footer are pre-rendered font images to leave memory for instructions.
`bench/screenshots/badge/font-layout-preview.png` verifies the pixel layout; the
firmware console screenshot command can crash when it encounters file images.
