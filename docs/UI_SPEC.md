# Bremsecu G1 UI Specification

This file bridges Figma design decisions to implementation.

## Visual direction

- Dark industrial base theme.
- Bremsecu branding with lime/neon-green primary accent.
- High contrast, field-readable interface.
- Persistent bottom navigation for back/home/tools-settings where applicable.
- Test modules may use distinct category accent strips while preserving a common layout system.

## Measurement screen pattern

Header area:
- Bremsecu brand/header
- connector/test identity
- test active state

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
- expected/reference information
- measured value
- row control/toggle where applicable

Control rule:
- only one line active at a time
- selecting another line turns the previous one off first

Conditional PIN10-PIN12:
- allow explicit 'function not present / not testable' state
- excluded rows must not generate FAIL
- excluded rows do not enter customer-facing report

## Save-to-report modal

Single modal only:
- unsaved-results warning
- optional technician note field
- Save to Report and Exit
- Exit Without Saving
- Return to Test

## Trailer connector profile

Registration UI must clearly present:
- ISO 12098 - 15 Pin
- 24N + 24S - 2x7 Pin

Use clear connector imagery/icons when available.

When 2x7 profile is active:
- same general measurement screen layout
- relevant pin labels/mapping change according to profile
- inactive unsupported rows stay visible but disabled when required by product rules

## Figma implementation principle

Figma is the visual/interaction source of truth. Repeated UI must be converted into reusable components/variants before implementation handoff.
