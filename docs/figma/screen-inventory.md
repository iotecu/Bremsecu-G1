# Screen Inventory — Approved UI

Status: CONFIRMED from user-supplied final PNGs and Figma review.

## Naming rule

The **canonical file** column is the stable semantic screen ID used by documentation and implementation discussions. The **actual PNG** column is the currently uploaded approved visual reference under `docs/figma/screens/`.

Coding agents must use this table as the canonical-to-physical mapping. Do not assume the physical PNG filename itself defines product behavior.

## Entry / service record

| Canonical file | Actual PNG | Purpose |
|---|---|---|
| `01-wifi-first-contact.png` | `LOGI.png` | First contact / hotspot / serial-number screen |
| `02-test-entry.png` | `YENİ ARAÇ KAYIT.png` | New vehicle record / recall existing record entry |
| `03-new-vehicle-record.png` | `ARAÇ KAYIT FORM.png` | New service/vehicle record form |
| `04-existing-record-search.png` | `ESKİ KAYIT ARA MODAL.png` | Search and recall previous service record |

## Test selection screens

| Canonical file | Actual PNG | Purpose |
|---|---|---|
| `10-iso7638-voltage-select.png` | `7638 VOLTAJ TEST.png` | ISO 7638 voltage test selection — tractor side |
| `11-iso12098-voltage-select.png` | `12098 VOLTAJ TEST.png` | ISO 12098 voltage test selection — tractor side |
| `12-cable-test-select.png` | `KABLO TEST.png` | Cable test category selection |
| `13-iso7638-cable-select.png` | `7638 kablo test.png` | ISO 7638 cable test selection |
| `14-iso12098-cable-select.png` | `12098-kablo test.png` | ISO 12098 cable test selection |
| `15-iso12098-lamp-select.png` | `LAMBA TEST.png` | ISO 12098 lamp / axle-lift test selection |
| `16-can-termination-select.png` | `CANBUS TERMINASYON.png` | CANBUS termination test category selection |
| `17-iso7638-termination-tractor-select.png` | `7638 canbus terminasyon-CK.png` | ISO 7638 termination — tractor side |
| `18-iso7638-termination-trailer-select.png` | `7638 canbus terminasyon-DR.png` | ISO 7638 termination — trailer side |
| `19-iso12098-termination-tractor-select.png` | `12098 canbus terminasyon-CK.png` | ISO 12098 termination — tractor side |
| `20-iso12098-termination-trailer-select.png` | `12098 canbus terminasyon-DR.png` | ISO 12098 termination — trailer side |

## Live measurement screens

| Canonical file | Actual PNG | Purpose |
|---|---|---|
| `30-iso7638-voltage-live.png` | `7638 VOLTAJ TEST ÖLÇÜM.png` | ISO 7638 7-pin live voltage measurement |
| `31-iso12098-voltage-live.png` | `12098 VOLTAJ TEST ÖLÇÜM.png` | ISO 12098 15-pin live voltage measurement |
| `32-iso7638-cable-live.png` | `7638 kablo ölçüm.png` | ISO 7638 cable continuity + integrated Cross Scan screen |
| `33-iso12098-cable-live.png` | `12098-kablo ölçüm.png` | ISO 12098 cable continuity + integrated Cross Scan screen |
| `34-iso12098-lamp-live.png` | `lamba test canlı.png` | ISO 12098 lamp/current live test screen |

## Conditional validation modals

| Canonical file | Actual PNG | Purpose |
|---|---|---|
| `40-pin10-lining-wear-validation.png` | `PIN10 KOŞULLU DOĞRULAMA.png` | Pin 10 conditional lining-wear validation |
| `41-pin11-brake-system-validation.png` | `PIN11 KOŞULLU DOĞRULAMA.png` | Pin 11 conditional brake-system validation |
| `42-pin12-axle-lift-validation.png` | `PIN12 KOŞULLU DOĞRULAMA.png` | Pin 12 conditional axle-lift validation |
| `43-axle-lift-safety-confirmation.png` | `DİNGİL KALDIRMA GÜVENLİK ONAYI.png` | Axle-lift pneumatic/safety confirmation |

## CAN termination safety and result screens

| Canonical file | Actual PNG | Purpose |
|---|---|---|
| `50-iso7638-termination-safety-tractor.png` | `7638 GÜVENLİK ONAYI-CK.png` | ISO 7638 de-energized confirmation — tractor |
| `51-iso7638-termination-safety-trailer.png` | `7638 GÜVENLİK ONAYI-DR.png` | ISO 7638 de-energized confirmation — trailer |
| `52-iso7638-termination-result-tractor.png` | `7638 DİRENÇ ÖLÇÜMÜ-CK.png` | ISO 7638 resistance result — tractor |
| `53-iso7638-termination-result-trailer.png` | `7638 DİRENÇ ÖLÇÜMÜ-DR.png` | ISO 7638 resistance result — trailer |
| `54-iso12098-termination-safety-tractor.png` | `12098 GÜVENLİK ONAYI-CK.png` | ISO 12098 de-energized confirmation — tractor |
| `55-iso12098-termination-safety-trailer.png` | `12098 GÜVENLİK ONAYI-DR.png` | ISO 12098 de-energized confirmation — trailer |
| `56-iso12098-termination-result-tractor.png` | `12098 DİRENÇ ÖLÇÜMÜ-CK.png` | ISO 12098 resistance result — tractor |
| `57-iso12098-termination-result-trailer.png` | `12098 DİRENÇ ÖLÇÜMÜ-DR.png` | ISO 12098 resistance result — trailer |

## Reporting and settings

| Canonical file | Actual PNG | Purpose |
|---|---|---|
| `60-reports-select.png` | `RAPORLAR.png` | Reports entry screen |
| `61-report-test-results.png` | `RAPOR-TEST SONU.png` | Completed service/test summary |
| `62-report-save-modal.png` | `RAPOR- KAYDET MODALI.png` | Final report/service closure modal |
| `63-unsaved-test-results-modal.png` | `RAPORA KAYDET MODAL.png` | Exit / save-results decision modal |
| `64-report-record-search-modal.png` | `RAPOR-KAYIT ARA MODAL.png` | Search prior records from reports flow |
| `70-settings-select.png` | `AYARLAR.png` | Settings entry screen |
| `71-settings-detail.png` | `AYARLAR DETAY.png` | Detailed settings screen |

## Shared/duplicate visual note

`ESKİ KAYIT ARA MODAL.png` and `RAPOR-KAYIT ARA MODAL.png` currently resolve to the same Git blob. This is intentional/acceptable as a shared visual reference for two semantic entry points. Implement them as a reusable search modal component with flow-specific actions/context rather than treating the duplicate binary as two different designs.

## Cross Scan rule

The approved UI contains no standalone Cross Scan screen or standalone carousel module. **Cross Scan itself is REQUIRED in REV-2** and runs inside the cable-test live flow for every enabled row/pin. See:
- `docs/engineering/CABLE_TEST_ENGINE.md`
- `docs/engineering/TEST_SPECS.md`
- `docs/figma/component-tree.md`

## PNG handling

Do not rename the uploaded approved PNGs merely to match canonical IDs. This mapping table is the authority bridge between stable semantic IDs and the physical uploaded filenames.
