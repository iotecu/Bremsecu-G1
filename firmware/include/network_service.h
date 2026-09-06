#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — network_service.h
// Simultaneous AP+STA network foundation (Phase 3 / Step 1). Transport only.
//
// AUTHORITY:
//   - docs/engineering/wifi-architecture.md
//       * WIFI_AP_STA simultaneous operation
//       * AP recovery/discovery address fixed at 192.168.4.1
//       * STA uses DHCP by default; static STA addressing is NOT the default
//       * mDNS optional/best-effort only; never the sole discovery mechanism
//       * production credential policy PENDING (bench values are not authority)
//   - docs/API_CONTRACT.md (same application reachable via AP and STA address)
//   - firmware/include/config.h (AP_SSID, AP_IP, ENABLE_MDNS defaults)
//
// RULES:
//   - Non-blocking: begin() configures; poll() maintains; no waiting loops.
//   - This service owns Wi-Fi only. It never touches TPIC/relays/K1/K6 and
//     never starts/stops tests.
// =============================================================================

#include <cstdint>
#include <IPAddress.h>

namespace NetworkService {

struct NetworkConfig {
  // STA credentials. Empty staSsid => AP-only operation until credentials are
  // provisioned by a later workflow. PROVISIONAL/PENDING: production credential
  // generation/storage/recovery policy is NOT frozen (wifi-architecture.md).
  char staSsid[33];
  char staPassword[65];

  // Optional convenience only; system operation must never depend on it.
  bool enableMdns;

  NetworkConfig() : staSsid{}, staPassword{}, enableMdns(false) {}
};

struct NetworkStatus {
  bool    apActive;
  bool    staConnected;
  IPAddress apIp;      // authoritative recovery address (192.168.4.1)
  IPAddress staIp;     // DHCP-assigned; 0.0.0.0 when not connected
  int32_t staRssi;     // 0 when not connected
  char    staSsid[33]; // empty when not connected
};

// Configure Wi-Fi in WIFI_AP_STA mode, start the AP recovery interface and
// (optionally) join a STA hotspot. Non-blocking.
bool begin(const NetworkConfig& cfg = NetworkConfig{});

// Lightweight maintenance tick; call from loop(). Non-blocking.
void poll();

// State reporting for the API layer and status UI.
NetworkStatus status();
bool isApActive();
bool isStaConnected();

} // namespace NetworkService
