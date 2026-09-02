#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — rtc_service.h
// DS3231 real-time clock service (module MDL6, NET MAP v1.3 §10).
// Time / temperature EVIDENCE only; the clock is the offline timestamp source
// for service records and reports.
//
// AUTHORITY:
//   - MASTER NET MAP v1.3 §10   (MDL6 on the shared I2C bus)
//   - DS3231 datasheet          (fixed 7-bit address 0x68, BCD time registers,
//                                0.25 C temperature LSB, OSF status bit,
//                                user-defined day-of-week register 1-7)
//   - docs/engineering/bringup-results.md (RTC detection / time increment
//                                verified at bring-up)
//
// I2C BUS OWNERSHIP:
//   The shared I2C bus is centrally owned; this service NEVER calls
//   Wire.begin(). It only talks to its configured address on an initialized
//   bus.
//
// CALENDAR INTEGRITY:
//   - Full Gregorian validation for years 2000-2099 (correct month lengths,
//     February 28/29, leap-year rule) is applied BOTH to decoded RTC register
//     values and to caller-supplied setDateTime() values. Impossible dates
//     (31 April, 30 February, 29 February in a non-leap year) are rejected.
//   - setDateTime() computes and writes the day-of-week register from the
//     supplied calendar date (fixed convention 1=Sunday..7=Saturday) so the
//     RTC is internally consistent; the previous day value is NOT preserved.
//
// DELIBERATELY NOT HERE:
//   - NO time-sync / NTP / timezone policy (the workflow layer owns WHEN the
//     clock is set; this service only provides the validated driver primitive).
//   - NO alarm / square-wave / 32 kHz programming.
//   - NO clearing of the oscillator-stop flag (OSF is reported only; clearing
//     is a deliberate higher-layer action).
//   - NO magic numeric sentinels; every result carries explicit validity or
//     an explicit error code.
// =============================================================================

#include <cstdint>

namespace RtcService {

enum class RtcError : uint8_t {
  NONE = 0,
  NOT_READY,
  I2C_FAULT,
  INVALID_BCD,
  INVALID_DATETIME
};

struct RtcConfig {
  uint8_t i2cAddress = 0x68;
};

struct RtcDateTime {
  uint16_t year;
  uint8_t  month;
  uint8_t  day;
  uint8_t  hour;
  uint8_t  minute;
  uint8_t  second;
};

struct RtcSample {
  RtcDateTime dt;          bool timeValid;
  bool oscillatorStopFlag; bool osfValid;
  float temperatureC;      bool tempValid;
  RtcError error;
};

bool begin(const RtcConfig& cfg = RtcConfig{});
bool isReady();
RtcError lastError();

bool readDateTime(RtcDateTime& out);
bool readTemperature(float& cOut);
bool readOscillatorStopFlag(bool& osfOut);
bool setDateTime(const RtcDateTime& dt);
bool sample(RtcSample& out);

} // namespace RtcService
