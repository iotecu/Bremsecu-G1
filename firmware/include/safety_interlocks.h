#pragma once

#include <cstdint>

namespace SafetyInterlocks {

void begin();
void clearCanSelection();
bool energizeCanRelay(int relayBit);
void faultSafe();
bool applyCableTestOutput(uint32_t cableOutputBits);
bool applyMeasurementReference(uint32_t bits);
bool applyLoadOutput(uint32_t loadOutputBits);

} // namespace SafetyInterlocks
