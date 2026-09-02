# Component Tree — Bremsecu G1 PWA

Status: CONFIRMED from the approved screen set.

## App shell

- `AppShell`
  - `TopBrandBar`
    - Bremsecu logo
    - Wi-Fi status badge
    - language badge
  - `ScreenBody`
  - `BottomNavigation`
    - Back
    - Home
    - Tools / Settings

## First contact and record flow

- `FirstContactScreen`
  - hotspot instruction
  - serial-number field
  - Wi-Fi/hotspot visual
- `TestEntryScreen`
  - new vehicle record action
  - existing record action
- `NewVehicleRecordScreen`
  - customer/company field
  - technician selector
  - tractor/trailer selectors
  - plate / chassis / fleet fields
  - trailer connection type
  - save-and-continue action
- `ExistingRecordSearchModal`
  - search field
  - filter chips
  - result cards
  - open-report action
  - retest action

## Test-selection card family

Shared component: `TestSelectionCard`
- side ribbon
- connector / test illustration
- test title
- start button
- previous/next arrows when applicable

Variants:
- ISO 7638 voltage
- ISO 12098 voltage
- cable test
- ISO 7638 cable
- ISO 12098 cable
- ISO 12098 lamp
- CAN termination
- ISO 7638 termination tractor
- ISO 7638 termination trailer
- ISO 12098 termination tractor
- ISO 12098 termination trailer

## Live test family

Shared shell: `ActiveTestScreen`
- compact test header
  - side/type badge
  - connector preview
  - test title
  - `TEST AKTIF` badge
- `ActiveMeasurementCard`
- `ChannelTable`
- `SaveToReportBar`

### Voltage
- `VoltageLiveScreen`
  - `ActiveMeasurementCard`
    - pin
    - function
    - measured voltage
    - status
  - `ChannelTable`
    - pin
    - function
    - state
    - value/type
    - include/result control

### Cable
- `CableLiveScreen`
  - continuity status
  - channel table
  - conditional channels where applicable

### Lamp / axle lift
- `LampLiveScreen`
  - active pin/function
  - measured current
  - current behavior text where applicable
  - lamp channel table
  - axle-lift row

## Conditional confirmation modals

Shared component: `ConditionalValidationModal`
- warning icon
- pin/function title
- explanation
- red warning panel
- confirmation checkbox
- negative action
- confirm/start action

Variants:
- Pin 10 lining wear
- Pin 11 brake system
- Pin 12 axle lift

`AxleLiftSafetyModal`
- pneumatic pressure / safe vehicle warning
- confirmation checkbox
- cancel
- confirm-and-return

## CAN termination flow

- `TerminationSafetyScreen`
  - ISO type
  - side/target text
  - ignition-off warning card
  - de-energized confirmation checkbox
  - continue action
  - connector placement instruction
- `TerminationResultScreen`
  - tractor/trailer heading
  - measured resistance card
  - expected resistance
  - CAN H ↔ CAN L label
  - safety-state card
  - save-result action

## Reporting

- `ReportsScreen`
  - active service record card
  - completed test list
  - final report actions
- `ReportSaveModal`
  - diagnosis/service note
  - fee
  - cancel/save
- `UnsavedTestResultsModal`
  - optional technician note
  - save-and-exit
  - exit-without-save
  - return-to-test
- `ReportRecordSearchModal`
  - same search/filter/card language as prior-record flow

## Settings

- `SettingsScreen`
  - language
  - keep-screen-awake
  - technicians
  - service/company information
  - report logo
  - device information
  - save settings

## Authority boundary

Visual appearance comes from the approved PNGs/Figma documents in `docs/figma/`. Electrical behavior, safety and channel identity come from `docs/engineering/`. PWA code must not infer hardware behavior from artwork.

## Explicit exclusion

There is no standalone `CrossScanScreen` and no standalone Cross Scan test in the approved UI architecture.
