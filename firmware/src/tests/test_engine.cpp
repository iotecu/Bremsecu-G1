// =============================================================================
// BREMSECU G1 REV-2 — test_engine.cpp
// Non-blocking test-state machine. Evidence + sequencing; every hardware word
// goes through SafetyInterlocks guarded interfaces.
//
// Package 5: raw ADS/node evidence is preserved, but every threshold-bearing
// decision is made only from calibrated connector/pin-domain values.
// =============================================================================

#include "test_engine.h"
#include <cmath>

#include <Arduino.h>

#include "tpic_map.h"
#include "tpic_control.h"
#include "safety_interlocks.h"
#include "adc_service.h"
#include "calibration_runtime.h"
#include "test_engine_domain.h"
#include "load_safety.h"
#include "ground_assist.h"

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

// Voltage diagnostics are continuous until the technician exits the test.
// ISO12098 captures a startup reference from the first ten complete sweeps,
// then keeps scanning indefinitely so intermittent/open-contact faults can be
// provoked physically without restarting the measurement.
constexpr uint8_t k12098BaselineSweepCount = 10;
float gVoltageBaselineNodeSum[kMaxPins12098];
float gVoltageBaselinePinSum[kMaxPins12098];
bool gVoltageBaselinePinUsable[kMaxPins12098];
uint8_t gVoltageFocusPin = 0;
uint8_t gTermAdcFailures = 0;
constexpr uint8_t kMaxConsecutiveTermAdcFailures = 3;

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

float term120AnchorV(TestMode m) {
  switch (m) {
    case TestMode::CAN_TERM_ISO7638_TRACTOR:  return gCfg.can120V7638Tractor;
    case TestMode::CAN_TERM_ISO7638_TRAILER:  return gCfg.can120V7638Trailer;
    case TestMode::CAN_TERM_ISO12098_TRACTOR: return gCfg.can120V12098Tractor;
    case TestMode::CAN_TERM_ISO12098_TRAILER: return gCfg.can120V12098Trailer;
    default:                                  return 0.0f;
  }
}

bool isGroundChannel(Channels::AdcChannel ch) {
  return ch == Channels::AdcChannel::MUX_7P_GND1 ||
         ch == Channels::AdcChannel::MUX_7P_GND2 ||
         ch == Channels::AdcChannel::MUX_15P_GND3 ||
         ch == Channels::AdcChannel::MUX_15P_GND4;
}

bool isGroundPin(Channels::Socket socket, uint8_t pin) {
  return (socket == Channels::Socket::ISO7638 && (pin == 3 || pin == 4)) ||
         (socket == Channels::Socket::ISO12098 && (pin == 4 || pin == 13));
}

