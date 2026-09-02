# Screen Inventory — Approved UI

Status: CONFIRMED from user-supplied final PNGs and Figma review.

## Entry / service record

| Canonical file | Purpose |
|---|---|
| `01-wifi-first-contact.png` | First contact / hotspot / serial-number screen |
| `02-test-entry.png` | New vehicle record / recall existing record entry |
| `03-new-vehicle-record.png` | New service/vehicle record form |
| `04-existing-record-search.png` | Search and recall previous service record |

## Test selection screens

| Canonical file | Purpose |
|---|---|
| `10-iso7638-voltage-select.png` | ISO 7638 voltage test selection — tractor side |
| `11-iso12098-voltage-select.png` | ISO 12098 voltage test selection — tractor side |
| `12-cable-test-select.png` | Cable test category selection |
| `13-iso7638-cable-select.png` | ISO 7638 cable test selection |
| `14-iso12098-cable-select.png` | ISO 12098 cable test selection |
| `15-iso12098-lamp-select.png` | ISO 12098 lamp / axle-lift test selection |
| `16-can-termination-select.png` | CANBUS termination test category selection |
| `17-iso7638-termination-tractor-select.png` | ISO 7638 termination — tractor side |
| `18-iso7638-termination-trailer-select.png` | ISO 7638 termination — trailer side |
| `19-iso12098-termination-tractor-select.png` | ISO 12098 termination — tractor side |
| `20-iso12098-termination-trailer-select.png` | ISO 12098 termination — trailer side |

## Live measurement screens

| Canonical file | Purpose |
|---|---|
| `30-iso7638-voltage-live.png` | ISO 7638 7-pin live voltage measurement |
| `31-iso12098-voltage-live.png` | ISO 12098 15-pin live voltage measurement |
| `32-iso7638-cable-live.png` | ISO 7638 cable continuity/result screen |
| `33-iso12098-cable-live.png` | ISO 12098 cable continuity/result screen |
| `34-iso12098-lamp-live.png` | ISO 12098 lamp/current live test screen |

## Conditional validation modals

| Canonical file | Purpose |
|---|---|
| `40-pin10-lining-wear-validation.png` | Pin 10 conditional lining-wear validation |
| `41-pin11-brake-system-validation.png` | Pin 11 conditional brake-system validation |
| `42-pin12-axle-lift-validation.png` | Pin 12 conditional axle-lift validation |
| `43-axle-lift-safety-confirmation.png` | Axle-lift pneumatic/safety confirmation |

## CAN termination safety and result screens

| Canonical file | Purpose |
|---|---|
| `50-iso7638-termination-safety-tractor.png` | ISO 7638 de-energized confirmation — tractor |
| `51-iso7638-termination-safety-trailer.png` | ISO 7638 de-energized confirmation — trailer |
| `52-iso7638-termination-result-tractor.png` | ISO 7638 resistance result — tractor |
| `53-iso7638-termination-result-trailer.png` | ISO 7638 resistance result — trailer |
| `54-iso12098-termination-safety-tractor.png` | ISO 12098 de-energized confirmation — tractor |
| `55-iso12098-termination-safety-trailer.png` | ISO 12098 de-energized confirmation — trailer |
| `56-iso12098-termination-result-tractor.png` | ISO 12098 resistance result — tractor |
| `57-iso12098-termination-result-trailer.png` | ISO 12098 resistance result — trailer |

## Reporting and settings

| Canonical file | Purpose |
|---|---|
| `60-reports-select.png` | Reports entry screen |
| `61-report-test-results.png` | Completed service/test summary |
| `62-report-save-modal.png` | Final report/service closure modal |
| `63-unsaved-test-results-modal.png` | Exit / save-results decision modal |
| `64-report-record-search-modal.png` | Search prior records from reports flow |
| `70-settings-select.png` | Settings entry screen |
| `71-settings-detail.png` | Detailed settings screen |

## Architecture rule

The current approved UI contains no standalone **Cross Scan** screen and no standalone **Cross Scan** test. Do not create one unless the product specification is explicitly changed.

## PNG handling

Final approved PNGs belong in `docs/figma/screens/` using the canonical names above. Binary image upload may be performed separately from the text-authority commits; the file names in this inventory remain authoritative.
