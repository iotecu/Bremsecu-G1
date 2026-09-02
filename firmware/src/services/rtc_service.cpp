// =============================================================================
// BREMSECU G1 REV-2 — rtc_service.cpp
// Minimal DS3231 driver: BCD-validated + Gregorian-calendar-validated time
// decode, computed day-of-week on set, signed temperature, OSF reporting.
// No Wire.begin(), no sync policy, no magic sentinels.
// =============================================================================

#include "rtc_service.h"

#include <Arduino.h>
#include <Wire.h>

namespace RtcService {

namespace {

constexpr uint8_t REG_SECONDS  = 0x00;
constexpr uint8_t REG_MINUTES  = 0x01;
constexpr uint8_t REG_HOURS    = 0x02;
constexpr uint8_t REG_DAY      = 0x03;
constexpr uint8_t REG_DATE     = 0x04;
constexpr uint8_t REG_MONTH    = 0x05;
constexpr uint8_t REG_YEAR     = 0x06;
constexpr uint8_t REG_STATUS   = 0x0F;
constexpr uint8_t REG_TEMP_MSB = 0x11;
constexpr uint8_t kOsfBit      = 0x80;

RtcConfig gCfg;
bool      gReady = false;
RtcError  gErr   = RtcError::NONE;

bool bcdNibblesValid(uint8_t v) {
  return ((v & 0x0Fu) <= 0x09u) && ((v & 0xF0u) <= 0x90u);
}

uint8_t bcdToBin(uint8_t v) {
  return static_cast<uint8_t>((v >> 4) * 10 + (v & 0x0Fu));
}

uint8_t binToBcd(uint8_t v) {
  return static_cast<uint8_t>(((v / 10) << 4) | (v % 10));
}

bool isLeapYear(uint16_t y) {
  return ((y % 4u) == 0u && (y % 100u) != 0u) || ((y % 400u) == 0u);
}

constexpr uint8_t kDaysInMonth[12] = {
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
};

uint8_t daysInMonth(uint16_t y, uint8_t m) {
  if (m < 1 || m > 12) return 0;
  if (m == 2 && isLeapYear(y)) return 29;
  return kDaysInMonth[m - 1];
}

uint8_t dayOfWeek(uint16_t year, uint8_t month, uint8_t day) {
  static const int8_t t[12] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
  int y = static_cast<int>(year);
  if (month < 3) y -= 1;
  const int dow =
      (y + y / 4 - y / 100 + y / 400 + t[month - 1] + static_cast<int>(day)) % 7;
  return static_cast<uint8_t>(dow + 1);
}

bool isValidCalendar(const RtcDateTime& dt) {
  if (dt.year < 2000 || dt.year > 2099) return false;
  if (dt.month < 1 || dt.month > 12) return false;
  if (dt.day < 1 || dt.day > daysInMonth(dt.year, dt.month)) return false;
  return dt.hour <= 23 && dt.minute <= 59 && dt.second <= 59;
}

bool readBlock(uint8_t startReg, uint8_t* buf, uint8_t len) {
  Wire.beginTransmission(gCfg.i2cAddress);
  Wire.write(startReg);
  if (Wire.endTransmission() != 0) return false;
  if (Wire.requestFrom(static_cast<int>(gCfg.i2cAddress), static_cast<int>(len)) !=
      static_cast<int>(len)) {
    return false;
  }
  for (uint8_t i = 0; i < len; ++i) buf[i] = Wire.read();
  return true;
}

bool writeBlock(uint8_t startReg, const uint8_t* buf, uint8_t len) {
  Wire.beginTransmission(gCfg.i2cAddress);
  Wire.write(startReg);
  for (uint8_t i = 0; i < len; ++i) Wire.write(buf[i]);
  return Wire.endTransmission() == 0;
}

bool readReg(uint8_t reg, uint8_t& v) {
  return readBlock(reg, &v, 1);
}

} // namespace

bool begin(const RtcConfig& cfg) {
  gCfg   = cfg;
  gReady = false;
  gErr   = RtcError::NONE;

  Wire.beginTransmission(gCfg.i2cAddress);
  if (Wire.endTransmission() != 0) {
    gErr = RtcError::I2C_FAULT;
    return false;
  }
  gReady = true;
  return true;
}

bool isReady() { return gReady; }
RtcError lastError() { return gErr; }

bool readDateTime(RtcDateTime& out) {
  if (!gReady) {
    gErr = RtcError::NOT_READY;
    return false;
  }

  uint8_t r[7] = {0};
  if (!readBlock(REG_SECONDS, r, 7)) {
    gErr = RtcError::I2C_FAULT;
    return false;
  }

  const uint8_t sec  = r[0] & 0x7F;
  const uint8_t min  = r[1] & 0x7F;
  const uint8_t hrs  = r[2];
  const uint8_t date = r[4] & 0x3F;
  const uint8_t mon  = r[5] & 0x1F;
  const uint8_t yr   = r[6];

  if (!bcdNibblesValid(sec) || !bcdNibblesValid(min) ||
      !bcdNibblesValid(date) || !bcdNibblesValid(mon) ||
      !bcdNibblesValid(yr)) {
    gErr = RtcError::INVALID_BCD;
    return false;
  }

  uint8_t hour = 0;
  if (hrs & 0x40) {
    const uint8_t h12raw = hrs & 0x1F;
    if (!bcdNibblesValid(h12raw)) {
      gErr = RtcError::INVALID_BCD;
      return false;
    }
    const uint8_t h12 = bcdToBin(h12raw);
    if (h12 < 1 || h12 > 12) {
      gErr = RtcError::INVALID_BCD;
      return false;
    }
    const bool pm = (hrs & 0x20) != 0;
    hour = static_cast<uint8_t>((h12 % 12) + (pm ? 12 : 0));
  } else {
    const uint8_t h24raw = hrs & 0x3F;
    if (!bcdNibblesValid(h24raw)) {
      gErr = RtcError::INVALID_BCD;
      return false;
    }
    hour = bcdToBin(h24raw);
    if (hour > 23) {
      gErr = RtcError::INVALID_BCD;
      return false;
    }
  }

  const uint8_t  s        = bcdToBin(sec);
  const uint8_t  mi       = bcdToBin(min);
  const uint8_t  m        = bcdToBin(mon);
  const uint16_t yearFull = static_cast<uint16_t>(2000 + bcdToBin(yr));
  const uint8_t  d        = bcdToBin(date);

  if (s > 59 || mi > 59 || m < 1 || m > 12) {
    gErr = RtcError::INVALID_BCD;
    return false;
  }
  if (d < 1 || d > daysInMonth(yearFull, m)) {
    gErr = RtcError::INVALID_DATETIME;
    return false;
  }

  out.year   = yearFull;
  out.month  = m;
  out.day    = d;
  out.hour   = hour;
  out.minute = mi;
  out.second = s;
  gErr = RtcError::NONE;
  return true;
}

bool readTemperature(float& cOut) {
  if (!gReady) {
    gErr = RtcError::NOT_READY;
    return false;
  }
  uint8_t t[2] = {0};
  if (!readBlock(REG_TEMP_MSB, t, 2)) {
    gErr = RtcError::I2C_FAULT;
    return false;
  }
  const int8_t  msb  = static_cast<int8_t>(t[0]);
  const uint8_t frac = (t[1] >> 6) & 0x03;
  cOut = static_cast<float>(msb) + static_cast<float>(frac) * 0.25f;
  gErr = RtcError::NONE;
  return true;
}

bool readOscillatorStopFlag(bool& osfOut) {
  if (!gReady) {
    gErr = RtcError::NOT_READY;
    return false;
  }
  uint8_t st = 0;
  if (!readReg(REG_STATUS, st)) {
    gErr = RtcError::I2C_FAULT;
    return false;
  }
  osfOut = (st & kOsfBit) != 0;
  gErr = RtcError::NONE;
  return true;
}

bool setDateTime(const RtcDateTime& dt) {
  if (!gReady) {
    gErr = RtcError::NOT_READY;
    return false;
  }
  if (!isValidCalendar(dt)) {
    gErr = RtcError::INVALID_DATETIME;
    return false;
  }

  uint8_t w[7];
  w[0] = binToBcd(dt.second);
  w[1] = binToBcd(dt.minute);
  w[2] = binToBcd(dt.hour);
  w[3] = dayOfWeek(dt.year, dt.month, dt.day);
  w[4] = binToBcd(dt.day);
  w[5] = binToBcd(dt.month);
  w[6] = binToBcd(static_cast<uint8_t>(dt.year - 2000));
  if (!writeBlock(REG_SECONDS, w, 7)) {
    gErr = RtcError::I2C_FAULT;
    return false;
  }

  gErr = RtcError::NONE;
  return true;
}

bool sample(RtcSample& out) {
  out = RtcSample{};
  if (!gReady) {
    gErr = RtcError::NOT_READY;
    out.error = RtcError::NOT_READY;
    return false;
  }

  if (readDateTime(out.dt)) {
    out.timeValid = true;
  } else {
    out.error = gErr;
  }

  bool osf = false;
  if (readOscillatorStopFlag(osf)) {
    out.oscillatorStopFlag = osf;
    out.osfValid = true;
  } else if (out.error == RtcError::NONE) {
    out.error = gErr;
  }

  float t = 0.0f;
  if (readTemperature(t)) {
    out.temperatureC = t;
    out.tempValid = true;
  } else if (out.error == RtcError::NONE) {
    out.error = gErr;
  }

  gErr = out.error;
  return true;
}

} // namespace RtcService
