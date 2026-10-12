#include "test_engine_domain.h"

#include <cmath>

namespace TestEngineDomain {

bool usable(const MeasurementConversion::PinVoltage& sample) {
  return sample.status == MeasurementConversion::ConversionStatus::CALIBRATED &&
         std::isfinite(sample.vPin);
}

ContinuityDecision classifyContinuity(
    const MeasurementConversion::PinVoltage& baseline,
    const MeasurementConversion::PinVoltage& measured,
    float continuityMinV,
    float continuityMaxV,
    float openMaxDeltaV) {
  if (!usable(baseline) || !usable(measured)) return ContinuityDecision::PENDING;
  const float deltaPinV = measured.vPin - baseline.vPin;
  if (measured.vPin >= continuityMinV && measured.vPin <= continuityMaxV &&
      deltaPinV >= continuityMinV) {
    return ContinuityDecision::PASS;
  }
  if (deltaPinV < openMaxDeltaV) return ContinuityDecision::OPEN;
  return ContinuityDecision::INDETERMINATE;
}

CrossDecision classifyCross(
    const MeasurementConversion::PinVoltage& baseline,
    const MeasurementConversion::PinVoltage& measured,
    float crossResponseDeltaV) {
  if (!usable(baseline) || !usable(measured)) return {false, false, 0.0f};
  const float deltaPinV = measured.vPin - baseline.vPin;
  return {true, deltaPinV >= crossResponseDeltaV, deltaPinV};
}

EnergyDecision classifyExternalEnergy(
    const MeasurementConversion::PinVoltage& measured,
    float externalEnergyDetectV) {
  if (!usable(measured)) return EnergyDecision::PENDING;
  return measured.vPin > externalEnergyDetectV
      ? EnergyDecision::EXTERNAL_ENERGY
      : EnergyDecision::SAFE;
}

} // namespace TestEngineDomain
