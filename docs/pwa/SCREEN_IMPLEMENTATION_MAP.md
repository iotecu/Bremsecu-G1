# BREMSECU G1 PWA — 40-SCREEN IMPLEMENTATION MAP

Visual authority remains the numbered PNG set in `docs/figma/screens/`.

| # | Approved screenshot | Implementation mapping |
|---:|---|---|
| 1 | `01-login.png` | LoginScreen — login route |
| 2 | `02-vehicle-entry.png` | VehicleEntryScreen — vehicle-entry route |
| 3 | `03-new-vehicle-form.png` | NewVehicleRecordScreen — new-vehicle-form route |
| 4 | `04-old-record-search.png` | RecordSearchModal — entry-context overlay |
| 5 | `05-iso7638-voltage-select.png` | MainCarouselScreen — activeCardIndex 0 |
| 6 | `06-iso7638-voltage-measurement.png` | VoltageMeasurementScreen — ISO 7638 |
| 7 | `07-iso12098-voltage-select.png` | MainCarouselScreen — activeCardIndex 1 |
| 8 | `08-iso12098-voltage-measurement.png` | VoltageMeasurementScreen — ISO 12098 |
| 9 | `09-iso12098-pin10-validation.png` | ConditionalValidationModal — PIN 10 |
| 10 | `10-iso12098-pin11-validation.png` | ConditionalValidationModal — PIN 11 |
| 11 | `11-iso12098-pin12-validation.png` | ConditionalValidationModal — PIN 12 |
| 12 | `12-cable-test-select.png` | CableRootCard — activeCardIndex 2 |
| 13 | `13-iso7638-cable-select.png` | CableSelectionScreen — ISO 7638 |
| 14 | `14-iso7638-cable-measurement.png` | CableMeasurementScreen — ISO 7638 |
| 15 | `15-iso12098-cable-select.png` | CableSelectionScreen — ISO 12098 |
| 16 | `16-iso12098-cable-measurement.png` | CableMeasurementScreen — ISO 12098 |
| 17 | `17-can-termination-select.png` | CanTerminationRootCard — activeCardIndex 3 |
| 18 | `18-iso7638-can-tractor-select.png` | CanTerminationRootCard — canSubSlide 0 |
| 19 | `19-iso7638-can-trailer-select.png` | CanTerminationRootCard — canSubSlide 2 |
| 20 | `20-iso12098-can-tractor-select.png` | CanTerminationRootCard — canSubSlide 1 |
| 21 | `21-iso12098-can-trailer-select.png` | CanTerminationRootCard — canSubSlide 3 |
| 22 | `22-iso7638-can-tractor-safety.png` | TerminationSafetyScreen — ISO 7638 tractor |
| 23 | `23-iso7638-can-tractor-resistance.png` | TerminationResultScreen — ISO 7638 tractor |
| 24 | `24-iso7638-can-trailer-safety.png` | TerminationSafetyScreen — ISO 7638 trailer |
| 25 | `25-iso7638-can-trailer-resistance.png` | TerminationResultScreen — ISO 7638 trailer |
| 26 | `26-iso12098-can-tractor-safety.png` | TerminationSafetyScreen — ISO 12098 tractor |
| 27 | `27-iso12098-can-tractor-resistance.png` | TerminationResultScreen — ISO 12098 tractor |
| 28 | `28-iso12098-can-trailer-safety.png` | TerminationSafetyScreen — ISO 12098 trailer |
| 29 | `29-iso12098-can-trailer-resistance.png` | TerminationResultScreen — ISO 12098 trailer |
| 30 | `30-lamp-test-select.png` | LampRootCard — activeCardIndex 4 |
| 31 | `31-lamp-test-measurement.png` | LampMeasurementScreen |
| 32 | `32-axle-lift-safety.png` | AxleLiftSafetyScreen |
| 33 | `33-reports.png` | ReportsRootCard — activeCardIndex 5 |
| 34 | `34-report-result.png` | ReportResultScreen |
| 35 | `35-report-save-modal.png` | ReportSaveModal — report-save overlay |
| 36 | `36-report-save-common-modal.png` | CommonSaveModal — shared save overlay |
| 37 | `37-settings.png` | SettingsRootCard — activeCardIndex 6 |
| 38 | `38-settings-detail.png` | SettingsDetailScreen |
| 39 | `39-battery-status.png` | BatteryStatusCard — activeCardIndex 7 |
| 40 | `40-old-record-search-alt.png` | RecordSearchModal — reports-context overlay |

This mapping proves implementation coverage, not pixel equality. Pixel/spacing/type comparison still uses the numbered PNGs at 390x844.
