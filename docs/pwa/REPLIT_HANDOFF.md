# BREMSECU G1 — REPLIT MASTER HANDOFF

Status: **FINAL IMPLEMENTATION ENTRY POINT**
Operating mode: **READ → UNDERSTAND → IMPLEMENT → VERIFY**

This is the only entry-point document that must be given to Replit.

The repository already contains the approved product flow, final visual references, implementation assets, design tokens, language contract, ESP32 API/WebSocket contract and engineering rules. Replit's job is to implement the PWA from those authorities, not to redesign the product or obtain the same requirements again through chat.

## 0. Mandatory start procedure

Before changing any source file:

1. Read this document completely.
2. Read every authority listed in **Section 2**, in the stated order.
3. Inspect all 40 numbered screenshots and all supplied implementation assets.
4. Inspect the existing `pwa/` scaffold and the firmware contracts it must consume.
5. Build an internal screen-to-component/state/API mapping from the supplied material.
6. Complete the blocking i18n foundation in **Section 3**.
7. Only then begin screen implementation.

Do not start by asking the user to restate requirements already present in Git. Do not replace repository inspection with assumptions.

Ask a question only if two current authority files directly contradict each other and the contradiction blocks implementation. Cosmetic preference, framework convenience or a desire to redesign is not a reason to ask.

## 1. Mission

Build the Bremsecu G1 PWA so that:

- the implemented UI matches the 40 approved Figma screenshots;
- the approved route/state/navigation structure is preserved exactly;
- the PWA is the client of the existing ESP32 HTTP/WebSocket firmware;
- all 14 languages work locally and offline;
- the production bundle is static and suitable for ESP32 hosting;
- core diagnostics require neither cloud services nor external internet.

Do not redesign, reinterpret, simplify, expand or modernize the approved product flow.

## 2. Authority map — read in this order

1. `docs/pwa/PAGE_TREE.md`
   Screen hierarchy, valid destinations and route/state structure.

2. `docs/pwa/NAVIGATION_RULES.md`
   Navigation, main carousel, nested CAN selector, gestures, modal and return behavior.

3. `docs/pwa/UI_IMPLEMENTATION_RULES.md`
   Fidelity, responsive behavior, assets, dynamic states and forbidden UI invention.

4. `docs/figma/design-tokens.json`
   Exact canonical colors, typography roles, radii and reference geometry.

5. `docs/figma/screens/`
   The 40 numbered final approved visual references. These are the baseline visual truth at 390×844.

6. `docs/figma/assets/replit/`
   Final implementation assets. Use these files; do not substitute third-party icons or illustrations.

7. `docs/figma/i18n.md`
   Mandatory 14-language list, offline i18n architecture, RTL rules and translation boundaries.

8. `docs/pwa/FIRMWARE_INTEGRATION.md`
   Client/firmware responsibility boundary, host resolution, HTTP/WebSocket use, safety and recovery rules.

9. `docs/API_CONTRACT.md`
   Existing `/api/v1/...` endpoints and firmware payload meaning.

10. `docs/engineering/`
    Verified hardware, measurement and safety authority when technical meaning must be resolved.

Older PWA/Figma documents are background only. If an older document conflicts with the authorities above, ignore the older document. Do not ask which one to follow.

### Decision rule

Resolve ambiguity by the authority order above. Never invent a third option. Hardware actions, sequencing, classifications and safety interlocks remain firmware-owned even when a screenshot appears to imply otherwise.

## 3. PHASE 0 — BLOCKING i18n FOUNDATION

Multilingual support is not a later feature. It is the first architectural layer.

Before implementing the approved screens, Replit must:

1. Create the i18n runtime and locale registry.
2. Create all 14 locale files defined in `docs/figma/i18n.md`.
3. Use Turkish (`tr`) as the canonical source, default and fallback language.
4. Route every user-facing string through the i18n layer; no component-level hard-coded UI text.
5. Persist language selection locally without resetting active service/test state.
6. Implement RTL behavior for Arabic (`ar`) and Persian (`fa`).
7. Package and cache every locale for fully offline use.
8. Keep API fields, enum values, test/channel IDs and fixed technical identities language-independent.
9. Add an automated locale-parity check that fails when a locale is missing a Turkish source key.

Screen implementation may start only after these requirements work in the PWA scaffold.

## 4. Required product structure

