#pragma once

#include "measurement_conversion.h"

namespace TestEngineDomain {

enum class ContinuityDecision : unsigned char { PASS, OPEN, INDETERMINATE, PENDING };

struct CrossDecision {
  bool valid;
  bool coupled;
  float deltaPinV;
};

enum class EnergyDecision : unsigned char { SAFE, EXTERNAL_ENERGY, PENDING };

bool usable(const MeasurementConversion::PinVoltage& sample);

ContinuityDecision classifyContinuity(
    const MeasurementConversion::PinVoltage& baseline,
    const MeasurementConversion::PinVoltage& measured,
    float continuityMinV,
    float continuityMaxV,
    float openMaxDeltaV);

CrossDecision classifyCross(
    const MeasurementConversion::PinVoltage& baseline,
    const MeasurementConversion::PinVoltage& measured,
    float crossResponseDeltaV);

EnergyDecision classifyExternalEnergy(
    const MeasurementConversion::PinVoltage& measured,
    float externalEnergyDetectV);

} // namespace TestEngineDomain
