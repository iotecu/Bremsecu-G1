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

There is no standalone Cross Scan mode.

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
- WebSocket publishes connection/test/channel state to the PWA.

## Phase 4 — Storage and reports

- configuration store
- technician/service metadata
- calibration storage in NVS
- service/test result persistence
- report composition and sharing contract

## Phase 5 — PWA

Build reusable components from `docs/figma/component-tree.md`, then implement screens from `docs/figma/screen-inventory.md` using the approved PNGs as visual references.

PWA rules:
- never implement hardware safety only in UI
- never invent a screen not in the approved flow
- conditional Pin 10/11/12 and axle-lift safety confirmations must follow the approved modal flow
- termination safety confirmation must precede measurement flow

## Phase 6 — Validation

Before production classification:

- freeze per-channel calibration coefficients from the valid 0/3/12/18/24/30V dataset
- characterize GND two-reference thresholds
- calibrate INA226/current thresholds under real loads
- freeze CAN termination PASS/WARN/FAIL windows
- run regression tests for every relay/output safety invariant
- verify AP-only recovery and AP+STA user flows

## Definition of implementation-ready

The repository is implementation-ready when a coding agent can implement the software architecture without needing to guess hardware mapping, UI flow, safety rules, or network topology. Pending numerical thresholds remain intentionally unresolved until bench characterization is completed.
