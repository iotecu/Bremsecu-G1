#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — ina226_service.h
// INA226 shunt / bus / current measurement service for the 24V load path
// (24V_SOURCE -> IN+ -> SHUNT -> IN- -> load side; NET MAP v1.3 §11).
//
// AUTHORITY:
//   - MASTER NET MAP v1.3 §11   (shunt current path, VBS tied to IN-, shared
//                                I2C bus, A0/A1 -> firmware config parameter)
//   - INA226 datasheet          (register map, fixed bus/shunt LSBs, ID codes,
//                                calibration formula; the Current Register
//                                output is defined only AFTER Calibration
//                                Register programming)
//   - docs/engineering/measurement-methods.md (raw vs converted separation)
//
// I2C BUS OWNERSHIP:
//   The shared I2C bus is centrally owned; this service NEVER calls
//   Wire.begin(). It only talks to its configured address on an initialized
//   bus.
//
// DEVICE MODEL / CALIBRATION POLICY:
//   - Bus voltage (1.25 mV LSB) and shunt voltage (2.5 uV LSB, signed) are
//     datasheet-fact conversions and always available when ready.
//   - SHUNT VOLTAGE is the calibration-independent current evidence source.
//   - The Current Register (0x04) is NOT calibration-independent: its contents
//     scale with the Calibration Register. readRawCurrent() and readCurrent()
//     therefore return CALIBRATION_PENDING until applyCalibration() succeeds.
//   - The Calibration register / current LSB are PENDING bench
//     characterization. By default the Calibration register is left UNTOUCHED
//     and all current readings are unavailable.
//   - applyCalibration() accepts explicitly PROVISIONAL parameters only; its
//     result must never be treated as production-final. The float -> uint16
//     conversion is an intentional datasheet-style truncation.
//   - Device default configuration (continuous shunt+bus conversion) is used;
//     conversion-time/averaging changes remain PENDING bench.
//
// DELIBERATELY NOT HERE:
//   - NO PASS/FAIL current thresholds; NO lamp/axle-load classification
//     (test engine / DIAGNOSTIC_RULES own classification).
//   - NO magic numeric sentinels; every result carries explicit validity or
//     an explicit error code.
// =============================================================================

#include <cstdint>

namespace Ina226Service {

enum class Ina226Error : uint8_t {
  NONE = 0,
  NOT_READY,
  I2C_FAULT,
  ID_MISMATCH,
  CALIBRATION_PENDING,
  CALIBRATION_INVALID
};

struct Ina226Config {
  uint8_t i2cAddress = 0x40;
};

struct Ina226Sample {
  float    busVolts;    bool busValid;
  float    shuntVolts;  bool shuntValid;
  int16_t  rawCurrent;  bool rawValid;
  float    currentA;    bool currentValid;
  Ina226Error error;
};

bool begin(const Ina226Config& cfg = Ina226Config{});
bool isReady();
Ina226Error lastError();

bool readBusVoltage(float& vOut);
bool readShuntVoltage(float& vOut);
bool readRawCurrent(int16_t& rawOut);
bool readCurrent(float& aOut);

bool isCalibrationApplied();
bool applyCalibration(uint32_t shuntMicroOhm, uint32_t currentLsbMicroA);

bool sample(Ina226Sample& out);

} // namespace Ina226Service
