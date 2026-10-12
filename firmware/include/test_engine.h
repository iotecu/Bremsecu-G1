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
//
// Package 8 load-safety contract:
//   - 24V load output is forbidden before external-energy prescan completes.
//   - load output is forbidden while INA226 current calibration is pending.
//   - load output is forbidden while the overcurrent limit is not explicitly
//     configured from verified engineering authority.
//   - overcurrent and max-on timeout both force deterministic fault-safe OFF.
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
  INTERLOCK_REJECTED, SERVICE_FAULT, CALIBRATION_PENDING,
  OVERCURRENT
};

enum class ContinuityResult : uint8_t { PASS, OPEN, INDETERMINATE };
struct CrossResponseResult { bool isCoupled; float deltaPinV; bool valid; };

struct TestEngineConfig {
  // Rev-2 bench cable-test classification. Normal signal lines use the
  // characterized 3.3V window below. GND continuity is temporarily bypassed
  // in firmware because the Rev-2 board's fixed 3.3V GND injection can create
  // a false positive; Rev-3 will add a relay to isolate that path in cable mode.
  bool     cableClassificationReady = true;
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
  // Active REV-2 bench rail measured stable at 3.28 V. If later hardware
  // differs, characterize this value before freezing production thresholds.
  float    canReferenceV       = 3.28f;
  float    canReferenceOhms    = 1500.0f;

  // REV-2 bench anchors captured with a known 120-ohm H-L termination and
  // the MUX held continuously on CAN-H_R. These are path-specific because the
  // four relay/routing paths do not present the same CAN-H node voltage.
  // This is a one-point bench calibration for the present prototype; 60/220
  // ohm points will be added after the 120-ohm path is proven stable.
  float    can120V7638Tractor  = 1.58f;
  float    can120V7638Trailer  = 1.20f;
  float    can120V12098Tractor = 1.55f;
  float    can120V12098Trailer = 1.75f;

  uint32_t loadOnSettleMs      = 100;
  uint32_t lampMaxOnMs         = 5000;
  uint32_t axleMaxOnMs         = 10000;

  // Package 8: intentionally NOT frozen. Zero means engineering authority is
  // absent and load tests are rejected before 24V can be applied. This value
  // must only be populated after actual shunt/current bench verification.
  float    loadOvercurrentMaxA = 0.0f;

  // Monitoring cadence is an implementation watchdog cadence, not a diagnostic
  // PASS/FAIL threshold. The hard max-on timers remain authoritative shutdowns.
  uint32_t loadSampleIntervalMs = 20;
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

  // Latest live sample. Voltage modes are continuous until the user exits.
  float nodeV;
  float pinV;
  MeasurementConversion::ConversionStatus conversion;
  bool nodeValid;
  bool pinValid;

  // ISO12098 startup reference: mean of the first ten complete sweeps.
  float baselineNodeV;
  float baselinePinV;
  bool baselineReady;

  // GND-assist is diagnostic evidence only. A value measured while assisted
  // must never be promoted to a natural PASS.
  bool groundAssistActive;

  // Legacy fields are retained for record/API compatibility. The continuous
  // voltage workflow no longer releases K6 for a separate K6-OFF phase.
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
  float shuntV;      bool shuntValid;
  float currentA;    bool currentValid;
  float peakCurrentA; bool peakCurrentValid;
  float busV;        bool busValid;
  uint32_t sampleCount;
  uint32_t onMs;
  bool overcurrent;
  bool timedOut;
};

constexpr uint8_t kMaxPins12098 = 15;
constexpr uint8_t kMaxShorts    = 16;

struct TestResults {
  TestMode mode = TestMode::NONE;
  bool classificationFinal = false;
  uint32_t voltageSweepGeneration = 0;
  uint32_t voltageSweepCount = 0;
  bool voltageBaselineReady = false;
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

// Dynamic voltage-test focus. For ISO7638 only GND pins 3/4 are accepted.
// For ISO12098 command pins are focus/expectation controls; GND pins 4/13
// additionally drive the external MASTER_GND assist relays.
// CAN pins and permanent +24V have no focus toggle.
bool setVoltageFocus(uint8_t pin, bool active);
uint8_t voltageFocusPin();

const TestResults& results();

} // namespace TestEngine
