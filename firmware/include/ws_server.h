#pragma once

// =============================================================================
// BREMSECU G1 REV-2 — ws_server.h
// WebSocket LIVE EVENT transport (Phase 3 / Step 3). Telemetry OUT only.
//
// AUTHORITY:
//   - docs/API_CONTRACT.md            (event list; /ws; safety boundary)
//   - docs/engineering/API_CONTRACT.md (cable_test_* payload semantics)
//
// RULES:
//   - Server-originated events ONLY. No client command protocol; received
//     payloads are ignored. The PWA can NEVER set TPIC bits, K1, K6, CAN
//     relays or arbitrary outputs through this layer.
//   - Events are generated ONLY from observed TestEngine / Phase-1 service
//     state changes (deltas/transitions) + a PROVISIONAL heartbeat.
//   - No second test state machine; no re-classification; no invented
//     thresholds. classificationFinal is always false while PENDING.
//   - Non-blocking: begin() + poll() only; no delay().
// =============================================================================

namespace WsServer {

// Start the WebSocket server (PROVISIONAL port 81; /ws path convention).
bool begin();

// Service sockets + emit delta events; call from loop(). Non-blocking.
void poll();

bool isReady();

// Transport hook for the later storage/report layer (Phase 4). Stub now.
void notifyRecordUpdated();

} // namespace WsServer
