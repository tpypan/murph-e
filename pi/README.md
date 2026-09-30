# Raspberry Pi arcade

The Pi 5 runs the verified 16-game catalog as a solo arcade. The cabinet opens
at login and the local server restarts if it exits. No model key or microphone
is needed. `MURPH_PI=1` removes player selection and game creation from the menu,
disables speech and generation on the server, and hides the mouse cursor. Saved
games and the regular development cabinet keep their existing behavior.

This directory contains the Pi service, kiosk launcher, and installer. Shared
game and cabinet code remains in `library/` and `apps/cabinet/`.

## Install on the existing OS card

Do not reimage the card. In `/home/arcade/murph-e`, run `bash pi/install.sh`
as `arcade`. The installer builds the app, saves previous service and launcher
files as `.previous`, installs the user service, and adds the kiosk to labwc
autostart only if absent. It needs no root privileges. The service binds only to
`127.0.0.1:3000`; Chromium waits for it before opening.

To check it: `systemctl --user status murph-e.service`, then
`curl -fsS http://127.0.0.1:3000/api/demos`. Generation and speech POSTs must
return HTTP 403. Rebooting should return to the game carousel automatically.
`PATH="$HOME/.local/opt/node-v24/bin:$PATH" node pi/smoke-test.cjs` uses the
system Chromium to check all 16 solo games and play, pause, resume, result, and
replay at 640x480. It never calls a model provider.

## Controller and display

The ESP32-S3 Arcade Controller uses the browser Gamepad API. The stick browses
left/right, A chooses a game and then starts it from Ready, X pauses to the
carousel, and B returns to the carousel from Ready/results. The cabinet URL is
`/?cabinet=1`, so the on-screen labels match the physical controls.
The credit banner stays at the top in every screen: “made with <3 by zane & tony”.

The page preserves a centered 4:3 image with an 8% safe area. The existing
Samsung monitor remains at its detected 1920x1080 mode. Do not force a CRT
mode before connecting the HDMI-to-AV converter and checking its detected
input modes. The Sony KV-27FS100L takes the converter's analog NTSC signal;
calibrate overscan and text legibility with the actual converter and screen.

The service and kiosk are user files. Privileged display, boot, or account
changes should wait until sudo authentication is working.
