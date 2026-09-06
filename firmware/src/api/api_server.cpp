// =============================================================================
// BREMSECU G1 REV-2 — api_server.cpp
// Read-only HTTP skeleton. GET /api/v1/device + GET /api/v1/status only.
// No control endpoints; no WebSocket yet; no report/storage binding.
// =============================================================================

#include "api_server.h"

#include <Arduino.h>
#include <WebServer.h>

#include "config.h"
#include "network_service.h"
#include "tpic_map.h"
#include "tpic_control.h"
#include "test_engine.h"

namespace ApiServer {

namespace {

WebServer gServer(80);
bool gReady = false;

// PROVISIONAL identity metadata; production serial/version policy PENDING.
constexpr const char* kFirmwareVersion  = "0.3.0-phase3";   // PROVISIONAL
constexpr const char* kHardwareRevision = "REV-2";          // authority (NET MAP)
constexpr const char* kApiVersion       = "v1";             // API_CONTRACT

// Unresolved engineering items (docs/engineering/status-register.md).
// Reported to clients so the PWA can block final classification correctly.
constexpr const char* kUnresolved[] = {
  "CALIBRATION_COEFFICIENTS",
  "GND_TWO_REFERENCE_THRESHOLDS",
  "INA226_CURRENT_THRESHOLDS",
  "CAN_TERMINATION_WINDOWS",
  "CROSS_SCAN_TIMING",
  "HAZARD_PRODUCT_DECISION",
  "PRODUCTION_CREDENTIAL_POLICY"
};

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

String networkJson() {
  const NetworkService::NetworkStatus st = NetworkService::status();
  String s = "{";
  s += "\"apActive\":";   s += st.apActive ? "true" : "false";
  s += ",\"staConnected\":"; s += st.staConnected ? "true" : "false";
  s += ",\"apIp\":\"";     s += ipStr(st.apIp);      s += "\"";
  s += ",\"staIp\":\"";    s += ipStr(st.staIp);     s += "\"";
  s += ",\"staSsid\":\"";  s += esc(String(st.staSsid)); s += "\"";
  s += ",\"staRssi\":";    s += String((int)st.staRssi);
  s += "}";
  return s;
}

String deviceSerialPlaceholder() {
  // PROVISIONAL placeholder until production serial policy is frozen.
  const uint64_t mac = ESP.getEfuseMac();
  char buf[24];
  snprintf(buf, sizeof(buf), "ESP-%04X%08X",
           (unsigned)((mac >> 32) & 0xFFFF), (unsigned)(mac & 0xFFFFFFFFu));
  return String(buf);
}

void handleDevice() {
  String s = "{";
  s += "\"product\":\"";        s += esc(String(Config::PRODUCT)); s += "\"";
  s += ",\"firmwareVersion\":\""; s += kFirmwareVersion; s += "\"";
  s += ",\"hardwareRevision\":\""; s += kHardwareRevision; s += "\"";
  s += ",\"serialNumber\":\"";  s += deviceSerialPlaceholder(); s += "\"";
  s += ",\"apiVersion\":\"";    s += kApiVersion; s += "\"";
  s += ",\"network\":";         s += networkJson();
  s += ",\"capabilities\":{";
  s += "\"websocket\":false";   // not bound in this step
  s += ",\"mdns\":";            s += (Config::ENABLE_MDNS) ? "true" : "false";
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
  const uint32_t word = TpicControl::state();  // read-only observation
  const bool active = TestEngine::isActive();

  String s = "{";
  s += "\"network\":"; s += networkJson();

  // Safe-state / output summary (read-only; no control surface).
  s += ",\"safeState\":{";
  s += "\"allOutputsOff\":"; s += (word == 0u) ? "true" : "false";
  s += ",\"outputWord\":\"0x"; s += String(word, HEX); s += "\"";
  s += ",\"k1SelectVOn\":"; s += ((word & (1UL << TpicBit::K1_SELECT_V)) != 0u) ? "true" : "false";
  s += ",\"k6MasterGndOn\":"; s += ((word & (1UL << TpicBit::K6_MASTER_GND)) != 0u) ? "true" : "false";
  s += ",\"canRelayActive\":";
  const uint32_t canBits = (word & ((1UL << TpicBit::K2_CAN7638_CK) | (1UL << TpicBit::K3_CAN12098_CK) |
                                    (1UL << TpicBit::K4_CAN7638_DR) | (1UL << TpicBit::K5_CAN12098_DR)));
  s += (canBits != 0u) ? "true" : "false";
  s += "}";

  // Active test summary (read-only).
  s += ",\"activeTest\":{";
  s += "\"active\":"; s += active ? "true" : "false";
  s += ",\"state\":"; s += String((unsigned)TestEngine::state());
  s += ",\"abortReason\":"; s += String((unsigned)TestEngine::abortReason());
  s += "}";

  // Unresolved engineering flags (status-register.md authority).
  s += ",\"unresolvedEngineering\":[";
  for (size_t i = 0; i < sizeof(kUnresolved) / sizeof(kUnresolved[0]); ++i) {
    if (i) s += ",";
    s += "\""; s += kUnresolved[i]; s += "\"";
  }
  s += "]";
  s += "}";
  gServer.send(200, "application/json", s);
}

void handleNotFound() {
  // Error contract: stable machine code + i18n key.
  gServer.send(404, "application/json",
               String("{\"error\":\"NOT_FOUND\",\"i18nKey\":\"error.not_found\"}"));
}

} // namespace

bool begin() {
  gReady = false;

  // READ-ONLY endpoints only. No control surface is registered: the HTTP layer
  // cannot energize TPIC outputs, relays, K1 or K6 (API_CONTRACT safety rule).
  gServer.on("/api/v1/device", HTTP_GET, handleDevice);
  gServer.on("/api/v1/status", HTTP_GET, handleStatus);
  gServer.onNotFound(handleNotFound);

  gServer.begin();  // listens on all active interfaces (AP + STA)
  gReady = true;
  return true;
}

void poll() {
  if (gReady) gServer.handleClient();  // non-blocking per call
}

bool isReady() { return gReady; }

} // namespace ApiServer
