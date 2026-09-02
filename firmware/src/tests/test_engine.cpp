#include "test_engine.h"

#include <Arduino.h>
#include "tpic_map.h"
#include "tpic_control.h"
#include "safety_interlocks.h"
#include "adc_service.h"

namespace TestEngine {
namespace {
TestEngineConfig gCfg;
TestStartParams gParams;
TestResults gRes;
TestState gState = TestState::IDLE;
AbortReason gAbort = AbortReason::NONE;
uint32_t gDeadline = 0;
uint8_t gPinIdx = 0;
uint8_t gChanIdx = 0;
uint8_t gFocusPin = 0;
uint32_t gStepIndex = 0;
Channels::AdcChannel gFocusCh = Channels::kNoChannel;
float gBaseline[Channels::kAdcChannelCount];
uint32_t gLoadStart = 0;
bool gLoadSampled = false;

uint32_t nowMs() { return millis(); }
void setDeadline(uint32_t ms) { gDeadline = nowMs() + ms; }
bool deadlineReached() { return (int32_t)(nowMs() - gDeadline) >= 0; }
bool isVoltage(TestMode m) { return m == TestMode::ISO7638_VOLTAGE || m == TestMode::ISO12098_VOLTAGE; }
bool isCable(TestMode m) { return m == TestMode::CABLE_ISO7638 || m == TestMode::CABLE_ISO12098; }
bool isTerm(TestMode m) { return m >= TestMode::CAN_TERM_ISO7638_TRACTOR && m <= TestMode::CAN_TERM_ISO12098_TRAILER; }
bool isLoad(TestMode m) { return m == TestMode::LAMP_ISO12098 || m == TestMode::AXLE_LIFT; }

Channels::Socket socketFor(TestMode m) {
  switch (m) {
    case TestMode::ISO7638_VOLTAGE:
    case TestMode::CABLE_ISO7638:
    case TestMode::CAN_TERM_ISO7638_TRACTOR:
    case TestMode::CAN_TERM_ISO7638_TRAILER: return Channels::Socket::ISO7638;
    default: return Channels::Socket::ISO12098;
  }
}
uint8_t pinCountFor(Channels::Socket s) { return s == Channels::Socket::ISO7638 ? Channels::kSocketPinCount7638 : Channels::kSocketPinCount12098; }
Channels::RelayControl termRelayFor(TestMode m) {
  switch (m) {
    case TestMode::CAN_TERM_ISO7638_TRACTOR: return Channels::RelayControl::RELAY_CAN7638_CK;
    case TestMode::CAN_TERM_ISO7638_TRAILER: return Channels::RelayControl::RELAY_CAN7638_DR;
    case TestMode::CAN_TERM_ISO12098_TRACTOR: return Channels::RelayControl::RELAY_CAN12098_CK;
    default: return Channels::RelayControl::RELAY_CAN12098_DR;
  }
}
Channels::AdcChannel termPairFor(TestMode m, bool wantH) {
  const bool is7638 = m == TestMode::CAN_TERM_ISO7638_TRACTOR || m == TestMode::CAN_TERM_ISO7638_TRAILER;
  if (is7638) return wantH ? Channels::AdcChannel::MUX_CANH_1_R : Channels::AdcChannel::MUX_CANL_1_R;
  return wantH ? Channels::AdcChannel::MUX_CANH_2_R : Channels::AdcChannel::MUX_CANL_2_R;
}
bool isGroundChannel(Channels::AdcChannel ch) {
  return ch == Channels::AdcChannel::MUX_7P_GND1 || ch == Channels::AdcChannel::MUX_7P_GND2 || ch == Channels::AdcChannel::MUX_15P_GND3 || ch == Channels::AdcChannel::MUX_15P_GND4;
}
bool isApprovedLampPin(uint8_t pin) { return pin == 1 || pin == 2 || pin == 3 || pin == 5 || pin == 6 || pin == 7 || pin == 8; }
uint32_t loadBitFor(TestMode m, uint8_t lampPin) {
  if (m == TestMode::AXLE_LIFT) return 1UL << TpicBit::OUT19_ASANSOR;
  const Channels::TpicOutput out = Channels::tpicOutputFor(Channels::Socket::ISO12098, lampPin);
  if (out == Channels::kNoTpicOutput) return 0;
  return 1UL << Channels::tpicBitFor(out);
}
ContinuityResult classifyContinuity(float baseline, float measured) {
  const float delta = measured - baseline;
  if (measured >= gCfg.continuityMinV && measured <= gCfg.continuityMaxV && delta >= gCfg.continuityMinV) return ContinuityResult::PASS;
  if (delta < gCfg.openMaxDeltaV) return ContinuityResult::OPEN;
  return ContinuityResult::INDETERMINATE;
}
CrossResponseResult classifyCross(float delta) { return CrossResponseResult{delta >= gCfg.crossResponseDeltaV, delta}; }
void fault(AbortReason r) { SafetyInterlocks::faultSafe(); gAbort = r; gState = r == AbortReason::USER_STOP ? TestState::ABORTED : TestState::FAULT; }
bool readChannel(Channels::AdcChannel ch, float& v) { return Channels::isValidDiagnosticChannel(ch) && AdcService::readNodeVolts(ch, v); }
bool readPinNode(uint8_t pin, float& v) { return readChannel(Channels::pinToChannel(socketFor(gParams.mode), pin), v); }
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
void addShort(uint8_t focusPin, uint8_t coupledPin, float delta) {
  if (gRes.shortCount >= kMaxShorts) return;
  ShortCandidate& s = gRes.shortcuts[gRes.shortCount++];
  s.focusPin = focusPin; s.coupledPin = coupledPin; s.stepIndex = gStepIndex; s.deltaV = delta;
}
CablePinResult* findCableResult(uint8_t pin) {
  for (uint8_t i = 0; i < gRes.cableCount; ++i) if (gRes.cable[i].pin == pin) return &gRes.cable[i];
  return nullptr;
}
void markFocusStep() { ++gStepIndex; CablePinResult* r = findCableResult(gFocusPin); if (r) r->stepIndex = gStepIndex; }

void stepSafeCheck() {
  if (isLoad(gParams.mode)) {
    if (gParams.mode == TestMode::LAMP_ISO12098 && !isApprovedLampPin(gParams.lampPin)) { fault(AbortReason::PRECONDITION); return; }
    if (gParams.mode == TestMode::AXLE_LIFT && !gParams.axleSafetyConfirmed) { fault(AbortReason::PRECONDITION); return; }
    const uint32_t lb = loadBitFor(gParams.mode, gParams.lampPin);
    if (lb == 0) { fault(AbortReason::PRECONDITION); return; }
    if (!SafetyInterlocks::applyLoadOutput(lb)) { fault(AbortReason::INTERLOCK_REJECTED); return; }
    gLoadStart = nowMs(); setDeadline(gCfg.loadOnSettleMs); gState = TestState::LOAD_ON_SETTLE; return;
  }
  if (isVoltage(gParams.mode)) {
    if (!SafetyInterlocks::applyMeasurementReference(1UL << TpicBit::K6_MASTER_GND)) { fault(AbortReason::INTERLOCK_REJECTED); return; }
    gPinIdx = 1; gState = TestState::SWEEP; return;
  }
  const uint8_t n = pinCountFor(socketFor(gParams.mode));
  while (gPinIdx <= n) {
    float v = 0.0f;
    if (!readPinNode(gPinIdx, v)) { fault(AbortReason::SERVICE_FAULT); return; }
    if (v > gCfg.externalEnergyDetectV) { fault(AbortReason::EXTERNAL_ENERGY); return; }
    ++gPinIdx;
  }
  if (isCable(gParams.mode)) { gChanIdx = 0; gState = TestState::BASELINE; return; }
  if (isTerm(gParams.mode)) {
    if (!gParams.deEnergizedConfirmed) { fault(AbortReason::PRECONDITION); return; }
    SafetyInterlocks::clearCanSelection(); setDeadline(gCfg.canOffSettleMs); gState = TestState::TERM_OFF_SETTLE;
  }
}

void stepTermOffSettle() {
  if (!deadlineReached()) return;
  const int relayBit = Channels::tpicBitFor(termRelayFor(gParams.mode));
  if (!SafetyInterlocks::energizeCanRelay(relayBit)) { fault(AbortReason::INTERLOCK_REJECTED); return; }
  setDeadline(gCfg.termSettleMs); gState = TestState::TERM_ENERGIZE;
}

void stepBaseline() {
  const Channels::ChannelList list = Channels::scanChannelsFor(socketFor(gParams.mode));
  while (gChanIdx < list.count) {
    float v = 0.0f;
    if (!readChannel(list.ch[gChanIdx], v)) { fault(AbortReason::SERVICE_FAULT); return; }
    gBaseline[(uint8_t)list.ch[gChanIdx]] = v; ++gChanIdx;
  }
  gRes.cableCount = 0;
  const Channels::Socket s = socketFor(gParams.mode);
  const uint8_t n = pinCountFor(s);
  for (uint8_t p = 1; p <= n && gRes.cableCount < kMaxPins12098; ++p) {
    if (!(gParams.enabledPinMask & (1UL << (p - 1)))) continue;
    const Channels::AdcChannel ch = Channels::pinToChannel(s, p);
    if (ch == Channels::kNoChannel) continue;
    CablePinResult& r = gRes.cable[gRes.cableCount++];
    r.pin = p; r.ch = ch; r.stepIndex = 0; r.baselineV = gBaseline[(uint8_t)ch]; r.focusV = 0; r.processed = false; r.continuity = ContinuityResult::INDETERMINATE;
  }
  gFocusPin = nextValidEnabledPin(1);
  if (gFocusPin == 0) { SafetyInterlocks::faultSafe(); gState = TestState::COMPLETE; return; }
  gFocusCh = Channels::pinToChannel(s, gFocusPin);
  const Channels::TpicOutput out = Channels::tpicOutputFor(s, gFocusPin);
  if (out == Channels::kNoTpicOutput) { fault(AbortReason::PRECONDITION); return; }
  if (!SafetyInterlocks::applyCableTestOutput(1UL << Channels::tpicBitFor(out))) { fault(AbortReason::INTERLOCK_REJECTED); return; }
  markFocusStep(); setDeadline(gCfg.cableOnSettleMs); gState = TestState::FOCUS_ON_SETTLE;
}

void stepFocusRead() {
  float v = 0.0f;
  if (!readChannel(gFocusCh, v)) { fault(AbortReason::SERVICE_FAULT); return; }
  CablePinResult* r = findCableResult(gFocusPin);
  if (r) { r->focusV = v; r->continuity = classifyContinuity(r->baselineV, v); r->processed = true; }
  gChanIdx = 0; gState = TestState::CROSS_SCAN;
}

void stepCrossScan() {
  const Channels::ChannelList list = Channels::scanChannelsFor(socketFor(gParams.mode));
  while (gChanIdx < list.count) {
    const Channels::AdcChannel ch = list.ch[gChanIdx];
    if (ch != gFocusCh) {
      float v = 0.0f;
      if (!readChannel(ch, v)) { fault(AbortReason::SERVICE_FAULT); return; }
      const float delta = v - gBaseline[(uint8_t)ch];
      const CrossResponseResult cr = classifyCross(delta);
      if (cr.isCoupled) { const Channels::SocketPin sp = Channels::channelToPin(ch); addShort(gFocusPin, sp.valid ? sp.pin : 0, cr.delta); }
    }
    ++gChanIdx;
  }
  if (!SafetyInterlocks::applyCableTestOutput(0)) { fault(AbortReason::INTERLOCK_REJECTED); return; }
  setDeadline(gCfg.cableOffSettleMs); gState = TestState::FOCUS_OFF_SETTLE;
}

void stepFocusOffSettle() {
  gFocusPin = nextValidEnabledPin((uint8_t)(gFocusPin + 1));
  if (gFocusPin == 0) { SafetyInterlocks::faultSafe(); gState = TestState::COMPLETE; return; }
  const Channels::Socket s = socketFor(gParams.mode);
  gFocusCh = Channels::pinToChannel(s, gFocusPin);
  const Channels::TpicOutput out = Channels::tpicOutputFor(s, gFocusPin);
  if (out == Channels::kNoTpicOutput) { fault(AbortReason::PRECONDITION); return; }
  if (!SafetyInterlocks::applyCableTestOutput(1UL << Channels::tpicBitFor(out))) { fault(AbortReason::INTERLOCK_REJECTED); return; }
  markFocusStep(); setDeadline(gCfg.cableOnSettleMs); gState = TestState::FOCUS_ON_SETTLE;
}

void stepSweep() {
  const Channels::Socket s = socketFor(gParams.mode);
  const uint8_t n = pinCountFor(s);
  if (gPinIdx > n) { SafetyInterlocks::faultSafe(); gState = TestState::COMPLETE; return; }
  if (gRes.voltCount >= kMaxPins12098) { fault(AbortReason::SERVICE_FAULT); return; }
  const Channels::AdcChannel ch = Channels::pinToChannel(s, gPinIdx);
  float v = 0.0f;
  if (ch == Channels::kNoChannel || !readChannel(ch, v)) { fault(AbortReason::SERVICE_FAULT); return; }
  VoltagePinResult& r = gRes.volt[gRes.voltCount];
  r.pin = gPinIdx; r.ch = ch; r.nodeV = v; r.valid = true; r.k6OffValid = false; r.pulseValid = false;
  if (s == Channels::Socket::ISO12098 && (gPinIdx == 1 || gPinIdx == 2)) {
    PulseMonitor::PulseEvidence ev;
    const PulseMonitor::PulseInput pi = gPinIdx == 2 ? PulseMonitor::PulseInput::SAG : PulseMonitor::PulseInput::SOL;
    if (PulseMonitor::snapshot(pi, ev)) { r.pulse = ev; r.pulseValid = true; }
  }
  if (isGroundChannel(ch)) {
    if (!SafetyInterlocks::applyMeasurementReference(0)) { fault(AbortReason::INTERLOCK_REJECTED); return; }
    setDeadline(gCfg.k6SettleMs); gState = TestState::SWEEP_GND_OFF; return;
  }
  ++gRes.voltCount; ++gPinIdx;
}

void stepSweepGndOff() {
  if (!deadlineReached()) return;
  VoltagePinResult& r = gRes.volt[gRes.voltCount];
  float v = 0.0f;
  if (readChannel(r.ch, v)) { r.k6OffV = v; r.k6OffValid = true; }
  if (!SafetyInterlocks::applyMeasurementReference(1UL << TpicBit::K6_MASTER_GND)) { fault(AbortReason::INTERLOCK_REJECTED); return; }
  ++gRes.voltCount; ++gPinIdx; gState = TestState::SWEEP;
}

void stepTermRead() {
  if (!deadlineReached()) return;
  const TestMode m = gParams.mode;
  float vh = 0.0f, vl = 0.0f;
  const bool okH = readChannel(termPairFor(m, true), vh);
  const bool okL = readChannel(termPairFor(m, false), vl);
  if (!okH || !okL) { SafetyInterlocks::clearCanSelection(); fault(AbortReason::SERVICE_FAULT); return; }
  gRes.term.relay = termRelayFor(m); gRes.term.vhV = vh; gRes.term.vlV = vl; gRes.term.deltaV = vh - vl; gRes.term.valid = true;
  SafetyInterlocks::clearCanSelection(); gState = TestState::TERM_DEENERGIZE;
}

void stepLoad() {
  if (!gLoadSampled) {
    Ina226Service::Ina226Sample smp;
    if (!Ina226Service::sample(smp)) { fault(AbortReason::SERVICE_FAULT); return; }
    if (!smp.shuntValid || !smp.busValid) { fault(AbortReason::SERVICE_FAULT); return; }
    gRes.load.shuntV = smp.shuntVolts; gRes.load.shuntValid = smp.shuntValid; gRes.load.currentA = smp.currentA; gRes.load.currentValid = smp.currentValid; gRes.load.busV = smp.busVolts; gRes.load.busValid = smp.busValid;
    gLoadSampled = true; return;
  }
  const uint32_t maxOn = gParams.mode == TestMode::AXLE_LIFT ? gCfg.axleMaxOnMs : gCfg.lampMaxOnMs;
  if (nowMs() - gLoadStart >= maxOn) { gRes.load.onMs = nowMs() - gLoadStart; SafetyInterlocks::faultSafe(); gState = TestState::LOAD_OFF; }
}
}

bool begin(const TestEngineConfig& cfg) { gCfg = cfg; gState = TestState::IDLE; gAbort = AbortReason::NONE; return true; }
bool start(const TestStartParams& params) {
  if (isActive()) return false;
  if (params.mode == TestMode::NONE) { gAbort = AbortReason::PRECONDITION; return false; }
  if (!AdcService::isReady()) { gAbort = AbortReason::PRECONDITION; return false; }
  if (isLoad(params.mode) && !Ina226Service::isReady()) { gAbort = AbortReason::PRECONDITION; return false; }
  if (isCable(params.mode) && params.enabledPinMask == 0) { gAbort = AbortReason::PRECONDITION; return false; }
  SafetyInterlocks::faultSafe();
  gParams = params; gRes = TestResults{}; gRes.mode = params.mode; gRes.classificationFinal = false;
  for (uint8_t i = 0; i < Channels::kAdcChannelCount; ++i) gBaseline[i] = 0.0f;
  gPinIdx = 1; gChanIdx = 0; gFocusPin = 0; gStepIndex = 0; gFocusCh = Channels::kNoChannel; gLoadSampled = false; gLoadStart = 0; gAbort = AbortReason::NONE; gState = TestState::SAFE_CHECK; return true;
}
void step() {
  switch (gState) {
    case TestState::SAFE_CHECK: stepSafeCheck(); break;
    case TestState::TERM_OFF_SETTLE: stepTermOffSettle(); break;
    case TestState::BASELINE: stepBaseline(); break;
    case TestState::FOCUS_ON_SETTLE: if (deadlineReached()) gState = TestState::FOCUS_READ; break;
    case TestState::FOCUS_READ: stepFocusRead(); break;
    case TestState::CROSS_SCAN: stepCrossScan(); break;
    case TestState::FOCUS_OFF_SETTLE: if (deadlineReached()) stepFocusOffSettle(); break;
    case TestState::SWEEP: stepSweep(); break;
    case TestState::SWEEP_GND_OFF: stepSweepGndOff(); break;
    case TestState::TERM_ENERGIZE: if (deadlineReached()) gState = TestState::TERM_READ; break;
    case TestState::TERM_READ: stepTermRead(); break;
    case TestState::TERM_DEENERGIZE: SafetyInterlocks::faultSafe(); gState = TestState::COMPLETE; break;
    case TestState::LOAD_ON_SETTLE: if (deadlineReached()) gState = TestState::LOAD_MEASURE; break;
    case TestState::LOAD_MEASURE: stepLoad(); break;
    case TestState::LOAD_OFF: SafetyInterlocks::faultSafe(); gState = TestState::COMPLETE; break;
    default: break;
  }
}
void stop() { fault(AbortReason::USER_STOP); }
TestState state() { return gState; }
AbortReason abortReason() { return gAbort; }
bool isActive() { return gState != TestState::IDLE && gState != TestState::COMPLETE && gState != TestState::ABORTED && gState != TestState::FAULT; }
const TestResults& results() { return gRes; }

} // namespace TestEngine
