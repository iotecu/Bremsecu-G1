# BREMSECU G1 — REPLIT HANDOFF

Status: FINAL IMPLEMENTATION ENTRY POINT

## Mission
Build the Bremsecu G1 PWA so the implemented UI matches the approved Figma design and works as the client of the existing ESP32 firmware.

Do not redesign, reinterpret, simplify, expand or modernize the approved product flow.

## Read only these authorities, in this order
1. `docs/pwa/PAGE_TREE.md` — screen hierarchy and route/state structure
2. `docs/pwa/NAVIGATION_RULES.md` — navigation, carousel and modal behavior
3. `docs/pwa/UI_IMPLEMENTATION_RULES.md` — visual implementation rules
4. `docs/figma/design-tokens.json` — exact canonical visual tokens
5. `docs/figma/screens/` — 40 final approved visual references
6. `docs/figma/assets/replit/` — final implementation assets
7. `docs/pwa/FIRMWARE_INTEGRATION.md` — ESP32 communication contract
8. `docs/API_CONTRACT.md` — existing firmware API meaning
9. `docs/figma/i18n.md` — language authority

Older PWA/Figma documents are background only. If they conflict with the authorities above, ignore the older document. Do not ask which one to follow.

## Decision rule
When implementation details appear ambiguous, resolve them by authority order above. Do not invent a third option.

Ask a question only when two current authority files directly contradict each other and the contradiction prevents implementation. Cosmetic preference is never a reason to ask.

## Required implementation behavior
- Baseline visual target is 390x844.
- The numbered final screenshots are the visual truth.
- Use supplied assets; do not substitute icons or illustrations.
- Main modules are one 8-state carousel, not eight routes.
- CAN Bus Termination contains its own independent 4-state nested selector.
- Measurement/result/safety/modal screens do not swipe.
- No new screens, routes, dialogs, animations, controls or product behavior.
- Core operation is offline and local to the ESP32.
- Production UI must bind to the existing firmware HTTP/WebSocket contract; no fake production backend.
- Firmware owns hardware actions, test sequencing and safety interlocks.

## Deliverable
A production-buildable static PWA under `pwa/` that:
- visually matches the 40 approved references at 390x844,
- remains usable responsively on common phone/tablet sizes,
- follows the exact approved flow,
- uses the existing firmware contract,
- builds to static files suitable for ESP32 hosting,
- requires no cloud or external network for core operation.

## Completion gate
Do not report completion until all of the following are true:
- every approved screenshot state has an implementation mapping,
- no unauthorized screen or route exists,
- main and nested carousel gestures are isolated correctly,
- all supplied assets are wired correctly,
- colors/type tokens are taken from the canonical token file,
- HTTP and WebSocket service layers target the existing firmware contract,
- production build succeeds,
- no production screen depends on mock data.
