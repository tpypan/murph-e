# Hacker badge integration: identity and badge-as-controller

Researched 2026-09-19 from badge.hackthenorth.com, the IDE README
(`badge.hackthenorth.com/ide/README.md`, the full Lua API reference), the
IDE client script, the Notion manual and the badge rules. Nothing below has
been tested on a physical badge yet; section 6 is the list of things to verify
in the first ten minutes of having one in hand.

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

The USB push protocol, read from the IDE's client script, is small enough to
reimplement in an afternoon:

```
<CR>                      -> wait for "badge> "
mkdir /littlefs/apps/<slug>
put /littlefs/apps/<slug>/main.lua <bytes>   -> wait "READY", send bytes in
                                               paced chunks, wait "OK <bytes>"
put ... manifest.cfg <bytes>
reload                    -> wait "reload:"   (launcher rescans apps)
```

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

## 3. Identity and high scores: NFC will not do it, the wire or a QR will

The vision was "tap your badge on our reader." The badge is the reader. Two
readers do not read each other, so a USB NFC reader on the cabinet would see
nothing when a badge is held to it. Flip it around and it still does not
help: an NFC sticker on the cabinet lets the *badge* know it is at the
arcade, but the badge then has to tell the *cabinet* who it is, which needs
the wire or the radio anyway. NFC adds a step and no information.

Three ways to get a badge ID into the cabinet, cheapest first:

1. **The wire.** When the arcade app starts it logs
   `ARCADE HELLO <badge_id> <name>` over serial. Plugging in is tapping in.
   This is the multiplayer mode's identity for free.
2. **The boot QR code.** Every badge shows a QR code on boot that is "your ID
   for check-ins and food." A USB barcode scanner (types keystrokes, no
   driver, ~$25) on the cabinet lets a single-player tap in by showing their
   badge to the scanner, with no app installed on their badge at all. What
   the QR encodes is unverified; if it is a URL or an opaque token it still
   works as a stable key for our leaderboard, just without a display name.
3. **BLE broadcast.** The arcade app broadcasts `ARCADE HELLO <badge_id>`
   when they press A near the cabinet. Depends on the unknowns above.

Plan: 1 for multiplayer, 2 for single-player. Both feed one leaderboard
keyed by badge ID. If the QR is unreadable or missing, single-player tap-in
falls back to plugging in the badge for a second.

## 4. The two modes

**Mode 1, single player on the cabinet controls.** Joystick plus 4 buttons
on the USB encoder. Tap-in via QR is optional and only affects whether the
score gets a name. Nothing changes in the game runtime.

**Mode 2, multiplayer on badges.** Players plug in. The cabinet auto-installs
the arcade app if the badge does not have it (section 1 protocol, a few
seconds), the player opens it from the launcher, and the badge becomes
controller N with their name and colour. The game runtime already takes a
player index on every input call (`btn('left', n)`), so this is a new input
source, not a new runtime. The badge screen can show their colour and score,
and the six LEDs can flash on hit or win, which is a genuinely good arcade
moment and costs a few lines of Lua.

What the generator needs to know: the spec step gets a `players` field
(1 to 4) and the multiplayer templates (versus, co-op survival, party
mini-games) go in the prompt with the same-screen constraint spelled out.
Every player is on the one cabinet monitor. Split screen at 256x224 is
unreadable; design for a shared arena.

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
- Optional: the cabinet writes nothing back for v1. If the serial console
  turns out to deliver text to a running app (unknown), the cabinet can
  drive the LEDs and a score label; otherwise the badge just shows "connected"
  and its colour.

Reading the wire on the Mac: Node `serialport`, one listener per port,
lines parsed into `{badgeId, button, down}` and fed to the runtime's input
layer alongside the encoder's keycodes. Hot-plug: enumerate ports with the
Espressif vendor ID, open new ones, drop closed ones.

## 6. Verify with a real badge before building any of this

In order, each takes a minute:

1. Plug in, open the IDE, push the Nearby Hello example. Confirms the push
   protocol matches `app.js` and the firmware version (the README says limits
   changed on 2026-09-16; older firmware has a 6 ms tick and 20 ms button
   budget, which still fits one log line).
2. Push a five-line app that logs a button event and watch the IDE console.
   Confirms `badge.sys.log` reaches USB serial while an app runs, and its
   exact line format (it is "tagged with the app slug").
3. Photograph the boot QR code and decode it. Decides identity option 2.
4. With two badges, open Nearby Hello on both and run a BLE scanner on the
   Mac (`bleak` in Python, or `noble` in Node) while pressing A. If the
   payload shows up in manufacturer or service data, the wireless path is
   open. Then hammer A to find the send rate limit.
5. Time a badge-to-badge Share of the arcade app. That number is how long
   it takes to onboard a player who has never plugged in.

Only step 4 can fail in a way that changes the design, and the design
above does not depend on it.

## 7. Cost and risk summary

| item | cost | risk |
|---|---|---|
| Wired badge controller | serialport listener, ~150 lines Lua, a USB hub and 4 cables | low; protocol is fully documented in the IDE client |
| Auto-install on plug-in | reimplement the push flow, ~100 lines TS | low |
| QR tap-in | a USB barcode scanner | low; QR content unverified |
| BLE controller | BLE scanner on the Mac plus rate testing | high; two unknowns, and lossy by nature |
| NFC reader on the cabinet | a reader nobody's badge can talk to | do not buy one |
