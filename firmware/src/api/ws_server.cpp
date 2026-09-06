// =============================================================================
// BREMSECU G1 REV-2 — ws_server.cpp
// WebSocket live-event transport. Observes TestEngine + Phase-1 services
// read-only and emits delta/transition events. No control path, no second
// state machine, no re-classification.
//
// Cable payloads follow docs/engineering/API_CONTRACT.md:
//   cable_test_progress carries socket, currentPin, currentPinName,
//   focusVoltage, continuity, per-focus shorts[], progress{}, and
//   classificationFinal:false. cable_test_completed carries socket + summary.
//
// TIMING (final state-timing correction):
//   completed = proc (all processed pins) EXCEPT while the engine is currently
//   in CROSS_SCAN for the newest processed pin (proc>0), or a FAULT/ABORT
//   interrupted an in-flight CROSS_SCAN; in those cases completed = proc-1 so
//   the incomplete current pin is held back. A pin becomes publishable at
//   FOCUS_OFF_SETTLE (its Cross Scan finished) and stays publishable. The
//   terminal flush still emits any final pending progress event before
//   cable_test_completed. Exactly-once monotonic g.emitted preserved.
// =============================================================================

#include "ws_server.h"

#include <Arduino.h>
#include <WebSocketsServer.h>

#include "config.h"
#include "network_service.h"
#include "tpic_map.h"
#include "tpic_control.h"
#include "test_engine.h"
#include "pulse_monitor.h"
#include "channels.h"

