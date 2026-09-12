// =============================================================================
// BREMSECU G1 REV-2 — battery_ina226_service.cpp
// Independent INA226 instance for battery telemetry at 0x41.
// =============================================================================

#include "battery_ina226_service.h"

#include <Arduino.h>
#include <Wire.h>

namespace BatteryIna226Service {
namespace {
constexpr uint8_t REG_SHUNT  = 0x01;
constexpr uint8_t REG_BUS    = 0x02;
constexpr uint8_t REG_MFR_ID = 0xFE;
constexpr uint8_t REG_DIE_ID = 0xFF;

constexpr uint16_t kMfrIdTexas  = 0x5449;
constexpr uint16_t kDieIdIna226 = 0x2260;
constexpr float kBusLsbVolts    = 0.00125f;
constexpr float kShuntLsbVolts  = 0.0000025f;

uint8_t gAddress = kI2cAddress;
bool gReady = false;
Error gError = Error::NONE;

bool readReg(uint8_t reg, uint16_t& out) {
  Wire.beginTransmission(gAddress);
  Wire.write(reg);
  if (Wire.endTransmission() != 0) return false;
  if (Wire.requestFrom((int)gAddress, 2) != 2) return false;
  const uint8_t hi = Wire.read();
  const uint8_t lo = Wire.read();
  out = (uint16_t)(((uint16_t)hi << 8) | lo);
  return true;
}

bool readSignedReg(uint8_t reg, int16_t& out) {
  uint16_t raw = 0;
  if (!readReg(reg, raw)) return false;
  out = (int16_t)raw;
  return true;
}
}

bool begin(uint8_t i2cAddress) {
  gAddress = i2cAddress;
  gReady = false;
  gError = Error::NONE;

  uint16_t id = 0;
  if (!readReg(REG_MFR_ID, id)) { gError = Error::I2C_FAULT; return false; }
  if (id != kMfrIdTexas)        { gError = Error::ID_MISMATCH; return false; }
  if (!readReg(REG_DIE_ID, id)) { gError = Error::I2C_FAULT; return false; }
  if (id != kDieIdIna226)       { gError = Error::ID_MISMATCH; return false; }

  gReady = true;
  return true;
}

bool isReady() { return gReady; }
Error lastError() { return gError; }
uint8_t i2cAddress() { return gAddress; }

bool readBusVoltage(float& vOut) {
  if (!gReady) { gError = Error::NOT_READY; return false; }
  uint16_t raw = 0;
  if (!readReg(REG_BUS, raw)) { gError = Error::I2C_FAULT; return false; }
  vOut = (float)(raw >> 3) * kBusLsbVolts;
  gError = Error::NONE;
  return true;
}

bool readShuntVoltage(float& vOut) {
  if (!gReady) { gError = Error::NOT_READY; return false; }
  int16_t raw = 0;
  if (!readSignedReg(REG_SHUNT, raw)) { gError = Error::I2C_FAULT; return false; }
  vOut = (float)raw * kShuntLsbVolts;
  gError = Error::NONE;
  return true;
}

bool sample(Sample& out) {
  out = Sample{};
  if (!gReady) {
    out.error = Error::NOT_READY;
    gError = Error::NOT_READY;
    return false;
  }

  uint16_t bus = 0;
  if (readReg(REG_BUS, bus)) {
    out.busVolts = (float)(bus >> 3) * kBusLsbVolts;
    out.busValid = true;
  } else {
    out.error = Error::I2C_FAULT;
  }

  int16_t shunt = 0;
  if (readSignedReg(REG_SHUNT, shunt)) {
    out.shuntVolts = (float)shunt * kShuntLsbVolts;
    out.shuntValid = true;
  } else if (out.error == Error::NONE) {
    out.error = Error::I2C_FAULT;
  }

  gError = out.error;
  return out.busValid || out.shuntValid;
}

} // namespace BatteryIna226Service
