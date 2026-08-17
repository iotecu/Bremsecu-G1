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
- auxiliary functions marked as not present/not testable
- UI-only interaction states

## Multiple executions

Repeated tests are stored as separate result instances. This supports before/after repair evidence without overwriting earlier saved measurements.

## Save interaction

If measured results are unsaved when leaving a test, use one modal containing the optional note field and save/exit choices. Notes are never a separate mandatory save step.
