# BREMSECU G1 — PWA Specification

Status: UI/CLIENT IMPLEMENTATION CONTRACT.

## Visual authority
- `docs/figma/screens/` final approved PNGs
- `docs/figma/component-tree.md`
- `docs/figma/style-guide.md`
- `docs/figma/design-tokens.json`
- `docs/figma/i18n.md`

## Entry flow
1. First-contact / hotspot / serial-number screen
2. Test entry screen
3. New vehicle record or existing record flow
4. Main module carousel

Entry screens are not part of the carousel.

## Main module carousel
The home/module screen is a horizontal seven-card carousel in this fixed order:
1. ISO 7638 VOLTAJ TEST
2. ISO 12098 VOLTAJ TEST
3. KABLO TEST
4. ISO 12098 LAMBA TEST
5. CANBUS TERMİNASYON
6. RAPORLAR
7. AYARLAR

Behavior:
- one centered active card
- neighboring cards partially visible
- left/right arrows move one card
- horizontal swipe/drag moves one card
- header and bottom navigation remain fixed
- only centered card's primary action is active
- no grid/list/tab replacement

## Test screens
PWA must represent the approved voltage, cable, lamp/axle-lift, CAN termination, report and settings flows from the final screenshots.

Live test UI must consume firmware state; it must not fake measurements or locally decide protected safety state.

## Dialogs / safety
Conditional Pin10/11/12 dialogs, axle-lift safety confirmation and CAN termination ignition/de-energized confirmation must match the approved workflow and visual prominence.

## Reports
- active service record summary
- completed test results
- report creation/share actions
- save modal with diagnosis/service text and fee
- unsaved-test-results exit decision
- previous-record search/retest flow

## Settings
- language
- keep screen awake
- technicians
- service/company data
- report logo
- device information

## i18n
All user-facing strings pass through the i18n layer. Supported languages and RTL rules are fixed in `docs/figma/i18n.md`.

## Connectivity
- PWA works over ESP AP at `192.168.4.1`.
- Same PWA works over STA DHCP address when ESP is connected to a hotspot/router.
- mDNS may be offered as convenience only and cannot be required.
- reconnect/reload must preserve selected language and recover current device/test state from firmware.

## PWA architecture
Suggested implementation:
- React + TypeScript
- shared components instead of per-screen duplication
- HTTP API for commands/records/settings
- WebSocket for live state
- persistent local preference cache for non-authoritative UI preferences

## Safety boundary
The PWA never directly controls arbitrary TPIC bits/relays. It sends approved test intents through the API and renders firmware-authoritative state.

## Explicit exclusion
There is no standalone Cross Scan screen/test.
