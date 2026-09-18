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

## Phase 2 — accepted

- [x] Route/state hierarchy follows `PAGE_TREE.md`.
- [x] Main carousel state is `activeCardIndex` with exactly eight approved states.
- [x] Nested CAN state is independent `canSubSlide` with exactly four approved states.
- [x] Entry/report overlay origin context is explicit.
- [x] Back/Home/Settings semantics are represented in the navigation model.
- [x] Conditional validation, axle-lift, report and CAN return paths are modeled.
- [x] Shared save and old-record elements remain overlays, not routes.
- [x] Navigation/state tests cover boundaries and nested-state isolation.

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

## Phase 4 — accepted

- [x] HTTP endpoint constants match the existing `/api/v1/...` contract.
- [x] Approved firmware test modes are typed exactly; Cross Scan is not exposed as a standalone mode.
- [x] Server-originated WebSocket event names are represented without adding a command channel.
- [x] Stable firmware error families are represented as machine codes.
- [x] Transport-neutral HTTP and telemetry service interfaces are defined.
- [x] Common result fields preserve `classificationFinal` rather than fabricating browser PASS/FAIL.
- [x] Development fixtures are contract-shaped and blocked outside an explicit development/test boundary.
- [x] No real HTTP/WebSocket client, host resolution or reconnect implementation was added.
- [x] No production screen consumes mock measurements.
- [x] GitHub Actions `npm run build` passed after the Phase 4 typing fix.

## Phase 5 — accepted

Execution grouping only; this does not create new product routes or screens:
- Group A: approved screens 01–11 — entry + ISO 7638/12098 voltage flows.
- Group B: approved screens 12–29 — cable + CAN termination flows.
- Group C: approved screens 30–36 — lamp/axle + report/save flows.
- Group D: approved screens 37–40 — settings + battery + remaining old-record context.

### Group A — accepted

- [x] Figma design context inspected for nodes corresponding to screens 01–11.
- [x] Login, vehicle entry, new-vehicle form and entry old-record modal implemented.
- [x] ISO 7638 and ISO 12098 voltage selection states implemented from the approved card family.
- [x] ISO 7638 and ISO 12098 live voltage screen family implemented without browser-owned classification.
- [x] PIN10/PIN11/PIN12 conditional confirmation overlays implemented as overlays on the live screen.
- [x] Production rendering does not silently fabricate live measurements or service-record search results.
- [x] Group A navigation/component tests added.
- [x] GitHub Actions build/test green for Group A.
- [x] Group A accepted before Group B starts.

### Group B — accepted

- [x] Approved screenshots 12–29 confirmed as the primary visual authority; Figma is fallback-only.
- [x] Cable-test root, ISO 7638 branch and ISO 12098 branch are wired to the existing navigation model.
- [x] Cable pin selection controls represent the firmware enabled-pin mask without adding a Cross Scan route.
- [x] Cable live screens preserve Cross Scan as integrated firmware telemetry and do not classify electrical results in the browser.
- [x] CAN termination uses the existing independent four-state nested selector.
- [x] All four CAN safety and resistance-result flows are wired to their approved route/state mappings.
- [x] Termination safety UI requires explicit de-energized confirmation before continuing.
- [x] Production result screens do not invent final resistance thresholds or PASS/FAIL classification.
- [x] GitHub Actions build/test green for Group B.
- [x] Group B accepted before Group C starts.

### Group C — accepted

- [x] Approved screenshots 30–36 are used as the visual authority.
- [x] ISO 12098 lamp selection and live-test screen are wired to the existing carousel/route model.
- [x] Lamp/load UI preserves one-at-a-time load semantics and leaves electrical actuation to firmware.
- [x] Axle-lift safety confirmation is implemented as the approved dedicated safety state and returns to Lamp Test.
- [x] Reports card, report result and report-save overlay are wired to the existing active-service-record flow.
- [x] Shared save/unsaved-results element remains an overlay and is wired from saveable test screens.
- [x] Production report/test screens do not fabricate completed records, current values or engineering classifications.
- [x] Group C flow tests cover lamp/axle, report save and shared save behavior.
- [x] GitHub Actions build/test green for Group C.
- [x] Group C accepted before Group D starts.

