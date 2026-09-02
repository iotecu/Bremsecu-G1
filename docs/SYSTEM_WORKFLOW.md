# BREMSECU G1 — System Workflow

Status: PRODUCT WORKFLOW AUTHORITY.

## 1. Power / safe startup
- Firmware boots with TPIC outputs disabled.
- Shift/latch zero output word before enabling outputs.
- Initialize I2C, ADS1115/MUX, RTC, SD, INA226 and Wi-Fi services.
- Start simultaneous AP+STA networking.
- AP recovery interface remains available at `192.168.4.1`.

## 2. First contact
- Technician opens the PWA through ESP AP or known STA address.
- First-contact screen guides hotspot/network use and device serial identification.
- Language may be selected through the top language control.

## 3. Service record entry
- Technician chooses new vehicle record or recalls an existing record.
- New record captures customer/company, technician and vehicle/trailer identifiers.
- Trailer connection type is recorded where applicable.
- Active service record becomes the parent for subsequent test results.

## 4. Main module carousel
After record entry, the user reaches the seven-card main carousel:
1. ISO7638 voltage
2. ISO12098 voltage
3. cable test
4. ISO12098 lamp test
5. CAN termination
6. reports
7. settings

Carousel behavior is defined in `docs/figma/component-tree.md` and `docs/PWA_SPEC.md`.

## 5. Test execution
### Voltage
- User selects approved voltage flow.
- Firmware performs channel scan using authoritative mux/channel mapping.
- K6 is normally active; ground channels use controlled dual-read validation.
- Live values are streamed to PWA.

### Cable
- 3.3V-only test source.
- Firmware drives one intended channel at a time and reads expected return paths.
- 24V cable test is forbidden.

### Lamp / axle lift
- Firmware validates requested load mode.
- K1 selects 24V only for approved load functions.
- INA226 current evidence is streamed to PWA.
- Axle lift requires safety confirmation before activation.

### CAN termination
- User is shown ignition/de-energized safety confirmation.
- Firmware still validates safe state and relay interlocks.
- Exactly one of K2/K3/K4/K5 may be selected.
- Measured resistance/result is streamed and may be saved when classification authority exists.

## 6. Save test result
- Completed test can be saved to active service record.
- Technician note may be added.
- Raw/engineering evidence is preserved where practical.
- If user exits with unsaved results, the approved unsaved-results modal is shown.

## 7. Reports
- Reports screen summarizes active service record and completed tests.
- Technician may create final report, add diagnosis/service notes and fee, and share/export through supported client capabilities.
- Stored data remains firmware-controlled authoritative record data.

## 8. Settings
- Language
- screen-awake preference
- technicians
- service/company metadata
- report logo
- device information

Settings cannot modify protected engineering/safety constants.

## 9. Fault / reset behavior
- Any fatal fault, reset or watchdog condition returns controllable outputs to safe state.
- PWA receives fault/status event.
- Reconnection must recover current authoritative device/test state rather than assuming the previous browser state is valid.

## 10. Engineering-pending rule
Whenever an action requires an engineering value still marked PENDING in `docs/engineering/status-register.md`, implementation must not fabricate a production diagnostic limit. Measurement may be displayed/stored as unresolved evidence, or the affected final classification must remain blocked.
