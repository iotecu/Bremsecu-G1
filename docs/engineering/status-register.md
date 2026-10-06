# Engineering Status Register — BREMSECU G1 REV-2

Purpose: prevent coding agents from converting unfinished engineering items into invented constants or false PASS conditions.

## CONFIRMED

- REV-2 ESP32 GPIO/net map
- TPIC physical chain and OUT1..OUT22 mapping
- K1..K6 relay identity and core logic
- K2/K3/K4/K5 one-at-a-time CAN interlock
- K1 OFF=3.3V / ON=24V
- Cable test uses 3.3V only
- Cable-test K6 / MASTER_GND policy = OFF for the controlled 3.3V continuity/cross-scan workflow
- Cross Scan is a REQUIRED REV-2 capability integrated into Cable Test; it is not a standalone top-level test/screen
- Cable-test row toggles select which focus pins participate in the sequential continuity + cross-response scan
- Only one cable-test focus pin may be energized at a time
- 24V load outputs: 7 lamp functions plus axle lift
- ADS1115 + four CD4051 mux map
- K6 MASTER_GND dual-reading concept
- INA226 installed shunt marking R010 = nominal 10 mOhm
- ESP32 Wi-Fi AP+STA simultaneous operation
- AP recovery address 192.168.4.1
- mDNS optional only
- RTC / microSD / INA226 bus-level bring-up results documented in `bringup-results.md`
- Final approved PWA screen set is represented under `docs/figma/`
- CAN `_R` topology and nominal 120-ohm design behavior are closed for Package 2 using the authoritative 3.3V / 1.5k / Rbus / 1.5k network model
- Package 9 cable continuity classification scope is deliberately limited to `PASS`, `OPEN`, `INDETERMINATE`; Cross Scan reports coupling/miswire candidates as evidence rather than inventing unsupported root-cause labels

## PENDING / MUST NOT BE GUESSED

- Final per-channel calibration coefficients
- Final GND two-reference PASS/WARN/FAIL thresholds
- INA226 current calibration and lamp-current thresholds under real loads
- Final CAN termination PASS/WARN/FAIL tolerance windows
- Cable-test continuity/cross-response numeric thresholds and diagnosis-affecting settle timings until bench characterization freezes them
- CD40106/GPIO36/GPIO39 end-to-end pulse verification when the complete card is operational. The earlier static 22V/24V/28V observation is inconclusive and is **not** a hardware-failure finding.
- `SHORT_TO_GND`, `SHORT_TO_POWER`, `HIGH_RESISTANCE` classification signatures and thresholds; these labels are prohibited until distinct physical signatures are demonstrated and frozen
- Hazard / simultaneous left+right lamp activation as a product feature. Current one-load-at-a-time interlock remains authoritative until explicitly revised.
- Any production credential-generation/recovery policy not explicitly frozen in this repository
- Any timing/filter constants that materially affect diagnosis and have not yet been bench-characterized

## FINAL PCB FIXES / IMPLEMENTATION NOTES

- Prototype K2-K5 Panasonic TQ relays required corrected coil orientation; final PCB must correct footprint/orientation rather than preserving the prototype workaround.
- The tested microSD module could not be powered through its onboard LDO from 3.3V; prototype passed after supply-path correction. Final PCB/module supply must follow the selected module's real power requirements.
- CD40106 static partial-state readings of 1.49V/3.28V at 22V, 1.54V/3.28V at 24V, and 1.64V/3.28V at 28V were taken without a complete operating ESP/pulse workflow. These readings are retained only as raw observations and must not be used to declare a hardware defect. Final verification is the integrated HIGH/LOW pulse test on an operational card.

## Agent rule

If an item is listed as PENDING, an implementation agent may create a clearly named configurable placeholder only when needed for compilation or test scaffolding. It must not label the value as production-final and must not invent a diagnostic limit without an authority update.
