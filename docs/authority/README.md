# BREMSECU G1 REV-2 — Hardware Authority Chain

Status: AUTHORITATIVE REFERENCE ORDER

## Source-of-truth order

1. **REV-2 schematic / approved hardware revision** — electrical implementation authority.
2. **`BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt`** — frozen hardware/firmware net identity derived from the approved REV-2 schematic.
3. **Derived engineering Markdown** under `docs/engineering/` — readable specifications derived from the frozen hardware authority plus explicitly documented bench findings.
4. **Firmware identity maps** (`pins.h`, `tpic_map.h`, `channels.h`) — executable representation of the same hardware identity.
5. **TestEngine / services / API / PWA contracts** — behavior built on top of those identities; they may not redefine hardware mapping.

## Change rule

A firmware or documentation change must not alter a schematic-derived pin, channel, TPIC output, relay or bus identity merely to satisfy code behavior.

If an actual future hardware revision changes a mapping, update the authority chain in this order:

`schematic revision -> MASTER NET MAP revision -> derived engineering docs -> firmware identity maps -> behavior/tests`

Do not silently edit v1.3 to describe a different board. A different mapping requires a new authority revision.

## Frozen REV-2 identities

Package 6 restores authority without changing the mappings already verified during the independent schematic review. In particular:

- ESP32 GPIO/net mapping remains frozen.
- 26 valid ADC/MUX diagnostic channel identities remain frozen; NC slots remain excluded.
- TPIC serial chain remains `MCU SER_IN -> HCT -> TPIC_SER -> U6 -> U5 -> U4 -> U3`.
- U6 SER IN is `TPIC_SER`; U6 RCK is `TPIC_RCK`; U6 SRCK is `TPIC_CLK`.
- OUT1..OUT22 mapping remains frozen.
- K1..K6 relay identity remains frozen.
- CAN selector mapping remains frozen.
- GPIO36=`SAG_PULS`, GPIO39=`SOL_PULS` remains frozen.
- Existing ISO7638 / ISO12098 connector-to-net mappings encoded by REV-2 authority are not modified by Package 6.

## Scope boundary

MASTER NET MAP v1.3 defines hardware identity and topology. It does **not** freeze diagnostic thresholds, calibration coefficients, settling delays, classification rules, report logic, API behavior or PWA workflow. Those belong to the appropriate engineering/runtime authority and must remain separately testable.

## Restored authority file

`docs/authority/BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt`

The repository copy is restored from the previously frozen project authority; Package 6 does not reinterpret or remap its contents.
