# Safety Interlocks — BREMSECU G1 REV-2

Status: AUTHORITY for firmware implementation.

These rules must be enforced in firmware. The PWA may request an action, but it must never be able to bypass a hardware interlock.

## Safe boot / reset

1. Hold TPIC OE disabled.
2. Shift a 32-bit zero word through the complete TPIC chain.
3. Latch the zero word.
4. Only then enable TPIC outputs.
5. On reset, watchdog, fatal error or invalid state, return outputs to the same safe state.

## K1 — test-voltage selection

- K1 OFF = 3.3V safe test source.
- K1 ON = 24V load source.
- Cable tests are 3.3V only.
- 24V is permitted only for intended load tests: left signal, right signal, rear fog, left park, right park, stop lamp, reverse lamp and axle lift.
- Firmware must never infer 24V permission from UI artwork alone.

## CAN selection relays

- K2 = ISO7638 tractor / CK.
- K3 = ISO12098 tractor / CK.
- K4 = ISO7638 trailer / DR.
- K5 = ISO12098 trailer / DR.
- At most one of K2/K3/K4/K5 may be energized at any time.
- A request that would energize a second CAN relay must be rejected before changing outputs.
- Switching between CAN paths must pass through an all-CAN-relays-OFF state.

## K6 — MASTER_GND

- Normal voltage scans use K6 energized.
- Ground-channel validation is a controlled two-reading sequence: read with K6 ON, release K6, read the same ground channel again, then restore K6.
- The second reading is diagnostic information; final thresholds remain TBD until bench/vehicle characterization is frozen.
- K6 state transitions must not be mixed with unrelated output switching in the same uncontrolled action.

## Lamp / axle-lift operation

- Only one controllable load output should be active at a time unless a later frozen specification explicitly authorizes a combination.
- 24V output must be explicit, test-mode constrained and time-bounded.
- Current sensing through INA226 is part of load-test validation; final current thresholds are not frozen yet.

## CAN termination test

- Termination measurement requires the external circuit to be de-energized.
- The UI safety confirmation is necessary for workflow, but firmware must still maintain the one-CAN-relay rule and safe output state.
- Final PASS/WARN/FAIL resistance windows are TBD and must not be invented by an implementation agent.

## Unknown-value rule

Where this repository marks a threshold, coefficient, timeout or tolerance as TBD/PENDING, code must expose it as unresolved/configurable or block final classification. It must not silently substitute a guessed engineering value.
