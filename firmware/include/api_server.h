#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — api_server.h
// HTTP transport (Phase 3 / Step 2). Approved test-intent endpoints added.
//
// AUTHORITY:
//   - docs/API_CONTRACT.md
//       * GET /api/v1/device, GET /api/v1/status (read-only)
//       * POST /api/v1/test/start | /test/stop | /test/confirm
//       * approved modes only; cross_scan is NOT a standalone mode
//       * error contract: stable machine code + i18n key
//       * NO direct TPIC / relay / K1 / K6 control through HTTP
//
// SCOPE (this step):
//   - The HTTP layer submits ONLY approved TestEngine::TestStartParams.
//   - /test/confirm records workflow confirmations only; never hardware.
//   - Transport observes TestEngine / output state read-only; it never writes
//     hardware and never duplicates SafetyInterlocks logic.
//   - No WebSocket yet; no report/storage binding yet.
//   - Non-blocking: poll() services the core WebServer (handleClient).
// =============================================================================

namespace ApiServer {

// Start the HTTP server on port 80 (all interfaces: AP + STA).
bool begin();

// Service pending requests; call from loop(). Non-blocking.
void poll();

bool isReady();

} // namespace ApiServer
