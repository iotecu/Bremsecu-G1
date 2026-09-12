#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — battery_ina226_service.h
// Dedicated INA226 reader for the 12 V battery input monitor.
//
// AUTHORITY:
//   - Battery-monitor schematic addendum: battery INA226 is separate from the
//     existing 24 V load-path INA226.
//   - I2C address: 0x41 (hardware must be strapped/configured accordingly).
//   - Shunt: R010 = 10 mOhm. The shunt value is consumed by BatteryMonitor;
//     this low-level service exposes only bus and shunt voltage evidence.
//
// This service never calls Wire.begin(); the shared I2C bus is centrally owned.
// It intentionally does NOT program the INA226 calibration/current register.
// Battery current is derived from measured shunt voltage and the accepted R010
// value so the monitor does not depend on a second Current-Register calibration.
//
// INA226 shunt-voltage full scale is approximately +/-81.92 mV. With R010 this
// corresponds to approximately +/-8.192 A. A saturated shunt register is
// rejected as invalid evidence; firmware must not publish a clipped current as
// a valid real measurement.
// =============================================================================

#include <cstdint>

namespace BatteryIna226Service {

constexpr uint8_t kI2cAddress = 0x41;
constexpr float kShuntFullScaleVolts = 0.08192f;

enum class Error : uint8_t {
  NONE = 0,
  NOT_READY,
  I2C_FAULT,
  ID_MISMATCH,
  SHUNT_SATURATED
};

struct Sample {
  float busVolts;
  bool busValid;
  float shuntVolts;
  bool shuntValid;
  Error error;
};

bool begin(uint8_t i2cAddress = kI2cAddress);
bool isReady();
Error lastError();
uint8_t i2cAddress();

bool readBusVoltage(float& vOut);
bool readShuntVoltage(float& vOut);
bool sample(Sample& out);

} // namespace BatteryIna226Service
