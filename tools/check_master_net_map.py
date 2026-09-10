#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / "docs/authority/BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt"
PINS = ROOT / "firmware/include/pins.h"
TPIC = ROOT / "firmware/include/tpic_map.h"
CHANNELS = ROOT / "firmware/include/channels.h"
ADC_DOC = ROOT / "docs/engineering/adc-mux-map.md"
TPIC_DOC = ROOT / "docs/engineering/tpic-output-map.md"
ARCH = ROOT / "docs/ARCHITECTURE.md"

errors = []

def need(text: str, needle: str, where: str):
    if needle not in text:
        errors.append(f"{where}: missing {needle!r}")


def parse_const_int(text: str, name: str):
    m = re.search(rf"constexpr\s+int\s+{re.escape(name)}\s*=\s*(\d+)\s*;", text)
    return int(m.group(1)) if m else None


auth = AUTH.read_text(encoding="utf-8")
pins = PINS.read_text(encoding="utf-8")
tpic = TPIC.read_text(encoding="utf-8")
channels = CHANNELS.read_text(encoding="utf-8")
adc_doc = ADC_DOC.read_text(encoding="utf-8")
tpic_doc = TPIC_DOC.read_text(encoding="utf-8")
arch = ARCH.read_text(encoding="utf-8")

# Frozen ESP32 mapping from MASTER NET MAP §1 / §12.
pin_expected = {
    "TPIC_SER": 23, "TPIC_CLK": 18, "TPIC_RCK": 5, "TPIC_OE": 13,
    "MUX_EN": 25, "MUX_S0": 16, "MUX_S1": 17, "MUX_S2": 27,
    "I2C_SDA": 21, "I2C_SCL": 22,
    "SAG_PULS": 36, "SOL_PULS": 39,
    "SD_MISO": 34, "SD_SCK": 32, "SD_MOSI": 33, "SD_CS": 4,
}
for name, expected in pin_expected.items():
    actual = parse_const_int(pins, name)
    if actual != expected:
        errors.append(f"pins.h: {name}={actual}, expected {expected}")

# Critical TPIC chain facts and bit positions from MASTER NET MAP §3.
for needle in (
    "U6 SER IN = TPIC_SER",
    "Shared SRCK = TPIC_CLK",
    "Shared RCK  = TPIC_RCK",
    "U6 -> U5 -> U4 -> U3",
):
    need(auth, needle, "MASTER NET MAP")

bit_expected = {
    "K4_CAN7638_DR": 0, "K5_CAN12098_DR": 1,
    "K3_CAN12098_CK": 4, "K2_CAN7638_CK": 5,
    "K1_SELECT_V": 6, "K6_MASTER_GND": 7,
    "OUT17_BALATA": 8, "OUT18_YAYLI": 9, "OUT19_ASANSOR": 10,
    "OUT20_GND4": 11, "OUT21_CANH2_DR": 12, "OUT22_CANL2_DR": 13,
    "OUT9_SAG_SINYAL": 16, "OUT10_ARKA_SIS": 17, "OUT11_GND3": 18,
    "OUT12_SOL_PARK": 19, "OUT13_SAG_PARK": 20, "OUT14_STOP": 21,
    "OUT15_GERI": 22, "OUT16_AKU2": 23,
    "OUT1_AKU1": 24, "OUT2_KONTAK": 25, "OUT3_GND1": 26,
    "OUT4_GND2": 27, "OUT5_ABS": 28, "OUT6_CANH1_DR": 29,
    "OUT7_CANL1_DR": 30, "OUT8_SOL_SINYAL": 31,
}
for name, expected in bit_expected.items():
    actual = parse_const_int(tpic, name)
    if actual != expected:
        errors.append(f"tpic_map.h: {name}={actual}, expected {expected}")

# Full 4x8 ADC/MUX authority matrix, including NC positions.
rows = [
    ("000", "7P_GND1", "15P_SOL_PARK", "15P_BALATA_SINYAL", "CANH_1_R"),
    ("001", "7P_AKU", "15P_SIS", "15P_ASANSOR", "CANL_1_R"),
    ("010", "7P_KONTAK", "15P_SAG_SINYAL", "15P_YAYLI", "CANH_2_R"),
    ("011", "7P_GND2", "15P_SAG_PARK", "NC", "15P_CAN_H"),
    ("100", "7P_ABS", "15P_SOL_SINYAL", "15P_CAN_L", "NC"),
    ("101", "NC", "15P_AKU", "CANL_2_R", "NC"),
    ("110", "7P_CAN_H", "15P_GERI", "15P_GND3", "NC"),
    ("111", "7P_CAN_L", "15P_STOP", "15P_GND4", "NC"),
]
for row in rows:
    line = "| " + " | ".join(row) + " |"
    need(adc_doc, line, "adc-mux-map.md")

# Derived TPIC doc must preserve every authority output/control identity.
for needle in (
    "D0 OUT1 AKU-24V-1", "D7 OUT8 SOL-SINYAL",
    "D0 OUT9 SAG-SINYAL", "D7 OUT16 AKU-24V-2",
    "D0 OUT17 BALATA-SINYAL", "D5 OUT22 CANL_2_DR",
    "D0 K4 CAN7638_RELAY_DR", "D1 K5 CAN12098_RELAY_DR",
    "D4 K3 CAN12098_RELAY_CK", "D5 K2 CAN7638_RELAY_CK",
    "D6 K1 SELECT_V_RELAY", "D7 K6 MASTER_GND_RELAY",
):
    need(tpic_doc, needle, "tpic-output-map.md")

# Firmware must explicitly cite restored authority and retain key compile-time guards.
need(channels, "docs/authority/BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt", "channels.h")
for needle in (
    "kAdcChannelCount = 26",
    "MUX_7P_AKU, AdcChannel::MUX_7P_KONTAK",
    "MUX_15P_GND4, AdcChannel::MUX_15P_CAN_H, AdcChannel::MUX_15P_CAN_L",
    "tpicBitFor(TpicOutput::OUT8_SOL_SINYAL) == 31",
    "tpicBitFor(TpicOutput::OUT1_AKU_24V_1) == 24",
    "tpicBitFor(RelayControl::RELAY_SELECT_V) == 6",
):
    need(channels, needle, "channels.h")

need(arch, "REV-2 schematic -> MASTER NET MAP -> derived engineering maps -> firmware identity maps -> runtime behavior", "ARCHITECTURE.md")

if errors:
    print("MASTER NET MAP authority cross-check: FAIL")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("MASTER NET MAP authority cross-check: PASS")
print("- ESP32 GPIO map: PASS")
print("- TPIC relay/output bit map: PASS")
print("- ADC/MUX 4x8 matrix: PASS")
print("- firmware authority citation/guards: PASS")
print("- repository authority chain: PASS")
