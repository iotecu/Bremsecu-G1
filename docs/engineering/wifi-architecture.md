# Wi-Fi Architecture — BREMSECU G1 REV-2

Status: CONFIRMED bench architecture.

## Core mode

The ESP32 runs `WIFI_AP_STA` so AP and STA are active simultaneously.

This is not a primary-STA-with-fallback-AP architecture. The local AP remains available as the fixed recovery/discovery path while STA can connect to a phone hotspot or other 2.4 GHz network.

## AP side

- Fixed local AP address: `192.168.4.1`
- The same real PWA is served through the AP interface.
- `192.168.4.1` is the authoritative recovery/discovery address.

## STA side

- ESP32-D bench target uses 2.4 GHz Wi-Fi.
- STA uses DHCP by default.
- A tested phone-hotspot session successfully assigned an address in the hotspot subnet.
- A tested router session assigned `192.168.1.125` with approximately -63 dBm RSSI.
- A manually forced static `.150` address was problematic during bench work; therefore static STA addressing is not the default architecture.

## First-contact phone workflow

1. User enables phone hotspot.
2. ESP32 joins that hotspot as STA using configured credentials.
3. ESP32 simultaneously exposes the BREMSECU AP.
4. User temporarily connects the phone/tablet to the BREMSECU AP.
5. Browser opens `192.168.4.1`.
6. Setup/status UI shows the current STA address.
7. User may return to the hotspot network context and reach the same PWA through the STA address.

The final UI wording and interaction are defined by the approved screen PNGs in `docs/figma/screens/`.

## Tablet-only workflow

A tablet may connect directly to the BREMSECU AP and use the full PWA at `192.168.4.1` without any external router or hotspot.

## Discovery technologies

- Direct IP is authoritative.
- mDNS (`bremsecu.local`) was tested and failed on the phone-hotspot path; it is optional/best-effort only.
- Firmware and PWA must never depend on mDNS as the sole discovery mechanism.
- BLE is not required for the core connection workflow.

## Security/configuration rule

Bench SSID/password values are not production credentials. Production credential generation, storage and service-master/recovery policy must be defined explicitly before release and must not be inferred from temporary bench values.
