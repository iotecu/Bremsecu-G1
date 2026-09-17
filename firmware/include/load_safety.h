#pragma once

#include <cstdint>

namespace LoadSafety {

enum class AuthorityStatus : uint8_t {
  READY = 0,
  CURRENT_CALIBRATION_PENDING,
  OVERCURRENT_LIMIT_PENDING
};

enum class CurrentDecision : uint8_t {
  SAFE = 0,
  OVERCURRENT,
  INVALID
};

AuthorityStatus authorityStatus(bool currentCalibrationApplied, float overcurrentMaxA);
CurrentDecision classifyCurrent(bool currentValid, float currentA, float overcurrentMaxA);
bool timeoutReached(uint32_t startedAtMs, uint32_t nowMs, uint32_t maxOnMs);

} // namespace LoadSafety
