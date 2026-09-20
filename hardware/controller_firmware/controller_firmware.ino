#include <Arduino.h>
#include "USB.h"
#include "USBCDC.h"
#include "USBHIDGamepad.h"

#if ARDUINO_USB_MODE
#error "Select Tools > USB Mode > USB-OTG (TinyUSB); Hardware CDC/JTAG conflicts with the HID device"
#endif

#if ARDUINO_USB_CDC_ON_BOOT
#error "Set Tools > USB CDC On Boot > Disabled; this firmware adds TinyUSB CDC to the composite device itself"
#endif

USBCDC DebugSerial;
USBHIDGamepad Gamepad;

// ----------------------------------------------------
// Pins
// ----------------------------------------------------

const int JOY_X_PIN = 6;
const int JOY_Y_PIN = 7;

const int BTN_A_PIN = 8;
const int BTN_B_PIN = 11;
const int BTN_X_PIN = 9;
const int BTN_Y_PIN = 10;

// ----------------------------------------------------
// Joystick settings
// ----------------------------------------------------

const int ADC_MAX = 4095;

// Ignore a small region around center to prevent drift.
// Increase this if the stick jitters while untouched.
const int DEADZONE = 100;

int centerX = 2048;
int centerY = 2048;

// ----------------------------------------------------
// Button debounce
// ----------------------------------------------------

const unsigned long DEBOUNCE_MS = 5;

struct Button {
  int pin;

  bool rawPressed;
  bool stablePressed;

  unsigned long lastChange;
};

Button buttonA = {BTN_A_PIN, false, false, 0};
Button buttonB = {BTN_B_PIN, false, false, 0};
Button buttonX = {BTN_X_PIN, false, false, 0};
Button buttonY = {BTN_Y_PIN, false, false, 0};


// ----------------------------------------------------
// Read/debounce one button
// ----------------------------------------------------

bool readButton(Button &button) {
  bool current = (digitalRead(button.pin) == LOW);

  if (current != button.rawPressed) {
    button.rawPressed = current;
    button.lastChange = millis();
  }

  if ((millis() - button.lastChange) >= DEBOUNCE_MS) {
    button.stablePressed = button.rawPressed;
  }

  return button.stablePressed;
}


// ----------------------------------------------------
// Convert ESP ADC value to USB HID axis -127 ... +127
//
// Handles center not being exactly 2048.
// ----------------------------------------------------

int8_t convertAxis(int raw, int center, bool invert) {
  int delta = raw - center;

  // Center deadzone
  if (abs(delta) <= DEADZONE) {
    return 0;
  }

  int output = 0;

  if (delta > 0) {
    // Positive side
    int availableRange = ADC_MAX - center - DEADZONE;

    if (availableRange > 0) {
      output = map(
        delta - DEADZONE,
        0,
        availableRange,
        0,
        127
      );
    }
  }
  else {
    // Negative side
    int availableRange = center - DEADZONE;

    if (availableRange > 0) {
      output = -map(
        (-delta) - DEADZONE,
        0,
        availableRange,
        0,
        127
      );
    }
  }

  output = constrain(output, -127, 127);

  if (invert) {
    output = -output;
  }

  return (int8_t)output;
}


// ----------------------------------------------------
// Automatically determine joystick center at startup
// ----------------------------------------------------

void calibrateJoystick() {
  long sumX = 0;
  long sumY = 0;

  const int samples = 128;

  for (int i = 0; i < samples; i++) {
    sumX += analogRead(JOY_X_PIN);
    sumY += analogRead(JOY_Y_PIN);

    delay(2);
  }

  centerX = sumX / samples;
  centerY = sumY / samples;

  DebugSerial.print("Joystick center: X=");
  DebugSerial.print(centerX);
  DebugSerial.print(" Y=");
  DebugSerial.println(centerY);
}


// ----------------------------------------------------
// Setup
// ----------------------------------------------------

void setup() {
  pinMode(BTN_A_PIN, INPUT_PULLUP);
  pinMode(BTN_B_PIN, INPUT_PULLUP);
  pinMode(BTN_X_PIN, INPUT_PULLUP);
  pinMode(BTN_Y_PIN, INPUT_PULLUP);

  analogReadResolution(12);

  // 3.3 V joystick potentiometers
  analogSetPinAttenuation(JOY_X_PIN, ADC_11db);
  analogSetPinAttenuation(JOY_Y_PIN, ADC_11db);

  // USB device name shown by the computer
  USB.productName("ESP32-S3 Arcade Controller");

  // Register every interface before starting USB. Keeping HID and CDC under
  // TinyUSB avoids switching the USB pins between two incompatible stacks.
  DebugSerial.begin(115200);
  Gamepad.begin();
  USB.begin();

  delay(500);

  // IMPORTANT:
  // Leave the joystick centered while the controller powers up.
  calibrateJoystick();

  DebugSerial.println("Gamepad ready");
}


// ----------------------------------------------------
// Main loop
// ----------------------------------------------------

void loop() {
  // Read analog joystick
  int rawX = analogRead(JOY_X_PIN);
  int rawY = analogRead(JOY_Y_PIN);

  // X:
  //   right = positive
  //   left  = negative
  int8_t x = convertAxis(rawX, centerX, false);

  // Y:
  //   raw value decreases when moving upward,
  //   so invert it:
  //
  //   up   = positive
  //   down = negative
  int8_t y = convertAxis(rawY, centerY, true);


  // --------------------------------------------------
  // Build HID button bitmask
  //
  // HID Button 1 = A
  // HID Button 2 = B
  // HID Button 3 = X
  // HID Button 4 = Y
  // --------------------------------------------------

  uint32_t buttons = 0;

  if (readButton(buttonA)) {
    buttons |= (1UL << 0);
  }

  if (readButton(buttonB)) {
    buttons |= (1UL << 1);
  }

  if (readButton(buttonX)) {
    buttons |= (1UL << 2);
  }

  if (readButton(buttonY)) {
    buttons |= (1UL << 3);
  }


  // --------------------------------------------------
  // Send one complete USB HID report
  //
  // x, y,
  // right-stick X/Y = 0,
  // triggers = 0,
  // hat = centered,
  // button bitmask
  // --------------------------------------------------

  // Do not queue reports until the host has configured the composite device.
  // TinyUSB resumes reporting automatically after a cable reconnect or wake.
  if (USB) {
    Gamepad.send(
      x,
      y,
      0,
      0,
      0,
      0,
      HAT_CENTER,
      buttons
    );
  }


  // ~250 Hz controller update rate
  delay(4);
}
