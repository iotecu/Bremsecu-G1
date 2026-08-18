# Bremsecu G1 Report Rules

## Purpose

Reports must represent confirmed diagnostic work performed during a service record.

## Included data

- customer/company
- technician
- available tractor/trailer identifiers
- test name and timestamp
- saved measurement results
- PASS/FAIL decisions
- optional technician note
- service/company identity and branding

## Excluded data

- test screens that were opened but not measured
- test sessions explicitly exited without saving
- auxiliary functions marked as `FONKSIYON YOK` / not present / not testable
- UI-only interaction states
- confirmation-modal choices that did not lead to an actual measurement

## Conditional PIN10-PIN12

For ISO 12098 conditional functions:

- absence of a confirmed vehicle function must not be represented as FAIL
- `FONKSIYON YOK` excludes that row from the customer-facing test result
- `ONAYLA VE BASLAT` only makes the pin eligible for normal measurement/result handling; the report still uses the actual saved measurement result
- PIN10, PIN11 and PIN12 remain individually traceable when they are actually measured

## Multiple executions

Repeated tests are stored as separate result instances. This supports before/after repair evidence without overwriting earlier saved measurements.

## Save interaction

If measured results are unsaved when leaving a test, use one modal containing the optional note field and save/exit choices. Notes are never a separate mandatory save step.

A screen visit or a safety/conditional confirmation alone does not count as a measured test instance.