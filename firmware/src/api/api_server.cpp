// =============================================================================
// BREMSECU G1 REV-2 — api_server.cpp
// HTTP transport: read-only endpoints + approved test-intent endpoints.
// The HTTP layer can only submit approved TestStartParams; it can never write
// TPIC bits, relays, K1 or K6. WebSocket telemetry is provided separately.
// =============================================================================

#include "api_server.h"

#include <Arduino.h>
#include <WebServer.h>

#include "config.h"
#include "json_lite.h"
#include "network_service.h"
#include "tpic_map.h"
#include "tpic_control.h"
#include "test_engine.h"
#include "ws_server.h"

namespace ApiServer {

namespace {

WebServer gServer(80);
bool gReady = false;

constexpr const char* kFirmwareVersion  = "0.3.0-phase3";
constexpr const char* kHardwareRevision = "REV-2";
constexpr const char* kApiVersion       = "v1";

constexpr const char* kUnresolved[] = {
  "CALIBRATION_COEFFICIENTS",
  "GND_TWO_REFERENCE_THRESHOLDS",
  "INA226_CURRENT_THRESHOLDS",
  "CAN_TERMINATION_WINDOWS",
  "CROSS_SCAN_TIMING",
  "HAZARD_PRODUCT_DECISION",
  "PRODUCTION_CREDENTIAL_POLICY"
};

struct ConfirmationStore {
  bool deEnergized = false;
  bool axleSafety  = false;
} gConf;

String esc(const String& s) {
  String out;
  out.reserve(s.length() + 8);
  for (size_t i = 0; i < s.length(); ++i) {
    const char c = s[i];
    if (c == '"' || c == '\\') out += '\\';
    out += c;
  }
  return out;
}

String ipStr(const IPAddress& ip) { return ip.toString(); }

void sendError(int httpCode, const char* code, const char* i18nKey) {
  String s = "{\"error\":\""; s += code;
  s += "\",\"i18nKey\":\""; s += i18nKey;
  s += "\"}";
  gServer.send(httpCode, "application/json", s);
}

void sendOk(const String& extra = "") {
  String s = "{\"ok\":true";
  s += extra;
  s += "}";
  gServer.send(200, "application/json", s);
}

String networkJson() {
  const NetworkService::NetworkStatus st = NetworkService::status();
  String s = "{";
  s += "\"apActive\":"; s += st.apActive ? "true" : "false";
  s += ",\"staConnected\":"; s += st.staConnected ? "true" : "false";
  s += ",\"apIp\":\""; s += ipStr(st.apIp); s += "\"";
  s += ",\"staIp\":\""; s += ipStr(st.staIp); s += "\"";
  s += ",\"staSsid\":\""; s += esc(String(st.staSsid)); s += "\"";
  s += ",\"staRssi\":"; s += String((int)st.staRssi);
  s += "}";
  return s;
}

String deviceSerialPlaceholder() {
  const uint64_t mac = ESP.getEfuseMac();
  char buf[24];
  snprintf(buf, sizeof(buf), "ESP-%04X%08X",
           (unsigned)((mac >> 32) & 0xFFFF), (unsigned)(mac & 0xFFFFFFFFu));
  return String(buf);
}

bool modeFromString(const String& m, TestEngine::TestMode& out) {
  if      (m == "iso7638_voltage")                    out = TestEngine::TestMode::ISO7638_VOLTAGE;
  else if (m == "iso12098_voltage")                   out = TestEngine::TestMode::ISO12098_VOLTAGE;
  else if (m == "cable_iso7638")                      out = TestEngine::TestMode::CABLE_ISO7638;
  else if (m == "cable_iso12098")                     out = TestEngine::TestMode::CABLE_ISO12098;
  else if (m == "lamp_iso12098")                      out = TestEngine::TestMode::LAMP_ISO12098;
  else if (m == "axle_lift")                          out = TestEngine::TestMode::AXLE_LIFT;
  else if (m == "can_termination_iso7638_tractor")    out = TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR;
  else if (m == "can_termination_iso7638_trailer")    out = TestEngine::TestMode::CAN_TERM_ISO7638_TRAILER;
  else if (m == "can_termination_iso12098_tractor")   out = TestEngine::TestMode::CAN_TERM_ISO12098_TRACTOR;
  else if (m == "can_termination_iso12098_trailer")   out = TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER;
  else return false;
  return true;
}

bool isCableMode(TestEngine::TestMode m) {
  return m == TestEngine::TestMode::CABLE_ISO7638 ||
         m == TestEngine::TestMode::CABLE_ISO12098;
}

bool isTermMode(TestEngine::TestMode m) {
  return m >= TestEngine::TestMode::CAN_TERM_ISO7638_TRACTOR &&
         m <= TestEngine::TestMode::CAN_TERM_ISO12098_TRAILER;
}

bool optionalBoolDefaultTrue(const String& body, const char* key,
                             bool& out, bool& rejected) {
  rejected = false;
  if (!JsonLite::hasKey(body, key)) { out = true; return true; }
  if (!JsonLite::getBool(body, key, out)) rejected = true;
  return !rejected;
}

bool optionalBoolDefaultFalse(const String& body, const char* key,
                              bool& out, bool& rejected) {
  rejected = false;
  if (!JsonLite::hasKey(body, key)) { out = false; return true; }
  if (!JsonLite::getBool(body, key, out)) rejected = true;
  return !rejected;
}

void handleDevice() {
  String s = "{";
  s += "\"product\":\""; s += esc(String(Config::PRODUCT)); s += "\"";
  s += ",\"firmwareVersion\":\""; s += kFirmwareVersion; s += "\"";
  s += ",\"hardwareRevision\":\""; s += kHardwareRevision; s += "\"";
  s += ",\"serialNumber\":\""; s += deviceSerialPlaceholder(); s += "\"";
  s += ",\"apiVersion\":\""; s += kApiVersion; s += "\"";
  s += ",\"network\":"; s += networkJson();
  s += ",\"capabilities\":{";
  s += "\"websocket\":"; s += WsServer::isReady() ? "true" : "false";
  s += ",\"mdns\":"; s += (Config::ENABLE_MDNS) ? "true" : "false";
  s += ",\"approvedModes\":[";
  s += "\"iso7638_voltage\",\"iso12098_voltage\",";
  s += "\"cable_iso7638\",\"cable_iso12098\",";
  s += "\"lamp_iso12098\",\"axle_lift\",";
  s += "\"can_termination_iso7638_tractor\",\"can_termination_iso7638_trailer\",";
  s += "\"can_termination_iso12098_tractor\",\"can_termination_iso12098_trailer\"";
  s += "]}";
  s += "}";
  gServer.send(200, "application/json", s);
}

void handleStatus() {
  const uint32_t word = TpicControl::state();
  const bool active = TestEngine::isActive();

  String s = "{";
  s += "\"network\":"; s += networkJson();
  s += ",\"safeState\":{";
  s += "\"allOutputsOff\":"; s += (word == 0u) ? "true" : "false";
  s += ",\"outputWord\":\"0x"; s += String(word, HEX); s += "\"";
  s += ",\"k1SelectVOn\":"; s += ((word & (1UL << TpicBit::K1_SELECT_V)) != 0u) ? "true" : "false";
  s += ",\"k6MasterGndOn\":"; s += ((word & (1UL << TpicBit::K6_MASTER_GND)) != 0u) ? "true" : "false";
  const uint32_t canBits = (word & ((1UL << TpicBit::K2_CAN7638_CK) | (1UL << TpicBit::K3_CAN12098_CK) |
                                    (1UL << TpicBit::K4_CAN7638_DR) | (1UL << TpicBit::K5_CAN12098_DR)));
  s += ",\"canRelayActive\":"; s += (canBits != 0u) ? "true" : "false";
  s += "}";

  s += ",\"activeTest\":{";
  s += "\"active\":"; s += active ? "true" : "false";
  s += ",\"state\":"; s += String((unsigned)TestEngine::state());
  s += ",\"abortReason\":"; s += String((unsigned)TestEngine::abortReason());
  s += "}";

  s += ",\"unresolvedEngineering\":[";
  for (size_t i = 0; i < sizeof(kUnresolved) / sizeof(kUnresolved[0]); ++i) {
    if (i) s += ",";
    s += "\""; s += kUnresolved[i]; s += "\"";
  }
  s += "]";
  s += "}";
  gServer.send(200, "application/json", s);
}

void handleTestStart() {
  const String body = gServer.arg("plain");

  String modeStr;
  if (!JsonLite::getString(body, "mode", modeStr)) {
    sendError(400, "INVALID_REQUEST", "error.invalid_request"); return;
  }
  TestEngine::TestMode mode;
  if (!modeFromString(modeStr, mode)) {
    sendError(400, "INVALID_TEST_MODE", "error.invalid_test_mode"); return;
  }

  TestEngine::TestStartParams p;
  p.mode = mode;

  if (isCableMode(mode)) {
    uint32_t mask = 0;
    if (JsonLite::getUint32(body, "enabledPinMask", mask)) p.enabledPinMask = mask;
  }
  if (mode == TestEngine::TestMode::LAMP_ISO12098) {
    uint32_t pin = 0;
    if (!JsonLite::getUint32(body, "lampPin", pin) || pin < 1 || pin > 15) {
      sendError(400, "INVALID_REQUEST", "error.invalid_request"); return;
    }
    p.lampPin = (uint8_t)pin;
  }
  if (isTermMode(mode)) {
    bool v = false; bool rejected = false;
    optionalBoolDefaultFalse(body, "deEnergizedConfirmed", v, rejected);
    if (rejected) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }
    p.deEnergizedConfirmed = v || gConf.deEnergized;
  }
  if (mode == TestEngine::TestMode::AXLE_LIFT) {
    bool v = false; bool rejected = false;
    optionalBoolDefaultFalse(body, "axleSafetyConfirmed", v, rejected);
    if (rejected) { sendError(400, "INVALID_REQUEST", "error.invalid_request"); return; }
    p.axleSafetyConfirmed = v || gConf.axleSafety;
  }

