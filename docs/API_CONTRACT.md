# BREMSECU G1 — API Contract

Status: IMPLEMENTATION CONTRACT. Exact endpoint transport details may evolve, but safety ownership and payload meaning are fixed.

## Principle
The PWA is a client. Firmware is the authority for hardware state, test sequencing and safety interlocks.

## Base transport
- HTTP/JSON for request/response operations.
- WebSocket for live measurement/test state.
- Same application is reachable through ESP AP (`192.168.4.1`) and through the STA DHCP address when available.

## Core resources

### `GET /api/v1/device`
Returns product identity, firmware version, board revision, serial number, network state and capabilities.

### `GET /api/v1/status`
Returns current safe-state summary, active test, active channel, relay/output state summary and unresolved-engineering flags.

### `POST /api/v1/test/start`
Request body identifies the approved test mode and target side/connector where applicable.
Firmware validates all preconditions before changing hardware.

Approved modes:
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

There is no `cross_scan` mode.

### `POST /api/v1/test/stop`
Stops the active test and returns controllable outputs to the safe state.

### `POST /api/v1/test/confirm`
Records workflow confirmations required by an approved test, e.g. ignition-off/de-energized CAN termination confirmation or axle-lift safety confirmation. A UI confirmation never bypasses firmware interlocks.

### `POST /api/v1/report/save-result`
Stores the current completed test result into the active service record.

### `GET /api/v1/records`
Search/list service records using supported query fields such as customer, tractor plate, trailer plate, chassis or fleet/trailer number.

### `POST /api/v1/records`
Creates the active service/vehicle record.

### `GET /api/v1/settings`
Returns language, keep-awake preference, technicians, service/company metadata, report-logo metadata and device information.

### `PUT /api/v1/settings`
Updates permitted user/settings data. It cannot update protected engineering/safety constants.

## WebSocket
Suggested path: `/ws`

Server-originated events:
- `device_status`
- `test_started`
- `test_stopped`
- `active_measurement`
- `channel_update`
- `pulse_update`
- `load_current_update`
- `termination_result`
- `warning`
- `fault`
- `record_updated`

## Common result fields
Where applicable, test/channel messages should expose:
- `testId`
- `mode`
- `side`
- `channelId`
- `pin`
- `function`
- `rawValue`
- `engineeringValue`
- `unit`
- `status`
- `classificationFinal`
- `timestamp`
- `note`

If a production classification threshold is still PENDING, `classificationFinal` must be false and firmware must not invent PASS/FAIL limits.

## Error contract
Errors return a stable machine code plus user-displayable i18n key/message context.

Important error families:
- `SAFETY_INTERLOCK`
- `INVALID_TEST_MODE`
- `INVALID_CAN_RELAY_COMBINATION`
- `EXTERNAL_ENERGY_DETECTED`
- `TEST_ALREADY_ACTIVE`
- `ENGINEERING_VALUE_PENDING`
- `STORAGE_ERROR`
- `SENSOR_ERROR`

## Safety rule
No API call may directly set arbitrary TPIC bits, arbitrary relays or arbitrary K1/K6 state from the PWA. Hardware actions must be expressed as approved test intents and validated inside firmware.