### Group D — accepted

- [x] Approved screenshots 37–40 identified as Settings, Settings Detail, Battery Status and report-context Old Record Search.
- [x] Settings and Battery remain main-carousel states rather than new top-level routes.
- [x] Settings detail uses the existing approved settings-detail route.
- [x] Report-context old-record search reuses the search component while preserving its distinct reports origin.
- [x] Production Settings/Battery values do not fabricate firmware/device data.
- [x] Group D navigation/component tests added.
- [x] GitHub Actions build/test green for Group D.
- [x] Group D accepted and Phase 5 closed before Phase 6 starts.

## Phase 6 — implemented to current firmware contract

- [x] Same-host HTTP client implemented against the existing `/api/v1/...` firmware endpoints.
- [x] WebSocket telemetry client implemented against current page host on port 81.
- [x] Real firmware wire messages are normalized without creating a second command protocol.
- [x] Reconnect reads device/status/settings state and recovers authoritative firmware context.
- [x] Approved voltage, cable, lamp, axle-lift and CAN UI actions issue approved firmware intents only.
- [x] Live voltage, cable and load/current values render from firmware telemetry; CAN termination remains evidence-only until firmware publishes authoritative resistance.
- [x] New record creation, old-record search/report inspection, report save/result and settings use real firmware HTTP state; old-record retest activation remains blocked by the current API contract.
- [x] Production screens have no silent fallback to mock measurements or records.
- [x] GitHub Actions build/test green for the implemented Phase 6 contract surface.

### Phase 6 contract gaps

- Old-record search can list existing records through `GET /api/v1/records`, but the current firmware/API contract has no approved operation for making an existing record the active service record. Do not invent a client-side activation endpoint.
- CAN termination WebSocket evidence currently exposes `vhV`, `vlV` and `deltaV`, but not authoritative resistance in ohms. The PWA must not derive or fabricate the screenshot's resistance value until firmware exposes the approved engineering result.
- Battery-status UI has no current authoritative battery telemetry endpoint/event in the checked-in firmware contract. Production remains blank rather than using preview values.

## Phase 7 — in progress

- [x] Web App Manifest added and linked from the static entry document.
- [x] Production Service Worker generated from the final Vite `dist/` file list.
- [x] Application shell, bundled code, local assets and manifest are precached for offline use.
- [x] Firmware `/api/v1/...` requests are explicitly excluded from Service Worker interception.
- [x] Navigation requests fall back to cached `index.html` when the network is unavailable.
- [x] Vite production output remains relative-base static content suitable for ESP32 hosting.
- [x] Static-build validator rejects external HTML/CSS/JavaScript runtime dependencies without flagging inert bundled URL strings.
- [x] GitHub Actions build/test/static validation green for the offline/static package.
- [ ] Final offline install/runtime verification on an ESP32-hosted build.

## Phase 8 — in progress

- [x] All 40 numbered screenshot files have an explicit implementation mapping.
- [x] Automated coverage check verifies the complete 01–40 screenshot set and approved carousel/overlay semantics.
- [ ] Pixel/spacing/type visual comparison at 390x844 against all 40 approved PNGs. Reference asset dimensions are now automatically verified as exactly 390x844.
- [x] Reference-frame scaling keeps the 390x844 geometry unchanged at baseline, fits narrow phones, and centers unchanged geometry on tablet widths.
- [x] Arabic/Persian RTL document flow is verified with technical LTR islands while preserving the approved screenshot geometry.
- [ ] Full offline install/runtime verification against an ESP32-hosted production build.
- [ ] Final unresolved firmware-contract gaps reviewed before release acceptance.
