#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — adc_service.h
// ADS1115 + 4x 74HC4051 analog acquisition service.
//
// AUTHORITY:
//   - docs/engineering/adc-mux-map.md         (mux coordinates via channels.h,
//                                              NC exclusion)
//   - docs/engineering/measurement-methods.md (sequencing: select -> settle ->
//                                              convert; raw vs converted kept
//                                              separate; filtering rule)
//   - MASTER NET MAP v1.3 §5                  (ADS1115 ADDR -> GND = 0x48)
//   - MASTER NET MAP v1.3 §12                 (shared I2C bus: ADS1115 + INA226
//                                              + RTC)
//
// I2C BUS OWNERSHIP:
//   The I2C bus is shared (NET MAP §12). Wire initialization is CENTRALLY
//   OWNED: a single startup owner performs Wire.begin() once (firmware main /
//   bus init step, IMPLEMENTATION_PLAN Phase 1). AdcService::begin() does NOT
//   (re)initialize Wire; it assumes an already-initialized bus and only probes
//   the ADS1115 address. All I2C services (ADC, INA226, RTC) must follow the
//   same rule: never reinitialize the shared bus.
//
// DELIBERATELY NOT HERE:
//   - NO engineering/vehicle-voltage conversion. Calibration coefficients are
//     PENDING (docs/engineering/calibration.md) and belong to a separate
//     calibration/conversion module. This service exposes RAW ADC codes and
//     signed ADS node volts (vNode) only. Node volts are NOT clamped: small
//     negative zero-offset values are preserved for later calibration.
//   - NO K6 / MASTER_GND control (owned by safety/test engine).
//   - NO PASS/FAIL thresholds, NO classification.
//   - All timing / sampling / gain parameters are PROVISIONAL scaffold values,
//     NOT production-frozen. Bench characterization required.
// =============================================================================

#include <cstdint>
#include "channels.h"

namespace AdcService {

enum class AdcError : uint8_t {
  NONE = 0,
  NOT_READY,
  INVALID_CHANNEL,
  I2C_FAULT,
  CONVERSION_TIMEOUT
};

struct AdcConfig {
  uint8_t  i2cAddress          = 0x48;
  uint8_t  gainCode            = 1;
  uint8_t  dataRateCode        = 4;
  uint32_t muxSettleMs         = 5;
  uint32_t postSettleUs        = 300;
  bool     discardFirstRead    = true;
  uint8_t  sampleCount         = 3;
  uint32_t interSampleUs       = 200;
  bool     disableMuxAfterRead = true;
};

struct NodeSample {
  float    vNode;
  bool     valid;
  AdcError error;
};

bool begin(const AdcConfig& cfg = AdcConfig{});
bool isReady();
AdcError lastError();

bool readRaw(Channels::AdcChannel ch, int16_t& rawOut);
bool readNodeVolts(Channels::AdcChannel ch, float& vNodeOut);
void scanAllNodes(NodeSample* out, uint8_t count);

} // namespace AdcService
