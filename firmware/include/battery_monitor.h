#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — battery_monitor.h
// Continuous system telemetry for the internal 12 V LiFePO4 battery path.
// This is NOT a TestEngine diagnostic mode and does not classify battery health.
//
// Voltage path authority:
//   BATTERY -> 100k / 10k divider -> U11 (AIN3) Y4 -> ADS1115
//   nominal divider scale = (100k + 10k) / 10k = 11.0
//
// Current path authority:
//   dedicated INA226 at 0x41, R010 shunt = 10 mOhm
//   current is derived from shunt voltage / 0.010 ohm.
//
// No SOC percentage, LOW-BATTERY threshold, charge-state classification or
// battery-health judgement is invented here. Those remain product/engineering
// decisions until separately approved.
// =============================================================================

#include <cstdint>
#include "channels.h"

namespace BatteryMonitor {

constexpr Channels::MuxCoord kBatteryMuxCoord = {3, 4};
constexpr float kDividerScale = 11.0f;
constexpr float kShuntOhms = 0.010f;

enum class Error : uint8_t {
  NONE = 0,
  ADC_UNAVAILABLE,
  INA_UNAVAILABLE,
  PARTIAL
};

struct Telemetry {
  float voltageV;
  bool voltageValid;
  float currentA;
  bool currentValid;
  float powerW;
  bool powerValid;
  float inaBusVoltageV;
  bool inaBusVoltageValid;
  float shuntVoltageV;
  bool shuntVoltageValid;
  Error error;
};

bool begin();
Telemetry read();

// Pure conversion helpers used by regression tests and implementation.
float batteryVoltageFromNode(float nodeVolts);
float batteryCurrentFromShunt(float shuntVolts);

} // namespace BatteryMonitor
