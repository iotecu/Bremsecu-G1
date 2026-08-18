# Bremsecu G1 PWA Flow

## Core navigation

1. Connection / hotspot guidance
2. New vehicle / old record
3. Service record setup
4. Main diagnostic menu
5. Test selection carousel
6. Test measurement screens
7. Conditional / safety confirmations where required
8. Save-to-report modal when leaving with unsaved measured results
9. Report review/output
10. Settings

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

## Fixed-shell navigation

The PWA behaves as a fixed application shell.

Test selection:
- header remains fixed
- bottom navigation remains fixed
- only the center cards move horizontally

Measurement screens:
- header remains fixed
- test identity remains fixed
- active measurement card remains fixed
- bottom navigation remains fixed
- only the central measurement/pin list scrolls vertically

The final row must remain completely reachable above the bottom navigation.

## Measurement screen

- Show active measurement prominently.
- Show all relevant lines in the central scroll area.
- Each separately controllable/measurable line has its own row control where required by the hardware profile.
- Only one controllable line may be active at any time.
- Automatically measurable criteria can receive automatic PASS/FAIL.
- Visual-only/manual criteria remain technician-confirmed.
- Conditional auxiliary functions can be marked as not present and excluded instead of generating FAIL.

## ISO 12098 conditional PIN10 / PIN11 / PIN12 flow

These three rows require separate confirmation states.

When technician requests PIN10, PIN11 or PIN12 from its toggle:

1. do not begin that pin measurement immediately
2. open that pin's own confirmation modal
3. technician confirms whether the relevant vehicle/trailer function exists
4. present two outcomes

### FONKSIYON YOK

- close modal
- row remains inactive
- do not create FAIL
- exclude from customer-facing report

### ONAYLA VE BASLAT

- close modal
- corresponding toggle becomes active automatically
- begin the requested pin measurement
- no second toggle press is required

PIN12 confirmation also presents the operating-condition warning approved in Figma.

## Lamp-test axle-lift flow

Lamp-test axle lift intentionally uses a stronger two-step interaction than voltage-test PIN12.

1. technician presses axle-lift toggle for the first time
2. output remains OFF
3. dedicated safety confirmation opens
4. technician reads warning and confirms the required safe condition
5. UI returns to lamp-test screen
6. toggle is still OFF
7. technician presses the toggle a second time
8. only this second deliberate action requests axle-lift operation

Cancel or missing confirmation always returns/stays OFF.

## Leaving a test

If measurements exist and the current test has not been saved to the report, show a single modal with:

- optional technician note
- Save to Report and Exit
- Exit Without Saving
- Return to Test

If no measurement exists, leave without warning.

## Report behavior

- Only saved, actually measured PASS/FAIL results are included.
- Auxiliary functions explicitly marked `FONKSIYON YOK` do not appear as FAIL and do not enter the customer-facing report.
- Multiple saved executions of the same test may coexist for before/after repair history.

## Implementation handoff

Figma controls visual appearance and screen hierarchy. Markdown specifications control required behavior. When the two appear inconsistent, stop and resolve the inconsistency instead of inventing a third behavior.