  if (TestEngine::isActive()) {
    sendError(409, "TEST_ALREADY_ACTIVE", "error.test_already_active"); return;
  }

  if (!TestEngine::start(p)) {
    switch (TestEngine::abortReason()) {
      case TestEngine::AbortReason::INTERLOCK_REJECTED:
        sendError(409, "SAFETY_INTERLOCK", "error.safety_interlock"); return;
      case TestEngine::AbortReason::EXTERNAL_ENERGY:
        sendError(409, "EXTERNAL_ENERGY_DETECTED", "error.external_energy_detected"); return;
      case TestEngine::AbortReason::SERVICE_FAULT:
        sendError(500, "SENSOR_ERROR", "error.sensor_error"); return;
      case TestEngine::AbortReason::PRECONDITION:
        sendError(409, "PRECONDITION_FAILED", "error.precondition_failed"); return;
      default:
        sendError(409, "START_REJECTED", "error.start_rejected"); return;
    }
  }

  gConf.deEnergized = false;
  gConf.axleSafety  = false;

  sendOk(",\"mode\":\"" + modeStr + "\"");
}

void handleTestStop() {
  if (TestEngine::isActive()) TestEngine::stop();
  gConf.deEnergized = false;
  gConf.axleSafety  = false;
  sendOk(",\"active\":false");
}

void handleTestConfirm() {
  const String body = gServer.arg("plain");

  String type;
  if (!JsonLite::getString(body, "type", type)) {
    sendError(400, "INVALID_REQUEST", "error.invalid_request"); return;
  }

  bool value = true;
  bool rejected = false;
  optionalBoolDefaultTrue(body, "value", value, rejected);
  if (rejected) {
    sendError(400, "INVALID_REQUEST", "error.invalid_request"); return;
  }

  if (type == "de_energized") {
    gConf.deEnergized = value;
  } else if (type == "axle_safety") {
    gConf.axleSafety = value;
  } else {
    sendError(400, "INVALID_CONFIRMATION", "error.invalid_confirmation"); return;
  }
  sendOk(",\"type\":\"" + type + "\",\"value\":" + (value ? "true" : "false"));
}

void handleNotFound() {
  sendError(404, "NOT_FOUND", "error.not_found");
}

} // namespace

bool begin() {
  gReady = false;

  gServer.on("/api/v1/device", HTTP_GET, handleDevice);
  gServer.on("/api/v1/status", HTTP_GET, handleStatus);
  gServer.on("/api/v1/test/start", HTTP_POST, handleTestStart);
  gServer.on("/api/v1/test/stop", HTTP_POST, handleTestStop);
  gServer.on("/api/v1/test/confirm", HTTP_POST, handleTestConfirm);
  gServer.onNotFound(handleNotFound);

  gServer.begin();
  gReady = true;
  return true;
}

void poll() {
  if (gReady) gServer.handleClient();
}

bool isReady() { return gReady; }

} // namespace ApiServer
