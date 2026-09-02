# Measurement Methods — BREMSECU G1 REV-2

Status: AUTHORITY for measurement sequencing.

## Analog scan architecture

The measurement path uses ADS1115 plus four CD4051 multiplexers. Channel identity and mux coordinates are defined in `adc-mux-map.md` and must be treated as authoritative.

## Measurement families

Channels are not one homogeneous electrical class. Firmware must preserve these families:

1. Normal voltage-divider channels
2. GND-sense channels
3. Direct connector CAN channels (`7P_CAN_H/L`, `15P_CAN_H/L`)
4. CAN resistance/relay-path channels with `_R` suffix

Calibration, filtering and classification may differ by family.

## Normal voltage scan

- MASTER_GND K6 is normally energized.
- Select mux address.
- Allow analog path to settle before ADS1115 conversion.
- Read the selected channel.
- Apply the frozen channel/family calibration when available.
- Do not classify using ideal divider math if a measured calibration coefficient exists.

## Ground validation

Ground channels are validated using two reference states:

1. K6 ON: capture the normal referenced measurement.
2. K6 OFF: capture the same ground channel again.
3. Restore K6 before continuing the scan.

The two readings together form the diagnostic signal. Final thresholds are still PENDING and must not be guessed.

## Cable test

- Cable continuity test source is 3.3V only.
- K1 remains OFF.
- Drive only the intended output/channel for the current test step.
- Read the expected return channel and identify open/miswire behavior from the frozen channel map.
- 24V cable test is prohibited in the current architecture.

## Lamp and axle-lift test

- K1 ON selects the 24V load source.
- Permitted load outputs are defined in `safety-interlocks.md`.
- Drive one intended load output at a time unless a later frozen test specification explicitly allows a combination.
- INA226 provides bus/current information for validation.
- Final current PASS/WARN/FAIL thresholds remain PENDING real-load characterization.

## Pulse channels

- Right signal pulse input: GPIO36 (`SAG_PULS`).
- Left signal pulse input: GPIO39 (`SOL_PULS`).
- Pulse detection must be treated separately from DC voltage classification.

## CAN termination measurement

- External circuit must be de-energized before measurement.
- Select exactly one of K2/K3/K4/K5 according to connector and vehicle side.
- Never compare direct CAN voltage channels with `_R` channels as if they were the same circuit family.
- Direct CAN voltage comparison is connector-to-connector by matching H with H and L with L.
- Final resistance tolerance windows are PENDING and must not be invented.

## Filtering rule

Any averaging, median filtering, debounce or settling delay introduced by firmware must be documented and must not mask intermittent faults. Until frozen by bench data, such parameters should remain explicit constants with conservative defaults and clear status.
