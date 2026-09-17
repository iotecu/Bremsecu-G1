# BREMSECU G1 — FIRMWARE INTEGRATION CONTRACT

Status: FINAL CLIENT-SIDE INTEGRATION RULES

## 1. Architecture
The PWA is the UI/client of the existing ESP32 firmware.

Firmware is authoritative for:
- hardware state,
- relay/TPIC control,
- test sequencing,
- measurements,
- safety interlocks,
- stored diagnostic evidence.

The PWA must not reproduce or override those responsibilities.

## 2. Transport
Use the existing firmware transport only:
- HTTP/JSON for commands, records, reports, settings and status requests.
- WebSocket for live device/test telemetry.

HTTP server: same host serving the PWA, port 80.
WebSocket server: same host, port 81.

Do not hard-code `192.168.4.1` as the only production host. Derive the active host from the page location so the same build works through:
- ESP AP at `192.168.4.1`, and
- ESP STA DHCP address when used through hotspot/router.

Direct IP is authoritative. Do not require mDNS.

## 3. HTTP API
Use the existing `/api/v1/...` contract in `docs/API_CONTRACT.md`.

Core endpoints already defined by firmware:
- `GET /api/v1/device`
- `GET /api/v1/status`
- `POST /api/v1/test/start`
- `POST /api/v1/test/stop`
- `POST /api/v1/test/confirm`
- `GET /api/v1/records`
- `POST /api/v1/records`
- `POST /api/v1/report/save-result`
- `GET /api/v1/report`
- `PUT /api/v1/report`
- `GET /api/v1/settings`
- `PUT /api/v1/settings`

Do not rename endpoints, invent alternate REST paths, or wrap them behind a fake production backend.

## 4. Approved test intents
PWA may request only approved firmware test modes:
- `iso7638_voltage`
- `iso12098_voltage`
- `cable_iso7638`
- `cable_iso12098`
- `lamp_iso12098`
- `axle_lift`
- `can_termination_iso7638_tractor`
- `can_termination_iso7638_trailer`
- `can_termination_iso12098_tractor`
- `can_termination_iso12098_trailer`

Cross Scan is not a separate test mode. It is firmware behavior inside cable tests.

## 5. WebSocket
Connect to the current page host on port 81.

Consume existing server-originated events, including:
- `device_status`
- `test_started`
- `test_stopped`
- `active_measurement`
- `channel_update`
- `cross_scan_update`
- `cable_test_progress`
- `cable_test_completed`
- `load_current_update`
- `termination_result`
- `warning`
- `fault`
- `record_updated`

The WebSocket is telemetry/state OUT from firmware. Do not create a second command protocol over WebSocket.

## 6. Safety boundary
Never expose UI code that directly sets:
- arbitrary TPIC bits,
- arbitrary relay outputs,
- K1/K6 states,
- CAN relay combinations,
- raw GPIO outputs.

PWA sends approved test intent; firmware validates and performs the action.

A UI confirmation does not bypass firmware safety checks.

## 7. Dynamic UI binding
Live voltage/current/resistance/cable-test values must render from firmware data.

Do not locally fabricate PASS/FAIL when firmware reports `classificationFinal: false` or an engineering threshold is unresolved.

If firmware reports an error/fault/interlock rejection, render the firmware-provided machine/i18n context through the UI translation layer. Do not reinterpret protected safety state in the browser.

## 8. Reconnect and recovery
On load/reload/reconnect:
1. reconnect HTTP/WebSocket to the current host,
2. read device/status state,
3. recover current active test/record context from firmware where available,
4. restore non-authoritative local UI preferences such as selected language,
5. never assume hardware state from stale browser memory.

## 9. Development mocks
Mocks are allowed only for local visual development when hardware is unavailable.

Requirements:
- mocks live behind an explicit development-only boundary,
- production mode uses real HTTP/WebSocket services,
- production build does not silently fall back to fake measurements,
- mock event names/payloads must mirror the real firmware contract.

## 10. Static deployment target
The final PWA must build to static deployable files suitable for being served by ESP32 firmware.

Do not require:
- Node.js server at runtime,
- server-side rendering,
- cloud API gateway,
- external database,
- CDN for core code/assets,
- internet access for core diagnostics.

The PWA and firmware are one local product at runtime: browser UI + ESP32 API/telemetry.
