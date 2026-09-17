# Bremsecu G1 PWA — Final Page Tree

Status: APPROVED handoff structure before PWA implementation.

This document defines the screen hierarchy only. Exact button/back/home/carousel behavior will be defined separately in the navigation rules. The approved visual references are the 40 PNG files in `docs/figma/screens/`.

## 1. Entry

- `01-login.png` — Login / first contact / hotspot
- `02-vehicle-entry.png` — Vehicle / test entry
  - `03-new-vehicle-form.png` — New vehicle record
  - `04-old-record-search.png` — Existing record search

## 2. Test selection and measurement

### ISO 7638 voltage

- `05-iso7638-voltage-select.png`
  - `06-iso7638-voltage-measurement.png`

### ISO 12098 voltage

- `07-iso12098-voltage-select.png`
  - `08-iso12098-voltage-measurement.png`
  - conditional validation states:
    - `09-iso12098-pin10-validation.png`
    - `10-iso12098-pin11-validation.png`
    - `11-iso12098-pin12-validation.png`

### Cable test

- `12-cable-test-select.png`
  - ISO 7638:
    - `13-iso7638-cable-select.png`
    - `14-iso7638-cable-measurement.png`
  - ISO 12098:
    - `15-iso12098-cable-select.png`
    - `16-iso12098-cable-measurement.png`

Cross Scan is part of the cable-test measurement flow. It is not a separate screen.

### CANBUS termination

- `17-can-termination-select.png`
  - `18-iso7638-can-tractor-select.png`
    - `22-iso7638-can-tractor-safety.png`
    - `23-iso7638-can-tractor-resistance.png`
  - `19-iso7638-can-trailer-select.png`
    - `24-iso7638-can-trailer-safety.png`
    - `25-iso7638-can-trailer-resistance.png`
  - `20-iso12098-can-tractor-select.png`
    - `26-iso12098-can-tractor-safety.png`
    - `27-iso12098-can-tractor-resistance.png`
  - `21-iso12098-can-trailer-select.png`
    - `28-iso12098-can-trailer-safety.png`
    - `29-iso12098-can-trailer-resistance.png`

The four CANBUS selector screens are the nested CANBUS sub-selector set.

### ISO 12098 lamp / axle-lift

- `30-lamp-test-select.png`
  - `31-lamp-test-measurement.png`
  - `32-axle-lift-safety.png` — axle-lift safety confirmation when required

## 3. Reports

- `33-reports.png`
  - `34-report-result.png`
  - `35-report-save-modal.png`
  - `36-report-save-common-modal.png`
  - `40-old-record-search-alt.png` — record search entry used from report flow

## 4. Settings and battery

- `37-settings.png`
  - `38-settings-detail.png`
- `39-battery-status.png`

## Structural rules already agreed

- Header and bottom navigation are fixed.
- The red content area is the carousel area on selection/navigation screens.
- CANBUS Termination has four nested sub-selector pages.
- Main carousel state and CANBUS sub-carousel state are independent.
- A swipe inside the nested CANBUS selector must not move the parent carousel.
- Measurement/result screens do not use slider/swipe navigation.
- No extra screens are to be invented during implementation.
- Figma arrows remain the authority for exact screen-to-screen direction until the dedicated navigation rules document is added.

## Visual authority

- Final screenshots: `docs/figma/screens/`
- Final implementation assets: `docs/figma/assets/replit/`
- Figma is a secondary detail reference when the Git screenshot/asset set does not resolve a visual detail.
