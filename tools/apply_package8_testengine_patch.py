#!/usr/bin/env python3
from pathlib import Path

path = Path("firmware/src/tests/test_engine.cpp")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)

replace_once(
    '#include "test_engine_domain.h"\n',
    '#include "test_engine_domain.h"\n#include "load_safety.h"\n',
    "include load_safety",
)

replace_once(
    'uint32_t gLoadStart = 0;\nbool gLoadSampled = false;\n',
    'uint32_t gLoadStart = 0;\nuint32_t gLastLoadSample = 0;\nbool gLoadEnergized = false;\n',
    "load globals",
)

old_fault = '''void fault(AbortReason r) {
  SafetyInterlocks::faultSafe();
  gAbort = r;
  gState = r == AbortReason::USER_STOP ? TestState::ABORTED : TestState::FAULT;
}
'''
new_fault = '''void fault(AbortReason r) {
  if (gLoadEnergized) {
    gRes.load.onMs = nowMs() - gLoadStart;
    gLoadEnergized = false;
  }
  SafetyInterlocks::faultSafe();
  gAbort = r;
  gState = r == AbortReason::USER_STOP ? TestState::ABORTED : TestState::FAULT;
}
'''
replace_once(old_fault, new_fault, "fault evidence")

start = text.index('void stepSafeCheck() {')
end = text.index('\nvoid stepTermOffSettle()', start)
new_safe = '''void stepSafeCheck() {
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
'''
text = text[:start] + new_safe + text[end:]

start = text.index('void stepLoad() {')
end = text.index('\n\n} // namespace\n\nbool begin', start)
new_load = '''void stepLoad() {
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
'''
text = text[:start] + new_load + text[end:]

replace_once(
    '  gLoadSampled = false;\n  gLoadStart = 0;\n',
    '  gLoadStart = 0;\n  gLastLoadSample = 0;\n  gLoadEnergized = false;\n',
    "start reset",
)

# LOAD_OFF should preserve evidence and just ensure outputs are safe.
replace_once(
    '''    case TestState::LOAD_OFF:
      SafetyInterlocks::faultSafe();
      gState = TestState::COMPLETE;
      break;
''',
    '''    case TestState::LOAD_OFF:
      SafetyInterlocks::faultSafe();
      gLoadEnergized = false;
      gState = TestState::COMPLETE;
      break;
''',
    "load off",
)

if 'gLoadSampled' in text:
    raise SystemExit('gLoadSampled survived Package 8 patch')

path.write_text(text, encoding="utf-8")
print("Package 8 TestEngine patch applied")
