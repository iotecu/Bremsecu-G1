#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — api_server.h
// HTTP transport skeleton (Phase 3 / Step 1). READ-ONLY endpoints only.
//
// AUTHORITY:
//   - docs/API_CONTRACT.md
//       * GET /api/v1/device, GET /api/v1/status
//       * same application reachable via AP (192.168.4.1) and STA DHCP address
//       * error contract: stable machine code + i18n key
//       * NO direct TPIC / relay / K1 / K6 control through HTTP
//
// SCOPE (this step):
//   - Implements ONLY GET /api/v1/device and GET /api/v1/status.
//   - Does NOT bind test start/stop/confirm, report/storage, WebSocket.
//   - Transport observes TestEngine / output state read-only; it never writes
//     hardware and never mutates SafetyInterlocks state.
//   - Non-blocking: poll() services the core WebServer (handleClient).
// =============================================================================

namespace ApiServer {

// Start the HTTP server on port 80 (all interfaces: AP + STA).
bool begin();

// Service pending requests; call from loop(). Non-blocking.
void poll();

bool isReady();

} // namespace ApiServer
