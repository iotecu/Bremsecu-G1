# Bremsecu G1 Product Rules

This document is the authoritative high-level product behavior reference for Bremsecu G1. It is intentionally written before implementation so PWA, firmware, Figma and coding agents follow the same rules.

## 1. General principle

Bremsecu G1 is a guided field diagnostic platform. It should standardize measurements, avoid ambiguous PASS/FAIL decisions, preserve technician control where visual confirmation is required, and keep safety-critical rules enforced in firmware.

## 2. Measurement screen behavior

- Each measurement row has an independent control in the UI.
- Only one controllable output/test line may be active at a time.
- When the technician activates a new line, the currently active line must be turned OFF first.
- After the previous line is safely OFF, the newly selected line may be turned ON.
- The same single-active-output rule must be enforced in both the PWA and the ESP firmware.
- Pressing the currently active toggle again may leave all lines OFF.
- Automatically measurable criteria may receive automatic PASS/FAIL status.
- Visual-only checks must remain technician-confirmed.

## 3. Report-save behavior

- Test results are not automatically committed to the service report merely because a test screen was opened.
- If a technician attempts to leave a test screen after measurements were performed but before saving, show one modal.
- The modal contains an optional technician note field and the actions:
  - Save to Report and Exit
  - Exit Without Saving
  - Return to Test
- Note entry and save action must remain in the same modal.
- Exiting without saving discards that test session from the report.
- Every saved execution is stored as a separate test result instance, allowing before/after repair comparisons.
- If no measurement was performed, leaving the screen should not trigger the unsaved-results warning.
- Only tests that were actually measured and received a PASS/FAIL decision should appear in the final report.

## 4. Conditional ISO 12098 PIN10-PIN12 behavior

PIN10, PIN11 and PIN12 are conditional auxiliary functions and must not be treated like ordinary mandatory PASS/FAIL lines.

- Before testing these lines, the technician indicates whether the corresponding function exists/is testable on that vehicle.
- If the function does not exist, that line is excluded from the test session and does not appear in the final report.
- If the function exists and can be activated, the line may be measured and evaluated.
- Lack of signal alone must not automatically produce FAIL when activation cannot be confirmed.
- Raw measured voltage/signal may still be displayed to the technician.

Working functional labels for the 15-pin profile:
- PIN10: Balata Asinma
- PIN11: Fren Sistemi
- PIN12: Dingil Kaldirma

## 5. Trailer connector profile selection

Trailer registration must include connector type selection:

- ISO 12098 - 15 Pin
- 24N + 24S - 2x7 Pin

The selected connector profile is stored with the trailer/service record and reused when an existing trailer record is opened.

For the 2x7 profile:
- Keep the same measurement screen structure and function names where possible.
- Use the correct 24N/24S pin numbering/mapping.
- PIN13, PIN14 and PIN15 rows on the 15-pin-style screen remain visible but disabled/inactive when the selected adapter/profile does not carry those functions.
- Disabled rows cannot be toggled or measured.

## 6. Vehicle/service registration model

The service record is the primary record, not a single plate number.

- Customer/company name is required.
- Technician selection is required.
- Tractor and trailer may be selected independently.
- Tractor plate is optional when tractor is not part of the service.
- Trailer plate is optional because some trailers may not have a plate.
- Chassis number is optional.
- Fleet/trailer internal number may be optional.
- For a selected vehicle, at least one usable identifier should be available when practical: plate, chassis number or fleet/internal number.
- Old records should be searchable by customer, tractor plate, trailer plate, chassis number or fleet/internal number.

## 7. Reporting principle

The report should represent confirmed diagnostic work, not every UI interaction.

- Saved PASS/FAIL measurements are reportable.
- Excluded/N/A auxiliary functions should not clutter the final customer-facing report.
- Technician notes are optional.
- Service/company identity and branding are included in report generation.

## 8. Safety boundary

- PWA UX rules must never replace firmware safety rules.
- Safety-critical interlocks remain mandatory even in service/master modes.
- The firmware must reject unsafe state combinations even if the frontend sends an incorrect command.
