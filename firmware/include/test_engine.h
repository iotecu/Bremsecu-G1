#pragma once

#include <cstdint>
#include "channels.h"
#include "pulse_monitor.h"
#include "ina226_service.h"

namespace TestEngine {

enum class TestMode : uint8_t { NONE = 0, ISO7638_VOLTAGE, ISO12098_VOLTAGE, CABLE_ISO7638, CABLE_ISO12098, LAMP_ISO12098, AXLE_LIFT, CAN_TERM_ISO7638_TRACTOR, CAN_TERM_ISO7638_TRAILER, CAN_TERM_ISO12098_TRACTOR, CAN_TERM_ISO12098_TRAILER };
enum class TestState : uint8_t { IDLE, SAFE_CHECK, BASELINE, FOCUS_ON_SETTLE, FOCUS_READ, CROSS_SCAN, FOCUS_OFF_SETTLE, SWEEP, SWEEP_GND_OFF, TERM_OFF_SETTLE, TERM_ENERGIZE, TERM_READ, TERM_DEENERGIZE, LOAD_ON_SETTLE, LOAD_MEASURE, LOAD_OFF, COMPLETE, ABORTED, FAULT };
enum class AbortReason : uint8_t { NONE = 0, USER_STOP, EXTERNAL_ENERGY, PRECONDITION, INTERLOCK_REJECTED, SERVICE_FAULT };
enum class ContinuityResult : uint8_t { PASS, OPEN, INDETERMINATE };
struct CrossResponseResult { bool isCoupled; float delta; };

struct TestEngineConfig {
  float continuityMinV = 2.0f;
  float continuityMaxV = 5.0f;
  float openMaxDeltaV = 1.0f;
  float crossResponseDeltaV = 1.5f;
  uint32_t cableOnSettleMs = 50;
  uint32_t cableOffSettleMs = 20;
  float externalEnergyDetectV = 10.0f;
  uint32_t k6SettleMs = 20;
  uint32_t canOffSettleMs = 20;
  uint32_t termSettleMs = 50;
  uint32_t loadOnSettleMs = 100;
  uint32_t lampMaxOnMs = 5000;
  uint32_t axleMaxOnMs = 10000;
};

struct TestStartParams { TestMode mode = TestMode::NONE; uint32_t enabledPinMask = 0; uint8_t lampPin = 0; bool deEnergizedConfirmed = false; bool axleSafetyConfirmed = false; };
struct CablePinResult { uint8_t pin; Channels::AdcChannel ch; uint32_t stepIndex; float baselineV; float focusV; ContinuityResult continuity; bool processed; };
struct ShortCandidate { uint8_t focusPin; uint8_t coupledPin; uint32_t stepIndex; float deltaV; };
struct VoltagePinResult { uint8_t pin; Channels::AdcChannel ch; float nodeV; bool valid; float k6OffV; bool k6OffValid; PulseMonitor::PulseEvidence pulse; bool pulseValid; };
struct TerminationResult { Channels::RelayControl relay; float vhV, vlV, deltaV; bool valid; };
struct LoadResult { float shuntV; bool shuntValid; float currentA; bool currentValid; float busV; bool busValid; uint32_t onMs; };

constexpr uint8_t kMaxPins12098 = 15;
constexpr uint8_t kMaxShorts = 16;
struct TestResults { TestMode mode = TestMode::NONE; bool classificationFinal = false; CablePinResult cable[kMaxPins12098]; uint8_t cableCount = 0; ShortCandidate shorts[kMaxShorts]; uint8_t shortCount = 0; VoltagePinResult volt[kMaxPins12098]; uint8_t voltCount = 0; TerminationResult term; LoadResult load; };

bool begin(const TestEngineConfig& cfg = TestEngineConfig{});
bool start(const TestStartParams& params);
void step();
void stop();
TestState state();
AbortReason abortReason();
bool isActive();
const TestResults& results();

} // namespace TestEngine
