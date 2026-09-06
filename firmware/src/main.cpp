// =============================================================================
// BREMSECU G1 REV-2 — main.cpp
// Boot + loop wiring. Central I2C ownership; safe-state boot; network + API
// skeleton; test engine tick. No hardware control from transport layers.
// =============================================================================

#include <Arduino.h>
#include <Wire.h>

#include "pins.h"
#include "config.h"
#include "tpic_control.h"
#include "safety_interlocks.h"
#include "test_engine.h"
#include "network_service.h"
#include "api_server.h"

void setup() {
  Serial.begin(115200);
  delay(100);

  // Central shared-I2C ownership (single owner for ADS1115 + INA226 + RTC).
  // Services never call Wire.begin() themselves.
  Wire.begin(Pins::I2C_SDA, Pins::I2C_SCL);

  // Safe-state boot: outputs disabled, zero word latched, interlocks armed.
  TpicControl::begin();
  SafetyInterlocks::begin();
  TestEngine::begin();

  // Network: AP+STA simultaneous; AP recovery at 192.168.4.1.
  // STA credentials empty => AP-only until a provisioning workflow exists.
  NetworkService::NetworkConfig netCfg;  // defaults: empty STA, mDNS off
  NetworkService::begin(netCfg);

  // HTTP skeleton: GET /api/v1/device + GET /api/v1/status only.
  ApiServer::begin();

  Serial.println("BREMSECU G1 REV-2 firmware scaffold ready");
}

void loop() {
  NetworkService::poll();
  ApiServer::poll();
  TestEngine::step();
  delay(1);  // cooperative yield; no blocking network loop
}
