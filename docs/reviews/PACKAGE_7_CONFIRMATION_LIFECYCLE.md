# Package 7 — Safety Confirmation Lifecycle

Status: SEALED

## Contract

Safety confirmations are ephemeral authorization facts, not sticky UI preferences.

A confirmation is valid only when all of the following are true:

- it is armed;
- it is bound to the exact requested test mode;
- it has not expired;
- it has not already been consumed or revoked.

Default TTL: 30 seconds.

## Required behavior

### Mode binding

A `de_energized` confirmation for one CAN-termination mode cannot authorize another termination mode. An `axle_safety` confirmation is bound to the axle-lift mode only.

### Expiration

Confirmations older than the TTL are rejected.

### Single use / failed-start cleanup

A stored confirmation is consumed by a start attempt before the start outcome is known. A failed start therefore cannot leave stale authorization available for retry.

### Explicit revocation

An explicit `false` revokes the relevant stored confirmation. It is never OR'ed with an older stored `true` value.

### Stop / reset

Stopping a test or resetting confirmation state clears all stored confirmations.

## Implementation

`firmware/include/confirmation_lifecycle.h`
`firmware/src/safety/confirmation_lifecycle.cpp`

`firmware/src/api/api_server.cpp` now uses the lifecycle module for `/api/v1/test/confirm` and `/api/v1/test/start`.

Positive `/test/confirm` requests require the exact target mode. Direct start-body confirmations remain single-request facts. Explicit false values revoke rather than inheriting stored true state.

The API also maps `CALIBRATION_PENDING` to `ENGINEERING_VALUE_PENDING` instead of a generic start rejection.

## Regression coverage

- valid same-mode confirmation
- expired confirmation
- wrong-mode confirmation
- failed-start cleanup
- explicit revocation
- successful single-use consumption
- independence of confirmation types
- full clear/reset

## Verified gate

GitHub Actions run `34502529855` passed after API integration on commit `170f8f7cb5f50d60448f6960f5822f1ffc3a0d8f`:

- MASTER NET MAP authority consistency — PASS
- ESP32 firmware build — PASS
- Package 1 interlock regression — PASS
- Package 3 measurement conversion regression — PASS
- Package 4 calibration payload regression — PASS
- Package 5 pin-domain regression — PASS
- Package 7 confirmation lifecycle regression — PASS

No hardware mapping or diagnostic threshold was changed by Package 7.
