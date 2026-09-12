# BREMSECU G1 REV-2 — Battery Monitor Authority Addendum

Status: approved project hardware addition for firmware implementation.

This addendum records the battery-monitor changes supplied with the updated REV-2 schematic. It supplements MASTER NET MAP v1.3 without reinterpreting any existing connector or diagnostic mapping.

## Voltage measurement path

- Source: internal 12 V LiFePO4 battery input.
- Divider: 100 kΩ high-side + 10 kΩ low-side.
- Nominal divider scale: 11.0:1.
- MUX: U11 / AIN3 family.
- Physical MUX input: Y4 (`S2S1S0 = 100`, step 4).
- ADS1115 input: AIN3.
- This is internal system telemetry, not an ISO 7638 or ISO 12098 connector pin.
- It must not be added to either connector scan list.

## Battery current measurement path

- Device: dedicated INA226, separate from the existing 24 V load-path INA226.
- Existing 24 V load INA226 address remains `0x40`.
- Battery INA226 address is fixed for this revision at `0x41`; hardware A0/A1 strapping/configuration must match.
- Battery shunt marking/value: `R010` = 0.010 Ω = 10 mΩ.
- Battery current telemetry is derived from signed INA226 shunt voltage divided by 0.010 Ω.
- No battery-health, state-of-charge, low-voltage, charge/discharge, or serviceability thresholds are authorized by this addendum.

## Firmware ownership

- `AdcService` owns raw ADS1115/MUX acquisition only.
- `BatteryIna226Service` owns the dedicated battery INA226 evidence source.
- `BatteryMonitor` owns battery engineering telemetry conversion.
- Battery monitoring is continuous system telemetry and is not a `TestEngine` diagnostic mode.

## Explicitly unresolved

The following are not defined by this addendum and must not be invented in firmware or PWA:

- battery SOC percentage algorithm,
- low-battery threshold,
- charge-state classification,
- battery health / replacement judgement,
- production calibration slope/offset beyond the approved nominal 100 kΩ / 10 kΩ divider relationship.
