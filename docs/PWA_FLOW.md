# Bremsecu G1 PWA Flow

## Core navigation

1. Connection / hotspot guidance
2. New vehicle / old record
3. Service record setup
4. Main diagnostic menu
5. Test screens
6. Save-to-report modal
7. Report review/output
8. Settings

## Connection state

- Normal operation uses the phone hotspot/shared network.
- Expected SSID: BREMSECU.
- PWA should infer connection readiness from device reachability rather than assuming it can control phone hotspot state.
- Connection UI states may include disconnected, connecting and connected.

## Service record setup

- Select technician.
- Enter/select customer.
- Select tractor and/or trailer independently.
- Enter available identifiers.
- If trailer is selected, choose connector profile:
  - ISO 12098 - 15 Pin
  - 24N + 24S - 2x7 Pin

## Test screen

- Show active measurement prominently.
- Show all relevant lines below.
- Only one controllable line may be active at any time.
- Automatically measurable criteria can receive automatic PASS/FAIL.
- Visual-only criteria remain technician-confirmed.
- Conditional auxiliary functions may be marked as not present/not testable and excluded.

## Leaving a test

If measurements exist and the current test has not been saved to the report, show a single modal with:

- optional technician note
- Save to Report and Exit
- Exit Without Saving
- Return to Test

If no measurement exists, leave without warning.

## Report behavior

- Only saved, actually measured PASS/FAIL results are included.
- Excluded auxiliary functions do not appear.
- Multiple saved executions of the same test may coexist for before/after repair history.
