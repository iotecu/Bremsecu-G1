# Relay Logic and Interlocks — BREMSECU G1 REV-2

## K1 SELECT_V
- OFF = 3.3V
- ON = 24V
- 24V is used for the seven lamp outputs plus axle-lift/load operation.
- Cable test remains 3.3V only.

## CAN relays
- K2 = ISO7638 tractor/CK
- K3 = ISO12098 tractor/CK
- K4 = ISO7638 trailer/DR
- K5 = ISO12098 trailer/DR
- Only one of K2/K3/K4/K5 may be energized at a time.

## K6 MASTER_GND
K6 provides the controlled MASTER_GND reference path.

Voltage testing uses phase-based switching:
1. K6 ON for three complete socket reference sweeps.
2. K6 OFF once after the reference phase.
3. All socket ground channels are then sampled three times while K6 remains OFF.
4. The test ends with all outputs, including K6, OFF.

K6 must not be released and restored separately for each ground channel. Ground-pin diagnosis compares each pin's stored K6-ON reference evidence with its K6-OFF evidence.

Final stability criteria and PASS/WARN/FAIL thresholds for the two-reference ground diagnostic must come from bench characterization, not assumption.

## Safety invariants
- Unsafe relay combinations must be rejected in firmware even if requested by the PWA.
- Any reset/fault path must return physical outputs to a safe state.
- 24V output activation must be explicit and test-mode constrained.