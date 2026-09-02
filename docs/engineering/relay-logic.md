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
K6 provides the controlled measurement reference path. During normal scan the measurement is taken with MASTER_GND connected. Ground channels require a second validation reading after K6 is released, then K6 is restored before continuing.

Final PASS/WARN/FAIL thresholds for the two-reference ground diagnostic must come from bench characterization, not assumption.

## Safety invariants
- Unsafe relay combinations must be rejected in firmware even if requested by the PWA.
- Any reset/fault path must return physical outputs to a safe state.
- 24V output activation must be explicit and test-mode constrained.