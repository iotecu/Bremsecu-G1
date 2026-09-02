# Calibration — BREMSECU G1 REV-2

## Valid bench dataset
Calibration source set was re-captured from zero with MASTER_GND reference included.

Reference input points:
- 0V
- 3V
- 12V
- 18V
- 24V
- 30V

Older pre-MASTER_GND calibration captures are invalid for final coefficients and must not be used.

## Rules
- Calibrate by actual REV-2 channel behavior, not ideal divider math alone.
- Normal 24V channels, GND-sense channels, connector CAN channels and `_R` CAN channels are separate measurement families.
- GND channels retain their own reference behavior and are not treated as ordinary voltage-divider channels.
- Final per-channel or per-family coefficients must be frozen only after the valid dataset is numerically extracted and checked for linearity/error.

## Status
Dataset captured: PASS.
Coefficient table: PENDING numerical extraction/fit.
Ground two-reference thresholds: PENDING dedicated characterization.