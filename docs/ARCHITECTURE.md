# BREMSECU G1 REV-2 — Repository Architecture

This repository is the single technical source of truth for BREMSECU G1 REV-2.

## Authority order
1. Verified REV-2 hardware/net mapping
2. Verified bring-up results
3. Engineering documentation under `docs/engineering/`
4. Figma handoff under `docs/figma/`
5. Firmware and PWA implementation

If implementation conflicts with engineering documentation, implementation must be corrected. Do not guess.

## Main structure
- `docs/engineering/` — hardware, measurements, calibration, safety and bring-up authority
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
Qwen, Claude, Copilot or any other coding agent is an implementation worker. The repository documentation is the authority.