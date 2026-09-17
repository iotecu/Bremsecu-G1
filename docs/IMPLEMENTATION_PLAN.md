# BREMSECU G1 REV-2 — Implementation Plan

This document turns the repository authority into an implementation sequence. Coding agents must follow the authority files under `docs/engineering/` and `docs/figma/` and must not invent unresolved engineering constants.

## Phase 1 — Core hardware services

Implement and bench-test in this order:

1. TPIC control
   - safe boot: OE disabled, shift 32 zeros, latch, enable
   - named bit access from `firmware/include/tpic_map.h`
   - atomic output-word updates
2. Safety interlocks
   - K2/K3/K4/K5 one-at-a-time rule
   - K1 3.3V/24V permission rules
   - safe reset/fault state
3. ADC/MUX service
   - ADS1115 scan through four CD4051 muxes
   - channel identity from `docs/engineering/adc-mux-map.md`
   - raw and converted values kept separate
4. Pulse monitor
   - right/left pulse inputs on verified GPIOs
5. INA226 service
   - bus/shunt/raw current support
   - do not freeze current limits until characterization is complete
6. RTC service
7. microSD service

## Phase 2 — Test engine

Implement a single test-state engine with explicit modes:

- ISO7638 voltage
- ISO12098 voltage
- ISO7638 cable
- ISO12098 cable
- ISO7638 CAN termination — tractor
- ISO7638 CAN termination — trailer
- ISO12098 CAN termination — tractor
- ISO12098 CAN termination — trailer
- ISO12098 lamp test
- axle lift

Cross Scan is REQUIRED in REV-2 but is embedded inside the two cable-test modes rather than implemented as a separate top-level mode or screen.

For each enabled cable-test pin:
- energize only that pin with 3.3V,
- perform its direct expected-return measurement,
- scan all other relevant channels in the same test step for unintended response/short-circuit evidence,
- store both direct continuity result and cross-scan evidence,
- release the pin before advancing.

The PWA per-row toggles determine which pins are included in this sequential measurement/cross-scan cycle.

Exact timing constants remain bench-tunable. The intended behavior is a fast direct read followed by a broader scan of the other channels before the next selected pin. Do not freeze production timing without measurement verification.

Each mode must define:
- required relay/output state
- allowed transitions
- input channels
- cancellation/reset behavior
- report payload
- unresolved classification rules as PENDING/TBD where authority is not frozen

## Phase 3 — Wi-Fi and API

- ESP32 runs AP+STA simultaneously.
- AP recovery endpoint remains reachable at `192.168.4.1`.
- STA address is DHCP-based and is displayed to the user when available.
- mDNS is optional convenience only.
- API validates requests before touching hardware.
- WebSocket publishes connection/test/channel/cross-scan state to the PWA.

## Phase 4 — Storage and reports

- configuration store
- technician/service metadata
- calibration storage in NVS
- service/test result persistence
- report composition and sharing contract

## Phase 5 — Firmware validation and closeout

Before the firmware side is considered closed for Faz 6/PWA handoff:

- preserve unresolved per-channel calibration coefficients as PENDING until bench authority exists
- preserve unresolved GND two-reference PASS/WARN/FAIL thresholds as PENDING until characterization exists
- keep INA226/current-threshold decisions fail-closed until real-load characterization is complete
- preserve unresolved CAN termination PASS/WARN/FAIL windows as PENDING until bench authority exists
- bench-verify direct-read and Cross Scan timing before freezing diagnosis-affecting timing values
- run regression tests for every relay/output safety invariant
- verify AP-only recovery and AP+STA user flows when the integrated product workflow is available
- complete remediation, full CI and independent adversarial review before declaring the firmware handoff sealed

Pending physical/product-authority items remain explicit; Phase 5 does not authorize invented constants merely to achieve closure.

## Phase 6 — PWA

Build the technician PWA from the repository authority/specification set after the firmware/remediation closeout gate has passed.

Build reusable components from `docs/figma/component-tree.md`, then implement screens from `docs/figma/screen-inventory.md` using the approved visual references.

PWA rules:
- firmware remains the authority for hardware state, sequencing and safety interlocks
- never implement hardware safety only in UI
- never invent a screen not in the approved flow
- cable-test row toggles control inclusion in the sequential direct-read + integrated Cross Scan process
- conditional Pin 10/11/12 and axle-lift safety confirmations must follow the approved modal flow
- termination safety confirmation must precede measurement flow
- API names, modes and safety semantics must follow `docs/API_CONTRACT.md`
- unresolved engineering/product-policy items must remain PENDING until explicitly frozen

## Definition of implementation-ready

The repository is implementation-ready when a coding agent can implement the software architecture without needing to guess hardware mapping, UI flow, safety rules, network topology or integrated Cross Scan behavior. Pending numerical thresholds remain intentionally unresolved until bench characterization is completed.
