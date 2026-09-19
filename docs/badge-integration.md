# Hacker badge integration: identity and badge-as-controller

Researched 2026-09-19 from badge.hackthenorth.com, the IDE README
(`badge.hackthenorth.com/ide/README.md`, the full Lua API reference), the
IDE client script, the Notion manual and the badge rules. Nothing below has
been tested on a physical badge yet; section 6 is the list of things to verify
in the first ten minutes of having one in hand.

Revised 2026-09-19, later the same day: the QR scanner is gone. The USB-C
cable is the only identity path, for single and two-player alike, and the
player count is an explicit 1P/2P choice on the attract screen. Sections 3
and 4 carry the reasoning.

## 1. What the badge is

| part | fact | source |
|---|---|---|
| SoC | ESP32-C3 (has Wi-Fi and BLE 5 in silicon; Lua exposes only a BLE broadcast channel) | badge site |
| Screen | 320x240 colour, LVGL widgets | site, README |
| Buttons | UP DOWN LEFT RIGHT A B START HOME, plus an `AUX1` in the enum. `on_button(button, kind)` gives PRESSED and RELEASED events; `badge.input.held()` gives a bitmask | README `badge.input` |
| LEDs | 6 RGB, individually addressable | README `badge.led` |
| Sensors | accelerometer: tilt, shake, tap | README `badge.sensor` |
| NFC | **a reader**, not a tag. `badge.nfc.card()` returns the UID of a card held to the badge; there is no tag-emulation or tag-writing API | site ("NFC Reader"), README `badge.nfc` |
| Radio | `badge.radio.send(payload)` broadcasts 1 to 44 bytes over BLE to every badge in range with a `LUA1` prefix; `on_recv(mac, rssi, payload)` receives. No Wi-Fi, HTTP, GATT or sockets from Lua | README `badge.radio` |
| USB | USB-C, enumerates as "USB JTAG/serial debug unit" (Espressif). 115200 baud console with a `badge> ` prompt. `badge.sys.log("...")` writes one line to that serial port | IDE `app.js`, README `badge.sys` |
| Identity | `badge.me.badge_id()`, `badge.me.name()`, `badge.me.role_name()`, `badge.me.color()`. No email or socials | README `badge.me` |
| Apps | Lua, sandboxed, one `main.lua` plus `manifest.cfg`, 48 KiB heap, 64 KiB source. Installed by USB push from the IDE or badge-to-badge over Bluetooth with the built-in Share app | README |
| Power | 2x AA. Manual says switch the battery OFF before plugging into USB; the badge then runs on USB power | manual |
| Rules | software interaction is explicitly allowed; hardware modification and unsupported accessories are not. Custom firmware would wipe the event firmware the badge needs as their ID, so it is out | rules page |

The USB push protocol, read from the IDE's client script
(`ide/app.js?v=single-file-app-20260916`), is small enough to reimplement
in an afternoon. Lines end in a bare CR, not CRLF; the console is
115200 baud:

```
<CR>                      -> wait for "badge> "   (fail fast if it never comes)
mkdir /littlefs/apps/<slug>          -> wait "badge> "
put /littlefs/apps/<slug>/main.lua <bytes>   -> wait "READY", send bytes,
                                               wait "OK <bytes>"
put ... manifest.cfg <bytes>         -> same
reload                    -> wait "reload:"   (launcher rescans apps)
```

The console also answers `apps` (lists installed apps, so the cabinet can
skip the push for a badge that already has ours), `cat`, `rm`, `heap` and
`uitree`. There is **no console command that prints the badge ID or name**,
and none that launches an app. Identity is only reachable from Lua, through
`badge.me`, which means the arcade app has to be installed and opened by the
player before the cabinet can know who they are. The README also states
that serial input does not reach a running app: the wire is one-way, badge
to cabinet, while a game is on.

## 2. The two channels a badge can talk to the cabinet on

**Wired: USB-C serial.** A Lua app on the badge calls `badge.sys.log()` on
every button press and release. The Mac reads the serial port. This is a
plain wire: millisecond latency, no packet loss, no pairing, and the same
port the app was installed over. One cable per player into a USB hub.

