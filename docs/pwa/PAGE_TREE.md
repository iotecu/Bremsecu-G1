# Bremsecu G1 PWA — Final Page Tree

Status: FINAL handoff structure before PWA implementation.
Source authority: approved Figma flow and the final 40 screenshots in `docs/figma/screens/`.

This file defines the page hierarchy and route/state relationships only. Exact visual implementation comes from the screenshots and assets. Exact navigation behavior is defined separately in the navigation rules.

## 1. Entry and service record

- `01-login.png` — Login / first contact / hotspot
  - opens `02-vehicle-entry.png`

- `02-vehicle-entry.png` — Vehicle record / old record / test entry
  - `03-new-vehicle-form.png` — create new vehicle/service record
  - `04-old-record-search.png` — old record search, entry context
  - with an active service record, enter the Test Carousel

- `03-new-vehicle-form.png`
  - after record creation, enter the Test Carousel

## 2. Main Test Carousel — one route

The following eight cards are NOT eight independent routes. They are states of one Test Carousel controlled by `activeCardIndex`.

1. `05-iso7638-voltage-select.png` — ISO 7638 Voltage Test
2. `07-iso12098-voltage-select.png` — ISO 12098 Voltage Test
3. `12-cable-test-select.png` — Cable Test
4. `17-can-termination-select.png` — CAN Bus Termination Test
5. `30-lamp-test-select.png` — ISO 12098 Lamp Test / Axle Lift
6. `33-reports.png` — Reports
7. `37-settings.png` — Settings
8. `39-battery-status.png` — Battery Status

Battery Status comes after Settings and remains directly accessible from the main carousel.

## 3. ISO 7638 voltage flow

- `05-iso7638-voltage-select.png`
  - physical connector guidance: ①
  - opens `06-iso7638-voltage-measurement.png`

- `06-iso7638-voltage-measurement.png`
  - Battery
  - Ignition
  - ABS/EBS
  - CAN H / CAN L DC measurement
  - Dual GND check
  - result can be saved to report

## 4. ISO 12098 voltage flow

- `07-iso12098-voltage-select.png`
  - physical connector guidance: ②
  - opens `08-iso12098-voltage-measurement.png`

- `08-iso12098-voltage-measurement.png`
  - Pins 1–9
  - Pin 10 conditional validation → `09-iso12098-pin10-validation.png`
  - Pin 11 conditional validation → `10-iso12098-pin11-validation.png`
  - Pin 12 conditional validation → `11-iso12098-pin12-validation.png`
  - Pins 13–15
  - after each conditional validation, return to the ISO 12098 voltage result screen
  - result can be saved to report

## 5. Cable test flow

- `12-cable-test-select.png`
  - ISO 7638 branch:
    - `13-iso7638-cable-select.png`
      - physical connector guidance: ① + ③
      - opens `14-iso7638-cable-measurement.png`
        - continuity
        - cross-scan
        - result can be saved to report
  - ISO 12098 branch:
    - `15-iso12098-cable-select.png`
      - physical connector guidance: ② + ④
      - opens `16-iso12098-cable-measurement.png`
        - continuity
        - cross-scan
        - result can be saved to report

Cross Scan is part of the cable-test measurement flow. It is not a standalone screen or route.

## 6. CAN Bus termination flow

- `17-can-termination-select.png`
  - ignition-off check
  - contains a nested four-state CAN Bus sub-selector

### Four nested CAN Bus selector states

1. Tractor / ISO 7638
   - `18-iso7638-can-tractor-select.png`
   - physical connector guidance: ①
   - `22-iso7638-can-tractor-safety.png`
   - `23-iso7638-can-tractor-resistance.png`

2. Tractor / ISO 12098
   - `20-iso12098-can-tractor-select.png`
   - physical connector guidance: ②
   - `26-iso12098-can-tractor-safety.png`
   - `27-iso12098-can-tractor-resistance.png`

3. Trailer / ISO 7638
   - `19-iso7638-can-trailer-select.png`
   - physical connector guidance: ③
   - `24-iso7638-can-trailer-safety.png`
   - `25-iso7638-can-trailer-resistance.png`

4. Trailer / ISO 12098
   - `21-iso12098-can-trailer-select.png`
   - physical connector guidance: ④
   - `28-iso12098-can-trailer-safety.png`
   - `29-iso12098-can-trailer-resistance.png`

Main carousel state and CAN Bus sub-carousel state are independent.
A swipe inside the nested CAN Bus selector must not advance the parent carousel.

## 7. ISO 12098 lamp / axle-lift flow

- `30-lamp-test-select.png`
  - physical connector guidance: ④
  - opens `31-lamp-test-measurement.png`

- `31-lamp-test-measurement.png`
  - drive lamp lines one at a time
  - when a new lamp is activated, the previous lamp is turned off
  - if axle lift is selected, open `32-axle-lift-safety.png`
  - after confirmation, return to lamp test
  - result can be saved to report

## 8. Reports flow

- `33-reports.png`
  - if an active service record exists → `34-report-result.png`
  - if no active service record exists → `40-old-record-search-alt.png`

- `34-report-result.png`
  - review report/test result
  - create/save report → `35-report-save-modal.png`
  - retest → keep the same active service record and return to the Test Carousel

- `35-report-save-modal.png`
  - report save/finalization flow

- `40-old-record-search-alt.png`
  - old-record search in report context

## 9. Settings and battery

- `37-settings.png`
  - opens `38-settings-detail.png`

- `39-battery-status.png`
  - battery percentage
  - voltage
  - current
  - power

## 10. Shared modal / overlay

- `36-report-save-common-modal.png`
  - shared "save to report / exit without saving / return to test" overlay
  - opens from the relevant test/result screens where save/exit is offered
  - this is NOT a standalone route

Old-record search has two semantic contexts:
- `04-old-record-search.png` — entry/service-record context
- `40-old-record-search-alt.png` — reports context

They may share implementation as a reusable modal, but their actions/context must remain flow-specific.

## 11. Physical connector map

- ① = Tractor / ISO 7638
- ② = Tractor / ISO 12098
- ③ = Trailer / ISO 7638
- ④ = Trailer / ISO 12098

Applied screens:
- ISO 7638 Voltage → ①
- ISO 12098 Voltage → ②
- ISO 7638 Cable Test → ① + ③
- ISO 12098 Cable Test → ② + ④
- Tractor ISO 7638 Termination → ①
- Tractor ISO 12098 Termination → ②
- Trailer ISO 7638 Termination → ③
- Trailer ISO 12098 Termination → ④
- ISO 12098 Lamp Test → ④

## 12. Structural implementation rules already agreed

- Header and bottom navigation are fixed.
- The red content area is the carousel area on selection/navigation screens.
- The eight main cards are one carousel route, not separate routes.
- CAN Bus Termination uses four nested sub-selector states.
- Measurement, safety, modal and result screens do not use slider/swipe navigation.
- No extra screens, routes, modals, animations or UX flows may be invented during implementation.
- Figma arrows remain the authority for exact direction/back relationships until the dedicated navigation rules file is finalized.

## 13. Visual authority

Priority order:
1. `docs/figma/screens/` — final visual reference
2. `docs/figma/assets/replit/` — final implementation assets
3. Figma — secondary detail reference only when Git screenshot/asset references do not resolve a visual detail

Do not use older screenshot names or older screen-inventory mappings as UI authority when they conflict with the numbered final screenshot set.
