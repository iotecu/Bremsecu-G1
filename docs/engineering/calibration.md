# Calibration — BREMSECU G1 REV-2

## Valid bench dataset
Calibration source set was re-captured from zero with MASTER_GND physically connected for every reference point.

Reference input points:
- 0V
- 3.3V
- 12V
- 18V
- 24V
- 30V

Older pre-MASTER_GND calibration captures are invalid for final coefficients and must not be used.

## Rules
- Calibrate by actual REV-2 channel behavior, not ideal divider math alone.
- Normal 24V channels, GND-sense channels, connector CAN channels and `_R` CAN channels are separate measurement families.
- GND channels retain their own reference behavior and are not treated as ordinary voltage-divider channels.
- Final conversion must follow the measured channel behavior. The captured 0/3.3/12/18/24/30 V data shows material non-linearity above ~12 V, so a single global linear coefficient is not authoritative for the active REV-2 unit. Channel-specific six-point piecewise interpolation is the current bench conversion authority for VEHICLE_DIVIDED and CONNECTOR_CAN channels.

## Status
Dataset captured: PASS.

MASTER_GND condition: physically connected for all captured points.

VEHICLE_DIVIDED conversion: six-point per-channel bench interpolation frozen from the active REV-2 capture.

CONNECTOR_CAN conversion: six-point per-channel bench interpolation frozen from the active REV-2 capture.

GND_SENSE: the captured ~1.01 V behavior is a known-good MASTER_GND reference signature only. It is not treated as a 0..30 V transfer curve and does not yet authorize final GND PASS/FAIL thresholds.

Ground natural-vs-assisted thresholds: PENDING dedicated characterization.

CAN resistance (_R) calibration: PENDING dedicated de-energized characterization.