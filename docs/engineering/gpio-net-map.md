# GPIO and Net Map — BREMSECU G1 REV-2

Derived hardware map. Authority chain:

`REV-2 schematic -> docs/authority/BREMSECU_G1_V2_MASTER_NET_MAP_v1.3.txt -> this document -> firmware/include/pins.h`

## ESP32 pins
| Function | GPIO |
|---|---:|
| TPIC SER | 23 |
| TPIC CLK / SRCK | 18 |
| TPIC RCK / LATCH | 5 |
| TPIC OE | 13 |
| MUX EN | 25 |
| MUX S0 | 16 |
| MUX S1 | 17 |
| MUX S2 | 27 |
| I2C SDA | 21 |
| I2C SCL | 22 |
| SAG_PULS | 36 |
| SOL_PULS | 39 |
| microSD MISO | 34 |
| microSD SCK | 32 |
| microSD MOSI | 33 |
| microSD CS | 4 |

## Notes
- TPIC OE is active-low at the driver side.
- MUX EN is active-low.
- Pulse GPIO mapping above is REV-2 verified and must not be swapped by assumption.
- microSD module power is documented separately in `known-hardware-fixes.md`.
- Hardware identity changes require a new schematic/MASTER NET MAP revision first; this document must not silently redefine mapping.
