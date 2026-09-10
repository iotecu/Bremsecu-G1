# Package 7 — Safety Confirmation Lifecycle

Status: IMPLEMENTATION IN PROGRESS

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

A `de_energized` confirmation for one CAN-termination mode must not authorize another termination mode. An `axle_safety` confirmation is bound to the axle-lift mode only.

### Expiration

Confirmations older than the TTL are rejected.

### Single use

A stored confirmation is consumed by a start attempt. Consumption happens before the start result is known, so a failed start attempt cannot leave a stale confirmation available for a later retry.

### Explicit revocation

An explicit `false` revokes the relevant stored confirmation. It must never be OR'ed with an older stored `true` value.

### Stop / reset

Stopping a test or resetting confirmation state clears all stored confirmations.

## Pure lifecycle module

`firmware/include/confirmation_lifecycle.h`
`firmware/src/safety/confirmation_lifecycle.cpp`

The module is independent of HTTP/PWA parsing and is covered by native regression tests.

## Regression coverage

- valid same-mode confirmation
- expired confirmation
- wrong-mode confirmation
- failed-start cleanup
- explicit revocation
- successful single-use consumption
- independence of confirmation types
- full clear/reset

## Remaining integration gate

The HTTP test-start / confirmation endpoints must be wired to this lifecycle module before Package 7 is sealed. The old sticky boolean/OR behavior must not remain in `api_server.cpp`.
