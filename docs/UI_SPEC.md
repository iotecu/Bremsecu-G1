# Bremsecu G1 UI Specification

This file bridges approved Figma decisions to implementation. Figma is the visual source of truth; this document defines the implementation behavior that must accompany the visuals.

## Visual direction

- Dark industrial base theme.
- Bremsecu branding with lime/neon-green primary accent.
- High contrast, field-readable interface.
- Turkish characters must be rendered correctly.
- Persistent bottom navigation for back/home/tools-settings where applicable.
- Test modules preserve a common layout system and visual hierarchy.

## Fixed application shell

The PWA must behave as a fixed mobile application shell. The complete browser/body page must not vertically scroll during normal test use.

### Test selection screens

- Header remains fixed.
- Bottom navigation remains fixed.
- Only the center test cards move horizontally as a carousel / card selector.
- Changing test cards must not move the complete screen.

### Measurement screens

The following areas remain fixed:
- Bremsecu header / connection identity
- test / connector identity
- active measurement card
- bottom navigation

Only the central pin / measurement list scrolls vertically.

Implementation requirements:
- disable document/body vertical scrolling inside the application shell
- central measurement list owns vertical touch scrolling
- provide enough bottom padding so the final row is never hidden under bottom navigation
- toggle interaction must not accidentally trigger scroll or neighboring controls
- layout must remain usable on smaller supported phone screens

## Measurement screen pattern

Header area:
- Bremsecu brand/header
- connector/test identity
- connection/status information where applicable

Active measurement card:
- active pin number
- line/function name
- measured value
- result/status
- expected value or interpretation where applicable

All-lines list:
- pin
- status indicator
- function name
- measured value / measurement type
- individual row control/toggle where applicable

Result states:
- green check = confirmed nominal / PASS
- red X = confirmed fault / FAIL
- neutral state = not yet measured / pending / conditional

Turn-signal voltage rows must display and evaluate pulse behavior together with measured voltage when that test requires both.

## Output control rule

- Only one controllable line may be active at a time.
- Selecting another controllable line requires the previous line to be OFF before the next line becomes active.
- Frontend state must reflect the real firmware state and may not pretend an output is active before firmware confirmation.
- Firmware safety enforcement is defined separately in `SAFETY_RULES.md`.

## ISO 12098 conditional PIN10-PIN12 confirmation

PIN10, PIN11 and PIN12 are conditional functions and must not be treated as ordinary automatic FAIL rows merely because no function is present.

Each pin has its own confirmation modal. The modal opens when the technician first requests that pin from its toggle.

### PIN10

Modal identity: `PIN10 - BALATA ASINMA DOGRULAMASI`

Purpose:
- technician confirms that the vehicle/trailer actually has the related balata-asınma function before measurement

### PIN11

Modal identity: `PIN11 - FREN SISTEMI DOGRULAMASI`

Purpose:
- technician confirms that the vehicle/trailer actually uses the relevant PIN11 brake-system-related function before measurement
- the UI must not guess a more specific vehicle function when it has not been confirmed

### PIN12

Modal identity: `PIN12 - DINGIL KALDIRMA DOGRULAMASI`

Purpose:
- technician confirms that the vehicle/trailer has axle-lift functionality
- technician must also confirm that the required operating conditions shown by the UI are appropriate before starting

### Conditional modal actions - Option A

Two primary outcomes are required:

`FONKSIYON YOK`
- close modal
- keep row inactive
- do not generate FAIL
- exclude the row from the customer-facing report

`ONAYLA VE BASLAT`
- close modal
- automatically activate the corresponding pin toggle
- start that pin's measurement request
- no second toggle press is required for this voltage-test conditional flow

PIN10, PIN11 and PIN12 must use separate modal states, even if they share one reusable modal component in code.

## Lamp test

The ISO 12098 lamp-test selection card must visibly indicate that axle-lift testing is also available, while keeping `ISO 12098 LAMBA TEST` as the primary visual identity.

Lamp-test measurement rows must support:
- left indicator BLINK
- right indicator BLINK
- left indicator steady
- right indicator steady
- rear fog
- left park
- right park
- reverse
- stop lamp
- axle lift as a visually separated final row

Rows display their current measurement/result state and current in mA where applicable.

### Lamp-test axle-lift safety flow

This is intentionally different from the voltage-test PIN12 Option A flow.

For the lamp-test axle-lift control:
1. first toggle request must NOT activate the output
2. show the dedicated axle-lift safety confirmation UI
3. technician reads the warning and confirms the required safe operating condition
4. after confirmation, return to the lamp-test screen
5. axle-lift toggle remains OFF
6. technician must press the toggle a second time to deliberately start the operation
7. cancel / failed confirmation leaves the toggle OFF

This two-step armed interaction exists only where explicitly specified; it must not be silently generalized to the voltage-test PIN12 modal.

## Save-to-report modal

When measured results exist and the user leaves without saving, use one modal containing:
- unsaved-results warning
- optional technician note field
- Save to Report and Exit
- Exit Without Saving
- Return to Test

If no measurement exists, leaving the test does not require this warning.

## Trailer connector profile

Registration UI must clearly present:
- ISO 12098 - 15 Pin
- 24N + 24S - 2x7 Pin

Use clear connector imagery/icons when available.

When 2x7 profile is active:
- preserve the same general measurement-screen layout
- change relevant pin labels/mapping according to the verified profile
- unsupported rows may remain visible but disabled when required by product rules
- do not invent mapping for unverified adapter connections

## Figma implementation principle

Figma is the visual/interaction source of truth.

Implementation agents must:
- reproduce the approved layout rather than redesigning it
- use exported production assets rather than temporary Figma MCP asset URLs
- build screens as real PWA components, not screenshots
- preserve spacing, typography, borders, radii, icon placement and hierarchy as closely as practical
- compare implementation screenshots against Figma references during review

Repeated UI must be converted into reusable components/variants before implementation handoff.