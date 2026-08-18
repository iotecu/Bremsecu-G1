# Bremsecu G1 Firmware

This directory will contain ESP32 firmware and firmware-side test logic.

Firmware development must proceed in isolated bring-up stages. Do not start by enabling every relay/output.

## Authoritative inputs

Before implementing a hardware function, use the verified project documents:
- `docs/PIN_MAP.md`
- `docs/SAFETY_RULES.md`
- `docs/PRODUCT_RULES.md`
- the finalized total net map when committed

Do not infer PCB nets from UI labels.

## Staged bring-up plan

### Stage 0 - Firmware skeleton

Create only the platform foundation:
- build configuration
- board/config constants
- logging
- error/status model
- Wi-Fi/PWA communication boundary
- no physical test outputs energized

### Stage 1 - ADC / voltage measurement only

First hardware bring-up must exercise only the voltage-divider/ADC measurement path.

Rules:
- no relay energization
- no TPIC-driven outputs enabled
- no vehicle/battery connection during first bench validation
- use a current-limited bench source for initial checks
- expose pin-by-pin raw and converted voltage readings to the local PWA/debug endpoint

This stage must be proven before output-driver testing begins.

### Stage 2 - TPIC output-driver isolated test

After ADC validation:
- verify TPIC daisy-chain communication
- verify shift/latch behavior
- test one mapped output at a time
- default all outputs OFF after boot/reset/error
- confirm software mapping against the authoritative total net map

Do not combine this stage with vehicle tests.

### Stage 3 - Relay-control isolated test

Only after TPIC/output mapping is confirmed:
- test relay controls individually
- verify commanded state versus observed electrical state where possible
- preserve safe OFF defaults
- do not yet run full automatic diagnostic sequences

### Stage 4 - Input / pulse / CAN measurement functions

Add and validate independently:
- pulse inputs
- CAN presence/measurement functions
- termination-measurement path
- required electrical interlocks

CAN termination relay control must obey `docs/SAFETY_RULES.md` before any relay movement.

### Stage 5 - Test orchestration

Only after individual circuits are validated, implement complete test flows:
- ISO 7638 voltage test
- ISO 7638 cable test
- ISO 12098 voltage test
- ISO 12098 cable test
- lamp/current test
- CAN termination test

Firmware remains the final authority for physical output safety. PWA requests are commands to validate, not unconditional instructions to energize hardware.

## Core firmware invariants

- boot state = all controllable outputs OFF
- reset/error/disconnect must not create an ON output
- only one mutually exclusive controllable test output active where specified
- changing outputs requires the previous output to be OFF first
- malformed/stale frontend requests must be rejectable
- service/master authorization never bypasses safety interlocks
- UI confirmation is not a substitute for electrical safety enforcement

## Next firmware documentation

Create these gradually as hardware bring-up progresses:
- `firmware/ARCHITECTURE.md`
- `firmware/NET_MAPPING.md` generated from the verified total net map
- `firmware/ADC_MEASUREMENT.md`
- `firmware/TPIC_DRIVER.md`
- `firmware/RELAY_CONTROL.md`
- `firmware/CAN_TESTS.md`
- `firmware/PROTOCOL.md` for PWA <-> ESP communication
- `firmware/STATE_MACHINE.md`
- `tests/BRINGUP_CHECKLIST.md`

Each document should be finalized only when its hardware assumptions have been checked against the board/net map.