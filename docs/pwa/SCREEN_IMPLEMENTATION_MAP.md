# BREMSECU G1 PWA — 40-SCREEN IMPLEMENTATION MAP

The numbered PNG set in `docs/figma/screens/` remains the legacy workflow/reference set. Screenshot 01 is retained only for historical traceability; the login screen is no longer part of the product flow. The main module-selection experience has intentionally moved away from the old image-heavy carousel to the Bremsecu responsive grid design language: dark glass cards, red universal icons, white labels, and explicit responsive submenus.

| # | Legacy reference screenshot | Current implementation mapping |
|---:|---|---|
| 1 | `01-login.png` | Retired legacy reference — login removed; application starts on MainDashboardScreen |
| 2 | `02-vehicle-entry.png` | VehicleEntryScreen — vehicle-entry route |
| 3 | `03-new-vehicle-form.png` | NewVehicleRecordScreen — new-vehicle-form route |
| 4 | `04-old-record-search.png` | RecordSearchModal — entry-context overlay |
| 5 | `05-iso7638-voltage-select.png` | MainDashboardScreen — ISO 7638 tile in responsive grid |
| 6 | `06-iso7638-voltage-measurement.png` | Iso7638VoltageScreen — responsive ISO 7638 live measurement; guarded preflight and report-aware exit |
| 7 | `07-iso12098-voltage-select.png` | MainDashboardScreen — ISO 12098 tile in responsive grid |
| 8 | `08-iso12098-voltage-measurement.png` | Iso12098VoltageScreen — responsive 15-pin measurement with per-line on/off focus toggles, independent technician OK marks, socket preflight, conditional pin validation and report-aware exit |
| 9 | `09-iso12098-pin10-validation.png` | ConditionalValidationModal — PIN 10 |
| 10 | `10-iso12098-pin11-validation.png` | ConditionalValidationModal — PIN 11 |
| 11 | `11-iso12098-pin12-validation.png` | ConditionalValidationModal — PIN 12 |
| 12 | `12-cable-test-select.png` | CableMenuScreen — responsive ISO standard grid |
| 13 | `13-iso7638-cable-select.png` | CableSelectionScreen — simplified responsive ISO 7638 setup |
| 14 | `14-iso7638-cable-measurement.png` | CableMeasurementScreen — responsive ISO 7638 continuity test with per-pin enabledPinMask toggles, firmware result marks and report-aware exit |
| 15 | `15-iso12098-cable-select.png` | CableSelectionScreen — simplified responsive ISO 12098 setup |
| 16 | `16-iso12098-cable-measurement.png` | CableMeasurementScreen — responsive ISO 12098 continuity test with per-pin enabledPinMask toggles, firmware result marks and report-aware exit |
| 17 | `17-can-termination-select.png` | CanMenuScreen — responsive CAN selection grid |
| 18 | `18-iso7638-can-tractor-select.png` | CanMenuScreen — ISO 7638 tractor tile |
| 19 | `19-iso7638-can-trailer-select.png` | CanMenuScreen — ISO 7638 trailer tile |
| 20 | `20-iso12098-can-tractor-select.png` | CanMenuScreen — ISO 12098 tractor tile |
| 21 | `21-iso12098-can-trailer-select.png` | CanMenuScreen — ISO 12098 trailer tile |
| 22 | `22-iso7638-can-tractor-safety.png` | TerminationSafetyScreen — viewport CAN preflight popup, ISO 7638 tractor / socket 1 |
| 23 | `23-iso7638-can-tractor-resistance.png` | TerminationResultScreen — responsive ISO 7638 tractor resistance measurement; no browser PASS/FAIL; report-aware exit |
| 24 | `24-iso7638-can-trailer-safety.png` | TerminationSafetyScreen — viewport CAN preflight popup, ISO 7638 trailer / socket 3 |
| 25 | `25-iso7638-can-trailer-resistance.png` | TerminationResultScreen — responsive ISO 7638 trailer resistance measurement; no browser PASS/FAIL; report-aware exit |
| 26 | `26-iso12098-can-tractor-safety.png` | TerminationSafetyScreen — viewport CAN preflight popup, ISO 12098 tractor / socket 2 |
| 27 | `27-iso12098-can-tractor-resistance.png` | TerminationResultScreen — responsive ISO 12098 tractor resistance measurement; no browser PASS/FAIL; report-aware exit |
| 28 | `28-iso12098-can-trailer-safety.png` | TerminationSafetyScreen — viewport CAN preflight popup, ISO 12098 trailer / socket 4 |
| 29 | `29-iso12098-can-trailer-resistance.png` | TerminationResultScreen — responsive ISO 12098 trailer resistance measurement; no browser PASS/FAIL; report-aware exit |
| 30 | `30-lamp-test-select.png` | MainDashboardScreen — Lamp Test tile |
| 31 | `31-lamp-test-measurement.png` | LampMeasurementScreen |
| 32 | `32-axle-lift-safety.png` | AxleLiftSafetyScreen — viewport safety popup required before axle toggle can turn on |
| 33 | `33-reports.png` | MainDashboardScreen — Reports tile |
| 34 | `34-report-result.png` | ReportResultScreen — active service record summary + stored tests; empty when no record; historical-record search; report creation only when tests exist; temporary PDF share after report metadata is saved |
| 35 | `35-report-save-modal.png` | ReportSaveModal — centered viewport popup with Diagnosis/Description + Fee only; persists record metadata, not a PDF file |
| 36 | `36-report-save-common-modal.png` | CommonSaveModal — shared save overlay |
| 37 | `37-settings.png` | MainDashboardScreen — Settings tile |
| 38 | `38-settings-detail.png` | SettingsDetailScreen |
| 39 | `39-battery-status.png` | BatteryStatusScreen — responsive status page |
| 40 | `40-old-record-search-alt.png` | RecordSearchModal — reports-context overlay reused from vehicle records; selected record becomes the active report context |

## Current design authority

The product-family UI uses the live viewport rather than a virtual 390×844 canvas. Header and footer remain full-width shell regions; the middle content area is the only scrollable region when required.

Main module selection uses a responsive grid:
- phone: two columns;
- tablet and desktop: four columns within a centered maximum-width content area;
- icons: universal technical symbols in Bremsecu red;
- labels: white;
- card press/selection: red glass highlight before navigation;
- no socket photography and no carousel interaction.

Cable and CAN module choices use the same responsive grid language. Measurement, safety, record, report, and settings screens retain their functional workflow while they are progressively normalized to the same responsive shell.


### Report workflow authority
- Opening **Reports** always opens the Reports screen.
- If there is no active service record, the Reports screen stays empty and offers **Open Existing Record**; it must not fabricate report data.
- Stored test evidence is required before **Create Report** is offered.
- **Save Report** stores only service-closing metadata (Diagnosis/Description and Fee) in the service record.
- **Share** generates a temporary PDF in the browser and hands it to the OS/browser share flow. The PDF itself is not persisted to device/SD storage.
- Historical record lookup reuses the same record-search modal as Vehicle Records and activates the selected record before report actions.