namespace WsServer {

namespace {

constexpr uint16_t kWsPort      = 81;    // PROVISIONAL (not authority-frozen)
constexpr uint32_t kHeartbeatMs = 2000;  // PROVISIONAL heartbeat interval

WebSocketsServer gWs(kWsPort);
bool gReady = false;

struct Snap {
  bool active = false;
  TestEngine::TestState state = TestEngine::TestState::IDLE;
  uint8_t emitted = 0;   // progress events emitted (== focus pins fully scanned)
  uint8_t shorts = 0;
  uint8_t volt = 0;
  bool loadValid = false;
  uint32_t loadOnMs = 0;
  bool termValid = false;
  uint32_t pulseEdges[2] = {0, 0};
  bool staConnected = false;
  uint32_t lastBeatMs = 0;
};
Snap g;

String modeStr(TestEngine::TestMode m) {
  switch (m) {
    case TestEngine::TestMode::NONE: return "none";
    case TestEngine::TestMode::ISO7638_VOLTAGE: return "iso7638_voltage";
    case TestEngine::TestMode::ISO12098_VOLTAGE: return "iso12098_voltage";
    case TestEngine::TestMode::CABLE_ISO7638: return "cable_iso7638";
    case TestEngine::TestMode::CABLE_ISO12098: return "cable_iso12098";
    case TestEngine::TestMode::LAMP_ISO12098: return "lamp_iso12098";
    case TestEngine::TestMode::AXLE_LIFT: return "axle_lift";
    case TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR: return "can_termination_iso7638_tractor";
    case TestEngine::TestMode::CAN_TERM_ISO7638_TRAILER: return "can_termination_iso7638_trailer";
    case TestEngine::TestMode::CAN_TERM_ISO12098_TRACTOR: return "can_termination_iso12098_tractor";
    case TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER: return "can_termination_iso12098_trailer";
    default: return "unknown";
  }
}

const char* socketStr(TestEngine::TestMode m) {
  switch (m) {
    case TestEngine::TestMode::ISO7638_VOLTAGE:
    case TestEngine::TestMode::CABLE_ISO7638:
    case TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR:
    case TestEngine::TestMode::CAN_TERM_ISO7638_TRAILER:
      return "7638";
    case TestEngine::TestMode::ISO12098_VOLTAGE:
    case TestEngine::TestMode::CABLE_ISO12098:
    case TestEngine::TestMode::CAN_TERM_ISO12098_TRACTOR:
    case TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER:
      return "12098";
    default:
      return "unknown";
  }
}

String contStr(TestEngine::ContinuityResult c) {
  switch (c) {
    case TestEngine::ContinuityResult::PASS: return "PASS";
    case TestEngine::ContinuityResult::OPEN: return "OPEN";
    default: return "INDETERMINATE";
  }
}

String abortStr(TestEngine::AbortReason r) {
  switch (r) {
    case TestEngine::AbortReason::EXTERNAL_ENERGY: return "EXTERNAL_ENERGY_DETECTED";
    case TestEngine::AbortReason::INTERLOCK_REJECTED: return "SAFETY_INTERLOCK";
    case TestEngine::AbortReason::SERVICE_FAULT: return "SENSOR_ERROR";
    case TestEngine::AbortReason::PRECONDITION: return "PRECONDITION_FAILED";
    case TestEngine::AbortReason::USER_STOP: return "USER_STOP";
    default: return "NONE";
  }
}

bool isCable(TestEngine::TestMode m) {
  return m == TestEngine::TestMode::CABLE_ISO7638 || m == TestEngine::TestMode::CABLE_ISO12098;
}
bool isVoltage(TestEngine::TestMode m) {
  return m == TestEngine::TestMode::ISO7638_VOLTAGE || m == TestEngine::TestMode::ISO12098_VOLTAGE;
}
bool isLoad(TestEngine::TestMode m) {
  return m == TestEngine::TestMode::LAMP_ISO12098 || m == TestEngine::TestMode::AXLE_LIFT;
}
bool isTerm(TestEngine::TestMode m) {
  return m >= TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR &&
         m <= TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER;
}

void send(const String& s) { gWs.broadcastTXT(s); }

String deviceStatusJson() {
  const NetworkService::NetworkStatus st = NetworkService::status();
  const uint32_t word = TpicControl::state();
  String s = "{\"type\":\"device_status\"";
  s += ",\"network\":{\"apActive\":"; s += st.apActive ? "true" : "false";
  s += ",\"staConnected\":"; s += st.staConnected ? "true" : "false";
  s += ",\"apIp\":\""; s += st.apIp.toString(); s += "\"";
  s += ",\"staIp\":\""; s += st.staIp.toString(); s += "\"}";
  s += ",\"safeState\":{\"allOutputsOff\":"; s += (word == 0u) ? "true" : "false";
  s += ",\"outputWord\":\"0x"; s += String(word, HEX); s += "\"}";
  s += ",\"activeTest\":{\"active\":"; s += TestEngine::isActive() ? "true" : "false";
  s += ",\"state\":"; s += String((unsigned)TestEngine::state()); s += "}";
  s += "}";
  return s;
}

void emitDeviceStatus() { send(deviceStatusJson()); }

void onEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  (void)payload; (void)length;
  switch (type) {
    case WStype_CONNECTED: {
      String j = deviceStatusJson();
      gWs.sendTXT(num, j);  // targeted: new client only
      break;
    }
    default:
      break;  // NO client command protocol; all inbound payloads ignored
  }
}

String loadCurrentJson(const TestEngine::TestResults& r) {
  String s = "{\"type\":\"load_current_update\",\"mode\":\""; s += modeStr(r.mode); s += "\"";
  s += ",\"shunt\":{\"valid\":"; s += r.load.shuntValid ? "true" : "false";
  s += ",\"value\":"; s += String(r.load.shuntV, 6); s += "}";
  s += ",\"bus\":{\"valid\":"; s += r.load.busValid ? "true" : "false";
  s += ",\"value\":"; s += String(r.load.busV, 3); s += "}";
  s += ",\"current\":{\"valid\":"; s += r.load.currentValid ? "true" : "false";
  s += ",\"value\":"; s += String(r.load.currentA, 4); s += "}";
  s += ",\"onMs\":"; s += String((unsigned)r.load.onMs);
  s += ",\"classificationFinal\":false}";
  return s;
}

String shortsForPin(const TestEngine::TestResults& r, uint8_t pin) {
  String a = "[";
  bool first = true;
  for (uint8_t i = 0; i < r.shortCount; ++i) {
    const TestEngine::ShortCandidate& s = r.shortcuts[i];
    if (s.focusPin != pin) continue;
    if (!first) a += ",";
    first = false;
    a += "{\"from\":" + String(s.focusPin) +
         ",\"to\":" + String(s.coupledPin) +
         ",\"delta\":" + String(s.deltaV, 3) + "}";
  }
  a += "]";
  return a;
}

void emitCableProgress(const TestEngine::TestResults& r, TestEngine::TestMode m,
                       TestEngine::TestState st) {
  uint8_t proc = 0;
  for (uint8_t i = 0; i < r.cableCount; ++i) if (r.cable[i].processed) ++proc;

  const bool crossInFlight =
      (st == TestEngine::TestState::CROSS_SCAN) ||
      ((st == TestEngine::TestState::FAULT || st == TestEngine::TestState::ABORTED) &&
       g.state == TestEngine::TestState::CROSS_SCAN);

  uint8_t completed = proc;
  if (crossInFlight && proc > 0) completed = proc - 1;

  while (g.emitted < completed) {
    const TestEngine::CablePinResult& c = r.cable[g.emitted];
    send("{\"type\":\"cable_test_progress\",\"socket\":\"" + String(socketStr(m)) +
         "\",\"currentPin\":" + String(c.pin) +
         ",\"currentPinName\":\"" + String(Channels::channelName(c.ch)) +
         "\",\"focusVoltage\":" + String(c.focusV, 3) +
         ",\"continuity\":\"" + contStr(c.continuity) +
         "\",\"shorts\":" + shortsForPin(r, c.pin) +
         ",\"progress\":{\"completed\":" + String(g.emitted + 1) +
         ",\"total\":" + String(r.cableCount) +
         "},\"classificationFinal\":false}");
    ++g.emitted;
  }
}

void emitCrossScan(const TestEngine::TestResults& r, TestEngine::TestMode m) {
  while (g.shorts < r.shortCount) {
    const TestEngine::ShortCandidate& s = r.shortcuts[g.shorts];
    send("{\"type\":\"cross_scan_update\",\"mode\":\"" + modeStr(m) +
         "\",\"socket\":\"" + String(socketStr(m)) +
         "\",\"focusPin\":" + String(s.focusPin) +
         ",\"scannedPin\":" + String(s.coupledPin) +
         ",\"baseline\":" + String(s.baselineV, 3) +
         ",\"measured\":" + String(s.measuredV, 3) +
         ",\"delta\":" + String(s.deltaV, 3) +
         ",\"isCoupled\":true,\"classificationFinal\":false}");
    ++g.shorts;
  }
}

void emitCableCompleted(const TestEngine::TestResults& r, TestEngine::TestMode m) {
  uint8_t pass = 0, open = 0, indet = 0;
  for (uint8_t i = 0; i < r.cableCount; ++i) {
    if (r.cable[i].continuity == TestEngine::ContinuityResult::PASS) ++pass;
    else if (r.cable[i].continuity == TestEngine::ContinuityResult::OPEN) ++open;
    else ++indet;
  }
  String s = "{\"type\":\"cable_test_completed\",\"socket\":\"" + String(socketStr(m)) +
             "\",\"mode\":\"" + modeStr(m) +
             "\",\"testedPins\":" + String(r.cableCount) +
             ",\"passCount\":" + String(pass) +
             ",\"openCount\":" + String(open) +
             ",\"indeterminateCount\":" + String(indet) +
             ",\"shortCount\":" + String(r.shortCount) +
             ",\"shorts\":[";
  for (uint8_t i = 0; i < r.shortCount; ++i) {
    if (i) s += ",";
    s += "{\"from\":" + String(r.shortcuts[i].focusPin) +
         ",\"to\":" + String(r.shortcuts[i].coupledPin) +
         ",\"delta\":" + String(r.shortcuts[i].deltaV, 3) + "}";
  }
  s += "],\"classificationFinal\":false}";
  send(s);
}

void emitVoltage(const TestEngine::TestResults& r, TestEngine::TestMode m) {
  while (g.volt < r.voltCount) {
    const TestEngine::VoltagePinResult& v = r.volt[g.volt];
    send("{\"type\":\"active_measurement\",\"mode\":\"" + modeStr(m) +
         "\",\"pin\":" + String(v.pin) + "}");
    String e = "{\"type\":\"channel_update\",\"mode\":\"" + modeStr(m) +
               "\",\"pin\":" + String(v.pin) +
               ",\"channelId\":" + String((unsigned)v.ch) +
               ",\"engineeringValue\":" + String(v.nodeV, 3) +
               ",\"unit\":\"V\",\"valid\":" + (v.valid ? "true" : "false");
    if (v.k6OffValid) e += ",\"k6OffEvidence\":" + String(v.k6OffV, 3);
    if (v.pulseValid) e += ",\"pulse\":{\"edges\":" + String((unsigned)v.pulse.edgeCount) +
                           ",\"level\":" + (v.pulse.level ? "true" : "false") + "}";
    e += ",\"classificationFinal\":false}";
    send(e);
    ++g.volt;
  }
}

void emitLoad(const TestEngine::TestResults& r, TestEngine::TestMode m) {
  if (r.load.shuntValid && !g.loadValid) {
    g.loadValid = true;
    send(loadCurrentJson(r));
  }
  if (r.load.onMs != 0 && r.load.onMs != g.loadOnMs) {
    g.loadOnMs = r.load.onMs;
    send(loadCurrentJson(r));
  }
}

void emitTerm(const TestEngine::TestResults& r, TestEngine::TestMode m) {
  if (isTerm(m) && r.term.valid && !g.termValid) {
    g.termValid = true;
    send("{\"type\":\"termination_result\",\"mode\":\"" + modeStr(m) +
         "\",\"vhV\":" + String(r.term.vhV, 3) +
         ",\"vlV\":" + String(r.term.vlV, 3) +
         ",\"deltaV\":" + String(r.term.deltaV, 3) +
         ",\"valid\":" + (r.term.valid ? "true" : "false") +
         ",\"classificationFinal\":false}");
  }
}

void observe() {
  const TestEngine::TestResults& r = TestEngine::results();
  const TestEngine::TestState st = TestEngine::state();
  const bool active = TestEngine::isActive();
  const TestEngine::TestMode mode = r.mode;

  if (active && !g.active) {
    const bool sta = NetworkService::isStaConnected();
    g = Snap{};
    g.active = true; g.staConnected = sta; g.lastBeatMs = millis();
    send("{\"type\":\"test_started\",\"mode\":\"" + modeStr(mode) +
         "\",\"accepted\":true,\"classificationFinal\":false}");
  }

  if (g.active && isCable(mode) &&
      g.state == TestEngine::TestState::BASELINE &&
      st == TestEngine::TestState::FOCUS_ON_SETTLE) {
    send("{\"type\":\"cable_test_baseline_ready\",\"mode\":\"" + modeStr(mode) +
         "\",\"socket\":\"" + String(socketStr(mode)) +
         "\",\"channels\":" + String(r.cableCount) + "}");
  }

  if (g.active) {
    if (isCable(mode))   { emitCableProgress(r, mode, st); emitCrossScan(r, mode); }
    if (isVoltage(mode)) { emitVoltage(r, mode); }
    if (isLoad(mode))    { emitLoad(r, mode); }
    emitTerm(r, mode);
  }

  if (!active && g.active) {
    if (isCable(mode))   { emitCrossScan(r, mode); emitCableProgress(r, mode, st); }
    if (isVoltage(mode)) { emitVoltage(r, mode); }
    if (isLoad(mode))    { emitLoad(r, mode); }
    emitTerm(r, mode);

    if (isCable(mode) && st == TestEngine::TestState::COMPLETE) {
      emitCableCompleted(r, mode);
    }

    const char* outcome = (st == TestEngine::TestState::COMPLETE) ? "completed"
                        : (st == TestEngine::TestState::ABORTED) ? "user_stop"
                        : "fault";
    send("{\"type\":\"test_stopped\",\"mode\":\"" + modeStr(mode) +
         "\",\"outcome\":\"" + outcome + "\"}");
    if (st == TestEngine::TestState::FAULT) {
      send("{\"type\":\"fault\",\"reason\":\"" + abortStr(TestEngine::abortReason()) + "\"}");
    }
    g.active = false;
  }

  g.state = st;

  for (uint8_t i = 0; i < 2; ++i) {
    PulseMonitor::PulseEvidence ev;
    if (PulseMonitor::snapshot(static_cast<PulseMonitor::PulseInput>(i), ev)) {
      if (ev.edgeCount != g.pulseEdges[i]) {
        g.pulseEdges[i] = ev.edgeCount;
        send("{\"type\":\"pulse_update\",\"input\":\"" +
             String(i == 0 ? "SAG" : "SOL") +
             "\",\"edges\":" + String((unsigned)ev.edgeCount) +
             ",\"level\":" + (ev.level ? "true" : "false") +
             ",\"everSeenEdge\":" + (ev.everSeenEdge ? "true" : "false") +
             ",\"lastEdgeAgeMs\":" + String((unsigned)ev.lastEdgeAgeMs) + "}");
      }
    }
  }

  const bool sta = NetworkService::isStaConnected();
  if (sta != g.staConnected) {
    g.staConnected = sta;
    send("{\"type\":\"warning\",\"code\":\"STA_CONNECTION_CHANGED\",\"connected\":" +
         (sta ? "true" : "false") + "}");
    emitDeviceStatus();
  }

  if ((uint32_t)(millis() - g.lastBeatMs) >= kHeartbeatMs) {
    g.lastBeatMs = millis();
    emitDeviceStatus();
  }
}

} // namespace

bool begin() {
  gReady = false;
  gWs.onEvent(onEvent);
  gWs.begin();
  gReady = true;
  return true;
}

void poll() {
  if (!gReady) return;
  gWs.loop();
  observe();
}

bool isReady() { return gReady; }

void notifyRecordUpdated() {
  if (gReady) send("{\"type\":\"record_updated\"}");
}

} // namespace WsServer
