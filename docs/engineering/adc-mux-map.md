# ADC / MUX Measurement Map — BREMSECU G1 REV-2

Derived hardware map. Authority chain:

`REV-2 schematic -> docs/authority/BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt + docs/authority/BATTERY_MONITOR_ADDENDUM.md -> this document -> firmware identity/services`

All four CD4051 multiplexers share S0/S1/S2. MUX EN is active-low.

| S2S1S0 | AIN0 / U10 | AIN1 / U13 | AIN2 / U12 | AIN3 / U11 |
|---|---|---|---|---|
| 000 | 7P_GND1 | 15P_SOL_PARK | 15P_BALATA_SINYAL | CANH_1_R |
| 001 | 7P_AKU | 15P_SIS | 15P_ASANSOR | CANL_1_R |
| 010 | 7P_KONTAK | 15P_SAG_SINYAL | 15P_YAYLI | CANH_2_R |
| 011 | 7P_GND2 | 15P_SAG_PARK | NC | 15P_CAN_H |
| 100 | 7P_ABS | 15P_SOL_SINYAL | 15P_CAN_L | BATTERY_12V |
| 101 | NC | 15P_AKU | CANL_2_R | NC |
| 110 | 7P_CAN_H | 15P_GERI | 15P_GND3 | NC |
| 111 | 7P_CAN_L | 15P_STOP | 15P_GND4 | NC |

## Rules
- NC slots are not diagnostic channels and must not be interpreted.
- `BATTERY_12V` is internal system telemetry only. It is physically U11 Y4 -> AIN3 and is not a socket pin or member of either connector scan list.
- `_R` channels are dedicated CAN measurement/return nodes and are not interchangeable with connector CAN pin channels.
- Connector diagnostic channel conversion/calibration must use the verified REV-2 calibration authority, not generic divider assumptions.
- Battery divider conversion authority is separately recorded in `docs/authority/BATTERY_MONITOR_ADDENDUM.md`: 100 kΩ / 10 kΩ, nominal 11.0:1.
- Hardware identity changes require schematic/authority update first; this document must not silently redefine mapping.
