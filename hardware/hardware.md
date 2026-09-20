# Murph-E Hardware Stack

Murph-E was built as a **physical, full-size generative arcade machine** around a deliberately improvised hardware stack.

Instead of putting a web app on a laptop and calling it an arcade machine, we built the entire interaction chain ourselves: a **27-inch Sony Trinitron CRT**, an old **Intel i3 Mac mini**, **custom analog arcade controls**, an **ESP32-S3 USB controller**, **Hack the North badges running injected Lua controller software**, a microphone, custom CAD, 3D-printed mechanical parts, and a cabinet frame made by **angle-grinding and rebuilding an old steel tire rack**.

The end result was a machine where someone could walk up, describe a game out loud, watch it get generated, and then immediately play it on real physical hardware.

---

## The CRT display stack

The centerpiece of the cabinet is a **Sony KV-27FS100L**, a 27-inch FD Trinitron WEGA CRT.

That created an interesting problem immediately: our Mac mini speaks modern digital HDMI, while the television expects an analog composite NTSC signal.

Our video chain became:

**Mac mini → HDMI → active HDMI-to-composite conversion → RCA composite video/audio → Sony KV-27FS100L**

The converter takes the Mac's digital HDMI output and produces the familiar:

- yellow RCA for composite video
- red and white RCA for analog audio

Those feed directly into the Sony's AV inputs.

We also designed the software around the CRT instead of treating it as an afterthought. Murph-E's games use a **256×224 retro framebuffer**, pixel-perfect scaling, a 4:3 interface, and CRT-safe margins. The whole UI was designed to look intentional on an actual tube rather than like a modern webpage squeezed onto an old television.

So the graphics path ultimately goes all the way from generated JavaScript running on a Mac mini to an **analog NTSC signal illuminating phosphor inside a 27-inch CRT**.

---

## Hack the North badges as the main controllers

One of the most unusual parts of Murph-E was turning the **Hack the North 2026 hacker badges themselves into game controllers**.

Every attendee already had an ESP32-C3 badge with:

**UP, DOWN, LEFT, RIGHT, A, B, START and HOME**, a colour LCD, LEDs, USB-C, and a Lua application environment.

Rather than requiring players to pair some separate controller, we made their event badge become the controller.

### Plugging in a badge

Players connect their HTN badge to the cabinet through USB-C.

The Mac detects the badge's USB serial interface and talks directly to the badge firmware console.

Murph-E then checks whether our arcade application is already installed.

If it is not, the cabinet **injects our Lua controller application directly onto the badge over USB**.

The process is essentially:

```text
Badge connected
      ↓
Mac detects ESP32-C3 serial device
      ↓
Cabinet queries installed badge apps
      ↓
No Murph-E arcade app?
      ↓
Create app directory on badge
      ↓
Inject main.lua + assets over serial
      ↓
Reload badge app list
      ↓
Player opens ARCADE
      ↓
Badge becomes a Murph-E controller
```

We reverse-engineered and implemented the badge's USB application push protocol so the entire process could happen from the cabinet itself.

The Lua source is transferred in small paced chunks because the badge has a very small receive buffer. Once installed, the same application can stay on the badge for future games.

---

## The Lua controller application

The injected Lua application turns the badge into a low-latency arcade input device.

When the player opens it, the app reads their badge identity using the badge API and sends a handshake back to the Mac over USB serial:

```text
ARCADE HELLO <badge_id> <name> <r> <g> <b>
```

That gives Murph-E:

- a persistent badge ID
- the player's display name
- their badge colour
- the USB port associated with that player

From that point onward, every physical badge button generates a serial event.

For example:

```text
B 5 1
B 5 0
```

representing a button press followed by its release.

Murph-E parses those events on the Mac and converts them into the exact same normalized input events used by the game runtime.

So from the generated game's perspective, it does not matter whether an input came from a badge, keyboard, or cabinet controller. It simply receives something like:

```text
player 1 → left → down
player 1 → left → up
player 2 → A → down
```

That abstraction made it possible for arbitrary newly generated games to work with the badges without knowing anything about USB, serial communication, ESP32 hardware, or Lua.

---

## Two physical badges at once

We verified the system with **two real HTN badges simultaneously connected to the Mac**.

Each badge enumerates as its own USB serial device, so Murph-E maintains an independent reader for each one.

We tested:

