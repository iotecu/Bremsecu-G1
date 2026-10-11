#include <Arduino.h>

#include "ground_assist.h"
#include "pins.h"

namespace {
constexpr int kOffLevel = HIGH;
constexpr int kOnLevel = LOW;

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

bool gReady = false;
}

namespace GroundAssist {

void allOff() {
  const int pins[] = {
      Pins::GND_ASSIST_7638_PIN3,
      Pins::GND_ASSIST_7638_PIN4,
      Pins::GND_ASSIST_12098_PIN4,
      Pins::GND_ASSIST_12098_PIN13};
  for (int pin : pins) digitalWrite(pin, kOffLevel);
}

void begin() {
  const int pins[] = {
      Pins::GND_ASSIST_7638_PIN3,
      Pins::GND_ASSIST_7638_PIN4,
      Pins::GND_ASSIST_12098_PIN4,
      Pins::GND_ASSIST_12098_PIN13};
  // Write the inactive level before switching the GPIO to OUTPUT so the relay
  // input never sees an intentional LOW glitch during boot.
  for (int pin : pins) {
    digitalWrite(pin, kOffLevel);
    pinMode(pin, OUTPUT);
  }
  allOff();
  gReady = true;
}

bool set(Channels::Socket socket, uint8_t pin, bool enabled) {
  if (!gReady) return false;
  const int gpio = relayPin(socket, pin);
  if (gpio < 0) return false;
  digitalWrite(gpio, enabled ? kOnLevel : kOffLevel);
  return true;
}

bool isOn(Channels::Socket socket, uint8_t pin) {
  if (!gReady) return false;
  const int gpio = relayPin(socket, pin);
  return gpio >= 0 && digitalRead(gpio) == kOnLevel;
}

} // namespace GroundAssist