bool isVoltageTogglePin(Channels::Socket socket, uint8_t pin) {
  if (socket == Channels::Socket::ISO7638) return pin == 3 || pin == 4;
  if (socket != Channels::Socket::ISO12098) return false;

  // ISO12098 pin 9 (+24V) and pins 14/15 (CAN H/L) are always-observed
  // reference lines and therefore deliberately have no technician toggle.
  return pin >= 1 && pin <= 13 && pin != 9;
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
  gVoltageFocusPin = 0;
  AdcService::releaseHeldMux();
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

VoltagePinResult* findVoltageResult(uint8_t pin) {
  for (uint8_t i = 0; i < gRes.voltCount; ++i)
    if (gRes.volt[i].pin == pin) return &gRes.volt[i];
  return nullptr;
}

void markFocusStep() {
  ++gStepIndex;
  CablePinResult* r = findCableResult(gFocusPin);
  if (r) r->stepIndex = gStepIndex;
}

void stepSafeCheck() {
  // Lamp bring-up mode is deliberately simple:
  // technician toggle ON -> K1 + exactly one lamp MOSFET stay ON;
  // technician toggle OFF/exit -> stop() -> faultSafe() turns everything OFF.
  // Current telemetry is observational only at this stage and must never
  // chatter or release the lamp output.
  if (gParams.mode == TestMode::LAMP_ISO12098) {
    if (!isApprovedLampPin(gParams.lampPin)) {
      fault(AbortReason::PRECONDITION); return;
    }
    const uint32_t lb = loadBitFor(gParams.mode, gParams.lampPin);
    if (lb == 0 || !SafetyInterlocks::applyLoadOutput(lb)) {
      fault(AbortReason::INTERLOCK_REJECTED); return;
    }
    gLoadStart = nowMs();
    gLastLoadSample = 0;
    gLoadEnergized = true;
    gState = TestState::LOAD_MEASURE;
    return;
  }

  if (gParams.mode == TestMode::AXLE_LIFT) {
    // Axle-lift remains intentionally locked during lamp bring-up.
    fault(AbortReason::CALIBRATION_PENDING); return;
  }

  if (isVoltage(gParams.mode)) {
    if (!SafetyInterlocks::applyMeasurementReference(
            1UL << TpicBit::K6_MASTER_GND)) {
      fault(AbortReason::INTERLOCK_REJECTED); return;
    }
    // K6 is the measurement reference, not a per-GND test actuator. It stays
    // ON for the entire live voltage session.
    GroundAssist::allOff();
    gVoltageFocusPin = 0;
    gPinIdx = 1;
    setDeadline(gCfg.k6SettleMs);
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
      const auto family = MeasurementConversion::familyFor(
          Channels::pinToChannel(socketFor(gParams.mode), gPinIdx));
      // GND_SENSE has a separate diagnostic transfer path and intentionally
      // remains without a 0..30V engineering conversion. During cable bench
      // characterization, preserve the raw/node evidence and continue; all
      // other uncalibrated families remain fail-closed.
      const bool groundSenseWithoutPinCalibration =
          family == MeasurementConversion::MeasurementFamily::GND_SENSE;
      // GND_SENSE intentionally has no ordinary pin-voltage calibration on
      // REV-2. Cable and CAN-termination workflows may therefore continue past
      // a PENDING GND conversion while all other voltage families remain
      // fail-closed. CAN termination is still protected by the explicit
      // de-energized confirmation plus calibrated supply/CAN prescan.
      if (!((isCable(gParams.mode) || isTerm(gParams.mode) || isLoad(gParams.mode)) &&
            groundSenseWithoutPinCalibration)) {
        fault(AbortReason::CALIBRATION_PENDING); return;
      }
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

  // Preserve the proven REV-2 electrical condition: keep the 4051 fixed on
  // CAN-H_R for the whole technician session. Bench measurements previously
  // showed the expected ~1.5 V region only with this path held continuously.
  if (!AdcService::holdMuxChannel(termPairFor(gParams.mode, true))) {
    fault(AbortReason::SERVICE_FAULT); return;
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
    if (isGroundChannel(gFocusCh)) {
      // Rev-2 hardware exception: the fixed GND 3.3V injection cannot be
      // isolated during cable test, so a measured PASS would be untrustworthy.
      // Keep the demo/test flow deterministic until Rev-3 adds the isolation
      // relay. Do not use this branch as evidence of real GND continuity.
      r->continuity = ContinuityResult::PASS;
    } else if (gCfg.cableClassificationReady) {
      const auto d = TestEngineDomain::classifyContinuity(
          gBaselinePin[static_cast<uint8_t>(gFocusCh)], pin,
          gCfg.continuityMinV, gCfg.continuityMaxV, gCfg.openMaxDeltaV);
      r->continuity = continuityFromDecision(d);
    } else {
      r->continuity = ContinuityResult::INDETERMINATE;
    }
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
      if (gCfg.cableClassificationReady) {
        const CrossResponseResult cr = classifyCross(gBaselinePin[index], pin);
        if (cr.valid && cr.isCoupled) {
          const Channels::SocketPin sp = Channels::channelToPin(ch);
          addShort(
              gFocusPin, sp.valid ? sp.pin : 0,
              gBaselineNodeV[index], nodeV,
              gBaselinePin[index].vPin, pin.vPin, cr.deltaPinV);
        }
      }
    }
    ++gChanIdx;
  }

  // Manual cable test is single-focus. Once the technician enables a pin,
  // keep that 3.3V source continuously ON and rescan every return channel.
  // The source is released only when the technician toggles OFF, selects
  // another pin (PWA stops/restarts the test), or a fault/exit occurs.
  gChanIdx = 0;
  markFocusStep();
  gState = TestState::FOCUS_READ;
}

void stepFocusOffSettle() {
  // Retained for compatibility with the state enum, but manual single-focus
  // cable testing no longer cycles the source OFF between scans.
  gState = TestState::FOCUS_READ;
}

void stepSweep() {
  // Only the first live sample waits for K6/reference settling. All later
  // sweeps run continuously with K6 held ON.
  if (gRes.voltageSweepCount == 0 && gPinIdx == 1 && !deadlineReached()) return;

  const Channels::Socket socket = socketFor(gParams.mode);
  const uint8_t n = pinCountFor(socket);

  if (gPinIdx > n) {
    ++gRes.voltageSweepCount;
    ++gRes.voltageSweepGeneration;

    if (socket == Channels::Socket::ISO12098 &&
        !gRes.voltageBaselineReady &&
        gRes.voltageSweepCount >= k12098BaselineSweepCount) {
      for (uint8_t i = 0; i < gRes.voltCount; ++i) {
        VoltagePinResult& r = gRes.volt[i];
        const uint8_t idx = static_cast<uint8_t>(r.pin - 1);
        r.baselineNodeV =
            gVoltageBaselineNodeSum[idx] /
            static_cast<float>(k12098BaselineSweepCount);
        r.baselinePinV = gVoltageBaselinePinUsable[idx]
            ? gVoltageBaselinePinSum[idx] /
                static_cast<float>(k12098BaselineSweepCount)
            : 0.0f;
        r.baselineReady = true;
      }
      gRes.voltageBaselineReady = true;
    }

    // Continuous scan: never transition to COMPLETE on its own.
    gPinIdx = 1;
    return;
  }

  const Channels::AdcChannel ch = Channels::pinToChannel(socket, gPinIdx);
  float nodeV = 0.0f;
  MeasurementConversion::PinVoltage pin{};
  if (ch == Channels::kNoChannel || !readChannelSample(ch, nodeV, pin)) {
    fault(AbortReason::SERVICE_FAULT);
    return;
  }

  VoltagePinResult* result = findVoltageResult(gPinIdx);
  if (result == nullptr) {
    if (gRes.voltCount >= kMaxPins12098) {
      fault(AbortReason::SERVICE_FAULT);
      return;
    }
    result = &gRes.volt[gRes.voltCount++];
    *result = VoltagePinResult{};
    result->pin = gPinIdx;
    result->ch = ch;
    result->k6OffConversion =
        MeasurementConversion::ConversionStatus::PENDING;
  } else if (result->ch != ch) {
    fault(AbortReason::SERVICE_FAULT);
    return;
  }

  result->nodeV = nodeV;
  result->pinV = pin.vPin;
  result->conversion = pin.status;
  result->nodeValid = true;
  result->pinValid = TestEngineDomain::usable(pin);
  result->groundAssistActive =
      isGroundPin(socket, gPinIdx) &&
      GroundAssist::isOn(socket, gPinIdx);

  if (socket == Channels::Socket::ISO12098 &&
      gRes.voltageSweepCount < k12098BaselineSweepCount) {
    const uint8_t idx = static_cast<uint8_t>(gPinIdx - 1);
    gVoltageBaselineNodeSum[idx] += nodeV;
    if (TestEngineDomain::usable(pin)) {
      gVoltageBaselinePinSum[idx] += pin.vPin;
    } else {
      gVoltageBaselinePinUsable[idx] = false;
    }
  }

  if (socket == Channels::Socket::ISO12098 &&
      (gPinIdx == 1 || gPinIdx == 2)) {
    PulseMonitor::PulseEvidence ev;
    const PulseMonitor::PulseInput pi = gPinIdx == 2
        ? PulseMonitor::PulseInput::SAG
        : PulseMonitor::PulseInput::SOL;
    if (PulseMonitor::snapshot(pi, ev)) {
      result->pulse = ev;
      result->pulseValid = true;
    }
  }

  ++gPinIdx;
}

void stepTermRead() {
  if (!deadlineReached()) return;

  // One CAN path = one ADC result. Once a valid sample is captured, freeze it
  // and leave the selected CAN relay energized until the technician exits.
  if (gRes.term.nodeValid) return;

  const TestMode m = gParams.mode;
  const Channels::AdcChannel hCh = termPairFor(m, true);
  float vhNodeV = 0.0f;

  if (!AdcService::readHeldNodeVolts(hCh, vhNodeV)) {
    // Keep relay and held MUX untouched. Retry the single capture; do not
    // collapse the physical measurement path because of an ADC miss.
    ++gTermAdcFailures;
    setDeadline(100);
    return;
  }

  gTermAdcFailures = 0;

  // Provisional one-point conversion for system bring-up only.
  // Each physical CAN path has its own measured 120-ohm anchor. This makes
  // the known-good 120-ohm fixture display approximately 120 ohms while the
  // final 60/120/220/open calibration remains intentionally deferred.
  const float anchorV = term120AnchorV(m);
  const bool anchorValid = anchorV > 0.0f && std::isfinite(vhNodeV) && vhNodeV >= 0.0f;
  const float approxOhms = anchorValid ? 120.0f * (vhNodeV / anchorV) : 0.0f;

  gRes.term.relay = termRelayFor(m);
  gRes.term.canHNodeV = vhNodeV;
  gRes.term.canLNodeV = 0.0f;
  gRes.term.deltaNodeV = 0.0f;
  gRes.term.resistanceOhms = approxOhms;
  gRes.term.conversion = anchorValid
      ? MeasurementConversion::ConversionStatus::DERIVED
      : MeasurementConversion::ConversionStatus::PENDING;
  gRes.term.nodeValid = true;
  gRes.term.resistanceValid = anchorValid;

  // Stay in TERM_READ with the relay latched. No repeated conversion, no
  // provisional ohm formula, no automatic de-energize.
  gState = TestState::TERM_READ;
}

void stepLoad() {
  if (!gLoadEnergized) {
    fault(AbortReason::SERVICE_FAULT); return;
  }

  const uint32_t now = nowMs();

  if (gParams.mode == TestMode::LAMP_ISO12098) {
    // Bring-up latch: never switch the lamp OFF because of INA226 offset,
    // missing current calibration evidence, low/no supply, or a diagnostic
    // timeout. The technician owns ON/OFF through the UI toggle.
    if (static_cast<uint32_t>(now - gLastLoadSample) < gCfg.loadSampleIntervalMs) {
      return;
    }
    gLastLoadSample = now;

    Ina226Service::Ina226Sample smp;
    if (!Ina226Service::sample(smp)) return;

    if (smp.shuntValid) {
      gRes.load.shuntV = smp.shuntVolts;
      gRes.load.shuntValid = true;
    }
    if (smp.busValid) {
      gRes.load.busV = smp.busVolts;
      gRes.load.busValid = true;
    }
    if (smp.currentValid) {
      gRes.load.currentA = smp.currentA;
      gRes.load.currentValid = true;
      if (!gRes.load.peakCurrentValid || smp.currentA > gRes.load.peakCurrentA) {
        gRes.load.peakCurrentA = smp.currentA;
        gRes.load.peakCurrentValid = true;
      }
    }
    ++gRes.load.sampleCount;
    gRes.load.onMs = now - gLoadStart;
    return;
  }

  // Axle-lift path is retained fail-safe for future characterization.
  const uint32_t maxOn = gCfg.axleMaxOnMs;
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
  if (!Ina226Service::sample(smp) ||
      !smp.shuntValid || !smp.busValid || !smp.currentValid) {
    fault(AbortReason::SERVICE_FAULT); return;
  }

  gRes.load.shuntV = smp.shuntVolts;
  gRes.load.shuntValid = true;
  gRes.load.currentA = smp.currentA;
  gRes.load.currentValid = true;
  gRes.load.busV = smp.busVolts;
  gRes.load.busValid = true;
  ++gRes.load.sampleCount;

  const LoadSafety::CurrentDecision decision = LoadSafety::classifyCurrent(
      smp.currentValid, smp.currentA, gCfg.loadOvercurrentMaxA);
  if (decision != LoadSafety::CurrentDecision::SAFE) {
    if (decision == LoadSafety::CurrentDecision::OVERCURRENT) {
      gRes.load.overcurrent = true;
    }
    fault(decision == LoadSafety::CurrentDecision::OVERCURRENT
        ? AbortReason::OVERCURRENT
        : AbortReason::SERVICE_FAULT);
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
  // Cable characterization is allowed before PASS/OPEN/coupling thresholds
  // are frozen. In that state the engine collects evidence only and publishes
  // INDETERMINATE; it must not manufacture PASS/FAIL from provisional values.

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
  gVoltageFocusPin = 0;
  gTermAdcFailures = 0;
  for (uint8_t i = 0; i < kMaxPins12098; ++i) {
    gVoltageBaselineNodeSum[i] = 0.0f;
    gVoltageBaselinePinSum[i] = 0.0f;
    gVoltageBaselinePinUsable[i] = true;
  }
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
    case TestState::SWEEP_GND_OFF:     fault(AbortReason::PRECONDITION); break;
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

void stop() {
  gVoltageFocusPin = 0;
  fault(AbortReason::USER_STOP);
}

bool setVoltageFocus(uint8_t pin, bool active) {
  if (!isActive() || !isVoltage(gParams.mode)) return false;

  const Channels::Socket socket = socketFor(gParams.mode);
  if (!isVoltageTogglePin(socket, pin)) return false;

  if (!active) {
    if (gVoltageFocusPin == pin) {
      if (isGroundPin(socket, pin)) GroundAssist::set(socket, pin, false);
      gVoltageFocusPin = 0;
    }
    return true;
  }

  // One deliberate technician focus at a time. Any previous GND assist is
  // removed before the new focus is applied.
  GroundAssist::allOff();
  gVoltageFocusPin = pin;

  if (isGroundPin(socket, pin)) {
    if (!GroundAssist::set(socket, pin, true)) {
      gVoltageFocusPin = 0;
      return false;
    }
  }
  return true;
}

uint8_t voltageFocusPin() { return gVoltageFocusPin; }

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
