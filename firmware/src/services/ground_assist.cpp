#include <Arduino.h>

#include "ground_assist.h"
#include "pins.h"

namespace {

int relayPin(Channels::Socket socket, uint8_t pin) {
  if (socket == Channels::Socket::ISO7638) {
    if (pin == 3) return Pins::GND_ASSIST_7638_PIN3;
    if (pin == 4) return Pins::GND_ASSIST_7638_PIN4;
    return -1;
  }
  if (socket == Channels::Socket::ISO12098) {
    if (pin == 4) return Pins::GND_ASSIST_12098_PIN4;
    if (pin == 13) return Pins::GND_ASSIST_12098_PIN13;
  }
  return -1;
}

int relayIndex(Channels::Socket socket, uint8_t pin) {
  if (socket == Channels::Socket::ISO7638) {
    if (pin == 3) return 0;
    if (pin == 4) return 1;
    return -1;
  }
  if (socket == Channels::Socket::ISO12098) {
    if (pin == 4) return 2;
    if (pin == 13) return 3;
  }
  return -1;
}

const int kRelayPins[] = {
    Pins::GND_ASSIST_7638_PIN3,
    Pins::GND_ASSIST_7638_PIN4,
    Pins::GND_ASSIST_12098_PIN4,
    Pins::GND_ASSIST_12098_PIN13};

bool gReady = false;
bool gCommandedOn[4] = {false, false, false, false};

void releaseRelay(int pin) {
  // Relay board is low-trigger. In open-drain mode HIGH means high-impedance,
  // so the ESP32 does not try to drive a 3.3 V HIGH against the relay board.
  digitalWrite(pin, HIGH);
  pinMode(pin, OUTPUT_OPEN_DRAIN);
  digitalWrite(pin, HIGH);
}

void energizeRelay(int pin) {
  // Open-drain LOW sinks the relay input and energizes the selected channel.
  digitalWrite(pin, LOW);
}

} // namespace

namespace GroundAssist {

void allOff() {
  for (int i = 0; i < 4; ++i) {
    releaseRelay(kRelayPins[i]);
    gCommandedOn[i] = false;
  }
}

void begin() {
  // Establish every relay input as released/high-impedance before any other
  // diagnostic/runtime service starts.
  allOff();
  gReady = true;
}

bool set(Channels::Socket socket, uint8_t pin, bool enabled) {
  if (!gReady) return false;

  const int gpio = relayPin(socket, pin);
  const int index = relayIndex(socket, pin);
  if (gpio < 0 || index < 0) return false;

  if (enabled) {
    energizeRelay(gpio);
  } else {
    releaseRelay(gpio);
  }
  gCommandedOn[index] = enabled;
  return true;
}

bool isOn(Channels::Socket socket, uint8_t pin) {
  if (!gReady) return false;
  const int index = relayIndex(socket, pin);
  return index >= 0 && gCommandedOn[index];
}

} // namespace GroundAssist
