#include "load_safety.h"

#include <cmath>

namespace LoadSafety {

AuthorityStatus authorityStatus(bool currentCalibrationApplied, float overcurrentMaxA) {
  if (!currentCalibrationApplied) return AuthorityStatus::CURRENT_CALIBRATION_PENDING;
  if (!std::isfinite(overcurrentMaxA) || overcurrentMaxA <= 0.0f) {
    return AuthorityStatus::OVERCURRENT_LIMIT_PENDING;
  }
  return AuthorityStatus::READY;
}

CurrentDecision classifyCurrent(bool currentValid, float currentA, float overcurrentMaxA) {
  if (!currentValid || !std::isfinite(currentA) || currentA < 0.0f ||
      !std::isfinite(overcurrentMaxA) || overcurrentMaxA <= 0.0f) {
    return CurrentDecision::INVALID;
  }
  return currentA > overcurrentMaxA ? CurrentDecision::OVERCURRENT
                                    : CurrentDecision::SAFE;
}

bool timeoutReached(uint32_t startedAtMs, uint32_t nowMs, uint32_t maxOnMs) {
  return maxOnMs == 0 || static_cast<uint32_t>(nowMs - startedAtMs) >= maxOnMs;
}

} // namespace LoadSafety
