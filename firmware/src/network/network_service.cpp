// =============================================================================
// BREMSECU G1 REV-2 — network_service.cpp
// AP+STA foundation. AP recovery at 192.168.4.1; STA DHCP; mDNS optional.
// Non-blocking; Wi-Fi ownership only.
// =============================================================================

#include "network_service.h"
#include "config.h"

#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>  // normal include; mDNS remains runtime-optional only

namespace NetworkService {

namespace {

NetworkConfig gCfg;
bool gBegan = false;

} // namespace

bool begin(const NetworkConfig& cfg) {
  gCfg   = cfg;
  gBegan = false;

  // Simultaneous AP+STA (wifi-architecture.md core mode).
  WiFi.mode(WIFI_AP_STA);
  WiFi.persistent(false);  // PROVISIONAL: no flash credential storage yet

  // AP recovery/discovery interface fixed at 192.168.4.1 (authority).
  // If the fixed AP configuration cannot be applied, initialization fails:
  // the recovery-address guarantee must never be silently dropped.
  if (!WiFi.softAPConfig(IPAddress(192, 168, 4, 1),
                         IPAddress(192, 168, 4, 1),
                         IPAddress(255, 255, 255, 0))) {
    return false;
  }
  // Open recovery AP is PROVISIONAL/PENDING: production credential policy is
  // not frozen (wifi-architecture.md). Do not treat as production-final.
  if (!WiFi.softAP(Config::AP_SSID)) return false;

  // STA: DHCP by default (authority). Static STA addressing is NOT default.
  if (gCfg.staSsid[0] != '\0') {
    WiFi.setAutoReconnect(true);
    WiFi.begin(gCfg.staSsid, gCfg.staPassword);
  }

  // mDNS: optional convenience only; failure never affects operation.
  // Config::ENABLE_MDNS is a C++ constexpr evaluated at runtime here (it is
  // NOT a preprocessor macro); the runtime config flag may also enable it.
  if (gCfg.enableMdns || Config::ENABLE_MDNS) {
    MDNS.begin("bremsecu");  // best-effort; system never depends on mDNS
  }

  gBegan = true;
  return true;
}

void poll() {
  // Reserved for future maintenance (reconnect supervision, STA provisioning
  // workflow hooks). Intentionally light; Wi-Fi STA auto-reconnect is enabled.
  if (!gBegan) return;
}

NetworkStatus status() {
  NetworkStatus st;
  st.apActive     = isApActive();
  st.staConnected = isStaConnected();
  st.apIp         = WiFi.softAPIP();
  st.staIp        = st.staConnected ? WiFi.localIP() : IPAddress(0, 0, 0, 0);
  st.staRssi      = st.staConnected ? WiFi.RSSI() : 0;
  st.staSsid[0]   = '\0';
  if (st.staConnected) {
    const String s = WiFi.SSID();
    strncpy(st.staSsid, s.c_str(), sizeof(st.staSsid) - 1);
    st.staSsid[sizeof(st.staSsid) - 1] = '\0';
  }
  return st;
}

bool isApActive() {
  return (WiFi.getMode() & WIFI_AP) != 0 && WiFi.softAPIP() != IPAddress(0, 0, 0, 0);
}

bool isStaConnected() {
  return WiFi.status() == WL_CONNECTED;
}

} // namespace NetworkService
