# BREMSECU G1 PWA — IMPLEMENTATION PROGRESS

This file records implementation gates. It does not override any authority in
`REPLIT_HANDOFF.md`.

Baseline: `origin/main` at `923db4a77df2e87cd1704092042fcda14f7d9030`.

## Phase plan

1. Buildable scaffold and blocking i18n foundation
2. Route, state and navigation model
3. Canonical tokens, local assets and application shell
4. Firmware service interfaces and development-only contract fixtures
5. Approved UI, delivered in four bounded screen groups
6. Real ESP32 HTTP/WebSocket integration
7. Manifest, Service Worker, offline package and ESP32 static build
8. Full 40-state visual and functional verification

## Phase 1 — accepted

- [x] React/Vite/TypeScript scaffold builds.
- [x] Exactly 14 local locale resources exist in the approved order.
- [x] Turkish is source, default and fallback.
- [x] Language selection persists under `bremsecu.locale`.
- [x] Language changes preserve mounted application state.
- [x] Arabic and Persian set root RTL; LTR restoration is verified.
- [x] Locale-aware number and date formatting is available.
- [x] Missing, extra, empty and placeholder-mismatched translations fail checks.
- [x] Deliberate missing-key negative verification fails as expected.
- [x] Production build passes with no external runtime translation dependency.
- [x] No product route, screen, diagnostic flow or firmware client was added.

## Phase 2 — accepted

- [x] Route/state hierarchy follows `PAGE_TREE.md`.
- [x] Main carousel state is `activeCardIndex` with exactly eight approved states.
- [x] Nested CAN state is independent `canSubSlide` with exactly four approved states.
- [x] Entry/report overlay origin context is explicit.
- [x] Back/Home/Settings semantics are represented in the navigation model.
- [x] Conditional validation, axle-lift, report and CAN return paths are modeled.
- [x] Shared save and old-record elements remain overlays, not routes.
- [x] Navigation/state tests cover boundaries and nested-state isolation.
- [x] No Phase 3 visual shell, assets, firmware services or product screens were added.

## Phase 3 — accepted

- [x] Canonical Figma design-token JSON is mirrored into the PWA and consumed by the shell.
- [x] Approved implementation assets are copied locally under `pwa/public/assets/`.
- [x] Asset URL resolution respects the Vite relative base for ESP32 static hosting.
- [x] Reusable `AppShell`, `TopBrandBar` and `BottomNavigation` components exist.
- [x] Bottom navigation uses the supplied Back/Home/Settings assets.
- [x] Shell geometry uses canonical frame and bottom-navigation reference dimensions.
- [x] Shell colors/type/radii are driven from canonical token values.
- [x] Bottom-navigation labels are routed through all 14 locale dictionaries.
- [x] Shell navigation actions are covered by an automated component test.
- [x] Token parity and local asset presence are covered by automated Phase 3 checks.
- [x] Full local `npm run build` passed after review fixes.

## Phase 4 — implemented, ready for review

- [x] HTTP endpoint constants match the existing `/api/v1/...` contract.
- [x] Approved firmware test modes are typed exactly; Cross Scan is not exposed as a standalone mode.
- [x] Server-originated WebSocket event names are represented without adding a command channel.
- [x] Stable firmware error families are represented as machine codes.
- [x] Transport-neutral HTTP and telemetry service interfaces are defined.
- [x] Common result fields preserve `classificationFinal` rather than fabricating browser PASS/FAIL.
- [x] Development fixtures are contract-shaped and blocked outside an explicit development/test boundary.
- [x] No real HTTP/WebSocket client, host resolution or reconnect implementation was added.
- [x] No production screen consumes mock measurements.

Phase 5 must not begin until Phase 4 is accepted.