- Baseline visual target: `390x844`.
- The numbered final screenshots are the visual truth.
- Main modules are one 8-state carousel controlled by `activeCardIndex`, not eight routes.
- CAN Bus Termination contains its own independent 4-state nested selector.
- A nested CAN gesture must not advance the parent carousel.
- Measurement, result, safety and modal screens do not swipe.
- Header and bottom navigation remain fixed where shown.
- Use supplied assets and exact design tokens.
- No new screens, routes, dialogs, animations, controls, gestures or product behavior.
- Do not convert the UI into a generic dashboard or framework-default mobile layout.

## 5. Firmware integration boundary

- Use the existing same-host HTTP `/api/v1/...` contract.
- Use WebSocket on the current page host, port `81`, for server-originated telemetry/state.
- Do not hard-code `192.168.4.1` as the only production host.
- Do not invent endpoints, events, payloads or a second command protocol.
- Do not add a fake production backend.
- Development mocks must be explicitly development-only and contract-shaped.
- Firmware owns hardware actions, relay/TPIC control, sequencing, measurements, classifications and safety interlocks.
- PWA sends approved intent and renders returned state; it never directly drives raw hardware outputs.

## 6. Implementation sequence

### Phase 0 — i18n foundation

Complete Section 3 and its checks.

### Phase 1 — application foundation

- App shell, fixed brand/header and bottom navigation.
- Route/state model matching `PAGE_TREE.md`.
- Main and nested carousel state isolation.
- Token consumption from `design-tokens.json`.
- Local static asset wiring.

### Phase 2 — approved UI

Implement all 40 approved screenshot states and reusable overlays/components without adding or removing states.

### Phase 3 — real firmware services

- Same-host HTTP client.
- WebSocket telemetry client.
- Reconnect/state recovery.
- Real dynamic measurements, warnings, faults, report and record state.
- No silent production fallback to mock values.

### Phase 4 — offline/static production build

- PWA manifest and Service Worker.
- Local fonts, assets and 14 locales cached.
- No core CDN, cloud SDK, external database or Node.js runtime dependency.
- Static output suitable for ESP32 hosting.

### Phase 5 — verification

- Build and automated checks pass.
- Every approved screenshot has an implementation mapping.
- Visual comparison is performed at 390×844.
- Responsive checks cover common phone/tablet sizes without changing product structure.
- Offline operation and all languages are verified.
- HTTP/WebSocket services target the existing firmware contract.
- Production build contains no dependency on mock data.

## 7. Forbidden shortcuts

Do not:

- ask the user to repeat information already supplied by the authority files;
- code from memory without inspecting the screenshots/assets;
- replace supplied visuals with an icon pack or generic component library;
- hard-code screenshot measurement values into production UI;
- place Turkish strings directly inside reusable components;
- postpone i18n, RTL or offline behavior until after screen creation;
- rename firmware endpoints/events or create a proxy backend;
- reproduce firmware safety logic in the browser;
- declare completion after producing only a visual mock-up;
- alter firmware merely to make an invented PWA contract work.

## 8. Deliverable

A production-buildable static PWA under `pwa/` that:

- reproduces the approved 40-state UI and exact flow;
- works responsively while preserving the mobile product structure;
- supports the mandatory 14 languages offline;
- uses the existing firmware HTTP/WebSocket contract;
- uses the supplied assets and canonical tokens;
- is suitable for ESP32 hosting;
- requires no cloud or external network for core operation.

## 9. Completion gate

Do not report completion until all are true:

- [ ] all authority files were read before implementation;
- [ ] all 40 approved screenshot states have implementation mappings;
- [ ] no unauthorized screen, route, dialog or gesture exists;
- [ ] main and nested carousel gestures are isolated correctly;
- [ ] all supplied assets are wired correctly;
- [ ] colors/type/geometry use the canonical token/reference sources;
- [ ] all 14 locales have key parity with Turkish;
- [ ] Turkish is default/source/fallback and language selection persists;
- [ ] Arabic and Persian RTL behavior is verified;
- [ ] the complete app works offline after installation;
- [ ] HTTP and WebSocket layers use the existing firmware contract;
- [ ] no production screen depends on mock data;
- [ ] production build succeeds and produces static ESP32-hostable output;
- [ ] visual verification at 390×844 is complete.

## 10. The only instruction Replit needs

> Read `docs/pwa/REPLIT_HANDOFF.md` completely. Treat it as the sole implementation entry point. Follow every linked authority in the stated order, inspect all supplied materials, then implement and verify the production PWA without redesigning the approved product or asking me to restate requirements already contained in the repository.