- both badges connected simultaneously
- independent player identity
- every badge button
- press and release events
- overlapping inputs
- one player holding a direction while another player presses something
- installing the app onto one badge while the other remains connected
- unplugging and reconnecting badges

Murph-E assigns players according to their badge connection/session and routes their inputs independently into the game.

That means the physical interaction for a multiplayer game can literally be:

```text
PLAYER 1 BADGE ─┐
                ├── USB-C HUB ── MAC MINI ── GENERATED GAME
PLAYER 2 BADGE ─┘
```

The badges are therefore not just authentication tokens or score IDs.

They are the **primary player input devices for multiplayer Murph-E games**.

---

## Using the badge itself as part of the UI

The badge screen also becomes part of the arcade cabinet.

Our Lua app displays the player's:

- name
- player number
- current control mappings
- arcade branding
- contextual instructions

We eventually reproduced the cabinet's **Press Start 2P-style typography** on the 320×240 badge LCD using custom raster assets.

Because the Lua environment has tight memory limits, this required careful optimization. Early versions exhausted the badge's available memory, so we changed the renderer to reuse UI objects and moved glyph image data out of Lua memory.

The final version stayed within the badge's application limits while remaining stable across repeated controller updates.

So the player's conference badge effectively transforms into a tiny personalized arcade controller display when it is plugged into Murph-E.

---

## Our custom physical arcade controller

Alongside the badges, we also built a completely custom cabinet controller.

We salvaged an **analog joystick mechanism from an existing controller board**, desoldered it, and treated its two potentiometers as independent X and Y position sensors.

Rather than using a normal digital four-switch arcade joystick, ours measures continuous analog position.

The two potentiometers run at **3.3 V**, with their wipers feeding ADC inputs on an **ESP32-S3 SuperMini**.

The final wiring uses:

```text
Joystick X → GPIO 6
Joystick Y → GPIO 7

A → GPIO 8
X → GPIO 9
Y → GPIO 10
B → GPIO 11
```

The four buttons are arranged in a conventional arcade/gamepad-style diamond.

---

## Designing the joystick mechanically

The salvaged joystick mechanism was tiny and never intended to have a full arcade stick attached to it.

We measured its stem at only a few millimetres across, with a roughly **7.5 mm recessed socket**, and designed our own mechanical adapter around it.

The Murph-E repository contains the real CAD for:

```text
arcade_controller_base
button
joystick_arm
joystick_head
```

including both SolidWorks source parts and printable STL files.

We designed and 3D printed a larger joystick arm and arcade-style top which mechanically transfer the player's hand movement down into the small salvaged analog joystick assembly.

So the physical control path is literally:

```text
Player's hand
    ↓
3D-printed arcade joystick head
    ↓
Custom joystick arm
    ↓
Salvaged joystick mechanism
    ↓
Two potentiometers
    ↓
ESP32 ADC
```

---

## Custom controller electronics

We also designed the joystick electronics in **KiCad**.

The analog circuit includes two **10 kΩ potentiometers**, one for each axis, feeding the ESP32 through analog conditioning/filtering.

Each axis includes a resistor/capacitor network to smooth electrical noise before reaching the ADC.

The ESP32 reads the joystick using its 12-bit ADC, giving a raw range of approximately:

```text
0 → 4095
```

rather than simply reading four digital directions.

---

## Turning the ESP32 into a real USB gamepad

The ESP32-S3 does not just stream numbers over serial.

We wrote firmware that makes it enumerate directly as a **USB HID game controller** using TinyUSB.

To the Mac, the homemade controller therefore appears as a normal gamepad:

```text
ESP32-S3 Arcade Controller
```

The firmware exposes both:

- a USB HID gamepad
- a USB CDC serial debugging interface

as a single composite USB device.

That meant Murph-E could use the standard browser Gamepad API while we could still inspect diagnostics over serial.

---

## Automatic analog calibration

A salvaged potentiometer rarely sits at exactly half of its electrical range when physically centered.

So every time the controller starts, the firmware samples the joystick **128 times** while it is resting at neutral.

It calculates the real physical center:

```text
centerX = average of 128 X samples
centerY = average of 128 Y samples
```

All subsequent movement is measured relative to those values.

The firmware then applies:

- independent positive and negative scaling
- a center deadzone
- 12-bit ADC normalization
- Y-axis inversion
- output clamping
- button debouncing

The final joystick values are converted into standard HID coordinates from approximately:

