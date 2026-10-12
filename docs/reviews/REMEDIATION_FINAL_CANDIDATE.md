# BREMSECU G1 REV-2 — Remediation Final Candidate

Status: FINAL REVIEW CANDIDATE — INDEPENDENT REVIEW NOT YET PASSED

This branch consolidates the accepted remediation sequence from Package 0 through Package 10 without adding a new functional package.

## Candidate base

- Source branch: `review/package-10-production-hardening-r10`
- Source commit: `dab385d2cd9a65799acc9c30298f97f032d50416`
- Relationship to `main` at candidate creation: remediation history is a direct descendant of the Package 0 `main` state; no reverse/side merge is required.

## Authority

Repository authority remains:

1. verified REV-2 schematic / approved hardware revision
2. `docs/authority/BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt`
3. verified bring-up findings that do not redefine schematic-derived mapping
4. `docs/engineering/`
5. firmware identity maps
6. TestEngine / services / API / PWA implementation
7. Figma handoff

Do not change hardware identity to make implementation or tests pass.

## Required final-candidate gates

Before merge or Faz 6 handoff, this exact branch head must pass:

- MASTER NET MAP consistency check
- ESP32 firmware build
- Package 1 interlock regression
- Package 3 measurement-conversion regression
- Package 4 calibration-payload regression
- Package 5 pin-domain regression
- Package 7 confirmation-lifecycle regression
- Package 8 load-safety regression
- Package 10 JSON-parser regression
- PWA manifest no-floating-version check
- clean locked PWA dependency install

The PWA application build is not required until Faz 6 application sources/build configuration exist. Package 10 must not fabricate a PWA application merely to create a green build.

## Accepted scope boundaries

The candidate must preserve these fail-closed boundaries:

- PENDING calibration/diagnostic values are not invented.
- PWA/API calls cannot directly drive arbitrary TPIC bits or relay state.
- safety confirmation is mode-bound, expiring and single-use.
- load tests remain fail-closed where production current authority is unavailable.
- cable classification remains limited to physically supported labels.
- SD reads are complete-or-fail; oversized reads are not silently truncated.
- malformed/ambiguous fixed-schema JSON input fails closed.

## Explicitly unresolved product/Faz 6 decisions

These are not remediation defects to be guessed during final review:

- AP credential/provisioning/recovery policy
- API authentication/session model
- transport-level request-size/timeout policy
- automatic persistence/journaling lifecycle
- schema migration/versioning contract
- WebSocket snapshot/resynchronization contract
- PWA presentation/localization/rendering architecture beyond the existing API/safety contract

## Independent review instruction

The next reviewer (Codex first) must review this exact branch as an adversarial reviewer, not as a feature implementer.

Review for:

- safety/interlock regressions
- state-machine/lifecycle defects
- fail-open behavior
- node-domain vs engineering-domain mistakes
- authority/document contradictions that could cause an implementation agent to do the wrong thing
- API/storage evidence corruption or semantic mismatch
- regression-test blind spots
- unsafe assumptions hidden as defaults/placeholders
- dependency/build reproducibility gaps

Every finding should identify a concrete file/location and explain the failure mode. Do not request redesign merely for style. Do not invent unresolved engineering or product-policy values.

## Merge rule

This file does not grant MERGE PASS. Merge remains blocked until:

1. final-candidate CI is green on the current head;
2. independent adversarial review is completed;
3. material findings are corrected and CI is rerun;
4. the final review disposition is recorded.
