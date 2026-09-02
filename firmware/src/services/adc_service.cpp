// =============================================================================
// BREMSECU G1 REV-2 — adc_service.cpp
// Minimal self-contained ADS1115 driver + MUX sequencing. No external ADC
// library required (Wire only); library versions freeze later per
// firmware/platformio.ini policy.
//
// I2C NOTE: Wire is NOT initialized here. The shared I2C bus is centrally
// owned (see header, I2C BUS OWNERSHIP).
// =============================================================================

#include "adc_service.h"
#include "pins.h"

#include <Arduino.h>
#include <Wire.h>

namespace AdcService {

namespace {

constexpr uint8_t REG_CONVERSION = 0x00;
constexpr uint8_t REG_CONFIG     = 0x01;

constexpr uint16_t kSpsTable[8] = {8, 16, 32, 64, 128, 250, 475, 860};

constexpr uint8_t  kTimeoutConversionMultiples = 4;  // PROVISIONAL
constexpr uint32_t kTimeoutFloorMs             = 5;  // PROVISIONAL floor
constexpr float    kUninterpretedSample        = 0.0f;

AdcConfig gCfg;
bool      gReady = false;
AdcError  gErr   = AdcError::NONE;

uint16_t spsFor(uint8_t dataRateCode) {
  return kSpsTable[dataRateCode & 0x7u];
}

uint32_t conversionTimeoutMs() {
  const uint32_t t =
      (1000u * (uint32_t)kTimeoutConversionMultiples) /
      (uint32_t)spsFor(gCfg.dataRateCode) + 1u;
  return (t < kTimeoutFloorMs) ? kTimeoutFloorMs : t;
}

uint16_t configWord(uint8_t ain) {
  uint16_t w = 0;
  w |= (1u << 15);
  w |= (uint16_t)((0b100u + (ain & 0x3u)) & 0x7u) << 12;
  w |= (uint16_t)(gCfg.gainCode & 0x7u) << 9;
  w |= (1u << 8);
  w |= (uint16_t)(gCfg.dataRateCode & 0x7u) << 5;
  w |= 0x03u;
  return w;
}

float lsbVolts() {
  switch (gCfg.gainCode) {
    case 0:  return 0.0001875f;
    case 1:  return 0.000125f;
    case 2:  return 0.0000625f;
    case 3:  return 0.00003125f;
    case 4:  return 0.000015625f;
    default: return 0.0000078125f;
  }
}

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

bool startAndWaitConversion(uint8_t ain, int16_t& raw) {
  if (!writeReg(REG_CONFIG, configWord(ain))) {
    gErr = AdcError::I2C_FAULT;
    return false;
  }

  const uint32_t timeoutMs = conversionTimeoutMs();
  uint32_t t0 = millis();
  uint16_t cfg = 0;

  for (;;) {
    if (!readReg(REG_CONFIG, cfg)) {
      gErr = AdcError::I2C_FAULT;
      return false;
    }
    if (cfg & 0x8000u) break;
    if (millis() - t0 > timeoutMs) {
      gErr = AdcError::CONVERSION_TIMEOUT;
      return false;
    }
    delay(1);
  }

  uint16_t conv = 0;
  if (!readReg(REG_CONVERSION, conv)) {
    gErr = AdcError::I2C_FAULT;
    return false;
  }
  raw = (int16_t)conv;
  return true;
}

void muxSelect(const Channels::MuxCoord& c) {
  digitalWrite(Pins::MUX_EN, HIGH);
  digitalWrite(Pins::MUX_S0, (c.step & 0x1u) ? HIGH : LOW);
  digitalWrite(Pins::MUX_S1, (c.step & 0x2u) ? HIGH : LOW);
  digitalWrite(Pins::MUX_S2, (c.step & 0x4u) ? HIGH : LOW);
  digitalWrite(Pins::MUX_EN, LOW);
}

void muxDisable() {
  digitalWrite(Pins::MUX_EN, HIGH);
}

} // namespace

bool begin(const AdcConfig& cfg) {
  gCfg   = cfg;
  gReady = false;
  gErr   = AdcError::NONE;

  pinMode(Pins::MUX_EN, OUTPUT);
  pinMode(Pins::MUX_S0, OUTPUT);
  pinMode(Pins::MUX_S1, OUTPUT);
  pinMode(Pins::MUX_S2, OUTPUT);
  muxDisable();
  digitalWrite(Pins::MUX_S0, LOW);
  digitalWrite(Pins::MUX_S1, LOW);
  digitalWrite(Pins::MUX_S2, LOW);

  Wire.beginTransmission(gCfg.i2cAddress);
  if (Wire.endTransmission() != 0) {
    gErr = AdcError::I2C_FAULT;
    return false;
  }

  gReady = true;
  return true;
}

bool isReady() { return gReady; }
AdcError lastError() { return gErr; }

bool readRaw(Channels::AdcChannel ch, int16_t& rawOut) {
  if (!gReady) {
    gErr = AdcError::NOT_READY;
    return false;
  }
  if (!Channels::isValidDiagnosticChannel(ch)) {
    gErr = AdcError::INVALID_CHANNEL;
    return false;
  }

  const Channels::MuxCoord coord = Channels::muxCoordinatesFor(ch);
  if (!Channels::isValidMuxCoord(coord)) {
    gErr = AdcError::INVALID_CHANNEL;
    return false;
  }

  muxSelect(coord);
  delay(gCfg.muxSettleMs);
  delayMicroseconds(gCfg.postSettleUs);

  int16_t dummy = 0;
  if (gCfg.discardFirstRead) {
    if (!startAndWaitConversion(coord.ain, dummy)) {
      muxDisable();
      return false;
    }
  }

  int32_t sum = 0;
  const uint8_t n = (gCfg.sampleCount == 0) ? 1 : gCfg.sampleCount;

  for (uint8_t i = 0; i < n; ++i) {
    int16_t r = 0;
    if (!startAndWaitConversion(coord.ain, r)) {
      muxDisable();
      return false;
    }
    sum += r;
    if (gCfg.interSampleUs) delayMicroseconds(gCfg.interSampleUs);
  }

  if (gCfg.disableMuxAfterRead) muxDisable();

  rawOut = (int16_t)(sum / (int32_t)n);
  gErr = AdcError::NONE;
  return true;
}

bool readNodeVolts(Channels::AdcChannel ch, float& vNodeOut) {
  int16_t raw = 0;
  if (!readRaw(ch, raw)) return false;
  vNodeOut = (float)raw * lsbVolts();
  return true;
}

void scanAllNodes(NodeSample* out, uint8_t count) {
  if (out == nullptr) return;

  for (uint8_t i = 0; i < count; ++i) {
    if (i < Channels::kAdcChannelCount) {
      float v = 0.0f;
      if (readNodeVolts(static_cast<Channels::AdcChannel>(i), v)) {
        out[i].vNode = v;
        out[i].valid = true;
        out[i].error = AdcError::NONE;
      } else {
        out[i].vNode = kUninterpretedSample;
        out[i].valid = false;
        out[i].error = gErr;
      }
    } else {
      out[i].vNode = kUninterpretedSample;
      out[i].valid = false;
      out[i].error = AdcError::INVALID_CHANNEL;
    }
  }
}

} // namespace AdcService
