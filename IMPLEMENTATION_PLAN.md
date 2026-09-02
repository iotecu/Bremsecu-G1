# BREMSECU G1 REV-2 — Implementation Plan

Status: ACTIVE implementation roadmap.

## Authority order
1. `docs/ARCHITECTURE.md`
2. `docs/engineering/`
3. `docs/figma/`
4. This implementation plan
5. Firmware/PWA code

If code conflicts with engineering or visual authority, code must be corrected.

## Phase 1 — Firmware foundation
- Freeze verified GPIO definitions from `docs/engineering/gpio-net-map.md`.
- Implement TPIC safe boot and output driver using the verified bit map.
- Implement safety interlocks before exposing actuator/test commands.
- Implement ADS1115 + CD4051 scan service.
- Implement RTC, SD and INA226 services.
- Implement AP+STA Wi-Fi and fixed AP recovery path `192.168.4.1`.

## Phase 2 — Diagnostic engine
- Implement ISO 7638 voltage test.
- Implement ISO 12098 voltage test.
- Implement 3.3V cable tests.
- Implement ISO 12098 lamp/current test.
- Implement axle-lift test with safety confirmation.
- Implement CAN termination flow with one-relay-only interlock.
- Preserve PENDING thresholds/coefficient items as unresolved/configurable; do not invent production values.

## Phase 3 — API / state transport
- Implement API contract in `docs/API_CONTRACT.md`.
- Implement WebSocket live-state transport.
- PWA may request test actions but firmware remains final authority for hardware safety.

## Phase 4 — PWA
- Implement entry flow first.
- Implement the seven-card main module carousel exactly as documented in `docs/figma/component-tree.md`.
- Implement live-test, modal, report and settings screens from approved PNG/Figma authority.
- Implement all 14 languages via `docs/figma/i18n.md`.

## Phase 5 — Persistence and reports
- Implement service/vehicle records.
- Persist settings, technician/service metadata and completed test results.
- Generate final report data from frozen test results.
- Store records on SD through firmware-controlled storage APIs.

## Phase 6 — Verification
- Build firmware under PlatformIO.
- Build PWA.
- Verify safe boot and invalid-command rejection.
- Verify AP-only and AP+STA access.
- Verify carousel order and swipe/arrow behavior.
- Verify all 14 language selectors and RTL behavior for Arabic/Persian.
- Verify no Cross Scan implementation exists.

## Stop conditions
Implementation must stop and request an authority update rather than guess when work requires:
- final calibration coefficients,
- final GND diagnostic thresholds,
- final INA226 current thresholds,
- final CAN termination classification windows,
- other values explicitly marked PENDING in `docs/engineering/status-register.md`.
