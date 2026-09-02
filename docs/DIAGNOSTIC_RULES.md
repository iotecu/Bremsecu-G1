# BREMSECU G1 — Diagnostic Rules

Status: DIAGNOSTIC AUTHORITY. This file defines classification behavior at a policy level. Exact numeric limits remain governed by engineering status.

## General rule
A diagnostic result may be marked final only when the required engineering threshold/logic is frozen. Otherwise the measurement may be displayed and stored, but final PASS/WARN/FAIL classification must remain unresolved.

## Voltage tests
- Use the actual channel identity and measurement family from `docs/engineering/adc-mux-map.md` and `measurement-methods.md`.
- Apply frozen measured calibration when available.
- Do not use ideal divider math as a substitute for frozen calibration where measured coefficients exist.
- Pulse-driven channels must not be classified as ordinary static DC channels.

## Ground channels
- Ground diagnosis uses the K6 two-reading sequence.
- The pair of K6-ON/K6-OFF readings is the diagnostic evidence.
- Final ground thresholds are PENDING and must not be guessed.

## Cable tests
- Test source is 3.3V only.
- K1 must remain OFF.
- Only the intended test output/channel is driven per step.
- Expected return channel is determined by the frozen hardware/channel map.
- Open/miswire classification must be based on measured return behavior and frozen mapping.
- 24V cable testing is prohibited.

### Integrated Cross Scan — REQUIRED REV-2 behavior
Cross Scan is not a separate top-level test mode or separate PWA screen. It is an embedded diagnostic phase inside each selected cable-test pin measurement.

For every enabled cable-test row/pin:
1. Energize only the selected pin with the approved 3.3V source.
2. Measure the expected return channel for continuity/open evaluation.
3. While that pin remains the active test pin, scan all other relevant channels for unintended voltage/response.
4. Any unexpected response on another channel is recorded as cross-coupling / short-circuit / miswire evidence.
5. Release the selected output before advancing to the next enabled pin.

The per-row toggle in the PWA determines whether that pin participates in this sequential cable test.

Timing is implementation-sensitive and must be tuned on bench. The intended architecture is a short direct measurement window for the selected pin plus a longer scan window across the remaining channels in the same test step (for example, on the order of tens of milliseconds for the direct read and a few hundred milliseconds for the cross-scan). Exact production timing constants must not be frozen without bench verification.

## Lamp / axle-lift tests
- K1 ON selects the 24V load source only for approved load functions.
- Approved functions: left signal, right signal, rear fog, left park, right park, stop lamp, reverse lamp, axle lift.
- Current measurement is validated through INA226.
- Final current thresholds are PENDING real-load characterization.
- Axle lift additionally requires the approved safety confirmation workflow.

## CAN termination
- External circuit must be de-energized.
- Only one of K2/K3/K4/K5 may be active at a time.
- Connector and vehicle side determine which relay is selected.
- Measurement is CAN H ↔ CAN L on the selected termination path.
- Final PASS/WARN/FAIL resistance windows are PENDING and must not be invented.

## Conditional ISO12098 functions
- Pin 10, Pin 11 and Pin 12 may be conditional by vehicle/function presence.
- Workflow must explicitly record function-present or function-not-present state before starting the applicable measurement.
- `function_not_present` is not equivalent to a failed electrical test.

## Status vocabulary
Recommended result states:
- `pending`
- `measuring`
- `ok`
- `warning`
- `fail`
- `function_not_present`
- `blocked_by_safety`
- `engineering_pending`

## Evidence rule
Where practical, store raw values and interpreted values together. Final report logic must preserve the evidence behind the displayed result.
