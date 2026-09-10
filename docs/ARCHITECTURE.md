# BREMSECU G1 REV-2 — Repository Architecture

This repository is the single technical source of truth for BREMSECU G1 REV-2.

## Authority order
1. Verified REV-2 schematic / approved hardware revision
2. `docs/authority/BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt`
3. Verified bring-up findings that do not redefine schematic-derived mapping
4. Derived engineering documentation under `docs/engineering/`
5. Firmware identity maps (`pins.h`, `tpic_map.h`, `channels.h`)
6. TestEngine / services / API / PWA implementation
7. Figma handoff under `docs/figma/`

Hardware identity flows one way:

`REV-2 schematic -> MASTER NET MAP -> derived engineering maps -> firmware identity maps -> runtime behavior`

If runtime implementation conflicts with the hardware authority chain, implementation must be corrected. Do not change a schematic-derived mapping merely to make code pass.

## Main structure
- `docs/authority/` — frozen hardware/net authority and authority-chain rules
- `docs/engineering/` — derived hardware maps plus measurement, calibration, safety and bring-up specifications
- `docs/figma/` — design tokens, component hierarchy, screen references and visual assets
- `firmware/` — ESP32 firmware
- `pwa/` — technician PWA
- `tests/` — validation and regression checks

## Core verified architecture
- ESP32 control platform
- ADS1115 + 4x CD4051 analog scan
- TPIC 32-bit output chain
- K1 SELECT_V: OFF=3.3V, ON=24V
- K6 MASTER_GND reference/ground-diagnostic relay
- K2/K3/K4/K5 CAN selection relays: only one CAN selection relay active at a time
- INA226 current measurement
- DS3231 RTC
- microSD logging/storage
- Wi-Fi AP+STA simultaneous operation
- `192.168.4.1` is the fixed local AP/recovery interface
- mDNS is optional only; it must never be the sole discovery mechanism

## Implementation rule
Coding agents and implementation tools are workers, not hardware authorities. The repository authority chain above controls hardware identity.
