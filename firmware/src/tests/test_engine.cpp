// =============================================================================
// BREMSECU G1 REV-2 — test_engine.cpp
// Non-blocking test-state machine. Evidence + sequencing; every hardware word
// goes through SafetyInterlocks guarded interfaces.
//
// Package 5: raw ADS/node evidence is preserved, but every threshold-bearing
// decision is made only from calibrated connector/pin-domain values.
// =============================================================================

#include "test_engine.h"

#include <Arduino.h>

#include "tpic_map.h"
#include "tpic_control.h"
#include "safety_interlocks.h"
#include "adc_service.h"
#include "calibration_runtime.h"
#include "test_engine_domain.h"
#include "load_safety.h"

namespace TestEngine {
namespace {

TestEngineConfig gCfg;
TestStartParams  gParams;
TestResults      gRes;
TestState        gState = TestState::IDLE;
AbortReason      gAbort = AbortReason::NONE;

uint32_t gDeadline  = 0;
uint8_t  gPinIdx    = 0;
uint8_t  gChanIdx   = 0;
uint8_t  gFocusPin  = 0;
uint32_t gStepIndex = 0;
Channels::AdcChannel gFocusCh = Channels::kNoChannel;
float gBaselineNodeV[Channels::kAdcChannelCount];
MeasurementConversion::PinVoltage gBaselinePin[Channels::kAdcChannelCount];
uint32_t gLoadStart = 0;
uint32_t gLastLoadSample = 0;
bool gLoadEnergized = false;

uint32_t nowMs() { return millis(); }
void setDeadline(uint32_t ms) { gDeadline = nowMs() + ms; }
bool deadlineReached() { return (int32_t)(nowMs() - gDeadline) >= 0; }

bool isVoltage(TestMode m) { return m == TestMode::ISO7638_VOLTAGE || m == TestMode::ISO12098_VOLTAGE; }
bool isCable(TestMode m)   { return m == TestMode::CABLE_ISO7638 || m == TestMode::CABLE_ISO12098; }
bool isTerm(TestMode m)    { return m >= TestMode::CAN_TERM_ISO7638_TRACTOR && m <= TestMode::CAN_TERM_ISO12098_TRAILER; }
bool isLoad(TestMode m)    { return m == TestMode::LAMP_ISO12098 || m == TestMode::AXLE_LIFT; }

Channels::Socket socketFor(TestMode m) {
  switch (m) {
    case TestMode::ISO7638_VOLTAGE:
    case TestMode::CABLE_ISO7638:
    case TestMode::CAN_TERM_ISO7638_TRACTOR:
    case TestMode::CAN_TERM_ISO7638_TRAILER:
      return Channels::Socket::ISO7638;
    default:
      return Channels::Socket::ISO12098;
  }
}

uint8_t pinCountFor(Channels::Socket s) {
  return s == Channels::Socket::ISO7638
      ? Channels::kSocketPinCount7638 : Channels::kSocketPinCount12098;
}

Channels::RelayControl termRelayFor(TestMode m) {
  switch (m) {
    case TestMode::CAN_TERM_ISO7638_TRACTOR:  return Channels::RelayControl::RELAY_CAN7638_CK;
    case TestMode::CAN_TERM_ISO7638_TRAILER:  return Channels::RelayControl::RELAY_CAN7638_DR;
    case TestMode::CAN_TERM_ISO12098_TRACTOR: return Channels::RelayControl::RELAY_CAN12098_CK;
    default:                                  return Channels::RelayControl::RELAY_CAN12098_DR;
  }
}

Channels::AdcChannel termPairFor(TestMode m, bool wantH) {
  const bool is7638 = m == TestMode::CAN_TERM_ISO7638_TRACTOR ||
                      m == TestMode::CAN_TERM_ISO7638_TRAILER;
  if (is7638) return wantH ? Channels::AdcChannel::MUX_CANH_1_R
                           : Channels::AdcChannel::MUX_CANL_1_R;
  return wantH ? Channels::AdcChannel::MUX_CANH_2_R
               : Channels::AdcChannel::MUX_CANL_2_R;
}

bool isGroundChannel(Channels::AdcChannel ch) {
  return ch == Channels::AdcChannel::MUX_7P_GND1 ||
         ch == Channels::AdcChannel::MUX_7P_GND2 ||
         ch == Channels::AdcChannel::MUX_15P_GND3 ||
         ch == Channels::AdcChannel::MUX_15P_GND4;
}

bool isApprovedLampPin(uint8_t pin) {
  return pin == 1 || pin == 2 || pin == 3 || pin == 5 ||
         pin == 6 || pin == 7 || pin == 8;
}

uint32_t loadBitFor(TestMode m, uint8_t lampPin) {
  if (m == TestMode::AXLE_LIFT) return 1UL << TpicBit::OUT19_ASANSOR;
  const Channels::TpicOutput out =
      Channels::tpicOutputFor(Channels::Socket::ISO12098, lampPin);
  if (out == Channels::kNoTpicOutput) return 0;
  return 1UL << Channels::tpicBitFor(out);
}

void fault(AbortReason r) {
  if (gLoadEnergized) {
    gRes.load.onMs = nowMs() - gLoadStart;
    gLoadEnergized = false;
  }
  SafetyInterlocks::faultSafe();
  gAbort = r;
  gState = r == AbortReason::USER_STOP ? TestState::ABORTED : TestState::FAULT;
}

bool readChannelNode(Channels::AdcChannel ch, float& nodeV) {
  if (!Channels::isValidDiagnosticChannel(ch)) return false;
  return AdcService::readNodeVolts(ch, nodeV);
}

MeasurementConversion::PinVoltage convertPin(
    Channels::AdcChannel ch, float nodeV) {
  return MeasurementConversion::convertNodeToPin(
      CalibrationRuntime::table(), ch, nodeV);
}

bool readChannelSample(
    Channels::AdcChannel ch,
    float& nodeV,
    MeasurementConversion::PinVoltage& pin) {
  if (!readChannelNode(ch, nodeV)) return false;
  pin = convertPin(ch, nodeV);
  return true;
}

bool readPinSample(
    uint8_t pinNumber,
    float& nodeV,
    MeasurementConversion::PinVoltage& pin) {
  const Channels::AdcChannel ch =
      Channels::pinToChannel(socketFor(gParams.mode), pinNumber);
  if (ch == Channels::kNoChannel) return false;
  return readChannelSample(ch, nodeV, pin);
}

ContinuityResult continuityFromDecision(TestEngineDomain::ContinuityDecision d) {
  switch (d) {
    case TestEngineDomain::ContinuityDecision::PASS: return ContinuityResult::PASS;
    case TestEngineDomain::ContinuityDecision::OPEN: return ContinuityResult::OPEN;
    default: return ContinuityResult::INDETERMINATE;
  }
}

CrossResponseResult classifyCross(
    const MeasurementConversion::PinVoltage& baseline,
    const MeasurementConversion::PinVoltage& measured) {
  const auto d = TestEngineDomain::classifyCross(
      baseline, measured, gCfg.crossResponseDeltaV);
  return {d.coupled, d.deltaPinV, d.valid};
}

uint8_t nextValidEnabledPin(uint8_t fromPin) {
  const Channels::Socket s = socketFor(gParams.mode);
  const uint8_t n = pinCountFor(s);
  for (uint8_t p = fromPin; p <= n; ++p) {
    if (!(gParams.enabledPinMask & (1UL << (p - 1)))) continue;
    if (Channels::pinToChannel(s, p) == Channels::kNoChannel) continue;
    return p;
  }
  return 0;
}

void addShort(
    uint8_t focusPin,
    uint8_t coupledPin,
    float baselineNodeV,
    float measuredNodeV,
    float baselinePinV,
    float measuredPinV,
    float deltaPinV) {
  if (gRes.shortCount >= kMaxShorts) return;
  ShortCandidate& s = gRes.shorts[gRes.shortCount++];
  s.focusPin = focusPin;
  s.coupledPin = coupledPin;
  s.stepIndex = gStepIndex;
  s.baselineNodeV = baselineNodeV;
  s.measuredNodeV = measuredNodeV;
  s.baselinePinV = baselinePinV;
  s.measuredPinV = measuredPinV;
  s.deltaPinV = deltaPinV;
}

CablePinResult* findCableResult(uint8_t pin) {
  for (uint8_t i = 0; i < gRes.cableCount; ++i)
    if (gRes.cable[i].pin == pin) return &gRes.cable[i];
  return nullptr;
}

void markFocusStep() {
  ++gStepIndex;
  CablePinResult* r = findCableResult(gFocusPin);
  if (r) r->stepIndex = gStepIndex;
}

void stepSafeCheck() {
  // Load tests must establish current-safety authority before ANY 24V output.
  if (isLoad(gParams.mode)) {
    if (gParams.mode == TestMode::LAMP_ISO12098 &&
        !isApprovedLampPin(gParams.lampPin)) {
      fault(AbortReason::PRECONDITION); return;
    }
    if (gParams.mode == TestMode::AXLE_LIFT &&
        !gParams.axleSafetyConfirmed) {
      fault(AbortReason::PRECONDITION); return;
    }
    const uint32_t lb = loadBitFor(gParams.mode, gParams.lampPin);
    if (lb == 0) { fault(AbortReason::PRECONDITION); return; }

    const LoadSafety::AuthorityStatus authority = LoadSafety::authorityStatus(
        Ina226Service::isCalibrationApplied(), gCfg.loadOvercurrentMaxA);
    if (authority != LoadSafety::AuthorityStatus::READY) {
      fault(AbortReason::CALIBRATION_PENDING); return;
    }
  }

  if (isVoltage(gParams.mode)) {
    if (!SafetyInterlocks::applyMeasurementReference(
            1UL << TpicBit::K6_MASTER_GND)) {
      fault(AbortReason::INTERLOCK_REJECTED); return;
    }
    gPinIdx = 1;
    gState = TestState::SWEEP;
    return;
  }

  // Cable, termination and LOAD safety pre-scan. externalEnergyDetectV is a
  // PIN-domain threshold; raw ADS/node volts are never compared against it.
  // For load modes this loop completes before applyLoadOutput() is reachable.
  const uint8_t n = pinCountFor(socketFor(gParams.mode));
  while (gPinIdx <= n) {
    float nodeV = 0.0f;
    MeasurementConversion::PinVoltage pin{};
    if (!readPinSample(gPinIdx, nodeV, pin)) {
      fault(AbortReason::SERVICE_FAULT); return;
    }
    const auto d = TestEngineDomain::classifyExternalEnergy(
        pin, gCfg.externalEnergyDetectV);
    if (d == TestEngineDomain::EnergyDecision::PENDING) {
      fault(AbortReason::CALIBRATION_PENDING); return;
    }
    if (d == TestEngineDomain::EnergyDecision::EXTERNAL_ENERGY) {
      fault(AbortReason::EXTERNAL_ENERGY); return;
    }
    ++gPinIdx;
  }

  if (isLoad(gParams.mode)) {
    const uint32_t lb = loadBitFor(gParams.mode, gParams.lampPin);
    if (!SafetyInterlocks::applyLoadOutput(lb)) {
      fault(AbortReason::INTERLOCK_REJECTED); return;
    }
    gLoadStart = nowMs();
    gLastLoadSample = gLoadStart;
    gLoadEnergized = true;
    setDeadline(gCfg.loadOnSettleMs);
    gState = TestState::LOAD_ON_SETTLE;
    return;
  }

  if (isCable(gParams.mode)) {
    gChanIdx = 0;
    gState = TestState::BASELINE;
    return;
  }
  if (isTerm(gParams.mode)) {
    if (!gParams.deEnergizedConfirmed) {
      fault(AbortReason::PRECONDITION); return;
    }
    SafetyInterlocks::clearCanSelection();
    setDeadline(gCfg.canOffSettleMs);
    gState = TestState::TERM_OFF_SETTLE;
  }
}

void stepTermOffSettle() {
  if (!deadlineReached()) return;
  const int relayBit = Channels::tpicBitFor(termRelayFor(gParams.mode));
  if (!SafetyInterlocks::energizeCanRelay(relayBit)) {
    fault(AbortReason::INTERLOCK_REJECTED); return;
  }
  setDeadline(gCfg.termSettleMs);
  gState = TestState::TERM_ENERGIZE;
}

void stepBaseline() {
  const Channels::ChannelList list =
      Channels::scanChannelsFor(socketFor(gParams.mode));
  while (gChanIdx < list.count) {
    const Channels::AdcChannel ch = list.ch[gChanIdx];
    float nodeV = 0.0f;
    MeasurementConversion::PinVoltage pin{};
    if (!readChannelSample(ch, nodeV, pin)) {
      fault(AbortReason::SERVICE_FAULT); return;
    }
    gBaselineNodeV[static_cast<uint8_t>(ch)] = nodeV;
    gBaselinePin[static_cast<uint8_t>(ch)] = pin;
    ++gChanIdx;
  }

  gRes.cableCount = 0;
  const Channels::Socket s = socketFor(gParams.mode);
  const uint8_t n = pinCountFor(s);
  for (uint8_t p = 1; p <= n && gRes.cableCount < kMaxPins12098; ++p) {
    if (!(gParams.enabledPinMask & (1UL << (p - 1)))) continue;
    const Channels::AdcChannel ch = Channels::pinToChannel(s, p);
    if (ch == Channels::kNoChannel) continue;
    CablePinResult& r = gRes.cable[gRes.cableCount++];
    const auto& basePin = gBaselinePin[static_cast<uint8_t>(ch)];
    r.pin = p;
    r.ch = ch;
    r.stepIndex = 0;
    r.baselineNodeV = gBaselineNodeV[static_cast<uint8_t>(ch)];
    r.baselinePinV = basePin.vPin;
    r.baselineConversion = basePin.status;
    r.focusNodeV = 0.0f;
    r.focusPinV = 0.0f;
    r.focusConversion = MeasurementConversion::ConversionStatus::PENDING;
    r.processed = false;
    r.continuity = ContinuityResult::INDETERMINATE;
  }

  gFocusPin = nextValidEnabledPin(1);
  if (gFocusPin == 0) {
    SafetyInterlocks::faultSafe(); gState = TestState::COMPLETE; return;
  }
  gFocusCh = Channels::pinToChannel(s, gFocusPin);
  const Channels::TpicOutput out = Channels::tpicOutputFor(s, gFocusPin);
  if (out == Channels::kNoTpicOutput) {
    fault(AbortReason::PRECONDITION); return;
  }
  if (!SafetyInterlocks::applyCableTestOutput(
          1UL << Channels::tpicBitFor(out))) {
    fault(AbortReason::INTERLOCK_REJECTED); return;
  }
  markFocusStep();
  setDeadline(gCfg.cableOnSettleMs);
  gState = TestState::FOCUS_ON_SETTLE;
}

void stepFocusRead() {
  float nodeV = 0.0f;
  MeasurementConversion::PinVoltage pin{};
  if (!readChannelSample(gFocusCh, nodeV, pin)) {
    fault(AbortReason::SERVICE_FAULT); return;
  }
  CablePinResult* r = findCableResult(gFocusPin);
  if (r) {
    r->focusNodeV = nodeV;
    r->focusPinV = pin.vPin;
    r->focusConversion = pin.status;
    const auto d = TestEngineDomain::classifyContinuity(
        gBaselinePin[static_cast<uint8_t>(gFocusCh)], pin,
        gCfg.continuityMinV, gCfg.continuityMaxV, gCfg.openMaxDeltaV);
    r->continuity = continuityFromDecision(d);
    r->processed = true;
  }
  gChanIdx = 0;
  gState = TestState::CROSS_SCAN;
}

void stepCrossScan() {
  const Channels::ChannelList list =
      Channels::scanChannelsFor(socketFor(gParams.mode));
  while (gChanIdx < list.count) {
    const Channels::AdcChannel ch = list.ch[gChanIdx];
    if (ch != gFocusCh) {
      float nodeV = 0.0f;
      MeasurementConversion::PinVoltage pin{};
      if (!readChannelSample(ch, nodeV, pin)) {
        fault(AbortReason::SERVICE_FAULT); return;
      }
      const uint8_t index = static_cast<uint8_t>(ch);
      const CrossResponseResult cr = classifyCross(gBaselinePin[index], pin);
      if (cr.valid && cr.isCoupled) {
        const Channels::SocketPin sp = Channels::channelToPin(ch);
        addShort(
            gFocusPin, sp.valid ? sp.pin : 0,
            gBaselineNodeV[index], nodeV,
            gBaselinePin[index].vPin, pin.vPin, cr.deltaPinV);
      }
    }
    ++gChanIdx;
  }
  if (!SafetyInterlocks::applyCableTestOutput(0)) {
    fault(AbortReason::INTERLOCK_REJECTED); return;
  }
  setDeadline(gCfg.cableOffSettleMs);
  gState = TestState::FOCUS_OFF_SETTLE;
}

void stepFocusOffSettle() {
  gFocusPin = nextValidEnabledPin(static_cast<uint8_t>(gFocusPin + 1));
  if (gFocusPin == 0) {
    SafetyInterlocks::faultSafe(); gState = TestState::COMPLETE; return;
  }
  const Channels::Socket s = socketFor(gParams.mode);
  gFocusCh = Channels::pinToChannel(s, gFocusPin);
  const Channels::TpicOutput out = Channels::tpicOutputFor(s, gFocusPin);
  if (out == Channels::kNoTpicOutput) {
    fault(AbortReason::PRECONDITION); return;
  }
  if (!SafetyInterlocks::applyCableTestOutput(
          1UL << Channels::tpicBitFor(out))) {
    fault(AbortReason::INTERLOCK_REJECTED); return;
  }
  markFocusStep();
  setDeadline(gCfg.cableOnSettleMs);
  gState = TestState::FOCUS_ON_SETTLE;
}

void stepSweep() {
  const Channels::Socket s = socketFor(gParams.mode);
  const uint8_t n = pinCountFor(s);
  if (gPinIdx > n) {
    SafetyInterlocks::faultSafe(); gState = TestState::COMPLETE; return;
  }
  if (gRes.voltCount >= kMaxPins12098) {
    fault(AbortReason::SERVICE_FAULT); return;
  }

  const Channels::AdcChannel ch = Channels::pinToChannel(s, gPinIdx);
  float nodeV = 0.0f;
  MeasurementConversion::PinVoltage pin{};
  if (ch == Channels::kNoChannel || !readChannelSample(ch, nodeV, pin)) {
    fault(AbortReason::SERVICE_FAULT); return;
  }

  VoltagePinResult& r = gRes.volt[gRes.voltCount];
  r.pin = gPinIdx;
  r.ch = ch;
  r.nodeV = nodeV;
  r.pinV = pin.vPin;
  r.conversion = pin.status;
  r.nodeValid = true;
  r.pinValid = TestEngineDomain::usable(pin);
  r.k6OffNodeValid = false;
  r.k6OffPinValid = false;
  r.k6OffConversion = MeasurementConversion::ConversionStatus::PENDING;
  r.pulseValid = false;

  if (s == Channels::Socket::ISO12098 && (gPinIdx == 1 || gPinIdx == 2)) {
    PulseMonitor::PulseEvidence ev;
    const PulseMonitor::PulseInput pi = gPinIdx == 2
        ? PulseMonitor::PulseInput::SAG : PulseMonitor::PulseInput::SOL;
    if (PulseMonitor::snapshot(pi, ev)) {
      r.pulse = ev;
      r.pulseValid = true;
    }
  }

  if (isGroundChannel(ch)) {
    if (!SafetyInterlocks::applyMeasurementReference(0)) {
      fault(AbortReason::INTERLOCK_REJECTED); return;
    }
    setDeadline(gCfg.k6SettleMs);
    gState = TestState::SWEEP_GND_OFF;
    return;
  }

  ++gRes.voltCount;
  ++gPinIdx;
}

void stepSweepGndOff() {
  if (!deadlineReached()) return;
  VoltagePinResult& r = gRes.volt[gRes.voltCount];
  float nodeV = 0.0f;
  MeasurementConversion::PinVoltage pin{};
  if (!readChannelSample(r.ch, nodeV, pin)) {
    fault(AbortReason::SERVICE_FAULT); return;
  }
  r.k6OffNodeV = nodeV;
  r.k6OffPinV = pin.vPin;
  r.k6OffConversion = pin.status;
  r.k6OffNodeValid = true;
  r.k6OffPinValid = TestEngineDomain::usable(pin);
  if (!SafetyInterlocks::applyMeasurementReference(
          1UL << TpicBit::K6_MASTER_GND)) {
    fault(AbortReason::INTERLOCK_REJECTED); return;
  }
  ++gRes.voltCount;
  ++gPinIdx;
  gState = TestState::SWEEP;
}

void stepTermRead() {
  if (!deadlineReached()) return;
  const TestMode m = gParams.mode;
  float vhNodeV = 0.0f, vlNodeV = 0.0f;
  const bool okH = readChannelNode(termPairFor(m, true), vhNodeV);
  const bool okL = readChannelNode(termPairFor(m, false), vlNodeV);
  if (!okH || !okL) {
    SafetyInterlocks::clearCanSelection();
    fault(AbortReason::SERVICE_FAULT); return;
  }

  const auto resistance = MeasurementConversion::convertCanDeltaToOhms(
      vhNodeV, vlNodeV);
  gRes.term.relay = termRelayFor(m);
  gRes.term.canHNodeV = vhNodeV;
  gRes.term.canLNodeV = vlNodeV;
  gRes.term.deltaNodeV = vhNodeV - vlNodeV;
  gRes.term.resistanceOhms = resistance.ohms;
  gRes.term.conversion = resistance.status;
  gRes.term.nodeValid = true;
  gRes.term.resistanceValid =
      resistance.status == MeasurementConversion::ConversionStatus::DERIVED ||
      resistance.status == MeasurementConversion::ConversionStatus::OPEN_CIRCUIT;

  SafetyInterlocks::clearCanSelection();
  gState = TestState::TERM_DEENERGIZE;
}

void stepLoad() {
  if (!gLoadEnergized) {
    fault(AbortReason::SERVICE_FAULT); return;
  }

  const uint32_t now = nowMs();
  const uint32_t maxOn = gParams.mode == TestMode::AXLE_LIFT
      ? gCfg.axleMaxOnMs : gCfg.lampMaxOnMs;

  // Hard timeout is checked before any sensor transaction so I2C activity can
  // never extend an energized load beyond its maximum ON budget.
  if (LoadSafety::timeoutReached(gLoadStart, now, maxOn)) {
    gRes.load.onMs = now - gLoadStart;
    gRes.load.timedOut = true;
    gLoadEnergized = false;
    SafetyInterlocks::faultSafe();
    gState = TestState::LOAD_OFF;
    return;
  }

  if (static_cast<uint32_t>(now - gLastLoadSample) < gCfg.loadSampleIntervalMs) {
    return;
  }
  gLastLoadSample = now;

  Ina226Service::Ina226Sample smp;
  if (!Ina226Service::sample(smp)) {
    fault(AbortReason::SERVICE_FAULT); return;
  }
  if (!smp.shuntValid || !smp.busValid || !smp.currentValid) {
    fault(AbortReason::CALIBRATION_PENDING); return;
  }

  gRes.load.shuntV = smp.shuntVolts;
  gRes.load.shuntValid = true;
  gRes.load.currentA = smp.currentA;
  gRes.load.currentValid = true;
  gRes.load.busV = smp.busVolts;
  gRes.load.busValid = true;
  ++gRes.load.sampleCount;

  if (!gRes.load.peakCurrentValid || smp.currentA > gRes.load.peakCurrentA) {
    gRes.load.peakCurrentA = smp.currentA;
    gRes.load.peakCurrentValid = true;
  }

  const LoadSafety::CurrentDecision decision = LoadSafety::classifyCurrent(
      smp.currentValid, smp.currentA, gCfg.loadOvercurrentMaxA);
  if (decision == LoadSafety::CurrentDecision::INVALID) {
    fault(AbortReason::SERVICE_FAULT); return;
  }
  if (decision == LoadSafety::CurrentDecision::OVERCURRENT) {
    gRes.load.overcurrent = true;
    fault(AbortReason::OVERCURRENT); return;
  }
}

} // namespace

bool begin(const TestEngineConfig& cfg) {
  gCfg = cfg;
  gState = TestState::IDLE;
  gAbort = AbortReason::NONE;
  return true;
}

bool start(const TestStartParams& params) {
  if (isActive()) return false;
  if (params.mode == TestMode::NONE) {
    gAbort = AbortReason::PRECONDITION; return false;
  }
  if (!AdcService::isReady()) {
    gAbort = AbortReason::PRECONDITION; return false;
  }
  if (isLoad(params.mode) && !Ina226Service::isReady()) {
    gAbort = AbortReason::PRECONDITION; return false;
  }
  if (isCable(params.mode) && params.enabledPinMask == 0) {
    gAbort = AbortReason::PRECONDITION; return false;
  }
  // Cable PASS/OPEN/coupling thresholds are not production-authorized yet.
  // Reject the mode before any output can be energized unless an explicitly
  // reviewed configuration marks that authority ready.
  if (isCable(params.mode) && !gCfg.cableClassificationReady) {
    gAbort = AbortReason::CALIBRATION_PENDING; return false;
  }

  SafetyInterlocks::faultSafe();
  gParams = params;
  gRes = TestResults{};
  gRes.mode = params.mode;
  gRes.classificationFinal = false;
  for (uint8_t i = 0; i < Channels::kAdcChannelCount; ++i) {
    gBaselineNodeV[i] = 0.0f;
    gBaselinePin[i] = {
        0.0f,
        MeasurementConversion::ConversionStatus::PENDING,
        MeasurementConversion::MeasurementFamily::INVALID};
  }
  gPinIdx = 1;
  gChanIdx = 0;
  gFocusPin = 0;
  gStepIndex = 0;
  gFocusCh = Channels::kNoChannel;
  gLoadStart = 0;
  gLastLoadSample = 0;
  gLoadEnergized = false;
  gAbort = AbortReason::NONE;
  gState = TestState::SAFE_CHECK;
  return true;
}

void step() {
  switch (gState) {
    case TestState::SAFE_CHECK:        stepSafeCheck(); break;
    case TestState::TERM_OFF_SETTLE:   stepTermOffSettle(); break;
    case TestState::BASELINE:          stepBaseline(); break;
    case TestState::FOCUS_ON_SETTLE:   if (deadlineReached()) gState = TestState::FOCUS_READ; break;
    case TestState::FOCUS_READ:        stepFocusRead(); break;
    case TestState::CROSS_SCAN:        stepCrossScan(); break;
    case TestState::FOCUS_OFF_SETTLE:  if (deadlineReached()) stepFocusOffSettle(); break;
    case TestState::SWEEP:             stepSweep(); break;
    case TestState::SWEEP_GND_OFF:     stepSweepGndOff(); break;
    case TestState::TERM_ENERGIZE:     if (deadlineReached()) gState = TestState::TERM_READ; break;
    case TestState::TERM_READ:         stepTermRead(); break;
    case TestState::TERM_DEENERGIZE:
      SafetyInterlocks::faultSafe();
      gState = TestState::COMPLETE;
      break;
    case TestState::LOAD_ON_SETTLE:
      // Safety monitoring begins immediately after energization. Settle delays
      // classification/normal measurement use only; it never delays watchdog.
      stepLoad();
      if (gState == TestState::LOAD_ON_SETTLE && deadlineReached()) {
        gState = TestState::LOAD_MEASURE;
      }
      break;
    case TestState::LOAD_MEASURE:      stepLoad(); break;
    case TestState::LOAD_OFF:
      SafetyInterlocks::faultSafe();
      gLoadEnergized = false;
      gState = TestState::COMPLETE;
      break;
    default: break;
  }
}

void stop() { fault(AbortReason::USER_STOP); }
TestState state() { return gState; }
AbortReason abortReason() { return gAbort; }

bool isActive() {
  return gState != TestState::IDLE &&
         gState != TestState::COMPLETE &&
         gState != TestState::ABORTED &&
         gState != TestState::FAULT;
}

const TestResults& results() { return gRes; }

} // namespace TestEngine