```text
-127 → +127
```

with right and up treated as positive.

---

## 250 Hz controller updates

The ESP32 sends a complete HID gamepad report roughly every **4 ms**, giving us an update rate around:

**250 Hz**

That keeps the homemade analog controller responsive enough for platformers, fighting games, racing games, shooters, and the other arbitrary genres Murph-E can generate.

The generated games do not need any special ESP32 code. They simply receive ordinary normalized controller inputs from the runtime.

---

## Voice as another physical input

The arcade also has a microphone built into its interaction loop.

Instead of selecting a game from a menu, the player can hold the cabinet's **TALK** control and simply describe one.

For example:

> "Make me a two-player game where we're wizards fighting on moving platforms."

The microphone records while TALK is held. When released, the audio is transcribed and passed into Murph-E's game-generation pipeline.

The same physical machine therefore combines two radically different input systems:

**natural-language voice for creating the game, physical controls for playing it.**

---

## Building the cabinet from a tire rack

A 27-inch Trinitron is very different from mounting a modern LCD.

The KV-27FS100L weighs roughly **100 lb**, with a huge amount of that mass extending backward from the screen.

We needed something far stronger than a lightweight wooden monitor mount.

Our solution was an **old steel tire/storage rack**.

Instead of building a conventional arcade frame first and hoping it supported the television, we treated the rack as the structural skeleton of the entire machine.

We used a **4½-inch angle grinder** to cut and reshape the rack into the proportions we needed.

The repurposed rack gave us:

- a heavy steel frame
- enough strength for the CRT
- an elevated monitor position
- a lower equipment compartment
- space for the Mac mini and electronics
- wheels/casters so the enormous cabinet could still be moved

We then designed the rest of the machine around that hacked-up steel frame.

---

## The hardware build process

Murph-E ended up requiring a surprisingly wide range of fabrication work for a software-heavy hackathon project.

We were:

- angle-grinding steel
- drilling and modifying an existing rack
- soldering custom electronics
- desoldering salvaged controller components
- measuring tiny mechanical interfaces with calipers
- designing parts in SolidWorks
- 3D printing joystick components
- drawing controller circuits in KiCad
- programming ESP32 USB firmware
- reverse-engineering HTN badge serial protocols
- injecting Lua applications onto ESP32-C3 badges
- debugging analog joystick signals
- converting HDMI back into NTSC composite video
- integrating all of it with the Mac mini

The hardware was being designed at the same time as the generative software.

---

# The Complete Input Pipeline

The most interesting part of Murph-E is that every layer connects cleanly into the next.

For the HTN badges:

```text
Player presses button
        ↓
HTN ESP32-C3 badge
        ↓
Injected Murph-E Lua application
        ↓
USB serial button event
        ↓
Mac mini badge hub
        ↓
Normalized player input
        ↓
Murph-E runtime
        ↓
AI-generated game
```

For the homemade cabinet joystick:

```text
Player moves joystick
        ↓
3D-printed arcade stick
        ↓
Salvaged potentiometers
        ↓
ESP32-S3 ADC
        ↓
Calibration + filtering
        ↓
USB HID gamepad report
        ↓
Mac mini
        ↓
Murph-E runtime
        ↓
AI-generated game
```

And the display runs in the opposite direction:

```text
Generated game
        ↓
256×224 Murph-E runtime
        ↓
Mac mini HDMI
        ↓
HDMI-to-composite converter
        ↓
Analog NTSC video
        ↓
Sony KV-27FS100L
        ↓
CRT electron beam
        ↓
Phosphor
        ↓
Player sees the game
```

---

# From the Player's Hand to the Phosphor

Murph-E's hardware was not a cosmetic cabinet assembled around finished software.

The **CRT, analog video conversion, Mac mini, microphone, ESP32-S3 controller, custom joystick electronics, CAD, 3D-printed controls, HTN badge USB protocol, injected Lua controller app, multiplayer badge hub, and angle-ground steel chassis** were all designed as parts of the same machine.

A player can walk up with the badge they were already given at Hack the North, plug it into our cabinet, have Murph-E automatically load our controller software onto it, speak an idea for a game, and then use that same badge to play the newly generated game seconds later.

We effectively built the entire interaction path ourselves:

**from the player's voice and hands, through two different ESP32 systems and a Mac mini, all the way to the phosphor on a 27-inch Sony CRT.**
