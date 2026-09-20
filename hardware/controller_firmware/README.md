# ESP32-S3 arcade controller firmware

The sketch exposes one TinyUSB composite device with a standard HID gamepad
and a CDC serial interface for diagnostics. The CDC port is not required for
the controller to work.

## Arduino IDE settings

- Board: `ESP32S3 Dev Module`
- USB Mode: `USB-OTG (TinyUSB)`
- USB CDC On Boot: `Disabled`
- Upload Mode: `USB-OTG CDC (TinyUSB)`
- CPU Frequency: `240MHz (WiFi)`
- Flash Mode: `QIO 80MHz`
- Flash Size: `4MB (32Mb)`
- Partition Scheme: `Default 4MB with spiffs`
- PSRAM: `Disabled`

The sketch intentionally fails compilation if USB Mode or CDC On Boot would
start the ESP32-S3 hardware USB/JTAG stack. It creates the TinyUSB CDC interface
itself so the product name, gamepad and debug port always enumerate together.

## Recovery upload

If the running application does not expose a COM port, hold **BOOT**, tap
**RESET**, release **BOOT**, select the newly appearing ESP32-S3 port, and
upload with Upload Mode temporarily set to `UART0 / Hardware CDC`. After the
new composite firmware boots, normal uploads can use its TinyUSB CDC port.

On Windows, a normal boot should show both `HID-compliant game controller` and
a USB serial COM port for VID `303a`. A missing COM port by itself does not mean
that an older HID-only build has failed; check the game-controller device too.

Leave the joystick centered for the first second after reset while its center
position is sampled.
