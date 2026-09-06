// =============================================================================
// BREMSECU G1 REV-2 — main.cpp
// Boot + loop wiring. Central I2C ownership; safe-state boot; evidence
// services; network + HTTP + WebSocket; test engine tick.
// =============================================================================

#include <Arduino.h>
#include <Wire.h>

#include "pins.h"
#include "config.h"
#include "tpic_control.h"
#include "safety_interlocks.h"
#include "test_engine.h"
#include "adc_service.h"
#include "pulse_monitor.h"
#include "ina226_service.h"
#include "network_service.h"
#include "api_server.h"
#include "ws_server.h"

void setup() {
  Serial.begin(115200);
  delay(100);

  // Central shared-I2C ownership (single owner for ADS1115 + INA226 + RTC).
  Wire.begin(Pins::I2C_SDA, Pins::I2C_SCL);

  // Safe-state boot: outputs disabled, zero word latched, interlocks armed.
  TpicControl::begin();
  SafetyInterlocks::begin();
  TestEngine::begin();

  // Evidence services (best-effort; failures surface via status/events).
  AdcService::begin();
  PulseMonitor::begin();
  Ina226Service::begin();

  // Network: AP+STA simultaneous; AP recovery at 192.168.4.1.
  NetworkService::NetworkConfig netCfg;
  NetworkService::begin(netCfg);

  // HTTP skeleton + WebSocket live events (telemetry only).
  ApiServer::begin();
  WsServer::begin();

  Serial.println("BREMSECU G1 REV-2 firmware scaffold ready");
}

void loop() {
  NetworkService::poll();
  ApiServer::poll();
  WsServer::poll();
  TestEngine::step();
  delay(1);  // cooperative yield; no blocking network loop
}
