// =============================================================================
// BREMSECU G1 REV-2 — ina226_service.cpp
// Minimal INA226 driver: ID-verified probe, datasheet-fact voltage
// conversions, calibration-gated current access, explicitly PROVISIONAL
// calibration. No classification, no thresholds, no Wire.begin(), no magic
// sentinels.
// =============================================================================

#include "ina226_service.h"

#include <Arduino.h>
#include <Wire.h>

namespace Ina226Service {

namespace {

constexpr uint8_t REG_SHUNT   = 0x01;
constexpr uint8_t REG_BUS     = 0x02;
constexpr uint8_t REG_CURRENT = 0x04;
constexpr uint8_t REG_CALIB   = 0x05;
constexpr uint8_t REG_MFR_ID  = 0xFE;
constexpr uint8_t REG_DIE_ID  = 0xFF;

constexpr uint16_t kMfrIdTexas  = 0x5449;
constexpr uint16_t kDieIdIna226 = 0x2260;

constexpr float kBusLsbVolts   = 0.00125f;
constexpr float kShuntLsbVolts = 0.0000025f;

Ina226Config gCfg;
bool         gReady            = false;
bool         gCalApplied       = false;
uint32_t     gCurrentLsbMicroA = 0;
Ina226Error  gErr              = Ina226Error::NONE;

bool writeReg(uint8_t reg, uint16_t v) {
  Wire.beginTransmission(gCfg.i2cAddress);
  Wire.write(reg);
  Wire.write((v >> 8) & 0xFF);
  Wire.write(v & 0xFF);
  return Wire.endTransmission() == 0;
}

bool readReg(uint8_t reg, uint16_t& v) {
  Wire.beginTransmission(gCfg.i2cAddress);
  Wire.write(reg);
  if (Wire.endTransmission() != 0) return false;
  if (Wire.requestFrom((int)gCfg.i2cAddress, 2) != 2) return false;
  uint8_t hi = Wire.read();
  uint8_t lo = Wire.read();
  v = (uint16_t)(((uint16_t)hi << 8) | lo);
  return true;
}

bool readSignedReg(uint8_t reg, int16_t& v) {
  uint16_t raw = 0;
  if (!readReg(reg, raw)) return false;
  v = (int16_t)raw;
  return true;
}

} // namespace

bool begin(const Ina226Config& cfg) {
  gCfg              = cfg;
  gReady            = false;
  gCalApplied       = false;
  gCurrentLsbMicroA = 0;
  gErr              = Ina226Error::NONE;

  uint16_t id = 0;
  if (!readReg(REG_MFR_ID, id)) { gErr = Ina226Error::I2C_FAULT; return false; }
  if (id != kMfrIdTexas)        { gErr = Ina226Error::ID_MISMATCH; return false; }
  if (!readReg(REG_DIE_ID, id)) { gErr = Ina226Error::I2C_FAULT; return false; }
  if (id != kDieIdIna226)       { gErr = Ina226Error::ID_MISMATCH; return false; }

  gReady = true;
  return true;
}

bool isReady() { return gReady; }
Ina226Error lastError() { return gErr; }

bool readBusVoltage(float& vOut) {
  if (!gReady) { gErr = Ina226Error::NOT_READY; return false; }
  uint16_t raw = 0;
  if (!readReg(REG_BUS, raw)) { gErr = Ina226Error::I2C_FAULT; return false; }
  vOut = (float)(raw >> 3) * kBusLsbVolts;
  gErr = Ina226Error::NONE;
  return true;
}

bool readShuntVoltage(float& vOut) {
  if (!gReady) { gErr = Ina226Error::NOT_READY; return false; }
  int16_t raw = 0;
  if (!readSignedReg(REG_SHUNT, raw)) { gErr = Ina226Error::I2C_FAULT; return false; }
  vOut = (float)raw * kShuntLsbVolts;
  gErr = Ina226Error::NONE;
  return true;
}

bool readRawCurrent(int16_t& rawOut) {
  if (!gReady) { gErr = Ina226Error::NOT_READY; return false; }
  if (!gCalApplied) { gErr = Ina226Error::CALIBRATION_PENDING; return false; }
  if (!readSignedReg(REG_CURRENT, rawOut)) { gErr = Ina226Error::I2C_FAULT; return false; }
  gErr = Ina226Error::NONE;
  return true;
}

bool isCalibrationApplied() { return gCalApplied; }

bool applyCalibration(uint32_t shuntMicroOhm, uint32_t currentLsbMicroA) {
  if (!gReady) { gErr = Ina226Error::NOT_READY; return false; }
  if (shuntMicroOhm == 0 || currentLsbMicroA == 0) {
    gErr = Ina226Error::CALIBRATION_INVALID;
    return false;
  }

  const double cal =
      0.00512 /
      ((double)currentLsbMicroA * 1e-6 * (double)shuntMicroOhm * 1e-6);
  if (cal < 1.0 || cal > 65535.0) {
    gErr = Ina226Error::CALIBRATION_INVALID;
    return false;
  }

  const uint16_t calReg = (uint16_t)cal;
  if (!writeReg(REG_CALIB, calReg)) { gErr = Ina226Error::I2C_FAULT; return false; }

  gCurrentLsbMicroA = currentLsbMicroA;
  gCalApplied       = true;
  gErr              = Ina226Error::NONE;
  return true;
}

bool readCurrent(float& aOut) {
  if (!gReady) { gErr = Ina226Error::NOT_READY; return false; }
  if (!gCalApplied) { gErr = Ina226Error::CALIBRATION_PENDING; return false; }
  int16_t raw = 0;
  if (!readSignedReg(REG_CURRENT, raw)) { gErr = Ina226Error::I2C_FAULT; return false; }
  aOut = (float)raw * (float)gCurrentLsbMicroA * 1e-6f;
  gErr = Ina226Error::NONE;
  return true;
}

bool sample(Ina226Sample& out) {
  out = Ina226Sample{};
  if (!gReady) {
    gErr = Ina226Error::NOT_READY;
    out.error = Ina226Error::NOT_READY;
    return false;
  }

  uint16_t rb = 0;
  if (readReg(REG_BUS, rb)) {
    out.busVolts = (float)(rb >> 3) * kBusLsbVolts;
    out.busValid = true;
  } else {
    out.error = Ina226Error::I2C_FAULT;
  }

  int16_t rs = 0;
  if (readSignedReg(REG_SHUNT, rs)) {
    out.shuntVolts = (float)rs * kShuntLsbVolts;
    out.shuntValid = true;
  } else if (out.error == Ina226Error::NONE) {
    out.error = Ina226Error::I2C_FAULT;
  }

  if (gCalApplied) {
    int16_t rc = 0;
    if (readSignedReg(REG_CURRENT, rc)) {
      out.rawCurrent   = rc;
      out.rawValid     = true;
      out.currentA     = (float)rc * (float)gCurrentLsbMicroA * 1e-6f;
      out.currentValid = true;
    } else if (out.error == Ina226Error::NONE) {
      out.error = Ina226Error::I2C_FAULT;
    }
  }

  gErr = out.error;
  return true;
}

} // namespace Ina226Service
