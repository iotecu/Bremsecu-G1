# BREMSECU G1 REV-2 — Hardware Authority Chain

Status: AUTHORITATIVE REFERENCE ORDER

## Source-of-truth order

1. **REV-2 schematic / approved hardware revision** — electrical implementation authority.
2. **`BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt`** — frozen hardware/firmware net identity derived from the approved REV-2 schematic.
3. **`BATTERY_MONITOR_ADDENDUM.md`** — approved REV-2 battery-monitor schematic addition. It supplements v1.3 only for the new internal battery telemetry path and does not remap any existing diagnostic identity.
4. **Derived engineering Markdown** under `docs/engineering/` — readable specifications derived from the frozen hardware authority, approved addenda and explicitly documented bench findings.
5. **Firmware identity maps / hardware services** (`pins.h`, `tpic_map.h`, `channels.h`, battery monitor services) — executable representation of the same hardware identity.
6. **TestEngine / services / API / PWA contracts** — behavior built on top of those identities; they may not redefine hardware mapping.

## Change rule

A firmware or documentation change must not alter a schematic-derived pin, channel, TPIC output, relay or bus identity merely to satisfy code behavior.

If an actual future hardware revision changes an existing mapping, update the authority chain in this order:

`schematic revision -> MASTER NET MAP revision -> derived engineering docs -> firmware identity maps -> behavior/tests`

Do not silently edit v1.3 to describe a different board. A different existing mapping requires a new authority revision.

An approved additive hardware change that occupies a previously NC resource without changing any frozen identity may be recorded as an explicit authority addendum. The addendum must name the schematic change, exact physical resource and firmware ownership, and the consistency gate must validate it. `BATTERY_MONITOR_ADDENDUM.md` is the first such REV-2 addendum.

## Frozen REV-2 identities

Package 6 restores authority without changing the mappings already verified during the independent schematic review. In particular:

- ESP32 GPIO/net mapping remains frozen.
- 26 valid ADC/MUX **diagnostic** channel identities remain frozen.
- TPIC serial chain remains `MCU SER_IN -> HCT -> TPIC_SER -> U6 -> U5 -> U4 -> U3`.
- U6 SER IN is `TPIC_SER`; U6 RCK is `TPIC_RCK`; U6 SRCK is `TPIC_CLK`.
- OUT1..OUT22 mapping remains frozen.
- K1..K6 relay identity remains frozen.
- CAN selector mapping remains frozen.
- GPIO36=`SAG_PULS`, GPIO39=`SOL_PULS` remains frozen.
- Existing ISO7638 / ISO12098 connector-to-net mappings encoded by REV-2 authority are not modified by the battery-monitor addition.

The battery-monitor addendum changes one previously NC physical MUX slot only:

- U11 Y4 / ADS1115 AIN3 / `S2S1S0=100` becomes `BATTERY_12V` internal telemetry.
- `BATTERY_12V` is **not** a 27th diagnostic channel and is not included in either connector scan list.
- Battery voltage divider authority is 100 kΩ high-side / 10 kΩ low-side, nominal 11.0:1.
- Existing 24 V load INA226 remains at `0x40`.
- Dedicated battery INA226 is `0x41` with R010 = 10 mΩ.

## Scope boundary

MASTER NET MAP v1.3 plus approved addenda define hardware identity and topology. They do **not** freeze diagnostic thresholds, final calibration coefficients, settling delays, classification rules, report logic, API behavior or PWA workflow unless an authority document explicitly says so. Those belong to the appropriate engineering/runtime authority and must remain separately testable.

The battery addendum explicitly does **not** authorize SOC percentage, low-battery threshold, charge-state classification or battery-health judgement.

## Authority files

- `docs/authority/BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt`
- `docs/authority/BATTERY_MONITOR_ADDENDUM.md`

The v1.3 repository copy remains the restored frozen Package-6 authority. The battery addendum supplements it without reinterpreting or remapping its existing contents.
