#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — test_engine.h
// Single non-blocking test-state engine. Sequencing + evidence only; ALL
// hardware words pass through SafetyInterlocks guarded interfaces.
//
// Package 5 domain contract:
//   *NodeV = raw ADS/node-domain evidence.
//   *PinV  = calibrated connector/engineering-domain value.
// Diagnostic voltage thresholds are applied ONLY to *PinV values carrying a
// valid CALIBRATED conversion status.
// =============================================================================

#include <cstdint>
#include "channels.h"
#include "pulse_monitor.h"
#include "ina226_service.h"
#include "measurement_conversion.h"

namespace TestEngine {

enum class TestMode : uint8_t {
  NONE = 0,
  ISO7638_VOLTAGE,
  ISO12098_VOLTAGE,
  CABLE_ISO7638,
  CABLE_ISO12098,
  LAMP_ISO12098,
  AXLE_LIFT,
  CAN_TERM_ISO7638_TRACTOR,
  CAN_TERM_ISO7638_TRAILER,
  CAN_TERM_ISO12098_TRACTOR,
  CAN_TERM_ISO12098_TRAILER
};

enum class TestState : uint8_t {
  IDLE, SAFE_CHECK, BASELINE, FOCUS_ON_SETTLE, FOCUS_READ, CROSS_SCAN,
  FOCUS_OFF_SETTLE, SWEEP, SWEEP_GND_OFF,
  TERM_OFF_SETTLE, TERM_ENERGIZE, TERM_READ, TERM_DEENERGIZE,
  LOAD_ON_SETTLE, LOAD_MEASURE, LOAD_OFF,
  COMPLETE, ABORTED, FAULT
};

enum class AbortReason : uint8_t {
  NONE = 0, USER_STOP, EXTERNAL_ENERGY, PRECONDITION,
  INTERLOCK_REJECTED, SERVICE_FAULT, CALIBRATION_PENDING
};

enum class ContinuityResult : uint8_t { PASS, OPEN, INDETERMINATE };
struct CrossResponseResult { bool isCoupled; float deltaPinV; bool valid; };

struct TestEngineConfig {
  // All voltage thresholds below are connector/pin engineering-domain volts.
  float    continuityMinV      = 2.0f;
  float    continuityMaxV      = 5.0f;
  float    openMaxDeltaV       = 1.0f;
  float    crossResponseDeltaV = 1.5f;
  uint32_t cableOnSettleMs     = 50;
  uint32_t cableOffSettleMs    = 20;
  float    externalEnergyDetectV = 10.0f;
  uint32_t k6SettleMs          = 20;
  uint32_t canOffSettleMs      = 20;
  uint32_t termSettleMs        = 50;
  uint32_t loadOnSettleMs      = 100;
  uint32_t lampMaxOnMs         = 5000;
  uint32_t axleMaxOnMs         = 10000;
};

struct TestStartParams {
  TestMode mode            = TestMode::NONE;
  uint32_t enabledPinMask  = 0;
  uint8_t  lampPin         = 0;
  bool deEnergizedConfirmed = false;
  bool axleSafetyConfirmed  = false;
};

struct CablePinResult {
  uint8_t pin;
  Channels::AdcChannel ch;
  uint32_t stepIndex;
  float baselineNodeV;
  float baselinePinV;
  MeasurementConversion::ConversionStatus baselineConversion;
  float focusNodeV;
  float focusPinV;
  MeasurementConversion::ConversionStatus focusConversion;
  ContinuityResult continuity;
  bool processed;
};

struct ShortCandidate {
  uint8_t focusPin;
  uint8_t coupledPin;
  uint32_t stepIndex;
  float baselineNodeV;
  float measuredNodeV;
  float baselinePinV;
  float measuredPinV;
  float deltaPinV;
};

struct VoltagePinResult {
  uint8_t pin;
  Channels::AdcChannel ch;
  float nodeV;
  float pinV;
  MeasurementConversion::ConversionStatus conversion;
  bool nodeValid;
  bool pinValid;
  float k6OffNodeV;
  float k6OffPinV;
  MeasurementConversion::ConversionStatus k6OffConversion;
  bool k6OffNodeValid;
  bool k6OffPinValid;
  PulseMonitor::PulseEvidence pulse;
  bool pulseValid;
};

struct TerminationResult {
  Channels::RelayControl relay;
  float canHNodeV;
  float canLNodeV;
  float deltaNodeV;
  float resistanceOhms;
  MeasurementConversion::ConversionStatus conversion;
  bool nodeValid;
  bool resistanceValid;
};

struct LoadResult {
  float shuntV;  bool shuntValid;
  float currentA; bool currentValid;
  float busV;    bool busValid;
  uint32_t onMs;
};

constexpr uint8_t kMaxPins12098 = 15;
constexpr uint8_t kMaxShorts    = 16;

struct TestResults {
  TestMode mode = TestMode::NONE;
  bool classificationFinal = false;
  CablePinResult   cable[kMaxPins12098]; uint8_t cableCount = 0;
  ShortCandidate   shorts[kMaxShorts];   uint8_t shortCount = 0;
  VoltagePinResult volt[kMaxPins12098];  uint8_t voltCount = 0;
  TerminationResult term;
  LoadResult        load;
};

bool begin(const TestEngineConfig& cfg = TestEngineConfig{});
bool start(const TestStartParams& params);
void step();
void stop();
TestState  state();
AbortReason abortReason();
bool isActive();
const TestResults& results();

} // namespace TestEngine