**Wireless: BLE broadcast.** The same app calls `badge.radio.send()` on each
button event. A BLE scanner on the Mac reads the advertisement payloads. Two
unknowns make this the risky path: whether the `LUA1` frames are ordinary BLE
advertisements a Mac can see with CoreBluetooth (likely, since the badges see
each other's `mac` and `rssi` with no pairing, but not confirmed), and how
fast the firmware lets an app send (the README's example uses a one-second
cooldown and warns that a queued send is not a delivery). Even if it works,
BLE advertising is lossy and tens to hundreds of milliseconds late. That is
fine for a party game where you pick an answer or slam one button, and not
fine for a platformer.

Recommendation: **wired for controllers, and the wire also does identity.**
The cable is the honest answer to "how do we get 100 ms input from a device
that only exposes a broadcast radio." Keep BLE as the stretch path for a
"tap in from anywhere in the crowd" experience once the wired one works.

## 3. Identity and high scores: the wire, and only the wire

The vision was "tap your badge on our reader." The badge is the reader. Two
readers do not read each other, so a USB NFC reader on the cabinet would see
nothing when a badge is held to it. Flip it around and it still does not
help: an NFC sticker on the cabinet lets the *badge* know it is at the
arcade, but the badge then has to tell the *cabinet* who it is, which needs
the wire or the radio anyway. NFC adds a step and no information.

**Decision: plugging in is tapping in.** One gesture does identity in both
modes and doubles as the controller in 2P mode. The boot QR code plus a USB
barcode scanner was considered and dropped: it is a second identity code
path, a hardware purchase, and it rests on an unverified guess about what
the QR encodes. BLE broadcast stays a tier 3 stretch (section 2).

What happens when a badge is plugged in, in order:

1. The cabinet sees a new serial port with the Espressif vendor ID and
   opens it. It sends a CR and waits for `badge> `.
2. It sends `apps`. If `arcade` is not in the list, it pushes the app with
   the section 1 protocol. Under ten seconds; the app is about 150 lines.
3. The screen says "OPEN ARCADE ON YOUR BADGE AND PRESS A". The player
   opens the app from the launcher. This step cannot be skipped: nothing on
   the console can read `badge.me` or launch an app for them.
4. The app's `on_enter` logs `ARCADE HELLO <badge_id> <name> <r> <g> <b>`.
   The cabinet now has a stable key and a display name. The screen says
   "HI, <NAME>" and the badge shows its player colour.
5. Unplugging drops the port. The player stays attached to the current
   session until the game ends, so a knocked cable does not lose a score.

A returning badge skips step 2, so the second time it is plug in, press A,
done. The leaderboard is keyed by `badge_id`. The README says the ID is not
a proof of authentication, which is fine for an arcade leaderboard.

**Identity never blocks play.** It only decides whether a score gets a
name. The attract screen invites people to plug in, but a single player can
hold TALK without a badge and plays as GUEST, and can plug in at any point
before the game-over screen, including while the build is streaming, which
is 30 seconds they are already waiting anyway. This keeps hard rule 5: the
cabinet never waits on a badge.

## 4. The two modes, chosen up front

Before anyone speaks, the attract screen asks **1 PLAYER or 2 PLAYERS**,
picked with the stick and A. The choice sets the spec's `players` field
directly. The model does not infer player count from the transcript any
more; "a two-player game" said in 1P mode gets built as a one-player game
and the title card says so. An explicit choice is more reliable than
inference and lets the spec step pick the multiplayer templates
deterministically. It adds nothing to the latency budget because it happens
before speech.

**1P: the cabinet controls.** Joystick plus 4 buttons on the USB encoder.
A plugged-in badge is optional and only affects whether the score gets a
name. Nothing changes in the game runtime.

**2P: both players on badges.** The cabinet stick is not used. Both players
plug in; each badge gets the arcade app pushed if it is missing, each player
opens it, and the badge becomes controller 1 or 2 with their name and
colour, in the order the hellos arrive. The game runtime already takes a
player index on every input call (`btn('left', n)`), so this is a new input
source, not a new runtime. The badge screen shows the colour and number, and
the six LEDs flash on hit or chase on a win, which is a genuinely good arcade
moment and costs a few lines of Lua.

Sequence in 2P, arranged so the badge work hides under the build:

```
attract: pick 2P ──► "PLUG IN BOTH BADGES" ──► hold TALK, speak ──► BUILDING
                            │                                          │
                            └── push app to each new port as it appears,
                                wait for two ARCADE HELLO lines ───────┘
                                                                       ▼
                                             both hello'd: "PRESS START"
                                             one hello'd after the build:
                                             "WAITING FOR PLAYER 2 ...
                                              or press START to play 1P"
```

The push and the hello handshake run in parallel with the 30 second build,
so on a good day both badges are ready before the code is. If only one
badge has said hello when the game is ready, the screen offers 1P on the
cabinet stick after a short wait rather than blocking (hard rule 5).

Why both players on badges rather than player 1 on the stick: symmetric
controls are easier to explain, and both players get identified and put on
the leaderboard. The cost is two onboardings instead of one, which the
parallel push absorbs. Player 1 on the stick is the fallback above, not the
design.

What the generator needs to know: `players` is 1 or 2, set by the cabinet.
Two-player templates (versus, co-op survival) go in the prompt with the
same-screen constraint spelled out. Every player is on the one cabinet
monitor. Split screen at 256x224 is unreadable; design for a shared arena.
Two to four players is out of scope; two is enough to demo and keeps the
template set small.

## 5. The badge app

One Lua app, `arcade`, shared by both modes and small enough to travel by
badge-to-badge Share:

- `on_enter`: draw the title, player colour from `badge.me.color()`, and log
  `ARCADE HELLO <badge_id> <name> <r> <g> <b>`.
- `on_button`: log `B <button> <1|0>` on every press and release. Keep it to
  one short log line per event; the tick budget is generous but the serial
  ring on the badge is 256 bytes.
- Set `wake_lock=1` so the badge does not sleep mid-game, `home_button=0` so
  HOME still exits, `confirm_home=1` so a stray HOME asks first.
- The cabinet writes nothing back. The README states serial input does not
  reach a running app, so LED and screen feedback is driven by the Lua app
  from its own button events: flash on A, show the colour and player number,
  chase the LEDs when the player holds START on the win screen. Game state
  never reaches the badge.

Reading the wire on the Mac: Node `serialport` inside the cabinet's Next
server process (which already runs the pipeline in-process), one listener
per port, lines parsed into `{badgeId, button, down}` and forwarded to the
kiosk page, which posts them into the game iframe as the same
`{player, button, down}` events the encoder produces (hard rule 6).
Hot-plug: enumerate ports with the Espressif vendor ID, open new ones, drop
closed ones. Only one process can hold a port, so the IDE and the cabinet
cannot be connected to the same badge at once; that is fine on the floor.

## 6. Verify with a real badge before building any of this

In order, each takes a minute:

1. Plug in, open the IDE, push the Nearby Hello example. Confirms the push
   protocol matches `app.js` and the firmware version (the README says limits
   changed on 2026-09-16; older firmware has a 6 ms tick and 20 ms button
   budget, which still fits one log line).
2. Push a five-line app that logs a button event and watch the IDE console.
   Confirms `badge.sys.log` reaches USB serial while an app runs, and its
   exact line format (it is "tagged with the app slug").
3. **Hot-plug.** With the badge already on and sitting in the launcher,
   plug the cable in and check that the port enumerates and answers
   `badge> ` without a power cycle. The README's connect steps say "turn
   the badge off, plug in, turn it on", and the manual says to switch the
   battery off on USB. If a power cycle is really required, every plug-in
   costs the player a reboot and the on-screen instructions must say so.
4. **Console while an app runs.** Open Nearby Hello, then from the IDE
   console send `apps`. Decides whether the cabinet can push to badge two
   while badge one is already in the arcade app, and whether `reload`
   kicks a running app back to the launcher.
5. With two badges, open Nearby Hello on both and run a BLE scanner on the
   Mac (`bleak` in Python, or `noble` in Node) while pressing A. If the
   payload shows up in manufacturer or service data, the wireless path is
   open. Then hammer A to find the send rate limit.
6. Time a badge-to-badge Share of the arcade app. That number is how long
   it takes to onboard a player who has never plugged in.

Step 3 is the one that can change the on-screen flow; nothing here changes
the design. Step 5 only affects tier 3.

## 7. Cost and risk summary

| item | cost | risk |
|---|---|---|
| Wired badge controller and identity | serialport listener, ~150 lines Lua, a USB hub and 2 or 3 cables | low; protocol is fully documented in the IDE client |
| Auto-install on plug-in | reimplement the push flow, ~100 lines TS | low |
| Plug-in friction for single players | none in code; on-screen copy and the "plug in during the build" flow | medium; a required power cycle (§6 step 3) would make it worse |
| QR tap-in | dropped | not needed once the wire does identity |
| BLE controller | BLE scanner on the Mac plus rate testing | high; two unknowns, and lossy by nature |
| NFC reader on the cabinet | a reader nobody's badge can talk to | do not buy one |
