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

## Entry flow — separate from main carousel

The entry flow is not part of the main module carousel.

1. `FirstContactScreen`
   - hotspot instruction
   - serial-number field
   - Wi-Fi/hotspot visual
2. `TestEntryScreen`
   - new vehicle record action
   - existing record action
3. `NewVehicleRecordScreen`
   - customer/company field
   - technician selector
   - tractor/trailer selectors
   - plate / chassis / fleet fields
   - trailer connection type
   - save-and-continue action
4. `ExistingRecordSearchModal`
   - search field
   - filter chips
   - result cards
   - open-report action
   - retest action

After the service/vehicle entry flow is completed, the user arrives at the main module carousel.

## Main module carousel — REQUIRED HOME BEHAVIOR

The main application screen is a horizontal carousel of module cards. It must not be implemented as a grid, stacked list, tab strip, or unrelated full-page menu sequence.

### Required interaction
- Exactly one module card is centered and active.
- The previous card remains partially visible on the left.
- The next card remains partially visible on the right.
- Left/right arrow controls move exactly one card per action.
- Horizontal swipe/drag on touch devices performs the same previous/next movement.
- Only the centered active card exposes the actionable `Başlat` control.
- Card navigation does not navigate away from the home screen; it changes the centered carousel item.
- Bottom navigation remains fixed while the carousel moves.
- Header/logo/Wi-Fi/language area remains fixed while the carousel moves.
- Card width, side-ribbon treatment, partial neighboring-card visibility and overall composition must follow the approved Figma/PNG references.

### Canonical carousel order
1. ISO 7638 VOLTAJ TEST
2. ISO 12098 VOLTAJ TEST
3. KABLO TEST
4. ISO 12098 LAMBA TEST
5. CANBUS TERMİNASYON
6. RAPORLAR
7. AYARLAR

The carousel should preserve this order unless the product specification is explicitly revised.

### Card actions
- `ISO 7638 VOLTAJ TEST` → opens ISO 7638 voltage flow.
- `ISO 12098 VOLTAJ TEST` → opens ISO 12098 voltage flow.
- `KABLO TEST` → opens cable-test selection/flow.
- `ISO 12098 LAMBA TEST` → opens lamp / axle-lift flow.
- `CANBUS TERMİNASYON` → opens CAN termination selection/safety flow.
- `RAPORLAR` → opens reports flow.
- `AYARLAR` → opens settings flow.

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

Cable Test has one user-visible workflow with an embedded Cross Scan engine.

#### `CableSelectionScreen`
- ISO/socket context heading
- `CablePinSelectionList`
  - one row per eligible pin
  - per-row toggle/checkbox
  - pin number
  - localized function name
  - optional status from a previous run
- `SelectAllControl` where appropriate
- `StartCableTestButton`

The row toggles determine the enabled-pin mask sent to firmware. They are not cosmetic controls.

#### `CableLiveScreen`
- compact cable-test header
- current focus pin/function
- `TEST YAPILIYOR` / active-state badge
- `CableProgressIndicator`
- `CableChannelTable`
  - one row per pin/channel relevant to the active cable test
  - pin
  - localized function name
  - measured/focus value where applicable
  - continuity result
  - cross-response/short indication
  - selected/enabled state
- `CableSummaryBar`
  - PASS count
  - OPEN count
  - INDETERMINATE count when applicable
  - SHORT/MISWIRE count
- `SaveToReportBar`

#### `CableChannelRow`
States include:
- `pending`
- `active_focus`
- `pass`
- `open`
- `indeterminate`
- `short_or_miswire`
- `disabled`

Visual behavior:
- active focus row uses the approved active/lime emphasis,
- detected cross-response/short relation uses warning/error emphasis,
- not-yet-tested rows remain neutral,
- technical labels and actual result wording are localized through i18n.

#### Integrated Cross Scan behavior
Cross Scan is a core REV-2 cable-diagnostic capability, but it is not a separate top-level screen or separate carousel module.

For each enabled cable-test row/pin:
- energize only the selected pin with the approved 3.3V cable-test source,
- perform the direct expected-return measurement for that pin,
- during the same test step, scan the other relevant channels to detect unintended coupling / short circuits,
- compare the selected pin against the other channels and record any unexpected response as short/miswire evidence,
- update the current row and any detected coupled row(s) from firmware progress messages,
- release the selected pin before proceeding to the next enabled row.

The UI must consume firmware state; it must not perform electrical classification itself.

No separate `CrossScanScreen` is required because Cross Scan is an embedded diagnostic behavior of Cable Test.

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

## Cross Scan clarification

There is no standalone `CrossScanScreen` and no separate Cross Scan carousel module. However, the Cross Scan capability itself is REQUIRED in REV-2 as an integrated part of Cable Test. Do not remove or disable the embedded short-circuit cross-check behavior.
