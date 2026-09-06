#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — api_server.h
// HTTP transport. Phase 3: device/status + approved test intents (with the
// accepted confirmation workflow). Phase 4 Step 2: POST/GET /api/v1/records
// (RecordStore-backed, device-owned). Telemetry via WsServer (separate).
// Records endpoints call RecordStore ONLY; no hardware control through them.
// =============================================================================

namespace ApiServer {
bool begin();
void poll();
bool isReady();
} // namespace ApiServer