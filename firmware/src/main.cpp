#include <Arduino.h>
#include "pins.h"

namespace TpicControl {
void begin();
void allOff();
}

namespace SafetyInterlocks {
void begin();
}

void setup() {
  Serial.begin(115200);
  delay(100);

  TpicControl::begin();
  SafetyInterlocks::begin();

  Serial.println("BREMSECU G1 REV-2 firmware scaffold ready");
}

void loop() {
  // Runtime services and test engine are added in dedicated modules.
  delay(10);
}
