# Package 10 — Production Hardening Status

Status: IMPLEMENTATION/CI CLOSURE CANDIDATE — FINAL INDEPENDENT REVIEW DEFERRED

Package 10 is the production-hardening remediation package. It must not invent product-security policy or prematurely create Faz 6/PWA application architecture.

## Completed in repository

### JSON parsing robustness

The fixed-schema HTTP JSON parser was hardened to fail closed on malformed structure, duplicate requested keys, escaped-key ambiguity, invalid string escapes/control characters, trailing garbage, malformed booleans, and invalid/overflowing uint32 values.

A dedicated native regression environment (`native-json-lite`) exists and is now part of the normal GitHub CI gate.

### SD error semantics

`SdService::readFile()` is complete-or-fail. If the caller buffer is smaller than the file, the operation returns failure with `SdError::TOO_LARGE`; partial/truncated content is never reported as a successful read. Short reads are reported as I/O error.

### PWA dependency reproducibility

The pre-Faz-6 PWA dependency manifest no longer uses floating `latest` versions. Exact package versions are frozen in `pwa/package.json` and a generated npm lockfile (`lockfileVersion: 3`) is committed.

The lockfile was generated with Node.js 24.21.0 / npm 11.19.0 and verified with a clean `npm ci` install.

The repository does not yet contain the actual Faz 6 TypeScript application build configuration (`pwa/tsconfig.json`). Therefore Package 10 does not fabricate a PWA build project merely to make `npm run build` pass. CI verifies the locked dependency graph now and automatically runs the PWA build once the Faz 6 application files exist.

### Toolchain/CI reproducibility

The firmware PlatformIO platform and PlatformIO CLI are pinned. GitHub Actions references used by the remediation CI are commit-pinned. The CI gate covers:

- MASTER NET MAP authority consistency
- ESP32 firmware build
- Package 1 interlock regression
- Package 3 conversion regression
- Package 4 calibration-payload regression
- Package 5 pin-domain regression
- Package 7 confirmation-lifecycle regression
- Package 8 load-safety regression
- Package 10 JSON-parser regression
- locked PWA dependency install / no-floating-version check

## Explicitly deferred product-policy items

The following Package 10 headings are not safe to implement without product authority and are therefore dispositioned as **DEFERRED — PRODUCT/Faz 6 AUTHORITY REQUIRED**, not silently guessed:

- AP authentication / provisioning / credential recovery policy
- API authentication and session model
- transport-level request-size and timeout policy
- automatic result persistence / journaling lifecycle
- schema migration/versioning contract
- WebSocket snapshot/resynchronization contract

These are architectural/product-policy decisions, not missing numeric constants. Their absence must remain visible; an implementation agent must not choose credentials, session lifetime, recovery behavior, journaling guarantees, schema compatibility rules, or resynchronization semantics on its own.

## Scope boundary

No previously accepted bench evidence, measurement mapping, calibration value, diagnostic threshold, CAN behavior, or safety interlock is changed by Package 10.

Package 10 closes the repository-hardening work that can be deterministically implemented and tested before Faz 6. The deferred policy items remain an explicit input to the later product/PWA architecture phase.

## Gate state

- SPEC/DISPOSITION: PASS for repository-addressable Package 10 scope
- BUILD: requires final branch-head CI confirmation after this status record
- AUTOMATED TEST: requires final branch-head CI confirmation after this status record
- BENCH: not applicable to the Package 10 changes above
- STATIC/INDEPENDENT REVIEW: deferred to the next review package/session
- MERGE: not performed here

Do not label Package 10 MERGE PASS until the independent review/merge gate is explicitly executed.
