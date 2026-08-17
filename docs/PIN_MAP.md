# Bremsecu G1 Pin Map

This file is the working UI/test pin reference. Hardware/net-level authoritative mappings should later be synchronized with the master net map.

## ISO 12098 - 15 Pin Working List

| Pin | Function |
|---|---|
| 1 | Sol Sinyal |
| 2 | Sag Sinyal |
| 3 | Arka Sis |
| 4 | Sase |
| 5 | Sol Park |
| 6 | Sag Park |
| 7 | Stop Lambasi |
| 8 | Geri Vites |
| 9 | Surekli +24V |
| 10 | Balata Asinma |
| 11 | Fren Sistemi |
| 12 | Dingil Kaldirma |
| 13 | Sase |
| 14 | CAN H |
| 15 | CAN L |

## Special handling

- PIN10, PIN11 and PIN12 are conditional auxiliary functions. See `PRODUCT_RULES.md`.
- For 24N + 24S (2x7) trailer profile, use the separately defined 7-pin mapping.
- When a 2x7 profile/adapter does not carry the 15-pin CAN-related rows, PIN13-PIN15 remain visible in the UI but disabled.

## Notes

- UI labels and physical pin mappings are separate concerns.
- Figma should use this file for the visible 15-pin function list.
- Firmware implementation must ultimately be validated against the authoritative hardware master net map before code is finalized.
